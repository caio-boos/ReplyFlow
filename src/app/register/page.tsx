"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

// ─── Variants ─────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ─── Marketing panel ──────────────────────────────────────────────────────────

const FEATURES = [
  {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    title: "Gateway protection",
    desc: "Keeps your chargeback rate below 1% — the limit that triggers Shopify Payments, Stripe, and PayPal suspensions.",
  },
  {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
        />
      </svg>
    ),
    title: "Replies in under 90 seconds",
    desc: "Every refund request, delivery complaint, and dispute threat answered automatically before it escalates.",
  },
  {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
    ),
    title: "Abandoned cart recovery",
    desc: "Personalized follow-ups on abandoned checkouts. Not a blast — a real message referencing their actual cart.",
  },
];

function MarketingPanel() {
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
        <div className="space-y-3">
          <motion.div variants={fadeUp} transition={{ duration: 0.45 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              14-day free trial · No credit card
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-[2rem] font-black leading-[1.1] tracking-tight text-white"
          >
            Stop chargebacks.
            <br />
            <span className="text-emerald-400">Start today.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.45 }}
            className="max-w-xs text-sm leading-relaxed text-zinc-400"
          >
            Connect your inbox in minutes. ReplyFlow starts protecting your
            gateway immediately — and recovering carts on the side.
          </motion.p>
        </div>

        {/* Feature list */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.45 }}
          className="space-y-2.5"
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] p-4"
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${f.border} ${f.bg} ${f.color}`}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">
                  {f.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3"
        >
          <div className="flex -space-x-2">
            {["MR", "LF", "DK", "AK"].map((init) => (
              <div
                key={init}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[9px] font-bold text-zinc-400"
              >
                {init}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-zinc-500">
            Joined by stores that{" "}
            <span className="text-zinc-300">
              can&apos;t afford gateway suspensions
            </span>
          </p>
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

// ─── Eye icon ─────────────────────────────────────────────────────────────────

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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const auth = getClientAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await sendEmailVerification(credential.user);
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else if (code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else if (code === "auth/weak-password") {
        setError("Senha muito fraca. Use ao menos 8 caracteres.");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Left: Marketing ── */}
      <div className="relative hidden w-1/2 overflow-hidden border-r border-white/6 lg:block">
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
          {done ? (
            /* ── Success state ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-5 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
                <svg
                  className="h-6 w-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Verifique seu e-mail
                </h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Enviamos um link para{" "}
                  <span className="text-zinc-200">{email}</span>. Clique nele
                  para ativar sua conta.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-1 w-full rounded-xl bg-emerald-500 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-px hover:bg-emerald-400"
              >
                Ir para o login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-xl font-black tracking-tight text-white">
                  Criar conta
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  14 dias grátis · Sem cartão de crédito
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
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-zinc-600 transition-colors hover:text-zinc-400"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  className="space-y-1.5"
                >
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                    Confirmar senha
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                    placeholder="Repita a senha"
                  />
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
                        Criando conta...
                      </span>
                    ) : (
                      "Criar conta grátis"
                    )}
                  </button>
                </motion.div>
              </motion.form>

              <p className="mt-6 text-center text-xs text-zinc-600">
                Já tem conta?{" "}
                <Link
                  href="/login"
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  Entrar
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
