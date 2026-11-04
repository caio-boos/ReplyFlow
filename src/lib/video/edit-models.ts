export const EDIT_INTENSITIES = ["subtle", "balanced", "bold"] as const;
export type EditIntensity = (typeof EDIT_INTENSITIES)[number];

export type VideoEditModelId = "kling" | "wan" | "luma";

export interface VideoEditModel {
  id: VideoEditModelId;
  slug: string;
  /** Nome do modelo (marca). Resumo e placeholder ficam em `tools.clone.models.<id>`. */
  label: string;
  /** 0 quando o modelo não aceita imagens de referência. */
  maxReferenceImages: number;
  /** Kling só usa a imagem se ela for citada no prompt como `<<<image_N>>>`. */
  usesReferenceTags: boolean;
  minSeconds: number;
  maxSeconds: number;
  /** `true` quando a intensidade vira um parâmetro do modelo em vez de texto no prompt. */
  nativeIntensity: boolean;
}

/** Marcador que vincula uma imagem de referência a um trecho do prompt. */
export function referenceTag(index: number): string {
  return `<<<image_${index + 1}>>>`;
}

export const REFERENCE_TAG_PATTERN = /<<<image_\d+>>>/;

export const VIDEO_EDIT_MODELS: VideoEditModel[] = [
  {
    id: "kling",
    slug: "kwaivgi/kling-v3-omni-video",
    label: "Kling 3 Omni",
    maxReferenceImages: 4,
    usesReferenceTags: true,
    minSeconds: 3,
    maxSeconds: 10,
    nativeIntensity: false,
  },
  {
    id: "wan",
    slug: "wan-video/wan-2.7-videoedit",
    label: "Wan 2.7 VideoEdit",
    maxReferenceImages: 1,
    usesReferenceTags: false,
    minSeconds: 2,
    maxSeconds: 10,
    nativeIntensity: false,
  },
  {
    id: "luma",
    slug: "luma/modify-video",
    label: "Luma Modify Video",
    maxReferenceImages: 0,
    usesReferenceTags: false,
    minSeconds: 1,
    maxSeconds: 30,
    nativeIntensity: true,
  },
];

export const DEFAULT_VIDEO_EDIT_MODEL_ID: VideoEditModelId = "kling";

export function findVideoEditModel(id: string): VideoEditModel | undefined {
  return VIDEO_EDIT_MODELS.find((model) => model.id === id);
}

/**
 * Modelos sem parâmetro de intensidade recebem a instrução no próprio prompt.
 * Em inglês porque Kling e Wan aderem muito melhor nesse idioma; a UI mostra o
 * texto exato que é anexado.
 */
export const PRESERVATION_CLAUSE: Record<EditIntensity, string> = {
  subtle:
    "Keep the framing, camera movement, lighting and every other object in the scene exactly as in the original video. Change only what is described above.",
  balanced:
    "Preserve the motion, framing and composition of the original video while applying the change described above.",
  bold: "",
};

/** Prompt efetivo enviado ao modelo, já com a instrução de intensidade. */
export function buildEditPrompt(
  model: VideoEditModel,
  prompt: string,
  intensity: EditIntensity,
): string {
  const trimmed = prompt.trim();
  if (model.nativeIntensity) return trimmed;

  const clause = PRESERVATION_CLAUSE[intensity];
  return clause ? `${trimmed}\n\n${clause}` : trimmed;
}
