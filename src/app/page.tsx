import type { Metadata } from "next";
import { LOCALE_META } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import { SITE_NAME } from "@/lib/site";
import LandingPage from "./LandingPage";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("landing"), getLocale()]);
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: SITE_NAME,
      title,
      description,
      locale: LOCALE_META[locale].intl.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Page() {
  return <LandingPage />;
}
