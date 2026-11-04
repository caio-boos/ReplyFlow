"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  PLANS,
  PLAN_LIST,
  formatUsd,
  planPrice,
  yearlySavings,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import { isPaymentProblem } from "@/lib/billing/entitlements";
import {
  STATUS_BADGE,
  TONE_CLASSES,
  cardBrandLabel,
  cardExpiresAt,
  cardFunding,
  daysUntil,
  errorText,
  postJson,
} from "@/lib/billing/ui";
import { useFormat, useT } from "@/lib/i18n/client";
import type { BillingSummary } from "@/lib/billing/http";
import ChangePlanDialog from "@/components/billing/ChangePlanDialog";
import CancelDialog from "./CancelDialog";
import InvoicesList from "./InvoicesList";

const LIVE = new Set(["trialing", "active", "past_due", "unpaid", "paused", "incomplete"]);

export async function openBillingPortal(
  flow: "default" | "payment_method_update",
  returnPath = "/perfil?tab=assinatura",
) {
  const { url } = await postJson<{ url: string }>("/api/billing/portal", { flow, returnPath });
  window.location.href = url;
}

export default function SubscriptionPanel({
  summary,
  onRefresh,
}: {
  summary: BillingSummary;
  onRefresh: () => Promise<unknown>;
}) {
  const t = useT("billing");
  const tc = useT("common");
  const tp = useT("permissions");
  const f = useFormat();
  const bold = { b: (c: React.ReactNode) => <strong className="text-gray-200">{c}</strong> };
  const { entitlement: ent, subscription: sub, usage } = summary;
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<{ plan: PlanId | null; interval: BillingInterval | null }>({
    plan: null,
    interval: null,
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const live = !!sub.id && !!sub.status && LIVE.has(sub.status);
  const plan = sub.plan ? PLANS[sub.plan] : null;
  const price = sub.plan && sub.interval ? planPrice(sub.plan, sub.interval) : null;
  const badge = STATUS_BADGE[ent.reason];
  const inTrial = sub.status === "trialing";
  const nextCharge = sub.cancelAtPeriodEnd ? null : inTrial ? sub.trialEnd : sub.currentPeriodEnd;

  function openChange(plan: PlanId | null = null, interval: BillingInterval | null = null) {
    setChangeTarget({ plan, interval });
    setChangeOpen(true);
  }

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(errorText(err, tc("states.error")));
    } finally {
      setBusy(null);
    }
  }

  async function reactivate() {
    await run("reactivate", async () => {
      const res = await postJson<{ needsCheckout: boolean }>("/api/billing/reactivate");
      if (res.needsCheckout) {
        window.location.href = "/planos";
        return;
      }
      toast.success(t("subscription.reactivated"));
      await onRefresh();
    });
  }

  // Sem assinatura ativa: transição, encerrada ou nunca assinou.
  if (!live) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-white/6 bg-gray-900/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              {ent.reason === "legacy"
                ? t("subscription.inactive.legacyTitle")
                : ent.reason === "admin"
                  ? t("subscription.inactive.adminTitle")
                  : ent.reason === "comp"
                  ? t("subscription.inactive.compTitle")
                  : plan
                    ? t("subscription.inactive.endedTitle", { plan: plan.name })
                    : t("subscription.inactive.noneTitle")}
            </h2>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[badge.tone].badge}`}>
              {t(`status.${ent.reason}`)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
            {ent.reason === "legacy"
              ? t.rich("subscription.inactive.legacyBody", bold, {
                  date: f.date(ent.legacyUntil),
                  days: daysUntil(ent.legacyUntil) ?? 0,
                  firstCharge: f.date(summary.trial.trialEnd),
                })
              : ent.reason === "admin"
                ? t("subscription.inactive.adminBody")
                : ent.reason === "comp"
                ? t("subscription.inactive.compBody")
                : sub.status === "canceled"
                  ? t("subscription.inactive.canceledBody")
                  : t("subscription.inactive.noneBody")}
          </p>
          {ent.reason !== "comp" && ent.reason !== "admin" && (
            <Link
              href="/planos"
              className="mt-5 inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              {sub.status === "canceled"
                ? t("subscription.inactive.resubscribe")
                : t("subscription.inactive.choosePlan")}
            </Link>
          )}
        </section>
        {sub.status === "canceled" && <InvoicesList />}
      </div>
    );
  }

  const card = sub.paymentMethod;
  const fundingKind = card ? cardFunding(card.funding) : null;
  const cardExpiring =
    card && nextCharge ? cardExpiresAt(card.expMonth, card.expYear) < nextCharge : false;
  const nextPlan = plan ? PLAN_LIST.find((p) => p.rank === plan.rank + 1) ?? null : null;
  const gained = nextPlan && plan ? nextPlan.features.filter((f) => !plan.features.includes(f)) : [];

  return (
    <div className="space-y-6">
      {isPaymentProblem(ent.reason) && (
        <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${TONE_CLASSES.red.panel}`}>
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-400">
              {ent.mode === "full"
                ? t("subscription.problem.titleGrace")
                : t("subscription.problem.titleReadonly")}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ent.mode === "full" && ent.graceEndsAt
                ? t("subscription.problem.bodyGrace", { date: f.date(ent.graceEndsAt) })
                : t("subscription.problem.bodyReadonly")}
            </p>
          </div>
          <Link
            href="/perfil/pagamento"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-medium"
          >
            {t("subscription.problem.cta")}
          </Link>
        </div>
      )}

      {/* Plano atual */}
      <section className="rounded-xl border border-white/6 bg-gray-900/60">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {t("shared.planName", { plan: plan?.name ?? "—" })}
              </h2>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[badge.tone].badge}`}>
                {t(`status.${ent.reason}`)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              {t("subscription.priceLine", {
                price:
                  price !== null
                    ? t("shared.pricePer", {
                        price: formatUsd(price),
                        interval: sub.interval === "year" ? "year" : "month",
                      })
                    : "—",
                interval: sub.interval === "year" ? "year" : "month",
              })}
            </p>
            {sub.interval === "month" && sub.plan && !sub.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => openChange(sub.plan, "year")}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                {t("subscription.switchYearly", { amount: formatUsd(yearlySavings(sub.plan)) })}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sub.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={reactivate}
                disabled={busy !== null}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium"
              >
                {busy === "reactivate"
                  ? t("subscription.reactivating")
                  : t("subscription.reactivate")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openChange()}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                {t("subscription.changePlan")}
              </button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 border-t border-white/6 divide-y sm:divide-y-0 sm:divide-x divide-white/4">
          {inTrial && (
            <Stat
              label={t("subscription.stats.trialEnd")}
              value={f.date(sub.trialEnd)}
              hint={
                daysUntil(sub.trialEnd) !== null
                  ? t("subscription.stats.daysLeft", { count: daysUntil(sub.trialEnd)! })
                  : undefined
              }
            />
          )}
          {sub.cancelAtPeriodEnd ? (
            <Stat
              label={t("subscription.stats.accessUntil")}
              value={f.date(ent.accessUntil ?? sub.cancelAt)}
              hint={t("subscription.stats.noFutureCharges")}
            />
          ) : (
            <Stat
              label={inTrial ? t("shared.firstCharge") : t("shared.nextCharge")}
              value={f.date(nextCharge)}
              hint={
                price !== null
                  ? t("subscription.stats.onCard", { amount: formatUsd(price, { cents: true }) })
                  : undefined
              }
            />
          )}
          {!inTrial && (
            <Stat
              label={t("subscription.stats.cycle")}
              value={sub.interval === "year" ? t("shared.interval.year") : t("shared.interval.month")}
              hint={t("subscription.stats.autoRenew")}
            />
          )}
          <div className="px-5 py-4">
            <dt className="text-xs text-gray-500">{t("subscription.stats.paymentMethod")}</dt>
            <dd className="mt-1 text-sm text-gray-200">
              {card ? (
                <>
                  {cardBrandLabel(card.brand)} •••• {card.last4}
                  <span className="block text-xs text-gray-500">
                    {[
                      fundingKind ? t(`card.funding.${fundingKind}`) : null,
                      t("card.expires", {
                        date: `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`,
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">{t("subscription.stats.noCard")}</span>
              )}
            </dd>
            <button
              type="button"
              onClick={() => run("pm", () => openBillingPortal("payment_method_update"))}
              disabled={busy !== null}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              {busy === "pm"
                ? t("subscription.stats.openingSecure")
                : t("subscription.stats.changeCard")}
            </button>
          </div>
        </dl>

        {cardExpiring && (
          <p className="mx-5 mb-5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-400">
            {t("subscription.cardExpiring")}
          </p>
        )}
      </section>

      {/* Uso e benefícios */}
      {plan && (
        <section className="rounded-xl border border-white/6 bg-gray-900/60 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white">{t("subscription.includes.title")}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Meter
              label={t("subscription.includes.aiReplies")}
              used={usage.aiReplies}
              limit={ent.limits?.aiReplies ?? plan.limits.aiReplies}
            />
            <Meter
              label={t("subscription.includes.stores")}
              used={usage.stores}
              limit={ent.limits ? ent.limits.stores : null}
            />
            <Meter
              label={t("subscription.includes.seats")}
              used={usage.seats}
              limit={ent.limits ? ent.limits.seats : null}
            />
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {ent.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-xs text-gray-300">
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {tp(`${feature}.label`)}
              </li>
            ))}
          </ul>
          {nextPlan && gained.length > 0 && !sub.cancelAtPeriodEnd && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-4 py-3">
              <p className="flex-1 text-xs text-gray-300">
                {t.rich(
                  "subscription.includes.upsell",
                  { b: (c) => <strong className="text-white">{c}</strong> },
                  {
                    plan: nextPlan.name,
                    features: gained.map((feature) => tp(`${feature}.label`)).join(", "),
                    stores: nextPlan.limits.stores ?? 0,
                  },
                )}
              </p>
              <button
                type="button"
                onClick={() => openChange(nextPlan.id, sub.interval)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"
              >
                {t("subscription.includes.viewUpgrade")}
              </button>
            </div>
          )}
        </section>
      )}

      <InvoicesList />

      {/* Ações secundárias */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/2 px-5 py-4">
        <div>
          <p className="text-sm text-gray-200">{t("subscription.billingDetails.title")}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("subscription.billingDetails.body")}</p>
        </div>
        <button
          type="button"
          onClick={() => run("portal", () => openBillingPortal("default"))}
          disabled={busy !== null}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-50"
        >
          {busy === "portal"
            ? t("subscription.billingDetails.opening")
            : t("subscription.billingDetails.open")}
        </button>
      </section>

      {!sub.cancelAtPeriodEnd && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            {t("subscription.cancel")}
          </button>
        </div>
      )}

      <ChangePlanDialog
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        summary={summary}
        initialPlan={changeTarget.plan}
        initialInterval={changeTarget.interval}
        onChanged={onRefresh}
      />
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        summary={summary}
        onCanceled={onRefresh}
        onSwitchPlan={(p, i) => {
          setCancelOpen(false);
          openChange(p, i);
        }}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-200">{value}</dd>
      {hint && <dd className="text-xs text-gray-500">{hint}</dd>}
    </div>
  );
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const f = useFormat();
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-amber-400" : "bg-indigo-500";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xs text-gray-300">
          {f.number(used)}
          <span className="text-gray-600"> / {limit === null ? "∞" : f.number(limit)}</span>
        </p>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/6 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${limit ? pct : 4}%` }} />
      </div>
    </div>
  );
}
