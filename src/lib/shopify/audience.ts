/** Hard cap so a campaign document stays well under Firestore's 1 MB limit. */
export const MAX_CAMPAIGN_RECIPIENTS = 2000;

export interface AudienceInput {
  productId: number;
  from: Date;
  to: Date;
  onlySubscribed: boolean;
}

/** Validates the product + date-range selection shared by preview and campaign creation. */
export function parseAudienceInput(
  body: Record<string, unknown>,
): AudienceInput | { error: string } {
  const productId = Number(body.productId);
  if (!Number.isFinite(productId) || productId <= 0)
    return { error: "Selecione um produto válido" };

  const from = new Date(String(body.from ?? ""));
  const to = new Date(String(body.to ?? ""));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return { error: "Informe um período de compra válido" };
  if (from > to) return { error: "A data inicial não pode ser maior que a final" };

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
