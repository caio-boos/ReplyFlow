import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getReplicateToken } from "@/lib/settings/integrations";
import { getJob, releaseJobAssets } from "@/lib/video/job-store";
import { videoErrorMessage } from "@/lib/video/errors";
import { getPrediction } from "@/lib/video/replicate";

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

    const finished = ["succeeded", "failed", "canceled"].includes(prediction.status);
    if (finished && job.storagePaths.length > 0) {
      await releaseJobAssets("clone", id, job.storagePaths).catch(() => {});
    }
    return NextResponse.json({
      status: prediction.status,
      error: prediction.error,
      ready: prediction.status === "succeeded" && Boolean(prediction.output),
    });
  } catch (err) {
    console.error("[clone] falha ao consultar predição", err);
    return NextResponse.json(
      { error: videoErrorMessage(t, err, t("errors.jobStatusFailed")) },
      { status: 502 },
    );
  }
}
