"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStoreContext } from "../store-context";
import { useFormat, useT } from "@/lib/i18n/client";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DayPoint { date: string; recebidos: number; enviados: number; }
interface PedidoDayPoint { date: string; count: number; valorPoupado: number; }

interface PedidosData {
  total: number; valorAnalisado: number; valorReembolsado: number;
  valorPoupado: number; percentualPoupado: number;
  reembolsosParciais: number; reembolsosTotais: number;
  byDay: PedidoDayPoint[];
  porConta: Array<{
    id: string; label: string; total: number;
    valorAnalisado: number; valorReembolsado: number; valorPoupado: number; percentualPoupado: number;
  }>;
}

interface DashboardData {
  periodDays: number | null;
  atendimentos: {
    total: number; sent: number; failed: number; cancelled: number; pending: number;
    autoRate: number; chargebacks: number; refunds: number; economiaGerada: number;
    byDay: DayPoint[];
    chargebackItems: Array<{
      id: string; customerId: string; from: string; fromName: string;
      subject: string; orderValueUSD: number; sentAt: string; accountLabel: string;
    }>;
  };
  financeiro: {
    hasShopify: boolean;
    orderCurrencies: string[];
    rates: Record<string, number>;
    pedidos: PedidosData;
    refundedOrders: Array<{
      id: string; name: string; financialStatus: string; currency: string;
      totalPriceUSD: number; totalRefundedUSD: number; createdAt: string; accountLabel: string;
    }>;
  };
  perAccount: Array<{
    id: string; label: string; email: string; shopifyConnected: boolean;
    enviados: number; chargebacks: number;
  }>;
}

type Period = "7" | "30" | "90" | "all";

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmtCurrency(value: number, currency: string, intl: string) {
  try {
    return new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

/** "YYYY-MM-DD" → short day/month in the active locale. */
function fmtDate(dateStr: string, intl: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit" }).format(new Date(y, m - 1, d));
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Sk({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded-lg bg-white/5 animate-pulse`} />;
}

// ─── Area Chart (Recharts) ────────────────────────────────────────────────────

function DashAreaChart({
  chartId = "c",
  data,
  lines,
  height = 180,
  yFormatter,
  yAxisWidth = 38,
}: {
  chartId?: string;
  data: Array<Record<string, string | number>>;
  lines: Array<{ key: string; name: string; color: string }>;
  height?: number;
  yFormatter?: (v: number) => string;
  yAxisWidth?: number;
}) {
  const t = useT("workspace");
  const f = useFormat();
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-700 text-xs" style={{ height }}>
        {t("dashboard.noData")}
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: -16, bottom: 0 }}>
        <defs>
          {lines.map((l, i) => (
            <linearGradient key={i} id={`${chartId}-ag${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity={0.28} />
              <stop offset="90%" stopColor={l.color} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={yAxisWidth}
          tickFormatter={yFormatter}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            fontSize: 12,
            padding: "8px 12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          labelStyle={{ color: "#9ca3af", marginBottom: 4 }}
          itemStyle={{ padding: "2px 0" }}
          formatter={(value) => [
            yFormatter ? yFormatter(value as number) : f.number(value as number),
          ]}
        />
        {lines.map((l, i) => (
          <Area
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={2}
            fill={`url(#${chartId}-ag${i})`}
            dot={false}
            activeDot={{ r: 4, fill: l.color, stroke: "rgba(0,0,0,0.4)", strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const W = 80;
  const H = 32;
  if (data.length === 1) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-8">
        <circle cx={W / 2} cy={H / 2} r="3" fill={color} opacity={0.6} />
      </svg>
    );
  }
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: 4 + (1 - v / max) * (H - 8),
  }));
  const d = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");
  const area = `${d} L ${pts[pts.length - 1].x.toFixed(1)},${H} L 0,${H} Z`;
  const gradId = `sk${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-8">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    </svg>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, sparkData, sparkColor, accent = "indigo", loading, icon,
}: {
  label: string; value: string; sub?: string; sparkData?: number[];
  sparkColor?: string; accent?: "indigo" | "emerald" | "amber" | "violet" | "red";
  loading: boolean; icon: React.ReactNode;
}) {
  const accentMap = {
    indigo:  { icon: "bg-indigo-500/10 text-indigo-400",  value: "text-indigo-300",  spark: "#6366f1" },
    emerald: { icon: "bg-emerald-500/10 text-emerald-400", value: "text-emerald-300", spark: "#10b981" },
    amber:   { icon: "bg-amber-500/10 text-amber-400",    value: "text-amber-300",   spark: "#f59e0b" },
    violet:  { icon: "bg-violet-500/10 text-violet-400",  value: "text-violet-300",  spark: "#8b5cf6" },
    red:     { icon: "bg-red-500/10 text-red-400",        value: "text-red-300",     spark: "#ef4444" },
  };
  const c = accentMap[accent];

  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-500 text-right leading-tight">{label}</span>
      </div>
      {loading ? (
        <div className="space-y-2 mt-1"><Sk h="h-8" w="w-28" /><Sk h="h-3" w="w-40" /></div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className={`text-2xl font-bold tracking-tight ${c.value}`}>{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
          </div>
          {sparkData && sparkData.length > 1 && (
            <Sparkline data={sparkData} color={sparkColor ?? c.spark} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chart Card ──────────────────────────────────────────────────────────────

function ChartCard({
  title, sub, children, legend,
}: {
  title: string; sub?: string; children: React.ReactNode;
  legend?: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
        </div>
        {legend && (
          <div className="flex items-center gap-3 flex-wrap">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: Period[] = ["7", "30", "90", "all"];

const IconSend = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);
const IconShield = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconCoin = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconBlock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);
const IconCart = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);
const IconBar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const COMMON_CURRENCIES = ["USD", "EUR", "JPY", "BRL", "GBP", "CAD", "AUD", "CHF", "SGD", "MXN", "KRW", "CNY"];

export default function DashboardPage() {
  const { selectedAccountId } = useStoreContext();
  const t = useT("workspace");
  const tc = useT("common");
  const f = useFormat();
  const [period, setPeriod] = useState<Period>("30");
  const [tab, setTab] = useState<"atendimentos" | "financeiro">("atendimentos");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const money = (value: number) => fmtCurrency(value, displayCurrency, f.intl);
  const day = (dateStr: string) => fmtDate(dateStr, f.intl);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ period, accountId: selectedAccountId });
      const res = await fetch(`/api/dashboard?${p}`);
      if (res.ok) {
        const json = await res.json() as DashboardData;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [period, selectedAccountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const at = data?.atendimentos;
  const fin = data?.financeiro;
  const pd = fin?.pedidos;
  const displayRate = fin?.rates[displayCurrency] ?? 1;
  const toDisplay = (usdVal: number) => usdVal * displayRate;

  const sparkSent     = at?.byDay.map((d) => d.enviados) ?? [];
  const sparkReceived = at?.byDay.map((d) => d.recebidos) ?? [];
  const sparkPoupado  = pd?.byDay.map((d) => d.valorPoupado) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-900/60 border border-white/6 rounded-xl p-1">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o}
                onClick={() => setPeriod(o)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === o ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-200"
                }`}
              >
                {o === "all" ? t("dashboard.periods.all") : t("dashboard.periods.days", { count: Number(o) })}
              </button>
            ))}
          </div>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="h-8 rounded-lg bg-gray-900/60 border border-white/6 text-xs text-gray-300 px-2 cursor-pointer focus:outline-none focus:border-indigo-500/50"
          >
            {(fin?.rates
              ? [...COMMON_CURRENCIES.filter((c) => c in fin.rates), ...Object.keys(fin.rates).filter((c) => !COMMON_CURRENCIES.includes(c)).sort()]
              : COMMON_CURRENCIES
            ).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-900/60 border border-white/6 text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-40"
            title={tc("actions.refresh")}
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-white/8">
        {([
          { value: "atendimentos" as const, label: t("dashboard.tabs.support") },
          { value: "financeiro" as const, label: t("dashboard.tabs.financial") },
        ]).map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.value ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ══ Tab: Atendimentos ══ */}
      {tab === "atendimentos" && (
        <div className="space-y-6">

          {/* Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label={t("dashboard.support.answered.label")}
              value={loading ? "—" : f.number(at?.sent ?? 0)}
              sub={loading ? undefined : t("dashboard.support.answered.sub", { rate: at?.autoRate ?? 0, total: at?.total ?? 0 })}
              sparkData={sparkSent}
              accent="indigo" loading={loading}
              icon={<IconSend />}
            />
            <MetricCard
              label={t("dashboard.support.disputes.label")}
              value={loading ? "—" : (at?.chargebacks ?? 0).toString()}
              sub={loading ? undefined : t("dashboard.support.disputes.sub", { count: at?.refunds ?? 0 })}
              sparkData={sparkReceived.map((v, i) => Math.min(v, sparkSent[i] ?? 0))}
              accent="emerald" loading={loading}
              icon={<IconShield />}
            />
            <MetricCard
              label={t("dashboard.support.savings.label", { currency: displayCurrency })}
              value={loading ? "—" : money(toDisplay(at?.economiaGerada ?? 0))}
              sub={t("dashboard.support.savings.sub")}
              accent="amber" loading={loading}
              icon={<IconCoin />}
            />
            <MetricCard
              label={t("dashboard.support.spam.label")}
              value={loading ? "—" : (at?.cancelled ?? 0).toString()}
              sub={loading ? undefined : t("dashboard.support.spam.sub", { count: at?.failed ?? 0 })}
              accent="violet" loading={loading}
              icon={<IconBlock />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartCard
                title={t("dashboard.support.timeline.title")}
                sub={t("dashboard.support.timeline.sub")}
                legend={[
                  { label: t("dashboard.support.timeline.received"), color: "#6366f1" },
                  { label: t("dashboard.support.timeline.answered"), color: "#10b981" },
                ]}
              >
                {loading ? <Sk h="h-44" /> : (
                  <DashAreaChart
                    chartId="atd"
                    data={at?.byDay.map((d) => ({ date: day(d.date), received: d.recebidos, answered: d.enviados })) ?? []}
                    lines={[
                      { key: "received", name: t("dashboard.support.timeline.received"), color: "#6366f1" },
                      { key: "answered", name: t("dashboard.support.timeline.answered"), color: "#10b981" },
                    ]}
                    height={180}
                  />
                )}
              </ChartCard>
            </div>

            <ChartCard title={t("dashboard.support.status.title")} sub={t("dashboard.support.status.sub")}>
              {loading ? (
                <div className="space-y-3 mt-2">{[1,2,3,4].map(i => <Sk key={i} h="h-8" />)}</div>
              ) : (
                <div className="space-y-3 mt-2">
                  {[
                    { label: t("dashboard.support.status.answered"),  value: at?.sent ?? 0,      color: "bg-emerald-500", text: "text-emerald-400" },
                    { label: t("dashboard.support.status.pending"),   value: at?.pending ?? 0,   color: "bg-yellow-500",  text: "text-yellow-400" },
                    { label: t("dashboard.support.status.failed"),    value: at?.failed ?? 0,    color: "bg-red-500",     text: "text-red-400"    },
                    { label: t("dashboard.support.status.cancelled"), value: at?.cancelled ?? 0, color: "bg-gray-600",    text: "text-gray-400"   },
                  ].map((item) => {
                    const pct = (at?.total ?? 0) > 0 ? Math.round((item.value / (at?.total ?? 1)) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{item.label}</span>
                          <span className={`text-xs font-semibold ${item.text}`}>
                            {f.number(item.value)}
                            <span className="text-gray-600 font-normal ml-1">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(at?.chargebacks ?? 0) > 0 && (
                    <div className="pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{t("dashboard.support.status.disputesDetected")}</span>
                        <span className="text-xs font-semibold text-red-400">
                          {t("dashboard.support.status.disputesCount", { count: at!.chargebacks })}
                        </span>
                      </div>
                      {(at?.total ?? 0) > 0 && (
                        <p className="text-[10px] text-gray-700 mt-0.5">
                          {t("dashboard.support.status.disputesShare", {
                            percent: f.number((at!.chargebacks / at!.total) * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Per-account table — only if multiple accounts */}
          {(data?.perAccount.length ?? 0) > 1 && (
            <div className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("dashboard.support.perAccount.title")}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {[
                        t("dashboard.support.perAccount.account"),
                        t("dashboard.support.perAccount.answered"),
                        t("dashboard.support.perAccount.disputes"),
                      ].map((h, i) => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data!.perAccount.map((acc) => (
                      <tr key={acc.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-200">{acc.label}</p>
                          <p className="text-xs text-gray-600 font-mono">{acc.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 text-right">{acc.enviados}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${acc.chargebacks > 0 ? "text-red-400" : "text-gray-600"}`}>{acc.chargebacks}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chargeback orders with links to individual conversations */}
          {!loading && (at?.chargebackItems.length ?? 0) > 0 && (
            <div className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("dashboard.support.chargebacks.title")}</h3>
                <span className="text-xs text-gray-600">{t("dashboard.support.chargebacks.cases", { count: at!.chargebackItems.length })}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {[
                        t("dashboard.support.chargebacks.customer"),
                        t("dashboard.support.chargebacks.subject"),
                        t("dashboard.support.chargebacks.order"),
                        t("dashboard.support.chargebacks.date"),
                        "",
                      ].map((h, i) => (
                        <th key={i} className={`px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wider ${i === 0 ? "text-left" : i === 4 ? "text-center" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {at!.chargebackItems.map((item) => (
                      <tr key={item.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-200">{item.fromName || item.from}</p>
                          <p className="text-xs text-gray-600 font-mono">{item.from}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 max-w-50 truncate">{item.subject}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-emerald-400">
                            {item.orderValueUSD > 0 ? money(toDisplay(item.orderValueUSD)) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                          {item.sentAt ? day(item.sentAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/conversas?id=${item.customerId || encodeURIComponent(item.from)}`}
                            className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
                          >
                            {t("dashboard.support.chargebacks.viewConversation")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ Tab: Financeiro ══ */}
      {tab === "financeiro" && (
        <div className="space-y-6">

          {!loading && !fin?.hasShopify && (
            <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <IconShield />
              </div>
              <p className="text-sm font-semibold text-gray-300 mb-1">{t("dashboard.financial.noShopify.title")}</p>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">{t("dashboard.financial.noShopify.hint")}</p>
            </div>
          )}

          {(loading || fin?.hasShopify) && (
            <>
              {/* Conceito */}
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs text-indigo-300/70 leading-relaxed">
                  {t.rich("dashboard.financial.concept", {
                    strong: (chunks) => <strong className="text-indigo-300">{chunks}</strong>,
                  })}
                </p>
              </div>

              {/* Top 3 metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard
                  label={t("dashboard.financial.saved.label", { currency: displayCurrency })}
                  value={loading ? "—" : money(toDisplay(pd?.valorPoupado ?? 0))}
                  sub={loading ? undefined : t("dashboard.financial.saved.sub", { percent: pd?.percentualPoupado ?? 0 })}
                  sparkData={sparkPoupado}
                  sparkColor="#10b981"
                  accent="emerald" loading={loading}
                  icon={<IconShield />}
                />
                <MetricCard
                  label={t("dashboard.financial.analyzed.label", { currency: displayCurrency })}
                  value={loading ? "—" : money(toDisplay(pd?.valorAnalisado ?? 0))}
                  sub={loading ? undefined : t("dashboard.financial.analyzed.sub", { count: pd?.total ?? 0 })}
                  accent="amber" loading={loading}
                  icon={<IconCoin />}
                />
                <MetricCard
                  label={t("dashboard.financial.refunded.label", { currency: displayCurrency })}
                  value={loading ? "—" : money(toDisplay(pd?.valorReembolsado ?? 0))}
                  sub={loading ? undefined : t("dashboard.financial.refunded.sub", { partial: pd?.reembolsosParciais ?? 0, full: pd?.reembolsosTotais ?? 0 })}
                  accent="red" loading={loading}
                  icon={<IconBar />}
                />
              </div>

              {/* Saving breakdown */}
              {!loading && (pd?.valorAnalisado ?? 0) > 0 && (
                <div className="bg-gray-900/60 border border-white/6 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">{t("dashboard.financial.summary.title")}</h3>
                  <div className="space-y-3">
                    {[
                      { label: t("dashboard.financial.summary.analyzed"), value: money(toDisplay(pd!.valorAnalisado)),   color: "text-gray-300",    bar: "bg-gray-500",    raw: pd!.valorAnalisado },
                      { label: t("dashboard.financial.summary.refunded"), value: money(toDisplay(pd!.valorReembolsado)), color: "text-red-400",     bar: "bg-red-500",     raw: pd!.valorReembolsado },
                      { label: t("dashboard.financial.summary.saved"),    value: money(toDisplay(pd!.valorPoupado)),     color: "text-emerald-400", bar: "bg-emerald-500", raw: pd!.valorPoupado },
                    ].map((row) => {
                      const barPct = pd!.valorAnalisado > 0 ? Math.round((row.raw / pd!.valorAnalisado) * 100) : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">{row.label}</span>
                            <span className={`text-xs font-semibold ${row.color}`}>{row.value}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${row.bar} rounded-full`} style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t("dashboard.financial.summary.percent")}</span>
                      <span className="text-sm font-bold text-emerald-400">{pd!.percentualPoupado}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Evolution chart */}
              <ChartCard
                title={t("dashboard.financial.savedChart.title")}
                sub={t("dashboard.financial.savedChart.sub")}
                legend={[{ label: t("dashboard.financial.savedChart.legend", { currency: displayCurrency }), color: "#10b981" }]}
              >
                {loading ? <Sk h="h-44" /> : (
                  <DashAreaChart
                    chartId="fin"
                    data={pd?.byDay.map((d) => ({ date: day(d.date), saved: toDisplay(d.valorPoupado) })) ?? []}
                    lines={[{ key: "saved", name: t("dashboard.financial.savedChart.series", { currency: displayCurrency }), color: "#10b981" }]}
                    height={180}
                    yFormatter={money}
                    yAxisWidth={72}
                  />
                )}
              </ChartCard>

              {/* Per-account breakdown */}
              {(pd?.porConta.length ?? 0) > 0 && (
                <ChartCard title={t("dashboard.financial.perStore.title")} sub={t("dashboard.financial.perStore.sub")}>
                  {loading ? <Sk h="h-32" /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            {[
                              t("dashboard.financial.perStore.store"),
                              t("dashboard.financial.perStore.orders"),
                              t("dashboard.financial.perStore.analyzed"),
                              t("dashboard.financial.perStore.refunded"),
                              t("dashboard.financial.perStore.saved"),
                              t("dashboard.financial.perStore.savedPct"),
                            ].map((h, i) => (
                              <th key={h} className={`px-3 py-2 text-xs font-medium text-gray-600 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pd!.porConta.map((acc) => (
                            <tr key={acc.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                              <td className="px-3 py-3 text-sm text-gray-200">{acc.label}</td>
                              <td className="px-3 py-3 text-sm text-gray-400 text-right">{acc.total}</td>
                              <td className="px-3 py-3 text-right">
                                <span className="text-sm text-gray-300">{money(toDisplay(acc.valorAnalisado))}</span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className={`text-sm ${acc.valorReembolsado > 0 ? "text-red-400" : "text-gray-600"}`}>
                                  {acc.valorReembolsado > 0 ? money(toDisplay(acc.valorReembolsado)) : "—"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className={`text-sm font-semibold ${acc.valorPoupado > 0 ? "text-emerald-300" : "text-gray-600"}`}>
                                  {acc.valorPoupado > 0 ? money(toDisplay(acc.valorPoupado)) : "—"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${acc.percentualPoupado > 0 ? "bg-emerald-500/10 text-emerald-400" : "text-gray-700"}`}>
                                  {acc.percentualPoupado > 0 ? `${acc.percentualPoupado}%` : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ChartCard>
              )}

              {/* Devoluções — pedidos Shopify reembolsados individualmente */}
              {!loading && (fin?.refundedOrders.length ?? 0) > 0 && (
                <div className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-200">{t("dashboard.financial.refundedOrders.title")}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">{t("dashboard.financial.refundedOrders.sub")}</p>
                    </div>
                    <span className="text-xs text-gray-600">{t("dashboard.financial.refundedOrders.count", { count: fin!.refundedOrders.length })}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {[
                            t("dashboard.financial.refundedOrders.order"),
                            t("dashboard.financial.refundedOrders.date"),
                            t("dashboard.financial.refundedOrders.currency"),
                            t("dashboard.financial.refundedOrders.value"),
                            t("dashboard.financial.refundedOrders.refunded"),
                            t("dashboard.financial.refundedOrders.saved"),
                            t("dashboard.financial.refundedOrders.type"),
                          ].map((h, i) => (
                            <th key={h} className={`px-4 py-2.5 text-xs font-medium text-gray-600 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fin!.refundedOrders.map((order) => {
                          const poupado = order.totalPriceUSD - order.totalRefundedUSD;
                          return (
                            <tr key={order.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-sm text-gray-200 font-mono">{order.name}</p>
                                {order.accountLabel && <p className="text-xs text-gray-600">{order.accountLabel}</p>}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                                {order.createdAt ? day(order.createdAt) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{order.currency}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                {money(toDisplay(order.totalPriceUSD))}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-red-400">
                                  {money(toDisplay(order.totalRefundedUSD))}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-semibold ${poupado > 0.01 ? "text-emerald-400" : "text-gray-600"}`}>
                                  {poupado > 0.01 ? money(toDisplay(poupado)) : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  order.financialStatus === "refunded"
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-yellow-500/10 text-yellow-400"
                                }`}>
                                  {order.financialStatus === "refunded"
                                    ? t("dashboard.financial.refundedOrders.full")
                                    : t("dashboard.financial.refundedOrders.partial")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
