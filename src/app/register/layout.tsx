import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return {
    title: t("meta.register"),
    alternates: { canonical: "/register" },
  };
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
