"use client";

import { useEffect, useState } from "react";

export default function NotificationsSection() {
  const [current, setCurrent] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((d) => setCurrent(d.notificationEmail ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      setCurrent(email.trim());
      setEmail("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/settings/notifications", { method: "DELETE" });
      setCurrent(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Notificações</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Avisos quando um cliente que você está acompanhando responde
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-200">
              E-mail de notificação
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Você recebe um aviso quando chega resposta de um cliente com
              anotação aberta ou de um e-mail enviado pelo Compor E-mail.
            </p>
            {current && (
              <p className="text-xs text-gray-400 mt-1">
                Enviando para:{" "}
                <span className="font-mono text-gray-300">{current}</span>
              </p>
            )}
          </div>
          <span
            className={`text-[11px] px-2 py-1 rounded-md border shrink-0 ${
              current
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-white/5 border-white/10 text-gray-500"
            }`}
          >
            {loading ? "..." : current ? "Ativo" : "Não configurado"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={current ? "Substituir e-mail…" : "seu@email.com"}
            autoComplete="off"
            className="flex-1 bg-gray-900/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60"
          />
          <button
            onClick={save}
            disabled={saving || !email.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white cursor-pointer"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {current && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/6 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40 cursor-pointer"
            >
              Desativar
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-xs text-emerald-400">
            E-mail de notificação salvo com sucesso.
          </p>
        )}

        <p className="text-[11px] text-gray-600 leading-relaxed">
          A notificação é enviada pela própria conta de e-mail da loja que
          recebeu a resposta, com um link direto para a conversa.
        </p>
      </div>
    </section>
  );
}
