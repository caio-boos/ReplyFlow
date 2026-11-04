"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFormat, useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/types";
import {
  DEFAULT_VIDEO_EDIT_MODEL_ID,
  EDIT_INTENSITIES,
  EditIntensity,
  findVideoEditModel,
  PRESERVATION_CLAUSE,
  referenceTag,
  REFERENCE_TAG_PATTERN,
  VIDEO_EDIT_MODELS,
  VideoEditModelId,
} from "@/lib/video/edit-models";
import { videoErrorMessage } from "@/lib/video/errors";
import { prepareReferenceImage } from "@/lib/video/reference-image";
import { compressForUpload } from "@/lib/video/watermark-remover";
import TimelineSelector from "../marca-dagua/TimelineSelector";

type Status = "idle" | "editing" | "processing" | "done";
type Stage = keyof Messages["tools"]["stages"];

interface Reference {
  file: File;
  url: string;
}

const MAX_SIZE_MB = 100;
const MAX_PROMPT_CHARS = 2000;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
// Orçamento total do corpo da requisição, abaixo do limite de 4,5MB da Vercel.
const REQUEST_BUDGET_BYTES = 3.4 * 1024 * 1024;

/**
 * Os modelos de edição exigem o lado menor em 720px, então aqui o vídeo também
 * sobe de escala quando a origem é menor — diferente do `targetSize` da marca
 * d'água, que nunca faz upscale.
 */
function editSize(width: number, height: number): { w: number; h: number } {
  const scale = 720 / Math.max(1, Math.min(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { w: even(width), h: even(height) };
}

export default function CloneVideoPage() {
  const t = useT("tools");
  const f = useFormat();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [range, setRange] = useState({ start: 0, end: 0 });

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState<VideoEditModelId>(DEFAULT_VIDEO_EDIT_MODEL_ID);
  const [intensity, setIntensity] = useState<EditIntensity>("subtle");
  const [references, setReferences] = useState<Reference[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Stage | null>(null);
  const [logLine, setLogLine] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [predictionId, setPredictionId] = useState("");
  const [view, setView] = useState<"result" | "original">("result");
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [improving, setImproving] = useState(false);
  const [promptBackup, setPromptBackup] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const model = findVideoEditModel(modelId)!;
  const locked = status === "processing";
  const clipDuration = Math.max(0, range.end - range.start);
  const clipTooShort = clipDuration > 0 && clipDuration < model.minSeconds;
  const clipTooLong = clipDuration > model.maxSeconds;
  // Sem o marcador no prompt o Kling recebe as imagens e simplesmente as ignora.
  const seconds = (value: number) =>
    f.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const referencesUncited =
    model.usesReferenceTags &&
    references.length > 0 &&
    !REFERENCE_TAG_PATTERN.test(prompt);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [videoUrl, resultUrl]);

  // Cada modelo tem um teto próprio de imagens de referência.
  useEffect(() => {
    setReferences((current) => {
      if (current.length <= model.maxReferenceImages) return current;
      for (const extra of current.slice(model.maxReferenceImages)) {
        URL.revokeObjectURL(extra.url);
      }
      return current.slice(0, model.maxReferenceImages);
    });
  }, [model.maxReferenceImages]);

  const acceptFile = useCallback(
    (next: File | undefined) => {
      if (!next) return;
      if (!next.type.startsWith("video/")) {
        toast.error(t("shared.selectVideo"));
        return;
      }
      if (next.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(t("shared.videoTooLarge", { max: MAX_SIZE_MB }));
        return;
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl("");
      setPredictionId("");
      setView("result");
      setProgress(0);
      setLogLine("");
      setPlaying(false);
      setFile(next);
      setVideoUrl(URL.createObjectURL(next));
      setStatus("editing");
    },
    [videoUrl, resultUrl, t],
  );

  function handleMetadata() {
    const video = videoRef.current;
    if (!video) return;
    setSize(editSize(video.videoWidth, video.videoHeight));
    const total = video.duration || 0;
    setDuration(total);
    setRange({ start: 0, end: Math.min(total, model.maxSeconds) });
    setCurrentTime(0);
  }

  async function addReferences(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = model.maxReferenceImages - references.length;
    if (room <= 0) {
      toast.error(
        t("clone.maxReferences", { model: model.label, count: model.maxReferenceImages }),
      );
      return;
    }

    const accepted: Reference[] = [];
    for (const raw of Array.from(files).slice(0, room)) {
      if (!raw.type.startsWith("image/")) continue;
      try {
        const prepared = await prepareReferenceImage(raw, references.length + accepted.length);
        accepted.push({ file: prepared, url: URL.createObjectURL(prepared) });
      } catch {
        toast.error(t("clone.readImageFailed", { name: raw.name }));
      }
    }
    if (accepted.length > 0) setReferences((current) => [...current, ...accepted]);
  }

  function removeReference(index: number) {
    setReferences((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });
  }

  function insertTag(tag: string) {
    const field = promptRef.current;
    const at = field?.selectionStart ?? prompt.length;
    const next = `${prompt.slice(0, at)}${tag}${prompt.slice(at)}`;
    setPrompt(next.slice(0, MAX_PROMPT_CHARS));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(at + tag.length, at + tag.length);
    });
  }

  async function improvePrompt() {
    if (!prompt.trim()) return;
    setImproving(true);
    try {
      const res = await fetch("/api/video/clone/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: model.id,
          referenceCount: references.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("errors.improveFailed"));

      setPromptBackup(prompt);
      setPrompt(data.prompt.slice(0, MAX_PROMPT_CHARS));
      toast.success(t("clone.improved"));
    } catch (err) {
      toast.error(videoErrorMessage(t, err, t("errors.improveFailed")));
    } finally {
      setImproving(false);
    }
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

  async function waitForPrediction(id: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await fetch(`/api/video/clone/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("errors.jobStatusFailed"));
      if (data.ready) return;
      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(data.error ?? t("errors.aiFailed"));
      }
    }
    throw new Error(t("errors.aiTimeout"));
  }

  async function handleProcess() {
    if (!file) return;
    if (!prompt.trim()) {
      toast.error(t("clone.describeChanges"));
      return;
    }
    if (clipTooShort || clipTooLong) {
      toast.error(
        t("clone.clipRange", {
          model: model.label,
          min: model.minSeconds,
          max: model.maxSeconds,
        }),
      );
      return;
    }

    pause();
    setStatus("processing");
    setProgress(0);
    setLogLine("");
    setStage("preparingVideo");

    try {
      const referenceBytes = references.reduce((sum, item) => sum + item.file.size, 0);
      const compressed = await compressForUpload({
        file,
        width: size.w,
        height: size.h,
        range,
        budgetBytes: Math.max(1024 * 1024, REQUEST_BUDGET_BYTES - referenceBytes),
        onProgress: (ratio) => setProgress(Math.min(100, Math.round(ratio * 100))),
        onLog: setLogLine,
      });

      setStage("uploading");
      setProgress(0);
      const form = new FormData();
      form.append("video", compressed.file);
      form.append("prompt", prompt.trim());
      form.append("model", model.id);
      form.append("intensity", intensity);
      for (const reference of references) form.append("references", reference.file);

      const res = await fetch("/api/video/clone", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("errors.uploadFailed"));
      setPredictionId(data.id);

      setStage("generating");
      await waitForPrediction(data.id);

      setStage("downloading");
      const output = await fetch(`/api/video/clone/${data.id}/download`);
      if (!output.ok) throw new Error(t("errors.downloadFailed"));

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(await output.blob()));
      setStatus("done");
      toast.success(t("clone.generated"));
    } catch (err) {
      console.error(err);
      setStatus("editing");
      toast.error(videoErrorMessage(t, err, t("errors.processFailed")));
    } finally {
      setStage(null);
    }
  }

  function reset() {
    pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    for (const reference of references) URL.revokeObjectURL(reference.url);
    setReferences([]);
    setFile(null);
    setVideoUrl("");
    setResultUrl("");
    setPredictionId("");
    setView("result");
    setSize({ w: 0, h: 0 });
    setStatus("idle");
    setProgress(0);
    setStage(null);
    setLogLine("");
  }

  const stageStyle =
    size.w > 0
      ? {
          aspectRatio: `${size.w} / ${size.h}`,
          width: `min(100%, calc(58vh * ${size.w} / ${size.h}))`,
        }
      : undefined;

  const clause = model.nativeIntensity ? "" : PRESERVATION_CLAUSE[intensity];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">{t("clone.title")}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{t("clone.subtitle")}</p>
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
          {t("clone.disclaimer")}
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
            <p className="text-sm text-gray-300">{t("shared.dropzone")}</p>
            <p className="text-xs text-gray-600 mt-1">
              {t("clone.dropzoneHint", { max: MAX_SIZE_MB })}
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
              disabled={locked}
              className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 cursor-pointer"
            >
              {t("shared.changeVideo")}
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
                  controls={status === "done" && view === "original"}
                  className={`block w-full h-full object-contain ${
                    status === "done" && view === "result" ? "invisible" : ""
                  }`}
                />
                {status === "done" && resultUrl && view === "result" && (
                  <video
                    src={resultUrl}
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
                    locked ? "pointer-events-none opacity-50 select-none" : ""
                  }`}
                >
                  {duration > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        disabled={locked}
                        aria-label={playing ? t("shared.pause") : t("shared.playClip")}
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
                          disabled={locked}
                          onSeek={seek}
                          onRangeChange={(next) => {
                            pause();
                            setRange(next);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {(clipTooShort || clipTooLong) && (
                    <p className="text-xs text-amber-400">
                      {t("clone.clipRangeCurrent", {
                        model: model.label,
                        min: model.minSeconds,
                        max: model.maxSeconds,
                        current: seconds(clipDuration),
                      })}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="clone-prompt" className="block text-xs text-gray-500">
                        {t("clone.promptLabel")}
                      </label>
                      <div className="flex items-center gap-2">
                        {promptBackup !== null && (
                          <button
                            onClick={() => {
                              setPrompt(promptBackup);
                              setPromptBackup(null);
                            }}
                            disabled={locked || improving}
                            className="text-[11px] text-gray-500 hover:text-gray-300 disabled:opacity-40 cursor-pointer"
                          >
                            {t("shared.undo")}
                          </button>
                        )}
                        <button
                          onClick={improvePrompt}
                          disabled={locked || improving || !prompt.trim()}
                          title={t("clone.improveTitle")}
                          className="px-2 py-1 rounded-md text-[11px] bg-white/5 border border-white/6 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/40 disabled:opacity-40 cursor-pointer"
                        >
                          {improving ? t("clone.improving") : t("clone.improve")}
                        </button>
                      </div>
                    </div>
                    <textarea
                      id="clone-prompt"
                      ref={promptRef}
                      value={prompt}
                      disabled={locked}
                      maxLength={MAX_PROMPT_CHARS}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      placeholder={t(`clone.models.${model.id}.placeholder`, {
                        tag: referenceTag(0),
                      })}
                      className="w-full px-3 py-2 rounded-lg bg-white/3 border border-white/6 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 resize-y"
                    />
                    <div className="flex justify-between text-[11px] text-gray-600">
                      <span>{t("clone.promptHint")}</span>
                      <span>
                        {prompt.length}/{MAX_PROMPT_CHARS}
                      </span>
                    </div>
                    {referencesUncited && (
                      <p className="text-[11px] text-amber-400 leading-snug">
                        {t("clone.referencesUncited", {
                          model: model.label,
                          tag: referenceTag(0),
                        })}
                      </p>
                    )}
                  </div>

                  {model.maxReferenceImages > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-500">
                          {t("clone.referencesLabel")}
                        </span>
                        <span className="text-[11px] text-gray-600">
                          {references.length}/{model.maxReferenceImages}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {references.map((reference, index) => (
                          <div key={reference.url} className="space-y-1">
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/6">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={reference.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removeReference(index)}
                                disabled={locked}
                                aria-label={t("clone.removeImage")}
                                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-gray-950/80 text-gray-300 hover:text-white disabled:opacity-40 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                            {model.usesReferenceTags && (
                              <button
                                onClick={() => insertTag(referenceTag(index))}
                                disabled={locked}
                                title={t("clone.insertInPrompt")}
                                className="w-20 px-1 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/6 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/40 disabled:opacity-40 cursor-pointer truncate"
                              >
                                {referenceTag(index)}
                              </button>
                            )}
                          </div>
                        ))}
                        {references.length < model.maxReferenceImages && (
                          <label
                            className={`w-20 h-20 flex items-center justify-center rounded-lg border border-dashed border-white/10 text-gray-600 hover:border-white/20 hover:text-gray-400 ${
                              locked ? "" : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={locked}
                              className="hidden"
                              onChange={(e) => {
                                addReferences(e.target.files);
                                e.target.value = "";
                              }}
                            />
                            <span className="text-xl leading-none">+</span>
                          </label>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600">
                        {model.usesReferenceTags
                          ? t("clone.referencesTagHint", { tag: referenceTag(0) })
                          : t("clone.referencesHint")}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">{t("clone.modelLabel")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {VIDEO_EDIT_MODELS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setModelId(option.id)}
                          disabled={locked}
                          className={`text-left p-3 rounded-lg border disabled:opacity-50 cursor-pointer ${
                            modelId === option.id
                              ? "bg-indigo-500/10 border-indigo-500/40"
                              : "bg-white/3 border-white/6 hover:border-white/12"
                          }`}
                        >
                          <p
                            className={`text-sm font-medium ${
                              modelId === option.id ? "text-indigo-300" : "text-gray-300"
                            }`}
                          >
                            {option.label}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                            {t(`clone.models.${option.id}.summary`)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">
                      {t("clone.intensityLabel")}
                    </span>
                    <div className="flex rounded-lg border border-white/6 overflow-hidden w-fit">
                      {EDIT_INTENSITIES.map((option) => (
                        <button
                          key={option}
                          onClick={() => setIntensity(option)}
                          disabled={locked}
                          className={`px-3 py-1.5 text-xs disabled:opacity-50 cursor-pointer ${
                            intensity === option
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-white/5 text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {t(`clone.intensity.${option}.label`)}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {t(`clone.intensity.${intensity}.hint`)}
                    </p>
                    {!model.nativeIntensity && (
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {clause
                          ? t.rich(
                              "clone.intensityAppended",
                              { clause: (chunks) => <span className="italic">{chunks}</span> },
                              { model: model.label, clause },
                            )
                          : t("clone.intensityNothingAppended", { model: model.label })}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={locked || !prompt.trim() || clipTooShort || clipTooLong}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white cursor-pointer"
                >
                  {locked ? t("shared.processing") : t("clone.generate")}
                </button>

                {locked && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{stage ? t(`stages.${stage}`) : ""}</span>
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
              <>                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t("shared.compare")}</span>
                  <div className="flex rounded-lg border border-white/6 overflow-hidden">
                    {(
                      [
                        { id: "result" as const, label: t("clone.viewResult") },
                        { id: "original" as const, label: t("clone.viewOriginal") },
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
                    {t("clone.checkProduct")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={resultUrl}
                    download={`clone-${file.name.replace(/\.[^.]+$/, "")}.mp4`}
                    className="flex-1 min-w-45 text-center py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white"
                  >
                    {t("shared.downloadVideo")}
                  </a>
                  <button
                    onClick={() => {
                      setView("result");
                      setStatus("editing");
                    }}
                    className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/6 text-sm text-gray-300 hover:text-gray-100 cursor-pointer"
                  >
                    {t("clone.adjustPrompt")}
                  </button>
                </div>
              </>
            )}

            {predictionId && (locked || status === "done") && (
              <a
                href={`https://replicate.com/p/${predictionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11px] text-gray-600 hover:text-gray-400"
              >
                {t("clone.replicateLink")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
