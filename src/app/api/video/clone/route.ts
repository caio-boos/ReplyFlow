import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReplicateToken } from "@/lib/settings/integrations";
import {
  buildEditPrompt,
  DEFAULT_VIDEO_EDIT_MODEL_ID,
  EDIT_INTENSITIES,
  EditIntensity,
  findVideoEditModel,
  VideoEditModel,
} from "@/lib/video/edit-models";
import { recordJob, uploadJobAsset, uploadSourceVideo, deleteJobAssets } from "@/lib/video/job-store";
import { createPrediction } from "@/lib/video/replicate";

export const maxDuration = 60;

// Limite de corpo das funções serverless da Vercel (~4,5MB no total).
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_PROMPT_CHARS = 2000;

// Mesma ideia do REPLICATE_INPAINT_MODEL: troca o slug do modelo padrão sem deploy de código.
const DEFAULT_MODEL_SLUG = process.env.REPLICATE_VIDEO_EDIT_MODEL;

const LUMA_MODES: Record<EditIntensity, string> = {
  subtle: "adhere_2",
  balanced: "flex_2",
  bold: "reimagine_2",
};

interface InputContext {
  videoUrl: string;
  prompt: string;
  referenceUrls: string[];
  intensity: EditIntensity;
}

function buildInput(
  model: VideoEditModel,
  { videoUrl, prompt, referenceUrls, intensity }: InputContext,
): { input: Record<string, unknown>; required: string[] } {
  switch (model.id) {
    case "kling":
      return {
        required: ["prompt", "reference_video"],
        input: {
          prompt,
          reference_video: videoUrl,
          // `base` é o modo de edição; `feature` usaria o vídeo só como referência de estilo.
          video_reference_type: "base",
          reference_images: referenceUrls.length > 0 ? referenceUrls : undefined,
          keep_original_sound: true,
          // `standard` entrega 720p, que é a resolução que o navegador envia.
          mode: "standard",
        },
      };
    case "wan":
      return {
        required: ["video", "prompt"],
        input: {
          video: videoUrl,
          prompt,
          reference_image: referenceUrls[0],
          resolution: "720p",
          aspect_ratio: "auto",
          audio_setting: "origin",
        },
      };
    case "luma":
      return {
        required: ["video", "prompt"],
        input: { video: videoUrl, prompt, mode: LUMA_MODES[intensity] },
      };
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const video = form.get("video");
  const prompt = String(form.get("prompt") ?? "").trim();
  const modelId = String(form.get("model") ?? DEFAULT_VIDEO_EDIT_MODEL_ID);
  const rawIntensity = String(form.get("intensity") ?? "subtle");
  const references = form.getAll("references").filter((item): item is File => item instanceof File);

  if (!(video instanceof File)) {
    return NextResponse.json({ error: "Envie o arquivo 'video'." }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json(
      { error: "Descreva as mudanças que você quer no vídeo." },
      { status: 400 },
    );
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `O prompt precisa ter até ${MAX_PROMPT_CHARS} caracteres.` },
      { status: 400 },
    );
  }

  const model = findVideoEditModel(modelId);
  if (!model) {
    return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
  }
  const intensity = (EDIT_INTENSITIES as readonly string[]).includes(rawIntensity)
    ? (rawIntensity as EditIntensity)
    : "subtle";

  if (video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Vídeo muito grande após a compressão. Use um trecho mais curto." },
      { status: 413 },
    );
  }
  if (references.length > model.maxReferenceImages) {
    return NextResponse.json(
      {
        error:
          model.maxReferenceImages === 0
            ? `${model.label} não aceita imagens de referência.`
            : `${model.label} aceita no máximo ${model.maxReferenceImages} imagem(ns) de referência.`,
      },
      { status: 400 },
    );
  }
  if (references.some((image) => image.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: "Imagem de referência muito grande." }, { status: 413 });
  }

  const token = await getReplicateToken(session.uid);
  if (!token) {
    return NextResponse.json(
      { error: "Configure seu token do Replicate em Configurações → Integrações." },
      { status: 428 },
    );
  }

  const uploaded: string[] = [];
  try {
    // Os cogs derivam o formato pela extensão da URL, então tudo vai pelo Storage.
    const source = await uploadSourceVideo(session.uid, "clone", video);
    uploaded.push(source.path);

    const referenceUrls: string[] = [];
    for (const image of references) {
      const asset = await uploadJobAsset(session.uid, "clone", image, "jpg", "image/jpeg");
      uploaded.push(asset.path);
      referenceUrls.push(asset.url);
    }

    const { input, required } = buildInput(model, {
      videoUrl: source.url,
      prompt: buildEditPrompt(model, prompt, intensity),
      referenceUrls,
      intensity,
    });

    const slug =
      model.id === DEFAULT_VIDEO_EDIT_MODEL_ID && DEFAULT_MODEL_SLUG
        ? DEFAULT_MODEL_SLUG
        : model.slug;

    const id = await createPrediction(token, slug, input, required);

    await recordJob("clone", id, session.uid, uploaded);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[clone] falha ao criar predição", err);
    await deleteJobAssets(uploaded).catch(() => {});
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao enviar para o Replicate." },
      { status: 502 },
    );
  }
}
