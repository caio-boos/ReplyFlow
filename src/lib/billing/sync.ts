import "server-only";
import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase/admin";
import { isPlanId, isBillingInterval, parseLookupKey } from "./plans";
import { getStripe } from "./stripe";
import {
  billingCollection,
  getBillingRecord,
  updateBillingRecord,
} from "./store";
import type {
  BillingRecord,
  InvoiceSummary,
  PaymentMethodSummary,
  StripeSubscriptionStatus,
} from "./entitlements";

const LIVE_STATUSES = new Set<string>([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function cardSummary(
  pm: string | Stripe.PaymentMethod | null | undefined,
): PaymentMethodSummary | null {
  if (!pm || typeof pm === "string" || !pm.card) return null;
  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    funding: pm.card.funding ?? null,
  };
}

function invoiceSummary(
  inv: string | Stripe.Invoice | null | undefined,
): InvoiceSummary | null {
  if (!inv || typeof inv === "string" || !inv.id) return null;
  return {
    id: inv.id,
    status: inv.status ?? null,
    amountDue: inv.amount_due,
    amountRemaining: inv.amount_remaining,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    nextPaymentAttempt: inv.next_payment_attempt ?? null,
    attemptCount: inv.attempt_count ?? 0,
  };
}

/** Prefere a assinatura viva mais recente; senão, a última encerrada. */
function pickSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const sorted = [...subs].sort((a, b) => b.created - a.created);
  return sorted.find((s) => LIVE_STATUSES.has(s.status)) ?? sorted[0] ?? null;
}

async function resolveOwnerUid(
  customer: Stripe.Customer,
  hint?: string | null,
): Promise<string | null> {
  if (customer.metadata?.ownerUid) return customer.metadata.ownerUid;
  if (hint) return hint;
  const snap = await getAdminDb()
    .collection(billingCollection())
    .where("stripeCustomerId", "==", customer.id)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

export function subscriptionToRecord(
  sub: Stripe.Subscription | null,
  customer: Stripe.Customer,
): Partial<BillingRecord> {
  const customerPm = cardSummary(
    customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod | string | null,
  );

  if (!sub) {
    return {
      subscriptionId: null,
      status: null,
      cancelAtPeriodEnd: false,
      paymentIssueSince: null,
      firstChargeAfterTrial: false,
      paymentMethod: customerPm,
      latestInvoice: null,
    };
  }

  const item = sub.items.data[0];
  const price = item?.price;
  const parsed =
    parseLookupKey(price?.lookup_key) ??
    (isPlanId(sub.metadata?.plan) && isBillingInterval(sub.metadata?.interval)
      ? { plan: sub.metadata.plan, interval: sub.metadata.interval }
      : null);

  const latest = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  const unpaid =
    (sub.status === "past_due" || sub.status === "unpaid") &&
    latest &&
    latest.status === "open";
  const periodStart = item?.current_period_start ?? null;

  return {
    subscriptionId: sub.id,
    status: sub.status as StripeSubscriptionStatus,
    plan: parsed?.plan ?? null,
    interval: parsed?.interval ?? null,
    priceId: price?.id ?? null,
    unitAmount: price?.unit_amount ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    cancelAt: sub.cancel_at ?? null,
    canceledAt: sub.canceled_at ?? null,
    endedAt: sub.ended_at ?? null,
    trialStart: sub.trial_start ?? null,
    trialEnd: sub.trial_end ?? null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: item?.current_period_end ?? null,
    paymentIssueSince: unpaid
      ? (latest.status_transitions?.finalized_at ?? latest.created)
      : null,
    firstChargeAfterTrial:
      !!sub.trial_end && periodStart !== null && Math.abs(periodStart - sub.trial_end) < 2 * 86_400,
    paymentMethod:
      cardSummary(sub.default_payment_method as Stripe.PaymentMethod | string | null) ??
      customerPm,
    latestInvoice: invoiceSummary(latest),
  };
}

/**
 * Lê o estado real na Stripe e grava no Firestore. Idempotente e independente
 * da ordem dos eventos — pode ser chamado quantas vezes for preciso.
 */
export async function syncCustomer(
  customerId: string,
  hintOwnerUid?: string | null,
): Promise<{ ownerUid: string; record: Partial<BillingRecord> } | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if ((customer as Stripe.DeletedCustomer).deleted) return null;
  const cust = customer as Stripe.Customer;

  const ownerUid = await resolveOwnerUid(cust, hintOwnerUid);
  if (!ownerUid) {
    console.warn(`[billing] customer ${customerId} sem ownerUid — ignorado`);
    return null;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.default_payment_method", "data.latest_invoice"],
  });

  const sub = pickSubscription(subs.data);
  const existing = await getBillingRecord(ownerUid);
  const patch: Partial<BillingRecord> = {
    ...subscriptionToRecord(sub, cust),
    email: cust.email ?? existing.email ?? null,
    stripeCustomerId: cust.id,
    stripeLivemode: cust.livemode,
    trialUsed: !!existing.trialUsed || subs.data.some((s) => !!s.trial_start),
    syncedAt: Math.floor(Date.now() / 1000),
  };

  await updateBillingRecord(ownerUid, patch);
  return { ownerUid, record: patch };
}

export function customerIdFromObject(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as { object?: string; id?: string; customer?: unknown };
  if (o.object === "customer") return o.id ?? null;
  return idOf(o.customer as string | { id: string } | null);
}
