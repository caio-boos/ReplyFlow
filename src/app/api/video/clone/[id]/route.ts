import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReplicateToken } from "@/lib/settings/integrations";
import { getJob, releaseJobAssets } from "@/lib/video/job-store";
import { getPrediction } from "@/lib/video/replicate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await getJob("clone", id);
  if (!job || job.userId !== session.uid) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  const token = await getReplicateToken(session.uid);
  if (!token) {
    return NextResponse.json({ error: "Token do Replicate não configurado." }, { status: 428 });
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
      { error: err instanceof Error ? err.message : "Falha ao consultar o job." },
      { status: 502 },
    );
  }
}
