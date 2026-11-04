import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/team/invites";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { createCheckoutSession } from "@/lib/billing/service";
import { isBillingInterval, isPlanId } from "@/lib/billing/plans";
import { getLocale, getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOwner();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (!isPlanId(body.plan) || !isBillingInterval(body.interval)) {
    const t = await getT("billing");
    return NextResponse.json({ error: t("errors.invalidPlan") }, { status: 400 });
  }

  try {
    const result = await createCheckoutSession({
      ownerUid: ctx.uid,
      email: ctx.email,
      plan: body.plan,
      interval: body.interval,
      origin: appOrigin(req.url),
      locale: await getLocale(),
    });
    return NextResponse.json(result);
  } catch (err) {
    return billingErrorResponse(err);
  }
}
