import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getOrderByCheckoutToken } from "@/lib/shopify/client";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Global max window for the Firestore query — per-account window is applied after grouping
const MAX_LOOKBACK_DAYS = 60;
const DEFAULT_LOOKBACK_DAYS = 7;

/** Minimum ms between consecutive Shopify API calls to stay well under 2 req/s limit */
const SHOPIFY_CALL_INTERVAL_MS = 600;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  const since = Timestamp.fromDate(
    new Date(Date.now() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
  );

  // Fetch remarketing docs that were sent but not yet confirmed as recovered
  const snap = await db
    .collection("remarketing")
    .where("status", "in", ["sent", "replied"])
    .where("sentAt", ">=", since)
    .get();

  if (snap.empty) {
    return NextResponse.json({ message: "Nothing to check", recovered: 0 });
  }

  // Group by accountId to minimise account doc fetches
  const byAccount = new Map<string, typeof snap.docs>();
  for (const doc of snap.docs) {
    const aid = doc.data().accountId as string;
    if (!byAccount.has(aid)) byAccount.set(aid, []);
    byAccount.get(aid)!.push(doc);
  }

  let totalRecovered = 0;

  for (const [accountId, docs] of byAccount.entries()) {
    const accountDoc = await db.collection("accounts").doc(accountId).get();
    if (!accountDoc.exists) continue;

    const accountData = accountDoc.data()!;
    if (!accountData.shopifyDomain || !accountData.encryptedShopifyToken) continue;

    let shopifyToken: string;
    try {
      shopifyToken = decrypt(accountData.encryptedShopifyToken);
    } catch {
      console.error(`check-recovery: failed to decrypt token for account ${accountId}`);
      continue;
    }

    const accountLookbackDays: number =
      typeof accountData.recoveryLookbackDays === "number" && accountData.recoveryLookbackDays > 0
        ? accountData.recoveryLookbackDays
        : DEFAULT_LOOKBACK_DAYS;
    const accountSince = new Date(Date.now() - accountLookbackDays * 24 * 60 * 60 * 1000);

    for (const doc of docs) {
      // Skip docs older than this account's specific lookback window
      const sentAt = doc.data().sentAt?.toDate?.() as Date | undefined;
      if (sentAt && sentAt < accountSince) continue;

      const checkoutToken = doc.data().checkoutId as string;
      if (!checkoutToken) continue;

      let order = null;
      try {
        order = await getOrderByCheckoutToken(
          accountData.shopifyDomain,
          shopifyToken,
          checkoutToken,
        );
      } catch (err) {
        console.error(`check-recovery: Shopify error for checkout ${checkoutToken}:`, err);
        continue;
      }

      // Throttle: ensure we never exceed Shopify's 2 req/s limit
      await sleep(SHOPIFY_CALL_INTERVAL_MS);

      if (!order) continue;

      // Checkout was converted to an order — mark as recovered
      await doc.ref.update({
        status: "recovered",
        recoveredOrderId: order.id,
        recoveredOrderName: order.name,
        recoveredAt: FieldValue.serverTimestamp(),
      });

      totalRecovered++;
      console.log(
        `check-recovery: checkout ${checkoutToken} recovered as order ${order.name} (account ${accountId})`,
      );
    }
  }

  return NextResponse.json({ message: "OK", checked: snap.size, recovered: totalRecovered });
}
