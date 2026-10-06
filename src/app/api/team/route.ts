import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthContext,
  MEMBERSHIPS_COLLECTION,
} from "@/lib/auth/session";
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

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isOwner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb();
  const [membersSnap, accountsSnap] = await Promise.all([
    db.collection(MEMBERSHIPS_COLLECTION).where("ownerId", "==", ctx.uid).get(),
    db.collection("accounts").where("userId", "==", ctx.uid).get(),
  ]);

  const members = membersSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: data.email as string,
        name: (data.name as string | null) ?? null,
        status: data.status as string,
        permissions: sanitizePermissions(data.permissions),
        accountIds: Array.isArray(data.accountIds) ? data.accountIds : [],
        createdAt: data.createdAt?.seconds ?? 0,
        inviteExpiresAt: data.inviteExpiresAt ?? null,
      };
    })
    .filter((m) => m.status !== "revoked")
    .sort((a, b) => a.createdAt - b.createdAt);

  const accounts = accountsSnap.docs.map((d) => ({
    id: d.id,
    label: (d.data().label as string) ?? d.data().email,
    email: d.data().email as string,
  }));

  return NextResponse.json({ members, accounts });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isOwner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const email = String(body.email ?? "").toLowerCase().trim();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const permissions = sanitizePermissions(body.permissions);
  const requestedAccounts: string[] = Array.isArray(body.accountIds)
    ? body.accountIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (email === ctx.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Você não pode convidar a si mesmo" },
      { status: 400 },
    );
  }
  if (permissions.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos uma área de acesso" },
      { status: 400 },
    );
  }

  const db = getAdminDb();

  const accountsSnap = await db
    .collection("accounts")
    .where("userId", "==", ctx.uid)
    .get();
  const ownedIds = new Set(accountsSnap.docs.map((d) => d.id));
  const accountIds = requestedAccounts.filter((id) => ownedIds.has(id));

  if (accountIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos uma loja" },
      { status: 400 },
    );
  }

  const existing = await db
    .collection(MEMBERSHIPS_COLLECTION)
    .where("ownerId", "==", ctx.uid)
    .where("email", "==", email)
    .get();
  if (existing.docs.some((d) => d.data().status !== "revoked")) {
    return NextResponse.json(
      { error: "Este e-mail já faz parte da equipe" },
      { status: 409 },
    );
  }

  const sender = await findSenderAccount(db, ctx.uid);
  if (!sender) {
    return NextResponse.json(
      {
        error:
          "Configure uma conta de e-mail (SMTP) antes de convidar membros.",
      },
      { status: 400 },
    );
  }

  const { token, hash } = generateInviteToken();
  const inviteExpiresAt = Date.now() + INVITE_TTL_MS;

  const docRef = await db.collection(MEMBERSHIPS_COLLECTION).add({
    ownerId: ctx.uid,
    email,
    name: name || null,
    memberUid: null,
    status: "pending",
    permissions,
    accountIds,
    inviteTokenHash: hash,
    inviteExpiresAt,
    createdAt: FieldValue.serverTimestamp(),
    acceptedAt: null,
  });

  try {
    await sendInviteEmail({
      sender,
      to: email,
      workspaceName: sender.label,
      inviteUrl: `${appOrigin(req.url)}/convite/${token}`,
      areas: areaLabels(permissions),
    });
  } catch {
    await docRef.delete();
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail de convite. Verifique o SMTP." },
      { status: 502 },
    );
  }

  return NextResponse.json({ id: docRef.id, ok: true }, { status: 201 });
}
