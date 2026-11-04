import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { loadShopifyAccount, describeShopifyError } from "@/lib/shopify/account";
import { getProductBuyers } from "@/lib/shopify/client";
import { parseAudienceInput } from "@/lib/shopify/audience";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const t = await getT("compose");
  const tc = await getT("common");
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: t("api.invalidBody") }, { status: 400 });

  const input = parseAudienceInput(body);
  if ("error" in input)
    return NextResponse.json({ error: t(`api.audience.${input.error}`) }, { status: 400 });

  const ctx = await loadShopifyAccount(body.accountId ?? "", session.uid);
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

  const filtered = input.onlySubscribed
    ? buyers.filter((b) => b.acceptsMarketing)
    : buyers;

  return NextResponse.json({
    total: filtered.length,
    totalBeforeConsentFilter: buyers.length,
    members: filtered.map((b) => ({
      email: b.email,
      name: b.name,
      orderName: b.orderName,
      orderDate: b.orderDate,
      quantity: b.quantity,
      acceptsMarketing: b.acceptsMarketing,
    })),
  });
}
