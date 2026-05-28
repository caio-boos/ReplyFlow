import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchNewEmails } from "@/lib/email/imap";
import { decrypt } from "@/lib/crypto/encryption";
import { matchOrCreateCustomer } from "@/lib/customer/identifier";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const REPLY_DELAY_MINUTES = 10;

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
  const accountsSnap = await db.collection("accounts").where("active", "==", true).get();
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

      const scheduledReplyAt = new Date(
        email.receivedAt.getTime() + REPLY_DELAY_MINUTES * 60 * 1000
      );

      // Create email doc first to get its ID
      const emailRef = db.collection("emails").doc();

      // Identify/create customer
      const matchResult = await matchOrCreateCustomer({
        fromEmail: email.from,
        fromName: email.fromName,
        bodyText: email.bodyText,
        emailDocId: emailRef.id,
      });

      await emailRef.set({
        accountId: email.accountId,
        accountEmail: email.accountEmail,
        customerId: matchResult.customerId,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references,
        from: email.from,
        fromName: email.fromName,
        to: email.to,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        receivedAt: Timestamp.fromDate(email.receivedAt),
        scheduledReplyAt: Timestamp.fromDate(scheduledReplyAt),
        status: "pending",
        aiResponse: null,
        sentAt: null,
        error: null,
        createdAt: FieldValue.serverTimestamp(),
      });

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
