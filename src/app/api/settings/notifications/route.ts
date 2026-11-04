import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getNotificationEmail,
  setNotificationEmail,
} from "@/lib/settings/integrations";
import { getT } from "@/lib/i18n/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  const email = await getNotificationEmail(session.uid);
  return NextResponse.json({ notificationEmail: email });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  const { notificationEmail } = await req.json();
  if (
    typeof notificationEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail.trim())
  ) {
    const t = await getT("settings");
    return NextResponse.json(
      { error: t("notifications.errors.invalidEmail") },
      { status: 400 },
    );
  }

  await setNotificationEmail(session.uid, notificationEmail.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  await setNotificationEmail(session.uid, null);
  return NextResponse.json({ ok: true });
}
