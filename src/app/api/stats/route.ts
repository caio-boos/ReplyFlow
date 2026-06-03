import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const { Timestamp } = await import("firebase-admin/firestore");
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Fetch accounts (to get label + Shopify connection status)
  const accountsSnap = await db.collection("accounts").orderBy("createdAt", "asc").get();
  const accounts = accountsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: data.label || data.email || d.id,
      email: data.email || "",
      shopifyConnected: !!data.encryptedShopifyToken,
    };
  });

  // All chargeback-risk emails (sent)
  const cbSnap = await db
    .collection("emails")
    .where("chargebackRisk", "==", true)
    .where("status", "==", "sent")
    .get();

  // All refund-resolved emails (sent)
  const refundSnap = await db
    .collection("emails")
    .where("refundResolved", "==", true)
    .where("status", "==", "sent")
    .get();

  // Recent emails for rate calculation
  const recentSnap = await db
    .collection("emails")
    .where("receivedAt", ">=", Timestamp.fromMillis(thirtyDaysAgoMs))
    .get();

  const allSentSnap = await db
    .collection("emails")
    .where("status", "==", "sent")
    .get();

  // Helper to aggregate per group of docs
  function aggregate(cbDocs: FirebaseFirestore.QueryDocumentSnapshot[], refundDocs: FirebaseFirestore.QueryDocumentSnapshot[], sinceMs?: number) {
    const cbFiltered = sinceMs
      ? cbDocs.filter((d) => (d.data().sentAt?.seconds ?? 0) * 1000 >= sinceMs)
      : cbDocs;
    const refundFiltered = sinceMs
      ? refundDocs.filter((d) => (d.data().sentAt?.seconds ?? 0) * 1000 >= sinceMs)
      : refundDocs;

    // Avoid double-counting
    const refundOnly = refundFiltered.filter((d) => !d.data().chargebackRisk);
    const combined = [...cbFiltered, ...refundOnly];

    const valueAtRisk = combined.reduce(
      (sum, d) => sum + (typeof d.data().orderValue === "number" ? d.data().orderValue : 0),
      0,
    );
    const ordersWithValue = combined.filter(
      (d) => typeof d.data().orderValue === "number" && d.data().orderValue > 0,
    ).length;

    return {
      chargebacksAvoided: cbFiltered.length,
      refundsResolved: refundFiltered.length,
      valueAtRisk,
      ordersWithValue,
    };
  }

  const cbDocs = cbSnap.docs;
  const refundDocs = refundSnap.docs;

  const allTimeGlobal = aggregate(cbDocs, refundDocs);
  const monthGlobal = aggregate(cbDocs, refundDocs, thirtyDaysAgoMs);

  // Auto-reply rate (last 30 days)
  const recentEmails = recentSnap.docs.map((d) => d.data());
  const sentMonth = recentEmails.filter((e) => e.status === "sent").length;
  const processedMonth = recentEmails.filter((e) =>
    ["sent", "failed", "cancelled"].includes(e.status),
  ).length;
  const autoReplyRate =
    processedMonth > 0 ? Math.round((sentMonth / processedMonth) * 100) : 0;

  // Per-account breakdown
  const perAccount = accounts.map((acc) => {
    const accCbDocs = cbDocs.filter((d) => d.data().accountId === acc.id);
    const accRefundDocs = refundDocs.filter((d) => d.data().accountId === acc.id);

    const allTime = aggregate(accCbDocs, accRefundDocs);
    const month = aggregate(accCbDocs, accRefundDocs, thirtyDaysAgoMs);

    // Emails processed for this account
    const accSentAll = allSentSnap.docs.filter((d) => d.data().accountId === acc.id).length;
    const accSentMonth = recentSnap.docs.filter(
      (d) => d.data().accountId === acc.id && d.data().status === "sent",
    ).length;

    return {
      id: acc.id,
      label: acc.label,
      email: acc.email,
      shopifyConnected: acc.shopifyConnected,
      allTime: { ...allTime, emailsProcessed: accSentAll },
      month: { ...month, emailsProcessed: accSentMonth },
    };
  });

  return NextResponse.json({
    month: {
      ...monthGlobal,
      emailsProcessed: sentMonth,
      autoReplyRate,
    },
    allTime: {
      ...allTimeGlobal,
      emailsProcessed: allSentSnap.size,
    },
    perAccount,
  });
}
