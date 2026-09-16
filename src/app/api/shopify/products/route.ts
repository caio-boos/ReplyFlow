import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { loadShopifyAccount, describeShopifyError } from "@/lib/shopify/account";
import { getShopifyProducts } from "@/lib/shopify/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId") ?? "";
  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  const ctx = await loadShopifyAccount(accountId, session.uid);
  if (!ctx.ok)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    const products = await getShopifyProducts(ctx.domain, ctx.token, { search });
    return NextResponse.json({ products });
  } catch (err) {
    const described = describeShopifyError(err);
    if (described)
      return NextResponse.json(
        { error: described.error },
        { status: described.status },
      );
    throw err;
  }
}
