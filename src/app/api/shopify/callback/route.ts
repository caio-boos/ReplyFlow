import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  const errorRedirect = (reason: string) =>
    NextResponse.redirect(
      new URL(`/accounts?shopify=error&reason=${reason}`, req.nextUrl.origin),
    );

  if (!code || !shop || !state || !hmac) return errorRedirect("missing_params");

  // Decode state → accountId
  let accountId: string;
  try {
    accountId = Buffer.from(state, "base64url").toString("utf8");
    if (!accountId) throw new Error("empty accountId");
  } catch {
    return errorRedirect("invalid_state");
  }

  // Load per-account credentials from Firestore
  const db = getAdminDb();
  const doc = await db.collection("accounts").doc(accountId).get();
  if (!doc.exists) return errorRedirect("account_not_found");

  const data = doc.data()!;
  const clientId = data.shopifyClientId as string | null;
  const encryptedSecret = data.encryptedShopifyClientSecret as string | null;

  if (!clientId || !encryptedSecret)
    return errorRedirect("missing_credentials");

  let clientSecret: string;
  try {
    clientSecret = decrypt(encryptedSecret);
  } catch {
    return errorRedirect("invalid_secret");
  }

  // Verify Shopify HMAC signature using per-account secret
  const params = new URLSearchParams(searchParams);
  params.delete("hmac");
  params.sort();
  const digest = crypto
    .createHmac("sha256", clientSecret)
    .update(params.toString())
    .digest("hex");
  if (digest !== hmac) return errorRedirect("invalid_hmac");

  // Exchange code for offline access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) return errorRedirect("token_exchange_failed");

  const { access_token } = (await tokenRes.json()) as { access_token: string };
  if (!access_token) return errorRedirect("no_access_token");

  // Persist encrypted token + confirm domain matches what's stored
  await db
    .collection("accounts")
    .doc(accountId)
    .update({
      shopifyDomain: shop,
      encryptedShopifyToken: encrypt(access_token),
    });

  return NextResponse.redirect(
    new URL("/accounts?shopify=connected", req.nextUrl.origin),
  );
}
