"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { useT } from "@/lib/i18n/client";

interface InviteInfo {
  email: string;
  name: string | null;
  areas: string[];
  stores: string[];
}

export default function AcceptInviteForm({ token }: { token: string }) {
  const t = useT("auth");
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/team/invite/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          setLoadError(data.error ?? "");
          return;
        }
        setInvite(data);
        setName(data.name ?? "");
      })
      .catch(() => active && setLoadError(""));
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("invite.errors.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("invite.errors.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("invite.errors.activateFailed"));
        return;
      }

      if (data.usedExistingAccount) {
        setError(t("invite.errors.existingAccount"));
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        auth,
        data.email,
        password,
      );
      const idToken = await getIdToken(credential.user);
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!loginRes.ok) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("invite.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError !== null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
          <h1 className="text-base font-semibold text-white">
            {t("invite.unavailableTitle")}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {loadError || t("invite.errors.invalid")}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300"
          >
            {t("invite.goToLogin")}
          </Link>
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-8">
        <h1 className="text-lg font-semibold text-white">
          {t("invite.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {t.rich(
            "invite.subtitle",
            { strong: (chunks) => <strong>{chunks}</strong> },
            { email: invite.email },
          )}
        </p>

        {invite.stores.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            <span className="text-gray-300 font-medium">{t("invite.stores")}</span>{" "}
            {invite.stores.join(", ")}
          </p>
        )}
        {invite.areas.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            <span className="text-gray-300 font-medium">{t("invite.access")}</span>{" "}
            {invite.areas.join(", ")}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-400">
              {t("invite.nameLabel")}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">
              {t("invite.passwordLabel")}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">
              {t("invite.confirmPasswordLabel")}
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {submitting ? t("invite.submitting") : t("invite.submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
