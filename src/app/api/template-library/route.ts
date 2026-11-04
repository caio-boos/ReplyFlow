import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { FieldValue } from "firebase-admin/firestore";
import { TemplateType } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const t = await getT("compose");
  const tc = await getT("common");
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const accountId = req.nextUrl.searchParams.get("accountId");
  const type = req.nextUrl.searchParams.get("type") as TemplateType | null;

  if (!accountId || !type)
    return NextResponse.json(
      { error: t("api.accountAndTypeRequired") },
      { status: 400 },
    );

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId))
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  const snap = await db
    .collection("templateLibrary")
    .where("accountId", "==", accountId)
    .where("type", "==", type)
    .orderBy("createdAt", "desc")
    .get();

  const templates = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const t = await getT("compose");
  const tc = await getT("common");
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const body = await req.json();
  const { accountId, type, name, config } = body as {
    accountId: string;
    type: TemplateType;
    name: string;
    config: Record<string, unknown>;
  };

  if (!accountId || !type || !name || !config)
    return NextResponse.json(
      { error: t("api.templateFieldsRequired") },
      { status: 400 },
    );

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId))
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  const ref = db.collection("templateLibrary").doc();
  await ref.set({
    accountId,
    type,
    name,
    config,
    isActive: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}
