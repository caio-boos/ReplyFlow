import { NextRequest, NextResponse } from "next/server";
import { MEMBERSHIPS_COLLECTION } from "@/lib/auth/session";
import { PERMISSION_META, sanitizePermissions } from "@/lib/auth/permissions";
import { getAdminDb } from "@/lib/firebase/admin";
import { hashInviteToken } from "@/lib/team/invites";
import { getT } from "@/lib/i18n/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const t = await getT("auth");
  const tp = await getT("permissions");
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

  const accountsSnap = await db
    .collection("accounts")
    .where("userId", "==", data.ownerId)
    .get();
  const allowed = new Set<string>(
    Array.isArray(data.accountIds) ? data.accountIds : [],
  );

  return NextResponse.json({
    email: data.email as string,
    name: (data.name as string | null) ?? null,
    areas: sanitizePermissions(data.permissions).map((p) =>
      tp.dynamic(`${p}.label`, undefined, PERMISSION_META[p].label),
    ),
    stores: accountsSnap.docs
      .filter((d) => allowed.has(d.id))
      .map((d) => (d.data().label as string) ?? (d.data().email as string)),
  });
}
