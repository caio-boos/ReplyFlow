import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/crypto/encryption";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  const errorRedirect = (reason: string) =>
    NextResponse.redirect(new URL(`/accounts?shopify=error&reason=${reason}`, req.nextUrl.origin));

  if (!code || !shop || !state || !hmac) return errorRedirect("missing_params");

  // Verify Shopify HMAC signature
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) return errorRedirect("no_secret");

  const params = new URLSearchParams(searchParams);
  params.delete("hmac");
  params.sort();
  const digest = crypto.createHmac("sha256", clientSecret).update(params.toString()).digest("hex");
  if (digest !== hmac) return errorRedirect("invalid_hmac");

  // Decode state → accountId
  let accountId: string;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    accountId = decoded.split(":")[0];
    if (!accountId) throw new Error("empty accountId");
  } catch {
    return errorRedirect("invalid_state");
  }

  // Exchange code for offline access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) return errorRedirect("token_exchange_failed");

  const { access_token } = await tokenRes.json() as { access_token: string };
  if (!access_token) return errorRedirect("no_access_token");

  // Encrypt and store in Firestore
  const db = getAdminDb();
  await db.collection("accounts").doc(accountId).update({
    shopifyDomain: shop,
    encryptedShopifyToken: encrypt(access_token),
  });

  return NextResponse.redirect(new URL("/accounts?shopify=connected", req.nextUrl.origin));
}
