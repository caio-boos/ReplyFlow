import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { fetchNewEmails } from "@/lib/email/imap";
import { decrypt } from "@/lib/crypto/encryption";
import { matchOrCreateCustomer } from "@/lib/customer/identifier";
import { classifyEmail, computeCostUsd } from "@/lib/ai/openai";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { EmailAttachment } from "@/lib/types";
import { randomUUID } from "crypto";

const REPLY_DELAY_MINUTES = 10;
const SHOPIFY_RELAY_DOMAINS = ["shopify.com", "myshopify.com"];

function isRelayAddress(address: string): boolean {
  const domain = address.toLowerCase().split("@")[1] ?? "";
  return SHOPIFY_RELAY_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`),
  );
}

// Contact-form notifications localize their labels, so match every storefront language.
const EMAIL_LABELS = [
  "e-?mail",
  "correo(?:\\s+electr[oó]nico)?",
  "courriel",
  "メール(?:アドレス)?",
  "邮箱",
  "電子郵件",
  "이메일",
  "البريد الإلكتروني",
  "почта",
];
const NAME_LABELS = [
  "name",
  "nome",
  "nombre",
  "nom",
  "名前",
  "お名前",
  "姓名",
  "이름",
  "الاسم",
  "имя",
];

const EMAIL_IN_TEXT = /[^\s<>()[\]{},;:"']+@[^\s<>()[\]{},;:"']+\.[a-z]{2,}/gi;

function labelledValue(bodyText: string, labels: string[]): string | null {
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:${labels.join("|")})[ \\t]*[:：][ \\t]*\\r?\\n?[ \\t]*([^\\r\\n]+)`,
    "i",
  );
  const match = bodyText.match(pattern);
  return match ? match[1].trim() : null;
}

function findEmails(text: string): string[] {
  return (text.match(EMAIL_IN_TEXT) ?? []).map((e) =>
    e.replace(/[.,;:]+$/, ""),
  );
}

/**
 * Shopify contact-form notifications are sent by a Shopify relay address; the real
 * customer's name/email live in the body. Never fall back to the relay address —
 * doing so would merge unrelated customers into one profile.
 */
function extractShopifyContactInfo(
  bodyText: string,
): { email: string; name: string } | null {
  const labelled = labelledValue(bodyText, EMAIL_LABELS);
  const candidates = labelled ? findEmails(labelled) : [];
  // Fallback: first non-relay address anywhere in the body.
  const email =
    candidates.find((c) => !isRelayAddress(c)) ??
    findEmails(bodyText).find((c) => !isRelayAddress(c));

  if (!email) return null;
  return {
    email: email.toLowerCase().trim(),
    name: labelledValue(bodyText, NAME_LABELS) ?? "",
  };
}

// Firestore field limit is ~1 MB. Strip inline base64 images which are the main culprit,
// then hard-truncate as a safety net.
const FIRESTORE_FIELD_BYTE_LIMIT = 800_000;

function sanitizeBodyHtml(html: string): string {
  // Remove base64-encoded src attributes (embedded images)
  const stripped = html.replace(/\ssrc="data:[^"]*"/gi, ' src=""');
  // Hard-truncate if still over the limit
  if (Buffer.byteLength(stripped, "utf8") > FIRESTORE_FIELD_BYTE_LIMIT) {
    return Buffer.from(stripped, "utf8")
      .slice(0, FIRESTORE_FIELD_BYTE_LIMIT)
      .toString("utf8");
  }
  return stripped;
}

function extractBase64ImagesFromHtml(
  html: string,
): Array<{ filename: string; contentType: string; data: Buffer }> {
  if (!html) return [];
  const results: Array<{
    filename: string;
    contentType: string;
    data: Buffer;
  }> = [];
  const regex = /src="data:(image\/[a-zA-Z+]+);base64,([^"]+)"/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const contentType = match[1].toLowerCase();
    const b64 = match[2];
    const data = Buffer.from(b64, "base64");
    if (data.byteLength > 10 * 1024 * 1024) continue;
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    results.push({
      filename: `inline-image-${++index}.${ext}`,
      contentType,
      data,
    });
  }

  console.log(`Extracted ${results.length} inline images from HTML body`);

  return results;
}

const UPLOAD_TIMEOUT_MS = 8_000;

async function uploadSingle(
  bucket: ReturnType<typeof getAdminStorage>,
  attachment: { filename: string; contentType: string; data: Buffer },
  emailDocId: string,
): Promise<EmailAttachment | null> {
  const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `attachments/${emailDocId}_${safeFilename}`;
  const file = bucket.file(storagePath);
  const token = randomUUID();

  const uploadPromise = file.save(attachment.data, {
    contentType: attachment.contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Upload timeout")), UPLOAD_TIMEOUT_MS),
  );

  try {
    await Promise.race([uploadPromise, timeoutPromise]);
    const encodedPath = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
    return {
      filename: attachment.filename,
      contentType: attachment.contentType,
      url,
    };
  } catch (err) {
    console.error(`Failed to upload attachment ${attachment.filename}:`, err);
    return null;
  }
}

async function uploadEmailAttachments(
  attachments: Array<{ filename: string; contentType: string; data: Buffer }>,
  emailDocId: string,
): Promise<EmailAttachment[]> {
  if (!attachments.length) return [];

  const bucket = getAdminStorage();

  const settled = await Promise.allSettled(
    attachments.map((a) => uploadSingle(bucket, a, emailDocId)),
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<EmailAttachment> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value);
}

// Vercel Cron Jobs send GET requests
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  // Fetch all active accounts
  const accountsSnap = await db
    .collection("accounts")
    .where("active", "==", true)
    .get();
  if (accountsSnap.empty) {
    return NextResponse.json({ message: "No active accounts", processed: 0 });
  }

  let totalFetched = 0;
  let totalSaved = 0;

  // Process accounts sequentially to avoid concurrent Firestore write conflicts
  for (const accountDoc of accountsSnap.docs) {
    const data = accountDoc.data();

    let password: string;
    try {
      password = decrypt(data.encryptedPassword);
    } catch {
      console.error(`Failed to decrypt password for account ${accountDoc.id}`);
      continue;
    }

    const credentials = {
      id: accountDoc.id,
      email: data.email,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      password,
      lastUid: data.lastUid ?? 0,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    };

    let emails;
    try {
      emails = await fetchNewEmails(credentials);
    } catch (err) {
      console.error(`IMAP error for account ${accountDoc.id}:`, err);
      continue;
    }

    totalFetched += emails.length;

    let maxUid = data.lastUid ?? 0;

    for (const email of emails) {
      // Our own outgoing replies can land back in the INBOX — never store them as
      // incoming customer messages, it makes the thread mix both sides.
      if (email.from.toLowerCase().trim() === data.email.toLowerCase().trim()) {
        maxUid = Math.max(maxUid, email.uid);
        continue;
      }

      // Check if this messageId was already saved
      const existing = await db
        .collection("emails")
        .where("messageId", "==", email.messageId)
        .limit(1)
        .get();

      if (!existing.empty) {
        maxUid = Math.max(maxUid, email.uid);
        continue;
      }

      // Check if this email is a reply to a remarketing campaign
      let remarketingDocId: string | null = null;
      const candidateMessageIds = [
        ...(email.inReplyTo ? [email.inReplyTo] : []),
        ...email.references,
      ];
      for (const msgId of candidateMessageIds) {
        if (!msgId) continue;
        const rmSnap = await db
          .collection("remarketing")
          .where("sentMessageId", "==", msgId)
          .limit(1)
          .get();
        if (!rmSnap.empty) {
          remarketingDocId = rmSnap.docs[0].id;
          break;
        }
      }

      // Classify email before saving — drop marketing/spam, flag critical alerts
      const classification = await classifyEmail(
        email.from,
        email.subject,
        email.bodyText,
      );
      const classifyCost = computeCostUsd("gpt-4o-mini", classification.usage);

      if (classification.type === "ignore") {
        console.log(
          `Ignored email from ${email.from}: ${classification.reason}`,
        );
        maxUid = Math.max(maxUid, email.uid);
        totalSaved; // not incrementing — intentionally skipped
        continue;
      }

      const scheduledReplyAt = new Date(
        email.receivedAt.getTime() + REPLY_DELAY_MINUTES * 60 * 1000,
      );

      // Create email doc first to get its ID
      const emailRef = db.collection("emails").doc();

      // Extract base64 inline images from HTML body only when there are no MIME attachments
      // (both forms represent the same image — avoid duplicates)
      const htmlInlineAttachments =
        email.attachments.length === 0
          ? extractBase64ImagesFromHtml(email.bodyHtml)
          : [];

      // Upload image attachments (MIME parts + HTML inline) to Firebase Storage
      const storedAttachments = await uploadEmailAttachments(
        [...email.attachments, ...htmlInlineAttachments],
        emailRef.id,
      );

      // When the email is a Shopify contact form notification, the real
      // customer info is embedded in the body — extract it.
      let effectiveFrom = email.from;
      let effectiveFromName = email.fromName;
      if (isRelayAddress(email.from)) {
        const shopifyContact = extractShopifyContactInfo(email.bodyText);
        if (shopifyContact) {
          effectiveFrom = shopifyContact.email;
          effectiveFromName = shopifyContact.name || email.fromName;
        } else if (email.replyTo && !isRelayAddress(email.replyTo)) {
          effectiveFrom = email.replyTo.toLowerCase().trim();
          effectiveFromName = email.replyToName || email.fromName;
        } else {
          // Unknown sender behind the relay: give it a unique identity so it is
          // never merged into a shared "mailer@shopify.com" customer profile.
          effectiveFrom = `unknown+${emailRef.id}@relay.invalid`;
          effectiveFromName = email.subject || "Contato via formulário";
        }
      }

      // Identify/create customer — scoped to this account to prevent cross-store mixing
      const matchResult = await matchOrCreateCustomer({
        fromEmail: effectiveFrom,
        fromName: effectiveFromName,
        bodyText: email.bodyText,
        emailDocId: emailRef.id,
        accountId: email.accountId,
      });

      // For alerts or blocked customers: save but mark as cancelled (no auto-reply)
      let emailStatus: string;
      if (remarketingDocId) {
        // Replies to remarketing emails are saved as cancelled — user handles them manually
        emailStatus = "cancelled";
      } else if (classification.type === "alert") {
        emailStatus = "cancelled";
      } else {
        // Check if the customer is blocked
        const customerDoc = await db
          .collection("customers")
          .doc(matchResult.customerId)
          .get();
        emailStatus =
          customerDoc.data()?.blocked === true ? "cancelled" : "pending";
      }

      await emailRef.set({
        accountId: email.accountId,
        accountEmail: email.accountEmail,
        customerId: matchResult.customerId,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references,
        from: effectiveFrom,
        fromName: effectiveFromName,
        to: email.to,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: sanitizeBodyHtml(email.bodyHtml),
        receivedAt: Timestamp.fromDate(email.receivedAt),
        scheduledReplyAt: Timestamp.fromDate(scheduledReplyAt),
        status: emailStatus,
        aiResponse: null,
        sentAt: null,
        error: null,
        attachments: storedAttachments,
        aiCostUsd: classifyCost,
        classifyConfidence: classification.confidence ?? "high",
        ...(remarketingDocId
          ? { remarketing: true, remarketingId: remarketingDocId }
          : {}),
        createdAt: FieldValue.serverTimestamp(),
      });

      // If this is a reply to a remarketing email, update the remarketing doc
      if (remarketingDocId) {
        await db.collection("remarketing").doc(remarketingDocId).update({
          status: "replied",
          repliedEmailId: emailRef.id,
        });
      }

      if (classification.type === "alert" && classification.taskDescription) {
        await db.collection("tasks").add({
          emailId: emailRef.id,
          customerId: matchResult.customerId,
          accountId: email.accountId,
          accountEmail: email.accountEmail,
          customerName: effectiveFromName || effectiveFrom,
          emailSubject: email.subject,
          description: classification.taskDescription,
          priority: "high",
          completed: false,
          flags: {
            chargeback_risk: false,
            manual_review: true,
            refund_pending: false,
            photos_received: false,
            carrier_problem: false,
            address_problem: false,
          },
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        });
      }

      maxUid = Math.max(maxUid, email.uid);
      totalSaved++;
    }

    // Update lastUid for the account
    if (maxUid > (data.lastUid ?? 0)) {
      await accountDoc.ref.update({ lastUid: maxUid });
    }
  }

  return NextResponse.json({
    message: "OK",
    accounts: accountsSnap.size,
    fetched: totalFetched,
    saved: totalSaved,
  });
}
