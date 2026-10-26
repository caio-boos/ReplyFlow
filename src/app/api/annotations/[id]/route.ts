import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ref = db.collection("annotations").doc(id);
  const doc = await ref.get();
  if (!doc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(doc.data()?.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (body.status === "open" || body.status === "done")
    update.status = body.status;
  if (typeof body.title === "string" && body.title.trim())
    update.title = body.title.trim();
  if (typeof body.text === "string") update.text = body.text.trim();

  await ref.update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("annotations").doc(id);
  const doc = await ref.get();
  if (!doc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(doc.data()?.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
