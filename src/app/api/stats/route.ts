import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Emails with explicit chargeback threat
  const cbSnap = await db
    .collection("emails")
    .where("chargebackRisk", "==", true)
    .where("status", "==", "sent")
    .get();

  // Emails where customer accepted a refund (conflict resolved proactively)
  const refundSnap = await db
    .collection("emails")
    .where("refundResolved", "==", true)
    .where("status", "==", "sent")
    .get();

  // All emails received in last 30 days (for rate calculation)
  const { Timestamp } = await import("firebase-admin/firestore");
  const recentSnap = await db
    .collection("emails")
    .where("receivedAt", ">=", Timestamp.fromMillis(thirtyDaysAgoMs))
    .get();

  const allCbDocs = cbSnap.docs.map((d) => d.data());
  const cb30 = allCbDocs.filter(
    (d) => d.sentAt && d.sentAt.seconds * 1000 >= thirtyDaysAgoMs,
  );

  const allRefundDocs = refundSnap.docs.map((d) => d.data());
  const refund30 = allRefundDocs.filter(
    (d) => d.sentAt && d.sentAt.seconds * 1000 >= thirtyDaysAgoMs,
  );

  // Avoid double-counting: emails that have both flags count only once for value
  const allProtectedDocs = [
    ...allCbDocs,
    ...allRefundDocs.filter((d) => !d.chargebackRisk),
  ];
  const protected30 = [...cb30, ...refund30.filter((d) => !d.chargebackRisk)];

  const chargebacksAllTime = allCbDocs.length;
  const chargebacksMonth = cb30.length;
  const refundsAllTime = allRefundDocs.length;
  const refundsMonth = refund30.length;

  const valueSavedAllTime = allProtectedDocs.reduce(
    (sum, d) => sum + (typeof d.orderValue === "number" ? d.orderValue : 0),
    0,
  );
  const valueSavedMonth = protected30.reduce(
    (sum, d) => sum + (typeof d.orderValue === "number" ? d.orderValue : 0),
    0,
  );

  const recentEmails = recentSnap.docs.map((d) => d.data());
  const sentMonth = recentEmails.filter((e) => e.status === "sent").length;
  const processedMonth = recentEmails.filter((e) =>
    ["sent", "failed", "cancelled"].includes(e.status),
  ).length;
  const autoReplyRate =
    processedMonth > 0 ? Math.round((sentMonth / processedMonth) * 100) : 0;

  // Count orders where value is known (for disclosure in UI)
  const ordersWithValue = allProtectedDocs.filter(
    (d) => typeof d.orderValue === "number" && d.orderValue > 0,
  ).length;
  const ordersWithValueMonth = protected30.filter(
    (d) => typeof d.orderValue === "number" && d.orderValue > 0,
  ).length;

  // All sent emails (all time) for total processed count
  const allSentSnap = await db
    .collection("emails")
    .where("status", "==", "sent")
    .get();
  const emailsProcessedAllTime = allSentSnap.size;

  return NextResponse.json({
    month: {
      chargebacksAvoided: chargebacksMonth,
      refundsResolved: refundsMonth,
      valueSaved: valueSavedMonth,
      emailsProcessed: sentMonth,
      autoReplyRate,
      ordersWithValue: ordersWithValueMonth,
    },
    allTime: {
      chargebacksAvoided: chargebacksAllTime,
      refundsResolved: refundsAllTime,
      valueSaved: valueSavedAllTime,
      emailsProcessed: emailsProcessedAllTime,
      ordersWithValue,
    },
  });
}
