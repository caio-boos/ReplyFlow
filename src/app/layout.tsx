import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LOCALE_META } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getMessages, getT } from "@/lib/i18n/server";
import { PUBLIC_NAMESPACES } from "@/lib/i18n/types";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("landing");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/**
 * O Google Tradutor do navegador move os nós de texto do DOM (envolve tudo em
 * <font>). Quando o React tenta remover/inserir os nós originais, lança
 * "NotFoundError: removeChild/insertBefore on Node" e derruba o app inteiro.
 * Este patch torna essas operações tolerantes, permitindo usar a tradução da
 * página sem crashes (workaround conhecido do facebook/react#11538).
 */
const GOOGLE_TRANSLATE_DOM_PATCH = `
(function () {
  if (typeof Node !== "function" || !Node.prototype) return;
  var originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };
  var originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null);
    }
    return originalInsertBefore.apply(this, arguments);
  };
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={LOCALE_META[locale].intl} className={`${geist.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_TRANSLATE_DOM_PATCH }} />
      </head>
      <body className="min-h-full bg-gray-950 text-gray-100 flex flex-col">
        <I18nProvider locale={locale} messages={getMessages(locale, PUBLIC_NAMESPACES)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
