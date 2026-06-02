import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateReply, extractFlags } from "@/lib/ai/openai";
import { sendEmail } from "@/lib/email/smtp";
import { decrypt } from "@/lib/crypto/encryption";
import {
  getCustomerEmailHistory,
  extractOrderNumbers,
} from "@/lib/customer/identifier";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  getShopifyOrderByNumber,
  getShopifyOrdersByEmail,
  formatOrderForAI,
} from "@/lib/shopify/client";

// Allow up to 5 minutes on Vercel Pro (cron processes 5/run × every minute = handles any volume)
export const maxDuration = 300;

// Emails per cron run — keep low to avoid timeout. Cron runs every minute so backlog drains quickly.
const BATCH_SIZE_CRON = 5;
const BATCH_SIZE_FORCE = 10; // when manually triggered from dashboard

// Vercel Cron Jobs send GET requests
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  try {
    const body = await req.json();
    force = body?.force === true;
  } catch {
    /* no body = normal cron call */
  }

  const db = getAdminDb();
  const now = Timestamp.now();

  // Find emails due for reply. When force=true, skip the scheduledReplyAt filter.
  const batchSize = force ? BATCH_SIZE_FORCE : BATCH_SIZE_CRON;
  const baseQuery = db.collection("emails").where("status", "==", "pending");
  const dueSnap = await (
    force
      ? baseQuery.limit(batchSize)
      : baseQuery.where("scheduledReplyAt", "<=", now).limit(batchSize)
  ).get();

  if (dueSnap.empty) {
    return NextResponse.json({ message: "No emails due", processed: 0 });
  }

  // Fetch AI context
  const contextDoc = await db.collection("config").doc("context").get();
  const systemContext =
    contextDoc.data()?.systemPrompt ??
    "Você é um assistente de atendimento ao cliente de uma loja de e-commerce.";

  let processed = 0;
  let failed = 0;

  for (const emailDoc of dueSnap.docs) {
    const emailRef = emailDoc.ref;

    // Mark as processing to prevent duplicate processing
    await emailRef.update({ status: "processing" });

    const emailData = emailDoc.data();

    try {
      // Get account credentials
      const accountDoc = await db
        .collection("accounts")
        .doc(emailData.accountId)
        .get();
      if (!accountDoc.exists) {
        await emailRef.update({ status: "failed", error: "Account not found" });
        failed++;
        continue;
      }

      const accountData = accountDoc.data()!;
      const password = decrypt(accountData.encryptedPassword);

      // Get full customer history
      const emailHistory = await getCustomerEmailHistory(emailData.customerId);

      // Lookup Shopify order if account has Shopify integration
      let orderInfo: string | null = null;
      let shopifyOrder: import("@/lib/shopify/client").ShopifyOrder | null = null;

      console.log(accountData.shopifyDomain, accountData.encryptedShopifyToken);

      if (accountData.shopifyDomain && accountData.encryptedShopifyToken) {
        try {
          const shopifyToken = decrypt(accountData.encryptedShopifyToken);
          const orderNumbers = extractOrderNumbers(
            (emailData.subject ?? "") + " " + (emailData.bodyText ?? ""),
          );

          console.log(`orderNumbers: ${orderNumbers}`);

          let order = null;
          for (const num of orderNumbers) {
            order = await getShopifyOrderByNumber(
              accountData.shopifyDomain,
              shopifyToken,
              num,
            );

            console.log(`order lookup for ${num} returned:`, order);

            if (order) break;
          }
          if (!order) {
            const orders = await getShopifyOrdersByEmail(
              accountData.shopifyDomain,
              shopifyToken,
              emailData.from,
            );
            if (orders.length > 0) order = orders[0];
          }
          if (order) {
            orderInfo = formatOrderForAI(order, accountData.trackingUrlTemplate);

            console.log("Found Shopify order for email:", orderInfo);

            shopifyOrder = order;
          }
        } catch (shopifyErr) {
          console.error("Shopify lookup failed (non-fatal):", shopifyErr);
        }
      }

      // Generate AI reply
      const aiResponse = await generateReply({
        systemContext,
        storeName: accountData.label || accountData.email,
        customerName: emailData.fromName || emailData.from,
        customerEmail: emailData.from,
        currentSubject: emailData.subject,
        currentEmailBody: emailData.bodyText,
        orderInfo,
        emailHistory,
      });

      if (!aiResponse) {
        throw new Error("OpenAI returned empty response");
      }

      // Send the email
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
        },
      );

      await emailRef.update({
        status: "sent",
        aiResponse,
        sentAt: FieldValue.serverTimestamp(),
        smtpMessageId: sendResult.messageId,
        smtpResponse: sendResult.smtpResponse,
        error: null,
      });

      // Extract flags and create tasks (non-blocking)
      try {
        const lastAiResponse =
          emailHistory.length > 0
            ? emailHistory[emailHistory.length - 1]?.aiResponse
            : undefined;
        const flags = await extractFlags(
          emailData.bodyText,
          aiResponse,
          lastAiResponse ?? undefined,
        );
        const flagUpdate: Record<string, unknown> = { flags };
        if (flags.chargeback_risk) {
          flagUpdate.chargebackRisk = true;
          flagUpdate.orderValue = shopifyOrder?.totalPrice ?? null;
        }
        if (flags.refund_pending) {
          flagUpdate.refundResolved = true;
          if (!flagUpdate.orderValue) {
            flagUpdate.orderValue = shopifyOrder?.totalPrice ?? null;
          }
        }
        await emailRef.update(flagUpdate);

        if (flags.tasks && flags.tasks.length > 0) {
          for (const taskDesc of flags.tasks) {
            const taskData = {
              emailId: emailDoc.id,
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
              createdAt: FieldValue.serverTimestamp(),
            };
            const ts = { seconds: Date.now() / 1000, nanoseconds: 0 };
            await db.collection("tasks").add({ ...taskData, createdAt: ts });
          }
        }
      } catch (flagsErr) {
        console.error("Failed to extract flags:", flagsErr);
      }

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to process email ${emailDoc.id}:`, message);
      await emailRef.update({ status: "failed", error: message.slice(0, 500) });
      failed++;
    }
  }

  return NextResponse.json({ message: "OK", processed, failed });
}
