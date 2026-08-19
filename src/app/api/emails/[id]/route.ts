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
  const doc = await db.collection("emails").doc(id).get();
  if (!doc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(doc.data()?.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ id: doc.id, ...doc.data() });
}
