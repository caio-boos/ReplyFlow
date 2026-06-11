import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmailHtml } from "@/lib/email/html-template";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let accountId: string,
    to: string,
    subject: string,
    body: string,
    customerId: string | undefined;
  let attachments: Array<{
    filename: string;
    contentType: string;
    data: string;
  }> = [];

  try {
    const parsed = await req.json();
    accountId = (parsed.accountId ?? "").trim();
    to = (parsed.to ?? "").trim();
    subject = (parsed.subject ?? "").trim();
    body = (parsed.body ?? "").trim();
    customerId =
      typeof parsed.customerId === "string" && parsed.customerId.trim()
        ? parsed.customerId.trim()
        : undefined;
    if (Array.isArray(parsed.attachments)) {
      attachments = (
        parsed.attachments as Array<Record<string, unknown>>
      ).filter(
        (a) =>
          a &&
          typeof a.filename === "string" &&
          typeof a.contentType === "string" &&
          typeof a.data === "string",
      ) as Array<{ filename: string; contentType: string; data: string }>;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!accountId || !to || !subject || !body) {
    return NextResponse.json(
      { error: "Campos obrigatórios: accountId, to, subject, body" },
      { status: 400 },
    );
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { error: "Endereço de e-mail do destinatário inválido" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const accountDoc = await db.collection("accounts").doc(accountId).get();
  if (!accountDoc.exists)
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  const accountData = accountDoc.data()!;
  const password = decrypt(accountData.encryptedPassword);

  try {
    const sendResult = await sendEmail(
      {
        smtpHost: accountData.smtpHost,
        smtpPort: accountData.smtpPort,
        email: accountData.email,
        password,
      },
      {
        to,
        subject,
        text: body,
        html: renderEmailHtml(body, accountData.label || accountData.email),
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    );

    const now = FieldValue.serverTimestamp();
    await db.collection("emails").add({
      accountId,
      accountEmail: accountData.email,
      from: to,
      fromName: "",
      subject,
      bodyText: "",
      aiResponse: body,
      status: "sent",
      direction: "outbound",
      customerId: customerId ?? null,
      receivedAt: now,
      scheduledReplyAt: now,
      sentAt: now,
      smtpMessageId: sendResult.messageId,
      smtpResponse: sendResult.smtpResponse,
      error: null,
      messageId: null,
      references: [],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
