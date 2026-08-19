import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const docRef = db.collection("advertorials").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.userId !== session.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  for (const key of ["title", "html", "active"] as const) {
    if (key in body) updates[key] = body[key];
  }

  await docRef.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const docRef = db.collection("advertorials").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.userId !== session.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const customDomain = snap.data()?.customDomain as string | null;
  if (customDomain) {
    await removeVercelDomain(customDomain);
  }

  await docRef.delete();
  return NextResponse.json({ ok: true });
}

async function removeVercelDomain(domain: string) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return;

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
