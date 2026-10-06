"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { maskToRects, normalizeRects, targetSize } from "@/lib/video/mask-rects";
import { maskToPngBlob } from "@/lib/video/mask-image";
import {
  composeFinal,
  compressForUpload,
  removeWatermark,
} from "@/lib/video/watermark-remover";
import TimelineSelector from "./TimelineSelector";

type Status = "idle" | "editing" | "processing" | "done";
type Mode = "local" | "ai";
type Tool = "brush" | "rect";

interface Point {
  x: number;
  y: number;
}

type Stroke =
  | { kind: "brush"; size: number; erase: boolean; points: Point[] }
  | { kind: "rect"; erase: boolean; from: Point; to: Point };

const MAX_SIZE_MB = 100;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export default function WatermarkToolPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [range, setRange] = useState({ start: 0, end: 0 });

  const [brush, setBrush] = useState(40);
  const [padding, setPadding] = useState(6);
  const [erasing, setErasing] = useState(false);
  const [tool, setTool] = useState<Tool>("brush");
  const [mode, setMode] = useState<Mode>("ai");

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [logLine, setLogLine] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [rawUrl, setRawUrl] = useState("");
  const [view, setView] = useState<"final" | "raw">("final");
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef<Stroke | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const undoStack = useRef<Stroke[][]>([]);
  const redoStack = useRef<Stroke[][]>([]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [videoUrl, resultUrl]);

  const acceptFile = useCallback(
    (next: File | undefined) => {
      if (!next) return;
      if (!next.type.startsWith("video/")) {
        toast.error("Selecione um arquivo de vídeo.");
        return;
      }
      if (next.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`O vídeo precisa ter menos de ${MAX_SIZE_MB}MB.`);
        return;
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      if (rawUrl) URL.revokeObjectURL(rawUrl);
      setResultUrl("");
      setRawUrl("");
      setView("final");
      setProgress(0);
      setLogLine("");
      strokes.current = [];
      undoStack.current = [];
      redoStack.current = [];
      setHistory({ undo: 0, redo: 0 });
      setPlaying(false);
      setFile(next);
      setVideoUrl(URL.createObjectURL(next));
      setStatus("editing");
    },
    [videoUrl, resultUrl],
  );
  function handleMetadata() {
    const video = videoRef.current;
    if (!video) return;
    const next = targetSize(video.videoWidth, video.videoHeight);
    setSize(next);
    setDuration(video.duration || 0);
    setRange({ start: 0, end: video.duration || 0 });
    setCurrentTime(0);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = next.w;
      canvas.height = next.h;
      // Redimensionar limpa o canvas; os traços vivem em `strokes`.
      redrawMask();
    }
    if (video.duration > 30) {
      toast.warning("Vídeos acima de 30s podem demorar bastante para processar.");
    }
  }

  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function applyBrush(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    // Traço opaco (a transparência vem do CSS) para que redesenhar um traço
    // inteiro dê o mesmo resultado de desenhá-lo segmento a segmento.
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef4444";
    if (stroke.kind === "brush") {
      ctx.lineWidth = stroke.size + (stroke.erase ? 0 : padding * 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    applyBrush(ctx, stroke);
    if (stroke.kind === "rect") {
      const grow = stroke.erase ? 0 : padding;
      ctx.fillRect(
        Math.min(stroke.from.x, stroke.to.x) - grow,
        Math.min(stroke.from.y, stroke.to.y) - grow,
        Math.abs(stroke.to.x - stroke.from.x) + grow * 2,
        Math.abs(stroke.to.y - stroke.from.y) + grow * 2,
      );
      return;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
    if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
    ctx.stroke();
  }

  function redrawMask() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes.current) drawStroke(ctx, stroke);
  }

  // A margem faz parte do desenho, então mudá-la exige redesenhar tudo.
  useEffect(() => {
    redrawMask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padding]);

  function commitHistory() {
    undoStack.current.push([...strokes.current]);
    redoStack.current = [];
    setHistory({ undo: undoStack.current.length, redo: 0 });
  }

  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push([...strokes.current]);
    strokes.current = previous;
    redrawMask();
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push([...strokes.current]);
    strokes.current = next;
    redrawMask();
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!file || status === "processing") return;
      if (!e.metaKey && !e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (status === "processing") return;
    e.currentTarget.setPointerCapture(e.pointerId);

    commitHistory();
    const point = toCanvasPoint(e);
    const stroke: Stroke =
      tool === "rect"
        ? { kind: "rect", erase: erasing, from: point, to: point }
        : { kind: "brush", size: brush, erase: erasing, points: [point] };

    strokes.current = [...strokes.current, stroke];
    painting.current = stroke;
    if (tool === "rect") redrawMask();
    else drawStroke(canvasRef.current!.getContext("2d")!, stroke);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = painting.current;
    if (!stroke) return;
    const point = toCanvasPoint(e);

    if (stroke.kind === "rect") {
      stroke.to = point;
      redrawMask();
      return;
    }

    const from = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);

    const ctx = canvasRef.current!.getContext("2d")!;
    applyBrush(ctx, stroke);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    const stroke = painting.current;
    painting.current = null;
    if (!stroke || stroke.kind !== "rect") return;

    // Descarta retângulos degenerados de um clique sem arrasto.
    const tooSmall =
      Math.abs(stroke.to.x - stroke.from.x) < 3 ||
      Math.abs(stroke.to.y - stroke.from.y) < 3;
    if (tooSmall) {
      strokes.current = strokes.current.filter((s) => s !== stroke);
      undoStack.current.pop();
      setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
      redrawMask();
    }
  }

  function clearMask() {
    if (strokes.current.length === 0) return;
    commitHistory();
    strokes.current = [];
    redrawMask();
  }

  function seek(time: number) {
    pause();
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  }

  function pause() {
    videoRef.current?.pause();
    setPlaying(false);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      pause();
      return;
    }
    if (video.currentTime < range.start || video.currentTime >= range.end - 0.05) {
      video.currentTime = range.start;
    }
    video.play().then(() => setPlaying(true)).catch(() => {});
  }

  // Mantém a reprodução em loop dentro do trecho selecionado.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        if (video.currentTime >= range.end - 0.02) video.currentTime = range.start;
        setCurrentTime(video.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, range.start, range.end]);

  async function processLocally(canvas: HTMLCanvasElement, source: File) {
    const image = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height);
    const rects = normalizeRects(
      maskToRects(image.data, canvas.width, canvas.height),
      0,
      canvas.width,
      canvas.height,
    );
    if (rects.length === 0) {
      throw new Error("Pinte sobre a marca d'água antes de processar.");
    }

    setStage("Reconstruindo bordas…");
    return removeWatermark({
      file: source,
      rects,
      width: canvas.width,
      height: canvas.height,
      range,
      onProgress: (ratio) => setProgress(Math.min(100, Math.round(ratio * 100))),
      onLog: setLogLine,
    });
  }

  async function waitForPrediction(id: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await fetch(`/api/video/watermark/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao consultar o job.");
      if (data.ready) return;
      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(data.error ?? "A IA não conseguiu processar o vídeo.");
      }
    }
    throw new Error("Tempo esgotado esperando o resultado da IA.");
  }

  async function processWithAI(canvas: HTMLCanvasElement, source: File) {
    setStage("Preparando máscara…");
    const mask = await maskToPngBlob(canvas, 0);

    setStage("Preparando vídeo…");
    const compressed = await compressForUpload({
      file: source,
      width: canvas.width,
      height: canvas.height,
      range,
      onProgress: (ratio) => setProgress(Math.min(100, Math.round(ratio * 100))),
      onLog: setLogLine,
    });

    setStage("Enviando para a IA…");
    setProgress(0);
    const form = new FormData();
    form.append("video", compressed.file);
    form.append("mask", new File([mask], "mask.png", { type: "image/png" }));
    form.append("fps", String(compressed.fps));
    form.append("maskDilation", String(Math.max(4, Math.round(padding / 2))));

    const res = await fetch("/api/video/watermark", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Falha ao enviar o vídeo.");

    setStage("Reconstruindo o fundo (pode levar 1-2 min)…");
    await waitForPrediction(data.id);

    setStage("Baixando resultado…");
    const inpainted = await fetch(`/api/video/watermark/${data.id}/download`);
    if (!inpainted.ok) throw new Error("Falha ao baixar o resultado.");

    // Guardado para o usuário comparar a saída crua com a composição.
    const inpaintedBlob = await inpainted.blob();
    setRawUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(inpaintedBlob);
    });

    setStage("Montando vídeo final…");
    return composeFinal({
      original: source,
      inpainted: inpaintedBlob,
      mask,
      width: canvas.width,
      height: canvas.height,
      fps: compressed.fps,
      hasAudio: compressed.hasAudio,
      range,
      onProgress: (ratio) => setProgress(Math.min(100, Math.round(ratio * 100))),
      onLog: setLogLine,
    });
  }

  async function handleProcess() {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;

    pause();
    setStatus("processing");
    setProgress(0);
    setLogLine("");
    setStage("Carregando motor de vídeo…");

    try {
      const blob =
        mode === "ai"
          ? await processWithAI(canvas, file)
          : await processLocally(canvas, file);

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setStatus("done");
      toast.success("Vídeo processado.");
    } catch (err) {
      console.error(err);
      setStatus("editing");
      toast.error(
        err instanceof Error ? err.message : "Falha ao processar o vídeo.",
      );
    } finally {
      setStage("");
    }
  }

  function reset() {
    pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (rawUrl) URL.revokeObjectURL(rawUrl);
    setFile(null);
    setVideoUrl("");
    setResultUrl("");
    setRawUrl("");
    setView("final");
    setSize({ w: 0, h: 0 });
    setStatus("idle");
    setProgress(0);
    setStage("");
    setLogLine("");
  }

  const stageStyle =
    size.w > 0
      ? {
          aspectRatio: `${size.w} / ${size.h}`,
          width: `min(100%, calc(58vh * ${size.w} / ${size.h}))`,
        }
      : undefined;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">
          Remover marca d&apos;água
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Envie um vídeo curto, pinte sobre a marca d&apos;água e baixe o
          resultado em 720p. Todo o processamento acontece no seu navegador.
        </p>
      </div>

      <div className="flex gap-3 p-4 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
        <svg
          className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-sm text-amber-300/80 leading-relaxed">
          Use apenas em vídeos que você produziu ou tem autorização para editar.
          Remover marcas d&apos;água de conteúdo de terceiros viola direitos
          autorais e os termos das plataformas.
        </p>
      </div>

      {status === "idle" && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center gap-3 h-64 rounded-xl border border-dashed cursor-pointer transition-colors ${
            dragging
              ? "border-indigo-500/60 bg-indigo-500/6"
              : "border-white/10 bg-gray-900/40 hover:border-white/20"
          }`}
        >
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5 7.5 12M12 7.5v12"
            />
          </svg>
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Arraste um vídeo ou clique para selecionar
            </p>
            <p className="text-xs text-gray-600 mt-1">
              MP4, MOV ou WebM · ideal de 1 a 20 segundos · até {MAX_SIZE_MB}MB
            </p>
          </div>
        </label>
      )}

      {file && (
        <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{file.name}</p>
              <p className="text-xs text-gray-600">
                {size.w}×{size.h} · {duration.toFixed(1)}s ·{" "}
                {(file.size / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
            <button
              onClick={reset}
              disabled={status === "processing"}
              className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 cursor-pointer"
            >
              Trocar vídeo
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex justify-center">
              <div
                className="relative rounded-lg overflow-hidden bg-black"
                style={stageStyle}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleMetadata}
                  muted
                  playsInline
                  className={`block w-full h-full object-contain ${
                    status === "done" ? "invisible" : ""
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`absolute inset-0 w-full h-full touch-none opacity-60 ${
                    status === "done" ? "invisible" : ""
                  } ${
                    status === "processing"
                      ? "pointer-events-none"
                      : "cursor-crosshair"
                  }`}
                />
                {status === "done" && resultUrl && (
                  <video
                    key={view}
                    src={view === "raw" && rawUrl ? rawUrl : resultUrl}
                    controls
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {status !== "done" && (
              <>
                <div
                  className={`space-y-4 ${
                    status === "processing"
                      ? "pointer-events-none opacity-50 select-none"
                      : ""
                  }`}
                >
                  {duration > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        disabled={status === "processing"}
                        aria-label={playing ? "Pausar" : "Reproduzir trecho"}
                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/6 hover:bg-white/10 text-gray-200 disabled:opacity-40 cursor-pointer"
                      >
                        {playing ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6.75 5.25h3.5v13.5h-3.5zM13.75 5.25h3.5v13.5h-3.5z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 4.5l12 7.5-12 7.5z" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <TimelineSelector
                          src={videoUrl}
                          duration={duration}
                          currentTime={currentTime}
                          start={range.start}
                          end={range.end}
                          disabled={status === "processing"}
                          onSeek={seek}
                          onRangeChange={(next) => {
                            pause();
                            setRange(next);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex rounded-lg border border-white/6 overflow-hidden">
                      {(
                        [
                          { id: "brush" as const, label: "Pincel" },
                          { id: "rect" as const, label: "Retângulo" },
                        ]
                      ).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setTool(option.id)}
                          disabled={status === "processing"}
                          className={`px-3 py-1.5 text-xs cursor-pointer ${
                            tool === option.id
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-white/5 text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {tool === "brush" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Tamanho</span>
                        <input
                          type="range"
                          min={8}
                          max={160}
                          value={brush}
                          disabled={status === "processing"}
                          onChange={(e) => setBrush(Number(e.target.value))}
                          className="w-28 accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 w-8">{brush}px</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Margem</span>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={padding}
                        disabled={status === "processing"}
                        onChange={(e) => setPadding(Number(e.target.value))}
                        className="w-24 accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 w-8">{padding}px</span>
                    </div>

                    <button
                      onClick={() => {
                        setTool("rect");
                        setPadding(16);
                        setErasing(false);
                      }}
                      disabled={status === "processing"}
                      title="Retângulo com margem larga, que cobre o contorno das letras"
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/6 text-gray-400 hover:text-gray-200 disabled:opacity-40 cursor-pointer"
                    >
                      Preset legenda
                    </button>

                    <button
                      onClick={() => setErasing((v) => !v)}
                      disabled={status === "processing"}
                      className={`px-3 py-1.5 rounded-lg text-xs border cursor-pointer ${
                        erasing
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                          : "bg-white/5 border-white/6 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      Borracha
                    </button>
                    <button
                      onClick={undo}
                      disabled={status === "processing" || history.undo === 0}
                      title="Desfazer (Ctrl+Z)"
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/6 text-gray-400 hover:text-gray-200 disabled:opacity-30 cursor-pointer"
                    >
                      Desfazer
                    </button>
                    <button
                      onClick={redo}
                      disabled={status === "processing" || history.redo === 0}
                      title="Refazer (Ctrl+Shift+Z)"
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/6 text-gray-400 hover:text-gray-200 disabled:opacity-30 cursor-pointer"
                    >
                      Refazer
                    </button>
                    <button
                      onClick={clearMask}
                      disabled={status === "processing"}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/6 text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      Limpar máscara
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: "ai" as const,
                        title: "IA — natural",
                        hint: "Reconstrói o fundo com os frames vizinhos e aplica só dentro da máscara. ~1-2 min, custa centavos.",
                      },
                      {
                        id: "local" as const,
                        title: "Rápido — no navegador",
                        hint: "Interpola a borda. Só funciona bem em fundo liso; borra se tiver movimento.",
                      },
                    ]
                  ).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setMode(option.id)}
                      disabled={status === "processing"}
                      className={`text-left p-3 rounded-lg border disabled:opacity-50 cursor-pointer ${
                        mode === option.id
                          ? "bg-indigo-500/10 border-indigo-500/40"
                          : "bg-white/3 border-white/6 hover:border-white/12"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          mode === option.id ? "text-indigo-300" : "text-gray-300"
                        }`}
                      >
                        {option.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {option.hint}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleProcess}
                  disabled={status === "processing"}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white cursor-pointer"
                >
                  {status === "processing"
                    ? "Processando…"
                    : "Remover marca d'água"}
                </button>

                {status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{stage}</span>
                      {progress > 0 && <span>{progress}%</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div
                        className={`h-full bg-indigo-500 transition-all ${
                          progress === 0 ? "animate-pulse" : ""
                        }`}
                        style={{ width: progress > 0 ? `${progress}%` : "100%" }}
                      />
                    </div>
                    {logLine && (
                      <p className="text-[11px] text-gray-600 font-mono truncate">
                        {logLine}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {status === "done" && resultUrl && (
              <>
                {rawUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Comparar:</span>
                    <div className="flex rounded-lg border border-white/6 overflow-hidden">
                      {(
                        [
                          { id: "final" as const, label: "Final" },
                          { id: "raw" as const, label: "Saída da IA" },
                        ]
                      ).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setView(option.id)}
                          className={`px-3 py-1.5 text-xs cursor-pointer ${
                            view === option.id
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-white/5 text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-600">
                      Se o fantasma só aparece em “Final”, a máscara está certa e o
                      problema é a composição.
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={resultUrl}
                    download={`sem-marca-${file.name.replace(/\.[^.]+$/, "")}.mp4`}
                    className="flex-1 min-w-45 text-center py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white"
                  >
                    Baixar vídeo
                  </a>
                  <button
                    onClick={() => {
                      setView("final");
                      setStatus("editing");
                    }}
                    className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/6 text-sm text-gray-300 hover:text-gray-100 cursor-pointer"
                  >
                    Ajustar máscara
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
