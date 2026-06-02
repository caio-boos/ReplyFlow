import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId é obrigatório" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const doc = await db.collection("accounts").doc(accountId).get();
  if (!doc.exists) {
    return NextResponse.json(
      { error: "Conta não encontrada" },
      { status: 404 },
    );
  }

  const data = doc.data()!;
  const clientId = data.shopifyClientId as string | null;
  const encryptedSecret = data.encryptedShopifyClientSecret as string | null;
  const shop = data.shopifyDomain as string | null;

  if (!clientId || !encryptedSecret) {
    return NextResponse.redirect(
      new URL(
        "/accounts?shopify=error&reason=missing_credentials",
        req.nextUrl.origin,
      ),
    );
  }
  if (!shop) {
    return NextResponse.redirect(
      new URL(
        "/accounts?shopify=error&reason=missing_domain",
        req.nextUrl.origin,
      ),
    );
  }

  // Validate that the secret is decryptable (catches bad stored data early)
  try {
    decrypt(encryptedSecret);
  } catch {
    return NextResponse.redirect(
      new URL(
        "/accounts?shopify=error&reason=invalid_secret",
        req.nextUrl.origin,
      ),
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/shopify/callback`;
  const state = Buffer.from(accountId).toString("base64url");

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "read_orders,read_customers");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
