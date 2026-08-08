"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1.6) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / (duration * 1000), 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(delay);
  }, [target, duration]);
  return count;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ─── Marketing panel ──────────────────────────────────────────────────────────

function MarketingPanel() {
  const pct = useCountUp(87);
  const sec = useCountUp(90);
  const roi = useCountUp(3);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
      }}
      className="flex h-full flex-col justify-between px-10 py-10 xl:px-14"
    >
      {/* Logo */}
      <motion.div variants={fadeUp} transition={{ duration: 0.45 }}>
        <Link href="/">
          <Image
            src="/images/logo-com-texto-branco-simples.png"
            alt="ReplyFlow"
            width={130}
            height={32}
            className="h-20 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>
      </motion.div>

      {/* Core content */}
      <div className="space-y-7">
        <div className="space-y-4">
          <motion.div variants={fadeUp} transition={{ duration: 0.45 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Active protection
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-[2rem] font-black leading-[1.1] tracking-tight text-white"
          >
            Your gateway.
            <br />
            <span className="text-emerald-400">Protected 24/7.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.45 }}
            className="max-w-xs text-sm leading-relaxed text-zinc-400"
          >
            ReplyFlow handles every complaint before it becomes a chargeback.
            One tool. No missed emails. No gateway suspensions.
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.45 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {[
            {
              value: pct,
              suffix: "%",
              label: "chargebacks stopped",
              color: "text-amber-400",
            },
            {
              value: sec,
              suffix: "s",
              label: "avg. reply time",
              color: "text-sky-400",
            },
            {
              value: roi,
              suffix: "×",
              label: "avg. ROI",
              color: "text-emerald-400",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/6 bg-white/[0.035] p-3.5"
            >
              <div className={`text-2xl font-black tabular-nums ${s.color}`}>
                {s.value}
                {s.suffix}
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-zinc-500">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Testimonial */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.45 }}
          className="rounded-xl border border-white/6 bg-white/[0.03] p-5"
        >
          <div className="mb-3 flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="h-3 w-3 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            &ldquo;My Shopify Payments got suspended once. After ReplyFlow, I
            dropped from 2.3% to 0.4% chargeback rate in six weeks. Haven&apos;t
            had a gateway issue since.&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-2.5 border-t border-white/6 pt-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-[10px] font-bold text-zinc-400">
              MR
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-300">
                Mateus R.
              </p>
              <p className="text-[10px] text-zinc-600">
                Dropshipping · 800+ orders/mo
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        variants={fadeUp}
        transition={{ duration: 0.4 }}
        className="text-[11px] text-zinc-700"
      >
        © {new Date().getFullYear()} ReplyFlow. All rights reserved.
      </motion.p>
    </motion.div>
  );
}

// ─── Eye toggle icon ──────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (!credential.user.emailVerified) {
        setError("E-mail não verificado. Verifique sua caixa de entrada.");
        setLoading(false);
        return;
      }
      const idToken = await getIdToken(credential.user);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao fazer login");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError("E-mail ou senha incorretos");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else {
        setError("Erro ao fazer login");
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Left: Marketing ── */}
      <div className="relative hidden w-1/2 overflow-hidden border-r border-white/6 lg:block">
        {/* bg */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-zinc-900/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_15%,rgba(16,185,129,0.09),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="relative h-full">
          <MarketingPanel />
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* bg subtle glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_-10%,rgba(16,185,129,0.05),transparent)]" />

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col items-center gap-2 lg:hidden"
        >
          <Link href="/">
            <Image
              src="/images/logo-com-texto-branco-simples.png"
              alt="ReplyFlow"
              width={130}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[380px]"
        >
          <div className="mb-7">
            <h1 className="text-xl font-black tracking-tight text-white">
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Acesse seu painel de controle
            </p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.07, delayChildren: 0.15 },
              },
            }}
            className="space-y-4"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-3 text-sm text-red-400"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                {error}
              </motion.div>
            )}

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.35 }}
              className="space-y-1.5"
            >
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                placeholder="admin@minhaloja.com"
              />
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.35 }}
              className="space-y-1.5"
            >
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-600 transition-colors hover:text-zinc-400"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.35 }}
              className="pt-1"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-px hover:bg-emerald-400 hover:shadow-emerald-400/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </button>
            </motion.div>
          </motion.form>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Criar conta grátis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
