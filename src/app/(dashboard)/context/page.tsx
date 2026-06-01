"use client";

import { useEffect, useState } from "react";

export default function ContextPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => r.json())
      .then((d) => setText(d.text ?? ""))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Contexto da IA</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Este texto é usado pelo GPT-4o para entender sua loja e gerar
          respostas adequadas aos clientes.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl">
        <svg
          className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
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
        <p className="text-sm text-indigo-300/80 leading-relaxed">
          <span className="font-medium text-indigo-300">
            Dica para reduzir chargebacks:
          </span>{" "}
          Mencione seu prazo de entrega, política de reembolso e canais
          alternativos de contato. A IA usará essas informações para oferecer
          soluções antes que o cliente acione o banco.
        </p>
      </div>

      {/* Editor card */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            system_prompt.txt
          </div>
          <span className="text-xs text-gray-600 tabular-nums">
            {text.length.toLocaleString("pt-BR")} caracteres
          </span>
        </div>

        {/* Textarea */}
        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-600">
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
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className="w-full bg-transparent px-4 py-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none font-mono leading-relaxed"
            placeholder="Descreva sua loja, produtos, política de trocas, prazo de entrega, como responder reclamações de chargeback..."
          />
        )}

        {/* Card footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/5 bg-black/20">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
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
              Salvo com sucesso
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
          >
            {saving ? (
              <>
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
                Salvando...
              </>
            ) : (
              <>
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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Salvar contexto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
