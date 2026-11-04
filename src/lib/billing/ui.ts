/** Helpers de apresentação (seguros para o cliente). */
import type { AccessReason } from "./entitlements";

export const DAY_SECONDS = 86_400;

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function daysUntil(epochSeconds: number | null | undefined): number | null {
  if (!epochSeconds) return null;
  return Math.max(0, Math.ceil((epochSeconds - nowSeconds()) / DAY_SECONDS));
}

export type Tone = "emerald" | "indigo" | "amber" | "red" | "gray";

/** Rótulo traduzido em `billing.status.<reason>`. */
export const STATUS_BADGE: Record<AccessReason, { tone: Tone }> = {
  billing_disabled: { tone: "gray" },
  admin: { tone: "indigo" },
  comp: { tone: "indigo" },
  legacy: { tone: "indigo" },
  legacy_expired: { tone: "red" },
  no_subscription: { tone: "gray" },
  incomplete: { tone: "amber" },
  trialing: { tone: "emerald" },
  active: { tone: "emerald" },
  cancel_scheduled: { tone: "amber" },
  payment_grace: { tone: "amber" },
  payment_failed: { tone: "red" },
  trial_unpaid: { tone: "red" },
  paused: { tone: "red" },
  canceled: { tone: "gray" },
};

export const TONE_CLASSES: Record<Tone, { badge: string; panel: string; text: string }> = {
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    panel: "bg-emerald-500/8 border-emerald-500/20",
    text: "text-emerald-400",
  },
  indigo: {
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
    panel: "bg-indigo-500/8 border-indigo-500/20",
    text: "text-indigo-400",
  },
  amber: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    panel: "bg-amber-500/8 border-amber-500/20",
    text: "text-amber-400",
  },
  red: {
    badge: "bg-red-500/10 text-red-400 border-red-500/25",
    panel: "bg-red-500/8 border-red-500/20",
    text: "text-red-400",
  },
  gray: {
    badge: "bg-white/5 text-gray-400 border-white/10",
    panel: "bg-white/3 border-white/8",
    text: "text-gray-400",
  },
};

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  elo: "Elo",
  hipercard: "Hipercard",
};

export function cardBrandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export type CardFunding = "credit" | "debit" | "prepaid";

/** Tipo do cartão conhecido (rótulo em `billing.card.funding.<tipo>`). */
export function cardFunding(funding: string | null): CardFunding | null {
  return funding === "credit" || funding === "debit" || funding === "prepaid" ? funding : null;
}

/** Último instante de validade do cartão (fim do mês de expiração). */
export function cardExpiresAt(expMonth: number, expYear: number): number {
  return Math.floor(Date.UTC(expYear, expMonth, 1) / 1000) - 1;
}

/** Erro devolvido pela API (mensagem já traduzida no servidor). */
export class RequestError extends Error {}

/** Mensagem para exibir: a do servidor ou o texto genérico informado. */
export function errorText(err: unknown, fallback: string): string {
  return err instanceof RequestError && err.message ? err.message : fallback;
}

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new RequestError((data as { error?: string }).error ?? "");
  }
  return data as T;
}
