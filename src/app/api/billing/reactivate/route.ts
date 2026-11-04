import { NextResponse } from "next/server";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { reactivateSubscription } from "@/lib/billing/service";

export async function POST() {
  const { ctx, error } = await requireOwner();
  if (error) return error;
  try {
    const result = await reactivateSubscription(ctx.uid);
    return NextResponse.json({ ok: true, needsCheckout: result.needsCheckout });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
