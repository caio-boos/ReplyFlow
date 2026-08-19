import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();

  const doc = await db.collection("templateLibrary").doc(id).get();
  if (!doc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = doc.data()!;
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(data.accountId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { accountId, type, config } = data;

  // Transaction: deactivate all templates of same type+account, activate this one,
  // and write config to the active store (for backward compat with send/cron routes)
  await db.runTransaction(async (tx) => {
    // Deactivate others
    const others = await db
      .collection("templateLibrary")
      .where("accountId", "==", accountId)
      .where("type", "==", type)
      .where("isActive", "==", true)
      .get();

    for (const other of others.docs) {
      if (other.id !== id) tx.update(other.ref, { isActive: false });
    }

    // Activate this one
    tx.update(db.collection("templateLibrary").doc(id), { isActive: true });

    // Update active store for backward compat
    const activeCollection =
      type === "reply" ? "replyTemplates" : "remarketingTemplates";
    tx.set(db.collection(activeCollection).doc(accountId), config, {
      merge: true,
    });
  });

  return NextResponse.json({ success: true });
}
