import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();

  const [customerDoc, emailsSnap] = await Promise.all([
    db.collection("customers").doc(id).get(),
    db.collection("emails").where("customerId", "==", id).orderBy("receivedAt", "asc").get(),
  ]);

  if (!customerDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emails = emailsSnap.docs.map((d) => {
    const data = d.data();
    const { bodyHtml: _omit, ...safe } = data;
    return { id: d.id, ...safe };
  });

  return NextResponse.json({ id: customerDoc.id, ...customerDoc.data(), emailsList: emails });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { blocked } = await req.json();
  if (typeof blocked !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("customers").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ref.update({ blocked });
  return NextResponse.json({ ok: true, blocked });
}
