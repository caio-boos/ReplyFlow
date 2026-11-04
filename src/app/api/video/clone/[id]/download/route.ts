import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getReplicateToken } from "@/lib/settings/integrations";
import { getJob } from "@/lib/video/job-store";
import { getPrediction } from "@/lib/video/replicate";

const ALLOWED_HOSTS = /(^|\.)replicate\.(delivery|com)$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }
  const t = await getT("tools");

  const { id } = await params;
  const job = await getJob("clone", id);
  if (!job || job.userId !== session.uid) {
    return NextResponse.json({ error: t("errors.jobNotFound") }, { status: 404 });
  }

  const token = await getReplicateToken(session.uid);
  if (!token) {
    return NextResponse.json({ error: t("errors.tokenNotConfigured") }, { status: 428 });
  }

  try {
    const prediction = await getPrediction(token, id);
    if (prediction.status !== "succeeded" || !prediction.output) {
      return NextResponse.json({ error: t("errors.resultNotReady") }, { status: 409 });
    }

    const target = new URL(prediction.output);
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.test(target.hostname)) {
      return NextResponse.json({ error: t("errors.unexpectedOutputUrl") }, { status: 502 });
    }

    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: t("errors.downloadFailed") }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
        "Content-Disposition": `attachment; filename="clone-${id}.mp4"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[clone] falha ao baixar resultado", err);
    return NextResponse.json({ error: t("errors.downloadFailed") }, { status: 502 });
  }
}
