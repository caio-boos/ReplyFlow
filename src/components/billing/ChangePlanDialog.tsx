"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  PLANS,
  PLAN_LIST,
  formatUsd,
  planPrice,
  yearlySavings,
  yearlySavingsPercent,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import type { Permission } from "@/lib/auth/permissions";
import { postJson } from "@/lib/billing/ui";
import { useFormat, useT } from "@/lib/i18n/client";
import type { BillingSummary } from "@/lib/billing/http";
import type { ChangePreview } from "@/lib/billing/service";
import { refreshBillingStatus } from "./useBillingStatus";

interface Props {
  open: boolean;
  onClose: () => void;
  summary: BillingSummary;
  initialPlan?: PlanId | null;
  initialInterval?: BillingInterval | null;
  onChanged?: () => void;
}

export default function ChangePlanDialog(props: Props) {
  if (!props.open) return null;
  // Remonta a cada abertura: o estado sempre começa da seleção recebida.
  return (
    <DialogBody
      key={`${props.initialPlan ?? ""}-${props.initialInterval ?? ""}`}
      {...props}
    />
  );
}

type PreviewResult = { key: string; data: ChangePreview | null; error: string | null };

function DialogBody({
  onClose,
  summary,
  initialPlan,
  initialInterval,
  onChanged,
}: Props) {
  const t = useT("billing");
  const tc = useT("common");
  const current = summary.subscription;
  const [interval, setInterval] = useState<BillingInterval>(
    initialInterval ?? current.interval ?? "month",
  );
  const [selected, setSelected] = useState<PlanId | null>(initialPlan ?? null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSame = selected === current.plan && interval === current.interval;
  const requestKey = selected && !isSame ? `${selected}:${interval}` : null;
  const settled = result && result.key === requestKey ? result : null;
  const preview = settled?.data ?? null;
  const previewError = settled?.error ?? null;
  const loadingPreview = requestKey !== null && !settled;

  useEffect(() => {
    if (!requestKey || !selected) return;
    let cancelled = false;
    postJson<ChangePreview>("/api/billing/preview", { plan: selected, interval })
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setResult({ key: requestKey, data: null, error: (err as Error).message }),
      );
    return () => {
      cancelled = true;
    };
  }, [requestKey, selected, interval]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const lostFeatures =
    selected && current.plan
      ? PLANS[current.plan].features.filter((f) => !PLANS[selected].features.includes(f))
      : [];

  async function confirm() {
    if (!preview) return;
    setSubmitting(true);
    try {
      await postJson("/api/billing/change", {
        plan: preview.plan,
        interval: preview.interval,
        prorationDate: preview.prorationDate,
      });
      toast.success(t("change.success", { plan: PLANS[preview.plan].name }));
      await refreshBillingStatus();
      onChanged?.();
      onClose();
      // Recursos do plano são resolvidos no servidor — recarrega a navegação.
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
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
        aria-labelledby="change-plan-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-white/6">
          <div>
            <h2 id="change-plan-title" className="text-sm font-semibold text-white">
              {t("change.title")}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("change.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={tc("actions.close")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          <IntervalToggle value={interval} onChange={setInterval} />

          <div className="grid gap-2 sm:grid-cols-3">
            {PLAN_LIST.map((plan) => {
              const isCurrent = plan.id === current.plan && interval === current.interval;
              const isSelected = plan.id === selected;
              const tooSmall =
                (plan.limits.stores !== null && summary.usage.stores > plan.limits.stores) ||
                (plan.limits.seats !== null && summary.usage.seats > plan.limits.seats);
              return (
                <button
                  key={plan.id}
                  type="button"
                  disabled={isCurrent || tooSmall}
                  onClick={() => setSelected(plan.id)}
                  className={`relative text-left rounded-xl border p-4 transition-all disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/40"
                      : "border-white/8 bg-white/3 hover:border-white/12 hover:bg-white/5"
                  } ${tooSmall ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {t("change.current")}
                      </span>
                    )}
                    {!isCurrent && plan.recommended && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
                        {t("change.popular")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-bold text-white">
                    {formatUsd(planPrice(plan.id, interval))}
                    <span className="text-xs font-normal text-gray-500">
                      {t("shared.perInterval", { interval })}
                    </span>
                  </p>
                  {interval === "year" && (
                    <p className="text-[11px] text-emerald-400">
                      {t("change.yearlySavings", { amount: formatUsd(yearlySavings(plan.id)) })}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                    {t("shared.storesAndReplies", {
                      stores: plan.limits.stores ?? 0,
                      replies: plan.limits.aiReplies,
                    })}
                  </p>
                  {tooSmall && (
                    <p className="mt-2 text-[11px] text-amber-400">
                      {t("change.tooSmall")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              {loadingPreview ? (
                <div className="space-y-2">
                  <div className="h-3 w-2/3 rounded bg-white/6 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/6 animate-pulse" />
                  <div className="h-3 w-3/5 rounded bg-white/6 animate-pulse" />
                </div>
              ) : previewError ? (
                <p className="text-xs text-red-400">{previewError}</p>
              ) : preview ? (
                <PreviewDetails preview={preview} lostFeatures={lostFeatures} />
              ) : (
                <p className="text-xs text-gray-500">{t("change.selectDifferent")}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 sm:px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5"
          >
            {tc("actions.back")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!preview || submitting || loadingPreview}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {submitting
              ? t("change.processing")
              : preview && preview.dueNow > 0
                ? t("change.confirmPay", { amount: formatUsd(preview.dueNow, { cents: true }) })
                : t("change.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewDetails({
  preview,
  lostFeatures,
}: {
  preview: ChangePreview;
  lostFeatures: Permission[];
}) {
  const t = useT("billing");
  const tp = useT("permissions");
  const f = useFormat();
  const plan = PLANS[preview.plan];
  const planLabel = t("shared.planWithInterval", { plan: plan.name, interval: preview.interval });
  const bold = { b: (c: React.ReactNode) => <span className="font-semibold text-white">{c}</span> };
  return (
    <div className="space-y-3 text-xs">
      <p className="text-gray-300">
        {t.rich(
          preview.direction === "upgrade" ? "change.preview.upgradeTo" : "change.preview.changeTo",
          bold,
          { plan: planLabel },
        )}
      </p>
      <dl className="space-y-1.5">
        {preview.inTrial ? (
          <Row label={t("change.preview.dueNow")} value={t("change.preview.dueNowTrial")} />
        ) : (
          <Row
            label={t("change.preview.dueNow")}
            value={
              preview.dueNow > 0
                ? t("change.preview.dueNowProrated", {
                    amount: formatUsd(preview.dueNow, { cents: true }),
                  })
                : t("change.preview.nothing")
            }
          />
        )}
        {preview.credit > 0 && (
          <Row
            label={t("change.preview.credit")}
            value={formatUsd(preview.credit, { cents: true })}
          />
        )}
        <Row
          label={preview.inTrial ? t("shared.firstCharge") : t("shared.nextCharge")}
          value={t("change.preview.nextValue", {
            amount: formatUsd(preview.nextChargeAmount),
            date: f.date(preview.nextChargeDate),
            interval: preview.interval,
          })}
        />
      </dl>
      {lostFeatures.length > 0 && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-amber-400">
          {t("change.preview.lost", {
            features: lostFeatures.map((feature) => tp(`${feature}.label`)).join(", "),
          })}
        </p>
      )}
      {preview.direction === "upgrade" && !preview.inTrial && (
        <p className="text-gray-500">{t("change.preview.upgradeNote")}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200 sm:text-right">{value}</dd>
    </div>
  );
}

export function IntervalToggle({
  value,
  onChange,
  tone = "indigo",
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
  tone?: "indigo" | "emerald";
}) {
  const t = useT("billing");
  const active =
    tone === "emerald"
      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20";
  return (
    <div
      role="radiogroup"
      aria-label={t("change.cycleLabel")}
      className="inline-flex items-center rounded-xl border border-white/8 bg-white/3 p-1"
    >
      {(["month", "year"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === v ? active : "text-gray-400 hover:text-white"
          }`}
        >
          {t(`shared.interval.${v}`)}
          {v === "year" && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                value === v ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              −{yearlySavingsPercent("growth")}%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
