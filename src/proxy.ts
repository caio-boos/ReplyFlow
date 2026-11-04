import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  createSession,
  shouldRefreshSession,
  sessionCookieOptions,
  COOKIE_NAME,
} from "@/lib/auth/jwt";
import {
  OWNER_ONLY,
  hasAccess,
  landingPathFor,
  requiredAccessFor,
} from "@/lib/auth/permissions";
import { getBillingConfig } from "@/lib/billing/config";
import { getEntitlement } from "@/lib/billing/store";
import { createT, localeFromRequest } from "@/lib/i18n/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/register", "/api/team/accept", "/api/locale"]);

const PUBLIC_PREFIXES = [
  "/login/",
  "/register/",
  "/convite/",
  "/api/auth/",
  "/api/shopify/",
  "/api/team/invite/",
  "/api/stripe/webhook",
];

// Root-level segments that belong to authenticated areas
const RESERVED_SEGMENTS = new Set([
  "dashboard", "accounts", "conversas", "customers", "context",
  "emails", "products", "remarketing", "stats", "tasks", "advertorials",
  "templates", "ferramentas", "membros", "sem-acesso", "planos", "perfil",
  "login", "register", "api",
]);

// Sempre acessíveis a quem está logado, qualquer que seja o status da assinatura —
// é por aqui que o usuário assina, paga ou regulariza.
const BILLING_EXEMPT_PREFIXES = [
  "/planos",
  "/perfil",
  "/sem-acesso",
  "/api/billing",
  "/api/auth",
];

function isBillingExempt(pathname: string): boolean {
  return BILLING_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`),
  );
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function paymentRequired(code: string, error: string, extra: object = {}) {
  return NextResponse.json({ error, code, ...extra }, { status: 402 });
}

/**
 * Bloqueio por assinatura. O estado vem do Firestore (sincronizado pelos
 * webhooks da Stripe), nunca do cliente.
 */
async function billingGate(
  req: NextRequest,
  ownerId: string,
  isOwner: boolean,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (!getBillingConfig().enabled || isBillingExempt(pathname)) return null;

  const isApi = pathname.startsWith("/api/");
  const t = createT(localeFromRequest(req), "shell");
  let ent;
  try {
    ent = await getEntitlement(ownerId);
  } catch (err) {
    console.error("[proxy] billing lookup failed", err);
    return isApi
      ? NextResponse.json({ error: t("billing.retryLater") }, { status: 503 })
      : null;
  }

  if (ent.mode === "blocked") {
    // Lista de lojas vazia não expõe nada e evita erros no layout.
    if (isApi && pathname === "/api/accounts" && req.method === "GET") return null;
    if (isApi) {
      return paymentRequired("subscription_required", t("billing.subscriptionRequired"));
    }
    return NextResponse.redirect(
      new URL(isOwner ? "/planos" : "/sem-acesso?motivo=assinatura", req.url),
    );
  }

  const requirement = requiredAccessFor(pathname);
  if (requirement && requirement !== OWNER_ONLY && !ent.features.includes(requirement)) {
    if (isApi) {
      return paymentRequired(
        "plan_upgrade_required",
        t("billing.planUpgradeRequired"),
        { feature: requirement },
      );
    }
    return NextResponse.redirect(
      new URL(
        isOwner ? `/planos?upgrade=${requirement}` : "/sem-acesso?motivo=plano",
        req.url,
      ),
    );
  }

  if (ent.mode === "readonly" && isApi && !SAFE_METHODS.has(req.method)) {
    return paymentRequired(
      "subscription_inactive",
      isOwner
        ? t("billing.readonlyOwner")
        : t("billing.readonlyMember"),
    );
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow cron routes (protected by CRON_SECRET header, not session)
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();

  // Custom domain requests serve public advertorial pages
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const mainDomain = (process.env.MAIN_DOMAIN ?? "reply.picdev.com.br").split(":")[0];
  const isCustomDomain =
    host !== mainDomain &&
    !host.includes("localhost") &&
    !host.endsWith(".vercel.app");
  if (isCustomDomain) return NextResponse.next();

  // Allow public paths
  if (
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Allow root-level advertorial slug paths
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && !RESERVED_SEGMENTS.has(firstSegment)) {
    return NextResponse.next();
  }

  // Verify session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: createT(localeFromRequest(req), "common")("states.unauthorized") },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifySession(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: createT(localeFromRequest(req), "common")("states.unauthorized") },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Permission gate — members only reach what the owner released to them.
  if (!session.isOwner) {
    if (session.permissions.length === 0) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: createT(localeFromRequest(req), "common")("states.forbidden") },
          { status: 403 },
        );
      }
      if (pathname !== "/sem-acesso") {
        return NextResponse.redirect(new URL("/sem-acesso", req.url));
      }
    } else {
      const requirement = requiredAccessFor(pathname);
      if (!hasAccess(requirement, session.isOwner, session.permissions)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
          { error: createT(localeFromRequest(req), "common")("states.forbidden") },
          { status: 403 },
        );
        }
        return NextResponse.redirect(
          new URL(landingPathFor(session.permissions), req.url),
        );
      }
    }
  }

  const blocked = await billingGate(req, session.ownerId, session.isOwner);
  if (blocked) return blocked;

  const res = NextResponse.next();
  if (shouldRefreshSession(session)) {
    const renewed = await createSession(session.uid, session.email, session);
    res.cookies.set(COOKIE_NAME, renewed, sessionCookieOptions);
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|logotipoproduto/).*)",
  ],
};
