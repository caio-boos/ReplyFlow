import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const showCompleted = searchParams.get("completed") === "true";
  const accountId = searchParams.get("accountId");

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (ownedIds.length === 0) return NextResponse.json({ tasks: [] });

  const ids = accountId && ownedIds.includes(accountId) ? [accountId] : ownedIds;

  // Avoid composite index: equality filters only, sort in code.
  let query: FirebaseFirestore.Query = db.collection("tasks").where("accountId", "in", ids);
  if (!showCompleted) query = query.where("completed", "==", false);

  const snap = await query.limit(200).get();
  const tasks = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt ? { seconds: data.createdAt.seconds ?? data.createdAt._seconds, nanoseconds: 0 } : null,
      };
    })
    .sort((a, b) => {
      const aS = (a.createdAt as { seconds: number } | null)?.seconds ?? 0;
      const bS = (b.createdAt as { seconds: number } | null)?.seconds ?? 0;
      return bS - aS;
    })
    .slice(0, 100);

  return NextResponse.json({ tasks });
}
