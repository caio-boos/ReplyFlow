"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Extracts [IMGn] and [IMGBGn] placeholders from HTML
function extractPlaceholders(html: string): string[] {
  const matches = new Set<string>();
  const re = /\[(IMG(?:BG)?\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) matches.add(m[1]);
  return [...matches].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    if (a.includes("BG") !== b.includes("BG")) return a.includes("BG") ? 1 : -1;
    return numA - numB;
  });
}

export default function EditAdvertorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Image placeholders
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/advertorials/${id}/html`).then((r) => r.json()),
      fetch(`/api/advertorials`).then((r) => r.json()),
    ]).then(([htmlData, listData]) => {
      const h = htmlData.html ?? "";
      setHtml(h);
      setPlaceholders(extractPlaceholders(h));
      const adv = listData.advertorials?.find((a: { id: string; title: string }) => a.id === id);
      if (adv) setTitle(adv.title);
      setLoading(false);
    }).catch(() => { toast.error("Erro ao carregar advertorial"); setLoading(false); });
  }, [id]);

  // Re-extract placeholders whenever HTML changes
  useEffect(() => {
    setPlaceholders(extractPlaceholders(html));
  }, [html]);

  function applyImages() {
    let updated = html;
    for (const key of Object.keys(imgUrls)) {
      const url = imgUrls[key]?.trim();
      if (!url) continue;
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (key.startsWith("IMGBG")) {
        // Replace placeholder inside CSS background-image
        updated = updated.replace(new RegExp(`\\[${escaped}\\]`, "g"), url);
      } else {
        // Replace [IMGn] with a proper img tag
        updated = updated.replace(
          new RegExp(`\\[${escaped}\\]`, "g"),
          `<img src="${url}" alt="${key}" style="max-width:100%;height:auto;" />`
        );
      }
    }
    setHtml(updated);
    setImgUrls({});
    toast.success("Imagens aplicadas no HTML!");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/advertorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, html }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao salvar"); }
      else { toast.success("Salvo!"); router.push("/advertorials"); }
    } catch { toast.error("Erro de conexão"); }
    setSaving(false);
  }

  const filledCount = Object.values(imgUrls).filter((v) => v.trim()).length;

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
          <span className="text-sm text-gray-300 font-medium truncate max-w-50">{title || "Editar"}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving && <Spinner />}
          Salvar alterações
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-gray-600">
          <Spinner className="w-5 h-5 mr-2" /> Carregando…
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 pt-8 space-y-6">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>

          {/* Image Placeholders */}
          {placeholders.length > 0 && (
            <section className="bg-gray-900/60 border border-white/6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Imagens ({placeholders.length} placeholder{placeholders.length !== 1 ? "s" : ""})
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cole a URL de cada imagem e clique em "Aplicar imagens"
                  </p>
                </div>
                <button
                  onClick={applyImages}
                  disabled={filledCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 border border-amber-500/20 text-amber-400 text-sm font-medium rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aplicar {filledCount > 0 ? `(${filledCount})` : "imagens"}
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {placeholders.map((key) => (
                  <div key={key} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl p-3">
                    <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg shrink-0 min-w-17.5 text-center">
                      [{key}]
                    </span>
                    <input
                      type="url"
                      value={imgUrls[key] ?? ""}
                      onChange={(e) => setImgUrls((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 min-w-0 bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none"
                    />
                    {imgUrls[key]?.trim() && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrls[key]}
                        alt="preview"
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* HTML Editor */}
          <section className="bg-gray-900/60 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-500">HTML</label>
              <span className="text-xs text-gray-700">{html.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={24}
              className="w-full bg-black/30 border border-white/8 rounded-xl px-3.5 py-3 text-xs text-gray-300 font-mono focus:outline-none focus:border-indigo-500/40 transition-colors resize-y"
              spellCheck={false}
            />
          </section>

        </div>
      )}
    </div>
  );
}
