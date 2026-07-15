import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const showCompleted = searchParams.get("completed") === "true";

  const accountId = searchParams.get("accountId");

  let query: FirebaseFirestore.Query = db.collection("tasks").orderBy("createdAt", "desc");
  if (!showCompleted) query = query.where("completed", "==", false);
  if (accountId) query = query.where("accountId", "==", accountId);

  const snap = await query.limit(100).get();
  const tasks = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt ? { seconds: data.createdAt.seconds ?? data.createdAt._seconds, nanoseconds: 0 } : null,
    };
  });

  return NextResponse.json({ tasks });
}
