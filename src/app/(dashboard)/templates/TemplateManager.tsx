"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TemplateType,
  TemplateLibraryItem,
  ReplyTemplateConfig,
  RemarketingTemplateConfig,
} from "@/lib/types";

/* ─── Defaults ─────────────────────────────────────────────────────────────── */

const REPLY_DEFAULT: ReplyTemplateConfig = {
  primaryColor: "#1d4ed8",
  backgroundColor: "#f3f4f6",
  borderColor: "#e5e7eb",
  textColor: "#374151",
  footerBackgroundColor: "#f9fafb",
  footerTextColor: "#9ca3af",
  showLogo: false,
};

const REMARKETING_DEFAULT: RemarketingTemplateConfig = {
  primaryColor: "#1d4ed8",
  accentColor: "#fbbf24",
  backgroundColor: "#f3f4f6",
  textColor: "#111827",
  borderColor: "#e5e7eb",
  buttonColor: "#1d4ed8",
  buttonTextColor: "#ffffff",
  buttonBorderRadius: "6px",
  bannerBackgroundColor: "#fffbeb",
  bannerBorderColor: "#fbbf24",
  bannerTextColor: "#92400e",
  footerBackgroundColor: "#f9fafb",
  footerTextColor: "#9ca3af",
};

const REMARKETING_PRESETS = [
  {
    name: "Azul Moderno",
    primary: "#1d4ed8",
    button: "#1d4ed8",
    accent: "#fbbf24",
  },
  {
    name: "Verde Sucesso",
    primary: "#059669",
    button: "#059669",
    accent: "#fbbf24",
  },
  {
    name: "Roxo Premium",
    primary: "#7c3aed",
    button: "#7c3aed",
    accent: "#f59e0b",
  },
  {
    name: "Vermelho Energia",
    primary: "#dc2626",
    button: "#dc2626",
    accent: "#fbbf24",
  },
  {
    name: "Laranja Vibrante",
    primary: "#ea580c",
    button: "#ea580c",
    accent: "#fbbf24",
  },
];

type AnyConfig = ReplyTemplateConfig | RemarketingTemplateConfig;

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ColorInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      {description && (
        <p className="text-xs text-gray-600 mb-1">{description}</p>
      )}
      <div className="flex gap-2 items-center">
        <div className="relative shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div
            className="h-8 w-8 rounded-lg border border-white/10 cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-gray-800/60 border border-white/6 rounded-lg px-3 py-1.5 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

/* ─── Mini email thumbnail ──────────────────────────────────────────────────── */

function EmailThumbnail({
  type,
  config,
}: {
  type: TemplateType;
  config: AnyConfig;
}) {
  const cfg = config as any;
  return (
    <div
      className="w-full rounded-md overflow-hidden border border-black/10"
      style={{ backgroundColor: cfg.backgroundColor }}
    >
      {/* Top accent */}
      <div className="h-1" style={{ backgroundColor: cfg.primaryColor }} />
      {/* Body */}
      <div
        className="px-2 py-2 space-y-1.5"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Title line */}
        <div
          className="h-2 rounded-sm w-3/4"
          style={{ backgroundColor: cfg.textColor, opacity: 0.25 }}
        />
        {/* Text lines */}
        <div
          className="h-1.5 rounded-sm w-full"
          style={{ backgroundColor: cfg.textColor, opacity: 0.1 }}
        />
        <div
          className="h-1.5 rounded-sm w-5/6"
          style={{ backgroundColor: cfg.textColor, opacity: 0.1 }}
        />
        {type === "remarketing" && (
          <>
            {/* Product card */}
            <div
              className="mt-1 rounded border px-1.5 py-1 flex gap-1 items-center"
              style={{ borderColor: cfg.borderColor }}
            >
              <div
                className="w-4 h-4 rounded-sm shrink-0"
                style={{ backgroundColor: cfg.borderColor }}
              />
              <div className="flex-1 space-y-0.5">
                <div
                  className="h-1.5 rounded-sm w-full"
                  style={{ backgroundColor: cfg.textColor, opacity: 0.15 }}
                />
                <div
                  className="h-1 rounded-sm w-2/3"
                  style={{ backgroundColor: cfg.textColor, opacity: 0.1 }}
                />
              </div>
            </div>
            {/* Banner */}
            <div
              className="rounded px-1.5 py-1"
              style={{
                backgroundColor: cfg.bannerBackgroundColor,
                border: `1px solid ${cfg.bannerBorderColor}`,
              }}
            >
              <div
                className="h-1.5 rounded-sm w-2/3 mx-auto"
                style={{ backgroundColor: cfg.bannerTextColor, opacity: 0.4 }}
              />
            </div>
            {/* Button */}
            <div
              className="rounded py-1 text-center"
              style={{
                backgroundColor: cfg.buttonColor,
                borderRadius: cfg.buttonBorderRadius,
              }}
            >
              <div
                className="h-1.5 rounded-sm w-1/2 mx-auto"
                style={{ backgroundColor: cfg.buttonTextColor, opacity: 0.5 }}
              />
            </div>
          </>
        )}
        {type === "reply" && (
          <div
            className="h-1.5 rounded-sm w-2/3"
            style={{ backgroundColor: cfg.textColor, opacity: 0.1 }}
          />
        )}
      </div>
      {/* Footer */}
      <div
        className="px-2 py-1.5 border-t"
        style={{
          backgroundColor: cfg.footerBackgroundColor,
          borderColor: cfg.borderColor,
        }}
      >
        <div
          className="h-1 rounded-sm w-1/3"
          style={{ backgroundColor: cfg.footerTextColor, opacity: 0.4 }}
        />
      </div>
    </div>
  );
}

/* ─── Preview generators (iframe) ──────────────────────────────────────────── */

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateReplyPreview(
  config: ReplyTemplateConfig,
  logoUrl?: string | null,
): string {
  const body = `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">Olá! Obrigado por entrar em contato conosco.</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">Recebemos sua mensagem e estamos analisando sua solicitação. Nossa equipe irá retornar em breve com mais informações.</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">Atenciosamente,<br/>Equipe Sua Loja</p>`;
  const logo =
    config.showLogo && logoUrl
      ? `<tr><td style="padding:20px 40px 0 40px"><img src="${esc(logoUrl)}" alt="Logo" style="max-height:36px;object-fit:contain;display:block"/></td></tr>`
      : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${esc(config.backgroundColor)}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${esc(config.backgroundColor)};padding:20px 12px">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#fff;border-radius:6px;border:1px solid ${esc(config.borderColor)};overflow:hidden">
<tr><td style="height:4px;background:${esc(config.primaryColor)};font-size:0">&nbsp;</td></tr>
${logo}
<tr><td style="padding:28px 40px 16px 40px">${body}</td></tr>
<tr><td style="padding:12px 40px 16px 40px;border-top:1px solid ${esc(config.borderColor)};background:${esc(config.footerBackgroundColor)}">
<p style="margin:0;font-size:12px;color:${esc(config.footerTextColor)}">Sua Loja</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function generateRemarketingPreview(config: RemarketingTemplateConfig): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${esc(config.backgroundColor)}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${esc(config.backgroundColor)};padding:20px 12px">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#fff;border-radius:6px;border:1px solid ${esc(config.borderColor)};overflow:hidden">
<tr><td style="height:4px;background:${esc(config.primaryColor)};font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 40px 20px 40px">
  <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:${esc(config.textColor)}">Olá, Cliente Teste!</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6b7280">Você deixou alguns itens no carrinho. Preparamos uma oferta exclusiva:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${esc(config.borderColor)};border-radius:8px;margin-bottom:16px">
  <tr><td style="padding:12px 14px"><table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td width="48" style="padding-right:12px"><div style="width:48px;height:48px;background:#f3f4f6;border-radius:6px"></div></td>
    <td><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${esc(config.textColor)}">Produto Exemplo</p><p style="margin:0;font-size:12px;color:#9ca3af">Qtd: 1 · R$ 99,90</p></td>
  </tr></table></td></tr>
  <tr><td style="padding:10px 14px;border-top:1px solid ${esc(config.borderColor)}"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:13px;font-weight:600;color:${esc(config.textColor)}">Total</td>
    <td style="font-size:13px;font-weight:700;color:${esc(config.textColor)};text-align:right">R$ 99,90</td>
  </tr></table></td></tr></table>
  <div style="padding:14px;border:1px solid ${esc(config.bannerBorderColor)};background:${esc(config.bannerBackgroundColor)};border-radius:8px;text-align:center;margin-bottom:16px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${esc(config.bannerTextColor)}">10% de desconto aplicado automaticamente</p>
    <p style="margin:0;font-size:12px;color:${esc(config.bannerTextColor)};opacity:0.8">Oferta válida por 48 horas</p>
  </div>
  <div style="background:${esc(config.buttonColor)};border-radius:${esc(config.buttonBorderRadius)};text-align:center;padding:14px">
    <span style="font-size:14px;font-weight:600;color:${esc(config.buttonTextColor)}">Finalizar compra com 10% de desconto →</span>
  </div>
</td></tr>
<tr><td style="padding:12px 40px 16px;border-top:1px solid ${esc(config.borderColor)};background:${esc(config.footerBackgroundColor)}">
  <p style="margin:0;font-size:12px;color:${esc(config.footerTextColor)}">Dúvidas? Responda este e-mail. — Sua Loja</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/* ─── Template Card ─────────────────────────────────────────────────────────── */

function TemplateCard({
  item,
  type,
  isEditing,
  onEdit,
  onActivate,
  onDelete,
  activating,
  deleting,
}: {
  item: TemplateLibraryItem;
  type: TemplateType;
  isEditing: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
  activating: boolean;
  deleting: boolean;
}) {
  return (
    <div
      className={`bg-gray-900/60 border rounded-xl overflow-hidden transition-all ${
        item.isActive
          ? "border-indigo-500/50"
          : isEditing
            ? "border-white/15"
            : "border-white/6"
      }`}
    >
      {/* Mini thumbnail */}
      <div className="p-3 bg-gray-800/40">
        <EmailThumbnail type={type} config={item.config} />
      </div>

      {/* Info + actions */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-sm font-medium text-gray-200 truncate leading-snug">
            {item.name}
          </p>
          {item.isActive && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 rounded font-medium">
              Ativo
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className={`flex-1 px-2 py-1.5 text-xs font-medium border rounded-lg transition-all ${
              isEditing
                ? "bg-white/8 border-white/15 text-gray-200"
                : "bg-gray-800/60 hover:bg-white/5 border-white/6 text-gray-400 hover:text-gray-300"
            }`}
          >
            {isEditing ? "Editando" : "Editar"}
          </button>
          {!item.isActive && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center gap-1"
            >
              {activating ? <Spinner className="w-3 h-3" /> : "Usar este"}
            </button>
          )}
          {!item.isActive && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="w-7 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/8 border border-white/6 hover:border-red-500/20 rounded-lg transition-all"
            >
              {deleting ? (
                <Spinner className="w-3 h-3" />
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Section label ─────────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {children}
    </p>
  );
}

/* ─── Main TemplateManager ──────────────────────────────────────────────────── */

interface Props {
  type: TemplateType;
  accountId: string;
  logoUrl?: string | null;
}

export default function TemplateManager({ type, accountId, logoUrl }: Props) {
  const [templates, setTemplates] = useState<TemplateLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [editConfig, setEditConfig] = useState<AnyConfig>(
    type === "reply" ? REPLY_DEFAULT : REMARKETING_DEFAULT,
  );
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!accountId || accountId === "all") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/template-library?accountId=${accountId}&type=${type}`,
      );
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      toast.error("Erro ao carregar templates");
    }
    setLoading(false);
  }, [accountId, type]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditConfig(
      type === "reply" ? { ...REPLY_DEFAULT } : { ...REMARKETING_DEFAULT },
    );
    setEditName("Novo Template");
    setEditingId("new");
  };

  const openEdit = (item: TemplateLibraryItem) => {
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setEditConfig({ ...(item.config as AnyConfig) });
    setEditName(item.name);
    setEditingId(item.id);
  };

  const closeEdit = () => setEditingId(null);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Dê um nome ao template");
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        const res = await fetch("/api/template-library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            type,
            name: editName.trim(),
            config: editConfig,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          toast.error(d.error || "Erro ao criar");
        } else {
          toast.success("Template criado!");
          closeEdit();
          await load();
        }
      } else {
        const res = await fetch(`/api/template-library/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), config: editConfig }),
        });
        if (!res.ok) {
          const d = await res.json();
          toast.error(d.error || "Erro ao salvar");
        } else {
          toast.success("Template salvo!");
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingId
                ? { ...t, name: editName.trim(), config: editConfig }
                : t,
            ),
          );
          closeEdit();
        }
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setSaving(false);
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      const res = await fetch(`/api/template-library/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Template ativado!");
        setTemplates((prev) =>
          prev.map((t) => ({ ...t, isActive: t.id === id })),
        );
      } else {
        const d = await res.json();
        toast.error(d.error || "Erro ao ativar");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setActivatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/template-library/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Excluído!");
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        const d = await res.json();
        toast.error(d.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setDeletingId(null);
  };

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setSending(true);
    const endpoint =
      type === "reply"
        ? "/api/templates/reply/test"
        : "/api/remarketing/template/test";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, testEmail, template: editConfig }),
      });
      const d = await res.json();
      if (res.ok) toast.success(d.message || "Email de teste enviado!");
      else toast.error(d.error || "Erro ao enviar");
    } catch {
      toast.error("Erro de conexão");
    }
    setSending(false);
  };

  const previewHtml =
    type === "reply"
      ? generateReplyPreview(editConfig as ReplyTemplateConfig, logoUrl)
      : generateRemarketingPreview(editConfig as RemarketingTemplateConfig);

  const rc = editConfig as ReplyTemplateConfig;
  const mc = editConfig as RemarketingTemplateConfig;

  if (!accountId || accountId === "all") {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">
            Nenhuma loja selecionada
          </p>
          <p className="text-sm text-gray-600">
            Selecione uma loja para gerenciar os templates
          </p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-6 h-6 text-indigo-400" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {templates.length > 0
            ? `${templates.length} template${templates.length > 1 ? "s" : ""}`
            : "Nenhum template criado ainda"}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Novo Template
        </button>
      </div>

      {/* Template grid */}
      {templates.length === 0 && editingId === null ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gray-800/60 border border-white/6 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">
              Crie seu primeiro template
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Personalize as cores e identidade dos emails enviados pelo sistema
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Criar Template
          </button>
        </div>
      ) : (
        templates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {templates.map((item) => (
              <TemplateCard
                key={item.id}
                item={item}
                type={type}
                isEditing={editingId === item.id}
                onEdit={() => openEdit(item)}
                onActivate={() => handleActivate(item.id)}
                onDelete={() => handleDelete(item.id)}
                activating={activatingId === item.id}
                deleting={deletingId === item.id}
              />
            ))}
          </div>
        )
      )}

      {/* Editor panel */}
      {editingId !== null && (
        <div className="bg-gray-900/60 border border-white/8 rounded-xl overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/6 bg-gray-800/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-100 focus:outline-none border-b border-transparent focus:border-indigo-500/60 pb-0.5 transition-colors w-56 truncate"
                placeholder="Nome do template"
              />
              <span className="text-xs text-gray-600 shrink-0">
                {editingId === "new" ? "— novo" : "— editando"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Test email inline */}
              <div className="flex items-center gap-1.5 bg-gray-800/60 border border-white/6 rounded-lg px-2 pr-1 py-1">
                <svg
                  className="w-3.5 h-3.5 text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Testar com email..."
                  className="bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none w-40"
                />
                <button
                  onClick={handleTest}
                  disabled={sending}
                  className="px-2 py-0.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded transition-all flex items-center gap-1"
                >
                  {sending ? <Spinner className="w-3 h-3" /> : "Enviar"}
                </button>
              </div>
              <button
                onClick={closeEdit}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white shadow shadow-indigo-600/20 transition-all"
              >
                {saving ? (
                  <>
                    <Spinner className="w-3 h-3" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>

          {/* Editor body */}
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Controls sidebar */}
            <div
              className="lg:col-span-2 border-r border-white/6 overflow-y-auto"
              style={{ maxHeight: "560px" }}
            >
              <div className="p-5 space-y-5">
                {/* Reply template controls */}
                {type === "reply" && (
                  <>
                    <div className="space-y-3">
                      <SectionLabel>Identidade</SectionLabel>
                      <ColorInput
                        label="Cor Primária"
                        value={rc.primaryColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, primaryColor: v })
                        }
                        description="Barra de destaque no topo"
                      />
                      <ColorInput
                        label="Texto do Corpo"
                        value={rc.textColor}
                        onChange={(v) => setEditConfig({ ...rc, textColor: v })}
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Fundo</SectionLabel>
                      <ColorInput
                        label="Fundo Externo"
                        value={rc.backgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, backgroundColor: v })
                        }
                      />
                      <ColorInput
                        label="Borda do Card"
                        value={rc.borderColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, borderColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Rodapé</SectionLabel>
                      <ColorInput
                        label="Fundo"
                        value={rc.footerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, footerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label="Texto"
                        value={rc.footerTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, footerTextColor: v })
                        }
                      />
                    </div>
                    {logoUrl && (
                      <div className="pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-400">
                              Exibir logo da loja
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Logo cadastrada na conta
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setEditConfig({ ...rc, showLogo: !rc.showLogo })
                            }
                            className={`relative w-9 h-5 rounded-full transition-colors ${rc.showLogo ? "bg-indigo-600" : "bg-gray-700"}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rc.showLogo ? "translate-x-4" : ""}`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Remarketing template controls */}
                {type === "remarketing" && (
                  <>
                    {/* Presets */}
                    <div className="space-y-2">
                      <SectionLabel>Presets Rápidos</SectionLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        {REMARKETING_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            onClick={() =>
                              setEditConfig({
                                ...mc,
                                primaryColor: p.primary,
                                buttonColor: p.button,
                                accentColor: p.accent,
                                bannerBorderColor: p.accent,
                              })
                            }
                            className="flex items-center gap-2 p-2 rounded-lg border border-white/6 hover:border-white/12 hover:bg-white/3 transition-all text-left"
                          >
                            <div className="flex gap-1 shrink-0">
                              {[p.primary, p.button, p.accent].map((c, i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {p.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Botão CTA</SectionLabel>
                      <ColorInput
                        label="Fundo"
                        value={mc.buttonColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, buttonColor: v })
                        }
                      />
                      <ColorInput
                        label="Texto"
                        value={mc.buttonTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, buttonTextColor: v })
                        }
                      />
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          Arredondamento
                        </label>
                        <select
                          value={mc.buttonBorderRadius}
                          onChange={(e) =>
                            setEditConfig({
                              ...mc,
                              buttonBorderRadius: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        >
                          <option value="0px">Reto</option>
                          <option value="4px">Suave</option>
                          <option value="6px">Padrão</option>
                          <option value="8px">Arredondado</option>
                          <option value="12px">Muito Arredondado</option>
                          <option value="999px">Pílula</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Banner de Desconto</SectionLabel>
                      <ColorInput
                        label="Fundo"
                        value={mc.bannerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label="Borda"
                        value={mc.bannerBorderColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerBorderColor: v })
                        }
                      />
                      <ColorInput
                        label="Texto"
                        value={mc.bannerTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerTextColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Estrutura</SectionLabel>
                      <ColorInput
                        label="Cor Primária"
                        value={mc.primaryColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, primaryColor: v })
                        }
                        description="Barra superior"
                      />
                      <ColorInput
                        label="Fundo Externo"
                        value={mc.backgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, backgroundColor: v })
                        }
                      />
                      <ColorInput
                        label="Texto Principal"
                        value={mc.textColor}
                        onChange={(v) => setEditConfig({ ...mc, textColor: v })}
                      />
                      <ColorInput
                        label="Bordas"
                        value={mc.borderColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, borderColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>Rodapé</SectionLabel>
                      <ColorInput
                        label="Fundo"
                        value={mc.footerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, footerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label="Texto"
                        value={mc.footerTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, footerTextColor: v })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-3 p-5 bg-gray-950/30">
              <p className="text-xs font-medium text-gray-600 mb-3">
                Preview em tempo real
              </p>
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-xl border border-white/6 bg-white"
                style={{ height: "500px" }}
                title="Preview do template"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
