"use client";

import { useEffect, useState } from "react";
import { useStoreContext } from "../store-context";

export interface AnnotationDefaults {
  title?: string;
  text?: string;
  linkedEmailId?: string;
  linkedTaskId?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** Loja pré-selecionada (trava o seletor quando informada). */
  accountId?: string;
  defaults?: AnnotationDefaults;
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

export default function AnnotationModal({
  open,
  onClose,
  onCreated,
  accountId,
  defaults,
}: Props) {
  const { accounts } = useStoreContext();

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedAccountId(accountId ?? (accounts.length === 1 ? accounts[0].id : ""));
    setTitle(defaults?.title ?? "");
    setText(defaults?.text ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSave = !!selectedAccountId && title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          title: title.trim(),
          text: text.trim(),
          linkedEmailId: defaults?.linkedEmailId,
          linkedTaskId: defaults?.linkedTaskId,
          orderNumber: defaults?.orderNumber,
          customerName: defaults?.customerName,
          customerEmail: defaults?.customerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar anotação");
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar anotação");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-amber-400"
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
            <h2 className="text-sm font-semibold text-gray-100">
              Nova anotação
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 transition-colors"
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
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Store */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Loja
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={!!accountId}
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="" disabled>
                Selecione a loja...
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Linked context info */}
          {(defaults?.orderNumber ||
            defaults?.customerName ||
            defaults?.linkedEmailId ||
            defaults?.linkedTaskId) && (
            <div className="text-xs text-gray-500 bg-gray-800/40 border border-white/5 rounded-lg px-3 py-2 space-y-0.5">
              {defaults?.customerName && (
                <p>
                  Cliente:{" "}
                  <span className="text-gray-300">{defaults.customerName}</span>
                </p>
              )}
              {defaults?.orderNumber && (
                <p>
                  Pedido:{" "}
                  <span className="text-gray-300">{defaults.orderNumber}</span>
                </p>
              )}
              {defaults?.linkedEmailId && (
                <p className="text-gray-600">Vinculada à conversa</p>
              )}
              {defaults?.linkedTaskId && (
                <p className="text-gray-600">Vinculada à tarefa</p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser acompanhado?"
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Detalhes (opcional)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Observações, contexto, próximos passos..."
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-white/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
          >
            {saving && <Spinner className="w-3 h-3" />}
            {saving ? "Salvando..." : "Criar anotação"}
          </button>
        </div>
      </div>
    </div>
  );
}
