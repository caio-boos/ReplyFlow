import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth/jwt";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { saveUserLocale } from "@/lib/i18n/preferences";

/**
 * Define o idioma da interface. Público (usado na landing e no login);
 * se houver sessão, a preferência também é salva no perfil do usuário.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!isLocale(body.locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale: body.locale });
  res.cookies.set(LOCALE_COOKIE, body.locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (session) await saveUserLocale(session.uid, body.locale);

  return res;
}
