import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  COOKIE_NAME,
  sessionCookieOptions,
  resolveSessionClaims,
} from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { getUserLocale, saveUserLocale } from "@/lib/i18n/preferences";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  const t = await getT("auth");

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: t("api.invalidToken") }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: t("api.emailNotVerified") },
        { status: 403 },
      );
    }

    const claims = await resolveSessionClaims(decoded.uid);
    const token = await createSession(decoded.uid, decoded.email!, claims);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions);

    // Idioma: a escolha feita neste dispositivo vale e vira preferência da conta;
    // sem escolha local, aplica a preferência salva (vale entre dispositivos).
    const chosen = req.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(chosen)) {
      await saveUserLocale(decoded.uid, chosen);
    } else {
      const saved = await getUserLocale(decoded.uid);
      if (saved) {
        res.cookies.set(LOCALE_COOKIE, saved, {
          path: "/",
          maxAge: LOCALE_COOKIE_MAX_AGE,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

    return res;
  } catch {
    return NextResponse.json({ error: t("api.invalidCredentials") }, { status: 401 });
  }
}
