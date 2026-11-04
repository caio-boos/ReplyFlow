import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getShopifyOrderDetailsByEmail,
  getShopifyOrderDetailsByNumber,
  type ShopifyOrderDetails,
} from "@/lib/shopify/client";
import { loadShopifyAccount, describeShopifyError } from "@/lib/shopify/account";
import { getLocale, getT } from "@/lib/i18n/server";

/**
 * Looks up a Shopify order by order number ("#1234") or customer email.
 * Used by the email composer templates to pre-fill customer data.
 */
export async function GET(req: NextRequest) {
  const locale = await getLocale();
  const tc = await getT("common");
  const t = await getT("stores");
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = (searchParams.get("accountId") ?? "").trim();
  const query = (searchParams.get("query") ?? "").trim();

  if (!accountId || !query) {
    return NextResponse.json(
      { error: t("api.queryRequired") },
      { status: 400 },
    );
  }

  const result = await loadShopifyAccount(accountId, session.uid, locale);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status });

  try {
    let order: ShopifyOrderDetails | null = null;
    if (query.includes("@")) {
      const orders = await getShopifyOrderDetailsByEmail(
        result.domain,
        result.token,
        query.toLowerCase(),
      );
      order = orders[0] ?? null;
    } else {
      order = await getShopifyOrderDetailsByNumber(
        result.domain,
        result.token,
        query,
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: t("api.orderNotFound") },
        { status: 404 },
      );
    }

    return NextResponse.json({
      order,
      storeLabel: (result.account.fantasyName as string | null) || (result.account.label as string),
      trackingUrlTemplate: (result.account.trackingUrlTemplate as string | null) ?? null,
    });
  } catch (err) {
    const described = describeShopifyError(err, locale);
    if (described)
      return NextResponse.json(
        { error: described.error },
        { status: described.status },
      );
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
