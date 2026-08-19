"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Advertorial {
  id: string;
  title: string;
  slug: string;
  customDomain: string | null;
  active: boolean;
  createdAt: string | null;
}

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      title="Copiar link"
      className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface EditModalProps {
  advertorial: Advertorial | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ advertorial, onClose, onSaved }: EditModalProps) {
  const isEdit = advertorial !== null;
  const [title, setTitle] = useState(advertorial?.title ?? "");
  const [slug, setSlug] = useState(advertorial?.slug ?? "");
  const [html, setHtml] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(isEdit);
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    // Fetch full HTML for editing (not returned in list endpoint)
    fetch(`/api/advertorials/${advertorial.id}/html`)
      .then((r) => r.json())
      .then((d) => {
        setHtml(d.html ?? "");
        setLoadingHtml(false);
      })
      .catch(() => setLoadingHtml(false));
  }, [isEdit, advertorial?.id]);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugEdited) setSlug(toSlug(v));
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim() || !html.trim()) {
      toast.error("Preencha título, slug e HTML");
      return;
    }
    setSaving(true);
    try {
      const res = isEdit
        ? await fetch(`/api/advertorials/${advertorial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, html }),
          })
        : await fetch("/api/advertorials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, slug, html }),
          });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar");
      } else {
        toast.success(isEdit ? "Advertorial atualizado!" : "Advertorial criado!");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">
            {isEdit ? "Editar advertorial" : "Novo advertorial"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: 5 Causas de Perda de Visão"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>

          {/* Slug */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Slug <span className="text-gray-600 font-normal">(URL pública)</span>
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500/60 transition-colors">
                <span className="text-gray-600 text-sm shrink-0">
                  {typeof window !== "undefined" ? window.location.host : "reply.picdev.com.br"}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder="meu-advertorial"
                  className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* HTML */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              HTML da página
            </label>
            {loadingHtml ? (
              <div className="flex items-center justify-center h-64 bg-white/3 rounded-xl border border-white/8">
                <Spinner className="w-5 h-5 text-gray-600" />
              </div>
            ) : (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="Cole o HTML completo da sua página aqui..."
                rows={16}
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3.5 py-3 text-xs text-gray-300 placeholder-gray-700 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors resize-y"
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving && <Spinner />}
            {isEdit ? "Salvar alterações" : "Criar advertorial"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Domain Modal ─────────────────────────────────────────────────────────────

interface DomainModalProps {
  advertorial: Advertorial;
  onClose: () => void;
  onSaved: () => void;
}

function DomainModal({ advertorial, onClose, onSaved }: DomainModalProps) {
  const [domain, setDomain] = useState(advertorial.customDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isApex = domain.split(".").length === 2;

  async function handleSave() {
    if (!domain.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/advertorials/${advertorial.id}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao configurar domínio");
      } else {
        toast.success("Domínio configurado! Configure o DNS conforme as instruções.");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setSaving(false);
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/advertorials/${advertorial.id}/domain`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao remover domínio");
      } else {
        toast.success("Domínio removido");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setRemoving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-gray-100">Domínio personalizado</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Domínio do cliente
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase().trim())}
              placeholder="portal.seucliente.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Sem https:// — apenas o domínio, ex: <span className="text-gray-500">portal.cliente.com</span>
            </p>
          </div>

          {/* DNS Instructions */}
          {domain && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Configure o DNS do seu cliente
              </p>
              <div className="space-y-2 text-xs">
                {isApex ? (
                  <>
                    <p className="text-gray-400">Para domínio raiz, adicione um registro <span className="text-white font-medium">A</span>:</p>
                    <div className="font-mono bg-black/30 rounded-lg p-3 space-y-1">
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Tipo</span>
                        <span className="text-gray-200">A</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Nome</span>
                        <span className="text-gray-200">@</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Valor</span>
                        <span className="text-indigo-300">76.76.21.21</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400">Para subdomínio, adicione um registro <span className="text-white font-medium">CNAME</span>:</p>
                    <div className="font-mono bg-black/30 rounded-lg p-3 space-y-1">
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Tipo</span>
                        <span className="text-gray-200">CNAME</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Nome</span>
                        <span className="text-gray-200">{domain.split(".")[0]}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-16 shrink-0">Valor</span>
                        <span className="text-indigo-300">cname.vercel-dns.com</span>
                      </div>
                    </div>
                  </>
                )}
                <p className="text-gray-600">A propagação de DNS pode levar até 48h.</p>
              </div>
            </div>
          )}

          {/* Current domain info */}
          {advertorial.customDomain && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Domínio atual</p>
                <p className="text-sm text-gray-200 font-mono mt-0.5">{advertorial.customDomain}</p>
              </div>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                {removing ? <Spinner /> : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Remover
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !domain.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving && <Spinner />}
            Salvar domínio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdvertoriaisPage() {
  const [advertorials, setAdvertorials] = useState<Advertorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Advertorial | null | undefined>(undefined);
  const [domainTarget, setDomainTarget] = useState<Advertorial | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/advertorials");
    if (res.ok) {
      const data = await res.json();
      setAdvertorials(data.advertorials ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleToggle(adv: Advertorial) {
    setTogglingId(adv.id);
    try {
      const res = await fetch(`/api/advertorials/${adv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !adv.active }),
      });
      if (res.ok) {
        setAdvertorials((prev) =>
          prev.map((a) => (a.id === adv.id ? { ...a, active: !adv.active } : a))
        );
        toast.success(adv.active ? "Advertorial pausado" : "Advertorial ativado");
      } else {
        toast.error("Erro ao atualizar");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setTogglingId(null);
  }

  async function handleDelete(adv: Advertorial) {
    if (!confirm(`Excluir "${adv.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(adv.id);
    try {
      const res = await fetch(`/api/advertorials/${adv.id}`, { method: "DELETE" });
      if (res.ok) {
        setAdvertorials((prev) => prev.filter((a) => a.id !== adv.id));
        toast.success("Advertorial excluído");
      } else {
        toast.error("Erro ao excluir");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setDeletingId(null);
  }

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://reply.picdev.com.br";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Modals */}
      {editTarget !== undefined && (
        <EditModal
          advertorial={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={fetchData}
        />
      )}
      {domainTarget && (
        <DomainModal
          advertorial={domainTarget}
          onClose={() => setDomainTarget(null)}
          onSaved={fetchData}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Advertoriais</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Páginas HTML publicadas com link próprio e domínio personalizado
          </p>
        </div>
        <button
          onClick={() => setEditTarget(null)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo advertorial
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
          <Spinner className="w-5 h-5 mr-2" />
          Carregando...
        </div>
      ) : advertorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/6 rounded-2xl bg-gray-900/30 text-gray-600">
          <svg className="w-10 h-10 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Nenhum advertorial criado ainda.</p>
          <p className="text-xs text-gray-600 mt-1">Cole seu HTML e gere um link público em segundos.</p>
          <button
            onClick={() => setEditTarget(null)}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white transition-colors"
          >
            Criar primeiro advertorial
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {advertorials.map((adv) => (
            <div
              key={adv.id}
              className="bg-gray-900/60 border border-white/6 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Status dot */}
              <div className="shrink-0 hidden sm:block">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${adv.active ? "bg-emerald-400" : "bg-gray-600"}`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200 truncate">{adv.title}</span>
                  {!adv.active && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-700/60 text-gray-500 border border-white/6">
                      pausado
                    </span>
                  )}
                </div>

                {/* Main URL */}
                <div className="flex items-center gap-1.5 mt-1">
                  <a
                    href={`${baseUrl}/${adv.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-mono truncate transition-colors"
                  >
                    {baseUrl}/{adv.slug}
                  </a>
                  <CopyButton text={`${baseUrl}/${adv.slug}`} />
                </div>

                {/* Custom domain */}
                {adv.customDomain && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a
                      href={`https://${adv.customDomain}/${adv.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 font-mono truncate transition-colors"
                    >
                      {adv.customDomain}/{adv.slug}
                    </a>
                    <CopyButton text={`https://${adv.customDomain}/${adv.slug}`} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Edit */}
                <button
                  onClick={() => setEditTarget(adv)}
                  title="Editar"
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>

                {/* Domain */}
                <button
                  onClick={() => setDomainTarget(adv)}
                  title="Configurar domínio personalizado"
                  className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </button>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(adv)}
                  disabled={togglingId === adv.id}
                  title={adv.active ? "Pausar" : "Ativar"}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 disabled:opacity-50 transition-all"
                >
                  {togglingId === adv.id ? (
                    <Spinner />
                  ) : adv.active ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(adv)}
                  disabled={deletingId === adv.id}
                  title="Excluir"
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/5 disabled:opacity-50 transition-all"
                >
                  {deletingId === adv.id ? (
                    <Spinner />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
