import "server-only";
import { NextResponse } from "next/server";
import { getAuthContext, type SessionPayload } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getBillingConfig } from "./config";
import { friendlyStripeError } from "./stripe";
import { getBillingState, getMonthlyUsage } from "./store";
import { countUsage, trialTermsFor, type TrialTerms } from "./service";
import type {
  BillingRecord,
  Entitlement,
  InvoiceSummary,
  PaymentMethodSummary,
} from "./entitlements";

/** Resposta JSON com a mensagem do erro traduzida no idioma da requisição. */
export async function billingErrorResponse(err: unknown): Promise<NextResponse> {
  const e = friendlyStripeError(err);
  const t = await getT("billing");
  return NextResponse.json(
    { error: t(`errors.${e.key}`, e.values), code: e.code },
    { status: e.status },
  );
}

export async function requireOwner(): Promise<
  { ctx: SessionPayload; error: null } | { ctx: null; error: NextResponse }
> {
  const ctx = await getAuthContext();
  if (!ctx) {
    const tc = await getT("common");
    return {
      ctx: null,
      error: NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 }),
    };
  }
  const t = await getT("billing");
  if (!ctx.isOwner) {
    return {
      ctx: null,
      error: NextResponse.json({ error: t("errors.ownerOnly") }, { status: 403 }),
    };
  }
  if (!getBillingConfig().enabled) {
    return {
      ctx: null,
      error: NextResponse.json(
        { error: t("errors.unavailable"), code: "billing_unconfigured" },
        { status: 503 },
      ),
    };
  }
  return { ctx, error: null };
}

export interface BillingSummary {
  enabled: boolean;
  isOwner: boolean;
  entitlement: Entitlement;
  subscription: {
    id: string | null;
    status: BillingRecord["status"];
    plan: BillingRecord["plan"];
    interval: BillingRecord["interval"];
    unitAmount: number | null;
    cancelAtPeriodEnd: boolean;
    cancelAt: number | null;
    trialEnd: number | null;
    currentPeriodEnd: number | null;
    paymentMethod: PaymentMethodSummary | null;
    latestInvoice: InvoiceSummary | null;
    hasCustomer: boolean;
  };
  trial: TrialTerms;
  usage: { aiReplies: number; stores: number; seats: number };
}

export async function buildBillingSummary(ctx: SessionPayload): Promise<BillingSummary> {
  const ownerUid = ctx.uid;
  const [{ record, entitlement }, usage, counts] = await Promise.all([
    getBillingState(ownerUid),
    getMonthlyUsage(ownerUid).catch(() => ({ aiReplies: 0 })),
    countUsage(ownerUid),
  ]);

  return {
    enabled: getBillingConfig().enabled,
    isOwner: ctx.isOwner,
    entitlement,
    subscription: {
      id: record.subscriptionId ?? null,
      status: record.status ?? null,
      plan: record.plan ?? null,
      interval: record.interval ?? null,
      unitAmount: record.unitAmount ?? null,
      cancelAtPeriodEnd: !!record.cancelAtPeriodEnd,
      cancelAt: record.cancelAt ?? null,
      trialEnd: record.trialEnd ?? null,
      currentPeriodEnd: record.currentPeriodEnd ?? null,
      // Membros veem o plano, mas não os dados de pagamento do dono.
      paymentMethod: ctx.isOwner ? (record.paymentMethod ?? null) : null,
      latestInvoice: ctx.isOwner ? (record.latestInvoice ?? null) : null,
      hasCustomer: !!record.stripeCustomerId,
    },
    trial: trialTermsFor(record),
    usage: {
      aiReplies: usage.aiReplies,
      stores: counts.stores,
      seats: counts.seats,
    },
  };
}
