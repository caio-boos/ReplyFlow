import { NextRequest, NextResponse } from "next/server";
import { createSession, COOKIE_NAME, MAX_AGE } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "E-mail não verificado. Verifique sua caixa de entrada e clique no link de confirmação." },
        { status: 403 },
      );
    }

    const token = await createSession(decoded.uid, decoded.email!);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }
}
