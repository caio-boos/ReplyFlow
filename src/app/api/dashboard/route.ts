import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getRefundedOrders } from "@/lib/shopify/client";

function dateKey(ms: number): string {
  if (!ms || isNaN(ms)) return new Date().toISOString().slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

type PedidosData = {
  total: number; valorAnalisado: number; valorReembolsado: number;
  valorPoupado: number; percentualPoupado: number;
  reembolsosParciais: number; reembolsosTotais: number;
  byDay: Array<{ date: string; count: number; valorPoupado: number }>;
  porConta: Array<{
    id: string; label: string; total: number;
    valorAnalisado: number; valorReembolsado: number; valorPoupado: number; percentualPoupado: number;
  }>;
};

async function fetchExchangeRates(): Promise<Record<string, number>> {
  const FALLBACK: Record<string, number> = {
    USD: 1, EUR: 0.92, JPY: 149, BRL: 5.0, GBP: 0.79, CAD: 1.36,
    AUD: 1.53, CHF: 0.88, CNY: 7.24, KRW: 1320, MXN: 17.5, SGD: 1.34,
  };
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    if (!res.ok) return FALLBACK;
    const data = await res.json() as { rates?: Record<string, number> };
    return data.rates ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period") ?? "30";
  const accountFilter = searchParams.get("accountId") ?? "all";
  const periodDays = periodParam === "all" ? null : parseInt(periodParam, 10);
  const sinceMs = periodDays ? Date.now() - periodDays * 86400000 : null;

  const db = getAdminDb();
  const { Timestamp } = await import("firebase-admin/firestore");

  const accountsSnap = await db.collection("accounts").where("userId", "==", session.uid).get();
  const allAccounts = accountsSnap.docs
    .sort((a, b) => (a.data().createdAt?.seconds ?? 0) - (b.data().createdAt?.seconds ?? 0))
    .map((d) => ({
      id: d.id,
      label: (d.data().label || d.data().email || d.id) as string,
      email: (d.data().email || "") as string,
      shopifyConnected: !!d.data().encryptedShopifyToken,
      shopifyDomain: (d.data().shopifyDomain as string | null) ?? null,
      encryptedShopifyToken: (d.data().encryptedShopifyToken as string | null) ?? null,
    }));

  const filteredAccounts =
    accountFilter === "all" ? allAccounts : allAccounts.filter((a) => a.id === accountFilter);
  const accountIds = filteredAccounts.map((a) => a.id);
  const hasShopify = filteredAccounts.some((a) => a.shopifyConnected);

  const empty = {
    periodDays,
    atendimentos: {
      total: 0, sent: 0, failed: 0, cancelled: 0, pending: 0,
      autoRate: 0, chargebacks: 0, refunds: 0, economiaGerada: 0,
      byDay: [] as Array<{ date: string; recebidos: number; enviados: number }>,
      chargebackItems: [] as Array<{ id: string; customerId: string; from: string; fromName: string; subject: string; orderValueUSD: number; sentAt: string; accountLabel: string }>,
    },
    financeiro: {
      hasShopify,
      orderCurrencies: [] as string[],
      rates: { USD: 1 } as Record<string, number>,
      pedidos: { total: 0, valorAnalisado: 0, valorReembolsado: 0, valorPoupado: 0, percentualPoupado: 0, reembolsosParciais: 0, reembolsosTotais: 0, byDay: [], porConta: [] } as PedidosData,
      refundedOrders: [] as Array<{ id: string; name: string; financialStatus: string; currency: string; totalPriceUSD: number; totalRefundedUSD: number; createdAt: string; accountLabel: string }>,
    },
    perAccount: [] as Array<{
      id: string; label: string; email: string; shopifyConnected: boolean;
      enviados: number; chargebacks: number;
    }>,
  };

  if (accountIds.length === 0) return NextResponse.json(empty);

  // --- Emails in period ---
  const emailsSnap = sinceMs
    ? await db.collection("emails").where("receivedAt", ">=", Timestamp.fromMillis(sinceMs)).get()
    : await db.collection("emails").get();

  const emails = emailsSnap.docs
    .filter((d) => accountIds.includes(d.data().accountId))
    .map((d) => d.data() as Record<string, unknown>);

  // --- Chargeback + refund emails ---
  const cbSnap = await db.collection("emails")
    .where("chargebackRisk", "==", true).where("status", "==", "sent").get();
  const cbDocs = cbSnap.docs.filter((d) => {
    const data = d.data();
    if (!accountIds.includes(data.accountId as string)) return false;
    if (sinceMs && (data.sentAt?.seconds ?? 0) * 1000 < sinceMs) return false;
    return true;
  });

  const refundSnap = await db.collection("emails")
    .where("refundResolved", "==", true).where("status", "==", "sent").get();
  const refundDocs = refundSnap.docs.filter((d) => {
    const data = d.data();
    if (!accountIds.includes(data.accountId as string)) return false;
    if (sinceMs && (data.sentAt?.seconds ?? 0) * 1000 < sinceMs) return false;
    return true;
  });


  // --- Atendimentos ---
  const total = emails.length;
  const sent = emails.filter((e) => e.status === "sent").length;
  const failed = emails.filter((e) => e.status === "failed").length;
  const cancelled = emails.filter((e) => e.status === "cancelled").length;
  const pending = emails.filter((e) => e.status === "pending" || e.status === "processing").length;
  const processable = sent + failed + cancelled;
  const autoRate = processable > 0 ? Math.round((sent / processable) * 100) : 0;

  let economiaGerada = 0; // calculated after Shopify orders are fetched for proper currency conversion

  const byDayMap = new Map<string, { recebidos: number; enviados: number }>();
  for (const e of emails) {
    const ms = (e.receivedAt as { seconds: number } | undefined)?.seconds
      ? (e.receivedAt as { seconds: number }).seconds * 1000 : Date.now();
    const day = dateKey(ms);
    if (!byDayMap.has(day)) byDayMap.set(day, { recebidos: 0, enviados: 0 });
    byDayMap.get(day)!.recebidos++;
    if (e.status === "sent") byDayMap.get(day)!.enviados++;
  }
  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // --- Shopify refunded orders (all converted to USD before summing) ---
  const rates = hasShopify ? await fetchExchangeRates() : ({ USD: 1 } as Record<string, number>);
  const toUSD = (amount: number, cur: string) => amount / (rates[cur] ?? 1);

  const perAccountOrders = new Map<string, Awaited<ReturnType<typeof getRefundedOrders>>>();
  const allRefundedOrders: Awaited<ReturnType<typeof getRefundedOrders>> = [];

  for (const acc of filteredAccounts) {
    if (!acc.shopifyConnected || !acc.shopifyDomain || !acc.encryptedShopifyToken) continue;
    try {
      const token = decrypt(acc.encryptedShopifyToken);
      const orders = await getRefundedOrders(acc.shopifyDomain, token, sinceMs ? new Date(sinceMs) : undefined);
      perAccountOrders.set(acc.id, orders);
      allRefundedOrders.push(...orders);
    } catch (e) {
      console.error(`Shopify fetch failed for account ${acc.id}:`, e);
    }
  }

  // Build dominant currency per account to convert orderValue correctly
  const accountCurrencyMap = new Map<string, string>();
  for (const [accId, orders] of perAccountOrders) {
    if (orders.length === 0) continue;
    const freq = new Map<string, number>();
    for (const o of orders) freq.set(o.currency, (freq.get(o.currency) ?? 0) + 1);
    accountCurrencyMap.set(accId, [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  const seenCustomers = new Set<string>();
  for (const d of [...cbDocs, ...refundDocs.filter((d) => !d.data().chargebackRisk)]) {
    const { accountId, customerId, orderValue } = d.data();
    const key = `${accountId}:${customerId}`;
    if (!seenCustomers.has(key as string)) {
      seenCustomers.add(key as string);
      if (typeof orderValue === "number" && orderValue > 0) {
        const cur = accountCurrencyMap.get(accountId as string) ?? "USD";
        economiaGerada += toUSD(orderValue, cur);
      }
    }
  }

  const chargebackItems = cbDocs.map((d) => {
    const data = d.data();
    const cur = accountCurrencyMap.get(data.accountId as string) ?? "USD";
    return {
      id: d.id,
      customerId: (data.customerId as string) ?? "",
      from: (data.from as string) ?? "",
      fromName: (data.fromName as string) ?? "",
      subject: (data.subject as string) ?? "",
      orderValueUSD: typeof data.orderValue === "number" && data.orderValue > 0 ? toUSD(data.orderValue, cur) : 0,
      sentAt: data.sentAt ? new Date((data.sentAt as { seconds: number }).seconds * 1000).toISOString().slice(0, 10) : "",
      accountLabel: filteredAccounts.find((a) => a.id === data.accountId)?.label ?? "",
    };
  }).sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  const refundedOrders = allRefundedOrders.map((o) => ({
    id: String(o.id),
    name: o.name,
    financialStatus: o.financialStatus,
    currency: o.currency,
    totalPriceUSD: toUSD(o.totalPrice, o.currency),
    totalRefundedUSD: toUSD(o.totalRefunded, o.currency),
    createdAt: o.createdAt ? o.createdAt.slice(0, 10) : "",
    accountLabel: filteredAccounts.find((a) =>
      (perAccountOrders.get(a.id) ?? []).some((ao) => ao.id === o.id)
    )?.label ?? "",
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // --- Aggregate all orders in USD ---
  const orderCurrencies = [...new Set(allRefundedOrders.map((o) => o.currency))].sort();
  const valorAnalisadoUSD  = allRefundedOrders.reduce((s, o) => s + toUSD(o.totalPrice, o.currency), 0);
  const valorReembolsadoUSD = allRefundedOrders.reduce((s, o) => s + toUSD(o.totalRefunded, o.currency), 0);
  const valorPoupado        = valorAnalisadoUSD - valorReembolsadoUSD;
  const percentualPoupado   = valorAnalisadoUSD > 0 ? Math.round((valorPoupado / valorAnalisadoUSD) * 100) : 0;
  const reembolsosParciais  = allRefundedOrders.filter((o) => o.financialStatus === "partially_refunded").length;
  const reembolsosTotais    = allRefundedOrders.filter((o) => o.financialStatus === "refunded").length;

  const pedDayMap = new Map<string, { count: number; valorPoupado: number }>();
  for (const order of allRefundedOrders) {
    const ms = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
    const day = dateKey(isNaN(ms) ? Date.now() : ms);
    if (!pedDayMap.has(day)) pedDayMap.set(day, { count: 0, valorPoupado: 0 });
    pedDayMap.get(day)!.count++;
    pedDayMap.get(day)!.valorPoupado += toUSD(order.totalPrice, order.currency) - toUSD(order.totalRefunded, order.currency);
  }
  const pedByDay = Array.from(pedDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const porConta = filteredAccounts
    .filter((a) => a.shopifyConnected)
    .map((acc) => {
      const accOrders = perAccountOrders.get(acc.id) ?? [];
      const av = accOrders.reduce((s, o) => s + toUSD(o.totalPrice, o.currency), 0);
      const rv = accOrders.reduce((s, o) => s + toUSD(o.totalRefunded, o.currency), 0);
      const pv = av - rv;
      return { id: acc.id, label: acc.label, total: accOrders.length, valorAnalisado: av, valorReembolsado: rv, valorPoupado: pv, percentualPoupado: av > 0 ? Math.round((pv / av) * 100) : 0 };
    })
    .filter((a) => a.total > 0);

  const pedidos: PedidosData = {
    total: allRefundedOrders.length, valorAnalisado: valorAnalisadoUSD, valorReembolsado: valorReembolsadoUSD,
    valorPoupado, percentualPoupado, reembolsosParciais, reembolsosTotais, byDay: pedByDay, porConta,
  };

  // Per-account (Atendimentos tab only)
  const perAccount = filteredAccounts.map((acc) => {
    const accEmails = emails.filter((e) => e.accountId === acc.id);
    return {
      id: acc.id, label: acc.label, email: acc.email, shopifyConnected: acc.shopifyConnected,
      enviados: accEmails.filter((e) => e.status === "sent").length,
      chargebacks: cbDocs.filter((d) => d.data().accountId === acc.id).length,
    };
  });

  return NextResponse.json({
    periodDays,
    atendimentos: { total, sent, failed, cancelled, pending, autoRate, chargebacks: cbDocs.length, refunds: refundDocs.length, economiaGerada, byDay, chargebackItems },
    financeiro: { hasShopify, orderCurrencies, rates, pedidos, refundedOrders },
    perAccount,
  });
}
