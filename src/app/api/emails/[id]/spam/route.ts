import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();

  const ownedIds = await getOwnedAccountIds(db, session.uid);

  // Fetch the target email and verify ownership
  const emailDoc = await db.collection("emails").doc(id).get();
  if (!emailDoc.exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailData = emailDoc.data()!;
  if (!ownedIds.includes(emailData.accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customerId = emailData.customerId as string | undefined;

  // Block the customer
  if (customerId) {
    await db.collection("customers").doc(customerId).update({ blocked: true });

    // Cancel all pending/processing emails from this customer in the same account
    const pendingSnap = await db
      .collection("emails")
      .where("customerId", "==", customerId)
      .where("accountId", "==", emailData.accountId)
      .where("status", "in", ["pending", "processing"])
      .get();

    const batch = db.batch();
    pendingSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "cancelled", error: "Marked as spam" });
    });
    // Also cancel this specific email if not already cancelled
    if (!["cancelled"].includes(emailData.status)) {
      batch.update(emailDoc.ref, {
        status: "cancelled",
        error: "Marked as spam",
      });
    }
    await batch.commit();
  } else {
    // No customer — just cancel this email
    await emailDoc.ref.update({ status: "cancelled", error: "Marked as spam" });
  }

  return NextResponse.json({ ok: true });
}
