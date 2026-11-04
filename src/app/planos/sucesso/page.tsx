import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { confirmCheckoutSession } from "@/lib/billing/service";
import { PLANS, formatUsd, planPrice } from "@/lib/billing/plans";
import { cardBrandLabel } from "@/lib/billing/ui";
import { getFormat, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("billing");
  return { title: t("meta.success") };
}
export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner) redirect("/dashboard");

  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect("/planos");

  let result: Awaited<ReturnType<typeof confirmCheckoutSession>> | null = null;
  let failed = false;
  try {
    result = await confirmCheckoutSession(ctx.uid, sessionId);
  } catch (err) {
    console.error("[planos/sucesso] confirm failed", err);
    failed = true;
  }

  // Sessão aberta = o usuário voltou sem concluir (ex.: autenticação 3DS cancelada).
  if (result?.status === "open") redirect("/planos");

  const record = result?.record;
  const plan = record?.plan ? PLANS[record.plan] : null;
  const interval = record?.interval ?? "month";
  const price = plan ? planPrice(plan.id, interval) : null;
  const inTrial = record?.status === "trialing";
  const [t, f] = await Promise.all([getT("billing"), getFormat()]);
  const bold = { b: (c: React.ReactNode) => <strong className="text-white">{c}</strong> };

  const storesSnap = await getAdminDb()
    .collection("accounts")
    .where("userId", "==", ctx.uid)
    .limit(1)
    .get()
    .catch(() => null);
  const hasStore = !!storesSnap && !storesSnap.empty;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
      <header className="relative max-w-3xl w-full mx-auto px-5 h-16 flex items-center">
        <Image
          src="/images/logo-com-texto-branco-simples.png"
          alt="ReplyFlow"
          width={120}
          height={28}
          className="h-6 w-auto object-contain"
          priority
        />
      </header>

      <main className="relative flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          {failed || !plan ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center">
              <h1 className="text-xl font-bold">{t("success.pendingTitle")}</h1>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                {t("success.pendingBody")}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/planos/sucesso?session_id=${encodeURIComponent(sessionId)}`}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-semibold"
                >
                  {t("success.refresh")}
                </Link>
                <Link href="/perfil?tab=assinatura" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5">
                  {t("shared.viewSubscription")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-5 text-2xl font-black text-center tracking-tight">
                {inTrial ? t("success.trialStarted") : t("success.activated")}
              </h1>
              <p className="mt-2 text-sm text-zinc-400 text-center">
                {t.rich("success.planUnlocked", bold, { plan: plan.name })}
              </p>

              <dl className="mt-7 space-y-3 rounded-xl border border-white/8 bg-zinc-950/60 p-5 text-sm">
                {inTrial && (
                  <Row label={t("success.trialUntil")} value={f.date(record?.trialEnd)} />
                )}
                <Row
                  label={inTrial ? t("shared.firstCharge") : t("shared.nextCharge")}
                  value={t("shared.amountOnDate", {
                    amount: price !== null ? formatUsd(price, { cents: true }) : "—",
                    date: f.date(inTrial ? record?.trialEnd : record?.currentPeriodEnd),
                  })}
                />
                <Row label={t("shared.renewal")} value={t("shared.renewalValue", { interval })} />
                {record?.paymentMethod && (
                  <Row
                    label={t("success.card")}
                    value={`${cardBrandLabel(record.paymentMethod.brand)} •••• ${record.paymentMethod.last4}`}
                  />
                )}
              </dl>

              <p className="mt-4 text-xs text-zinc-500 text-center leading-relaxed">
                {inTrial
                  ? t("success.trialNote", { date: f.date(record?.trialEnd) })
                  : t("success.activeNote")}
              </p>

              <div className="mt-7 flex flex-col gap-3">
                <Link
                  href={hasStore ? "/dashboard" : "/accounts"}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-semibold text-center shadow-lg shadow-emerald-500/20 transition-colors"
                >
                  {hasStore ? t("success.goToDashboard") : t("success.connectStore")}
                </Link>
                <Link
                  href="/perfil?tab=assinatura"
                  className="text-center text-xs text-zinc-500 hover:text-white"
                >
                  {t("success.viewDetails")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-100">{value}</dd>
    </div>
  );
}
