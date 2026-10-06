import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { Rect } from "./mask-rects";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

let logSink: ((line: string) => void) | null = null;
let progressSink: ((ratio: number) => void) | null = null;

export function loadFFmpeg(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  if (loading) return loading;

  loading = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => logSink?.(message));
    ffmpeg.on("progress", ({ progress }) => progressSink?.(progress));

    const base = window.location.origin;
    await ffmpeg.load({
      classWorkerURL: `${base}/ffmpeg/worker/worker.js`,
      coreURL: `${base}/ffmpeg/core/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg/core/ffmpeg-core.wasm`,
    });

    instance = ffmpeg;
    return ffmpeg;
  })();

  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export interface Reporters {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
}

interface RunOptions extends Reporters {
  inputs: { name: string; data: File | Blob }[];
  args: string[];
  output: string;
}

async function run({
  inputs,
  args,
  output,
  onLog,
  onProgress,
}: RunOptions): Promise<Blob> {
  logSink = onLog ?? null;
  progressSink = onProgress ?? null;

  const ffmpeg = await loadFFmpeg();
  const written: string[] = [];

  try {
    for (const input of inputs) {
      await ffmpeg.writeFile(input.name, await fetchFile(input.data));
      written.push(input.name);
    }

    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new Error(`ffmpeg terminou com código ${code}.`);

    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    if (!data.length) throw new Error("O ffmpeg não gerou nenhum vídeo.");
    return new Blob([data as BlobPart], { type: "video/mp4" });
  } finally {
    logSink = null;
    progressSink = null;
    for (const name of [...written, output]) {
      await ffmpeg.deleteFile(name).catch(() => {});
    }
  }
}

function inputName(file: File): string {
  return `input.${file.name.split(".").pop()?.toLowerCase() || "mp4"}`;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface RemoveWatermarkOptions extends Reporters {
  file: File;
  rects: Rect[];
  width: number;
  height: number;
  range: TimeRange;
}

/** Modo rápido: interpolação de borda do filtro delogo, tudo no navegador. */
export async function removeWatermark({
  file,
  rects,
  width,
  height,
  range,
  ...reporters
}: RemoveWatermarkOptions): Promise<Blob> {
  const name = inputName(file);
  const filters = [
    `scale=${width}:${height}:flags=lanczos`,
    ...rects.map((r) => `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}`),
    "format=yuv420p",
  ].join(",");

  return run({
    ...reporters,
    inputs: [{ name, data: file }],
    output: "output.mp4",
    args: [
      "-i", name,
      "-ss", range.start.toFixed(3),
      "-t", Math.max(0.2, range.end - range.start).toFixed(3),
      "-vf", filters,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      "output.mp4",
    ],
  });
}

export interface CompressOptions extends Reporters {
  file: File;
  width: number;
  height: number;
  range: TimeRange;
  /** Reduz o orçamento quando a requisição leva outros anexos junto. */
  budgetBytes?: number;
}

export interface CompressResult {
  file: File;
  fps: number;
  hasAudio: boolean;
}

// Orçamento de upload: abaixo do limite de corpo de 4,5MB da Vercel.
const UPLOAD_BUDGET_BYTES = 3.4 * 1024 * 1024;
const AUDIO_KBPS = 96;

/**
 * Recorta o trecho escolhido e normaliza para 720p num fps inteiro. O bitrate
 * é limitado pela duração para caber no corpo da requisição sem um segundo
 * passe de encode.
 */
export async function compressForUpload({
  file,
  width,
  height,
  range,
  budgetBytes = UPLOAD_BUDGET_BYTES,
  onLog,
  onProgress,
}: CompressOptions): Promise<CompressResult> {
  logSink = onLog ?? null;
  progressSink = onProgress ?? null;

  const ffmpeg = await loadFFmpeg();
  const name = inputName(file);
  const output = "upload.mp4";

  try {
    await ffmpeg.writeFile(name, await fetchFile(file));

    let sourceFps = 0;
    let hasAudio = false;
    logSink = (line) => {
      if (!sourceFps && /Stream #\d+:\d+.*Video:/.test(line)) {
        const match = line.match(/,\s*(\d+(?:\.\d+)?)\s*fps/);
        if (match) sourceFps = Number(match[1]);
      }
      if (/Stream #\d+:\d+.*Audio:/.test(line)) hasAudio = true;
      onLog?.(line);
    };
    await ffmpeg.exec(["-i", name, "-frames:v", "1", "-f", "null", "-"]);
    logSink = onLog ?? null;

    // Inteiro para casar com o `save_fps` do ProPainter na composição final.
    const fps = Math.min(60, Math.max(1, Math.round(sourceFps || 30)));
    const clipDuration = Math.max(0.2, range.end - range.start);
    const budgetKbps = Math.max(
      800,
      Math.floor((budgetBytes * 8) / 1000 / clipDuration) - AUDIO_KBPS,
    );

    const code = await ffmpeg.exec([
      "-i", name,
      "-ss", range.start.toFixed(3),
      "-t", clipDuration.toFixed(3),
      "-vf", `scale=${width}:${height}:flags=lanczos,format=yuv420p`,
      "-r", String(fps),
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "21",
      "-maxrate", `${budgetKbps}k`,
      "-bufsize", `${budgetKbps * 2}k`,
      "-c:a", "aac",
      "-b:a", `${AUDIO_KBPS}k`,
      "-movflags", "+faststart",
      output,
    ]);
    if (code !== 0) throw new Error(`ffmpeg terminou com código ${code}.`);

    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    if (!data.length) throw new Error("Falha ao preparar o vídeo para envio.");

    return {
      file: new File([data as BlobPart], "source.mp4", { type: "video/mp4" }),
      fps,
      hasAudio,
    };
  } finally {
    logSink = null;
    progressSink = null;
    await ffmpeg.deleteFile(name).catch(() => {});
    await ffmpeg.deleteFile(output).catch(() => {});
  }
}

export interface ComposeOptions extends Reporters {
  original: File;
  inpainted: Blob;
  mask: Blob;
  width: number;
  height: number;
  fps: number;
  range: TimeRange;
  hasAudio: boolean;
}

/**
 * Monta o trecho final a partir do original, puxando da saída da IA apenas os
 * pixels dentro da máscara. O resto do quadro fica sem a perda do upload e o
 * áudio original é preservado.
 */
export async function composeFinal({
  original,
  inpainted,
  mask,
  width,
  height,
  fps,
  range,
  hasAudio,
  ...reporters
}: ComposeOptions): Promise<Blob> {
  const originalName = `original.${original.name.split(".").pop()?.toLowerCase() || "mp4"}`;
  const start = range.start.toFixed(3);
  const end = range.end.toFixed(3);

  // Em gbrp a máscara em tons de cinza vira R=G=B, então os três canais usam o
  // valor pintado. Em yuv444p o croma da máscara fica em 128 (cinza neutro) e
  // o resultado sai misturado 50/50, deixando fantasma colorido.
  const chain = [
    `[0:v]scale=${width}:${height}:flags=lanczos,fps=${fps},setsar=1,format=gbrp,` +
      `trim=${start}:${end},setpts=PTS-STARTPTS[base]`,
    `[1:v]scale=${width}:${height}:flags=lanczos,setsar=1,format=gbrp[ovl]`,
    `[2:v]scale=${width}:${height},format=gray,boxblur=2:1,format=gbrp[mk]`,
    `[base][ovl][mk]maskedmerge,format=yuv420p[v]`,
  ];
  if (hasAudio) {
    chain.push(`[0:a]atrim=${start}:${end},asetpts=PTS-STARTPTS[a]`);
  }

  const maps = hasAudio ? ["-map", "[v]", "-map", "[a]"] : ["-map", "[v]"];

  return run({
    ...reporters,
    inputs: [
      { name: originalName, data: original },
      { name: "inpainted.mp4", data: inpainted },
      { name: "mask.png", data: mask },
    ],
    output: "final.mp4",
    args: [
      "-i", originalName,
      "-i", "inpainted.mp4",
      "-i", "mask.png",
      "-filter_complex", chain.join(";"),
      ...maps,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      "final.mp4",
    ],
  });
}
