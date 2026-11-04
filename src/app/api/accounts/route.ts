import { NextRequest, NextResponse } from "next/server";
import { getOwnerSession, getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/crypto/encryption";
import { FieldValue } from "firebase-admin/firestore";
import { getT } from "@/lib/i18n/server";
import { assertWithinLimit } from "@/lib/billing/service";
import { billingErrorResponse } from "@/lib/billing/http";

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
  const tc = await getT("common");
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("accounts")
    .where("userId", "==", session.uid)
    .get();

  const allowed = session.allowedAccountIds
    ? new Set(session.allowedAccountIds)
    : null;

  const accounts = snap.docs
    .filter((d) => !allowed || allowed.has(d.id))
    .sort((a, b) => {
      const aT = a.data().createdAt?.seconds ?? 0;
      const bT = b.data().createdAt?.seconds ?? 0;
      return aT - bT;
    })
    .map((d) => {
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
  const tc = await getT("common");
  const t = await getT("stores");
  const session = await getOwnerSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

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
    replyLanguage,
  } = body;

  if (!label || !email || !password || !provider) {
    return NextResponse.json(
      { error: t("api.requiredFields") },
      { status: 400 },
    );
  }

  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.other;

  try {
    await assertWithinLimit(session.uid, "stores");
  } catch (err) {
    return billingErrorResponse(err);
  }

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
    replyLanguage: typeof replyLanguage === "string" && replyLanguage.trim() ? replyLanguage.trim() : "en",
    encryptedShopifyClientSecret: shopifyClientSecret?.trim()
      ? encrypt(shopifyClientSecret.trim())
      : null,
    userId: session.uid,
    encryptedShopifyToken: null,
    lastUid: 0,
    active: true,
    fantasyName: null,
    remarketingEnabled: false,
    testEmail: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id, ok: true }, { status: 201 });
}
