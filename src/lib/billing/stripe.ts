import "server-only";
import Stripe from "stripe";
import type { MessageValues } from "@/lib/i18n/format";
import { createT } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/types";
import { getBillingConfig } from "./config";
import {
  CURRENCY,
  planPrice,
  priceLookupKey,
  type BillingInterval,
  type PlanId,
} from "./plans";

let client: Stripe | null = null;

export type BillingErrorKey = keyof Messages["billing"]["errors"];

/**
 * Erro de cobrança com mensagem traduzível: `key` aponta para
 * `billing.errors.<key>` e é traduzida no idioma do usuário em
 * `billingErrorResponse`. `message` fica em inglês (logs).
 */
export class BillingError extends Error {
  constructor(
    public key: BillingErrorKey,
    public status = 400,
    public code = "billing_error",
    public values?: MessageValues,
  ) {
    super(createT("en", "billing")(`errors.${key}`, values));
  }
}

export function getStripe(): Stripe {
  const { secretKey } = getBillingConfig();
  if (!secretKey) {
    throw new BillingError("notConfigured", 503, "billing_unconfigured");
  }
  if (!client) {
    client = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      appInfo: { name: "ReplyFlow" },
    });
  }
  return client;
}

const priceCache = new Map<string, { price: Stripe.Price; at: number }>();
const PRICE_TTL_MS = 10 * 60 * 1000;

/**
 * Resolve o Price pela lookup key e confere se valor, moeda e periodicidade
 * batem com o catálogo — evita cobrar algo diferente do que a tela mostrou.
 */
export async function getPlanPrice(
  plan: PlanId,
  interval: BillingInterval,
): Promise<Stripe.Price> {
  const key = priceLookupKey(plan, interval);
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.at < PRICE_TTL_MS) return cached.price;

  const { data } = await getStripe().prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  });
  const price = data[0];
  if (!price) {
    throw new BillingError("priceMissing", 500, "price_missing", { key });
  }
  if (
    price.currency !== CURRENCY ||
    price.unit_amount !== planPrice(plan, interval) ||
    price.recurring?.interval !== interval
  ) {
    throw new BillingError("priceMismatch", 500, "price_mismatch", { key });
  }
  priceCache.set(key, { price, at: Date.now() });
  return price;
}

/** Converte erros da Stripe em mensagens compreensíveis para o usuário. */
export function friendlyStripeError(err: unknown): BillingError {
  if (err instanceof BillingError) return err;
  if (err instanceof Stripe.errors.StripeCardError) {
    const byCode: Record<string, BillingErrorKey> = {
      card_declined: "cardDeclined",
      insufficient_funds: "insufficientFunds",
      expired_card: "expiredCard",
      incorrect_cvc: "incorrectCvc",
      processing_error: "processingError",
      authentication_required: "authenticationRequired",
    };
    const code = err.decline_code ?? err.code ?? "";
    return new BillingError(
      byCode[code] ?? byCode[err.code ?? ""] ?? "paymentNotApproved",
      402,
      "card_error",
    );
  }
  if (err instanceof Stripe.errors.StripeError) {
    console.error("[billing] Stripe error", err.type, err.code, err.message);
    return new BillingError("processorUnavailable", 502, "stripe_error");
  }
  console.error("[billing] unexpected error", err);
  return new BillingError("unexpected", 500, "unexpected");
}
