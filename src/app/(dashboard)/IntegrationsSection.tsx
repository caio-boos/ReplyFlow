"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/client";

interface ReplicateState {
  configured: boolean;
  fromEnv: boolean;
  username: string | null;
}

export default function IntegrationsSection() {
  const t = useT("settings");
  const tc = useT("common");
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
      if (!res.ok) throw new Error(data.error ?? t("integrations.errors.saveFailed"));
      setToken("");
      setState((s) => ({
        configured: true,
        fromEnv: s?.fromEnv ?? false,
        username: data.username ?? null,
      }));
      toast.success(t("integrations.toast.connected", { username: data.username }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("integrations.errors.saveFailed"));
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
      toast.success(t("integrations.toast.removed"));
    } finally {
      setSaving(false);
    }
  }

  const active = state?.configured || state?.fromEnv;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{t("integrations.title")}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t("integrations.description")}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-200">Replicate</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("integrations.replicateDescription")}
            </p>
            {state?.username && (
              <p className="text-xs text-gray-400 mt-1">
                {t.rich(
                  "integrations.billedAccount",
                  {
                    user: (c) => <span className="font-mono text-gray-300">{c}</span>,
                  },
                  { username: state.username },
                )}
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
              ? t("integrations.status.connected")
              : state?.fromEnv
                ? t("integrations.status.fromEnv")
                : t("integrations.status.notConfigured")}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={state?.configured ? t("integrations.placeholderReplace") : "r8_..."}
            autoComplete="off"
            className="flex-1 bg-gray-900/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500/60"
          />
          <button
            onClick={save}
            disabled={saving || !token.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white cursor-pointer"
          >
            {saving ? tc("actions.saving") : tc("actions.save")}
          </button>
          {state?.configured && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/6 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40 cursor-pointer"
            >
              {tc("actions.remove")}
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-600 leading-relaxed">
          {t.rich("integrations.help", {
            link: (c) => (
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                {c}
              </a>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
