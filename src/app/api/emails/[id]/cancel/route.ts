import { NextRequest, NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tc = await getT("common");
  const t = await getT("inbox");
  const session = await getSession();
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("emails").doc(id);
  const doc = await ref.get();

  if (!doc.exists)
    return NextResponse.json(
      { error: t("errors.emailNotFound") },
      { status: 404 },
    );

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(doc.data()?.accountId)) {
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });
  }

  if (doc.data()?.status !== "pending") {
    return NextResponse.json(
      { error: t("api.onlyPendingCancel") },
      { status: 400 },
    );
  }

  await ref.update({
    status: "cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
