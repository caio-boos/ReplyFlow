import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReplyFlow",
  description: "AI-powered email auto-reply for e-commerce",
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_TRANSLATE_DOM_PATCH }} />
      </head>
      <body className="min-h-full bg-gray-950 text-gray-100 flex flex-col">{children}</body>
    </html>
  );
}
