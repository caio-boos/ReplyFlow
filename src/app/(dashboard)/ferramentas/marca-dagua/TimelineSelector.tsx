"use client";

import { useEffect, useRef, useState } from "react";

const THUMB_COUNT = 16;
const THUMB_WIDTH = 96;

interface Props {
  src: string;
  duration: number;
  currentTime: number;
  start: number;
  end: number;
  disabled?: boolean;
  onSeek: (time: number) => void;
  onRangeChange: (range: { start: number; end: number }) => void;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
    setTimeout(done, 2000);
  });
}

export default function TimelineSelector({
  src,
  duration,
  currentTime,
  start,
  end,
  disabled,
  onSeek,
  onRangeChange,
}: Props) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "seek" | null>(null);

  useEffect(() => {
    if (!src || !duration) return;
    let cancelled = false;
    setThumbs([]);

    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.preload = "auto";

    const canvas = document.createElement("canvas");

    (async () => {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("decode"));
      });
      if (cancelled) return;

      canvas.width = THUMB_WIDTH;
      canvas.height = Math.max(
        1,
        Math.round((video.videoHeight / video.videoWidth) * THUMB_WIDTH),
      );
      const ctx = canvas.getContext("2d")!;
      const shots: string[] = [];

      for (let i = 0; i < THUMB_COUNT; i++) {
        if (cancelled) return;
        await seekTo(video, (duration * (i + 0.5)) / THUMB_COUNT);
        if (cancelled) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        shots.push(canvas.toDataURL("image/jpeg", 0.6));
        setThumbs([...shots]);
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, duration]);

  function timeAt(clientX: number): number {
    const rect = stripRef.current!.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(duration, Math.max(0, ratio * duration));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const time = timeAt(e.clientX);
    const target = (e.target as HTMLElement).dataset.handle;
    dragging.current =
      target === "start" || target === "end"
        ? target
        : Math.abs(time - start) < Math.abs(time - end)
          ? "start"
          : "end";

    // Clique longe das alças move o playhead em vez de redefinir o trecho.
    if (!target && time > start && time < end) dragging.current = "seek";

    applyDrag(time);
  }

  function applyDrag(time: number) {
    if (dragging.current === "seek") {
      onSeek(time);
      return;
    }
    if (dragging.current === "start") {
      const next = Math.min(time, end - 0.2);
      onRangeChange({ start: Math.max(0, next), end });
      onSeek(Math.max(0, next));
    } else if (dragging.current === "end") {
      const next = Math.max(time, start + 0.2);
      onRangeChange({ start, end: Math.min(duration, next) });
      onSeek(Math.min(duration, next));
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    applyDrag(timeAt(e.clientX));
  }

  const pct = (time: number) => `${duration ? (time / duration) * 100 : 0}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          Trecho a corrigir:{" "}
          <span className="text-gray-200 font-medium">
            {start.toFixed(1)}s → {end.toFixed(1)}s
          </span>{" "}
          <span className="text-gray-600">({(end - start).toFixed(1)}s)</span>
        </span>
        <button
          onClick={() => onRangeChange({ start: 0, end: duration })}
          disabled={disabled}
          className="text-gray-500 hover:text-gray-300 disabled:opacity-40 cursor-pointer"
        >
          Vídeo inteiro
        </button>
      </div>

      <div
        ref={stripRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
        className={`relative h-16 rounded-lg overflow-hidden bg-gray-900 select-none touch-none ${
          disabled ? "opacity-60" : "cursor-pointer"
        }`}
      >
        <div className="absolute inset-0 flex">
          {Array.from({ length: THUMB_COUNT }).map((_, i) => (
            <div key={i} className="flex-1 h-full overflow-hidden">
              {thumbs[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbs[i]}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="absolute inset-y-0 left-0 bg-gray-950/70 pointer-events-none"
          style={{ width: pct(start) }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gray-950/70 pointer-events-none"
          style={{ width: pct(duration - end) }}
        />
        <div
          className="absolute inset-y-0 border-y-2 border-indigo-400/80 pointer-events-none"
          style={{ left: pct(start), width: pct(end - start) }}
        />

        <div
          data-handle="start"
          className="absolute inset-y-0 w-3 -ml-1.5 bg-indigo-400 rounded-sm cursor-ew-resize"
          style={{ left: pct(start) }}
        />
        <div
          data-handle="end"
          className="absolute inset-y-0 w-3 -ml-1.5 bg-indigo-400 rounded-sm cursor-ew-resize"
          style={{ left: pct(end) }}
        />

        <div
          className="absolute inset-y-0 w-0.5 bg-white/90 pointer-events-none"
          style={{ left: pct(currentTime) }}
        />
      </div>
    </div>
  );
}
