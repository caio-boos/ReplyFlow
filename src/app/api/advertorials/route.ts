import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getT } from "@/lib/i18n/server";

const RESERVED_SLUGS = new Set([
  "dashboard", "accounts", "conversas", "customers", "context",
  "emails", "products", "remarketing", "stats", "tasks", "advertorials",
  "login", "register", "api",
]);

export async function GET() {
  const tc = await getT("common");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("advertorials")
    .where("userId", "==", session.uid)
    .orderBy("createdAt", "desc")
    .get();

  const advertorials = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title as string,
      slug: d.slug as string,
      customDomain: (d.customDomain as string | null) ?? null,
      active: d.active as boolean,
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ advertorials });
}

export async function POST(req: NextRequest) {
  const [t, tc] = await Promise.all([getT("marketing"), getT("common")]);
  const session = await getSession();
  if (!session) return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const body = await req.json();
  const title = body.title?.trim();
  const slug = body.slug?.trim();
  const html = body.html?.trim();

  if (!title || !slug || !html) {
    return NextResponse.json({ error: t("api.advertorialFieldsRequired") }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: t("api.slugInvalid") },
      { status: 400 }
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: t("api.slugReserved") }, { status: 400 });
  }

  const db = getAdminDb();

  const existing = await db
    .collection("advertorials")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: t("api.slugTaken") }, { status: 409 });
  }

  const now = new Date();
  const ref = await db.collection("advertorials").add({
    userId: session.uid,
    title,
    slug,
    html,
    customDomain: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
