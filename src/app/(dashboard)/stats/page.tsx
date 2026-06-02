"use client";

import { useEffect, useState } from "react";

interface StatsPeriod {
  chargebacksAvoided: number;
  refundsResolved: number;
  valueSaved: number;
  emailsProcessed: number;
  ordersWithValue: number;
  autoReplyRate?: number;
}

interface StatsData {
  month: StatsPeriod & { autoReplyRate: number };
  allTime: StatsPeriod;
}

function formatCurrency(value: number) {
  if (value === 0) return "$0";
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
    indigo: {
      icon: "bg-indigo-500/10 text-indigo-400",
      value: "text-indigo-300",
    },
    emerald: {
      icon: "bg-emerald-500/10 text-emerald-400",
      value: "text-emerald-300",
    },
    violet: {
      icon: "bg-violet-500/10 text-violet-400",
      value: "text-violet-300",
    },
    amber: { icon: "bg-amber-500/10 text-amber-400", value: "text-amber-300" },
  };
  const c = colors[accent];

  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-3 w-40" />
        </>
      ) : (
        <>
          <p className={`text-3xl font-bold tracking-tight ${c.value}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-gray-600 -mt-2">{sub}</p>}
        </>
      )}
    </div>
  );
}

function HeroCard({
  chargebacks,
  refunds,
  valueSaved,
  ordersWithValue,
  loading,
}: {
  chargebacks: number;
  refunds: number;
  valueSaved: number;
  ordersWithValue: number;
  loading: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-indigo-500/10 via-gray-900/80 to-emerald-500/10 border border-indigo-500/20 rounded-2xl p-6 space-y-6">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Row 1: two protection counts */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
            Ameaças diretas bloqueadas
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Cliente ameaçou abrir disputa/chargeback
          </p>
          {loading ? (
            <Skeleton className="h-16 w-32" />
          ) : (
            <p className="text-7xl font-black text-white leading-none">
              {chargebacks}
            </p>
          )}
        </div>

        <div className="hidden sm:block w-px h-24 bg-white/10 shrink-0" />

        <div className="flex-1">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">
            Conflitos resolvidos proativamente
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Cliente aceitou reembolso sem ir ao banco
          </p>
          {loading ? (
            <Skeleton className="h-16 w-32" />
          ) : (
            <p className="text-7xl font-black text-amber-200 leading-none">
              {refunds}
            </p>
          )}
        </div>

        <div className="hidden sm:block w-px h-24 bg-white/10 shrink-0" />

        {/* Value saved */}
        <div className="flex-1">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">
            Valor economizado
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Soma dos pedidos Shopify vinculados
          </p>
          {loading ? (
            <Skeleton className="h-16 w-40" />
          ) : (
            <>
              <p className="text-5xl font-black text-emerald-300 leading-none">
                {valueSaved > 0 ? formatCurrency(valueSaved) : "—"}
              </p>
              {valueSaved === 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Disponível com integração Shopify ativa
                </p>
              )}
              {valueSaved > 0 && ordersWithValue < chargebacks + refunds && (
                <p className="text-xs text-gray-600 mt-2">
                  Baseado em {ordersWithValue} de {chargebacks + refunds}{" "}
                  pedidos com valor registrado
                </p>
              )}
            </>
          )}
        </div>
      </div>
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

        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-gray-900/60 border border-white/6 rounded-xl p-1">
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === "month"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setPeriod("allTime")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === "allTime"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            Todo o período
          </button>
        </div>
      </div>

      {/* Hero */}
      <HeroCard
        chargebacks={stats?.chargebacksAvoided ?? 0}
        refunds={stats?.refundsResolved ?? 0}
        valueSaved={stats?.valueSaved ?? 0}
        ordersWithValue={stats?.ordersWithValue ?? 0}
        loading={loading}
      />

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="E-mails processados"
          value={stats?.emailsProcessed?.toLocaleString("pt-BR") ?? "0"}
          sub="Respostas enviadas automaticamente"
          accent="violet"
          loading={loading}
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
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
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            }
          />
        )}

        <StatCard
          label="Pedidos com risco monitorado"
          value={(stats?.ordersWithValue ?? 0).toLocaleString("pt-BR")}
          sub="Pedidos Shopify vinculados a riscos de chargeback"
          accent="amber"
          loading={loading}
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          }
        />
      </div>

      {/* Explanation */}
      <div className="bg-gray-900/40 border border-white/5 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-500">
          Como calculamos esses números
        </p>
        <p>
          <span className="text-gray-400">Ameaças diretas bloqueadas</span> —
          e-mails onde o cliente ameaçou explicitamente abrir chargeback,
          disputa no PayPal ou contestação no cartão, e a IA respondeu com uma
          solução preventiva.
        </p>
        <p>
          <span className="text-gray-400">
            Conflitos resolvidos proativamente
          </span>{" "}
          — e-mails onde o cliente aceitou uma oferta de reembolso feita pela
          IA, resolvendo o conflito sem precisar acionar o banco.
        </p>
        <p>
          <span className="text-gray-400">Valor economizado</span> — soma dos
          valores dos pedidos Shopify associados a ambas as categorias.
          Disponível apenas quando a integração Shopify está ativa e o pedido
          foi localizado no momento do processamento.
        </p>
      </div>
    </div>
  );
}
