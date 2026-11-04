import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { ShopifyApiError } from "@/lib/shopify/client";
import type { DocumentData } from "firebase-admin/firestore";
import type { Locale } from "@/lib/i18n/config";
import { createT } from "@/lib/i18n/server";

export type ShopifyAccountResult =
  | { ok: false; status: number; error: string }
  | { ok: true; domain: string; token: string; account: DocumentData };

/** Loads an account owned by `userId` and returns its decrypted Shopify credentials. */
export async function loadShopifyAccount(
  accountId: string,
  userId: string,
  locale: Locale = "en",
): Promise<ShopifyAccountResult> {
  const t = createT(locale, "stores");
  if (!accountId) return { ok: false, status: 400, error: t("api.accountIdRequired") };

  const db = getAdminDb();
  const doc = await db.collection("accounts").doc(accountId).get();
  if (!doc.exists) return { ok: false, status: 404, error: t("api.accountNotFound") };

  const account = doc.data()!;
  if (account.userId !== userId) return { ok: false, status: 403, error: createT(locale, "common")("states.forbidden") };

  if (!account.shopifyDomain || !account.encryptedShopifyToken) {
    return { ok: false, status: 400, error: t("api.shopifyNotConnected") };
  }

  let token: string;
  try {
    token = decrypt(account.encryptedShopifyToken);
  } catch {
    return { ok: false, status: 400, error: t("api.invalidToken") };
  }

  return { ok: true, domain: account.shopifyDomain as string, token, account };
}

/** Turns a Shopify API failure into a message the merchant can act on. */
export function describeShopifyError(
  err: unknown,
  locale: Locale = "en",
): { status: number; error: string } | null {
  if (!(err instanceof ShopifyApiError)) return null;
  const t = createT(locale, "stores");

  if (err.status === 401 || err.status === 403) {
    return {
      status: 400,
      error: t("api.shopifyForbidden"),
    };
  }
  if (err.status === 429) {
    return {
      status: 429,
      error: t("api.shopifyRateLimited"),
    };
  }
  return { status: 502, error: t("api.shopifyApiError", { status: String(err.status) }) };
}
