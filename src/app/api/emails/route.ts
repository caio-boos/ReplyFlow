import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { Timestamp } from "firebase-admin/firestore";

const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const accountId = searchParams.get("accountId");
  const cursorSeconds = parseInt(searchParams.get("cursor") ?? "0", 10);
  // Legacy limit param still respected (e.g. from dashboard page)
  const limitParam = parseInt(
    searchParams.get("limit") ?? String(PAGE_SIZE),
    10,
  );

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (ownedIds.length === 0)
    return NextResponse.json({ emails: [], hasMore: false, nextCursor: 0 });

  const ids =
    accountId && ownedIds.includes(accountId) ? [accountId] : ownedIds;

  const slim = searchParams.get("slim") === "true";
  const sinceSeconds = parseInt(searchParams.get("since") ?? "0", 10);

  let query: FirebaseFirestore.Query = db
    .collection("emails")
    .orderBy("receivedAt", "desc");
  if (status) query = query.where("status", "==", status);
  query = query.where("accountId", "in", ids);
  if (sinceSeconds > 0) {
    query = query.where("receivedAt", ">=", Timestamp.fromMillis(sinceSeconds * 1000));
  }
  if (cursorSeconds > 0) {
    query = query.startAfter(Timestamp.fromMillis(cursorSeconds * 1000));
  }
  if (slim) {
    // Only return fields needed for the conversation list — omits bodyText/bodyHtml/aiResponse
    query = query.select(
      "accountId", "customerId", "from", "fromName", "subject",
      "status", "receivedAt", "chargebackRisk", "remarketing", "classifyConfidence",
    );
  }

  const snap = await query.limit(limitParam).get();
  const emails = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      receivedAt: data.receivedAt
        ? {
            seconds: data.receivedAt.seconds,
            nanoseconds: data.receivedAt.nanoseconds,
          }
        : null,
      scheduledReplyAt: data.scheduledReplyAt
        ? {
            seconds: data.scheduledReplyAt.seconds,
            nanoseconds: data.scheduledReplyAt.nanoseconds,
          }
        : null,
      sentAt: data.sentAt
        ? { seconds: data.sentAt.seconds, nanoseconds: data.sentAt.nanoseconds }
        : null,
      createdAt: data.createdAt
        ? {
            seconds: data.createdAt.seconds,
            nanoseconds: data.createdAt.nanoseconds,
          }
        : null,
    };
  });

  const hasMore = snap.docs.length >= limitParam;
  const nextCursor = hasMore
    ? (snap.docs[snap.docs.length - 1].data().receivedAt?.seconds ?? 0)
    : 0;

  return NextResponse.json({ emails, hasMore, nextCursor });
}
