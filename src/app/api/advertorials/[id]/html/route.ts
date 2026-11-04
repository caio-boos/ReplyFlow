import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getT } from "@/lib/i18n/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tc = await getT("common");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const snap = await db.collection("advertorials").doc(id).get();

  if (!snap.exists || snap.data()?.userId !== session.uid) {
    return NextResponse.json({ error: tc("states.notFound") }, { status: 404 });
  }

  return NextResponse.json({ html: snap.data()?.html ?? "" });
}
