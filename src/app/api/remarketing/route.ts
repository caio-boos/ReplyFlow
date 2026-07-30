import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

  const db = getAdminDb();

  let snap;
  if (accountId) {
    snap = await db
      .collection("remarketing")
      .where("accountId", "==", accountId)
      .get();
  } else {
    snap = await db.collection("remarketing").get();
  }

  const docs = snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        accountId: d.accountId as string,
        shopDomain: d.shopDomain as string,
        checkoutId: d.checkoutId as string,
        customerEmail: d.customerEmail as string,
        customerName: d.customerName as string,
        cartValue: d.cartValue as number,
        currency: d.currency as string,
        lineItems: (d.lineItems ?? []) as Array<{ title: string; quantity: number; price: number }>,
        abandonedCheckoutUrl: d.abandonedCheckoutUrl as string,
        couponCode: d.couponCode as string,
        status: d.status as string,
        errorMessage: d.errorMessage as string | undefined,
        repliedEmailId: (d.repliedEmailId as string | null) ?? null,
        sentAt: d.sentAt?.toDate?.()?.toISOString() ?? null,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, limit);

  return NextResponse.json({ remarketing: docs });
}
