import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { ReplyTemplateConfig } from "@/lib/types";

const DEFAULT_TEMPLATE: ReplyTemplateConfig = {
  primaryColor: "#1d4ed8",
  backgroundColor: "#f3f4f6",
  borderColor: "#e5e7eb",
  textColor: "#374151",
  footerBackgroundColor: "#f9fafb",
  footerTextColor: "#9ca3af",
  showLogo: false,
};

export { DEFAULT_TEMPLATE as DEFAULT_REPLY_TEMPLATE };

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId)
    return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await db.collection("replyTemplates").doc(accountId).get();
  const template = doc.exists
    ? { ...DEFAULT_TEMPLATE, ...(doc.data() as Partial<ReplyTemplateConfig>) }
    : DEFAULT_TEMPLATE;

  return NextResponse.json({ template });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accountId, template } = body as {
    accountId: string;
    template: ReplyTemplateConfig;
  };

  if (!accountId || !template)
    return NextResponse.json(
      { error: "accountId and template required" },
      { status: 400 },
    );

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .collection("replyTemplates")
    .doc(accountId)
    .set(template, { merge: true });

  return NextResponse.json({ success: true });
}
