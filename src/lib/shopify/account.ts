import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { ShopifyApiError } from "@/lib/shopify/client";
import type { DocumentData } from "firebase-admin/firestore";

export type ShopifyAccountResult =
  | { ok: false; status: number; error: string }
  | { ok: true; domain: string; token: string; account: DocumentData };

/** Loads an account owned by `userId` and returns its decrypted Shopify credentials. */
export async function loadShopifyAccount(
  accountId: string,
  userId: string,
): Promise<ShopifyAccountResult> {
  if (!accountId) return { ok: false, status: 400, error: "accountId é obrigatório" };

  const db = getAdminDb();
  const doc = await db.collection("accounts").doc(accountId).get();
  if (!doc.exists) return { ok: false, status: 404, error: "Conta não encontrada" };

  const account = doc.data()!;
  if (account.userId !== userId) return { ok: false, status: 403, error: "Forbidden" };

  if (!account.shopifyDomain || !account.encryptedShopifyToken) {
    return { ok: false, status: 400, error: "Esta conta não tem Shopify conectado" };
  }

  let token: string;
  try {
    token = decrypt(account.encryptedShopifyToken);
  } catch {
    return { ok: false, status: 400, error: "Token Shopify inválido — reconecte a loja" };
  }

  return { ok: true, domain: account.shopifyDomain as string, token, account };
}

/** Turns a Shopify API failure into a message the merchant can act on. */
export function describeShopifyError(
  err: unknown,
): { status: number; error: string } | null {
  if (!(err instanceof ShopifyApiError)) return null;

  if (err.status === 401 || err.status === 403) {
    return {
      status: 400,
      error:
        "O app não tem permissão para ler esses dados na Shopify. Vá em Contas, clique em reconectar a loja e aceite as permissões (read_products, read_orders, read_customers).",
    };
  }
  if (err.status === 429) {
    return {
      status: 429,
      error: "A Shopify limitou as requisições. Tente novamente em instantes.",
    };
  }
  return { status: 502, error: `Erro na API da Shopify (${err.status}).` };
}
