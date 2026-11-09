import { NextRequest, NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getPendingReturnOrders, getRefundedOrders } from "@/lib/shopify/client";
import { getT } from "@/lib/i18n/server";

function dateKey(ms: number): string {
  if (!ms || isNaN(ms)) return new Date().toISOString().slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Continuous day keys for the selected period so charts never skip empty days. */
function buildDayRange(sinceMs: number | null, fallbackKeys: string[]): string[] {
  const todayKey = dateKey(Date.now());
  if (sinceMs) {
    const start = new Date(`${dateKey(sinceMs)}T00:00:00Z`).getTime();
    const end = new Date(`${todayKey}T00:00:00Z`).getTime();
    const days = Math.round((end - start) / 86400000) + 1;
    return Array.from({ length: Math.max(days, 1) }, (_, i) => dateKey(start + i * 86400000));
  }
  if (fallbackKeys.length === 0) return [];
  const sorted = [...new Set(fallbackKeys)].sort();
  const first = new Date(`${sorted[0]}T00:00:00Z`).getTime();
  const last = new Date(`${sorted[sorted.length - 1]}T00:00:00Z`).getTime();
  const span = Math.round((last - first) / 86400000) + 1;
  if (!isFinite(span) || span <= 0) return sorted;
  // Cap long histories to the most recent days so the chart keeps the relevant window
  const days = Math.min(span, 400);
  const start = last - (days - 1) * 86400000;
  return Array.from({ length: days }, (_, i) => dateKey(start + i * 86400000));
}

type DevolucaoDayPoint = {
  date: string; count: number; valorPoupado: number;
  concluidas: number; pendentes: number; valorReembolsado: number;
};

type PedidosData = {
  total: number; valorAnalisado: number; valorReembolsado: number;
  valorPoupado: number; percentualPoupado: number;
  reembolsosParciais: number; reembolsosTotais: number;
  byDay: DevolucaoDayPoint[];
  pendentes: {
    total: number;
    valorEmRisco: number;
    returnRequested: number;
    inProgress: number;
    inspectionComplete: number;
    internos: number;
    valorInterno: number;
  };
  porConta: Array<{
    id: string; label: string; total: number;
    valorAnalisado: number; valorReembolsado: number; valorPoupado: number; percentualPoupado: number;
    pendentes: number;
  }>;
};

type CarrinhosData = {
  enviados: number;
  recuperados: number;
  taxaRecuperacao: number;
  valorRecuperado: number;
  valorEmAberto: number;
  ticketMedio: number;
  byDay: Array<{ date: string; recuperados: number; valor: number; enviados: number }>;
  topProdutos: Array<{ title: string; imageUrl: string | null; pedidos: number; quantidade: number; valor: number }>;
  porConta: Array<{ id: string; label: string; enviados: number; recuperados: number; valorRecuperado: number; taxaRecuperacao: number }>;
  recentes: Array<{
    id: string; customerName: string; customerEmail: string; orderName: string;
    valor: number; recoveredAt: string; accountLabel: string;
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

/** Abandoned-cart recovery report built from the `remarketing` collection. */
async function buildCarrinhos({
  db, accountIds, accountLabels, sinceMs, toUSD,
}: {
  db: Firestore;
  accountIds: string[];
  accountLabels: Map<string, string>;
  sinceMs: number | null;
  toUSD: (amount: number, currency: string) => number;
}): Promise<CarrinhosData> {
  const empty: CarrinhosData = {
    enviados: 0, recuperados: 0, taxaRecuperacao: 0, valorRecuperado: 0, valorEmAberto: 0,
    ticketMedio: 0, byDay: [], topProdutos: [], porConta: [], recentes: [],
  };
  if (accountIds.length === 0) return empty;

  const { Timestamp } = await import("firebase-admin/firestore");
  const docsById = new Map<string, Record<string, unknown>>();

  if (sinceMs) {
    const since = Timestamp.fromMillis(sinceMs);
    // Two single-field range queries: carts sent in the period + carts recovered in the period
    const [sentSnap, recoveredSnap] = await Promise.all([
      db.collection("remarketing").where("sentAt", ">=", since).get(),
      db.collection("remarketing").where("recoveredAt", ">=", since).get(),
    ]);
    for (const doc of [...sentSnap.docs, ...recoveredSnap.docs]) docsById.set(doc.id, doc.data());
  } else {
    const snap = await db.collection("remarketing").get();
    for (const doc of snap.docs) docsById.set(doc.id, doc.data());
  }

  const seconds = (value: unknown) => (value as { seconds?: number } | undefined)?.seconds ?? 0;

  const docs = [...docsById.entries()]
    .map(([id, d]) => {
      const sentSec = seconds(d.sentAt) || seconds(d.createdAt);
      const recoveredSec = seconds(d.recoveredAt) || sentSec;
      const currency = (d.recoveredCurrency as string | undefined) || (d.currency as string | undefined) || "USD";
      const recoveredValue = typeof d.recoveredOrderTotal === "number" && d.recoveredOrderTotal > 0
        ? d.recoveredOrderTotal
        : (typeof d.cartValue === "number" ? d.cartValue : 0);
      return {
        id,
        accountId: (d.accountId as string) ?? "",
        status: (d.status as string) ?? "sent",
        customerName: (d.customerName as string) ?? "",
        customerEmail: (d.customerEmail as string) ?? "",
        orderName: (d.recoveredOrderName as string | null) ?? "",
        currency,
        cartValue: typeof d.cartValue === "number" ? d.cartValue : 0,
        recoveredValue,
        lineItems: ((d.lineItems ?? []) as Array<{ title?: string; quantity?: number; price?: number; imageUrl?: string | null }>),
        sentMs: sentSec * 1000,
        recoveredMs: recoveredSec * 1000,
      };
    })
    .filter((d) => accountIds.includes(d.accountId));

  const inPeriod = (ms: number) => !sinceMs || ms >= sinceMs;

  const enviadosDocs = docs.filter((d) => d.status !== "failed" && inPeriod(d.sentMs));
  const recuperadosDocs = docs.filter((d) => d.status === "recovered" && inPeriod(d.recoveredMs));
  /** Rate is cohort-based: of the carts emailed in the period, how many converted. */
  const enviadosRecuperados = enviadosDocs.filter((d) => d.status === "recovered").length;

  const valorRecuperado = recuperadosDocs.reduce((s, d) => s + toUSD(d.recoveredValue, d.currency), 0);
  const valorEmAberto = enviadosDocs
    .filter((d) => d.status !== "recovered")
    .reduce((s, d) => s + toUSD(d.cartValue, d.currency), 0);

  const dayMap = new Map<string, { recuperados: number; valor: number; enviados: number }>();
  const ensureDay = (day: string) => {
    if (!dayMap.has(day)) dayMap.set(day, { recuperados: 0, valor: 0, enviados: 0 });
    return dayMap.get(day)!;
  };
  for (const d of enviadosDocs) ensureDay(dateKey(d.sentMs)).enviados++;
  for (const d of recuperadosDocs) {
    const slot = ensureDay(dateKey(d.recoveredMs));
    slot.recuperados++;
    slot.valor += toUSD(d.recoveredValue, d.currency);
  }
  const byDay = buildDayRange(sinceMs, [...dayMap.keys()]).map((date) => ({
    date,
    ...(dayMap.get(date) ?? { recuperados: 0, valor: 0, enviados: 0 }),
  }));

  const produtoMap = new Map<string, { title: string; imageUrl: string | null; pedidos: number; quantidade: number; valor: number }>();
  for (const d of recuperadosDocs) {
    for (const item of d.lineItems) {
      const title = (item.title ?? "").trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (!produtoMap.has(key)) {
        produtoMap.set(key, { title, imageUrl: item.imageUrl ?? null, pedidos: 0, quantidade: 0, valor: 0 });
      }
      const entry = produtoMap.get(key)!;
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      const price = typeof item.price === "number" ? item.price : 0;
      entry.pedidos++;
      entry.quantidade += quantity;
      entry.valor += toUSD(price * quantity, d.currency);
      if (!entry.imageUrl && item.imageUrl) entry.imageUrl = item.imageUrl;
    }
  }
  const topProdutos = [...produtoMap.values()]
    .sort((a, b) => b.valor - a.valor || b.quantidade - a.quantidade)
    .slice(0, 10);

  const porConta = accountIds
    .map((id) => {
      const accSent = enviadosDocs.filter((d) => d.accountId === id);
      const accRecovered = recuperadosDocs.filter((d) => d.accountId === id);
      const accSentRecovered = accSent.filter((d) => d.status === "recovered").length;
      return {
        id,
        label: accountLabels.get(id) ?? id,
        enviados: accSent.length,
        recuperados: accRecovered.length,
        valorRecuperado: accRecovered.reduce((s, d) => s + toUSD(d.recoveredValue, d.currency), 0),
        taxaRecuperacao: accSent.length > 0 ? Math.round((accSentRecovered / accSent.length) * 100) : 0,
      };
    })
    .filter((a) => a.enviados > 0 || a.recuperados > 0);

  const recentes = recuperadosDocs
    .sort((a, b) => b.recoveredMs - a.recoveredMs)
    .slice(0, 20)
    .map((d) => ({
      id: d.id,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      orderName: d.orderName,
      valor: toUSD(d.recoveredValue, d.currency),
      recoveredAt: dateKey(d.recoveredMs),
      accountLabel: accountLabels.get(d.accountId) ?? "",
    }));

  return {
    enviados: enviadosDocs.length,
    recuperados: recuperadosDocs.length,
    taxaRecuperacao: enviadosDocs.length > 0 ? Math.round((enviadosRecuperados / enviadosDocs.length) * 100) : 0,
    valorRecuperado,
    valorEmAberto,
    ticketMedio: recuperadosDocs.length > 0 ? valorRecuperado / recuperadosDocs.length : 0,
    byDay,
    topProdutos,
    porConta,
    recentes,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: (await getT("common"))("states.unauthorized") }, { status: 401 });

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
      pedidos: {
        total: 0, valorAnalisado: 0, valorReembolsado: 0, valorPoupado: 0, percentualPoupado: 0,
        reembolsosParciais: 0, reembolsosTotais: 0, byDay: [],
        pendentes: { total: 0, valorEmRisco: 0, returnRequested: 0, inProgress: 0, inspectionComplete: 0, internos: 0, valorInterno: 0 },
        porConta: [],
      } as PedidosData,
      refundedOrders: [] as Array<{ id: string; name: string; financialStatus: string; currency: string; totalPriceUSD: number; totalRefundedUSD: number; createdAt: string; accountLabel: string }>,
      pendingReturns: [] as Array<{ id: string; name: string; returnStatus: string; currency: string; totalPriceUSD: number; createdAt: string; accountLabel: string }>,
      pendingRefundRequests: [] as Array<{ id: string; customerId: string; customerName: string; subject: string; description: string; orderValueUSD: number; createdAt: string; accountLabel: string }>,
    },
    carrinhos: {
      enviados: 0, recuperados: 0, taxaRecuperacao: 0, valorRecuperado: 0, valorEmAberto: 0,
      ticketMedio: 0, byDay: [], topProdutos: [], porConta: [], recentes: [],
    } as CarrinhosData,
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
  const perAccountPendingReturns = new Map<string, Awaited<ReturnType<typeof getPendingReturnOrders>>>();
  const allPendingReturns: Awaited<ReturnType<typeof getPendingReturnOrders>> = [];

  for (const acc of filteredAccounts) {
    if (!acc.shopifyConnected || !acc.shopifyDomain || !acc.encryptedShopifyToken) continue;
    try {
      const token = decrypt(acc.encryptedShopifyToken);
      const fetched = await getRefundedOrders(acc.shopifyDomain, token, sinceMs ? new Date(sinceMs) : undefined);
      // Keep only refunds actually issued inside the period (the API filters by order update)
      const orders = sinceMs
        ? fetched.filter((o) => {
            const ms = o.refundedAt ? new Date(o.refundedAt).getTime() : NaN;
            return isNaN(ms) || ms >= sinceMs;
          })
        : fetched;
      perAccountOrders.set(acc.id, orders);
      allRefundedOrders.push(...orders);

      // Returns that are open (requested / in transit / under inspection) — not refunded yet
      const pending = await getPendingReturnOrders(acc.shopifyDomain, token, sinceMs ? new Date(sinceMs) : undefined);
      const refundedIds = new Set(orders.map((o) => String(o.id)));
      const onlyPending = pending.filter(
        (p) => !refundedIds.has(p.id.split("/").pop() ?? p.id) && p.returnStatus !== "RETURNED",
      );
      perAccountPendingReturns.set(acc.id, onlyPending);
      allPendingReturns.push(...onlyPending);
    } catch (e) {
      console.error(`Shopify fetch failed for account ${acc.id}:`, e);
    }
  }

  // Build dominant currency per account to convert orderValue correctly
  const accountCurrencyMap = new Map<string, string>();
  for (const acc of filteredAccounts) {
    const orders = [
      ...(perAccountOrders.get(acc.id) ?? []),
      ...(perAccountPendingReturns.get(acc.id) ?? []),
    ];
    if (orders.length === 0) continue;
    const freq = new Map<string, number>();
    for (const o of orders) freq.set(o.currency, (freq.get(o.currency) ?? 0) + 1);
    accountCurrencyMap.set(acc.id, [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]);
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
  }).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .filter(((seen) => (item: { customerId: string; from: string }) => {
      const key = item.customerId || item.from;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })(new Set<string>()));

  const refundedOrders = allRefundedOrders.map((o) => ({
    id: String(o.id),
    name: o.name,
    financialStatus: o.financialStatus,
    currency: o.currency,
    totalPriceUSD: toUSD(o.totalPrice, o.currency),
    totalRefundedUSD: toUSD(o.totalRefunded, o.currency),
    createdAt: o.createdAt ? o.createdAt.slice(0, 10) : "",
    refundedAt: o.refundedAt ? o.refundedAt.slice(0, 10) : "",
    accountLabel: filteredAccounts.find((a) =>
      (perAccountOrders.get(a.id) ?? []).some((ao) => ao.id === o.id)
    )?.label ?? "",
  })).sort((a, b) => (b.refundedAt || b.createdAt).localeCompare(a.refundedAt || a.createdAt));

  // --- Aggregate all orders in USD ---
  const orderCurrencies = [...new Set([...allRefundedOrders, ...allPendingReturns].map((o) => o.currency))].sort();
  const valorAnalisadoUSD  = allRefundedOrders.reduce((s, o) => s + toUSD(o.totalPrice, o.currency), 0);
  const valorReembolsadoUSD = allRefundedOrders.reduce((s, o) => s + toUSD(o.totalRefunded, o.currency), 0);
  const valorPoupado        = valorAnalisadoUSD - valorReembolsadoUSD;
  const percentualPoupado   = valorAnalisadoUSD > 0 ? Math.round((valorPoupado / valorAnalisadoUSD) * 100) : 0;
  const reembolsosParciais  = allRefundedOrders.filter((o) => o.financialStatus === "partially_refunded").length;
  const reembolsosTotais    = allRefundedOrders.filter((o) => o.financialStatus === "refunded").length;

  const pendingReturns = allPendingReturns.map((o) => ({
    id: o.id,
    name: o.name,
    returnStatus: o.returnStatus,
    currency: o.currency,
    totalPriceUSD: toUSD(o.totalPrice, o.currency),
    createdAt: o.createdAt ? o.createdAt.slice(0, 10) : "",
    updatedAt: o.updatedAt ? o.updatedAt.slice(0, 10) : "",
    accountLabel: filteredAccounts.find((a) =>
      (perAccountPendingReturns.get(a.id) ?? []).some((ao) => ao.id === o.id)
    )?.label ?? "",
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // --- Refunds the customer already accepted but that weren't processed in Shopify yet ---
  const pendingTasksSnap = await db.collection("tasks")
    .where("flags.refund_pending", "==", true)
    .where("completed", "==", false)
    .get();

  const pendingTaskDocs = pendingTasksSnap.docs.filter((d) => {
    const data = d.data();
    if (!accountIds.includes(data.accountId as string)) return false;
    if (sinceMs && (data.createdAt?.seconds ?? 0) * 1000 < sinceMs) return false;
    return true;
  }).filter(((seen) => (d: { id: string; data: () => Record<string, unknown> }) => {
    // One email can spawn several tasks carrying the same refund_pending flag — count it once
    const key = (d.data().emailId as string) || d.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })(new Set<string>()));

  const pendingTaskEmailIds = [...new Set(
    pendingTaskDocs.map((d) => d.data().emailId as string | undefined).filter(Boolean) as string[],
  )].slice(0, 100);
  const pendingTaskEmailValues = new Map<string, number>();
  if (pendingTaskEmailIds.length > 0) {
    const emailRefs = pendingTaskEmailIds.map((id) => db.collection("emails").doc(id));
    const emailDocs = await db.getAll(...emailRefs);
    for (const doc of emailDocs) {
      const value = doc.data()?.orderValue;
      if (typeof value === "number" && value > 0) pendingTaskEmailValues.set(doc.id, value);
    }
  }

  const pendingRefundRequests = pendingTaskDocs.map((d) => {
    const data = d.data();
    const cur = accountCurrencyMap.get(data.accountId as string) ?? "USD";
    const rawValue = pendingTaskEmailValues.get((data.emailId as string) ?? "") ?? 0;
    return {
      id: d.id,
      customerId: (data.customerId as string) ?? "",
      customerName: (data.customerName as string) ?? "",
      subject: (data.emailSubject as string) ?? "",
      description: (data.description as string) ?? "",
      orderValueUSD: rawValue > 0 ? toUSD(rawValue, cur) : 0,
      createdAt: data.createdAt ? new Date((data.createdAt as { seconds: number }).seconds * 1000).toISOString().slice(0, 10) : "",
      accountLabel: filteredAccounts.find((a) => a.id === data.accountId)?.label ?? "",
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendentes = {
    total: allPendingReturns.length,
    valorEmRisco: allPendingReturns.reduce((s, o) => s + toUSD(o.totalPrice, o.currency), 0),
    returnRequested: allPendingReturns.filter((o) => o.returnStatus === "RETURN_REQUESTED").length,
    inProgress: allPendingReturns.filter((o) => o.returnStatus === "IN_PROGRESS").length,
    inspectionComplete: allPendingReturns.filter((o) => o.returnStatus === "INSPECTION_COMPLETE").length,
    internos: pendingRefundRequests.length,
    valorInterno: pendingRefundRequests.reduce((s, r) => s + r.orderValueUSD, 0),
  };

  // --- Returns per day (completed + pending), zero-filled across the period ---
  const pedDayMap = new Map<string, { count: number; valorPoupado: number; concluidas: number; pendentes: number; valorReembolsado: number }>();
  const ensureDay = (day: string) => {
    if (!pedDayMap.has(day)) pedDayMap.set(day, { count: 0, valorPoupado: 0, concluidas: 0, pendentes: 0, valorReembolsado: 0 });
    return pedDayMap.get(day)!;
  };
  for (const order of allRefundedOrders) {
    // Bucketed by refund date so the chart reflects when the money actually went back
    const raw = order.refundedAt || order.createdAt;
    const ms = raw ? new Date(raw).getTime() : Date.now();
    const slot = ensureDay(dateKey(isNaN(ms) ? Date.now() : ms));
    slot.count++;
    slot.concluidas++;
    slot.valorReembolsado += toUSD(order.totalRefunded, order.currency);
    slot.valorPoupado += toUSD(order.totalPrice, order.currency) - toUSD(order.totalRefunded, order.currency);
  }
  for (const order of allPendingReturns) {
    // Bucketed by last update: that's when the return actually moved, not when the order was placed
    const ms = order.updatedAt ? new Date(order.updatedAt).getTime() : Date.now();
    const slot = ensureDay(dateKey(isNaN(ms) ? Date.now() : ms));
    slot.count++;
    slot.pendentes++;
  }
  const pedByDay: DevolucaoDayPoint[] = buildDayRange(sinceMs, [...pedDayMap.keys()]).map((date) => ({
    date,
    ...(pedDayMap.get(date) ?? { count: 0, valorPoupado: 0, concluidas: 0, pendentes: 0, valorReembolsado: 0 }),
  }));

  const porConta = filteredAccounts
    .filter((a) => a.shopifyConnected)
    .map((acc) => {
      const accOrders = perAccountOrders.get(acc.id) ?? [];
      const av = accOrders.reduce((s, o) => s + toUSD(o.totalPrice, o.currency), 0);
      const rv = accOrders.reduce((s, o) => s + toUSD(o.totalRefunded, o.currency), 0);
      const pv = av - rv;
      return {
        id: acc.id, label: acc.label, total: accOrders.length,
        valorAnalisado: av, valorReembolsado: rv, valorPoupado: pv,
        percentualPoupado: av > 0 ? Math.round((pv / av) * 100) : 0,
        pendentes: (perAccountPendingReturns.get(acc.id) ?? []).length,
      };
    })
    .filter((a) => a.total > 0 || a.pendentes > 0);

  const pedidos: PedidosData = {
    total: allRefundedOrders.length, valorAnalisado: valorAnalisadoUSD, valorReembolsado: valorReembolsadoUSD,
    valorPoupado, percentualPoupado, reembolsosParciais, reembolsosTotais, byDay: pedByDay, pendentes, porConta,
  };

  const carrinhos = await buildCarrinhos({
    db,
    accountIds,
    accountLabels: new Map(filteredAccounts.map((a) => [a.id, a.label])),
    sinceMs,
    toUSD,
  });

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
    financeiro: { hasShopify, orderCurrencies, rates, pedidos, refundedOrders, pendingReturns, pendingRefundRequests },
    carrinhos,
    perAccount,
  });
}
