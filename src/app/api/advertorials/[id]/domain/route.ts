import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

async function vercelFetch(method: string, path: string, body?: object) {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  return fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function POST(
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
  const domain = body.domain?.trim()?.toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "domain é obrigatório" }, { status: 400 });
  }

  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Formato de domínio inválido" }, { status: 400 });
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return NextResponse.json(
      { error: "VERCEL_TOKEN e VERCEL_PROJECT_ID não configurados" },
      { status: 500 }
    );
  }

  // Remove previous domain from Vercel if switching
  const oldDomain = snap.data()?.customDomain as string | null;
  if (oldDomain && oldDomain !== domain) {
    await vercelFetch("DELETE", `/v9/projects/${projectId}/domains/${oldDomain}`);
  }

  const vercelRes = await vercelFetch("POST", `/v10/projects/${projectId}/domains`, {
    name: domain,
  });

  if (!vercelRes.ok) {
    const err = await vercelRes.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? "Falha ao registrar domínio no Vercel";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await docRef.update({ customDomain: domain, updatedAt: new Date() });
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
  if (!customDomain) return NextResponse.json({ ok: true });

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && projectId) {
    await vercelFetch("DELETE", `/v9/projects/${projectId}/domains/${customDomain}`);
  }

  await docRef.update({ customDomain: null, updatedAt: new Date() });
  return NextResponse.json({ ok: true });
}
