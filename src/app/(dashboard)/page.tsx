"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { EmailDoc } from "@/lib/types";

interface AccountOption {
  id: string;
  label: string;
  email: string;
}

const ACCOUNT_FILTER_STORAGE_KEY = "replyflow.dashboard.accountFilter";
const VIEWED_GROUPS_STORAGE_KEY = "replyflow.dashboard.viewedGroups";

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  processing: {
    label: "Processando",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  sent: {
    label: "Enviado",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  failed: {
    label: "Falhou",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-gray-500/10 text-gray-500 border-gray-600/20",
    dot: "bg-gray-500",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === "pending" ? "animate-pulse" : ""}`}
      />
      {cfg.label}
    </span>
  );
}

function TimeRemaining({
  scheduledReplyAt,
}: {
  scheduledReplyAt: { seconds: number };
}) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const target = scheduledReplyAt.seconds * 1000;
    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining("Aguardando envio...");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [scheduledReplyAt.seconds]);

  return (
    <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-mono bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md">
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {remaining}
    </span>
  );
}

interface CustomerGroup {
  customerId: string;
  fromName: string;
  from: string;
  blocked: boolean;
  emails: EmailDoc[];
}

function groupByCustomer(emails: EmailDoc[], blockedSet: Set<string>): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const e of emails) {
    const key = e.customerId || e.from;
    if (!map.has(key)) {
      map.set(key, {
        customerId: key,
        fromName: e.fromName || e.from,
        from: e.from,
        blocked: blockedSet.has(key),
        emails: [],
      });
    }
    map.get(key)!.emails.push(e);
  }
  return Array.from(map.values()).sort((a, b) => {
    const latestA = Math.max(
      ...a.emails.map((e) => e.receivedAt?.seconds ?? 0),
    );
    const latestB = Math.max(
      ...b.emails.map((e) => e.receivedAt?.seconds ?? 0),
    );
    return latestB - latestA;
  });
}

function formatDate(seconds: number) {
  return new Date(seconds * 1000).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATS_CONFIG = [
  {
    key: "total" as const,
    label: "Total",
    color: "text-gray-100",
    iconColor: "text-gray-500 bg-gray-800",
    icon: (
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
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
  {
    key: "pending" as const,
    label: "Pendentes",
    color: "text-yellow-400",
    iconColor: "text-yellow-400 bg-yellow-500/10",
    icon: (
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
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    key: "sent" as const,
    label: "Enviados",
    color: "text-emerald-400",
    iconColor: "text-emerald-400 bg-emerald-500/10",
    icon: (
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
    ),
  },
  {
    key: "failed" as const,
    label: "Falharam",
    color: "text-red-400",
    iconColor: "text-red-400 bg-red-500/10",
    icon: (
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
    ),
  },
];

export default function DashboardPage() {
  const [emails, setEmails] = useState<EmailDoc[]>([]);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [accountFilterReady, setAccountFilterReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<"fetch" | "process" | null>(
    null,
  );
  const [triggerMsg, setTriggerMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewedGroups, setViewedGroups] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        const fetchedAccounts = d.accounts ?? [];
        setAccounts(fetchedAccounts);
        const saved =
          typeof window !== "undefined"
            ? window.localStorage.getItem(ACCOUNT_FILTER_STORAGE_KEY)
            : null;
        if (!saved || saved === "all") {
          setAccountFilter("all");
          return;
        }
        if (fetchedAccounts.some((a: AccountOption) => a.id === saved)) {
          setAccountFilter(saved);
          return;
        }
        window.localStorage.removeItem(ACCOUNT_FILTER_STORAGE_KEY);
        setAccountFilter("all");
      })
      .finally(() => setAccountFilterReady(true));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(VIEWED_GROUPS_STORAGE_KEY);
    if (!raw) return;
    try { setViewedGroups(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(() => {
    if (!accountFilterReady) return;
    window.localStorage.setItem(ACCOUNT_FILTER_STORAGE_KEY, accountFilter);
  }, [accountFilter, accountFilterReady]);

  async function triggerCron(action: "fetch-emails" | "process-replies") {
    setTriggering(action === "fetch-emails" ? "fetch" : "process");
    setTriggerMsg(null);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, force: action === "process-replies" }),
      });
      const data = await res.json();
      setTriggerMsg({
        text: res.ok ? (data.message ?? "Concluído!") : (data.error ?? "Erro"),
        ok: res.ok,
      });
      if (res.ok) fetchEmails();
    } catch {
      setTriggerMsg({ text: "Erro de conexão", ok: false });
    }
    setTriggering(null);
  }

  const fetchEmails = useCallback(async () => {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (accountFilter !== "all") p.set("accountId", accountFilter);
    const [emailsRes, customersRes] = await Promise.all([
      fetch(`/api/emails${p.toString() ? `?${p}` : ""}`),
      fetch("/api/customers?limit=500"),
    ]);
    if (emailsRes.ok) {
      const data = await emailsRes.json();
      setEmails(data.emails);
    }
    if (customersRes.ok) {
      const data = await customersRes.json();
      const blocked = new Set<string>(
        (data.customers as Array<{ id: string; blocked?: boolean }>)
          .filter((c) => c.blocked === true)
          .map((c) => c.id),
      );
      setBlockedSet(blocked);
    }
    setLoading(false);
  }, [statusFilter, accountFilter]);

  useEffect(() => {
    if (!accountFilterReady) return;
    fetchEmails();
    const id = setInterval(fetchEmails, 30000);
    return () => clearInterval(id);
  }, [fetchEmails, accountFilterReady]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    // Mark group as viewed when expanded
    const groupEmails = emails.filter(e => (e.customerId || e.from) === key);
    const latestTs = groupEmails.length > 0
      ? Math.max(...groupEmails.map(e => e.receivedAt?.seconds ?? 0))
      : Date.now() / 1000;
    setViewedGroups(prev => {
      const next = { ...prev, [key]: latestTs };
      if (typeof window !== 'undefined') {
        localStorage.setItem(VIEWED_GROUPS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  const stats = {
    total: emails.length,
    pending: emails.filter((e) => e.status === "pending").length,
    sent: emails.filter((e) => e.status === "sent").length,
    failed: emails.filter((e) => e.status === "failed").length,
  };

  const groups = groupByCustomer(emails, blockedSet);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">
            Caixa de entrada
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            E-mails recebidos e status das respostas automáticas
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => triggerCron("fetch-emails")}
              disabled={triggering !== null}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 border border-white/6 text-gray-300 disabled:opacity-50 transition-all"
            >
              {triggering === "fetch" ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
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
                    d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3"
                  />
                </svg>
              )}
              Buscar e-mails
            </button>
            <button
              onClick={() => triggerCron("process-replies")}
              disabled={triggering !== null}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {triggering === "process" ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
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
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              )}
              Processar respostas
            </button>
          </div>
          {triggerMsg && (
            <p
              className={`text-xs flex items-center gap-1.5 ${triggerMsg.ok ? "text-emerald-400" : "text-red-400"}`}
            >
              {triggerMsg.ok ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              )}
              {triggerMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {STATS_CONFIG.map((s) => (
          <div
            key={s.key}
            className="bg-gray-900/60 border border-white/6 rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-lg ${s.iconColor} shrink-0`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p
                className={`text-2xl font-bold ${s.color} leading-none mt-0.5`}
              >
                {stats[s.key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chargeback protection banner */}
      <Link
        href="/stats"
        className="flex items-center justify-between gap-4 bg-gray-900/50 border border-white/6 rounded-xl px-4 py-3 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-300">Proteção contra chargebacks</p>
            <p className="text-xs text-gray-600">Ver relatórios detalhados de chargebacks evitados e valor economizado</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* Filters */}
      <div className="space-y-3">
        {accounts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Conta em visualização
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              <button
                onClick={() => setAccountFilter("all")}
                className={`text-left rounded-xl border p-3 transition-all ${
                  accountFilter === "all"
                    ? "border-indigo-500/40 bg-indigo-500/10 shadow-sm"
                    : "border-white/6 bg-gray-900/40 hover:border-white/12 hover:bg-gray-900/70"
                }`}
              >
                <p className="text-sm font-semibold text-gray-100">
                  Todas as contas
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exibe e-mails de todas as caixas
                </p>
              </button>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccountFilter(a.id)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    accountFilter === a.id
                      ? "border-indigo-500/40 bg-indigo-500/10 shadow-sm"
                      : "border-white/6 bg-gray-900/40 hover:border-white/12 hover:bg-gray-900/70"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {a.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {a.email}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 items-center">
          {["all", "pending", "sent", "failed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "bg-gray-900/60 border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12"
              }`}
            >
              {f === "all"
                ? "Todos"
                : (STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.label ?? f)}
            </button>
          ))}
          <button
            onClick={fetchEmails}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900/60 border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
          <svg
            className="w-5 h-5 animate-spin mr-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Carregando...
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <svg
            className="w-10 h-10 mb-3 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <p className="text-sm">Nenhum e-mail encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.customerId);
            const hasPending = group.emails.some((e) => e.status === "pending");
            const hasFailed = group.emails.some((e) => e.status === "failed");
            const latestEmailTs = Math.max(...group.emails.map(e => e.receivedAt?.seconds ?? 0));
            const isUnread = viewedGroups[group.customerId] === undefined || latestEmailTs > (viewedGroups[group.customerId] ?? 0);
            const latestEmail = group.emails[0];
            const initials = group.fromName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={group.customerId}
                className="border border-white/6 rounded-xl overflow-hidden bg-gray-900/40 hover:bg-gray-900/60 transition-colors"
              >
                {/* Customer row */}
                <button
                  onClick={() => toggleGroup(group.customerId)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ${
                    group.blocked
                      ? "bg-linear-to-br from-gray-600 to-gray-700"
                      : "bg-linear-to-br from-indigo-500 to-violet-600"
                  }`}>
                    {group.blocked ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-medium truncate ${
                        group.blocked ? "text-gray-500" : "text-gray-200"
                      }`}>
                        {group.fromName}
                      </span>
                      {group.blocked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                          bloqueado
                        </span>
                      )}
                      <span className="text-xs text-gray-600 truncate hidden sm:block">
                        {group.from}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {latestEmail.subject}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-sky-400 shrink-0"
                        title="Não visualizado"
                      />
                    )}
                    {hasFailed && (
                      <span
                        className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                        title="Falha"
                      />
                    )}
                    {hasPending && (
                      <span
                        className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0"
                        title="Pendente"
                      />
                    )}
                    <span className="text-xs text-gray-600 bg-gray-800/80 border border-white/6 px-2 py-0.5 rounded-full">
                      {group.emails.length}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded emails */}
                {isExpanded && (
                  <div className="border-t border-white/5 divide-y divide-white/3">
                    {group.emails.map((email) => (
                      <div
                        key={email.id}
                        className="px-4 py-3 pl-13 flex items-center gap-3 hover:bg-white/2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/emails/${email.id}`}
                            className="group flex items-center gap-1.5 min-w-0"
                          >
                            <p className="text-sm text-gray-300 truncate group-hover:text-indigo-400 transition-colors">
                              {email.subject}
                            </p>
                            <svg
                              className="w-3.5 h-3.5 text-gray-700 group-hover:text-indigo-500 shrink-0 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                              />
                            </svg>
                          </Link>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {email.accountEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {email.receivedAt && (
                            <span className="text-xs text-gray-600 hidden md:block">
                              {formatDate(email.receivedAt.seconds)}
                            </span>
                          )}
                          <StatusBadge status={email.status} />
                          {email.status === "pending" &&
                            email.scheduledReplyAt && (
                              <TimeRemaining
                                scheduledReplyAt={email.scheduledReplyAt}
                              />
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
