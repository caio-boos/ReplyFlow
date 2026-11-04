import { NextResponse } from "next/server";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { listInvoices } from "@/lib/billing/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, error } = await requireOwner();
  if (error) return error;
  try {
    return NextResponse.json({ invoices: await listInvoices(ctx.uid) });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
