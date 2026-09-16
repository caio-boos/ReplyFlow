import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { sendEmailBatch } from "@/lib/email/smtp";
import { renderEmailHtml } from "@/lib/email/html-template";
import { applyTokens } from "@/lib/shopify/audience";
import { FieldValue } from "firebase-admin/firestore";
import type { ReplyTemplateConfig } from "@/lib/types";

export const maxDuration = 60;

/** Recipients handled per request — keeps each call inside the serverless time limit. */
const BATCH_SIZE = 15;

interface CampaignRecipient {
  email: string;
  name: string;
  orderName: string;
  quantity: number;
  status: "pending" | "sent" | "failed";
  error: string | null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("bulkCampaigns").doc(id);

  // Atomically claim the next slice so concurrent calls never send twice.
  let claim: { start: number; end: number; campaign: FirebaseFirestore.DocumentData };
  try {
    claim = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error("NOT_FOUND");

      const campaign = doc.data()!;
      if (campaign.userId !== session.uid) throw new Error("FORBIDDEN");
      if (campaign.status === "cancelled") throw new Error("CANCELLED");

      const start = (campaign.cursor as number) ?? 0;
      const total = (campaign.total as number) ?? 0;
      const end = Math.min(start + BATCH_SIZE, total);

      if (start >= total) {
        if (campaign.status !== "completed") {
          tx.update(ref, {
            status: "completed",
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { start, end: start, campaign };
      }

      tx.update(ref, {
        cursor: end,
        status: "sending",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { start, end, campaign };
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NOT_FOUND")
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    if (code === "FORBIDDEN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (code === "CANCELLED")
      return NextResponse.json({ error: "Campanha cancelada" }, { status: 409 });
    throw err;
  }

  const campaign = claim.campaign;
  const total = (campaign.total as number) ?? 0;

  if (claim.start >= claim.end) {
    return NextResponse.json({
      done: true,
      processed: 0,
      cursor: total,
      total,
      sentCount: campaign.sentCount ?? 0,
      failedCount: campaign.failedCount ?? 0,
    });
  }

  const recipients = (campaign.recipients as CampaignRecipient[]) ?? [];
  const slice = recipients.slice(claim.start, claim.end);

  const accountDoc = await db
    .collection("accounts")
    .doc(campaign.accountId as string)
    .get();
  if (!accountDoc.exists)
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  const account = accountDoc.data()!;
  const password = decrypt(account.encryptedPassword);

  let replyTemplate: ReplyTemplateConfig | undefined;
  try {
    const tplDoc = await db
      .collection("replyTemplates")
      .doc(campaign.accountId as string)
      .get();
    if (tplDoc.exists) replyTemplate = tplDoc.data() as ReplyTemplateConfig;
  } catch {
    // non-fatal
  }

  const senderName = account.fantasyName || account.label || account.email;
  const productTitle = (campaign.productTitle as string) ?? "";

  const messages = slice.map((r) => {
    const vars = { name: r.name, product: productTitle, order: r.orderName };
    const text = applyTokens(campaign.body as string, vars);
    return {
      to: r.email,
      subject: applyTokens(campaign.subject as string, vars),
      text,
      html: renderEmailHtml(
        text,
        senderName,
        replyTemplate,
        replyTemplate?.showLogo ? (account.logoUrl ?? null) : null,
      ),
    };
  });

  const results = await sendEmailBatch(
    {
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      email: account.email,
      password,
    },
    messages,
  );

  const sentNow = results.filter((r) => r.ok).length;
  const failedNow = results.length - sentNow;

  const progress = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("NOT_FOUND");
    const data = doc.data()!;
    const list = [...((data.recipients as CampaignRecipient[]) ?? [])];

    results.forEach((res, i) => {
      const idx = claim.start + i;
      if (!list[idx]) return;
      list[idx] = {
        ...list[idx],
        status: res.ok ? "sent" : "failed",
        error: res.ok ? null : res.error.slice(0, 300),
      };
    });

    const sentCount = ((data.sentCount as number) ?? 0) + sentNow;
    const failedCount = ((data.failedCount as number) ?? 0) + failedNow;
    const cursor = (data.cursor as number) ?? claim.end;
    const done = cursor >= total;

    tx.update(ref, {
      recipients: list,
      sentCount,
      failedCount,
      status: done ? "completed" : "sending",
      updatedAt: FieldValue.serverTimestamp(),
      ...(done ? { completedAt: FieldValue.serverTimestamp() } : {}),
    });

    return { sentCount, failedCount, cursor, done };
  });

  return NextResponse.json({
    processed: results.length,
    total,
    ...progress,
  });
}
