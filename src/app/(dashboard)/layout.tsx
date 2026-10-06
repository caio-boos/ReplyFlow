import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isOwner && ctx.permissions.length === 0) redirect("/sem-acesso");

  return (
    <DashboardShell isOwner={ctx.isOwner} permissions={ctx.permissions}>
      {children}
    </DashboardShell>
  );
}
