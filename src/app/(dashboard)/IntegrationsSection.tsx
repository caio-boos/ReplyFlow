"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ReplicateState {
  configured: boolean;
  fromEnv: boolean;
  username: string | null;
}

export default function IntegrationsSection() {
  const [state, setState] = useState<ReplicateState | null>(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => setState(d.replicate ?? null))
      .catch(() => setState(null));
  }, []);

  async function save() {
    if (!token.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replicateToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      setToken("");
      setState((s) => ({
        configured: true,
        fromEnv: s?.fromEnv ?? false,
        username: data.username ?? null,
      }));
      toast.success(`Token conectado (${data.username}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await fetch("/api/settings/integrations", { method: "DELETE" });
      setState((s) => ({
        configured: false,
        fromEnv: s?.fromEnv ?? false,
        username: null,
      }));
      toast.success("Token removido.");
    } finally {
      setSaving(false);
    }
  }

  const active = state?.configured || state?.fromEnv;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Integrações de IA</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Chaves usadas pelas ferramentas de vídeo
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-200">Replicate</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Remoção de marca d&apos;água com IA · ~US$ 0,03 por vídeo
            </p>
            {state?.username && (
              <p className="text-xs text-gray-400 mt-1">
                Conta cobrada:{" "}
                <span className="font-mono text-gray-300">{state.username}</span>
              </p>
            )}
          </div>
          <span
            className={`text-[11px] px-2 py-1 rounded-md border shrink-0 ${
              active
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-white/5 border-white/10 text-gray-500"
            }`}
          >
            {state?.configured
              ? "Conectado"
              : state?.fromEnv
                ? "Via variável de ambiente"
                : "Não configurado"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={state?.configured ? "Substituir token…" : "r8_..."}
            autoComplete="off"
            className="flex-1 bg-gray-900/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500/60"
          />
          <button
            onClick={save}
            disabled={saving || !token.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white cursor-pointer"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {state?.configured && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/6 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40 cursor-pointer"
            >
              Remover
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-600 leading-relaxed">
          Gere em{" "}
          <a
            href="https://replicate.com/account/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            replicate.com/account/api-tokens
          </a>
          . O token é validado e guardado criptografado — nunca é exibido de volta.
        </p>
      </div>
    </section>
  );
}
