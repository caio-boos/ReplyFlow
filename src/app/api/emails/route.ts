import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const accountId = searchParams.get("accountId");
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);

  let query: FirebaseFirestore.Query = db.collection("emails").orderBy("receivedAt", "desc");

  if (status) query = query.where("status", "==", status);
  if (accountId) query = query.where("accountId", "==", accountId);

  const snap = await query.limit(limitParam).get();
  const emails = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      receivedAt: data.receivedAt ? { seconds: data.receivedAt.seconds, nanoseconds: data.receivedAt.nanoseconds } : null,
      scheduledReplyAt: data.scheduledReplyAt ? { seconds: data.scheduledReplyAt.seconds, nanoseconds: data.scheduledReplyAt.nanoseconds } : null,
      sentAt: data.sentAt ? { seconds: data.sentAt.seconds, nanoseconds: data.sentAt.nanoseconds } : null,
      createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null,
    };
  });

  return NextResponse.json({ emails });
}
