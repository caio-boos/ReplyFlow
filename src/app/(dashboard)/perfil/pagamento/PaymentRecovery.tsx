"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PLANS, formatUsd, planPrice } from "@/lib/billing/plans";
import { isPaymentProblem } from "@/lib/billing/entitlements";
import { cardBrandLabel, postJson } from "@/lib/billing/ui";
import type { BillingSummary } from "@/lib/billing/http";
import { useBillingStatus } from "@/components/billing/useBillingStatus";
import { useFormat, useT } from "@/lib/i18n/client";
import { openBillingPortal } from "../SubscriptionPanel";

/** Textos em `billing.payment.tips.<key>`. */
const TIPS = ["funds", "international", "expired", "authentication"] as const;

export default function PaymentRecovery({ initialSummary }: { initialSummary: BillingSummary }) {
  const t = useT("billing");
  const f = useFormat();
  const strong = { b: (c: React.ReactNode) => <strong className="text-white">{c}</strong> };
  const { data, refresh } = useBillingStatus(initialSummary);
  const summary = data ?? initialSummary;
  const [busy, setBusy] = useState<"card" | "retry" | null>(null);
  const { entitlement: ent, subscription: sub } = summary;

  const plan = sub.plan ? PLANS[sub.plan] : null;
  const due =
    sub.latestInvoice?.amountRemaining ??
    (sub.plan && sub.interval ? planPrice(sub.plan, sub.interval) : 0);
  const problem = isPaymentProblem(ent.reason) || sub.status === "unpaid";

  async function updateCard() {
    setBusy("card");
    try {
      await openBillingPortal("payment_method_update", "/perfil/pagamento");
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(null);
    }
  }

  async function retry() {
    setBusy("retry");
    try {
      await postJson("/api/billing/retry");
      const next = await refresh();
      if (next && !isPaymentProblem(next.entitlement.reason)) {
        toast.success(t("payment.approved"));
        // Recarrega para liberar os recursos resolvidos no servidor.
        window.location.href = "/dashboard";
      } else {
        toast.error(t("payment.stillDeclined"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!problem) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-8 text-center">
          <h1 className="text-base font-semibold text-white">{t("payment.allGoodTitle")}</h1>
          <p className="mt-2 text-sm text-gray-400">{t("payment.allGoodBody")}</p>
          <Link
            href="/perfil?tab=assinatura"
            className="mt-6 inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            {t("shared.viewSubscription")}
          </Link>
        </div>
      </div>
    );
  }

  const readonly = ent.mode !== "full";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <Link href="/perfil?tab=assinatura" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("payment.back")}
      </Link>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/8 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
          {t("payment.eyebrow")}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">
          {sub.status === "past_due" && sub.trialEnd && ent.reason === "trial_unpaid"
            ? t("payment.titleTrial")
            : t("payment.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-300 leading-relaxed">
          {readonly
            ? t.rich("payment.readonlyBody", strong)
            : t.rich("payment.graceBody", strong, { date: f.date(ent.graceEndsAt) })}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3 rounded-xl border border-white/8 bg-gray-950/40 p-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">{t("payment.amountDue")}</dt>
            <dd className="text-white font-semibold">{formatUsd(due, { cents: true })}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{t("payment.plan")}</dt>
            <dd className="text-gray-200">
              {plan
                ? t("shared.planWithInterval", {
                    plan: plan.name,
                    interval: sub.interval === "year" ? "year" : "month",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{t("payment.currentCard")}</dt>
            <dd className="text-gray-200">
              {sub.paymentMethod
                ? `${cardBrandLabel(sub.paymentMethod.brand)} •••• ${sub.paymentMethod.last4}`
                : "—"}
            </dd>
          </div>
        </dl>
        {sub.latestInvoice?.nextPaymentAttempt && (
          <p className="mt-3 text-xs text-gray-500">
            {t("payment.nextAttempt", { date: f.date(sub.latestInvoice.nextPaymentAttempt) })}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/6 bg-gray-900/60 p-6">
        <h2 className="text-sm font-semibold text-white">{t("payment.stepsTitle")}</h2>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center">
              1
            </span>
            <div className="flex-1">
              <p className="text-sm text-gray-200">{t("payment.step1.title")}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("payment.step1.body")}</p>
              <button
                type="button"
                onClick={updateCard}
                disabled={busy !== null}
                className="mt-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium"
              >
                {busy === "card" ? t("payment.step1.opening") : t("payment.step1.cta")}
              </button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center">
              2
            </span>
            <div className="flex-1">
              <p className="text-sm text-gray-200">{t("payment.step2.title")}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("payment.step2.body", { amount: formatUsd(due, { cents: true }) })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={retry}
                  disabled={busy !== null}
                  className="px-3.5 py-2 rounded-lg border border-white/10 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:opacity-50"
                >
                  {busy === "retry" ? t("payment.step2.processing") : t("payment.step2.cta")}
                </button>
                {sub.latestInvoice?.hostedInvoiceUrl && (
                  <a
                    href={sub.latestInvoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {t("payment.step2.payOther")}
                  </a>
                )}
              </div>
            </div>
          </li>
        </ol>
      </section>

      <section className="rounded-2xl border border-white/6 bg-white/2 p-6">
        <h2 className="text-sm font-semibold text-white">{t("payment.tips.title")}</h2>
        <ul className="mt-3 space-y-1.5 text-xs text-gray-400">
          {TIPS.map((tip) => (
            <li key={tip}>• {t(`payment.tips.${tip}`)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
