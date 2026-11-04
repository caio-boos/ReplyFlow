/** Hard cap so a campaign document stays well under Firestore's 1 MB limit. */
export const MAX_CAMPAIGN_RECIPIENTS = 2000;

export interface AudienceInput {
  productId: number;
  from: Date;
  to: Date;
  onlySubscribed: boolean;
}

/** Codes map to `compose.api.audience.*` translation keys. */
export type AudienceError = "invalidProduct" | "invalidPeriod" | "invalidRange";

/** Validates the product + date-range selection shared by preview and campaign creation. */
export function parseAudienceInput(
  body: Record<string, unknown>,
): AudienceInput | { error: AudienceError } {
  const productId = Number(body.productId);
  if (!Number.isFinite(productId) || productId <= 0) return { error: "invalidProduct" };

  const from = new Date(String(body.from ?? ""));
  const to = new Date(String(body.to ?? ""));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return { error: "invalidPeriod" };
  if (from > to) return { error: "invalidRange" };

  return { productId, from, to, onlySubscribed: body.onlySubscribed === true };
}

/** Replaces the personalization tokens available in bulk campaigns. */
export function applyTokens(
  template: string,
  vars: { name: string; product: string; order: string },
): string {
  return template
    .replace(/\{\{\s*nome\s*\}\}/gi, vars.name)
    .replace(/\{\{\s*produto\s*\}\}/gi, vars.product)
    .replace(/\{\{\s*pedido\s*\}\}/gi, vars.order);
}
