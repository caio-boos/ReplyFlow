/**
 * Regras de acesso por assinatura. Função pura — o mesmo cálculo é usado no
 * proxy, nas APIs, nos crons e na interface, então não há como divergir.
 *
 * Política:
 * - full      → usa tudo que o plano inclui; automação (IA/cron) ligada.
 * - readonly  → vê os próprios dados, mas não altera nada; automação pausada.
 *               Nunca apagamos dados: basta regularizar para voltar a `full`.
 * - blocked   → nunca assinou: precisa escolher um plano.
 */
import { ALL_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import {
  PLANS,
  isPlanId,
  type BillingInterval,
  type PlanId,
  type PlanLimits,
} from "./plans";

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface PaymentMethodSummary {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string | null;
}

export interface InvoiceSummary {
  id: string;
  status: string | null;
  amountDue: number;
  amountRemaining: number;
  hostedInvoiceUrl: string | null;
  nextPaymentAttempt: number | null;
  attemptCount: number;
}

/** Documento `billing/{ownerUid}` (datas em segundos epoch). */
export interface BillingRecord {
  ownerUid: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeLivemode?: boolean | null;
  subscriptionId?: string | null;
  status?: StripeSubscriptionStatus | null;
  plan?: PlanId | null;
  interval?: BillingInterval | null;
  priceId?: string | null;
  unitAmount?: number | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  canceledAt?: number | null;
  endedAt?: number | null;
  trialStart?: number | null;
  trialEnd?: number | null;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
  /** Momento em que a fatura atualmente não paga foi emitida. */
  paymentIssueSince?: number | null;
  /** A pendência é da primeira cobrança após o teste gratuito. */
  firstChargeAfterTrial?: boolean;
  paymentMethod?: PaymentMethodSummary | null;
  latestInvoice?: InvoiceSummary | null;
  trialUsed?: boolean;
  legacy?: { accessUntil: number; grantedAt: number } | null;
  /** Cortesia concedida manualmente (ex.: conta interna). */
  comp?: { reason?: string; until?: number | null } | null;
  syncedAt?: number | null;
}

export type AccessMode = "full" | "readonly" | "blocked";

export type AccessReason =
  | "billing_disabled"
  | "admin"
  | "comp"
  | "legacy"
  | "legacy_expired"
  | "no_subscription"
  | "incomplete"
  | "trialing"
  | "active"
  | "cancel_scheduled"
  | "payment_grace"
  | "payment_failed"
  | "trial_unpaid"
  | "paused"
  | "canceled";

export interface Entitlement {
  mode: AccessMode;
  reason: AccessReason;
  plan: PlanId | null;
  features: Permission[];
  /** `null` = sem limites (cortesia, transição ou cobrança desligada). */
  limits: PlanLimits | null;
  /** Crons de IA, coleta de e-mails e remarketing. */
  automation: boolean;
  /** Até quando o acesso atual está garantido (cancelamento agendado, transição). */
  accessUntil: number | null;
  /** Fim da tolerância para pagamento pendente. */
  graceEndsAt: number | null;
  legacyUntil: number | null;
}

export interface EntitlementPolicy {
  enabled: boolean;
  graceDays: number;
  firstChargeGraceDays: number;
  /** Workspaces com acesso ilimitado e permanente (variável ADMIN_UIDS). */
  adminUids?: readonly string[];
}

export function isAdminUid(policy: EntitlementPolicy, ownerUid: string | null | undefined): boolean {
  return !!ownerUid && !!policy.adminUids?.includes(ownerUid);
}

const DAY = 86_400;

function unrestricted(reason: AccessReason, accessUntil: number | null = null): Entitlement {
  return {
    mode: "full",
    reason,
    plan: null,
    features: ALL_PERMISSIONS,
    limits: null,
    automation: true,
    accessUntil,
    graceEndsAt: null,
    legacyUntil: reason === "legacy" ? accessUntil : null,
  };
}

function planEntitlement(
  plan: PlanId | null,
  mode: AccessMode,
  reason: AccessReason,
  extra: Partial<Entitlement> = {},
): Entitlement {
  const def = plan ? PLANS[plan] : null;
  return {
    mode,
    reason,
    plan,
    features: def ? def.features : [],
    limits: def ? def.limits : null,
    automation: mode === "full",
    accessUntil: null,
    graceEndsAt: null,
    legacyUntil: null,
    ...extra,
  };
}

function fromSubscription(
  record: BillingRecord,
  policy: EntitlementPolicy,
  now: number,
): Entitlement | null {
  const plan = isPlanId(record.plan) ? record.plan : null;
  switch (record.status) {
    case "trialing":
    case "active": {
      const reason = record.cancelAtPeriodEnd
        ? "cancel_scheduled"
        : record.status === "trialing"
          ? "trialing"
          : "active";
      const accessUntil =
        record.cancelAt ??
        (record.status === "trialing" ? record.trialEnd : record.currentPeriodEnd) ??
        null;
      return planEntitlement(plan, "full", reason, {
        accessUntil: record.cancelAtPeriodEnd ? accessUntil : null,
      });
    }
    case "past_due": {
      const since = record.paymentIssueSince ?? now;
      const days = record.firstChargeAfterTrial
        ? policy.firstChargeGraceDays
        : policy.graceDays;
      const graceEndsAt = since + days * DAY;
      if (now < graceEndsAt) {
        return planEntitlement(plan, "full", "payment_grace", { graceEndsAt });
      }
      return planEntitlement(
        plan,
        "readonly",
        record.firstChargeAfterTrial ? "trial_unpaid" : "payment_failed",
        { graceEndsAt },
      );
    }
    case "unpaid":
      return planEntitlement(
        plan,
        "readonly",
        record.firstChargeAfterTrial ? "trial_unpaid" : "payment_failed",
      );
    case "paused":
      return planEntitlement(plan, "readonly", "paused");
    case "incomplete":
      return planEntitlement(plan, "blocked", "incomplete");
    case "canceled":
    case "incomplete_expired":
      return plan ? planEntitlement(plan, "readonly", "canceled") : null;
    default:
      return null;
  }
}

export function resolveEntitlement(
  record: BillingRecord | null,
  policy: EntitlementPolicy,
  now: number = Math.floor(Date.now() / 1000),
): Entitlement {
  if (!policy.enabled) return unrestricted("billing_disabled");
  // Administradores têm prioridade sobre qualquer estado da Stripe.
  if (isAdminUid(policy, record?.ownerUid)) return unrestricted("admin");
  if (!record) return planEntitlement(null, "blocked", "no_subscription");

  if (record.comp && (!record.comp.until || record.comp.until > now)) {
    return unrestricted("comp", record.comp.until ?? null);
  }

  const fromSub = fromSubscription(record, policy, now);
  const legacyUntil = record.legacy?.accessUntil ?? null;
  const legacyActive = legacyUntil !== null && legacyUntil > now;

  // Membros antigos mantêm acesso completo durante a transição, mesmo que já
  // tenham escolhido um plano — a promessa de transição é honrada até o fim.
  if (legacyActive) {
    if (fromSub && fromSub.mode === "full") {
      return { ...fromSub, features: ALL_PERMISSIONS, limits: null, legacyUntil };
    }
    return unrestricted("legacy", legacyUntil);
  }

  if (fromSub) return fromSub;

  if (legacyUntil !== null) {
    return {
      ...planEntitlement(null, "readonly", "legacy_expired"),
      features: ALL_PERMISSIONS,
      legacyUntil,
    };
  }

  return planEntitlement(null, "blocked", "no_subscription");
}

export function canUseFeature(ent: Entitlement, feature: Permission): boolean {
  return ent.features.includes(feature);
}

export function isPaymentProblem(reason: AccessReason): boolean {
  return (
    reason === "payment_grace" ||
    reason === "payment_failed" ||
    reason === "trial_unpaid"
  );
}
