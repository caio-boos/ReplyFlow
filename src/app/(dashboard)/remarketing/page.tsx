"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useStoreContext } from "../store-context";

interface AccountOption {
  id: string;
  label: string;
  email: string;
  shopifyConnected?: boolean;
}

interface RemarketingItem {
  id: string;
  accountId: string;
  shopDomain: string;
  checkoutId: string;
  customerEmail: string;
  customerName: string;
  cartValue: number;
  currency: string;
  lineItems: Array<{ title: string; quantity: number; price: number }>;
  abandonedCheckoutUrl: string;
  couponCode: string;
  status: "sent" | "failed" | "replied" | "recovered";
  errorMessage?: string;
  repliedEmailId: string | null;
  recoveredOrderName?: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

const STATUS_CONFIG = {
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
  replied: {
    label: "Respondido",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  recovered: {
    label: "Recuperado ✓",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.sent;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACCOUNT_FILTER_KEY = "replyflow.remarketing.accountFilter"; // kept for localStorage migration only

export default function RemarketingPage() {
  const { selectedAccountId, loading: storeLoading } = useStoreContext();
  const [items, setItems] = useState<RemarketingItem[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, recovered: 0, replied: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [checkingRecovery, setCheckingRecovery] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const p = new URLSearchParams();
    if (selectedAccountId !== "all") p.set("accountId", selectedAccountId);
    const res = await fetch(`/api/remarketing${p.toString() ? `?${p}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.remarketing ?? []);
      if (data.stats) setStats(data.stats);
    }
    setLoading(false);
  }, [selectedAccountId]);

  useEffect(() => {
    if (storeLoading) return;
    fetchData();
  }, [fetchData, storeLoading]);

  async function triggerCron() {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abandoned-checkouts", force: true }),
      });
      const data = await res.json();
      setTriggerMsg({
        text: res.ok ? (data.message ?? "Concluído!") : (data.error ?? "Erro"),
        ok: res.ok,
      });
      if (res.ok) fetchData();
    } catch {
      setTriggerMsg({ text: "Erro de conexão", ok: false });
    }
    setTriggering(false);
  }

  async function checkRecovery() {
    setCheckingRecovery(true);
    setRecoveryMsg(null);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-recovery" }),
      });
      const data = await res.json();
      const recovered = data.recovered ?? 0;
      let text: string;
      if (!res.ok) {
        text = data.error ?? "Erro";
      } else if (recovered === 0) {
        text = data.message ?? "Nenhuma recuperação nova encontrada.";
      } else if (selectedAccountId !== "all") {
        text = `${recovered} carrinho(s) recuperado(s) no total. Selecione "Todas as lojas" para ver todos.`;
      } else {
        text = `${recovered} carrinho(s) recuperado(s)!`;
      }
      setRecoveryMsg({ text, ok: res.ok });
      if (res.ok) fetchData();
    } catch {
      setRecoveryMsg({ text: "Erro de conexão", ok: false });
    }
    setCheckingRecovery(false);
  }

  function toggleExpand(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // stats come from the server (computed before pagination limit) — accurate for all stores

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
      {/* Email preview modal */}
      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-gray-300">Preview do e-mail</span>
              <button
                onClick={() => setPreviewId(null)}
                className="text-gray-500 hover:text-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={`/api/remarketing/${previewId}/preview`}
              className="w-full h-150 border-0"
              title="Email preview"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Remarketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Carrinhos abandonados — cupom de 20% de desconto enviado automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkRecovery}
            disabled={checkingRecovery}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-yellow-600/20 hover:bg-yellow-600/30 disabled:opacity-50 text-yellow-400 border border-yellow-500/30 rounded-md transition-colors"
          >
            {checkingRecovery ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Verificar recuperações
          </button>
          <button
            onClick={triggerCron}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            {triggering ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Buscar carrinhos agora
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-md text-sm border ${
            triggerMsg.ok
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {triggerMsg.text}
        </div>
      )}

      {recoveryMsg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-md text-sm border ${
            recoveryMsg.ok
              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {recoveryMsg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total processados", value: stats.total, color: "text-gray-100" },
          { label: "Enviados com sucesso", value: stats.sent, color: "text-emerald-400" },
          { label: "Recuperados", value: stats.recovered, color: "text-yellow-400" },
          { label: "Respondidos", value: stats.replied, color: "text-blue-400" },
          { label: "Falhos", value: stats.failed, color: "text-red-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-gray-900/60 border border-white/6 rounded-lg p-4"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="w-12 h-12 text-gray-700 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <p className="text-gray-500 text-sm">Nenhum email de remarketing enviado ainda.</p>
          <p className="text-gray-600 text-xs mt-1">
            Clique em &ldquo;Buscar carrinhos agora&rdquo; ou aguarde o processamento automático a cada 2 horas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const expanded = expandedItems.has(item.id);
            const initials = (item.customerName || item.customerEmail)[0].toUpperCase();
            return (
              <div
                key={item.id}
                className="bg-gray-900/60 border border-white/6 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-indigo-300">{initials}</span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {item.customerName || item.customerEmail}
                      </span>
                      {item.customerName && item.customerName !== item.customerEmail && (
                        <span className="text-xs text-gray-500 truncate">{item.customerEmail}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {item.lineItems.map((l) => `${l.quantity}x ${l.title}`).join(", ")}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-gray-200">
                      {item.currency}{" "}
                      {item.cartValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <StatusBadge status={item.status} />
                    <span className="text-xs text-gray-600 hidden lg:block">
                      {formatDate(item.sentAt)}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? "rotate-180" : ""}`}
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

                {expanded && (
                  <div className="px-4 pb-4 border-t border-white/6 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                      {/* Cart details */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Itens do carrinho
                        </p>
                        <div className="space-y-1.5">
                          {item.lineItems.map((li, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-gray-400 text-xs"
                            >
                              <span>
                                {li.quantity}x {li.title}
                              </span>
                              <span>
                                {item.currency} {li.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-gray-200 text-xs font-semibold border-t border-white/6 pt-1.5 mt-1">
                            <span>Total</span>
                            <span>
                              {item.currency}{" "}
                              {item.cartValue.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Remarketing details */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Detalhes do remarketing
                        </p>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Cupom enviado:</span>
                            <span className="font-mono text-xs bg-gray-800 border border-white/10 px-2 py-0.5 rounded text-yellow-400">
                              {item.couponCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Enviado em:</span>
                            <span className="text-gray-400">{formatDate(item.sentAt)}</span>
                          </div>
                          <div>
                            <a
                              href={item.abandonedCheckoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                            >
                              Ver carrinho na Shopify ↗
                            </a>
                          </div>
                          {item.status === "replied" && item.repliedEmailId && (
                            <div>
                              <Link
                                href={`/emails/${item.repliedEmailId}`}
                                className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-md transition-colors"
                              >
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
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                Ver resposta do cliente →
                              </Link>
                            </div>
                          )}
                          {item.status === "recovered" && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">Pedido gerado:</span>
                              <span className="font-semibold text-yellow-400">
                                {item.recoveredOrderName ?? "—"}
                              </span>
                            </div>
                          )}
                          {item.status === "failed" && item.errorMessage && (
                            <p className="text-xs text-red-400/80">{item.errorMessage}</p>
                          )}
                          {(item.status === "sent" || item.status === "replied" || item.status === "recovered") && (
                            <button
                              onClick={() => setPreviewId(item.id)}
                              className="inline-flex items-center gap-1.5 text-xs bg-gray-800 border border-white/8 text-gray-400 hover:text-gray-200 hover:bg-gray-700 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver e-mail enviado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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
