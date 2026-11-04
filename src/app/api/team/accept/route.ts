import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  MEMBERSHIPS_COLLECTION,
  MEMBER_INDEX_COLLECTION,
} from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { hashInviteToken } from "@/lib/team/invites";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const t = await getT("auth");
  const body = await req.json();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!token) {
    return NextResponse.json({ error: t("api.inviteInvalid") }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: t("api.passwordTooShort") },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const snap = await db
    .collection(MEMBERSHIPS_COLLECTION)
    .where("inviteTokenHash", "==", hashInviteToken(token))
    .limit(1)
    .get();

  const doc = snap.docs[0];
  const data = doc?.data();
  if (!doc || !data || data.status !== "pending") {
    return NextResponse.json(
      { error: t("api.inviteUsed") },
      { status: 404 },
    );
  }
  if (typeof data.inviteExpiresAt === "number" && data.inviteExpiresAt < Date.now()) {
    return NextResponse.json({ error: t("api.inviteExpired") }, { status: 410 });
  }

  const email = data.email as string;
  const auth = getAdminAuth();

  let uid: string;
  let usedExistingAccount = false;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    usedExistingAccount = true;
  } catch {
    const created = await auth.createUser({
      email,
      password,
      emailVerified: true,
      ...(name ? { displayName: name } : {}),
    });
    uid = created.uid;
  }

  if (usedExistingAccount) {
    const indexSnap = await db
      .collection(MEMBER_INDEX_COLLECTION)
      .doc(uid)
      .get();
    if (indexSnap.exists && indexSnap.data()?.membershipId !== doc.id) {
      return NextResponse.json(
        { error: t("api.emailInOtherTeam") },
        { status: 409 },
      );
    }
  }

  const batch = db.batch();
  batch.update(doc.ref, {
    memberUid: uid,
    status: "active",
    name: name || data.name || null,
    permVersion: Date.now(),
    inviteTokenHash: FieldValue.delete(),
    inviteExpiresAt: FieldValue.delete(),
    acceptedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection(MEMBER_INDEX_COLLECTION).doc(uid), {
    membershipId: doc.id,
    ownerId: data.ownerId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return NextResponse.json({ ok: true, email, usedExistingAccount });
}
