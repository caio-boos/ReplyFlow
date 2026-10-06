import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, MEMBERSHIPS_COLLECTION, MEMBER_INDEX_COLLECTION } from "@/lib/auth/session";
import { sanitizePermissions } from "@/lib/auth/permissions";
import { getAdminDb } from "@/lib/firebase/admin";

export async function PATCH(
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
  if (!snap.exists || snap.data()?.ownerId !== ctx.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const permissions = sanitizePermissions(body.permissions);
  if (permissions.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos uma área de acesso" },
      { status: 400 },
    );
  }

  const accountsSnap = await db
    .collection("accounts")
    .where("userId", "==", ctx.uid)
    .get();
  const ownedIds = new Set(accountsSnap.docs.map((d) => d.id));
  const accountIds: string[] = (
    Array.isArray(body.accountIds) ? body.accountIds : []
  ).filter((v: unknown): v is string => typeof v === "string" && ownedIds.has(v));

  if (accountIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos uma loja" },
      { status: 400 },
    );
  }

  await ref.update({ permissions, accountIds });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
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

  const batch = db.batch();
  batch.delete(ref);
  if (data.memberUid) {
    batch.delete(db.collection(MEMBER_INDEX_COLLECTION).doc(data.memberUid));
  }
  await batch.commit();

  return NextResponse.json({ ok: true });
}
