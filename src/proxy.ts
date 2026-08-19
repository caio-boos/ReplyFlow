import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

// Root-level segments that belong to authenticated areas
const RESERVED_SEGMENTS = new Set([
  "dashboard", "accounts", "conversas", "customers", "context",
  "emails", "products", "remarketing", "stats", "tasks", "advertorials",
  "login", "register", "api",
]);

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
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)))
    return NextResponse.next();

  // Allow root-level advertorial slug paths
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && !RESERVED_SEGMENTS.has(firstSegment)) {
    return NextResponse.next();
  }

  // Verify session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifySession(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
