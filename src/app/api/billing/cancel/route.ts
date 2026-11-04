import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { cancelSubscription } from "@/lib/billing/service";

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOwner();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : null;
  const comment = typeof body.comment === "string" ? body.comment.trim() : null;
  try {
    const record = await cancelSubscription(ctx.uid, reason, comment);
    return NextResponse.json({ ok: true, accessUntil: record.cancelAt ?? record.currentPeriodEnd });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
