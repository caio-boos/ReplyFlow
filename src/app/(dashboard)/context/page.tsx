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
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Contexto da IA</h1>
        <p className="text-gray-400 text-sm mt-1">
          Este texto é usado pelo ChatGPT para entender sua loja e gerar respostas adequadas. Inclua
          informações sobre produtos, políticas de troca, prazos de entrega e como lidar com chargebacks.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Carregando...</div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={20}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono leading-relaxed"
            placeholder="Descreva sua loja, produtos, política de trocas, prazo de entrega, como responder reclamações de chargeback..."
          />
        )}

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">{text.length} caracteres</span>
          <div className="flex items-center gap-3">
            {saved && <span className="text-green-400 text-sm">✓ Salvo</span>}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
            >
              {saving ? "Salvando..." : "Salvar contexto"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-indigo-950/40 border border-indigo-900 rounded-xl text-sm text-indigo-300">
        <strong>Dica para reduzir chargebacks:</strong> Mencione explicitamente seu prazo de entrega,
        política de reembolso (ex: &quot;reembolso em até 7 dias úteis&quot;) e canais alternativos de
        contato. A IA usará essas informações para oferecer soluções antes que o cliente acione o banco.
      </div>
    </div>
  );
}
