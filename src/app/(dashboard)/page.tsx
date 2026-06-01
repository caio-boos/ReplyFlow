"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { EmailDoc } from "@/lib/types";

interface AccountOption { id: string; label: string; email: string; }

const ACCOUNT_FILTER_STORAGE_KEY = "replyflow.dashboard.accountFilter";

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  processing: { label: "Processando", color: "bg-blue-900 text-blue-300 border-blue-700" },
  sent: { label: "Enviado", color: "bg-green-900 text-green-300 border-green-700" },
  failed: { label: "Falhou", color: "bg-red-900 text-red-300 border-red-700" },
  cancelled: { label: "Cancelado", color: "bg-gray-800 text-gray-400 border-gray-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TimeRemaining({ scheduledReplyAt }: { scheduledReplyAt: { seconds: number } }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const target = scheduledReplyAt.seconds * 1000;
    function update() {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining("Aguardando envio..."); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [scheduledReplyAt.seconds]);

  return <span className="text-yellow-400 text-xs font-mono">{remaining}</span>;
}

interface CustomerGroup {
  customerId: string;
  fromName: string;
  from: string;
  emails: EmailDoc[];
}

function groupByCustomer(emails: EmailDoc[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const e of emails) {
    const key = e.customerId || e.from;
    if (!map.has(key)) {
      map.set(key, { customerId: key, fromName: e.fromName || e.from, from: e.from, emails: [] });
    }
    map.get(key)!.emails.push(e);
  }
  // Sort groups: most recent email first
  return Array.from(map.values()).sort((a, b) => {
    const latestA = Math.max(...a.emails.map(e => e.receivedAt?.seconds ?? 0));
    const latestB = Math.max(...b.emails.map(e => e.receivedAt?.seconds ?? 0));
    return latestB - latestA;
  });
}

export default function DashboardPage() {
  const [emails, setEmails] = useState<EmailDoc[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [accountFilterReady, setAccountFilterReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<"fetch" | "process" | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        const fetchedAccounts = d.accounts ?? [];
        setAccounts(fetchedAccounts);

        const saved = typeof window !== "undefined"
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
      setTriggerMsg({ text: res.ok ? (data.message ?? "Concluído!") : (data.error ?? "Erro"), ok: res.ok });
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
    const res = await fetch(`/api/emails${p.toString() ? `?${p}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setEmails(data.emails);
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
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const stats = {
    total: emails.length,
    pending: emails.filter((e) => e.status === "pending").length,
    sent: emails.filter((e) => e.status === "sent").length,
    failed: emails.filter((e) => e.status === "failed").length,
  };

  const groups = groupByCustomer(emails);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">E-mails recebidos e status das respostas automáticas</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => triggerCron("fetch-emails")}
              disabled={triggering !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {triggering === "fetch" ? <span className="animate-spin">⟳</span> : "📥"}
              Buscar E-mails
            </button>
            <button
              onClick={() => triggerCron("process-replies")}
              disabled={triggering !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {triggering === "process" ? <span className="animate-spin">⟳</span> : "🤖"}
              Processar Respostas
            </button>
          </div>
          {triggerMsg && (
            <p className={`text-xs ${triggerMsg.ok ? "text-green-400" : "text-red-400"}`}>{triggerMsg.text}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-gray-100" },
          { label: "Pendentes", value: stats.pending, color: "text-yellow-400" },
          { label: "Enviados", value: stats.sent, color: "text-green-400" },
          { label: "Falharam", value: stats.failed, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {accounts.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Conta em visualizacao</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              <button
                onClick={() => setAccountFilter("all")}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  accountFilter === "all"
                    ? "border-indigo-600 bg-indigo-900/40"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <p className="text-sm font-semibold text-gray-100">Todas as contas</p>
                <p className="text-xs text-gray-400 mt-1">Exibe os e-mails de todas as caixas conectadas</p>
              </button>

              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccountFilter(a.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    accountFilter === a.id
                      ? "border-indigo-600 bg-indigo-900/40"
                      : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-100 truncate">{a.label}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{a.email}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {["all", "pending", "sent", "failed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-100"
              }`}
            >
              {f === "all" ? "Todos" : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.label ?? f}
            </button>
          ))}
          <button onClick={fetchEmails} className="ml-auto px-3 py-1.5 rounded-lg text-xs bg-gray-800 text-gray-400 hover:text-gray-100">
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Grouped email list */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Nenhum e-mail encontrado</div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.customerId);
            const hasPending = group.emails.some(e => e.status === "pending");
            const hasFailed = group.emails.some(e => e.status === "failed");
            const latestEmail = group.emails[0];

            return (
              <div key={group.customerId} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                {/* Customer header — click to expand */}
                <button
                  onClick={() => toggleGroup(group.customerId)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {group.fromName.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-100 truncate">{group.fromName}</span>
                      <span className="text-xs text-gray-500 truncate">{group.from}</span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{latestEmail.subject}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasFailed && <span className="w-2 h-2 rounded-full bg-red-500" title="Falha" />}
                    {hasPending && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Pendente" />}
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {group.emails.length} e-mail{group.emails.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Emails list — collapsed by default */}
                {isExpanded && (
                  <div className="border-t border-gray-800 divide-y divide-gray-800/60">
                    {group.emails.map((email) => (
                      <div key={email.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <Link href={`/emails/${email.id}`} className="hover:text-indigo-400 transition-colors">
                            <p className="text-sm text-gray-200 truncate">{email.subject}</p>
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">{email.accountEmail}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                          {email.receivedAt && (
                            <span>
                              {new Date(email.receivedAt.seconds * 1000).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                          <StatusBadge status={email.status} />
                          {email.status === "pending" && email.scheduledReplyAt && (
                            <TimeRemaining scheduledReplyAt={email.scheduledReplyAt} />
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
