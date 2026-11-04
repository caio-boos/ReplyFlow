import { NextResponse } from "next/server";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { retryOpenInvoice } from "@/lib/billing/service";

export async function POST() {
  const { ctx, error } = await requireOwner();
  if (error) return error;
  try {
    await retryOpenInvoice(ctx.uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
