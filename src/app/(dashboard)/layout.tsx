import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthContext, PATHNAME_HEADER } from "@/lib/auth/session";
import {
  hasAccess,
  landingPathFor,
  requiredAccessFor,
} from "@/lib/auth/permissions";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  if (!ctx.isOwner) {
    if (ctx.permissions.length === 0) redirect("/sem-acesso");

    const pathname = (await headers()).get(PATHNAME_HEADER);
    if (pathname) {
      const requirement = requiredAccessFor(pathname);
      if (!hasAccess(requirement, ctx.isOwner, ctx.permissions)) {
        redirect(landingPathFor(ctx.permissions));
      }
    }
  }

  return (
    <DashboardShell isOwner={ctx.isOwner} permissions={ctx.permissions}>
      {children}
    </DashboardShell>
  );
}
