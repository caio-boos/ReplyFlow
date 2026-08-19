import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

async function getTemplateAndVerifyOwner(id: string, uid: string) {
  const db = getAdminDb();
  const doc = await db.collection("templateLibrary").doc(id).get();
  if (!doc.exists) return { error: "Not found", status: 404, db, doc: null };

  const data = doc.data()!;
  const ownedIds = await getOwnedAccountIds(db, uid);
  if (!ownedIds.includes(data.accountId))
    return { error: "Forbidden", status: 403, db, doc: null };

  return { error: null, status: 200, db, doc };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error, status, db, doc } = await getTemplateAndVerifyOwner(
    id,
    session.uid,
  );
  if (error || !doc) return NextResponse.json({ error }, { status });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.config !== undefined) update.config = body.config;

  await db.collection("templateLibrary").doc(id).update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error, status, db, doc } = await getTemplateAndVerifyOwner(
    id,
    session.uid,
  );
  if (error || !doc) return NextResponse.json({ error }, { status });

  const data = doc.data()!;
  if (data.isActive)
    return NextResponse.json(
      { error: "Não é possível excluir o template ativo" },
      { status: 400 },
    );

  await db.collection("templateLibrary").doc(id).delete();
  return NextResponse.json({ success: true });
}
