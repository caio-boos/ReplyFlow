import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { FieldValue } from "firebase-admin/firestore";

function serializeTimestamp(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const ts = value as { seconds?: number; _seconds?: number };
  return { seconds: ts.seconds ?? ts._seconds ?? 0, nanoseconds: 0 };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const statusFilter = searchParams.get("status"); // "open" | "done" | null (all)

  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (ownedIds.length === 0) return NextResponse.json({ annotations: [] });

  const ids =
    accountId && ownedIds.includes(accountId) ? [accountId] : ownedIds;

  // Firestore caps "in" filters — chunk so accounts beyond the cap aren't dropped.
  const IN_CHUNK = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    chunks.push(ids.slice(i, i + IN_CHUNK));
  }

  const snaps = await Promise.all(
    chunks.map((chunk) => {
      // Avoid composite index: equality filters only, sort in code.
      let query: FirebaseFirestore.Query = db
        .collection("annotations")
        .where("accountId", "in", chunk);
      if (statusFilter === "open" || statusFilter === "done")
        query = query.where("status", "==", statusFilter);
      return query.get();
    }),
  );

  const seen = new Set<string>();
  const annotations = snaps
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
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    })
    .sort((a, b) => {
      const aS = (a.createdAt as { seconds: number } | null)?.seconds ?? 0;
      const bS = (b.createdAt as { seconds: number } | null)?.seconds ?? 0;
      return bS - aS;
    })
    .slice(0, 500);

  return NextResponse.json({ annotations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!accountId || !title) {
    return NextResponse.json(
      { error: "accountId e title são obrigatórios" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const optional = (key: string) =>
    typeof body[key] === "string" && (body[key] as string).trim()
      ? (body[key] as string).trim()
      : null;

  const docRef = await db.collection("annotations").add({
    accountId,
    title,
    text,
    status: "open",
    linkedEmailId: optional("linkedEmailId"),
    linkedTaskId: optional("linkedTaskId"),
    orderNumber: optional("orderNumber"),
    customerName: optional("customerName"),
    // lowercase para casar com o remetente nas notificações de resposta
    customerEmail: optional("customerEmail")?.toLowerCase() ?? null,
    createdBy: session.actorUid ?? session.uid,
    createdByEmail: session.email ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: null,
  });

  return NextResponse.json({ id: docRef.id, ok: true }, { status: 201 });
}
