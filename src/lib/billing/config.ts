import "server-only";
import type { EntitlementPolicy } from "./entitlements";

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function launchAtSeconds(): number | null {
  const raw = process.env.BILLING_LAUNCH_AT?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export interface BillingConfig {
  enabled: boolean;
  secretKey: string | null;
  webhookSecret: string | null;
  livemode: boolean;
  /** Contas criadas antes desta data são membros existentes (transição). */
  launchAt: number | null;
  legacyAccessDays: number;
  graceDays: number;
  firstChargeGraceDays: number;
  portalConfigurationId: string | null;
  legacyCouponId: string | null;
  /** UIDs com acesso ilimitado (ADMIN_UIDS, separados por vírgula). */
  adminUids: string[];
}

let warned = false;

export function getBillingConfig(): BillingConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;
  const launchAt = launchAtSeconds();
  const enabled = !!secretKey && launchAt !== null;

  if (secretKey && launchAt === null && !warned) {
    warned = true;
    console.warn(
      "[billing] STRIPE_SECRET_KEY definido, mas BILLING_LAUNCH_AT ausente/inválido — cobrança desativada.",
    );
  }

  return {
    enabled,
    secretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    livemode: !!secretKey && /^(sk|rk)_live_/.test(secretKey),
    launchAt,
    legacyAccessDays: intEnv("BILLING_LEGACY_ACCESS_DAYS", 30),
    graceDays: intEnv("BILLING_GRACE_DAYS", 7),
    firstChargeGraceDays: intEnv("BILLING_FIRST_CHARGE_GRACE_DAYS", 3),
    portalConfigurationId: process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || null,
    legacyCouponId: process.env.STRIPE_LEGACY_COUPON_ID?.trim() || null,
    adminUids: (process.env.ADMIN_UIDS ?? "")
      .split(/[\s,;]+/)
      .map((uid) => uid.trim())
      .filter(Boolean),
  };
}

export function getEntitlementPolicy(): EntitlementPolicy {
  const cfg = getBillingConfig();
  return {
    enabled: cfg.enabled,
    graceDays: cfg.graceDays,
    firstChargeGraceDays: cfg.firstChargeGraceDays,
    adminUids: cfg.adminUids,
  };
}
