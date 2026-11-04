import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { isPermission } from "@/lib/auth/permissions";
import { getBillingConfig } from "@/lib/billing/config";
import { buildBillingSummary } from "@/lib/billing/http";
import { getT } from "@/lib/i18n/server";
import PlansClient from "./PlansClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("billing");
  return { title: t("meta.plans") };
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; plano?: string; periodo?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner) redirect("/sem-acesso?motivo=assinatura");

  const params = await searchParams;
  const enabled = getBillingConfig().enabled;
  const summary = enabled ? await buildBillingSummary(ctx) : null;

  return (
    <PlansClient
      email={ctx.email}
      summary={summary}
      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null}
      upgradeFeature={isPermission(params.upgrade) ? params.upgrade : null}
      initialPlan={params.plano ?? null}
      initialInterval={params.periodo ?? null}
    />
  );
}
