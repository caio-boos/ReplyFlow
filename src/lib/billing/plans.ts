/**
 * Catálogo comercial — fonte única de verdade para preços, recursos e limites.
 * Compartilhado entre servidor (checkout, controle de acesso) e interface.
 * Os valores precisam bater com os Prices criados na Stripe
 * (`scripts/stripe-setup.mjs` cria os Prices a partir destes números).
 */
import type { Permission } from "@/lib/auth/permissions";

export const PLAN_IDS = ["starter", "growth", "scale"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const TRIAL_DAYS = 30;
export const CURRENCY = "usd";

export interface PlanLimits {
  /** Lojas (contas de e-mail) conectadas. `null` = ilimitado. */
  stores: number | null;
  /** Membros de equipe além do dono. `null` = ilimitado. */
  seats: number | null;
  /** Respostas de IA por mês (uso justo — acompanhado, nunca interrompe o atendimento). */
  aiReplies: number;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  /**
   * Descrição do Product na Stripe (usada por `scripts/stripe-setup.mjs`).
   * A interface usa `billing.catalog.<plano>.tagline`, traduzida.
   */
  tagline: string;
  /** Preços em centavos de USD. */
  monthly: number;
  yearly: number;
  features: Permission[];
  limits: PlanLimits;
  recommended?: boolean;
  rank: number;
}

const CORE_FEATURES: Permission[] = [
  "dashboard",
  "conversas",
  "tasks",
  "annotations",
  "customers",
  "templates",
  "emails",
];

const GROWTH_FEATURES: Permission[] = [
  ...CORE_FEATURES,
  "stats",
  "remarketing",
  "advertorials",
];

const SCALE_FEATURES: Permission[] = [
  ...GROWTH_FEATURES,
  "watermark",
  "video_clone",
];

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For a single store that wants to stop losing sales in support.",
    monthly: 4900,
    yearly: 46800,
    features: CORE_FEATURES,
    limits: { stores: 1, seats: 2, aiReplies: 1000 },
    rank: 1,
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "For growing brands that want to win back revenue.",
    monthly: 12900,
    yearly: 123600,
    features: GROWTH_FEATURES,
    limits: { stores: 3, seats: 10, aiReplies: 5000 },
    recommended: true,
    rank: 2,
  },
  scale: {
    id: "scale",
    name: "Scale",
    tagline: "For high-volume, multi-store operations.",
    monthly: 29900,
    yearly: 286800,
    features: SCALE_FEATURES,
    limits: { stores: 10, seats: null, aiReplies: 20000 },
    rank: 3,
  },
};

export const PLAN_LIST: PlanDef[] = PLAN_IDS.map((id) => PLANS[id]);

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

/** Lookup key do Price na Stripe — igual em modo teste e produção. */
export function priceLookupKey(plan: PlanId, interval: BillingInterval): string {
  return `replyflow_${plan}_${interval === "month" ? "monthly" : "yearly"}`;
}

export function parseLookupKey(
  key: string | null | undefined,
): { plan: PlanId; interval: BillingInterval } | null {
  const match = /^replyflow_(starter|growth|scale)_(monthly|yearly)$/.exec(key ?? "");
  if (!match) return null;
  return {
    plan: match[1] as PlanId,
    interval: match[2] === "monthly" ? "month" : "year",
  };
}

export function planPrice(plan: PlanId, interval: BillingInterval): number {
  return interval === "month" ? PLANS[plan].monthly : PLANS[plan].yearly;
}

/** Preço mensal equivalente (centavos) — usado para comparar upgrade/downgrade. */
export function monthlyEquivalent(plan: PlanId, interval: BillingInterval): number {
  return interval === "month" ? PLANS[plan].monthly : Math.round(PLANS[plan].yearly / 12);
}

export function yearlySavings(plan: PlanId): number {
  return PLANS[plan].monthly * 12 - PLANS[plan].yearly;
}

export function yearlySavingsPercent(plan: PlanId): number {
  return Math.round((yearlySavings(plan) / (PLANS[plan].monthly * 12)) * 100);
}

/** Plano mais barato que inclui o recurso. */
export function minimumPlanFor(feature: Permission): PlanDef | null {
  return PLAN_LIST.find((p) => p.features.includes(feature)) ?? null;
}

export function formatUsd(cents: number, opts?: { cents?: boolean }): string {
  const showCents = opts?.cents ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/** Destaques exibidos em cada card (textos em `billing.catalog.<plano>.highlights`). */
export const PLAN_HIGHLIGHT_KEYS = ["one", "two", "three", "four"] as const;

export type ComparisonRowId =
  | "aiReplies"
  | "stores"
  | "seats"
  | "core"
  | "shopify"
  | "emails"
  | "stats"
  | "remarketing"
  | "advertorials"
  | "video"
  | "priority";

/**
 * Linhas da tabela comparativa exibida na tela de planos. O rótulo vem de
 * `billing.plans.compare.rows.<id>`; números são formatados no idioma do
 * usuário e `"unlimited"` é traduzido na renderização.
 */
export const COMPARISON_ROWS: {
  id: ComparisonRowId;
  value: (plan: PlanDef) => number | "unlimited" | boolean;
}[] = [
  { id: "aiReplies", value: (p) => p.limits.aiReplies },
  { id: "stores", value: (p) => p.limits.stores ?? "unlimited" },
  { id: "seats", value: (p) => p.limits.seats ?? "unlimited" },
  { id: "core", value: () => true },
  { id: "shopify", value: () => true },
  { id: "emails", value: (p) => p.features.includes("emails") },
  { id: "stats", value: (p) => p.features.includes("stats") },
  { id: "remarketing", value: (p) => p.features.includes("remarketing") },
  { id: "advertorials", value: (p) => p.features.includes("advertorials") },
  { id: "video", value: (p) => p.features.includes("video_clone") },
  { id: "priority", value: (p) => p.id === "scale" },
];
