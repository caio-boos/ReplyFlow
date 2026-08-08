"use client";

import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { useRef, useState, useEffect } from "react";

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1.8, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-zinc-950/90 backdrop-blur-xl border-b border-white/6"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo-com-texto-branco-simples.png"
            alt="ReplyFlow"
            width={160}
            height={60}
            className="h-20 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it works" },
            { href: "#pricing", label: "Pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-zinc-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-zinc-950/95 backdrop-blur-xl border-b border-white/8 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {["#features", "#how-it-works", "#pricing"].map((href) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-zinc-400 hover:text-white transition-colors capitalize"
                >
                  {href === "#features"
                    ? "Features"
                    : href === "#how-it-works"
                      ? "How it works"
                      : "Pricing"}
                </a>
              ))}
              <hr className="border-white/8" />
              <Link href="/login" className="text-sm text-zinc-400">
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-emerald-500 text-white px-4 py-2 rounded-lg text-center"
              >
                Get started free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 60]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_70%,rgba(245,158,11,0.05),transparent)]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-medium tracking-wide mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Stops chargebacks. Recovers carts. Replies in 90s.
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6"
        >
          One complaint ignored.
          <br />
          <span className="text-emerald-400">One gateway suspended.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.32 }}
          className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Shopify Payments cuts you off at 1% chargeback rate. Stripe does too.
          PayPal too. ReplyFlow replies to every refund request, delivery
          complaint, and dispute threat in under 90 seconds. Before it becomes a
          filed chargeback. It also recovers abandoned carts so you stop leaving
          money on the table.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, delay: 0.44 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          >
            Protect my account
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-zinc-300 hover:text-white text-sm font-medium transition-colors px-2"
          >
            <svg
              className="w-8 h-8 rounded-full border border-white/12 p-2 bg-white/4 hover:bg-white/8 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
              />
            </svg>
            See how it works
          </a>
        </motion.div>

        {/* Social proof mini */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, delay: 0.56 }}
          className="flex items-center justify-center gap-2 mt-10 text-zinc-600 text-xs"
        >
          <div className="flex -space-x-2">
            {["E", "M", "L", "C"].map((letter, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-zinc-950 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] font-bold"
              >
                {letter}
              </div>
            ))}
          </div>
          <span>
            Used by stores that can&apos;t afford to lose their payment gateway
          </span>
        </motion.div>
      </motion.div>

      {/* Email flow visual */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="relative z-10 w-full max-w-3xl mx-auto px-6 mt-16"
      >
        <EmailFlowVisual />
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </section>
  );
}

function EmailFlowVisual() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1800);
    return () => clearInterval(id);
  }, []);

  const emails = [
    {
      from: "jessica@gmail.com",
      subject: "Where is my order?",
      time: "2m ago",
      highlight: step === 0,
    },
    {
      from: "marcos.silva@hotmail.com",
      subject: "Product arrived damaged",
      time: "8m ago",
      highlight: step === 1,
    },
    {
      from: "contact@shopify.com",
      subject: "New order #4821",
      time: "14m ago",
      highlight: false,
    },
    {
      from: "anna.k@icloud.com",
      subject: "I want a refund",
      time: "22m ago",
      highlight: step === 2,
    },
  ];

  return (
    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
      {/* Inbox */}
      <div className="bg-zinc-900/60 border border-white/8 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-amber-500/70" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-xs text-zinc-500 font-medium">
            Inbox · support@store.com
          </span>
        </div>
        <div className="divide-y divide-white/4">
          {emails.map((email, i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: email.highlight
                  ? "rgba(16,185,129,0.06)"
                  : "rgba(16,185,129,0)",
              }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/8 flex items-center justify-center text-xs text-zinc-400 font-semibold shrink-0 mt-0.5">
                {email.from[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-300 font-medium truncate">
                    {email.from}
                  </span>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {email.time}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {email.subject}
                </p>
              </div>
              {email.highlight && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Arrow + AI badge */}
      <div className="flex flex-col items-center gap-2 py-4">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent" />
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
            GPT-4o
          </div>
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent" />
          <svg
            className="w-4 h-4 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 15a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 15z" />
          </svg>
        </motion.div>
      </div>

      {/* Auto-reply preview */}
      <div className="bg-zinc-900/60 border border-white/8 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-500 font-medium">
            Auto-reply sent · &lt;90s
          </span>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Hi Jessica, thank you for reaching out. I&apos;ve checked your order
            #4729 and it&apos;s currently in transit with tracking number
            <span className="text-zinc-300 font-mono"> BR4829201</span>...
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your package is expected to arrive by{" "}
            <span className="text-zinc-300">Wednesday, Aug 7</span>. If you
            don&apos;t receive it by then, we&apos;ll send a replacement right
            away.
          </p>
          <p className="text-xs text-zinc-500 pt-1 italic">
            Best regards,
            <br />
            The Store Team
          </p>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Chargeback risk addressed · Task created
          </div>
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    {
      value: 87,
      suffix: "%",
      label: "of chargebacks stopped before they're filed with the bank",
      color: "text-amber-400",
    },
    {
      value: 94,
      suffix: "%",
      label: "of support emails handled with zero human input",
      color: "text-emerald-400",
    },
    {
      value: 90,
      suffix: "s",
      label: "average time from incoming complaint to reply sent",
      color: "text-sky-400",
    },
    {
      value: 3,
      suffix: "x",
      label:
        "average ROI for stores using chargeback prevention plus cart recovery",
      color: "text-rose-400",
    },
  ];

  return (
    <section ref={ref} className="relative bg-zinc-950 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_1px_at_50%_50%,rgba(255,255,255,0.04),transparent)]" />
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} start={inView} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  suffix,
  label,
  color,
  start,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  color: string;
  start: boolean;
  delay: number;
}) {
  const count = useCountUp(value, 1.4, start);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={start ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col gap-1.5"
    >
      <div className={`text-4xl font-black tabular-nums ${color}`}>
        {count}
        {suffix}
      </div>
      <p className="text-sm text-zinc-500 leading-snug">{label}</p>
    </motion.div>
  );
}

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const features = [
    {
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
      title: "AI replies that sound like you wrote them",
      description:
        "GPT-4o reads every previous message and order detail before writing a reply. Customers won't know it's automated. You'd be surprised how often they say thanks.",
      accent: "emerald",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      ),
      title: "Payment gateway protection",
      description:
        "Shopify Payments, Stripe, and PayPal all pull the plug above 1% chargeback rate. The AI de-escalates every threat before it becomes a filed dispute. Your rate stays clean.",
      accent: "amber",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M3 4.875C3 3.839 3.84 3 4.875 3h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 013 9.375v-4.5zM3 14.625c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 013 19.125v-4.5zM13.5 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0113.5 9.375v-4.5z"
          />
        </svg>
      ),
      title: "Native Shopify integration",
      description:
        "One-click OAuth pulls live order data, tracking numbers, and product details into every reply. No copy-pasting. No tab-switching.",
      accent: "sky",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75z"
          />
        </svg>
      ),
      title: "Smart escalation",
      description:
        "When a case needs a human, it creates a task automatically. Accepted refunds, legal threats, address changes. You only see what actually needs you.",
      accent: "rose",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839-2.51l-4.66 2.51m0 0l-1.023.55a2.25 2.25 0 01-2.134 0l-1.022-.55m0 0l-4.661-2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"
          />
        </svg>
      ),
      title: "Works with any email provider",
      description:
        "Standard IMAP/SMTP. Gmail, Outlook, Zoho, Hostinger, Titan. If your store already uses it, ReplyFlow can monitor it.",
      accent: "violet",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      ),
      title: "Abandoned cart recovery",
      description:
        "Abandoned checkout? ReplyFlow follows up with a personalized email referencing the customer's actual cart. Not a generic blast. A real message.",
      accent: "teal",
    },
  ];

  const accentMap: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
    },
    sky: {
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      border: "border-sky-500/20",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      border: "border-violet-500/20",
    },
    teal: {
      bg: "bg-teal-500/10",
      text: "text-teal-400",
      border: "border-teal-500/20",
    },
  };

  return (
    <section id="features" className="py-28 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-16"
        >
          {/* Header */}
          <div className="max-w-xl">
            <motion.p
              variants={fadeUp}
              className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3"
            >
              Features
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl font-black text-white tracking-tight leading-tight"
            >
              Stops chargebacks. Recovers carts. Keeps your gateway alive.
            </motion.h2>
          </div>

          {/* Grid */}
          <motion.div
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature, i) => {
              const accent = accentMap[feature.accent];
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/6 hover:border-white/10 rounded-2xl p-6 transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${accent.bg} ${accent.text} border ${accent.border} flex items-center justify-center mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      number: "01",
      title: "Connect your inbox and Shopify",
      description:
        "Add your IMAP/SMTP credentials and link Shopify in one click. No code, no webhooks, no waiting for approval.",
      detail: "Gmail, Outlook, Zoho, Hostinger, Titan. Any IMAP provider.",
    },
    {
      number: "02",
      title: "AI intercepts complaints before they escalate",
      description:
        "Every refund threat, delivery complaint, and angry email gets a contextual reply in under 90 seconds. Before the customer opens a dispute with their bank.",
      detail:
        "Inbox checked every 2 minutes. Replies go out from your own address.",
    },
    {
      number: "03",
      title: "Abandoned carts come back",
      description:
        "ReplyFlow also follows up on abandoned checkouts with a personalized message referencing the customer's actual cart. Not a blast. A real email.",
      detail: "Tasks created only when a case actually needs a human.",
    },
  ];

  return (
    <section id="how-it-works" className="py-28 bg-zinc-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(16,185,129,0.04),transparent)]" />

      <div className="relative max-w-6xl mx-auto px-6" ref={ref}>
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <div className="max-w-xl mb-16">
            <motion.p
              variants={fadeUp}
              className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3"
            >
              How it works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl font-black text-white tracking-tight leading-tight"
            >
              Set up in 10 minutes. Protecting your account today.
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center shrink-0">
                    <span className="text-xl font-black text-zinc-600">
                      {step.number}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="md:hidden flex-1 h-px bg-white/6" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  {step.description}
                </p>
                <p className="text-xs text-zinc-600 border-l-2 border-emerald-500/30 pl-3 leading-relaxed">
                  {step.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const testimonials = [
    {
      quote:
        "My Shopify Payments got suspended once. Two years ago. I switched to ReplyFlow, dropped from 2.3% to 0.4% chargeback rate in six weeks. Haven't had a gateway issue since.",
      author: "Mateus R.",
      role: "Dropshipping store owner, 800+ orders/month",
      initials: "MR",
    },
    {
      quote:
        "The cart recovery alone pays for the plan. $4,200 in recovered orders in the first 30 days. I almost turned that feature off by accident.",
      author: "Larissa F.",
      role: "E-commerce manager, Fashion brand",
      initials: "LF",
    },
    {
      quote:
        "Took 10 minutes to connect. It already knew the order number, delivery status, and customer history. The replies sound exactly like me. Customers never suspect a thing.",
      author: "David K.",
      role: "Founder, Electronics store",
      initials: "DK",
    },
  ];

  return (
    <section className="py-28 bg-zinc-950" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <div className="max-w-xl mb-14">
            <motion.p
              variants={fadeUp}
              className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3"
            >
              What our customers say
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl font-black text-white tracking-tight"
            >
              Gateway saved. Revenue recovered.
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white/[0.03] border border-white/6 rounded-2xl p-6 flex flex-col gap-5"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <svg
                      key={j}
                      className="w-3.5 h-3.5 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <blockquote className="text-sm text-zinc-400 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3 pt-1 border-t border-white/6">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">
                      {t.author}
                    </p>
                    <p className="text-[11px] text-zinc-600">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const plans = [
    {
      name: "Starter",
      price: 49,
      description:
        "For stores that need to stop chargebacks without hiring support.",
      features: [
        "1 email account",
        "Up to 500 emails/mo",
        "Shopify integration",
        "Basic task queue",
        "Email support",
      ],
      cta: "Get started",
      highlight: false,
    },
    {
      name: "Growth",
      price: 129,
      description: "For growing brands getting hit with high support volume.",
      features: [
        "3 email accounts",
        "Up to 3,000 emails/mo",
        "Shopify integration",
        "Full task queue + priority flags",
        "Custom AI prompt",
        "Priority support",
      ],
      cta: "Get started",
      highlight: true,
    },
    {
      name: "Scale",
      price: 299,
      description: "For multi-store operators who can't afford any downtime.",
      features: [
        "Unlimited accounts",
        "Unlimited emails",
        "Multi-store Shopify",
        "Cart recovery",
        "Advanced analytics",
        "Dedicated onboarding",
      ],
      cta: "Talk to us",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-28 bg-zinc-950 relative" ref={ref}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_100%,rgba(16,185,129,0.06),transparent)]" />

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <div className="text-center max-w-xl mx-auto mb-14">
            <motion.p
              variants={fadeUp}
              className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3"
            >
              Pricing
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-4xl font-black text-white tracking-tight"
            >
              Flat pricing. No surprises.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-500 mt-3 text-sm">
              14-day free trial on all plans. No credit card required.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-2xl p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? "bg-emerald-500/8 border border-emerald-500/25"
                    : "bg-white/[0.03] border border-white/6"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}

                <div>
                  <p
                    className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-emerald-400" : "text-zinc-400"}`}
                  >
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-3xl font-black text-white">
                      ${plan.price}
                    </span>
                    <span className="text-zinc-500 text-sm">/month</span>
                  </div>
                  <p className="text-xs text-zinc-500">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2.5 text-sm text-zinc-400"
                    >
                      <svg
                        className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`text-center text-sm font-semibold py-2.5 px-4 rounded-xl transition-all ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-white/6 hover:bg-white/10 text-zinc-200 border border-white/8"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-28 bg-zinc-950" ref={ref}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-medium mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            14-day free trial. No credit card.
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-5"
          >
            Your gateway can&apos;t
            <br />
            <span className="text-emerald-400">run on luck.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-zinc-400 mb-10 max-w-lg mx-auto leading-relaxed"
          >
            Every unanswered complaint is a potential chargeback. Every
            chargeback above 1% risks your Shopify Payments, Stripe, or PayPal
            account. ReplyFlow handles it automatically and recovers abandoned
            carts along the way.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 text-sm"
            >
              Protect my account
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-3.5"
            >
              Already have an account →
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/6 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo-com-texto-branco-simples.png"
              alt="ReplyFlow"
              width={160}
              height={40}
              className="h-20 w-auto object-contain"
            />
          </div>

          <nav className="flex flex-wrap gap-6">
            {[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#pricing", label: "Pricing" },
              { href: "/login", label: "Log in" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} ReplyFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
