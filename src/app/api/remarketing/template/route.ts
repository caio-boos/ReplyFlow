import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { RemarketingTemplateConfig } from "@/lib/types";

export const DEFAULT_TEMPLATE: RemarketingTemplateConfig = {
  // Cores
  primaryColor: "#1d4ed8",
  accentColor: "#fbbf24",
  backgroundColor: "#f3f4f6",
  textColor: "#111827",
  borderColor: "#e5e7eb",

  // Botão
  buttonColor: "#1d4ed8",
  buttonTextColor: "#ffffff",
  buttonBorderRadius: "6px",

  // Banner de desconto
  bannerBackgroundColor: "#fffbeb",
  bannerBorderColor: "#fbbf24",
  bannerTextColor: "#92400e",

  // Footer
  footerBackgroundColor: "#f9fafb",
  footerTextColor: "#9ca3af",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);

  if (!ownedIds.includes(accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await db.collection("remarketingTemplates").doc(accountId).get();

  if (!doc.exists) {
    return NextResponse.json({ template: DEFAULT_TEMPLATE });
  }

  return NextResponse.json({
    template: doc.data() as RemarketingTemplateConfig,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accountId, template } = body as {
    accountId: string;
    template: RemarketingTemplateConfig;
  };

  if (!accountId || !template) {
    return NextResponse.json(
      { error: "accountId and template required" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);

  if (!ownedIds.includes(accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .collection("remarketingTemplates")
    .doc(accountId)
    .set(
      {
        ...template,
        updatedAt: new Date(),
        updatedBy: session.uid,
      },
      { merge: true },
    );

  return NextResponse.json({ success: true });
}
