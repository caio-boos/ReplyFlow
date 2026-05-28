import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db.collection("customers").orderBy("updatedAt", "desc").limit(100).get();
  const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ customers });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Manually link two customers together (merge)
  const { sourceId, targetId } = await req.json();
  if (!sourceId || !targetId) {
    return NextResponse.json({ error: "sourceId and targetId required" }, { status: 400 });
  }

  const db = getAdminDb();
  const [sourceDoc, targetDoc] = await Promise.all([
    db.collection("customers").doc(sourceId).get(),
    db.collection("customers").doc(targetId).get(),
  ]);

  if (!sourceDoc.exists || !targetDoc.exists) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const source = sourceDoc.data()!;
  const target = targetDoc.data()!;

  // Merge source into target
  await db.collection("customers").doc(targetId).update({
    emails: FieldValue.arrayUnion(...(source.emails ?? [])),
    orderNumbers: FieldValue.arrayUnion(...(source.orderNumbers ?? [])),
    linkedEmailIds: FieldValue.arrayUnion(...(source.linkedEmailIds ?? [])),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update all source's emails to point to target
  const emailIds: string[] = source.linkedEmailIds ?? [];
  const batch = db.batch();
  for (const emailId of emailIds) {
    batch.update(db.collection("emails").doc(emailId), { customerId: targetId });
  }
  await batch.commit();

  // Delete source customer
  await sourceDoc.ref.delete();

  return NextResponse.json({ ok: true, mergedInto: targetId });
}
