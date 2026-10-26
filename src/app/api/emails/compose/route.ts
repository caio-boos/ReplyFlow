import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmailHtml } from "@/lib/email/html-template";
import { matchOrCreateCustomer } from "@/lib/customer/identifier";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let accountId: string,
    to: string,
    subject: string,
    body: string,
    customerId: string | undefined,
    customerName: string;
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
    customerName =
      typeof parsed.customerName === "string" ? parsed.customerName.trim() : "";
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
    return NextResponse.json(
      { error: "Conta não encontrada" },
      { status: 404 },
    );

  const accountData = accountDoc.data()!;
  const password = decrypt(accountData.encryptedPassword);

  // Fetch reply template (non-blocking)
  let replyTemplate: import("@/lib/types").ReplyTemplateConfig | undefined;
  try {
    const replyTemplateDoc = await db
      .collection("replyTemplates")
      .doc(accountId)
      .get();
    if (replyTemplateDoc.exists)
      replyTemplate =
        replyTemplateDoc.data() as import("@/lib/types").ReplyTemplateConfig;
  } catch {
    // non-fatal
  }

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
        html: renderEmailHtml(
          body,
          accountData.label || accountData.email,
          replyTemplate,
          replyTemplate?.showLogo ? (accountData.logoUrl ?? null) : null,
        ),
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    );

    const now = FieldValue.serverTimestamp();
    const emailRef = db.collection("emails").doc();

    // Link the composed email to a customer (creating one if needed) so the
    // customer's future reply lands in the same conversation thread.
    let resolvedCustomerId = customerId ?? null;
    if (!resolvedCustomerId) {
      try {
        const match = await matchOrCreateCustomer({
          fromEmail: to,
          fromName: customerName,
          bodyText: `${subject}\n${body}`,
          emailDocId: emailRef.id,
          accountId,
        });
        resolvedCustomerId = match.customerId;
      } catch (err) {
        console.error("compose: failed to link customer:", err);
      }
    }

    await emailRef.set({
      accountId,
      accountEmail: accountData.email,
      from: to,
      fromName: customerName,
      subject,
      bodyText: "",
      aiResponse: body,
      status: "sent",
      direction: "outbound",
      customerId: resolvedCustomerId,
      receivedAt: now,
      scheduledReplyAt: now,
      sentAt: now,
      smtpMessageId: sendResult.messageId,
      smtpResponse: sendResult.smtpResponse,
      error: null,
      messageId: null,
      references: [],
    });

    return NextResponse.json({ ok: true, emailId: emailRef.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
