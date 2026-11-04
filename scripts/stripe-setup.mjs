#!/usr/bin/env node
/**
 * Configura a Stripe a partir do catálogo do app (src/lib/billing/plans.ts).
 * Idempotente: pode rodar quantas vezes quiser, em teste e em produção.
 *
 *   pnpm stripe:setup -- \
 *       [--webhook-url=https://seu-dominio.com/api/stripe/webhook] [--dry-run]
 *
 * O que faz:
 *  - Produtos  replyflow_starter / replyflow_growth / replyflow_scale
 *  - Preços    USD mensais e anuais com lookup keys (replyflow_<plano>_<monthly|yearly>).
 *              Se o valor mudar no catálogo, cria um novo Price e transfere a lookup key —
 *              assinantes atuais continuam no preço antigo (sem reajuste surpresa).
 *  - Portal    Configuração do Customer Portal (cartão, faturas, dados, cancelamento no fim do período).
 *  - Webhook   (opcional) Endpoint com os eventos usados pelo app; imprime o signing secret.
 */
import Stripe from "stripe";
import { PLAN_LIST, CURRENCY, priceLookupKey } from "../src/lib/billing/plans.ts";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const DRY = args.has("dry-run");
const webhookUrl = typeof args.get("webhook-url") === "string" ? args.get("webhook-url") : null;

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Defina STRIPE_SECRET_KEY (sk_test_... ou sk_live_...).");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.includes("_live_") ? "PRODUÇÃO (live)" : "TESTE";
console.log(`\n▶ Stripe em modo ${mode}${DRY ? " — dry-run" : ""}\n`);

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.updated",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.marked_uncollectible",
  "invoice.voided",
  "payment_method.attached",
  "payment_method.detached",
  "payment_method.updated",
  "payment_method.automatically_updated",
];

async function ensureProduct(plan) {
  const id = `replyflow_${plan.id}`;
  try {
    const existing = await stripe.products.retrieve(id);
    if (existing.name !== `ReplyFlow ${plan.name}` || !existing.active) {
      if (!DRY) {
        await stripe.products.update(id, {
          name: `ReplyFlow ${plan.name}`,
          description: plan.tagline,
          active: true,
        });
      }
      console.log(`  ↻ produto ${id} atualizado`);
    } else {
      console.log(`  ✓ produto ${id}`);
    }
    return id;
  } catch (err) {
    if (err?.code !== "resource_missing") throw err;
  }
  if (!DRY) {
    await stripe.products.create({
      id,
      name: `ReplyFlow ${plan.name}`,
      description: plan.tagline,
      metadata: { plan: plan.id },
    });
  }
  console.log(`  + produto ${id} criado`);
  return id;
}

async function ensurePrice(plan, productId, interval) {
  const lookupKey = priceLookupKey(plan.id, interval);
  const amount = interval === "month" ? plan.monthly : plan.yearly;
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const current = data[0];

  if (
    current &&
    current.active &&
    current.unit_amount === amount &&
    current.currency === CURRENCY &&
    current.recurring?.interval === interval &&
    current.product === productId
  ) {
    console.log(`  ✓ preço ${lookupKey} = ${(amount / 100).toFixed(2)} USD`);
    return;
  }

  if (!DRY) {
    await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: amount,
      recurring: { interval },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      tax_behavior: "exclusive",
      nickname: `${plan.name} ${interval === "month" ? "mensal" : "anual"}`,
      metadata: { plan: plan.id, interval },
    });
  }
  console.log(
    `  ${current ? "↻" : "+"} preço ${lookupKey} = ${(amount / 100).toFixed(2)} USD${current ? " (novo Price; assinantes atuais mantêm o anterior)" : ""}`,
  );
}

async function ensurePortal() {
  const config = {
    business_profile: {
      headline: "ReplyFlow — gerencie sua assinatura",
      ...(process.env.LEGAL_PRIVACY_URL ? { privacy_policy_url: process.env.LEGAL_PRIVACY_URL } : {}),
      ...(process.env.LEGAL_TERMS_URL ? { terms_of_service_url: process.env.LEGAL_TERMS_URL } : {}),
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "unused",
            "missing_features",
            "switched_service",
            "too_complex",
            "low_quality",
            "other",
          ],
        },
      },
      // Troca de plano acontece dentro do app (com prévia e checagem de limites).
      subscription_update: { enabled: false },
    },
    metadata: { managedBy: "replyflow-setup" },
  };

  const existingId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  if (existingId) {
    if (!DRY) await stripe.billingPortal.configurations.update(existingId, config);
    console.log(`  ↻ portal ${existingId} atualizado`);
    return existingId;
  }
  if (DRY) {
    console.log("  + portal seria criado");
    return null;
  }
  const created = await stripe.billingPortal.configurations.create(config);
  console.log(`  + portal criado: ${created.id}`);
  return created.id;
}

async function ensureWebhook() {
  if (!webhookUrl) return null;
  const { data } = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = data.find((w) => w.url === webhookUrl);
  if (existing) {
    if (!DRY) {
      await stripe.webhookEndpoints.update(existing.id, {
        enabled_events: WEBHOOK_EVENTS,
        disabled: false,
      });
    }
    console.log(`  ↻ webhook ${existing.id} atualizado (o signing secret não muda)`);
    return null;
  }
  if (DRY) {
    console.log(`  + webhook seria criado para ${webhookUrl}`);
    return null;
  }
  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    api_version: Stripe.API_VERSION,
    description: "ReplyFlow billing sync",
  });
  console.log(`  + webhook criado: ${created.id}`);
  return created.secret;
}

console.log("Produtos e preços:");
for (const plan of PLAN_LIST) {
  const productId = await ensureProduct(plan);
  await ensurePrice(plan, productId, "month");
  await ensurePrice(plan, productId, "year");
}

console.log("\nCustomer Portal:");
const portalId = await ensurePortal();

console.log("\nWebhook:");
const secret = await ensureWebhook();
if (!webhookUrl) console.log("  (pule) passe --webhook-url=https://.../api/stripe/webhook para criar");

console.log("\nVariáveis para este ambiente:");
if (portalId && !process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
  console.log(`  STRIPE_PORTAL_CONFIGURATION_ID=${portalId}`);
}
if (secret) console.log(`  STRIPE_WEBHOOK_SECRET=${secret}`);
console.log("\n✔ Concluído.\n");
