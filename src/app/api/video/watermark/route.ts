import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReplicateToken } from "@/lib/settings/integrations";
import { recordJob, uploadSourceVideo } from "@/lib/video/job-store";
import { createInpaintPrediction } from "@/lib/video/replicate";

export const maxDuration = 60;

// Limite de corpo das funções serverless da Vercel.
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;
// A máscara vira data URI (base64 infla ~33%); o Replicate recomenda < 1MB.
const MAX_MASK_BYTES = 700 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const video = form.get("video");
  const mask = form.get("mask");
  const fps = Number(form.get("fps")) || 30;
  const maskDilation = Math.min(24, Math.max(4, Number(form.get("maskDilation")) || 4));

  if (!(video instanceof File) || !(mask instanceof File)) {
    return NextResponse.json(
      { error: "Envie os arquivos 'video' e 'mask'." },
      { status: 400 },
    );
  }
  if (video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Vídeo muito grande após a compressão. Use um clipe mais curto." },
      { status: 413 },
    );
  }
  if (mask.size > MAX_MASK_BYTES) {
    return NextResponse.json({ error: "Máscara muito grande." }, { status: 413 });
  }

  const token = await getReplicateToken(session.uid);
  if (!token) {
    return NextResponse.json(
      { error: "Configure seu token do Replicate em Configurações → Integrações." },
      { status: 428 },
    );
  }

  try {
    const source = await uploadSourceVideo(session.uid, "watermark", video);

    // A Files API devolve URLs sem extensão e o cog do ProPainter valida o
    // sufixo da máscara, então ela vai como data URI.
    const maskBase64 = Buffer.from(await mask.arrayBuffer()).toString("base64");

    const id = await createInpaintPrediction(token, {
      video: source.url,
      mask: `data:image/png;base64,${maskBase64}`,
      mask_dilation: maskDilation,
      // O cog carrega os pesos em half; fp16=false quebra com dtype mismatch.
      fp16: true,
      raft_iter: 30,
      neighbor_length: 15,
      ref_stride: 8,
      resize_ratio: 1,
      save_fps: fps,
    });

    await recordJob("watermark", id, session.uid, [source.path]);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[watermark] falha ao criar predição", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao enviar para o Replicate." },
      { status: 502 },
    );
  }
}
