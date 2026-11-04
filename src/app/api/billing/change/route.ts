import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { changePlan } from "@/lib/billing/service";
import { isBillingInterval, isPlanId } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOwner();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (!isPlanId(body.plan) || !isBillingInterval(body.interval)) {
    const t = await getT("billing");
    return NextResponse.json({ error: t("errors.invalidPlan") }, { status: 400 });
  }
  const prorationDate =
    typeof body.prorationDate === "number" ? Math.floor(body.prorationDate) : undefined;
  try {
    await changePlan(ctx.uid, body.plan, body.interval, prorationDate);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
