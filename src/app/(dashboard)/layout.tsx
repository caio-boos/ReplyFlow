import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { ALL_PERMISSIONS } from "@/lib/auth/permissions";
import { getEntitlement } from "@/lib/billing/store";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { APP_NAMESPACES } from "@/lib/i18n/types";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner && ctx.permissions.length === 0) redirect("/sem-acesso");

  const [entitlement, locale] = await Promise.all([
    getEntitlement(ctx.uid).catch(() => null),
    getLocale(),
  ]);

  return (
    <I18nProvider locale={locale} messages={getMessages(locale, APP_NAMESPACES)}>
      <DashboardShell
        isOwner={ctx.isOwner}
        permissions={ctx.permissions}
        planFeatures={entitlement?.features ?? ALL_PERMISSIONS}
      >
        {children}
      </DashboardShell>
    </I18nProvider>
  );
}
