import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const doc = await db.collection("bulkCampaigns").doc(id).get();
  if (!doc.exists)
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  const data = doc.data()!;
  if (data.userId !== session.uid)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ campaign: { id: doc.id, ...data } });
}
