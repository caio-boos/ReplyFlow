import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, MEMBERSHIPS_COLLECTION } from "@/lib/auth/session";
import { sanitizePermissions } from "@/lib/auth/permissions";
import { getAdminDb } from "@/lib/firebase/admin";
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
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isOwner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection(MEMBERSHIPS_COLLECTION).doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data || data.ownerId !== ctx.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (data.status !== "pending") {
    return NextResponse.json(
      { error: "Este membro já aceitou o convite" },
      { status: 400 },
    );
  }

  const sender = await findSenderAccount(db, ctx.uid);
  if (!sender) {
    return NextResponse.json(
      { error: "Configure uma conta de e-mail (SMTP) antes de enviar convites." },
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
      areas: areaLabels(sanitizePermissions(data.permissions)),
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail. Verifique o SMTP." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
