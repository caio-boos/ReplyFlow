import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return {
    title: t("meta.login"),
    alternates: { canonical: "/login" },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
