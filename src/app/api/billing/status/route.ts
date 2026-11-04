import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { billingErrorResponse, buildBillingSummary } from "@/lib/billing/http";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }
  try {
    return NextResponse.json(await buildBillingSummary(ctx));
  } catch (err) {
    return billingErrorResponse(err);
  }
}
