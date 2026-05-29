import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { generateReply, extractFlags } from "@/lib/ai/openai";
import { sendEmail } from "@/lib/email/smtp";
import { getCustomerEmailHistory } from "@/lib/customer/identifier";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let resend = false;
  try {
    const body = await req.json();
    resend = body?.resend === true;
  } catch { /* no body */ }

  const db = getAdminDb();
  const emailRef = db.collection("emails").doc(id);
  const emailDoc = await emailRef.get();

  if (!emailDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailData = emailDoc.data()!;
  const allowedStatuses = resend
    ? ["sent", "failed", "cancelled", "pending"]
    : ["pending", "failed", "cancelled"];

  if (!allowedStatuses.includes(emailData.status)) {
    return NextResponse.json(
      { error: `Cannot send email with status "${emailData.status}"` },
      { status: 400 }
    );
  }

  await emailRef.update({ status: "processing" });

  try {
    const accountDoc = await db.collection("accounts").doc(emailData.accountId).get();
    if (!accountDoc.exists) {
      await emailRef.update({ status: "failed", error: "Account not found" });
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    const accountData = accountDoc.data()!;
    const password = decrypt(accountData.encryptedPassword);

    const contextDoc = await db.collection("config").doc("context").get();
    const systemContext =
      contextDoc.data()?.systemPrompt ??
      "Você é um assistente de atendimento ao cliente de uma loja de e-commerce.";

    const emailHistory = await getCustomerEmailHistory(emailData.customerId);

    // Use existing aiResponse if available and not a resend, otherwise regenerate
    let aiResponse: string = emailData.aiResponse ?? "";
    if (!aiResponse || resend) {
      aiResponse = await generateReply({
        systemContext,
        storeName: accountData.label || accountData.email,
        customerName: emailData.fromName || emailData.from,
        customerEmail: emailData.from,
        currentSubject: emailData.subject,
        currentEmailBody: emailData.bodyText,
        emailHistory,
      });
      if (!aiResponse) {
        throw new Error("OpenAI returned empty response");
      }
    }

    const sendResult = await sendEmail(
      {
        smtpHost: accountData.smtpHost,
        smtpPort: accountData.smtpPort,
        email: accountData.email,
        password,
      },
      {
        to: emailData.from,
        subject: emailData.subject,
        text: aiResponse,
        inReplyTo: emailData.messageId,
        references: [...(emailData.references ?? []), emailData.messageId],
      }
    );

    await emailRef.update({
      status: "sent",
      aiResponse,
      sentAt: FieldValue.serverTimestamp(),
      smtpMessageId: sendResult.messageId,
      smtpResponse: sendResult.smtpResponse,
      error: null,
    });

    // Extract flags (non-blocking)
    try {
      const lastAiResponse = emailHistory.length > 0
        ? emailHistory[emailHistory.length - 1]?.aiResponse
        : undefined;
      const flags = await extractFlags(emailData.bodyText, aiResponse, lastAiResponse ?? undefined);
      await emailRef.update({ flags });

      if (flags.tasks && flags.tasks.length > 0) {
        for (const taskDesc of flags.tasks) {
          await db.collection("tasks").add({
            emailId: id,
            customerId: emailData.customerId,
            accountId: emailData.accountId,
            accountEmail: accountData.email,
            customerName: emailData.fromName || emailData.from,
            emailSubject: emailData.subject,
            description: taskDesc,
            priority: flags.priority ?? "low",
            completed: false,
            flags: {
              chargeback_risk: flags.chargeback_risk ?? false,
              manual_review: flags.manual_review ?? false,
              refund_pending: flags.refund_pending ?? false,
              photos_received: flags.photos_received ?? false,
              carrier_problem: flags.carrier_problem ?? false,
              address_problem: flags.address_problem ?? false,
            },
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
          });
        }
      }
    } catch { /* flags are non-critical */ }

    return NextResponse.json({ ok: true, smtpResponse: sendResult.smtpResponse });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await emailRef.update({ status: "failed", error: message.slice(0, 500) });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
