import "server-only";
import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { formatDateValue } from "@/lib/i18n/format";
import { createT } from "@/lib/i18n/server";
import { getBillingConfig } from "./config";
import {
  PLANS,
  TRIAL_DAYS,
  monthlyEquivalent,
  planPrice,
  type BillingInterval,
  type PlanId,
} from "./plans";
import { BillingError, getPlanPrice, getStripe } from "./stripe";
import {
  billingFeedbackCollection,
  getBillingRecord,
  getEntitlement,
  updateBillingRecord,
} from "./store";
import { syncCustomer } from "./sync";
import type { BillingRecord } from "./entitlements";

const DAY = 86_400;
const LIVE = new Set(["trialing", "active", "past_due", "unpaid", "paused", "incomplete"]);

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function hasLiveSubscription(record: BillingRecord): boolean {
  return !!record.subscriptionId && !!record.status && LIVE.has(record.status);
}

export async function ensureCustomer(ownerUid: string, email: string): Promise<string> {
  const stripe = getStripe();
  const cfg = getBillingConfig();
  const record = await getBillingRecord(ownerUid);

  if (record.stripeCustomerId && record.stripeLivemode === cfg.livemode) {
    try {
      const existing = await stripe.customers.retrieve(record.stripeCustomerId);
      if (!(existing as Stripe.DeletedCustomer).deleted) return existing.id;
    } catch {
      // Cliente inexistente neste ambiente (ex.: chave trocada) — recria abaixo.
    }
  }

  const customer = await stripe.customers.create(
    { email, metadata: { ownerUid } },
    { idempotencyKey: `customer:${ownerUid}:${cfg.livemode ? "live" : "test"}` },
  );
  await updateBillingRecord(ownerUid, {
    stripeCustomerId: customer.id,
    stripeLivemode: customer.livemode,
    email,
  });
  return customer.id;
}

export interface TrialTerms {
  trialAvailable: boolean;
  /** Fim do período gratuito (segundos) — `null` quando cobra no ato. */
  trialEnd: number | null;
}

/**
 * Regra do período gratuito: 30 dias, uma vez por workspace. Membros em
 * transição começam o teste ao final da transição se isso for mais vantajoso,
 * então assinar cedo nunca custa dias gratuitos.
 */
export function trialTermsFor(record: BillingRecord, at = now()): TrialTerms {
  if (record.trialUsed) return { trialAvailable: false, trialEnd: null };
  const standard = at + TRIAL_DAYS * DAY;
  const legacyUntil = record.legacy?.accessUntil ?? 0;
  return { trialAvailable: true, trialEnd: Math.max(standard, legacyUntil) };
}

export async function createCheckoutSession(params: {
  ownerUid: string;
  email: string;
  plan: PlanId;
  interval: BillingInterval;
  origin: string;
  locale: Locale;
}): Promise<{ clientSecret: string; trialEnd: number | null }> {
  const { ownerUid, email, plan, interval, origin, locale } = params;
  const record = await getBillingRecord(ownerUid);
  if (hasLiveSubscription(record)) {
    throw new BillingError("alreadySubscribed", 409, "already_subscribed");
  }

  const cfg = getBillingConfig();
  const stripe = getStripe();
  await assertPlanFits(ownerUid, plan);
  const [customerId, price] = await Promise.all([
    ensureCustomer(ownerUid, email),
    getPlanPrice(plan, interval),
  ]);

  const terms = trialTermsFor(record);
  // Stripe exige trial_end ao menos 48h no futuro; usamos trial_period_days no caso padrão.
  const usesStandardTrial =
    terms.trialAvailable && terms.trialEnd! - now() <= TRIAL_DAYS * DAY + 60;

  const t = createT(locale, "billing");
  const amount = formatAmount(planPrice(plan, interval));
  const chargeDate = terms.trialEnd
    ? formatDateValue(terms.trialEnd, locale, { dateStyle: "long" })
    : null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ui_mode: "embedded_page",
    customer: customerId,
    client_reference_id: ownerUid,
    customer_update: { address: "auto", name: "auto" },
    line_items: [{ price: price.id, quantity: 1 }],
    // Somente cartões (crédito/débito) e somente USD — sem conversão de moeda.
    allowed_payment_method_types: ["card"],
    adaptive_pricing: { enabled: false },
    payment_method_collection: "always",
    locale: LOCALE_META[locale].stripe,
    branding_settings: {
      display_name: "ReplyFlow",
      button_color: "#10b981",
      border_style: "rounded",
    },
    return_url: `${origin}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    ...(record.legacy && cfg.legacyCouponId
      ? { discounts: [{ coupon: cfg.legacyCouponId }] }
      : { allow_promotion_codes: true }),
    subscription_data: {
      metadata: { ownerUid, plan, interval },
      ...(terms.trialAvailable
        ? {
            ...(usesStandardTrial
              ? { trial_period_days: TRIAL_DAYS }
              : { trial_end: terms.trialEnd! }),
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {}),
    },
    metadata: { ownerUid, plan, interval },
    custom_text: {
      submit: {
        message: chargeDate
          ? t("checkout.submitTrial", { date: chargeDate, amount, interval })
          : t("checkout.submitNow", { amount, interval }),
      },
    },
  });

  if (!session.client_secret) {
    throw new BillingError("checkoutFailed", 502, "checkout_failed");
  }
  return { clientSecret: session.client_secret, trialEnd: terms.trialEnd };
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

/** Confirma a sessão do checkout no retorno e sincroniza sem esperar o webhook. */
export async function confirmCheckoutSession(ownerUid: string, sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== ownerUid) {
    throw new BillingError("invalidSession", 403, "session_mismatch");
  }
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customerId) await syncCustomer(customerId, ownerUid);
  return { status: session.status, record: await getBillingRecord(ownerUid) };
}

async function liveSubscription(ownerUid: string) {
  const record = await getBillingRecord(ownerUid);
  if (!record.subscriptionId || !hasLiveSubscription(record)) {
    throw new BillingError("noSubscription", 404, "no_subscription");
  }
  const sub = await getStripe().subscriptions.retrieve(record.subscriptionId);
  return { record, sub };
}

function isUpgrade(record: BillingRecord, plan: PlanId, interval: BillingInterval): boolean {
  if (!record.plan || !record.interval) return true;
  if (PLANS[plan].rank !== PLANS[record.plan].rank) {
    return PLANS[plan].rank > PLANS[record.plan].rank;
  }
  if (record.interval === "month" && interval === "year") return true;
  return monthlyEquivalent(plan, interval) > monthlyEquivalent(record.plan, record.interval);
}

export interface ChangePreview {
  plan: PlanId;
  interval: BillingInterval;
  direction: "upgrade" | "downgrade";
  inTrial: boolean;
  /** Valor cobrado agora (centavos). */
  dueNow: number;
  /** Crédito gerado para faturas futuras (centavos). */
  credit: number;
  nextChargeAmount: number;
  nextChargeDate: number | null;
  prorationDate: number;
}

export async function previewPlanChange(
  ownerUid: string,
  plan: PlanId,
  interval: BillingInterval,
): Promise<ChangePreview> {
  const { record, sub } = await liveSubscription(ownerUid);
  if (record.plan === plan && record.interval === interval) {
    throw new BillingError("samePlan", 400, "same_plan");
  }
  await assertPlanFits(ownerUid, plan);
  const price = await getPlanPrice(plan, interval);
  const inTrial = sub.status === "trialing";
  const upgrade = isUpgrade(record, plan, interval);
  const prorationDate = now();
  const item = sub.items.data[0];

  if (inTrial) {
    return {
      plan,
      interval,
      direction: upgrade ? "upgrade" : "downgrade",
      inTrial,
      dueNow: 0,
      credit: 0,
      nextChargeAmount: planPrice(plan, interval),
      nextChargeDate: sub.trial_end ?? null,
      prorationDate,
    };
  }

  const preview = await getStripe().invoices.createPreview({
    customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscription: sub.id,
    subscription_details: {
      items: [{ id: item.id, price: price.id, quantity: 1 }],
      proration_behavior: upgrade ? "always_invoice" : "create_prorations",
      proration_date: prorationDate,
    },
  });

  const intervalChanged = record.interval !== interval;
  const dueNow = upgrade || intervalChanged ? Math.max(preview.amount_due, 0) : 0;
  const credit = preview.total < 0 ? -preview.total : 0;
  const periodEnd = item.current_period_end;

  return {
    plan,
    interval,
    direction: upgrade ? "upgrade" : "downgrade",
    inTrial,
    dueNow,
    credit,
    nextChargeAmount: planPrice(plan, interval),
    nextChargeDate: intervalChanged
      ? prorationDate + (interval === "year" ? 365 : 30) * DAY
      : periodEnd,
    prorationDate,
  };
}

/**
 * Upgrade: aplicado na hora, cobrando só a diferença proporcional; se o
 * pagamento falhar, nada muda (pending_if_incomplete).
 * Downgrade: aplicado na hora, e o valor não usado vira crédito automático
 * nas próximas faturas — sem perda para o cliente.
 * Durante o teste: só troca o plano, sem cobrança.
 */
export async function changePlan(
  ownerUid: string,
  plan: PlanId,
  interval: BillingInterval,
  prorationDate?: number,
) {
  const { record, sub } = await liveSubscription(ownerUid);
  if (record.plan === plan && record.interval === interval) {
    throw new BillingError("samePlan", 400, "same_plan");
  }
  const stripe = getStripe();
  await assertPlanFits(ownerUid, plan);
  const price = await getPlanPrice(plan, interval);
  const inTrial = sub.status === "trialing";
  const upgrade = isUpgrade(record, plan, interval);
  const item = sub.items.data[0];

  if (sub.cancel_at_period_end) {
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
  }

  const validProration =
    prorationDate && Math.abs(now() - prorationDate) < 60 * 60 ? prorationDate : undefined;

  await stripe.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: price.id, quantity: 1 }],
    metadata: { ...sub.metadata, plan, interval },
    ...(inTrial
      ? { proration_behavior: "none" as const }
      : upgrade
        ? {
            proration_behavior: "always_invoice" as const,
            payment_behavior: "pending_if_incomplete" as const,
            ...(validProration ? { proration_date: validProration } : {}),
          }
        : {
            proration_behavior: "create_prorations" as const,
            ...(validProration ? { proration_date: validProration } : {}),
          }),
  });

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await syncCustomer(customerId, ownerUid);
  const updated = await getBillingRecord(ownerUid);
  if (updated.plan !== plan || updated.interval !== interval) {
    throw new BillingError("upgradePaymentFailed", 402, "upgrade_payment_failed");
  }
  return updated;
}

const FEEDBACK_REASONS = new Set([
  "too_expensive",
  "missing_features",
  "unused",
  "switched_service",
  "too_complex",
  "low_quality",
  "customer_service",
  "other",
]);

export async function cancelSubscription(
  ownerUid: string,
  reason: string | null,
  comment: string | null,
) {
  const { record, sub } = await liveSubscription(ownerUid);
  const feedback = reason && FEEDBACK_REASONS.has(reason) ? reason : "other";
  const cleanComment = comment?.slice(0, 500) || undefined;

  await getStripe().subscriptions.update(sub.id, {
    cancel_at_period_end: true,
    cancellation_details: {
      feedback: feedback as Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback,
      ...(cleanComment ? { comment: cleanComment } : {}),
    },
  });

  await getAdminDb().collection(billingFeedbackCollection()).add({
    ownerUid,
    plan: record.plan ?? null,
    interval: record.interval ?? null,
    status: record.status ?? null,
    reason: feedback,
    comment: cleanComment ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await syncCustomer(customerId, ownerUid);
  return getBillingRecord(ownerUid);
}

export async function reactivateSubscription(ownerUid: string) {
  const record = await getBillingRecord(ownerUid);
  if (!hasLiveSubscription(record) || !record.subscriptionId) {
    // Assinatura já encerrada: precisa de um novo checkout (sem novo teste).
    return { needsCheckout: true as const, record };
  }
  const sub = await getStripe().subscriptions.update(record.subscriptionId, {
    cancel_at_period_end: false,
  });
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await syncCustomer(customerId, ownerUid);
  return { needsCheckout: false as const, record: await getBillingRecord(ownerUid) };
}

export async function createPortalSession(
  ownerUid: string,
  returnUrl: string,
  flow: "default" | "payment_method_update",
  locale: Locale = "en",
): Promise<string> {
  const record = await getBillingRecord(ownerUid);
  if (!record.stripeCustomerId) {
    throw new BillingError("noCustomer", 404, "no_customer");
  }
  const cfg = getBillingConfig();
  const session = await getStripe().billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: returnUrl,
    locale: LOCALE_META[locale].stripe,
    ...(cfg.portalConfigurationId ? { configuration: cfg.portalConfigurationId } : {}),
    ...(flow === "payment_method_update"
      ? {
          flow_data: {
            type: "payment_method_update" as const,
            after_completion: {
              type: "redirect" as const,
              redirect: { return_url: returnUrl },
            },
          },
        }
      : {}),
  });
  return session.url;
}

export interface InvoiceRow {
  id: string;
  number: string | null;
  status: string | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  description: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export async function listInvoices(ownerUid: string): Promise<InvoiceRow[]> {
  const record = await getBillingRecord(ownerUid);
  if (!record.stripeCustomerId) return [];
  const { data } = await getStripe().invoices.list({
    customer: record.stripeCustomerId,
    limit: 24,
  });
  return data
    .filter((inv) => inv.status !== "draft")
    .map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: inv.status ?? null,
      total: inv.total,
      amountPaid: inv.amount_paid,
      amountDue: inv.amount_due,
      currency: inv.currency,
      created: inv.created,
      periodStart: inv.lines?.data?.[0]?.period?.start ?? inv.period_start,
      periodEnd: inv.lines?.data?.[0]?.period?.end ?? inv.period_end,
      description: inv.lines?.data?.[0]?.description ?? null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
    }));
}

/** Tenta cobrar agora a fatura em aberto (após o cliente atualizar o cartão). */
export async function retryOpenInvoice(ownerUid: string) {
  const record = await getBillingRecord(ownerUid);
  if (!record.stripeCustomerId) {
    throw new BillingError("noCustomer", 404, "no_customer");
  }
  const stripe = getStripe();
  const { data } = await stripe.invoices.list({
    customer: record.stripeCustomerId,
    status: "open",
    limit: 5,
  });
  const open = data.filter((inv) => inv.amount_remaining > 0);
  if (open.length === 0) {
    await syncCustomer(record.stripeCustomerId, ownerUid);
    return { paid: true, record: await getBillingRecord(ownerUid) };
  }
  for (const inv of open) {
    if (inv.id) await stripe.invoices.pay(inv.id);
  }
  await syncCustomer(record.stripeCustomerId, ownerUid);
  return { paid: true, record: await getBillingRecord(ownerUid) };
}

/** Limites de criação (lojas/membros) — nunca removem o que já existe. */
export async function countUsage(ownerUid: string): Promise<{ stores: number; seats: number }> {
  const db = getAdminDb();
  const [stores, seats] = await Promise.all([
    db.collection("accounts").where("userId", "==", ownerUid).count().get(),
    db
      .collection("memberships")
      .where("ownerId", "==", ownerUid)
      .where("status", "in", ["active", "pending"])
      .count()
      .get(),
  ]);
  return { stores: stores.data().count, seats: seats.data().count };
}

/**
 * Impede contratar/migrar para um plano cujos limites o workspace já excede.
 * Nada é apagado: o usuário escolhe um plano compatível ou remove itens antes.
 */
export async function assertPlanFits(ownerUid: string, plan: PlanId): Promise<void> {
  const usage = await countUsage(ownerUid);
  const { stores, seats } = PLANS[plan].limits;
  if (stores !== null && usage.stores > stores) {
    throw new BillingError("planTooSmallStores", 409, "plan_too_small", {
      count: usage.stores,
      plan: PLANS[plan].name,
      limit: stores,
    });
  }
  if (seats !== null && usage.seats > seats) {
    throw new BillingError("planTooSmallSeats", 409, "plan_too_small", {
      count: usage.seats,
      plan: PLANS[plan].name,
      limit: seats,
    });
  }
}

export async function assertWithinLimit(
  ownerUid: string,
  kind: "stores" | "seats",
): Promise<void> {
  const ent = await getEntitlement(ownerUid, { fresh: true });
  const limit = ent.limits?.[kind] ?? null;
  if (limit === null) return;

  const count = (await countUsage(ownerUid))[kind];

  if (count >= limit) {
    throw new BillingError(kind === "stores" ? "storesLimit" : "seatsLimit", 402, "plan_limit", {
      plan: ent.plan ? PLANS[ent.plan].name : "current",
      limit,
    });
  }
}
