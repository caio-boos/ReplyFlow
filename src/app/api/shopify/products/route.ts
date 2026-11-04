import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { loadShopifyAccount, describeShopifyError } from "@/lib/shopify/account";
import { getShopifyProducts } from "@/lib/shopify/client";
import { getLocale, getT } from "@/lib/i18n/server";

export async function GET(req: NextRequest) {
  const locale = await getLocale();
  const tc = await getT("common");
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId") ?? "";
  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  const ctx = await loadShopifyAccount(accountId, session.uid, locale);
  if (!ctx.ok)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    const products = await getShopifyProducts(ctx.domain, ctx.token, { search });
    return NextResponse.json({ products });
  } catch (err) {
    const described = describeShopifyError(err, locale);
    if (described)
      return NextResponse.json(
        { error: described.error },
        { status: described.status },
      );
    throw err;
  }
}
