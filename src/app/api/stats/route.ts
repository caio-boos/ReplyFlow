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

  // Fetch only accounts owned by this user
  const accountsSnap = await db.collection("accounts").where("userId", "==", session.uid).get();
  const accounts = accountsSnap.docs
    .sort((a, b) => (a.data().createdAt?.seconds ?? 0) - (b.data().createdAt?.seconds ?? 0))
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        label: data.label || data.email || d.id,
        email: data.email || "",
        shopifyConnected: !!data.encryptedShopifyToken,
      };
    });

  const ownedAccountIds = accounts.map((a) => a.id);

  if (ownedAccountIds.length === 0) {
    return NextResponse.json({
      month: { chargebacksAvoided: 0, refundsResolved: 0, valueAtRisk: 0, ordersWithValue: 0, emailsProcessed: 0, autoReplyRate: 0, aiCostUsd: 0 },
      allTime: { chargebacksAvoided: 0, refundsResolved: 0, valueAtRisk: 0, ordersWithValue: 0, emailsProcessed: 0, aiCostUsd: 0 },
      perAccount: [],
    });
  }

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

  // Narrow all fetched docs to owned accounts only
  const isOwned = (d: FirebaseFirestore.QueryDocumentSnapshot) =>
    ownedAccountIds.includes(d.data().accountId);

  const cbDocs = cbSnap.docs.filter(isOwned);
  const refundDocs = refundSnap.docs.filter(isOwned);
  const recentDocs = recentSnap.docs.filter(isOwned);
  const allSentDocs = allSentSnap.docs.filter(isOwned);

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

  const allTimeGlobal = aggregate(cbDocs, refundDocs);
  const monthGlobal = aggregate(cbDocs, refundDocs, thirtyDaysAgoMs);

  // Auto-reply rate (last 30 days)
  const recentEmails = recentDocs.map((d) => d.data());
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
    const accSentAll = allSentDocs.filter((d) => d.data().accountId === acc.id).length;
    const accSentMonth = recentDocs.filter(
      (d) => d.data().accountId === acc.id && d.data().status === "sent",
    ).length;

    // AI cost aggregation — sum aiCostUsd from all/recent docs for this account
    const accAiCostAllTime = allSentDocs
      .filter((d) => d.data().accountId === acc.id)
      .reduce((sum, d) => sum + (typeof d.data().aiCostUsd === "number" ? d.data().aiCostUsd : 0), 0);
    const accAiCostMonth = recentDocs
      .filter((d) => d.data().accountId === acc.id)
      .reduce((sum, d) => sum + (typeof d.data().aiCostUsd === "number" ? d.data().aiCostUsd : 0), 0);

    return {
      id: acc.id,
      label: acc.label,
      email: acc.email,
      shopifyConnected: acc.shopifyConnected,
      allTime: { ...allTime, emailsProcessed: accSentAll, aiCostUsd: accAiCostAllTime },
      month: { ...month, emailsProcessed: accSentMonth, aiCostUsd: accAiCostMonth },
    };
  });

  // Global AI cost totals
  const aiCostAllTime = allSentDocs.reduce(
    (sum, d) => sum + (typeof d.data().aiCostUsd === "number" ? d.data().aiCostUsd : 0), 0,
  );
  const aiCostMonth = recentDocs.reduce(
    (sum, d) => sum + (typeof d.data().aiCostUsd === "number" ? d.data().aiCostUsd : 0), 0,
  );

  return NextResponse.json({
    month: {
      ...monthGlobal,
      emailsProcessed: sentMonth,
      autoReplyRate,
      aiCostUsd: aiCostMonth,
    },
    allTime: {
      ...allTimeGlobal,
      emailsProcessed: allSentDocs.length,
      aiCostUsd: aiCostAllTime,
    },
    perAccount,
  });
}
