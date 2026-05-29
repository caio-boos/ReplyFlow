import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");
  const shop = searchParams.get("shop");

  if (!accountId || !shop) {
    return NextResponse.json({ error: "accountId e shop são obrigatórios" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SHOPIFY_CLIENT_ID não configurado no servidor" }, { status: 500 });
  }

  const redirectUri = `${req.nextUrl.origin}/api/shopify/callback`;
  const state = Buffer.from(`${accountId}:${shop}`).toString("base64url");

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "read_orders,read_customers");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
