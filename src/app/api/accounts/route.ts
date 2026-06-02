import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/crypto/encryption";
import { FieldValue } from "firebase-admin/firestore";

const PROVIDER_DEFAULTS: Record<
  string,
  { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number }
> = {
  godaddy: {
    imapHost: "imap.secureserver.net",
    imapPort: 993,
    smtpHost: "smtpout.secureserver.net",
    smtpPort: 465,
  },
  hostinger: {
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
  },
  other: { imapHost: "", imapPort: 993, smtpHost: "", smtpPort: 465 },
};

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("accounts")
    .orderBy("createdAt", "asc")
    .get();

  const accounts = snap.docs.map((d) => {
    const data = d.data();
    // Never return secrets to client
    const {
      encryptedPassword: _p,
      encryptedShopifyToken: _t,
      encryptedShopifyClientSecret: _s,
      ...safe
    } = data;
    return {
      id: d.id,
      ...safe,
      shopifyConnected: !!data.encryptedShopifyToken,
    };
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    label,
    provider,
    email,
    password,
    imapHost,
    imapPort,
    smtpHost,
    smtpPort,
    shopifyDomain,
    shopifyClientId,
    shopifyClientSecret,
    trackingUrlTemplate,
  } = body;

  if (!label || !email || !password || !provider) {
    return NextResponse.json(
      { error: "label, email, password and provider are required" },
      { status: 400 },
    );
  }

  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.other;

  const db = getAdminDb();
  const docRef = await db.collection("accounts").add({
    label,
    provider,
    email: email.toLowerCase().trim(),
    imapHost: imapHost || defaults.imapHost,
    imapPort: imapPort || defaults.imapPort,
    smtpHost: smtpHost || defaults.smtpHost,
    smtpPort: smtpPort || defaults.smtpPort,
    encryptedPassword: encrypt(password),
    shopifyDomain: shopifyDomain?.trim() || null,
    shopifyClientId: shopifyClientId?.trim() || null,
    trackingUrlTemplate: trackingUrlTemplate?.trim() || null,
    encryptedShopifyClientSecret: shopifyClientSecret?.trim()
      ? encrypt(shopifyClientSecret.trim())
      : null,
    encryptedShopifyToken: null,
    lastUid: 0,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id, ok: true }, { status: 201 });
}
