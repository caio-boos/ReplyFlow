"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  PLANS,
  PLAN_LIST,
  TRIAL_DAYS,
  formatUsd,
  planPrice,
} from "@/lib/billing/plans";
import {
  TONE_CLASSES,
  cardExpiresAt,
  daysUntil,
  postJson,
  type Tone,
} from "@/lib/billing/ui";
import { useFormat, useT } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translator";
import { refreshBillingStatus, useBillingStatus } from "./useBillingStatus";

type Format = ReturnType<typeof useFormat>;

interface BannerSpec {
  id: string;
  tone: Tone;
  title: string;
  body?: string;
  cta?: { label: string; href?: string; action?: "reactivate" };
  dismissible?: boolean;
}

const DISMISS_KEY = "replyflow.billing-banner.dismissed";

export default function BillingBanner() {
  const pathname = usePathname();
  const t = useT("billing");
  const tc = useT("common");
  const f = useFormat();
  const { data } = useBillingStatus();
  const [dismissed, setDismissed] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem(DISMISS_KEY),
  );
  const [busy, setBusy] = useState(false);

  if (!data?.enabled || pathname.startsWith("/perfil")) return null;

  const spec = buildBanner(data, t, f);
  if (!spec || (spec.dismissible && dismissed === spec.id)) return null;

  const tone = TONE_CLASSES[spec.tone];

  async function reactivate() {
    setBusy(true);
    try {
      const res = await postJson<{ needsCheckout: boolean }>("/api/billing/reactivate");
      if (res.needsCheckout) {
        window.location.href = "/planos";
        return;
      }
      toast.success(t("banner.reactivated"));
      await refreshBillingStatus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 md:px-6 pt-4">
      <div
        role="status"
        className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-3 ${tone.panel}`}
      >
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${tone.text}`}>{spec.title}</p>
          {spec.body && <p className="text-xs text-gray-400 mt-0.5">{spec.body}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {spec.cta &&
            data.isOwner &&
            (spec.cta.href ? (
              <Link
                href={spec.cta.href}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                {spec.cta.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={reactivate}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                {busy ? t("banner.reactivating") : spec.cta.label}
              </button>
            ))}
          {spec.cta && !data.isOwner && (
            <span className="text-[11px] text-gray-500">{t("banner.askOwner")}</span>
          )}
          {spec.dismissible && (
            <button
              type="button"
              aria-label={tc("actions.dismiss")}
              onClick={() => {
                sessionStorage.setItem(DISMISS_KEY, spec.id);
                setDismissed(spec.id);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildBanner(
  data: NonNullable<ReturnType<typeof useBillingStatus>["data"]>,
  t: Translator<"billing">,
  f: Format,
): BannerSpec | null {
  const { entitlement: ent, subscription: sub, usage } = data;
  const plan = sub.plan ? PLANS[sub.plan] : null;
  const amount =
    sub.plan && sub.interval ? formatUsd(planPrice(sub.plan, sub.interval)) : null;
  const card = sub.paymentMethod;

  switch (ent.reason) {
    case "legacy": {
      if (sub.id) break;
      const days = daysUntil(ent.legacyUntil);
      const date = f.date(ent.legacyUntil);
      return {
        id: `legacy-${ent.legacyUntil}`,
        tone: "indigo",
        title:
          days !== null
            ? t("banner.legacy.titleWithDays", { date, days })
            : t("banner.legacy.title", { date }),
        body: t("banner.legacy.body", { count: TRIAL_DAYS }),
        cta: { label: t("banner.legacy.cta"), href: "/planos" },
        dismissible: true,
      };
    }
    case "trialing": {
      const days = daysUntil(sub.trialEnd);
      if (days === null || days > 7) break;
      const values = {
        date: f.date(sub.trialEnd),
        amount: amount ?? t("banner.trial.planPrice"),
        plan: plan?.name ?? "",
      };
      return {
        id: `trial-${sub.trialEnd}`,
        tone: days <= 3 ? "amber" : "emerald",
        title:
          days === 0 ? t("banner.trial.titleToday") : t("banner.trial.title", { days }),
        body: card
          ? t("banner.trial.bodyWithCard", { ...values, last4: card.last4 })
          : t("banner.trial.body", values),
        cta: { label: t("banner.trial.cta"), href: "/perfil?tab=assinatura" },
        dismissible: true,
      };
    }
    case "cancel_scheduled":
      return {
        id: "cancel",
        tone: "amber",
        title: t("banner.cancel.title", { date: f.date(ent.accessUntil) }),
        body: t("banner.cancel.body"),
        cta: { label: t("banner.cancel.cta"), action: "reactivate" },
      };
    case "payment_grace": {
      const due = amount ?? t("banner.grace.yourSubscription");
      return {
        id: "grace",
        tone: "red",
        title: card
          ? t("banner.grace.titleWithCard", { amount: due, last4: card.last4 })
          : t("banner.grace.title", { amount: due }),
        body: t("banner.grace.body", { date: f.date(ent.graceEndsAt) }),
        cta: { label: t("banner.grace.cta"), href: "/perfil/pagamento" },
      };
    }
    case "payment_failed":
    case "trial_unpaid":
      return {
        id: "failed",
        tone: "red",
        title: t("banner.failed.title"),
        body: t("banner.failed.body"),
        cta: { label: t("banner.failed.cta"), href: "/perfil/pagamento" },
      };
    case "canceled":
    case "legacy_expired":
    case "paused":
      return {
        id: "inactive",
        tone: "red",
        title: t("banner.inactive.title"),
        body: t("banner.inactive.body"),
        cta: { label: t("banner.inactive.cta"), href: "/planos" },
      };
  }

  if (card && sub.id && ent.mode === "full") {
    const nextCharge = sub.cancelAtPeriodEnd ? null : (sub.trialEnd ?? sub.currentPeriodEnd);
    if (nextCharge && cardExpiresAt(card.expMonth, card.expYear) < nextCharge) {
      return {
        id: `card-${card.last4}-${card.expYear}`,
        tone: "amber",
        title: t("banner.cardExpiring.title", { last4: card.last4, date: f.date(nextCharge) }),
        body: t("banner.cardExpiring.body"),
        cta: { label: t("banner.cardExpiring.cta"), href: "/perfil?tab=assinatura" },
        dismissible: true,
      };
    }
  }

  if (ent.limits && ent.plan && usage.aiReplies >= ent.limits.aiReplies * 0.9) {
    const next = PLAN_LIST.find((p) => p.rank === PLANS[ent.plan!].rank + 1);
    return {
      id: `usage-${ent.plan}-${new Date().getUTCMonth()}`,
      tone: "indigo",
      title: t("banner.usage.title", { used: usage.aiReplies, limit: ent.limits.aiReplies }),
      body: next
        ? t("banner.usage.bodyNext", { plan: next.name, replies: next.limits.aiReplies })
        : t("banner.usage.body"),
      cta: next
        ? { label: t("banner.usage.cta", { plan: next.name }), href: "/perfil?tab=assinatura" }
        : undefined,
      dismissible: true,
    };
  }

  return null;
}
