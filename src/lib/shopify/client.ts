const SHOPIFY_API_VERSION = "2024-10";

export interface ShopifyOrder {
  id: number;
  name: string; // "#1234"
  fulfillmentStatus: string | null;
  financialStatus: string;
  createdAt: string;
  cancelledAt: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingCompany: string | null;
  daysInTransit: number | null;
  lineItems: Array<{ title: string; quantity: number }>;
}

function parseOrder(order: Record<string, unknown>): ShopifyOrder {
  const fulfillments = (order.fulfillments as Record<string, unknown>[] | undefined) ?? [];
  const lastFulfillment = fulfillments[fulfillments.length - 1] as Record<string, unknown> | undefined;
  const trackingInfo = lastFulfillment
    ? (lastFulfillment.tracking_numbers as string[])?.[0] ?? null
    : null;
  const trackingUrl = lastFulfillment
    ? (lastFulfillment.tracking_urls as string[])?.[0] ?? null
    : null;
  const trackingCompany = lastFulfillment
    ? ((lastFulfillment.tracking_company as string) ?? null)
    : null;

  const shippedAt = lastFulfillment
    ? (lastFulfillment.created_at as string | undefined) ?? null
    : null;
  const daysInTransit = shippedAt
    ? Math.floor((Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const lineItems = ((order.line_items as Record<string, unknown>[]) ?? []).map((item) => ({
    title: item.title as string,
    quantity: item.quantity as number,
  }));

  return {
    id: order.id as number,
    name: order.name as string,
    fulfillmentStatus: (order.fulfillment_status as string | null) ?? null,
    financialStatus: order.financial_status as string,
    createdAt: order.created_at as string,
    cancelledAt: (order.cancelled_at as string | null) ?? null,
    trackingNumber: trackingInfo,
    trackingUrl,
    trackingCompany,
    daysInTransit,
    lineItems,
  };
}

async function shopifyFetch(
  domain: string,
  token: string,
  endpoint: string
): Promise<Record<string, unknown> | null> {
  const base = domain.includes("myshopify.com") ? domain : `${domain}.myshopify.com`;
  const url = `https://${base}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Shopify API error ${res.status} for ${url}: ${text}`);
    return null;
  }
  return res.json();
}

export async function getShopifyOrderByNumber(
  domain: string,
  token: string,
  orderNumber: string
): Promise<ShopifyOrder | null> {
  const clean = orderNumber.replace(/^#/, "");
  const data = await shopifyFetch(domain, token, `orders.json?name=%23${clean}&status=any`);
  const orders = (data?.orders as Record<string, unknown>[]) ?? [];
  if (orders.length === 0) return null;
  return parseOrder(orders[0]);
}

export async function getShopifyOrdersByEmail(
  domain: string,
  token: string,
  email: string
): Promise<ShopifyOrder[]> {
  const data = await shopifyFetch(
    domain,
    token,
    `orders.json?email=${encodeURIComponent(email)}&status=any&limit=5`
  );
  const orders = (data?.orders as Record<string, unknown>[]) ?? [];
  return orders.map(parseOrder);
}

export function formatOrderForAI(order: ShopifyOrder): string {
  const lines: string[] = [];
  lines.push(`Order: ${order.name}`);
  lines.push(`Status: ${order.fulfillmentStatus ?? "unfulfilled"} / Payment: ${order.financialStatus}`);
  if (order.cancelledAt) lines.push(`Cancelled at: ${new Date(order.cancelledAt).toLocaleDateString("en-US")}`);
  if (order.trackingNumber) lines.push(`Tracking: ${order.trackingNumber} (${order.trackingCompany ?? "carrier unknown"})`);
  if (order.trackingUrl) lines.push(`Tracking URL: ${order.trackingUrl}`);
  if (order.daysInTransit != null) lines.push(`Days in transit: ${order.daysInTransit}`);
  if (order.lineItems.length > 0) {
    lines.push(`Items: ${order.lineItems.map((i) => `${i.quantity}x ${i.title}`).join(", ")}`);
  }
  return lines.join("\n");
}
