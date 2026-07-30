import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getAbandonedCheckouts } from "@/lib/shopify/client";
import { sendEmail } from "@/lib/email/smtp";
import { renderRemarketingEmailHtml } from "@/lib/email/html-template";
import { FieldValue } from "firebase-admin/firestore";

const COUPON_CODE = process.env.REMARKETING_COUPON_CODE ?? "CARRINHO20";
const DISCOUNT_PERCENT = 20;
const MIN_ABANDON_HOURS = 1;
const MAX_ABANDON_HOURS = 72;

/** Appends ?discount=CODE (or &discount=CODE) to the Shopify recovery URL */
function buildCheckoutUrl(url: string, coupon: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}discount=${encodeURIComponent(coupon)}`;
}

/** Plain-text fallback for the remarketing email */
function buildPlainText(
  customerName: string,
  storeName: string,
  items: Array<{ title: string; quantity: number; price: number; currency: string }>,
  totalPrice: number,
  currency: string,
  discountPercent: number,
  checkoutUrl: string,
  language?: string,
): string {
  const lang = (language ?? "pt-BR").toLowerCase();
  const itemsList = items.map((i) => `• ${i.quantity}x ${i.title} — ${i.currency} ${i.price.toFixed(2)}`).join("\n");

  if (lang.startsWith("en"))
    return `Hi, ${customerName}!\n\nYou left some items in your cart at ${storeName}.\n\nYour cart:\n${itemsList}\n\nTotal: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% discount applied automatically:\n${checkoutUrl}\n\nOffer valid for 48 hours. Questions? Just reply to this email.\n\n— ${storeName}`;

  if (lang.startsWith("es"))
    return `¡Hola, ${customerName}!\n\nDejaste algunos artículos en tu carrito en ${storeName}.\n\nTu carrito:\n${itemsList}\n\nTotal: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 Descuento del ${discountPercent}% aplicado automáticamente:\n${checkoutUrl}\n\nOferta válida por 48 horas. ¿Preguntas? Responde este correo.\n\n— ${storeName}`;

  if (lang.startsWith("ja"))
    return `${customerName}様、こんにちは！\n\n${storeName}のカートに商品が残っています。\n\nカートの商品：\n${itemsList}\n\n合計: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}%割引が自動適用されます：\n${checkoutUrl}\n\nオファーは48時間有効です。ご質問はこのメールに返信ください。\n\n— ${storeName}`;

  if (lang.startsWith("fr"))
    return `Bonjour, ${customerName} !\n\nVous avez laissé des articles dans votre panier chez ${storeName}.\n\nVotre panier :\n${itemsList}\n\nTotal : ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% de réduction appliquée automatiquement :\n${checkoutUrl}\n\nOffre valable 48 heures. Des questions ? Répondez à cet e-mail.\n\n— ${storeName}`;

  if (lang.startsWith("de"))
    return `Hallo, ${customerName}!\n\nDu hast Artikel in deinem Warenkorb bei ${storeName} gelassen.\n\nDein Warenkorb:\n${itemsList}\n\nGesamt: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% Rabatt automatisch angewendet:\n${checkoutUrl}\n\nAngebot 48 Stunden gültig. Fragen? Antworte auf diese E-Mail.\n\n— ${storeName}`;

  if (lang.startsWith("it"))
    return `Ciao, ${customerName}!\n\nHai lasciato articoli nel carrello su ${storeName}.\n\nIl tuo carrello:\n${itemsList}\n\nTotale: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 Sconto del ${discountPercent}% applicato automaticamente:\n${checkoutUrl}\n\nOfferta valida 48 ore. Domande? Rispondi a questa email.\n\n— ${storeName}`;

  if (lang.startsWith("nl"))
    return `Hallo, ${customerName}!\n\nJe hebt artikelen achtergelaten in je winkelwagen bij ${storeName}.\n\nJouw winkelwagen:\n${itemsList}\n\nTotaal: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% korting automatisch toegepast:\n${checkoutUrl}\n\nAanbieding 48 uur geldig. Vragen? Reageer op deze e-mail.\n\n— ${storeName}`;

  if (lang.startsWith("zh"))
    return `你好，${customerName}！\n\n您在 ${storeName} 的购物车中留有商品。\n\n您的购物车：\n${itemsList}\n\n总计：${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% 折扣自动适用：\n${checkoutUrl}\n\n优惠有效期 48 小时。有疑问？回复此邮件即可。\n\n— ${storeName}`;

  // default: pt-BR
  return `Olá, ${customerName}!\n\nVocê deixou alguns itens no seu carrinho em ${storeName}.\n\nSeu carrinho:\n${itemsList}\n\nTotal: ${currency} ${totalPrice.toFixed(2)}\n\n🎁 ${discountPercent}% de desconto aplicado automaticamente no link abaixo:\n${checkoutUrl}\n\nOferta válida por 48 horas. Dúvidas? Responda este e-mail.\n\n— ${storeName}`;
}

/** Subject line per language */
function buildSubject(discountPercent: number, language?: string): string {
  const lang = (language ?? "pt-BR").toLowerCase();
  if (lang.startsWith("en")) return `You left something behind — ${discountPercent}% off just for you!`;
  if (lang.startsWith("es")) return `¡Olvidaste algo! Descuento de ${discountPercent}% esperándote`;
  if (lang.startsWith("ja")) return `カートに商品が残っています — ${discountPercent}%割引の特別オファー`;
  if (lang.startsWith("fr")) return `Vous avez oublié quelque chose — ${discountPercent}% de réduction rien que pour vous !`;
  if (lang.startsWith("de")) return `Du hast etwas vergessen — ${discountPercent}% Rabatt nur für dich!`;
  if (lang.startsWith("it")) return `Hai dimenticato qualcosa — ${discountPercent}% di sconto solo per te!`;
  if (lang.startsWith("nl")) return `Je hebt iets achtergelaten — ${discountPercent}% korting speciaal voor jou!`;
  if (lang.startsWith("zh")) return `您的购物车在等待您 — 专属${discountPercent}%折扣`;
  return `Você esqueceu alguns itens no carrinho — ${discountPercent}% de desconto para você!`;
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  try {
    const body = await req.json();
    force = body?.force === true;
  } catch {
    // no body — scheduled cron
  }

  const db = getAdminDb();
  const accountsSnap = await db
    .collection("accounts")
    .where("active", "==", true)
    .get();

  if (accountsSnap.empty) {
    return NextResponse.json({ message: "No active accounts", sent: 0 });
  }

  let totalSent = 0;
  const now = new Date();

  for (const accountDoc of accountsSnap.docs) {
    const data = accountDoc.data();

    if (!data.shopifyDomain || !data.encryptedShopifyToken) continue;
    if (!data.remarketingEnabled) continue;

    let shopifyToken: string;
    try {
      shopifyToken = decrypt(data.encryptedShopifyToken);
    } catch {
      console.error(`Failed to decrypt Shopify token for account ${accountDoc.id}`);
      continue;
    }

    let password: string;
    try {
      password = decrypt(data.encryptedPassword);
    } catch {
      console.error(`Failed to decrypt email password for account ${accountDoc.id}`);
      continue;
    }

    const since = new Date(now.getTime() - MAX_ABANDON_HOURS * 60 * 60 * 1000);

    let checkouts;
    try {
      checkouts = await getAbandonedCheckouts(data.shopifyDomain, shopifyToken, since);
    } catch (err) {
      console.error(`Failed to fetch abandoned checkouts for account ${accountDoc.id}:`, err);
      continue;
    }

    for (const checkout of checkouts) {
      const updatedAt = new Date(checkout.updatedAt);
      const hoursAgo = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
      if (!force && (hoursAgo < MIN_ABANDON_HOURS || hoursAgo > MAX_ABANDON_HOURS)) continue;

      // Deduplication: skip if already sent for this checkout token
      const existingSnap = await db
        .collection("remarketing")
        .where("checkoutId", "==", checkout.token)
        .where("accountId", "==", accountDoc.id)
        .limit(1)
        .get();

      if (!existingSnap.empty) continue;

      // Test mode: restrict to a list of specific email addresses (comma-separated)
      if (data.testEmail) {
        const allowed = (data.testEmail as string)
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (allowed.length > 0 && !allowed.includes(checkout.email.toLowerCase())) continue;
      }

      const storeName = (data.fantasyName as string | undefined) || (data.label as string) || data.shopifyDomain;
      const language = (data.replyLanguage as string | undefined) ?? "pt-BR";
      const checkoutUrl = buildCheckoutUrl(checkout.abandonedCheckoutUrl, COUPON_CODE);

      const emailItems = checkout.lineItems.map((item) => ({
        ...item,
        currency: checkout.currency,
      }));

      const emailHtml = renderRemarketingEmailHtml({
        customerName: checkout.customerName,
        storeName,
        items: emailItems,
        totalPrice: checkout.totalPrice,
        currency: checkout.currency,
        discountPercent: DISCOUNT_PERCENT,
        checkoutUrl,
        language,
      });

      const emailText = buildPlainText(
        checkout.customerName,
        storeName,
        emailItems,
        checkout.totalPrice,
        checkout.currency,
        DISCOUNT_PERCENT,
        checkoutUrl,
        language,
      );

      const subject = buildSubject(DISCOUNT_PERCENT, language);

      const remarketingRef = db.collection("remarketing").doc();

      const sanitizedLineItems = checkout.lineItems.map((item) => ({
        ...item,
        imageUrl: item.imageUrl ?? null,
      }));

      try {
        const sendResult = await sendEmail(
          {
            smtpHost: data.smtpHost,
            smtpPort: data.smtpPort,
            email: data.email,
            password,
          },
          {
            to: checkout.email,
            subject,
            text: emailText,
            html: emailHtml,
          },
        );

        await remarketingRef.set({
          accountId: accountDoc.id,
          shopDomain: data.shopifyDomain,
          checkoutId: checkout.token,
          customerEmail: checkout.email,
          customerName: checkout.customerName,
          cartValue: checkout.totalPrice,
          currency: checkout.currency,
          lineItems: sanitizedLineItems,
          abandonedCheckoutUrl: checkoutUrl,
          couponCode: COUPON_CODE,
          sentMessageId: sendResult.messageId,
          status: "sent",
          repliedEmailId: null,
          sentAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });

        totalSent++;
        console.log(`Remarketing sent to ${checkout.email} (checkout ${checkout.token})`);
      } catch (err) {
        console.error(`Failed to send remarketing email to ${checkout.email}:`, err);

        await remarketingRef.set({
          accountId: accountDoc.id,
          shopDomain: data.shopifyDomain,
          checkoutId: checkout.token,
          customerEmail: checkout.email,
          customerName: checkout.customerName,
          cartValue: checkout.totalPrice,
          currency: checkout.currency,
          lineItems: sanitizedLineItems,
          abandonedCheckoutUrl: checkoutUrl,
          couponCode: COUPON_CODE,
          sentMessageId: "",
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
          repliedEmailId: null,
          sentAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return NextResponse.json({ message: "OK", sent: totalSent });
}
