import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/team/invites";
import { billingErrorResponse, requireOwner } from "@/lib/billing/http";
import { createPortalSession } from "@/lib/billing/service";
import { getLocale } from "@/lib/i18n/server";

const RETURN_PATHS = new Set(["/perfil?tab=assinatura", "/perfil/pagamento"]);

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOwner();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const flow = body.flow === "payment_method_update" ? "payment_method_update" : "default";
  const returnPath =
    typeof body.returnPath === "string" && RETURN_PATHS.has(body.returnPath)
      ? body.returnPath
      : "/perfil?tab=assinatura";
  try {
    const url = await createPortalSession(
      ctx.uid,
      `${appOrigin(req.url)}${returnPath}`,
      flow,
      await getLocale(),
    );
    return NextResponse.json({ url });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
