import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { loadShopifyAccount, describeShopifyError } from "@/lib/shopify/account";
import { getProductBuyers } from "@/lib/shopify/client";
import { parseAudienceInput, MAX_CAMPAIGN_RECIPIENTS } from "@/lib/shopify/audience";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("bulkCampaigns")
    .where("userId", "==", session.uid)
    .get();

  const campaigns = snap.docs
    .sort(
      (a, b) =>
        (b.data().createdAt?.seconds ?? 0) - (a.data().createdAt?.seconds ?? 0),
    )
    .slice(0, 20)
    .map((d) => {
      const data = d.data();
      delete data.recipients;
      return { id: d.id, ...data };
    });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const input = parseAudienceInput(body);
  if ("error" in input)
    return NextResponse.json({ error: input.error }, { status: 400 });

  const subject = String(body.subject ?? "").trim();
  const emailBody = String(body.body ?? "").trim();
  const productTitle = String(body.productTitle ?? "").trim();
  if (!subject || !emailBody)
    return NextResponse.json(
      { error: "Assunto e mensagem são obrigatórios" },
      { status: 400 },
    );

  const ctx = await loadShopifyAccount(String(body.accountId ?? ""), session.uid);
  if (!ctx.ok)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let buyers;
  try {
    buyers = await getProductBuyers(
      ctx.domain,
      ctx.token,
      input.productId,
      input.from,
      input.to,
    );
  } catch (err) {
    const described = describeShopifyError(err);
    if (described)
      return NextResponse.json(
        { error: described.error },
        { status: described.status },
      );
    throw err;
  }

  const audience = input.onlySubscribed
    ? buyers.filter((b) => b.acceptsMarketing)
    : buyers;

  if (audience.length === 0)
    return NextResponse.json(
      { error: "Nenhum cliente elegível encontrado para esse produto e período" },
      { status: 400 },
    );

  if (audience.length > MAX_CAMPAIGN_RECIPIENTS)
    return NextResponse.json(
      {
        error: `A seleção retornou ${audience.length} clientes. Reduza o período (limite de ${MAX_CAMPAIGN_RECIPIENTS} por campanha).`,
      },
      { status: 400 },
    );

  const db = getAdminDb();
  const docRef = await db.collection("bulkCampaigns").add({
    userId: session.uid,
    accountId: String(body.accountId),
    accountEmail: ctx.account.email,
    shopDomain: ctx.domain,
    productId: input.productId,
    productTitle,
    periodFrom: input.from.toISOString(),
    periodTo: input.to.toISOString(),
    onlySubscribed: input.onlySubscribed,
    subject,
    body: emailBody,
    total: audience.length,
    cursor: 0,
    sentCount: 0,
    failedCount: 0,
    status: "pending",
    recipients: audience.map((b) => ({
      email: b.email,
      name: b.name,
      orderName: b.orderName,
      quantity: b.quantity,
      status: "pending",
      error: null,
    })),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    completedAt: null,
  });

  return NextResponse.json(
    { id: docRef.id, total: audience.length },
    { status: 201 },
  );
}
