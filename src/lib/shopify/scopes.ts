/**
 * Access scopes requested during the Shopify OAuth install.
 * Safe to import from client components — plain strings, no server dependencies.
 *
 * `read_all_orders` unlocks orders older than 60 days (Shopify only returns the last
 * 60 days without it), which the dashboard reports need for the 90-day/all-time filters.
 */
export const SHOPIFY_SCOPES = [
  "read_orders",
  "read_all_orders",
  "read_customers",
  "read_products",
] as const;

export const SHOPIFY_SCOPES_STRING = SHOPIFY_SCOPES.join(",");
