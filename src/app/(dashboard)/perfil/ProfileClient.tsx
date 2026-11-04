"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { PLANS, formatUsd, planPrice } from "@/lib/billing/plans";
import { STATUS_BADGE, TONE_CLASSES } from "@/lib/billing/ui";
import type { BillingSummary } from "@/lib/billing/http";
import { useBillingStatus } from "@/components/billing/useBillingStatus";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useFormat, useT } from "@/lib/i18n/client";
import SubscriptionPanel from "./SubscriptionPanel";

type Tab = "conta" | "assinatura";

export default function ProfileClient({
  email,
  isOwner,
  initialTab,
  initialSummary,
}: {
  email: string;
  isOwner: boolean;
  initialTab: Tab;
  initialSummary: BillingSummary | null;
}) {
  const t = useT("billing");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const { data: summary, refresh } = useBillingStatus(initialSummary);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace(next === "assinatura" ? "/perfil?tab=assinatura" : "/perfil", {
      scroll: false,
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "conta", label: t("profile.tabs.account") },
    {
      id: "assinatura",
      label: isOwner ? t("profile.tabs.subscription") : t("profile.tabs.memberPlan"),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">{t("profile.title")}</h1>
        <p className="text-xs text-gray-500 mt-1">
          {isOwner ? t("profile.subtitleOwner") : t("profile.subtitleMember")}
        </p>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-white/6 mb-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => selectTab(item.id)}
            className={`-mb-px px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === item.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "conta" ? (
        <AccountTab email={email} isOwner={isOwner} />
      ) : !summary || !summary.enabled ? (
        <div className="rounded-xl border border-white/6 bg-white/3 px-6 py-10 text-center">
          <p className="text-sm text-gray-300">{t("profile.disabledTitle")}</p>
          <p className="text-xs text-gray-500 mt-1">{t("profile.disabledBody")}</p>
        </div>
      ) : isOwner ? (
        <SubscriptionPanel summary={summary} onRefresh={refresh} />
      ) : (
        <MemberPlanInfo summary={summary} />
      )}
    </div>
  );
}

function AccountTab({ email, isOwner }: { email: string; isOwner: boolean }) {
  const t = useT("billing");
  const tc = useT("common");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function resetPassword() {
    setSending(true);
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      toast.success(t("profile.account.resetSent", { email }));
    } catch {
      toast.error(t("profile.account.resetFailed"));
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/6 bg-gray-900/60 divide-y divide-white/4">
        <Field label={t("profile.account.email")} value={email} />
        <Field
          label={t("profile.account.role")}
          value={isOwner ? t("profile.account.roleOwner") : t("profile.account.roleMember")}
          hint={
            isOwner ? t("profile.account.roleOwnerHint") : t("profile.account.roleMemberHint")
          }
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm text-gray-200">{tc("language.label")}</p>
            <p className="text-xs text-gray-500 mt-0.5">{tc("language.description")}</p>
          </div>
          <LanguageSwitcher variant="dashboard" showLabel align="right" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm text-gray-200">{t("profile.account.password")}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t("profile.account.passwordHint")}</p>
          </div>
          <button
            type="button"
            onClick={resetPassword}
            disabled={sending}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-50"
          >
            {sending ? tc("actions.sending") : t("profile.account.resetPassword")}
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={logout}
        className="text-xs text-gray-500 hover:text-gray-200"
      >
        {t("profile.account.logout")}
      </button>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-200 mt-0.5 break-all">{value}</p>
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function MemberPlanInfo({ summary }: { summary: BillingSummary }) {
  const t = useT("billing");
  const f = useFormat();
  const { entitlement: ent, subscription: sub } = summary;
  const badge = STATUS_BADGE[ent.reason];
  const plan = sub.plan ? PLANS[sub.plan] : null;
  return (
    <section className="rounded-xl border border-white/6 bg-gray-900/60 p-5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-white">
          {plan ? t("shared.planName", { plan: plan.name }) : t("profile.member.accountPlan")}
        </p>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[badge.tone].badge}`}>
          {t(`status.${ent.reason}`)}
        </span>
      </div>
      {plan && sub.interval && (
        <p className="text-xs text-gray-500 mt-1">
          {sub.currentPeriodEnd
            ? t("profile.member.renews", {
                price: t("shared.pricePer", {
                  price: formatUsd(planPrice(plan.id, sub.interval)),
                  interval: sub.interval,
                }),
                date: f.date(sub.currentPeriodEnd),
              })
            : t("shared.pricePer", {
                price: formatUsd(planPrice(plan.id, sub.interval)),
                interval: sub.interval,
              })}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-3">
        {t("profile.member.info")}
      </p>
      <Link href="/dashboard" className="inline-block mt-4 text-xs text-indigo-400 hover:text-indigo-300">
        {t("profile.member.backToDashboard")}
      </Link>
    </section>
  );
}
