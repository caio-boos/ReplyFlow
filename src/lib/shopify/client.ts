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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ShopifyApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Shopify API ${status}: ${body}`);
    this.name = "ShopifyApiError";
  }
}

async function shopifyRequest(
  domain: string,
  token: string,
  endpoint: string,
  retries = 3,
  throwOnError = false,
): Promise<Response | null> {
  const base = domain.includes("myshopify.com") ? domain : `${domain}.myshopify.com`;
  const url = `https://${base}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 429) {
      if (attempt === retries) {
        console.error(`Shopify API rate limit exceeded after ${retries + 1} attempts for ${url}`);
        if (throwOnError) throw new ShopifyApiError(429, "rate limit");
        return null;
      }
      // Respect Retry-After header; default to exponential backoff (1s, 2s, 4s)
      const retryAfter = parseFloat(res.headers.get("Retry-After") ?? "0");
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 1000;
      console.warn(`Shopify 429 for ${url} — retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Shopify API error ${res.status} for ${url}: ${text}`);
      if (throwOnError) throw new ShopifyApiError(res.status, text);
      return null;
    }

    return res;
  }

  return null;
}

async function shopifyFetch(
  domain: string,
  token: string,
  endpoint: string,
  retries = 3,
): Promise<Record<string, unknown> | null> {
  const res = await shopifyRequest(domain, token, endpoint, retries);
  return res ? res.json() : null;
}

/** Extracts the `page_info` cursor from the REST `Link: <...>; rel="next"` header. */
function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (!part.includes('rel="next"')) continue;
    const match = part.match(/[?&]page_info=([^&>]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Walks Shopify's cursor pagination. `firstQuery` carries the filters; follow-up
 * pages may only send `limit`, `fields` and `page_info`.
 */
async function shopifyFetchAllPages(
  domain: string,
  token: string,
  resource: string,
  firstQuery: URLSearchParams,
  maxPages: number,
  throwOnError = false,
): Promise<Record<string, unknown>[]> {
  const limit = firstQuery.get("limit") ?? "250";
  const fields = firstQuery.get("fields");
  const out: Record<string, unknown>[] = [];
  let query = firstQuery.toString();

  for (let page = 0; page < maxPages; page++) {
    const res = await shopifyRequest(
      domain,
      token,
      `${resource}.json?${query}`,
      3,
      throwOnError,
    );
    if (!res) break;
    const body = (await res.json()) as Record<string, unknown>;
    const items = (body[resource] as Record<string, unknown>[]) ?? [];
    out.push(...items);

    const pageInfo = parseNextPageInfo(res.headers.get("Link"));
    if (!pageInfo || items.length === 0) break;

    const next = new URLSearchParams({ limit, page_info: pageInfo });
    if (fields) next.set("fields", fields);
    query = next.toString();
  }

  return out;
}

export interface AbandonedCheckoutLineItem {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
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

/**
 * Returns the order that was placed from a specific checkout token, or null
 * if the checkout was never completed. Used to detect recovered carts.
 */
export async function getOrderByCheckoutToken(
  domain: string,
  token: string,
  checkoutToken: string,
): Promise<ShopifyOrder | null> {
  const data = await shopifyFetch(
    domain,
    token,
    `orders.json?checkout_token=${encodeURIComponent(checkoutToken)}&status=any`,
  );
  const orders = (data?.orders as Record<string, unknown>[]) ?? [];
  if (orders.length === 0) return null;
  return parseOrder(orders[0]);
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

export interface RefundedOrder {
  id: number;
  name: string;
  totalPrice: number;
  totalRefunded: number;
  currency: string;
  financialStatus: string;
  createdAt: string;
}

export async function getRefundedOrders(
  domain: string,
  token: string,
  sinceDate?: Date,
): Promise<RefundedOrder[]> {
  // Two separate calls — Shopify REST doesn't accept comma-separated financial_status
  const seen = new Set<number>();
  const result: RefundedOrder[] = [];

  for (const status of ["refunded", "partially_refunded"] as const) {
    const params = new URLSearchParams({ status: "any", financial_status: status, limit: "250" });
    if (sinceDate) params.set("created_at_min", sinceDate.toISOString());

    const data = await shopifyFetch(domain, token, `orders.json?${params}`);
    const orders = (data?.orders as Record<string, unknown>[]) ?? [];


    for (const order of orders) {
      const id = order.id as number;
      if (seen.has(id)) continue; // dedupe — a refunded order won't appear twice but be safe
      seen.add(id);

      const refunds = (order.refunds as Record<string, unknown>[]) ?? [];
      let totalRefunded = 0;
      for (const refund of refunds) {
        const transactions = (refund.transactions as Record<string, unknown>[]) ?? [];
        for (const txn of transactions) {
          if (txn.kind === "refund" && txn.status === "success") {
            totalRefunded += parseFloat((txn.amount as string) ?? "0");
          }
        }
      }
      // Shopify void/auto-cancel: refunds[] is empty but current_total_price dropped to 0
      if (totalRefunded === 0 && order.financial_status === "refunded") {
        const currentPrice = parseFloat((order.current_total_price as string) ?? "1");
        if (currentPrice === 0) totalRefunded = parseFloat((order.total_price as string) ?? "0");
      }
      result.push({
        id,
        name: order.name as string,
        totalPrice: parseFloat((order.total_price as string) ?? "0"),
        totalRefunded,
        currency: (order.currency as string) ?? "USD",
        financialStatus: (order.financial_status as string) ?? "refunded",
        createdAt: (order.created_at as string) ?? "",
      });
    }
  }

  return result;
}

export interface ShopifyProductSummary {
  id: number;
  title: string;
  handle: string;
  status: string;
  imageUrl: string | null;
  productType: string | null;
  vendor: string | null;
}

/** Lists store products (newest first). Requires the `read_products` scope. */
export async function getShopifyProducts(
  domain: string,
  token: string,
  opts: { search?: string; maxPages?: number } = {},
): Promise<ShopifyProductSummary[]> {
  const params = new URLSearchParams({
    limit: "250",
    fields: "id,title,handle,status,image,product_type,vendor",
  });

  const products = await shopifyFetchAllPages(
    domain,
    token,
    "products",
    params,
    opts.maxPages ?? 4,
    true,
  );

  const search = opts.search?.trim().toLowerCase();

  return products
    .map((p) => {
      const image = p.image as Record<string, unknown> | null;
      return {
        id: p.id as number,
        title: (p.title as string) ?? "",
        handle: (p.handle as string) ?? "",
        status: (p.status as string) ?? "active",
        imageUrl: (image?.src as string | undefined) ?? null,
        productType: (p.product_type as string) || null,
        vendor: (p.vendor as string) || null,
      };
    })
    .filter((p) => !search || p.title.toLowerCase().includes(search));
}

export interface ProductBuyer {
  email: string;
  name: string;
  orderId: number;
  orderName: string;
  orderDate: string;
  quantity: number;
  orderTotal: number;
  currency: string;
  acceptsMarketing: boolean;
}

/** Order states that must never receive a campaign. */
const EXCLUDED_FINANCIAL_STATUSES = new Set([
  "refunded",
  "partially_refunded",
  "voided",
]);

/**
 * Returns the unique buyers of a product within a date range, skipping orders
 * that were cancelled, refunded (fully or partially) or voided.
 */
export async function getProductBuyers(
  domain: string,
  token: string,
  productId: number,
  from: Date,
  to: Date,
  opts: { maxPages?: number } = {},
): Promise<ProductBuyer[]> {
  const params = new URLSearchParams({
    status: "any",
    limit: "250",
    created_at_min: from.toISOString(),
    created_at_max: to.toISOString(),
    fields:
      "id,name,email,contact_email,customer,created_at,cancelled_at,financial_status,line_items,current_total_price,total_price,currency,refunds,test",
  });

  const orders = await shopifyFetchAllPages(
    domain,
    token,
    "orders",
    params,
    opts.maxPages ?? 20,
    true,
  );

  const byEmail = new Map<string, ProductBuyer>();

  for (const order of orders) {
    if (order.test === true) continue;
    if (order.cancelled_at) continue;

    const financialStatus = ((order.financial_status as string) ?? "").toLowerCase();
    if (EXCLUDED_FINANCIAL_STATUSES.has(financialStatus)) continue;

    // Safety net: Shopify sometimes keeps `paid` while refunds[] is populated.
    const refunds = (order.refunds as Record<string, unknown>[]) ?? [];
    if (refunds.length > 0) continue;

    const lineItems = (order.line_items as Record<string, unknown>[]) ?? [];
    const matched = lineItems.filter((li) => (li.product_id as number) === productId);
    if (matched.length === 0) continue;

    const customer = order.customer as Record<string, unknown> | null;
    const rawEmail =
      (order.email as string | null) ??
      (order.contact_email as string | null) ??
      (customer?.email as string | null) ??
      "";
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

    const consent = customer?.email_marketing_consent as Record<string, unknown> | null;
    const acceptsMarketing =
      (consent?.state as string | undefined) === "subscribed" ||
      customer?.accepts_marketing === true;

    const name =
      `${(customer?.first_name as string) ?? ""} ${(customer?.last_name as string) ?? ""}`.trim() ||
      email.split("@")[0];

    const quantity = matched.reduce((sum, li) => sum + ((li.quantity as number) ?? 0), 0);
    const orderDate = (order.created_at as string) ?? "";

    const existing = byEmail.get(email);
    if (existing) {
      existing.quantity += quantity;
      // Keep the most recent order as the reference for personalization.
      if (orderDate > existing.orderDate) {
        existing.orderId = order.id as number;
        existing.orderName = (order.name as string) ?? "";
        existing.orderDate = orderDate;
      }
      continue;
    }

    byEmail.set(email, {
      email,
      name,
      orderId: order.id as number,
      orderName: (order.name as string) ?? "",
      orderDate,
      quantity,
      orderTotal: parseFloat((order.total_price as string) ?? "0"),
      currency: (order.currency as string) ?? "BRL",
      acceptsMarketing,
    });
  }

  return [...byEmail.values()].sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}
