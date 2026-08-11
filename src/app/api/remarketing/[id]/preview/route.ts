import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { renderRemarketingEmailHtml } from "@/lib/email/html-template";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const doc = await db.collection("remarketing").doc(id).get();
  if (!doc.exists) return new NextResponse("Not found", { status: 404 });

  const d = doc.data()!;

  const accountDoc = await db
    .collection("accounts")
    .doc(d.accountId as string)
    .get();
  const language =
    (accountDoc.data()?.replyLanguage as string | undefined) ?? "pt-BR";
  const storeName =
    (accountDoc.data()?.fantasyName as string | undefined) ||
    (accountDoc.data()?.label as string | undefined) ||
    (d.shopDomain as string);

  // Buscar template customizado se existir
  const templateDoc = await db
    .collection("remarketingTemplates")
    .doc(d.accountId as string)
    .get();
  const customTemplate = templateDoc.exists ? templateDoc.data() : undefined;

  const html = renderRemarketingEmailHtml(
    {
      customerName: d.customerName as string,
      storeName,
      items: (
        (d.lineItems ?? []) as Array<{
          title: string;
          quantity: number;
          price: number;
          imageUrl?: string | null;
        }>
      ).map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl ?? undefined,
        currency: d.currency as string,
      })),
      totalPrice: d.cartValue as number,
      currency: d.currency as string,
      discountPercent: 20,
      checkoutUrl: d.abandonedCheckoutUrl as string,
      language,
    },
    customTemplate,
  );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
