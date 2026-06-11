"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
interface TitleOption {
  name: string;
  recommended: boolean;
  explanation?: string;
}

interface ColorVariant {
  color: string;
  note: string; // e.g. "logo branca"
}

interface GeneratedImage {
  color: string;
  note: string;
  url: string;
  loading: boolean;
  error?: string;
}

interface LogoPosition {
  x: number;
  y: number;
}

const LOGO_TYPES = [
  { id: "none", label: "Sem Logo", image: null },
  { id: "ralph_lauren", label: "Ralph Lauren", image: "/logotipoproduto/ralph-lauren.png" },
] as const;

type LogoTypeId = (typeof LOGO_TYPES)[number]["id"];

const STORAGE_KEY = "replyflow.products.new.v1";

/* ──────────────────────────────────────────────────────────────
   Helper components
────────────────────────────────────────────────────────────── */
function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/60 border border-white/6 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main page
────────────────────────────────────────────────────────────── */
export default function NewProductPage() {
  /* ── Form state ───────────────────────────────────────── */
  const [productDescription, setProductDescription] = useState("");
  const [pieces, setPieces] = useState<"1" | "2">("1");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [colorNoteInput, setColorNoteInput] = useState("");
  const [referenceImages, setReferenceImages] = useState<{ file: File; preview: string }[]>([]);
  const [logoType, setLogoType] = useState<LogoTypeId>("none");
  const [logoPosition, setLogoPosition] = useState<LogoPosition | null>(null);
  const [activeLogoImageIdx, setActiveLogoImageIdx] = useState(0);

  /* ── Results state ────────────────────────────────────── */
  const [titleOptions, setTitleOptions] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  /* ── Loading / error ──────────────────────────────────── */
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [imageGenActive, setImageGenActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Session cost tracker ─────────────────────────────── */
  const [sessionCost, setSessionCost] = useState<{
    usd: number;
    textTokensIn: number;
    textTokensOut: number;
    imageCount: number;
  }>({ usd: 0, textTokensIn: 0, textTokensOut: 0, imageCount: 0 });

  /* ── UI state ─────────────────────────────────────────── */
  const [descTab, setDescTab] = useState<"html" | "preview">("preview");
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; color: string; note: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /* ── Refs ─────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load from localStorage on mount ─────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.productDescription) setProductDescription(saved.productDescription);
      if (saved.pieces) setPieces(saved.pieces);
      if (saved.gender) setGender(saved.gender);
      if (saved.colorVariants) setColorVariants(saved.colorVariants);
      if (saved.logoType) setLogoType(saved.logoType);
      if (saved.logoPosition) setLogoPosition(saved.logoPosition);
      if (saved.titleOptions) setTitleOptions(saved.titleOptions);
      if (saved.selectedTitle) setSelectedTitle(saved.selectedTitle);
      if (saved.descriptionHtml) setDescriptionHtml(saved.descriptionHtml);
      if (saved.generatedImages) setGeneratedImages(saved.generatedImages.filter((i: GeneratedImage) => i.url));
      if (saved.savedAt) setSavedAt(saved.savedAt);
    } catch {
      /* ignore corrupt data */
    }
  }, []);

  /* ── Save to localStorage ─────────────────────────────── */
  const handleSave = useCallback(() => {
    const payload = {
      productDescription,
      pieces,
      gender,
      colorVariants,
      logoType,
      logoPosition,
      titleOptions,
      selectedTitle,
      descriptionHtml,
      generatedImages: generatedImages.filter((i) => i.url),
      savedAt: new Date().toLocaleTimeString("pt-BR"),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedAt(payload.savedAt);
  }, [productDescription, pieces, gender, colorVariants, logoType, logoPosition, titleOptions, selectedTitle, descriptionHtml, generatedImages]);

  const handleClearSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
  };

  /* ── Clipboard paste ─────────────────────────────────── */
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        const newImages = imageFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }));
        setReferenceImages((prev) => [...prev, ...newImages]);
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  /* ── Keyboard: close modals on Escape ────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLogoModalOpen(false);
        setLightboxImage(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ────────────────────────────────────────────────────────
     Handlers
  ────────────────────────────────────────────────────────── */
  const handleFileDrop = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setReferenceImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = (idx: number) => {
    setReferenceImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      const next = prev.filter((_, i) => i !== idx);
      if (activeLogoImageIdx >= next.length) setActiveLogoImageIdx(Math.max(0, next.length - 1));
      return next;
    });
    setLogoPosition(null);
  };

  const addColor = () => {
    const trimmed = colorInput.trim();
    if (!trimmed) return;
    if (colorVariants.some((v) => v.color.toLowerCase() === trimmed.toLowerCase())) return;
    setColorVariants((prev) => [...prev, { color: trimmed, note: colorNoteInput.trim() }]);
    setColorInput("");
    setColorNoteInput("");
  };

  const removeColor = (color: string) =>
    setColorVariants((prev) => prev.filter((v) => v.color !== color));

  const updateColorNote = (color: string, note: string) =>
    setColorVariants((prev) => prev.map((v) => (v.color === color ? { ...v, note } : v)));

  const handleLogoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLogoPosition({ x: Math.round(x), y: Math.round(y) });
  };

  /* ── Generate title ──────────────────────────────────── */
  const handleGenerateTitle = async () => {
    if (!productDescription.trim()) return;
    setLoadingTitle(true);
    setError(null);
    setTitleOptions([]);
    setSelectedTitle("");
    try {
      const res = await fetch("/api/products/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar títulos");
      setTitleOptions(data.options ?? []);
      const recommended = data.options?.find((o: TitleOption) => o.recommended);
      if (recommended) setSelectedTitle(recommended.name);
      if (data.costUsd) {
        setSessionCost((prev) => ({
          usd: prev.usd + data.costUsd,
          textTokensIn: prev.textTokensIn + (data.usage?.promptTokens ?? 0),
          textTokensOut: prev.textTokensOut + (data.usage?.completionTokens ?? 0),
          imageCount: prev.imageCount,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoadingTitle(false);
    }
  };

  /* ── Generate description ────────────────────────────── */
  const handleGenerateDescription = async () => {
    if (!selectedTitle || !productDescription.trim()) return;
    setLoadingDescription(true);
    setError(null);
    setDescriptionHtml("");
    try {
      const res = await fetch("/api/products/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: selectedTitle, productDescription, pieces }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar descrição");
      setDescriptionHtml(data.html ?? "");
      if (data.costUsd) {
        setSessionCost((prev) => ({
          usd: prev.usd + data.costUsd,
          textTokensIn: prev.textTokensIn + (data.usage?.promptTokens ?? 0),
          textTokensOut: prev.textTokensOut + (data.usage?.completionTokens ?? 0),
          imageCount: prev.imageCount,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoadingDescription(false);
    }
  };

  /* ── Generate images ─────────────────────────────────── */
  const handleGenerateImages = async () => {
    if (!colorVariants.length || !referenceImages.length) return;
    setImageGenActive(true);
    setError(null);
    setGeneratedImages(colorVariants.map((v) => ({ color: v.color, note: v.note, url: "", loading: true })));

    for (const variant of colorVariants) {
      try {
        const fd = new FormData();
        fd.append("image", referenceImages[0].file);
        fd.append("color", variant.color);
        fd.append("colorNote", variant.note);
        fd.append("gender", gender);
        fd.append("logoType", logoType);
        if (logoPosition) fd.append("logoPosition", JSON.stringify(logoPosition));

        const res = await fetch("/api/products/generate-images", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Erro ao gerar imagem");

        setSessionCost((prev) => ({
          ...prev,
          usd: prev.usd + (data.costUsd ?? 0.25),
          imageCount: prev.imageCount + 1,
        }));

        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.color === variant.color ? { ...img, url: data.url, loading: false } : img
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro";
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.color === variant.color ? { ...img, loading: false, error: msg } : img
          )
        );
      }
    }

    setImageGenActive(false);
  };

  const copyHtml = () => navigator.clipboard.writeText(descriptionHtml);

  /* ────────────────────────────────────────────────────────
     Computed
  ────────────────────────────────────────────────────────── */
  const canGenerateTitle = productDescription.trim().length > 0;
  const canGenerateDescription = !!selectedTitle && productDescription.trim().length > 0;
  const canGenerateImages = colorVariants.length > 0 && referenceImages.length > 0;

  /* ────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Gerador de Produto</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gere título, descrição e imagens para importação manual na Shopify.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedAt && (
              <span className="text-xs text-gray-600">Salvo às {savedAt}</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-white/8 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M12 12V3m0 9l-3-3m3 3l3-3" />
              </svg>
              Salvar
            </button>
            {savedAt && (
              <button
                type="button"
                onClick={handleClearSave}
                className="px-2 py-2 text-gray-600 hover:text-red-400 rounded-lg text-xs transition-colors"
                title="Limpar dados salvos"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Cost bar */}
        {sessionCost.usd > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-gray-900/70 border border-white/6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-400">Custo desta sessão:</span>
              <span className="font-semibold text-white">${sessionCost.usd.toFixed(4)}</span>
              <span className="text-gray-600 text-xs">USD</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="text-gray-500 text-xs">
              Tokens texto{"\u00a0\u00a0"}
              <span className="text-gray-300">{sessionCost.textTokensIn.toLocaleString("pt-BR")}</span>
              <span className="text-gray-600"> entrada</span>
              {" · "}
              <span className="text-gray-300">{sessionCost.textTokensOut.toLocaleString("pt-BR")}</span>
              <span className="text-gray-600"> saída</span>
            </div>
            {sessionCost.imageCount > 0 && (
              <>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <div className="text-xs text-gray-500">
                  <span className="text-gray-300">{sessionCost.imageCount}</span>
                  {" imagem"}{sessionCost.imageCount !== 1 ? "ns" : ""}{" gerada"}{sessionCost.imageCount !== 1 ? "s" : ""}
                  <span className="text-gray-600 ml-1">(estimativa)</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Global error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ══════════ LEFT: Form ══════════ */}
          <div className="space-y-5">

            {/* 1 ─ Produto */}
            <SectionCard title="1. Produto">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Descreva o produto <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={4}
                  placeholder="Ex: a short-sleeve linen shirt with mandarin collar and chest pocket"
                  className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Público-alvo</label>
                <div className="flex gap-3">
                  {(["male", "female"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setGender(v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${gender === v ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800/40 border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-200"}`}>
                      {v === "male" ? "Masculino" : "Feminino"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Número de peças</label>
                <div className="flex gap-3">
                  {(["1", "2"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setPieces(v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${pieces === v ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800/40 border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-200"}`}>
                      {v === "1" ? "1 Peça" : "2 Peças (conjunto)"}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* 2 ─ Variantes de cor */}
            <SectionCard title="2. Variantes de Cor">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-2">
                    <input
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                      placeholder="Cor (ex: Black)"
                      className="flex-1 min-w-0 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                    />
                    <input
                      value={colorNoteInput}
                      onChange={(e) => setColorNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                      placeholder="Observação (ex: logo branca)"
                      className="flex-1 min-w-0 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                    />
                  </div>
                  <button type="button" onClick={addColor}
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-600">A observação será enviada como instrução extra na geração da imagem.</p>
              </div>

              {colorVariants.length > 0 && (
                <div className="space-y-1.5">
                  {colorVariants.map((v) => (
                    <div key={v.color} className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 border border-white/6 rounded-lg">
                      <span className="text-sm text-gray-200 font-medium shrink-0 w-28 truncate">{v.color}</span>
                      <input
                        value={v.note}
                        onChange={(e) => updateColorNote(v.color, e.target.value)}
                        placeholder="observação…"
                        className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:text-gray-200"
                      />
                      <button type="button" onClick={() => removeColor(v.color)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-sm shrink-0">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 3 ─ Imagens de referência */}
            <SectionCard title="3. Imagens de Referência">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
                className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/40 transition-colors"
              >
                <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-500">Arraste, clique ou cole (Ctrl+V)</p>
                <p className="text-xs text-gray-600 mt-1">PNG, JPG, WEBP · Cole da área de transferência</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleFileDrop(e.target.files)} />
              </div>

              {referenceImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {referenceImages.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 4 ─ Logo */}
            <SectionCard title="4. Logo">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tipo de logo</label>
                <div className="flex gap-2 flex-wrap">
                  {LOGO_TYPES.map((lt) => (
                    <button key={lt.id} type="button" onClick={() => setLogoType(lt.id as LogoTypeId)}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${logoType === lt.id ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800/40 border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-200"}`}>
                      {lt.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={lt.image} alt={lt.label} className="w-6 h-6 object-contain rounded"
                          style={{ background: logoType === lt.id ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)" }} />
                      )}
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              {logoType !== "none" && referenceImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">
                      Clique na imagem para marcar a posição do logo
                      {logoPosition && (
                        <span className="ml-2 text-indigo-400">
                          — marcado ({Math.round(logoPosition.x)}%, {Math.round(logoPosition.y)}%)
                        </span>
                      )}
                    </p>
                    <button type="button" onClick={() => setLogoModalOpen(true)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-3">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Tela cheia
                    </button>
                  </div>

                  {referenceImages.length > 1 && (
                    <div className="flex gap-1 mb-2">
                      {referenceImages.map((_, i) => (
                        <button key={i} type="button" onClick={() => setActiveLogoImageIdx(i)}
                          className={`px-2.5 py-1 rounded text-xs border transition-all ${activeLogoImageIdx === i ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800/40 border-white/8 text-gray-400 hover:text-gray-200"}`}>
                          Imagem {i + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <LogoMarkerImage
                    src={referenceImages[activeLogoImageIdx]?.preview}
                    logoPosition={logoPosition}
                    onMark={handleLogoClick}
                    maxHeight={280}
                  />
                </div>
              )}

              {logoType !== "none" && referenceImages.length === 0 && (
                <p className="text-xs text-gray-600">Adicione uma imagem de referência para marcar a posição do logo.</p>
              )}
            </SectionCard>

          </div>

          {/* ══════════ RIGHT: Results ══════════ */}
          <div className="space-y-5">

            {/* Title */}
            <SectionCard title="Título do Produto">
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleGenerateTitle} disabled={!canGenerateTitle || loadingTitle}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                  {loadingTitle && <Spinner />}
                  Gerar Título
                </button>
                {titleOptions.length > 0 && <span className="text-xs text-gray-600">Selecione uma opção abaixo</span>}
              </div>

              {titleOptions.length > 0 && (
                <div className="space-y-2">
                  {titleOptions.map((opt) => (
                    <button key={opt.name} type="button" onClick={() => setSelectedTitle(opt.name)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedTitle === opt.name ? "bg-indigo-600/15 border-indigo-500/50 text-white" : "bg-gray-800/40 border-white/6 text-gray-300 hover:border-white/20"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{opt.name}</span>
                        {opt.recommended && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            Recomendado
                          </span>
                        )}
                      </div>
                      {opt.recommended && opt.explanation && (
                        <p className="mt-1 text-xs text-gray-500">{opt.explanation}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedTitle && (
                <div className="px-3 py-2.5 bg-gray-800/60 rounded-lg border border-white/6">
                  <p className="text-xs text-gray-600 mb-0.5">Selecionado</p>
                  <p className="text-sm text-indigo-300 font-medium">{selectedTitle}</p>
                </div>
              )}
            </SectionCard>

            {/* Description */}
            <SectionCard title="Descrição do Produto">
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleGenerateDescription} disabled={!canGenerateDescription || loadingDescription}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                  {loadingDescription && <Spinner />}
                  Gerar Descrição
                </button>
                {!canGenerateDescription && (
                  <span className="text-xs text-gray-600">
                    {!selectedTitle ? "Selecione um título primeiro" : "Preencha a descrição do produto"}
                  </span>
                )}
              </div>

              {descriptionHtml && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 p-1 bg-gray-800/60 rounded-lg">
                      {(["preview", "html"] as const).map((tab) => (
                        <button key={tab} type="button" onClick={() => setDescTab(tab)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${descTab === tab ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                          {tab === "preview" ? "Preview" : "HTML"}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={copyHtml}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-white/8 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar HTML
                    </button>
                  </div>

                  {descTab === "preview" ? (
                    <div className="border border-white/8 rounded-xl overflow-hidden bg-white">
                      <iframe
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#111;}h3{font-size:16px;font-weight:600;}</style></head><body>${descriptionHtml}</body></html>`}
                        className="w-full" style={{ height: 480, border: "none" }}
                        sandbox="allow-same-origin" title="Description preview" />
                    </div>
                  ) : (
                    <pre className="bg-gray-900 border border-white/6 rounded-xl p-4 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-96">
                      {descriptionHtml}
                    </pre>
                  )}
                </>
              )}
            </SectionCard>

            {/* Images */}
            <SectionCard title="Imagens das Variantes">
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={handleGenerateImages} disabled={!canGenerateImages || imageGenActive}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                  {imageGenActive && <Spinner />}
                  {imageGenActive ? "Gerando…" : "Gerar Imagens"}
                </button>
                {!canGenerateImages && (
                  <span className="text-xs text-gray-600">
                    {!referenceImages.length ? "Adicione imagens de referência" : "Adicione pelo menos uma cor"}
                  </span>
                )}
                {imageGenActive && generatedImages.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {generatedImages.filter((i) => !i.loading).length} / {generatedImages.length} concluídas
                  </span>
                )}
              </div>

              {generatedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {generatedImages.map((img) => (
                    <div key={img.color} className="rounded-xl overflow-hidden bg-gray-800 border border-white/6">
                      {img.loading ? (
                        <div className="aspect-2/3 flex flex-col items-center justify-center gap-3">
                          <Spinner className="w-6 h-6 text-indigo-400" />
                          <div className="text-center">
                            <p className="text-xs text-gray-400">{img.color}</p>
                            {img.note && <p className="text-xs text-gray-600">{img.note}</p>}
                          </div>
                        </div>
                      ) : img.error ? (
                        <div className="aspect-2/3 flex flex-col items-center justify-center gap-2 p-3 text-center">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <span className="text-xs text-red-400">{img.error}</span>
                          <span className="text-xs text-gray-600">{img.color}</span>
                        </div>
                      ) : (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.color} className="w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-3 py-3">
                            <p className="text-xs text-white font-medium">{img.color}</p>
                            {img.note && <p className="text-xs text-gray-300 mt-0.5">{img.note}</p>}
                          </div>
                          {/* actions */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button"
                              onClick={() => setLightboxImage({ url: img.url, color: img.color, note: img.note })}
                              className="w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                              title="Ampliar">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                              </svg>
                            </button>
                            <a href={img.url} download={`${selectedTitle || "produto"}-${img.color}.png`}
                              className="w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                              title="Download">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

          </div>
        </div>
      </div>

      {/* ── Logo fullscreen modal ── */}
      {logoModalOpen && referenceImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div>
              <p className="text-sm font-medium text-white">Marcar posição do logo</p>
              <p className="text-xs text-gray-500 mt-0.5">Clique na imagem para definir onde o logo deve aparecer</p>
            </div>
            <div className="flex items-center gap-3">
              {logoPosition && (
                <span className="text-xs text-indigo-400">
                  Posição: {Math.round(logoPosition.x)}%, {Math.round(logoPosition.y)}%
                </span>
              )}
              {referenceImages.length > 1 && (
                <div className="flex gap-1">
                  {referenceImages.map((_, i) => (
                    <button key={i} type="button" onClick={() => setActiveLogoImageIdx(i)}
                      className={`px-2.5 py-1 rounded text-xs border transition-all ${activeLogoImageIdx === i ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800 border-white/8 text-gray-400 hover:text-gray-200"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setLogoModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                Confirmar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <LogoMarkerImage
              src={referenceImages[activeLogoImageIdx]?.preview}
              logoPosition={logoPosition}
              onMark={handleLogoClick}
              fullscreen
            />
          </div>
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{lightboxImage.color}</p>
              {lightboxImage.note && <p className="text-xs text-gray-400">{lightboxImage.note}</p>}
            </div>
            <a
              href={lightboxImage.url}
              download={`${selectedTitle || "produto"}-${lightboxImage.color}.png`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-white/8 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </a>
            <button type="button" onClick={() => setLightboxImage(null)}
              className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-white/8 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-colors">
              ✕
            </button>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="max-h-screen max-w-3xl w-full p-4 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.color}
              className="w-full h-auto rounded-xl shadow-2xl"
              style={{ maxHeight: "calc(100vh - 80px)", objectFit: "contain" }}
            />
          </div>
          <p className="absolute bottom-4 text-xs text-gray-600">Clique fora para fechar · ESC</p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Logo marker sub-component
────────────────────────────────────────────────────────────── */
function LogoMarkerImage({
  src,
  logoPosition,
  onMark,
  maxHeight,
  fullscreen,
}: {
  src: string;
  logoPosition: LogoPosition | null;
  onMark: (e: React.MouseEvent<HTMLDivElement>) => void;
  maxHeight?: number;
  fullscreen?: boolean;
}) {
  return (
    <div
      onClick={onMark}
      className={`relative cursor-crosshair rounded-xl overflow-hidden border border-white/8 bg-gray-800 select-none ${fullscreen ? "w-full" : ""}`}
      style={fullscreen ? { maxHeight: "calc(100vh - 120px)" } : { maxHeight }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="logo marker"
        className="w-full object-contain pointer-events-none"
        style={fullscreen ? { maxHeight: "calc(100vh - 120px)" } : { maxHeight }}
        draggable={false}
      />
      {logoPosition && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `calc(${logoPosition.x}% - 10px)`, top: `calc(${logoPosition.y}% - 10px)` }}
        >
          <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow-lg shadow-indigo-500/50" />
          <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <div className="w-0.5 h-5 bg-white/70 absolute left-1/2 -translate-x-1/2" />
            <div className="h-0.5 w-5 bg-white/70 absolute top-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}
    </div>
  );
}

