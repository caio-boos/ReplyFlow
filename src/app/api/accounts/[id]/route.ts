import { NextRequest, NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/crypto/encryption";
import { FieldValue } from "firebase-admin/firestore";
import { getT } from "@/lib/i18n/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tc = await getT("common");
  const session = await getOwnerSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const db = getAdminDb();
  const ref = db.collection("accounts").doc(id);
  const doc = await ref.get();
  if (!doc.exists)
    return NextResponse.json({ error: tc("states.notFound") }, { status: 404 });

  if (doc.data()!.userId !== session.uid)
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  const allowedFields = [
    "label",
    "provider",
    "active",
    "pausedReplies",
    "imapHost",
    "imapPort",
    "smtpHost",
    "smtpPort",
    "shopifyDomain",
    "shopifyClientId",
    "trackingUrlTemplate",
    "systemPrompt",
    "logoUrl",
    "replyLanguage",
    "remarketingEnabled",
    "testEmail",
    "fantasyName",
    "recoveryLookbackDays",
    "couponCode",
    "discountPercent",
  ];
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field];
  }
  if (
    body.password &&
    typeof body.password === "string" &&
    body.password.trim()
  ) {
    update.encryptedPassword = encrypt(body.password.trim());
  }
  if (
    body.shopifyClientSecret &&
    typeof body.shopifyClientSecret === "string" &&
    body.shopifyClientSecret.trim()
  ) {
    update.encryptedShopifyClientSecret = encrypt(
      body.shopifyClientSecret.trim(),
    );
  }
  // Disconnect Shopify: clear token, credentials and domain
  if (body.disconnectShopify === true) {
    update.encryptedShopifyToken = null;
    update.encryptedShopifyClientSecret = null;
    update.shopifyClientId = null;
    update.shopifyDomain = null;
  }

  await ref.update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tc = await getT("common");
  const session = await getOwnerSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("accounts").doc(id);
  const doc = await ref.get();
  if (!doc.exists)
    return NextResponse.json({ error: tc("states.notFound") }, { status: 404 });

  if (doc.data()!.userId !== session.uid)
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
