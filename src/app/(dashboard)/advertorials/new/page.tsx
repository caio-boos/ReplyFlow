"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "pt", label: "Português (BR)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文（简体）" },
];

function toSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function NewAdvertorialPage() {
  const router = useRouter();

  // Metadata
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Source mode
  const [mode, setMode] = useState<"paste" | "clone">("clone");

  // Clone inputs
  const [cloneUrl, setCloneUrl] = useState("");
  const [language, setLanguage] = useState("pt");
  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [productLink, setProductLink] = useState("");
  const [cloning, setCloning] = useState(false);

  // HTML
  const [html, setHtml] = useState("");

  const [saving, setSaving] = useState(false);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugEdited) setSlug(toSlug(v));
  }

  async function handleClone() {
    if (!cloneUrl.trim()) { toast.error("Informe a URL da página"); return; }
    setCloning(true);
    try {
      const res = await fetch("/api/advertorials/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cloneUrl, language, product, brand, productLink }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao clonar"); }
      else {
        setHtml(data.html ?? "");
        toast.success("Página clonada! Revise o HTML antes de salvar.");
      }
    } catch { toast.error("Erro de conexão"); }
    setCloning(false);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (!slug.trim()) { toast.error("Informe o slug"); return; }
    if (!html.trim()) { toast.error("Cole ou clone o HTML primeiro"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/advertorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, html }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar"); }
      else {
        toast.success("Advertorial criado!");
        router.push("/advertorials");
      }
    } catch { toast.error("Erro de conexão"); }
    setSaving(false);
  }

  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  return (
    <div className="min-h-full bg-gray-950 pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-white/6 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/advertorials"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Advertoriais
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300 font-medium">Novo advertorial</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving && <Spinner />}
          Criar advertorial
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 space-y-8">

        {/* ── Metadados ── */}
        <section className="bg-gray-900/60 border border-white/6 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-300">Informações básicas</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: 5 Causas de Perda de Visão"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Slug (URL)</label>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500/60 transition-colors">
                <span className="text-gray-600 text-xs shrink-0 truncate max-w-30">{baseUrl}/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                  placeholder="meu-advertorial"
                  className="flex-1 min-w-0 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Fonte do HTML ── */}
        <section className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/6">
            {(["clone", "paste"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "text-indigo-400 border-b-2 border-indigo-500 -mb-px"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {m === "clone" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    Clonar página
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                    Colar HTML
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {mode === "clone" ? (
              <>
                {/* Clone options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">URL da página a clonar</label>
                    <input
                      type="url"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      placeholder="https://exemplo.com/pagina-de-vendas"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Idioma de saída</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value} className="bg-gray-900">{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do produto</label>
                    <input
                      type="text"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="Ex: VisionMax Pro"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome da marca</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: OptikaBrasil"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Link do produto <span className="text-gray-600 font-normal">(substitui todos os links internos da página clonada)</span>
                    </label>
                    <input
                      type="url"
                      value={productLink}
                      onChange={(e) => setProductLink(e.target.value)}
                      placeholder="https://sualoja.com/produto/meu-produto"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button
                      onClick={handleClone}
                      disabled={cloning || !cloneUrl.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {cloning ? (
                        <><Spinner /> Clonando com IA…</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          Clonar com IA
                        </>
                      )}
                    </button>
                    {cloning && (
                      <span className="text-xs text-gray-500">Isso pode levar 30–60 segundos…</span>
                    )}
                  </div>
                </div>

                {/* Clone result notice */}
                {html && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Página clonada! As imagens foram substituídas por [IMG1], [IMG2]… Você poderá adicioná-las depois.
                  </div>
                )}
              </>
            ) : null}

            {/* HTML Editor — shown in both modes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500">
                  {mode === "clone" ? "HTML gerado (editável)" : "Cole o HTML aqui"}
                </label>
                {html && (
                  <span className="text-xs text-gray-600">{html.length.toLocaleString()} chars</span>
                )}
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder={
                  mode === "clone"
                    ? "O HTML aparecerá aqui após clonar…"
                    : "Cole o HTML completo da sua página aqui…"
                }
                rows={20}
                className="w-full bg-black/30 border border-white/8 rounded-xl px-3.5 py-3 text-xs text-gray-300 placeholder-gray-700 font-mono focus:outline-none focus:border-indigo-500/40 transition-colors resize-y"
                spellCheck={false}
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
