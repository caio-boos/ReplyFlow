import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const showCompleted = searchParams.get("completed") === "true";
  const showAll = searchParams.get("all") === "true";
  const accountId = searchParams.get("accountId");

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (ownedIds.length === 0) return NextResponse.json({ tasks: [] });

  const ids =
    accountId && ownedIds.includes(accountId) ? [accountId] : ownedIds;

  // Firestore caps "in" at 30 values — chunk so accounts beyond the cap aren't dropped.
  const IN_CHUNK = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    chunks.push(ids.slice(i, i + IN_CHUNK));
  }

  const snaps = await Promise.all(
    chunks.map((chunk) => {
      // Avoid composite index: equality filters only, sort in code.
      let query: FirebaseFirestore.Query = db
        .collection("tasks")
        .where("accountId", "in", chunk);
      if (!showAll && !showCompleted)
        query = query.where("completed", "==", false);
      if (!showAll && showCompleted)
        query = query.where("completed", "==", true);
      return query.get();
    }),
  );

  const seen = new Set<string>();
  const tasks = snaps
    .flatMap((snap) => snap.docs)
    .filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    })
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt
          ? {
              seconds: data.createdAt.seconds ?? data.createdAt._seconds ?? 0,
              nanoseconds: 0,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aS = (a.createdAt as { seconds: number } | null)?.seconds ?? 0;
      const bS = (b.createdAt as { seconds: number } | null)?.seconds ?? 0;
      return bS - aS;
    })
    .slice(0, 500);

  return NextResponse.json({ tasks });
}
