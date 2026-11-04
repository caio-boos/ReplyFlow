import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getBillingConfig } from "@/lib/billing/config";
import { buildBillingSummary } from "@/lib/billing/http";
import { getT } from "@/lib/i18n/server";
import ProfileClient from "./ProfileClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("billing");
  return { title: t("meta.profile") };
}
export const dynamic = "force-dynamic";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { tab } = await searchParams;
  const summary = getBillingConfig().enabled
    ? await buildBillingSummary(ctx).catch(() => null)
    : null;

  return (
    <ProfileClient
      email={ctx.email}
      isOwner={ctx.isOwner}
      initialTab={tab === "assinatura" ? "assinatura" : "conta"}
      initialSummary={summary}
    />
  );
}
