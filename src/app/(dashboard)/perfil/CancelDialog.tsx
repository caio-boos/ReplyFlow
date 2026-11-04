"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  PLANS,
  formatUsd,
  planPrice,
  yearlySavings,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import { errorText, postJson } from "@/lib/billing/ui";
import type { BillingSummary } from "@/lib/billing/http";
import { useFormat, useT } from "@/lib/i18n/client";

/** `id` é enviado à Stripe; o rótulo vem de `billing.cancel.reasons.<key>`. */
const REASONS = [
  { id: "too_expensive", key: "tooExpensive" },
  { id: "unused", key: "unused" },
  { id: "missing_features", key: "missingFeatures" },
  { id: "switched_service", key: "switchedService" },
  { id: "too_complex", key: "tooComplex" },
  { id: "low_quality", key: "lowQuality" },
  { id: "other", key: "other" },
] as const;

type CancelDialogProps = {
  open: boolean;
  onClose: () => void;
  summary: BillingSummary;
  onCanceled: () => Promise<unknown>;
  onSwitchPlan: (plan: PlanId, interval: BillingInterval) => void;
};

export default function CancelDialog(props: CancelDialogProps) {
  // Montado só quando aberto: o formulário sempre começa limpo.
  return props.open ? <CancelBody {...props} /> : null;
}

function CancelBody({ onClose, summary, onCanceled, onSwitchPlan }: CancelDialogProps) {
  const t = useT("billing");
  const tc = useT("common");
  const f = useFormat();
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const sub = summary.subscription;
  const inTrial = sub.status === "trialing";
  const accessUntil = inTrial ? sub.trialEnd : sub.currentPeriodEnd;
  const plan = sub.plan ? PLANS[sub.plan] : null;

  // Alternativa só quando faz sentido para o motivo — nunca bloqueia o cancelamento.
  const priceReason = reason === "too_expensive" || reason === "unused";
  const starterFits =
    PLANS.starter.limits.stores !== null && summary.usage.stores <= PLANS.starter.limits.stores &&
    (PLANS.starter.limits.seats === null || summary.usage.seats <= PLANS.starter.limits.seats);
  const offer =
    priceReason && plan && plan.id !== "starter" && starterFits
      ? {
          title: t("cancel.offerStarter.title", {
            price: t("shared.pricePer", {
              price: formatUsd(planPrice("starter", sub.interval ?? "month")),
              interval: sub.interval ?? "month",
            }),
          }),
          body: t("cancel.offerStarter.body"),
          cta: t("cancel.offerStarter.cta"),
          plan: "starter" as PlanId,
          interval: sub.interval ?? "month",
        }
      : priceReason && plan && sub.interval === "month"
        ? {
            title: t("cancel.offerYearly.title", { amount: formatUsd(yearlySavings(plan.id)) }),
            body: t("cancel.offerYearly.body", {
              plan: plan.name,
              monthly: formatUsd(Math.round(plan.yearly / 12)),
              current: formatUsd(plan.monthly),
            }),
            cta: t("cancel.offerYearly.cta"),
            plan: plan.id,
            interval: "year" as BillingInterval,
          }
        : null;

  async function confirm() {
    setSubmitting(true);
    try {
      await postJson("/api/billing/cancel", { reason, comment: comment.trim() || null });
      toast.success(
        inTrial
          ? t("cancel.toastTrial", { date: f.date(accessUntil) })
          : t("cancel.toast", { date: f.date(accessUntil) }),
      );
      await onCanceled();
      onClose();
    } catch (err) {
      toast.error(errorText(err, tc("states.error")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/6">
          <h2 id="cancel-title" className="text-sm font-semibold text-white">
            {t("cancel.title")}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{t("cancel.subtitle")}</p>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-300 mb-2">{t("cancel.reasonLabel")}</p>
            <div className="grid gap-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                    reason === r.id
                      ? "border-indigo-500/50 bg-indigo-500/10 text-white"
                      : "border-white/6 text-gray-400 hover:bg-white/3"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-indigo-500"
                  />
                  {t(`cancel.reasons.${r.key}`)}
                </label>
              ))}
            </div>
            {reason && (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t("cancel.commentPlaceholder")}
                className="mt-2 w-full rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            )}
          </div>

          {offer && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4">
              <p className="text-xs font-semibold text-emerald-400">{offer.title}</p>
              <p className="text-xs text-gray-400 mt-1">{offer.body}</p>
              <button
                type="button"
                onClick={() => onSwitchPlan(offer.plan, offer.interval)}
                className="mt-3 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
              >
                {offer.cta}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-xs text-gray-400 space-y-1.5">
            <p className="font-medium text-gray-200">{t("cancel.whatHappens")}</p>
            <p>• {inTrial ? t("cancel.noChargeTrial") : t("cancel.noNewCharges")}</p>
            <p>
              •{" "}
              {t.rich(
                "cancel.accessUntil",
                { b: (c) => <strong className="text-gray-200">{c}</strong> },
                { date: f.date(accessUntil) },
              )}
            </p>
            <p>• {t("cancel.readonlyAfter")}</p>
            <p>• {t("cancel.changeMind")}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 sm:px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5"
          >
            {t("cancel.keep")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {submitting ? t("cancel.canceling") : t("cancel.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
