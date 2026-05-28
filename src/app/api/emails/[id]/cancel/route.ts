import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("emails").doc(id);
  const doc = await ref.get();

  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.data()?.status !== "pending") {
    return NextResponse.json({ error: "Only pending emails can be cancelled" }, { status: 400 });
  }

  await ref.update({ status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ ok: true });
}
