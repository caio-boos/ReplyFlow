import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "rf_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Once less than this is left, any authenticated request re-issues the cookie,
// so an active user is never logged out.
const REFRESH_THRESHOLD = 60 * 60 * 24 * 15; // 15 days

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  uid: string;
  email: string;
  exp?: number;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/",
};

export async function createSession(
  uid: string,
  email: string,
): Promise<string> {
  return new SignJWT({ uid, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      clockTolerance: 60,
    });
    return {
      uid: payload["uid"] as string,
      email: payload["email"] as string,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/** True when the cookie is past half its lifetime and should be renewed. */
export function shouldRefreshSession(session: SessionPayload): boolean {
  if (!session.exp) return true;
  return session.exp - Math.floor(Date.now() / 1000) < REFRESH_THRESHOLD;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export { COOKIE_NAME, MAX_AGE };
