import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getBillingConfig } from "@/lib/billing/config";
import { buildBillingSummary } from "@/lib/billing/http";
import { getT } from "@/lib/i18n/server";
import PaymentRecovery from "./PaymentRecovery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("billing");
  return { title: t("meta.payment") };
}
export const dynamic = "force-dynamic";

export default async function PagamentoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner) redirect("/perfil?tab=assinatura");
  if (!getBillingConfig().enabled) redirect("/perfil");

  const summary = await buildBillingSummary(ctx);
  return <PaymentRecovery initialSummary={summary} />;
}
