"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStoreContext } from "../store-context";
import { useConfirm } from "../ConfirmDialog";
import AnnotationModal from "./AnnotationModal";
import { useFormat, useT } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translator";

interface Annotation {
  id: string;
  accountId: string;
  title: string;
  text: string;
  status: "open" | "done";
  linkedEmailId: string | null;
  linkedTaskId: string | null;
  orderNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  createdByEmail: string | null;
  createdAt: { seconds: number } | null;
}

type StatusTab = "open" | "done" | "all";

function relativeTime(
  seconds: number,
  t: Translator<"workspace">,
  f: ReturnType<typeof useFormat>,
): string {
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return t("relative.now");
  if (diff < 3600) return t("relative.minutes", { count: Math.floor(diff / 60) });
  if (diff < 86400) return t("relative.hours", { count: Math.floor(diff / 3600) });
  if (diff < 604800) return t("relative.days", { count: Math.floor(diff / 86400) });
  return f.date(seconds * 1000, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
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
  );
}

export default function AnotacoesPage() {
  const { accounts, selectedAccountId } = useStoreContext();
  const openConfirm = useConfirm();
  const t = useT("workspace");
  const tc = useT("common");
  const f = useFormat();

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "all")
        params.set("accountId", selectedAccountId);
      if (statusTab !== "all") params.set("status", statusTab);
      const res = await fetch(`/api/annotations?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      setAnnotations(data.annotations ?? []);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, statusTab]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(a: Annotation) {
    setTogglingId(a.id);
    try {
      await fetch(`/api/annotations/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: a.status === "open" ? "done" : "open" }),
      });
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(a: Annotation) {
    const confirmed = await openConfirm({
      title: t("notes.deleteConfirm.title"),
      description: t("notes.deleteConfirm.description", { title: a.title }),
      confirmLabel: tc("actions.delete"),
    });
    if (!confirmed) return;
    await fetch(`/api/annotations/${a.id}`, { method: "DELETE" });
    await load();
  }

  // Group annotations by store (loja)
  const groups = new Map<string, Annotation[]>();
  for (const a of annotations) {
    if (!groups.has(a.accountId)) groups.set(a.accountId, []);
    groups.get(a.accountId)!.push(a);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-100">{t("notes.title")}</h1>
            <p className="text-xs text-gray-500">
              {t("notes.subtitle")}
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-medium text-white transition-colors"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t("notes.new")}
        </button>
      </div>

      {/* Status tabs */}
      <div className="inline-flex p-0.5 bg-gray-900/60 border border-white/6 rounded-lg">
        {(
          [
            ["open", "notes.tabs.open"],
            ["done", "notes.tabs.done"],
            ["all", "notes.tabs.all"],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            onClick={() => setStatusTab(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusTab === value
                ? "bg-amber-600 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
          <Spinner />
          {t("notes.loading")}
        </div>
      ) : annotations.length === 0 ? (
        <div className="bg-gray-900/60 border border-white/6 rounded-xl py-14 text-center space-y-1.5">
          <p className="text-sm text-gray-400">{t("notes.empty.title")}</p>
          <p className="text-xs text-gray-600">
            {t("notes.empty.hint")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(groups.entries()).map(([accountId, items]) => {
            const account = accountMap.get(accountId);
            return (
              <div
                key={accountId}
                className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden"
              >
                {/* Store header */}
                <div className="px-4 py-2.5 border-b border-white/5 bg-white/2 flex items-center gap-2">
                  {account?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.logoUrl}
                      alt={account.label}
                      className="w-5 h-5 rounded object-contain bg-white/5"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                      <span className="text-indigo-300 text-[10px] font-bold leading-none">
                        {(account?.label ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-gray-300">
                    {account?.label ?? t("notes.storeRemoved")}
                  </span>
                  <span className="text-xs text-gray-600">
                    {t("notes.count", { count: items.length })}
                  </span>
                </div>

                <div className="divide-y divide-white/4">
                  {items.map((a) => (
                    <div
                      key={a.id}
                      className={`px-4 py-3.5 flex gap-3 items-start group ${
                        a.status === "done"
                          ? "opacity-55 hover:bg-white/2"
                          : "hover:bg-white/2"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleStatus(a)}
                        disabled={togglingId === a.id}
                        title={
                          a.status === "done"
                            ? t("notes.reopen")
                            : t("notes.markDone")
                        }
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 ${
                          a.status === "done"
                            ? "bg-emerald-600/80 border-emerald-600"
                            : "border-gray-600 hover:border-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        {togglingId === a.id ? (
                          <Spinner className="w-3 h-3 text-gray-400" />
                        ) : (
                          a.status === "done" && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            a.status === "done"
                              ? "line-through text-gray-600"
                              : "text-gray-200"
                          }`}
                        >
                          {a.title}
                        </p>
                        {a.text && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap">
                            {a.text}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {a.customerName && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border bg-sky-500/10 text-sky-400 border-sky-500/20">
                              {a.customerName}
                            </span>
                          )}
                          {a.orderNumber && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border bg-violet-500/10 text-violet-400 border-violet-500/20">
                              {t("notes.order", { number: a.orderNumber })}
                            </span>
                          )}
                          {a.linkedEmailId && (
                            <Link
                              href={`/conversas?id=${a.linkedEmailId}`}
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-400 transition-colors"
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
                                  strokeWidth={1.75}
                                  d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                                />
                              </svg>
                              {t("notes.viewConversation")}
                            </Link>
                          )}
                          {a.linkedTaskId && (
                            <Link
                              href="/tasks"
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-400 transition-colors"
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
                                  strokeWidth={1.75}
                                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t("notes.viewTask")}
                            </Link>
                          )}
                          {a.createdAt && (
                            <>
                              <span className="text-gray-800">·</span>
                              <span className="text-xs text-gray-700">
                                {relativeTime(a.createdAt.seconds, t, f)}
                              </span>
                            </>
                          )}
                          {a.createdByEmail && (
                            <span className="text-xs text-gray-700 truncate">
                              {t("notes.createdBy", { email: a.createdByEmail })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(a)}
                        title={t("notes.delete")}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                      >
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
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnnotationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        accountId={selectedAccountId !== "all" ? selectedAccountId : undefined}
      />
    </div>
  );
}
