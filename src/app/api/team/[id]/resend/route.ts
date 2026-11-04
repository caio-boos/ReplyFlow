import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, MEMBERSHIPS_COLLECTION } from "@/lib/auth/session";
import { sanitizePermissions } from "@/lib/auth/permissions";
import { getAdminDb } from "@/lib/firebase/admin";
import { getLocale, getT } from "@/lib/i18n/server";
import {
  INVITE_TTL_MS,
  appOrigin,
  areaLabels,
  findSenderAccount,
  generateInviteToken,
  sendInviteEmail,
} from "@/lib/team/invites";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = await getLocale();
  const tc = await getT("common");
  const t = await getT("team");
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  if (!ctx.isOwner)
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection(MEMBERSHIPS_COLLECTION).doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data || data.ownerId !== ctx.uid) {
    return NextResponse.json({ error: tc("states.notFound") }, { status: 404 });
  }
  if (data.status !== "pending") {
    return NextResponse.json(
      { error: t("api.alreadyAccepted") },
      { status: 400 },
    );
  }

  const sender = await findSenderAccount(db, ctx.uid);
  if (!sender) {
    return NextResponse.json(
      { error: t("api.smtpRequiredResend") },
      { status: 400 },
    );
  }

  const { token, hash } = generateInviteToken();
  await ref.update({
    inviteTokenHash: hash,
    inviteExpiresAt: Date.now() + INVITE_TTL_MS,
  });

  try {
    await sendInviteEmail({
      sender,
      to: data.email as string,
      workspaceName: sender.label,
      inviteUrl: `${appOrigin(req.url)}/convite/${token}`,
      areas: areaLabels(sanitizePermissions(data.permissions), locale),
      locale,
    });
  } catch {
    return NextResponse.json(
      { error: t("api.emailSendFailed") },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
