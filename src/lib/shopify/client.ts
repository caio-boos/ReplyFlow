const SHOPIFY_API_VERSION = "2024-10";

export interface ShopifyOrder {
  id: number;
  name: string; // "#1234"
  fulfillmentStatus: string | null;
  financialStatus: string;
  createdAt: string;
  cancelledAt: string | null;
  totalPrice: number | null;
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
    totalPrice: order.total_price ? parseFloat(order.total_price as string) : null,
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
  endpoint: string,
  options?: { method?: string; body?: string },
): Promise<Record<string, unknown> | null> {
  const base = domain.includes("myshopify.com") ? domain : `${domain}.myshopify.com`;
  const url = `https://${base}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const res = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: options?.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Shopify API error ${res.status} for ${url}: ${text}`);
    return null;
  }
  return res.json();
}

export interface AbandonedCheckoutLineItem {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  variantId?: number | null;
}

export interface AbandonedCheckout {
  id: number;
  token: string;
  email: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  lineItems: AbandonedCheckoutLineItem[];
  abandonedCheckoutUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAbandonedCheckouts(
  domain: string,
  token: string,
  sinceDate?: Date,
): Promise<AbandonedCheckout[]> {
  const params = new URLSearchParams({ limit: "250", status: "open" });
  if (sinceDate) params.set("created_at_min", sinceDate.toISOString());

  const data = await shopifyFetch(domain, token, `checkouts.json?${params}`);
  const checkouts = (data?.checkouts as Record<string, unknown>[]) ?? [];

  return checkouts
    .filter((c) => typeof c.email === "string" && (c.email as string).includes("@"))
    .map((c) => {
      const lineItems = ((c.line_items as Record<string, unknown>[]) ?? []).map(
        (item) => {
          const featuredImage = item.featured_image as Record<string, unknown> | null;
          const imageObj = item.image as Record<string, unknown> | null;
          const imageUrl =
            (featuredImage?.url as string | undefined) ??
            (imageObj?.src as string | undefined) ??
            undefined;
          return {
            title: item.title as string,
            quantity: item.quantity as number,
            price: parseFloat((item.price as string) ?? "0"),
            imageUrl,
            variantId: (item.variant_id as number | null) ?? null,
          };
        },
      );

      const billing = c.billing_address as Record<string, unknown> | null;
      const shipping = c.shipping_address as Record<string, unknown> | null;
      const firstName =
        (billing?.first_name as string) ?? (shipping?.first_name as string) ?? "";
      const lastName =
        (billing?.last_name as string) ?? (shipping?.last_name as string) ?? "";
      const customerName = `${firstName} ${lastName}`.trim() || (c.email as string);

      return {
        id: c.id as number,
        token: c.token as string,
        email: c.email as string,
        customerName,
        totalPrice: parseFloat((c.total_price as string) ?? "0"),
        currency: (c.currency as string) ?? "BRL",
        lineItems,
        abandonedCheckoutUrl: (c.abandoned_checkout_url as string) ?? "",
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string,
      };
    })
    .filter((c) => c.totalPrice > 0);
}

export async function createDraftOrder(
  domain: string,
  token: string,
  opts: {
    lineItems: Array<{ variantId: number; quantity: number }>;
    email: string;
    discountPercent: number;
    discountTitle: string;
    note?: string;
  },
): Promise<{ id: number; invoiceUrl: string } | null> {
  try {
    const body = JSON.stringify({
      draft_order: {
        line_items: opts.lineItems.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        applied_discount: {
          description: opts.discountTitle,
          value_type: "percentage",
          value: String(opts.discountPercent),
          title: opts.discountTitle,
        },
        email: opts.email,
        send_receipt: false,
        note: opts.note ?? "",
      },
    });

    const data = await shopifyFetch(domain, token, "draft_orders.json", {
      method: "POST",
      body,
    });

    const draft = data?.draft_order as Record<string, unknown> | undefined;
    if (!draft?.invoice_url) return null;

    return { id: draft.id as number, invoiceUrl: draft.invoice_url as string };
  } catch {
    return null;
  }
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

export function formatOrderForAI(order: ShopifyOrder, trackingUrlTemplate?: string | null): string {
  const lines: string[] = [];
  lines.push(`Order: ${order.name}`);
  lines.push(`Status: ${order.fulfillmentStatus ?? "unfulfilled"} / Payment: ${order.financialStatus}`);
  if (order.cancelledAt) lines.push(`Cancelled at: ${new Date(order.cancelledAt).toLocaleDateString("en-US")}`);
  if (order.trackingNumber) lines.push(`Tracking: ${order.trackingNumber} (${order.trackingCompany ?? "carrier unknown"})`);
  const trackingLink = trackingUrlTemplate && order.trackingNumber
    ? trackingUrlTemplate.replace("{{tracking_number}}", order.trackingNumber)
    : order.trackingUrl;
  if (trackingLink) lines.push(`Tracking URL: ${trackingLink}`);
  if (order.daysInTransit != null) lines.push(`Days in transit: ${order.daysInTransit}`);
  if (order.lineItems.length > 0) {
    lines.push(`Items: ${order.lineItems.map((i) => `${i.quantity}x ${i.title}`).join(", ")}`);
  }
  return lines.join("\n");
}
