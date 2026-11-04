import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getT } from "@/lib/i18n/server";

// One-time migration: assigns all accounts without a userId to the current user.
// Run once after the first login with Firebase Auth.
export async function POST() {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  const db = getAdminDb();
  const allSnap = await db.collection("accounts").get();
  const unowned = allSnap.docs.filter((d) => !d.data().userId);

  if (unowned.length === 0) {
    const t = await getT("settings");
    return NextResponse.json({ migrated: 0, message: t("admin.noUnownedAccounts") });
  }

  const batch = db.batch();
  for (const doc of unowned) {
    batch.update(doc.ref, { userId: session.uid, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();

  return NextResponse.json({ migrated: unowned.length, ok: true });
}
