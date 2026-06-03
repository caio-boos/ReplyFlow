"use client";

import { useEffect, useState } from "react";

interface StatsPeriod {
  chargebacksAvoided: number;
  refundsResolved: number;
  valueAtRisk: number;
  emailsProcessed: number;
  ordersWithValue: number;
  autoReplyRate?: number;
}

interface AccountStat {
  id: string;
  label: string;
  email: string;
  shopifyConnected: boolean;
  allTime: StatsPeriod;
  month: StatsPeriod;
}

interface StatsData {
  month: StatsPeriod & { autoReplyRate: number };
  allTime: StatsPeriod;
  perAccount: AccountStat[];
}

function formatCurrency(value: number) {
  if (value === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  loading,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "indigo" | "emerald" | "violet" | "amber";
  loading: boolean;
  icon: React.ReactNode;
}) {
  const colors = {
    indigo: { icon: "bg-indigo-500/10 text-indigo-400", value: "text-indigo-300" },
    emerald: { icon: "bg-emerald-500/10 text-emerald-400", value: "text-emerald-300" },
    violet: { icon: "bg-violet-500/10 text-violet-400", value: "text-violet-300" },
    amber: { icon: "bg-amber-500/10 text-amber-400", value: "text-amber-300" },
  };
  const c = colors[accent];
  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>{icon}</div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-3 w-40" />
        </>
      ) : (
        <>
          <p className={`text-3xl font-bold tracking-tight ${c.value}`}>{value}</p>
          {sub && <p className="text-xs text-gray-600 -mt-2">{sub}</p>}
        </>
      )}
    </div>
  );
}

function HeroCard({
  chargebacks,
  refunds,
  loading,
}: {
  chargebacks: number;
  refunds: number;
  loading: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-indigo-500/10 via-gray-900/80 to-amber-500/10 border border-indigo-500/20 rounded-2xl p-6">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
            Ameaças diretas bloqueadas
          </p>
          <p className="text-xs text-gray-600 mb-3">
            Cliente ameaçou abrir disputa/chargeback
          </p>
          {loading ? <Skeleton className="h-16 w-32" /> : (
            <p className="text-7xl font-black text-white leading-none">{chargebacks}</p>
          )}
        </div>
        <div className="hidden sm:block w-px h-24 bg-white/10 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">
            Conflitos resolvidos proativamente
          </p>
          <p className="text-xs text-gray-600 mb-3">
            Cliente aceitou reembolso parcial sem acionar o banco
          </p>
          {loading ? <Skeleton className="h-16 w-32" /> : (
            <p className="text-7xl font-black text-amber-200 leading-none">{refunds}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountsTable({
  accounts,
  period,
  loading,
}: {
  accounts: AccountStat[];
  period: "month" | "allTime";
  loading: boolean;
}) {
  const shopifyAccounts = accounts.filter((a) => a.shopifyConnected);
  const noShopifyAccounts = accounts.filter((a) => !a.shopifyConnected);

  if (loading) {
    return (
      <div className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) return null;

  const cols = [
    { label: "Conta", wide: true },
    { label: "E-mails enviados" },
    { label: "Chargebacks bloqueados" },
    { label: "Reembolsos resolvidos" },
    { label: "Valor em risco (Shopify)" },
  ];

  function Row({ acc }: { acc: AccountStat }) {
    const s = acc[period];
    return (
      <tr className="border-t border-white/5 hover:bg-white/1.5 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{acc.label}</p>
              <p className="text-xs text-gray-600 font-mono truncate">{acc.email}</p>
            </div>
            {acc.shopifyConnected && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Shopify
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-300 text-right">{s.emailsProcessed}</td>
        <td className="px-4 py-3 text-right">
          <span className={`text-sm font-semibold ${s.chargebacksAvoided > 0 ? "text-white" : "text-gray-600"}`}>
            {s.chargebacksAvoided}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`text-sm font-semibold ${s.refundsResolved > 0 ? "text-amber-300" : "text-gray-600"}`}>
            {s.refundsResolved}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {acc.shopifyConnected ? (
            <div>
              <span className={`text-sm font-semibold ${s.valueAtRisk > 0 ? "text-emerald-300" : "text-gray-600"}`}>
                {formatCurrency(s.valueAtRisk)}
              </span>
              {s.valueAtRisk > 0 && (
                <p className="text-xs text-gray-600">{s.ordersWithValue} pedido{s.ordersWithValue !== 1 ? "s" : ""}</p>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-700">Sem Shopify</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Por conta
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th
                  key={i}
                  className={`px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shopifyAccounts.map((acc) => <Row key={acc.id} acc={acc} />)}
            {noShopifyAccounts.map((acc) => <Row key={acc.id} acc={acc} />)}
          </tbody>
        </table>
      </div>

      {shopifyAccounts.length > 0 && (
        <div className="px-5 py-3 border-t border-white/5 bg-emerald-500/3">
          <p className="text-xs text-gray-600">
            <span className="text-emerald-400/80">Valor em risco</span> — soma dos pedidos Shopify vinculados a disputas e reembolsos aceitos.
            Representa a exposição financeira máxima que o ReplyFlow ajudou a gerenciar negociando reembolsos parciais.
            Disponível apenas para contas com integração Shopify ativa.
          </p>
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "allTime">("month");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? data[period] : null;
  const hasShopify = data?.perAccount?.some((a) => a.shopifyConnected) ?? false;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Impacto do ReplyFlow na proteção contra chargebacks
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-900/60 border border-white/6 rounded-xl p-1">
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === "month" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-200"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setPeriod("allTime")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === "allTime" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-200"
            }`}
          >
            Todo o período
          </button>
        </div>
      </div>

      {/* Hero — only protection counts, no $ */}
      <HeroCard
        chargebacks={stats?.chargebacksAvoided ?? 0}
        refunds={stats?.refundsResolved ?? 0}
        loading={loading}
      />

      {/* Shopify financial exposure — only if at least one account has Shopify */}
      {(hasShopify || loading) && (
        <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Exposição financeira gerenciada
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Shopify
            </span>
          </div>
          {loading ? (
            <div className="flex gap-6">
              <Skeleton className="h-14 w-40" />
              <Skeleton className="h-14 w-40" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6">
              <div>
                <p className="text-xs text-gray-600 mb-1">Valor total em risco (pedidos vinculados)</p>
                <p className="text-4xl font-black text-emerald-300 leading-none">
                  {formatCurrency(stats?.valueAtRisk ?? 0)}
                </p>
                {(stats?.ordersWithValue ?? 0) > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {stats!.ordersWithValue} pedido{stats!.ordersWithValue !== 1 ? "s" : ""} com valor registrado
                  </p>
                )}
              </div>
              <div className="hidden sm:block w-px bg-white/8 shrink-0" />
              <div className="max-w-xs">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Soma dos valores dos pedidos Shopify associados a chargebacks bloqueados e reembolsos aceitos.
                  Este é o valor <span className="text-gray-400">máximo que poderia ter sido perdido</span> se todos os casos tivessem virado estorno.
                  Com reembolsos parciais negociados, a perda real foi menor.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="E-mails processados"
          value={stats?.emailsProcessed?.toLocaleString("pt-BR") ?? "0"}
          sub="Respostas enviadas automaticamente"
          accent="violet"
          loading={loading}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          }
        />
        {period === "month" && (
          <StatCard
            label="Taxa de resposta automática"
            value={`${data?.month.autoReplyRate ?? 0}%`}
            sub="E-mails respondidos sem intervenção humana"
            accent="emerald"
            loading={loading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
        )}
        {period === "allTime" && (
          <StatCard
            label="Pedidos com valor registrado"
            value={(stats?.ordersWithValue ?? 0).toLocaleString("pt-BR")}
            sub="Pedidos Shopify vinculados a casos de risco"
            accent="amber"
            loading={loading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Per-account table */}
      <AccountsTable
        accounts={data?.perAccount ?? []}
        period={period}
        loading={loading}
      />

      {/* Explanation */}
      <div className="bg-gray-900/40 border border-white/5 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
        <p className="font-medium text-gray-500">Como calculamos esses números</p>
        <p>
          <span className="text-gray-400">Ameaças diretas bloqueadas</span> — e-mails onde o cliente ameaçou
          explicitamente abrir chargeback, disputa no PayPal ou contestação no cartão, e a IA respondeu com uma solução preventiva.
        </p>
        <p>
          <span className="text-gray-400">Conflitos resolvidos proativamente</span> — e-mails onde o cliente
          aceitou uma oferta de reembolso parcial feita pela IA, resolvendo o conflito sem precisar acionar o banco.
        </p>
        <p>
          <span className="text-gray-400">Valor em risco</span> — soma dos valores dos pedidos Shopify associados.
          Disponível apenas para contas com integração Shopify ativa. Representa a exposição máxima gerenciada —
          na prática, reembolsos parciais negociados resultam em perda menor que o valor total.
        </p>
      </div>
    </div>
  );
}
