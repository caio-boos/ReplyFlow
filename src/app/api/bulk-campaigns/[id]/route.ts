import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getT } from "@/lib/i18n/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const t = await getT("compose");
  const tc = await getT("common");
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const { id } = await params;
  const db = getAdminDb();
  const doc = await db.collection("bulkCampaigns").doc(id).get();
  if (!doc.exists)
    return NextResponse.json(
      { error: t("api.campaignNotFound") },
      { status: 404 },
    );

  const data = doc.data()!;
  if (data.userId !== session.uid)
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  return NextResponse.json({ campaign: { id: doc.id, ...data } });
}
