import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();

  const [customerDoc, emailsSnap] = await Promise.all([
    db.collection("customers").doc(id).get(),
    db
      .collection("emails")
      .where("customerId", "==", id)
      .orderBy("receivedAt", "asc")
      .get(),
  ]);

  if (!customerDoc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(customerDoc.data()?.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = emailsSnap.docs.map((d) => {
    const data = d.data();
    const { bodyHtml: _omit, ...safe } = data;
    return { id: d.id, ...safe };
  });

  return NextResponse.json({
    id: customerDoc.id,
    ...customerDoc.data(),
    emailsList: emails,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields: (keyof { blocked: boolean; pausedReplies: boolean })[] =
    ["blocked", "pausedReplies"];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body && typeof body[field] === "boolean") {
      update[field] = body[field];
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("customers").doc(id);
  const doc = await ref.get();
  if (!doc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(doc.data()?.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.update(update);
  return NextResponse.json({ ok: true, ...update });
}
