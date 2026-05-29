import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getShopifyOrderByNumber, getShopifyOrdersByEmail, formatOrderForAI } from "@/lib/shopify/client";
import { extractOrderNumbers } from "@/lib/customer/identifier";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId, query } = await req.json();
  if (!accountId || !query) {
    return NextResponse.json({ error: "accountId e query são obrigatórios" }, { status: 400 });
  }

  const db = getAdminDb();
  const accountDoc = await db.collection("accounts").doc(accountId).get();
  if (!accountDoc.exists) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  const accountData = accountDoc.data()!;
  if (!accountData.shopifyDomain || !accountData.encryptedShopifyToken) {
    return NextResponse.json({ error: "Esta conta não tem Shopify configurado" }, { status: 400 });
  }

  const token = decrypt(accountData.encryptedShopifyToken);
  const domain = accountData.shopifyDomain as string;

  // Validate connection first with a lightweight shop ping
  const base = domain.includes("myshopify.com") ? domain : `${domain}.myshopify.com`;
  const pingRes = await fetch(`https://${base}/admin/api/2024-10/shop.json`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!pingRes.ok) {
    const body = await pingRes.text().catch(() => "");
    return NextResponse.json({
      error: `Erro de autenticação Shopify (${pingRes.status}): ${body || "token inválido ou sem permissão"}`,
    }, { status: 400 });
  }

  // Try as order number first, then as customer email
  const orderNumbers = extractOrderNumbers(query);
  let order = null;
  for (const num of orderNumbers) {
    order = await getShopifyOrderByNumber(domain, token, num);
    if (order) break;
  }
  if (!order) {
    const orders = await getShopifyOrdersByEmail(domain, token, query);
    if (orders.length > 0) order = orders[0];
  }

  if (!order) {
    return NextResponse.json({
      error: `Conexão OK ✓ — mas nenhum pedido encontrado para: "${query}"`,
    }, { status: 404 });
  }

  return NextResponse.json({ result: formatOrderForAI(order) });
}
