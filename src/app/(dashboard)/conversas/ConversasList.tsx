"use client";

import { useState, useMemo } from "react";
import { EmailDoc } from "@/lib/types";
import type { CustomerGroup } from "./page";

type Tab = "all" | "auto" | "manual" | "spam";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "auto", label: "Automático" },
  { key: "manual", label: "Manual" },
  { key: "spam", label: "Spam" },
];

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400 animate-pulse",
  processing: "bg-sky-400 animate-pulse",
  sent: "bg-emerald-400",
  failed: "bg-red-400",
  cancelled: "bg-gray-500",
};

function getGroupTab(group: CustomerGroup): Tab {
  const s = group.latestEmail.status;
  if (s === "cancelled") return "spam";
  if (["pending", "processing", "failed"].includes(s)) return "manual";
  if (s === "sent") return "auto";
  return "all";
}

function relativeTime(seconds: number): string {
  const diff = Date.now() / 1000 - seconds;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-indigo-300 select-none">
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

interface Props {
  groups: CustomerGroup[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (emailId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  paused: boolean;
  showPauseToggle: boolean;
  toggling: boolean;
  onTogglePause: () => void;
  dayRange: number;
  onDayRangeChange: (days: number) => void;
}

export default function ConversasList({
  groups,
  loading,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
  loadingMore,
  paused,
  showPauseToggle,
  toggling,
  onTogglePause,
  dayRange,
  onDayRangeChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: groups.length,
      auto: 0,
      manual: 0,
      spam: 0,
    };
    groups.forEach((g) => {
      const t = getGroupTab(g);
      if (t !== "all") c[t]++;
    });
    return c;
  }, [groups]);

  const filtered = useMemo(() => {
    let result =
      tab === "all" ? groups : groups.filter((g) => getGroupTab(g) === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.fromName.toLowerCase().includes(q) ||
          g.from.toLowerCase().includes(q) ||
          (g.latestEmail.subject ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [groups, tab, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pause banner — shown when IA is paused for the selected account */}
      {showPauseToggle && paused && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/15 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg
              className="w-3.5 h-3.5 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs text-amber-400 font-medium truncate">
              IA pausada — modo manual
            </span>
          </div>
          <button
            onClick={onTogglePause}
            disabled={toggling}
            className="shrink-0 text-xs text-amber-400 hover:text-amber-200 underline underline-offset-2 disabled:opacity-50 transition-colors"
          >
            {toggling ? "..." : "Retomar"}
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou assunto..."
              className="w-full pl-8 pr-8 py-2 bg-white/5 border border-white/8 rounded-lg text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {/* Pause toggle button (when not paused) */}
          {showPauseToggle && !paused && (
            <button
              onClick={onTogglePause}
              disabled={toggling}
              title="Pausar respostas automáticas da IA"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 border border-white/8 hover:border-amber-500/20 transition-all"
            >
              {toggling ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
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
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-1 px-3 pb-1.5 shrink-0">
        <span className="text-[11px] text-gray-600 mr-0.5">Últimos:</span>
        {([7, 30, 60, 90, 180] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDayRangeChange(d)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              dayRange === d
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-2 pb-1.5 border-b border-white/5 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`px-1 min-w-4 text-center rounded text-[10px] leading-4 ${
                  tab === t.key
                    ? "bg-indigo-500/30 text-indigo-300"
                    : "bg-white/8 text-gray-500"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-2 space-y-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-white/3 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500">Nenhuma conversa encontrada</p>
            {search && (
              <p className="text-xs text-gray-600 mt-0.5">
                Tente ajustar os filtros
              </p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((group) => {
              const latest = group.latestEmail;
              const isSelected = latest.id === selectedId;
              const ts = latest.receivedAt?.seconds
                ? relativeTime(latest.receivedAt.seconds)
                : "—";
              const lowConfidence =
                latest.classifyConfidence === "low" ||
                latest.classifyConfidence === "medium";

              return (
                <button
                  key={group.groupId}
                  onClick={() => onSelect(latest.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                    isSelected
                      ? "bg-indigo-500/12 ring-1 ring-inset ring-indigo-500/25"
                      : "hover:bg-white/4"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Avatar name={group.fromName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-200 truncate leading-tight">
                          {group.fromName}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {latest.chargebackRisk && (
                            <svg
                              aria-label="Risco de chargeback"
                              className="w-3 h-3 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {lowConfidence && (
                            <span
                              title={`Confiança da IA: ${latest.classifyConfidence}`}
                              className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 leading-none"
                            >
                              ?
                            </span>
                          )}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[latest.status] ?? "bg-gray-500"}`}
                          />
                          <span className="text-[10px] text-gray-600 tabular-nums">
                            {ts}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        {group.from}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5 leading-snug">
                        {latest.subject || "(sem assunto)"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="pt-2 px-1">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/4 disabled:opacity-50 border border-white/6 transition-all"
                >
                  {loadingMore ? (
                    <>
                      <svg
                        className="w-3 h-3 animate-spin"
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
                    </>
                  ) : (
                    <>
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Carregar mais conversas
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
