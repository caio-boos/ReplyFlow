import { RemarketingTemplateConfig } from "@/lib/types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Converts inline markdown to HTML:
 * - [label](url) → styled anchor
 * - **bold** → <strong>
 */
function parseInline(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      (_, label, url) =>
        `<a href="${url}" style="color:#2563eb;text-decoration:none;font-weight:500;border-bottom:1px solid #bfdbfe">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export interface RemarketingEmailItem {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  currency: string;
}

export interface RemarketingEmailData {
  customerName: string;
  storeName: string;
  items: RemarketingEmailItem[];
  totalPrice: number;
  currency: string;
  discountPercent: number;
  checkoutUrl: string;
  language?: string;
}

const REMARKETING_TRANSLATIONS = {
  "pt-BR": {
    greeting: (name: string) => `Olá, ${name}!`,
    body: (store: string) =>
      `Você deixou alguns itens no seu carrinho em <strong>${escapeHtml(store)}</strong>. Preparamos uma oferta exclusiva para você finalizar sua compra:`,
    cartTitle: "Seu carrinho",
    qty: "Qtd.",
    totalLabel: "Total",
    discountBanner: (pct: number) =>
      `🎁 Desconto de <strong>${pct}%</strong> aplicado automaticamente no link abaixo`,
    button: (pct: number) => `Finalizar compra com ${pct}% de desconto →`,
    footer: (store: string) =>
      `Dúvidas? Responda este e-mail que te ajudamos. — ${escapeHtml(store)}`,
    validNote: "Oferta válida por 48 horas.",
  },
  en: {
    greeting: (name: string) => `Hi, ${name}!`,
    body: (store: string) =>
      `You left some items in your cart at <strong>${escapeHtml(store)}</strong>. We've prepared an exclusive offer to help you complete your purchase:`,
    cartTitle: "Your cart",
    qty: "Qty.",
    totalLabel: "Total",
    discountBanner: (pct: number) =>
      `🎁 <strong>${pct}% discount</strong> applied automatically via the link below`,
    button: (pct: number) => `Complete purchase with ${pct}% off →`,
    footer: (store: string) =>
      `Questions? Just reply to this email. — ${escapeHtml(store)}`,
    validNote: "Offer valid for 48 hours.",
  },
  es: {
    greeting: (name: string) => `¡Hola, ${name}!`,
    body: (store: string) =>
      `Dejaste algunos artículos en tu carrito en <strong>${escapeHtml(store)}</strong>. Preparamos una oferta exclusiva para que completes tu compra:`,
    cartTitle: "Tu carrito",
    qty: "Cant.",
    totalLabel: "Total",
    discountBanner: (pct: number) =>
      `🎁 Descuento del <strong>${pct}%</strong> aplicado automáticamente en el enlace`,
    button: (pct: number) => `Completar compra con ${pct}% de descuento →`,
    footer: (store: string) =>
      `¿Preguntas? Responde este correo. — ${escapeHtml(store)}`,
    validNote: "Oferta válida por 48 horas.",
  },
  ja: {
    greeting: (name: string) => `${name}様、こんにちは！`,
    body: (store: string) =>
      `<strong>${escapeHtml(store)}</strong>のカートに商品が残っています。ご購入を完了していただくための特別オファーをご用意しました：`,
    cartTitle: "カートの商品",
    qty: "数量",
    totalLabel: "合計",
    discountBanner: (pct: number) =>
      `🎁 以下のリンクから<strong>${pct}%割引</strong>が自動的に適用されます`,
    button: (pct: number) => `${pct}%割引で購入を完了する →`,
    footer: (store: string) =>
      `ご質問はこのメールに返信ください。— ${escapeHtml(store)}`,
    validNote: "オファーは48時間有効です。",
  },
  fr: {
    greeting: (name: string) => `Bonjour, ${name} !`,
    body: (store: string) =>
      `Vous avez laissé des articles dans votre panier chez <strong>${escapeHtml(store)}</strong>. Nous avons préparé une offre exclusive pour vous aider à finaliser votre achat :`,
    cartTitle: "Votre panier",
    qty: "Qté",
    totalLabel: "Total",
    discountBanner: (pct: number) =>
      `🎁 <strong>${pct}% de réduction</strong> appliquée automatiquement via le lien ci-dessous`,
    button: (pct: number) => `Finaliser l'achat avec ${pct}% de réduction →`,
    footer: (store: string) =>
      `Des questions ? Répondez simplement à cet e-mail. — ${escapeHtml(store)}`,
    validNote: "Offre valable 48 heures.",
  },
  de: {
    greeting: (name: string) => `Hallo, ${name}!`,
    body: (store: string) =>
      `Du hast einige Artikel in deinem Warenkorb bei <strong>${escapeHtml(store)}</strong> gelassen. Wir haben ein exklusives Angebot für dich vorbereitet:`,
    cartTitle: "Dein Warenkorb",
    qty: "Menge",
    totalLabel: "Gesamt",
    discountBanner: (pct: number) =>
      `🎁 <strong>${pct}% Rabatt</strong> wird automatisch über den Link unten angewendet`,
    button: (pct: number) => `Kauf mit ${pct}% Rabatt abschließen →`,
    footer: (store: string) =>
      `Fragen? Antworte einfach auf diese E-Mail. — ${escapeHtml(store)}`,
    validNote: "Angebot 48 Stunden gültig.",
  },
  it: {
    greeting: (name: string) => `Ciao, ${name}!`,
    body: (store: string) =>
      `Hai lasciato alcuni articoli nel tuo carrello su <strong>${escapeHtml(store)}</strong>. Abbiamo preparato un'offerta esclusiva per aiutarti a completare l'acquisto:`,
    cartTitle: "Il tuo carrello",
    qty: "Qtà",
    totalLabel: "Totale",
    discountBanner: (pct: number) =>
      `🎁 <strong>Sconto del ${pct}%</strong> applicato automaticamente tramite il link sottostante`,
    button: (pct: number) => `Completa l'acquisto con il ${pct}% di sconto →`,
    footer: (store: string) =>
      `Domande? Rispondi a questa email. — ${escapeHtml(store)}`,
    validNote: "Offerta valida per 48 ore.",
  },
  nl: {
    greeting: (name: string) => `Hallo, ${name}!`,
    body: (store: string) =>
      `Je hebt enkele artikelen achtergelaten in je winkelwagen bij <strong>${escapeHtml(store)}</strong>. We hebben een exclusieve aanbieding voor je voorbereid:`,
    cartTitle: "Jouw winkelwagen",
    qty: "Aantal",
    totalLabel: "Totaal",
    discountBanner: (pct: number) =>
      `🎁 <strong>${pct}% korting</strong> automatisch toegepast via onderstaande link`,
    button: (pct: number) => `Aankoop afronden met ${pct}% korting →`,
    footer: (store: string) =>
      `Vragen? Reageer gewoon op deze e-mail. — ${escapeHtml(store)}`,
    validNote: "Aanbieding 48 uur geldig.",
  },
  zh: {
    greeting: (name: string) => `你好，${name}！`,
    body: (store: string) =>
      `您在 <strong>${escapeHtml(store)}</strong> 的购物车中留有商品。我们为您准备了专属优惠，帮助您完成购买：`,
    cartTitle: "您的购物车",
    qty: "数量",
    totalLabel: "总计",
    discountBanner: (pct: number) =>
      `🎁 通过以下链接自动享受 <strong>${pct}% 折扣</strong>`,
    button: (pct: number) => `以 ${pct}% 折扣完成购买 →`,
    footer: (store: string) =>
      `有疑问？直接回复此邮件即可。— ${escapeHtml(store)}`,
    validNote: "优惠有效期 48 小时。",
  },
} as const;

function resolveLanguage(lang?: string): keyof typeof REMARKETING_TRANSLATIONS {
  if (!lang) return "pt-BR";
  const l = lang.toLowerCase();
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  if (l.startsWith("ja")) return "ja";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("de")) return "de";
  if (l.startsWith("it")) return "it";
  if (l.startsWith("nl")) return "nl";
  if (l.startsWith("zh")) return "zh";
  return "pt-BR";
}

export function renderRemarketingEmailHtml(
  data: RemarketingEmailData,
  customTemplate?: RemarketingTemplateConfig,
): string {
  const t = REMARKETING_TRANSLATIONS[resolveLanguage(data.language)];

  // Cores do template (usa custom ou defaults)
  const colors = customTemplate
    ? {
        primary: customTemplate.primaryColor,
        accent: customTemplate.accentColor,
        background: customTemplate.backgroundColor,
        text: customTemplate.textColor,
        border: customTemplate.borderColor,
        buttonBg: customTemplate.buttonColor,
        buttonText: customTemplate.buttonTextColor,
        buttonRadius: customTemplate.buttonBorderRadius,
        bannerBg: customTemplate.bannerBackgroundColor,
        bannerBorder: customTemplate.bannerBorderColor,
        bannerText: customTemplate.bannerTextColor,
        footerBg: customTemplate.footerBackgroundColor,
        footerText: customTemplate.footerTextColor,
      }
    : {
        primary: "#1d4ed8",
        accent: "#fbbf24",
        background: "#f3f4f6",
        text: "#111827",
        border: "#e5e7eb",
        buttonBg: "#1d4ed8",
        buttonText: "#ffffff",
        buttonRadius: "6px",
        bannerBg: "#fffbeb",
        bannerBorder: "#fbbf24",
        bannerText: "#92400e",
        footerBg: "#f9fafb",
        footerText: "#9ca3af",
      };

  const itemsHtml = data.items
    .map((item) => {
      const imgCell = item.imageUrl
        ? `<td width="80" valign="top" style="padding-right:14px">
            <img src="${item.imageUrl}" width="72" height="72" alt="${escapeHtml(item.title)}"
              style="border-radius:6px;border:1px solid #e5e7eb;display:block;object-fit:cover" />
          </td>`
        : "";
      const contentWidth = item.imageUrl ? "" : ` colspan="2"`;
      return `
        <tr>
          <td style="padding-bottom:14px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${imgCell}
                <td${contentWidth} valign="middle">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#111827;line-height:1.4">
                    ${escapeHtml(item.title)}
                  </p>
                  <p style="margin:0;font-size:13px;color:#6b7280">
                    ${t.qty} ${item.quantity} &nbsp;·&nbsp; ${item.currency} ${item.price.toFixed(2)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const totalFormatted = data.totalPrice.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

  return `<!DOCTYPE html>
<html lang="${resolveLanguage(data.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${colors.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${colors.background};padding:40px 16px;min-width:320px">
    <tr>
      <td align="center" valign="top">

        <!-- Card -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"
          style="max-width:580px;width:100%;background-color:#ffffff;border-radius:6px;
                 border:1px solid ${colors.border};overflow:hidden">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background-color:${colors.primary};font-size:0;line-height:0">&nbsp;</td>
          </tr>

          <!-- Greeting + body -->
          <tr>
            <td style="padding:36px 48px 24px 48px">
              <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:${colors.text};line-height:1.3">
                ${customTemplate?.customGreeting ? customTemplate.customGreeting.replace("{{name}}", escapeHtml(data.customerName)) : t.greeting(escapeHtml(data.customerName))}
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#374151">
                ${customTemplate?.customBody ? customTemplate.customBody.replace("{{store}}", escapeHtml(data.storeName)) : t.body(data.storeName)}
              </p>

              <!-- Cart title -->
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">
                ${t.cartTitle}
              </p>

              <!-- Items -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border:1px solid ${colors.border};border-radius:6px;padding:16px 16px 2px 16px;margin-bottom:20px">
                ${itemsHtml}
                <!-- Total row -->
                <tr>
                  <td style="border-top:1px solid ${colors.border};padding-top:12px;padding-bottom:14px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:14px;font-weight:600;color:${colors.text}">${t.totalLabel}</td>
                        <td align="right" style="font-size:15px;font-weight:700;color:${colors.text}">
                          ${data.currency} ${totalFormatted}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Discount banner -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:24px">
                <tr>
                  <td style="background-color:${colors.bannerBg};border:1px solid ${colors.bannerBorder};border-radius:6px;padding:12px 16px;text-align:center">
                    <p style="margin:0;font-size:14px;color:${colors.bannerText}">
                      ${t.discountBanner(data.discountPercent)}
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:${colors.bannerText}">${t.validNote}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:8px">
                <tr>
                  <td align="center">
                    <a href="${data.checkoutUrl}"
                      style="display:inline-block;background-color:${colors.buttonBg};color:${colors.buttonText};font-size:15px;font-weight:600;
                             padding:14px 32px;border-radius:${colors.buttonRadius};text-decoration:none;letter-spacing:0.01em;
                             mso-padding-alt:14px 32px">
                      ${customTemplate?.customButtonText ? customTemplate.customButtonText.replace("{{discount}}", data.discountPercent.toString()) : t.button(data.discountPercent)}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 48px 24px 48px;border-top:1px solid ${colors.border};background-color:${colors.footerBg}">
              <p style="margin:0;font-size:12px;color:${colors.footerText};line-height:1.5">
                ${t.footer(data.storeName)}
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailHtml(text: string, storeName: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((block) => {
      const lines = block.split("\n").map(parseInline).join("<br>");
      return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151">${lines}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f3f4f6;padding:40px 16px;min-width:320px">
    <tr>
      <td align="center" valign="top">

        <!-- Card -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"
          style="max-width:580px;width:100%;background-color:#ffffff;border-radius:6px;
                 border:1px solid #e5e7eb;overflow:hidden">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background-color:#1d4ed8;font-size:0;line-height:0">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 24px 48px">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider + footer -->
          <tr>
            <td style="padding:16px 48px 24px 48px;border-top:1px solid #e5e7eb;background-color:#f9fafb">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
                ${escapeHtml(storeName)}
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
