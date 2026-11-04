"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Toaster } from "sonner";
import type { Permission } from "@/lib/auth/permissions";
import {
  COMPARISON_ROWS,
  PLANS,
  PLAN_HIGHLIGHT_KEYS,
  PLAN_LIST,
  TRIAL_DAYS,
  formatUsd,
  isBillingInterval,
  isPlanId,
  minimumPlanFor,
  planPrice,
  yearlySavings,
  type BillingInterval,
  type PlanDef,
  type PlanId,
} from "@/lib/billing/plans";
import { errorText, postJson } from "@/lib/billing/ui";
import type { BillingSummary } from "@/lib/billing/http";
import ChangePlanDialog, { IntervalToggle } from "@/components/billing/ChangePlanDialog";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useFormat, useT } from "@/lib/i18n/client";

const LIVE = new Set(["trialing", "active", "past_due", "unpaid", "paused", "incomplete"]);

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripeJs(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

interface Props {
  email: string;
  summary: BillingSummary | null;
  publishableKey: string | null;
  upgradeFeature: Permission | null;
  initialPlan: string | null;
  initialInterval: string | null;
}

export default function PlansClient({
  email,
  summary,
  publishableKey,
  upgradeFeature,
  initialPlan,
  initialInterval,
}: Props) {
  const t = useT("billing");
  const tc = useT("common");
  const tp = useT("permissions");
  const f = useFormat();
  const upgradeTarget = upgradeFeature ? minimumPlanFor(upgradeFeature) : null;
  const [interval, setInterval] = useState<BillingInterval>(
    isBillingInterval(initialInterval) ? initialInterval : "month",
  );
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<number | null>(summary?.trial.trialEnd ?? null);
  const [starting, setStarting] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeTarget, setChangeTarget] = useState<PlanId | null>(null);

  const enabled = !!summary?.enabled && !!publishableKey;
  const sub = summary?.subscription;
  const subscribed = !!sub?.id && !!sub.status && LIVE.has(sub.status);
  const hasAppAccess = summary ? summary.entitlement.mode !== "blocked" : true;
  const trialAvailable = summary?.trial.trialAvailable ?? true;
  const legacyUntil = summary?.entitlement.legacyUntil ?? null;
  const [fallbackTrialEnd] = useState(() => Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86_400);
  const highlightId: PlanId =
    upgradeTarget?.id ?? (isPlanId(initialPlan) ? initialPlan : "growth");

  async function start(plan: PlanId) {
    if (!enabled) return;
    if (subscribed) {
      setChangeTarget(plan);
      return;
    }
    setStarting(plan);
    setError(null);
    try {
      const res = await postJson<{ clientSecret: string; trialEnd: number | null }>(
        "/api/billing/checkout",
        { plan, interval },
      );
      setClientSecret(res.clientSecret);
      setTrialEnd(res.trialEnd);
      setCheckoutPlan(plan);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorText(err, tc("states.error")));
    } finally {
      setStarting(null);
    }
  }

  function backToPlans() {
    setCheckoutPlan(null);
    setClientSecret(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(16,185,129,0.09),transparent)]" />
      <Toaster position="bottom-right" theme="dark" richColors />

      <header className="relative border-b border-white/6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-5 h-16">
          <Link href={hasAppAccess ? "/dashboard" : "/planos"}>
            <Image
              src="/images/logo-com-texto-branco-simples.png"
              alt="ReplyFlow"
              width={120}
              height={28}
              className="h-6 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline text-zinc-500 truncate max-w-[220px]">{email}</span>
            <LanguageSwitcher variant="public" />
            {hasAppAccess ? (
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-white/5"
              >
                {t("plans.backToApp")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="text-zinc-500 hover:text-white"
              >
                {tc("actions.logout")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 pb-24">
        <AnimatePresence mode="wait">
          {checkoutPlan && clientSecret && publishableKey ? (
            <motion.section
              key="checkout"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="pt-8 sm:pt-12"
            >
              <CheckoutStep
                plan={PLANS[checkoutPlan]}
                interval={interval}
                trialEnd={trialEnd}
                clientSecret={clientSecret}
                publishableKey={publishableKey}
                onBack={backToPlans}
              />
            </motion.section>
          ) : (
            <motion.section
              key="plans"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pt-12 sm:pt-16 text-center max-w-2xl mx-auto">
                {trialAvailable && !subscribed && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-medium mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {t("plans.hero.trialBadge", { count: TRIAL_DAYS })}
                  </div>
                )}
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {subscribed ? t("plans.hero.titleSubscribed") : t("plans.hero.title")}
                  {!subscribed && (
                    <span className="block text-emerald-400">{t("plans.hero.titleAccent")}</span>
                  )}
                </h1>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  {subscribed
                    ? t("plans.hero.subtitleSubscribed")
                    : trialAvailable
                      ? t("plans.hero.subtitleTrial", { count: TRIAL_DAYS })
                      : t("plans.hero.subtitleNoTrial")}
                </p>
              </div>

              {upgradeFeature && upgradeTarget && (
                <Callout tone="emerald" className="mt-8">
                  {t.rich(
                    "plans.callout.upgrade",
                    { b: (c) => <strong className="text-white">{c}</strong> },
                    { feature: tp(`${upgradeFeature}.label`), plan: upgradeTarget.name },
                  )}
                  {subscribed && <> {t("plans.callout.upgradeInstant")}</>}
                </Callout>
              )}

              {legacyUntil && !subscribed && (
                <Callout tone="indigo" className="mt-6">
                  {t.rich(
                    "plans.callout.legacy",
                    { b: (c) => <strong className="text-white">{c}</strong> },
                    { until: f.date(legacyUntil), firstCharge: f.date(summary?.trial.trialEnd) },
                  )}
                </Callout>
              )}

              {!enabled && (
                <Callout tone="amber" className="mt-8">
                  {t("plans.callout.disabled")}
                </Callout>
              )}

              {error && (
                <Callout tone="red" className="mt-8">
                  {error}
                </Callout>
              )}

              <div className="mt-10 flex justify-center">
                <IntervalToggle value={interval} onChange={setInterval} tone="emerald" />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-500">
                {interval === "year" ? t("plans.intervalHint.year") : t("plans.intervalHint.month")}
              </p>

              <div className="mt-10 grid gap-5 lg:grid-cols-3">
                {PLAN_LIST.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    interval={interval}
                    index={i}
                    highlighted={plan.id === highlightId}
                    isCurrent={subscribed && sub?.plan === plan.id && sub?.interval === interval}
                    subscribed={subscribed}
                    trialAvailable={trialAvailable}
                    trialEnd={summary?.trial.trialEnd ?? fallbackTrialEnd}
                    tooSmall={
                      !!summary &&
                      ((plan.limits.stores !== null &&
                        summary.usage.stores > plan.limits.stores) ||
                        (plan.limits.seats !== null && summary.usage.seats > plan.limits.seats))
                    }
                    loading={starting === plan.id}
                    disabled={!enabled || starting !== null}
                    onSelect={() => start(plan.id)}
                  />
                ))}
              </div>

              <TrustRow />
              <Comparison />
              <Faq />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {summary && subscribed && (
        <ChangePlanDialog
          open={changeTarget !== null}
          onClose={() => setChangeTarget(null)}
          summary={summary}
          initialPlan={changeTarget}
          initialInterval={interval}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  index,
  highlighted,
  isCurrent,
  subscribed,
  trialAvailable,
  trialEnd,
  tooSmall,
  loading,
  disabled,
  onSelect,
}: {
  plan: PlanDef;
  interval: BillingInterval;
  index: number;
  highlighted: boolean;
  isCurrent: boolean;
  subscribed: boolean;
  trialAvailable: boolean;
  trialEnd: number | null;
  tooSmall: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const t = useT("billing");
  const f = useFormat();
  const price = planPrice(plan.id, interval);
  const perMonth = interval === "year" ? Math.round(plan.yearly / 12) : plan.monthly;

  const cta = isCurrent
    ? t("plans.card.current")
    : subscribed
      ? t("plans.card.switchTo", { plan: plan.name })
      : trialAvailable
        ? t("plans.card.startTrial", { count: TRIAL_DAYS })
        : t("plans.card.subscribe", { plan: plan.name });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={`relative flex flex-col rounded-2xl p-6 ${
        highlighted
          ? "bg-emerald-500/8 border border-emerald-500/30 shadow-2xl shadow-emerald-500/5"
          : "bg-white/[0.03] border border-white/6"
      }`}
    >
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
          {t("plans.card.recommended")}
        </div>
      )}

      <p className={`text-sm font-semibold ${highlighted ? "text-emerald-400" : "text-zinc-300"}`}>
        {plan.name}
      </p>
      <p className="mt-1 text-xs text-zinc-500 min-h-8">{t(`catalog.${plan.id}.tagline`)}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tight">{formatUsd(perMonth)}</span>
        <span className="text-sm text-zinc-500">{t("shared.perInterval", { interval: "month" })}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 min-h-4">
        {interval === "year"
          ? t.rich(
              "plans.card.billedYearly",
              { save: (c) => <span className="text-emerald-400">{c}</span> },
              { price: formatUsd(price), savings: formatUsd(yearlySavings(plan.id)) },
            )
          : t("plans.card.billedMonthly")}
      </p>

      {!subscribed && trialAvailable && (
        <p className="mt-4 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-400 leading-relaxed">
          {t.rich(
            "plans.card.trialNote",
            { b: (c) => <span className="font-semibold text-zinc-200">{c}</span> },
            {
              price: t("shared.pricePer", { price: formatUsd(price), interval }),
              date: f.date(trialEnd),
            },
          )}
        </p>
      )}

      <ul className="mt-5 space-y-2.5 flex-1">
        {PLAN_HIGHLIGHT_KEYS.map((h) => (
          <li key={h} className="flex items-start gap-2.5 text-sm text-zinc-300">
            <Check className={highlighted ? "text-emerald-400" : "text-emerald-500"} />
            {t(`catalog.${plan.id}.highlights.${h}`)}
          </li>
        ))}
        <li className="flex items-start gap-2.5 text-sm text-zinc-400">
          <Check className="text-zinc-600" />
          {t("shared.storesAndReplies", {
            stores: plan.limits.stores ?? 0,
            replies: plan.limits.aiReplies,
          })}
        </li>
      </ul>

      {tooSmall && !isCurrent && (
        <p className="mt-4 text-[11px] text-amber-400">
          {t("plans.card.tooSmall")}
        </p>
      )}

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || isCurrent || tooSmall}
        className={`mt-6 flex items-center justify-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          highlighted
            ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
            : "bg-white/6 hover:bg-white/10 text-zinc-100 border border-white/8"
        }`}
      >
        {loading && <Spinner />}
        {loading ? t("plans.card.preparing") : cta}
      </button>
    </motion.div>
  );
}

function CheckoutStep({
  plan,
  interval,
  trialEnd,
  clientSecret,
  publishableKey,
  onBack,
}: {
  plan: PlanDef;
  interval: BillingInterval;
  trialEnd: number | null;
  clientSecret: string;
  publishableKey: string;
  onBack: () => void;
}) {
  const t = useT("billing");
  const f = useFormat();
  const bold = { b: (c: React.ReactNode) => <strong className="text-zinc-200">{c}</strong> };
  const price = planPrice(plan.id, interval);
  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-start">
      <aside className="lg:sticky lg:top-8 space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("plans.checkout.changePlan")}
        </button>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {t("plans.checkout.summary")}
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {plan.name}{" "}
            <span className="text-zinc-500 font-medium">
              · {t(`shared.interval.${interval}`)}
            </span>
          </h2>

          <dl className="mt-5 space-y-3 text-sm">
            <SummaryRow
              label={t("plans.checkout.dueToday")}
              value={formatUsd(trialEnd ? 0 : price, { cents: true })}
              strong
            />
            {trialEnd && (
              <SummaryRow
                label={t("plans.checkout.freePeriod")}
                value={t("plans.checkout.freeUntil", { date: f.date(trialEnd) })}
              />
            )}
            <SummaryRow
              label={trialEnd ? t("shared.firstCharge") : t("plans.checkout.nextRenewal")}
              value={
                trialEnd
                  ? t("shared.amountOnDate", {
                      amount: formatUsd(price, { cents: true }),
                      date: f.date(trialEnd),
                    })
                  : t("plans.checkout.nextRenewalValue", {
                      amount: formatUsd(price, { cents: true }),
                      interval,
                    })
              }
            />
            <SummaryRow label={t("shared.renewal")} value={t("shared.renewalValue", { interval })} />
            <SummaryRow label={t("plans.checkout.currency")} value={t("plans.checkout.currencyValue")} />
          </dl>

          <div className="mt-6 space-y-3 border-t border-white/6 pt-5 text-xs text-zinc-400 leading-relaxed">
            <p className="flex gap-2.5">
              <Check className="text-emerald-400" />
              <span>
                {trialEnd
                  ? t.rich("plans.checkout.cancelTrial", bold, { date: f.date(trialEnd) })
                  : t.rich("plans.checkout.cancelPaid", bold)}
              </span>
            </p>
            {trialEnd && (
              <p className="flex gap-2.5">
                <Check className="text-emerald-400" />
                <span>{t("plans.checkout.reminder")}</span>
              </p>
            )}
            <p className="flex gap-2.5">
              <Check className="text-emerald-400" />
              <span>{t("plans.checkout.noFees")}</span>
            </p>
          </div>
        </div>

        <p className="flex items-center gap-2 text-[11px] text-zinc-500">
          <LockIcon />
          {t("plans.checkout.secure")}
        </p>
      </aside>

      <div className="rounded-2xl bg-white p-2 sm:p-4 min-h-[540px] shadow-2xl shadow-black/40">
        <EmbeddedCheckoutProvider stripe={getStripeJs(publishableKey)} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`text-right ${strong ? "text-white font-semibold" : "text-zinc-200"}`}>{value}</dd>
    </div>
  );
}

const TRUST_ITEMS = ["secure", "reminder", "cancel", "cards"] as const;

function TrustRow() {
  const t = useT("billing");
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_ITEMS.map((id) => (
        <div key={id} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
          <p className="text-sm font-semibold text-zinc-200">{t(`plans.trust.${id}.title`)}</p>
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{t(`plans.trust.${id}.body`)}</p>
        </div>
      ))}
    </div>
  );
}

function Comparison() {
  const t = useT("billing");
  const f = useFormat();
  return (
    <section className="mt-20">
      <h2 className="text-xl font-bold text-center">{t("plans.compare.title")}</h2>
      <div className="relative mt-6 overflow-x-auto rounded-2xl border border-white/6">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/6 bg-white/[0.02]">
              <th className="text-left font-medium text-zinc-500 px-5 py-3">
                {t("plans.compare.feature")}
              </th>
              {PLAN_LIST.map((p) => (
                <th
                  key={p.id}
                  className={`px-5 py-3 font-semibold ${p.recommended ? "text-emerald-400" : "text-zinc-200"}`}
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-white/4 last:border-0">
                <td className="px-5 py-3 text-zinc-400">{t(`plans.compare.rows.${row.id}`)}</td>
                {PLAN_LIST.map((p) => {
                  const v = row.value(p);
                  return (
                    <td key={p.id} className="px-5 py-3 text-center text-zinc-200">
                      {v === true ? (
                        <span className="inline-flex justify-center">
                          <Check className="text-emerald-400" />
                          <span className="sr-only">{t("plans.compare.included")}</span>
                        </span>
                      ) : v === false ? (
                        <span className="text-zinc-700" aria-label={t("plans.compare.notIncluded")}>
                          —
                        </span>
                      ) : v === "unlimited" ? (
                        t("plans.compare.unlimited")
                      ) : (
                        f.number(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-600">
        {t("plans.compare.fairUse")}
      </p>
    </section>
  );
}

const FAQ_ITEMS = ["charged", "cancel", "change", "methods", "failed"] as const;

function Faq() {
  const t = useT("billing");
  return (
    <section className="mt-20 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-center">{t("plans.faq.title")}</h2>
      <div className="mt-6 divide-y divide-white/6 rounded-2xl border border-white/6">
        {FAQ_ITEMS.map((id) => (
          <details key={id} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-200">
              {t(`plans.faq.${id}.q`)}
              <svg
                className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-45"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              {t(`plans.faq.${id}.a`, { count: TRIAL_DAYS })}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Callout({
  tone,
  className = "",
  children,
}: {
  tone: "emerald" | "indigo" | "amber" | "red";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    emerald: "border-emerald-500/25 bg-emerald-500/8 text-emerald-100/80",
    indigo: "border-indigo-500/25 bg-indigo-500/8 text-indigo-100/80",
    amber: "border-amber-500/25 bg-amber-500/8 text-amber-100/80",
    red: "border-red-500/25 bg-red-500/8 text-red-200",
  };
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className={`max-w-2xl mx-auto rounded-xl border px-4 py-3 text-sm text-center leading-relaxed ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 mt-0.5 shrink-0 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
