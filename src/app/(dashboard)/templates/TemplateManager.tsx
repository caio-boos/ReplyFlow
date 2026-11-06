"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TemplateType,
  TemplateLibraryItem,
  ReplyTemplateConfig,
  RemarketingTemplateConfig,
} from "@/lib/types";
import { renderRemarketingEmailHtml } from "@/lib/email/html-template";
import {
  CAMPAIGN_PRESETS,
  type CampaignPreset,
} from "@/lib/email/campaign-presets";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/types";

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
  campaignId: "none",
  showProductImages: true,
};

/** Fusos oferecidos no cronômetro (o fuso do navegador é acrescentado). */
const TIMEZONE_OPTIONS = [
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Argentina/Buenos_Aires",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "UTC",
];

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** ISO → valor aceito por `<input type="datetime-local">` (hora local). */
function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Foto fictícia do produto no preview (SVG inline, sem dependência externa). */
const PREVIEW_PRODUCT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#e5e7eb"/><path d="M34 98l26-32 20 24 14-16 18 24z" fill="#9ca3af"/><circle cx="52" cy="48" r="11" fill="#9ca3af"/></svg>`,
)}`;

const REMARKETING_PRESETS: {
  id: keyof Messages["compose"]["library"]["presets"];
  primary: string;
  button: string;
  accent: string;
}[] = [
  {
    id: "modernBlue",
    primary: "#1d4ed8",
    button: "#1d4ed8",
    accent: "#fbbf24",
  },
  {
    id: "successGreen",
    primary: "#059669",
    button: "#059669",
    accent: "#fbbf24",
  },
  {
    id: "premiumPurple",
    primary: "#7c3aed",
    button: "#7c3aed",
    accent: "#f59e0b",
  },
  {
    id: "energyRed",
    primary: "#dc2626",
    button: "#dc2626",
    accent: "#fbbf24",
  },
  {
    id: "vibrantOrange",
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
      {/* Campaign bar */}
      {type === "remarketing" && cfg.headerBannerEnabled && (
        <div
          className="px-2 py-1"
          style={{
            backgroundColor:
              cfg.headerBannerBackgroundColor ?? cfg.primaryColor,
          }}
        >
          <div
            className="h-1.5 rounded-sm w-2/3 mx-auto"
            style={{
              backgroundColor: cfg.headerBannerTextColor ?? "#ffffff",
              opacity: 0.7,
            }}
          />
        </div>
      )}
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
        {type === "remarketing" && cfg.countdownEnabled && (
          <div
            className="rounded py-1 flex gap-1 justify-center"
            style={{
              backgroundColor: cfg.countdownBackgroundColor ?? "#111827",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: cfg.countdownBoxColor ?? "#1f2937" }}
              />
            ))}
          </div>
        )}
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

type PreviewText = Messages["compose"]["preview"];

function generateReplyPreview(
  config: ReplyTemplateConfig,
  text: PreviewText,
  logoUrl?: string | null,
): string {
  const body = `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">${esc(text.reply.greeting)}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">${esc(text.reply.body)}</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:${esc(config.textColor)}">${esc(text.reply.signoff)}<br/>${esc(text.reply.signature)}</p>`;
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
<p style="margin:0;font-size:12px;color:${esc(config.footerTextColor)}">${esc(text.storeName)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function generateRemarketingPreview(
  config: RemarketingTemplateConfig,
  text: PreviewText,
  language: string,
): string {
  const rm = text.remarketing;
  return renderRemarketingEmailHtml(
    {
      customerName: rm.customerName,
      storeName: text.storeName,
      items: [
        {
          title: rm.product,
          quantity: 1,
          price: 99.9,
          currency: rm.currency,
          imageUrl: PREVIEW_PRODUCT_IMAGE,
        },
      ],
      totalPrice: 99.9,
      currency: rm.currency,
      discountPercent: 10,
      checkoutUrl: "#",
      language,
      couponCode: "CUPOM10",
      sentAt: new Date(),
    },
    config,
  );
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
  const t = useT("compose");
  const tc = useT("common");
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
              {t("library.card.active")}
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
            {isEditing ? t("library.card.editing") : tc("actions.edit")}
          </button>
          {!item.isActive && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center gap-1"
            >
              {activating ? (
                <Spinner className="w-3 h-3" />
              ) : (
                t("library.card.use")
              )}
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

/* ─── Small form controls ───────────────────────────────────────────────────── */

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        {description && (
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-700"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </div>
  );
}

const FIELD_CLASS =
  "w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${FIELD_CLASS} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={FIELD_CLASS}
        />
      )}
    </div>
  );
}

/* ─── Main TemplateManager ──────────────────────────────────────────────────── */

interface Props {
  type: TemplateType;
  accountId: string;
  logoUrl?: string | null;
}

export default function TemplateManager({ type, accountId, logoUrl }: Props) {
  const t = useT("compose");
  const tc = useT("common");
  const locale = useLocale();
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
      toast.error(t("library.toasts.loadFailed"));
    }
    setLoading(false);
  }, [accountId, type, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditConfig(
      type === "reply"
        ? { ...REPLY_DEFAULT }
        : { ...REMARKETING_DEFAULT, countdownTimezone: browserTimeZone() },
    );
    setEditName(t("library.defaultName"));
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
      toast.error(t("library.toasts.nameRequired"));
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
          toast.error(d.error || t("library.toasts.createFailed"));
        } else {
          toast.success(t("library.toasts.created"));
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
          toast.error(d.error || t("library.toasts.saveFailed"));
        } else {
          toast.success(t("library.toasts.saved"));
          setTemplates((prev) =>
            prev.map((tpl) =>
              tpl.id === editingId
                ? { ...tpl, name: editName.trim(), config: editConfig }
                : tpl,
            ),
          );
          closeEdit();
        }
      }
    } catch {
      toast.error(tc("states.networkError"));
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
        toast.success(t("library.toasts.activated"));
        setTemplates((prev) =>
          prev.map((tpl) => ({ ...tpl, isActive: tpl.id === id })),
        );
      } else {
        const d = await res.json();
        toast.error(d.error || t("library.toasts.activateFailed"));
      }
    } catch {
      toast.error(tc("states.networkError"));
    }
    setActivatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("library.toasts.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/template-library/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("library.toasts.deleted"));
        setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      } else {
        const d = await res.json();
        toast.error(d.error || t("library.toasts.deleteFailed"));
      }
    } catch {
      toast.error(tc("states.networkError"));
    }
    setDeletingId(null);
  };

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error(t("library.toasts.invalidEmail"));
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
      if (res.ok) toast.success(d.message || t("library.toasts.testSent"));
      else toast.error(d.error || t("library.toasts.sendFailed"));
    } catch {
      toast.error(tc("states.networkError"));
    }
    setSending(false);
  };

  const previewText: PreviewText = {
    storeName: t("preview.storeName"),
    reply: {
      greeting: t("preview.reply.greeting"),
      body: t("preview.reply.body"),
      signoff: t("preview.reply.signoff"),
      signature: t("preview.reply.signature"),
    },
    remarketing: {
      customerName: t("preview.remarketing.customerName"),
      currency: t("preview.remarketing.currency"),
      greeting: t("preview.remarketing.greeting"),
      intro: t("preview.remarketing.intro"),
      product: t("preview.remarketing.product"),
      price: t("preview.remarketing.price"),
      quantity: t("preview.remarketing.quantity", {
        price: t("preview.remarketing.price"),
      }),
      total: t("preview.remarketing.total"),
      discount: t("preview.remarketing.discount"),
      validity: t("preview.remarketing.validity"),
      cta: t("preview.remarketing.cta"),
      footer: t("preview.remarketing.footer"),
    },
  };

  const previewHtml =
    type === "reply"
      ? generateReplyPreview(
          editConfig as ReplyTemplateConfig,
          previewText,
          logoUrl,
        )
      : generateRemarketingPreview(
          editConfig as RemarketingTemplateConfig,
          previewText,
          locale,
        );

  const rc = editConfig as ReplyTemplateConfig;
  const mc = editConfig as RemarketingTemplateConfig;

  const applyCampaign = (preset: CampaignPreset) => {
    const base = `library.campaigns.${preset.id}`;
    setEditConfig({
      ...mc,
      ...preset.config,
      campaignId: preset.id,
      headerBannerText: t.dynamic(`${base}.banner`),
      customGreeting: t.dynamic(`${base}.greeting`),
      customBody: t.dynamic(`${base}.body`),
      customButtonText: t.dynamic(`${base}.button`),
      customSubject: t.dynamic(`${base}.subject`),
      countdownLabel: t.dynamic(`${base}.countdown`),
      countdownTimezone: mc.countdownTimezone || browserTimeZone(),
      showProductImages: mc.showProductImages !== false,
    });
    const campaignName = t.dynamic(`${base}.name`);
    if (editingId === "new") setEditName(campaignName);
    toast.success(t("library.campaigns.applied", { name: campaignName }));
  };

  const clearCampaign = () => {
    setEditConfig({
      ...mc,
      campaignId: "none",
      headerBannerEnabled: false,
      headerBannerText: "",
      countdownEnabled: false,
      countdownLabel: "",
      customGreeting: "",
      customBody: "",
      customButtonText: "",
      customSubject: "",
      customBannerText: "",
    });
    toast.info(t("library.campaigns.cleared"));
  };

  const currentTimezone = mc.countdownTimezone || browserTimeZone();
  const timezoneOptions = TIMEZONE_OPTIONS.includes(currentTimezone)
    ? TIMEZONE_OPTIONS
    : [currentTimezone, ...TIMEZONE_OPTIONS];

  if (!accountId || accountId === "all") {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">
            {t("library.noStore.title")}
          </p>
          <p className="text-sm text-gray-600">
            {t("library.noStore.description")}
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
          {t("library.count", { count: templates.length })}
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
          {t("library.newTemplate")}
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
              {t("library.empty.title")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("library.empty.description")}
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
            {t("library.empty.cta")}
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
                placeholder={t("library.editor.namePlaceholder")}
              />
              <span className="text-xs text-gray-600 shrink-0">
                {editingId === "new"
                  ? t("library.editor.newSuffix")
                  : t("library.editor.editingSuffix")}
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
                  placeholder={t("library.editor.testPlaceholder")}
                  className="bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none w-40"
                />
                <button
                  onClick={handleTest}
                  disabled={sending}
                  className="px-2 py-0.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded transition-all flex items-center gap-1"
                >
                  {sending ? (
                    <Spinner className="w-3 h-3" />
                  ) : (
                    tc("actions.send")
                  )}
                </button>
              </div>
              <button
                onClick={closeEdit}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
              >
                {tc("actions.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white shadow shadow-indigo-600/20 transition-all"
              >
                {saving ? (
                  <>
                    <Spinner className="w-3 h-3" />
                    {tc("actions.saving")}
                  </>
                ) : (
                  tc("actions.save")
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
                      <SectionLabel>{t("library.sections.identity")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.primaryColor")}
                        value={rc.primaryColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, primaryColor: v })
                        }
                        description={t("library.fields.primaryColorDesc")}
                      />
                      <ColorInput
                        label={t("library.fields.bodyText")}
                        value={rc.textColor}
                        onChange={(v) => setEditConfig({ ...rc, textColor: v })}
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.background")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.outerBackground")}
                        value={rc.backgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, backgroundColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.cardBorder")}
                        value={rc.borderColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, borderColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.footer")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.background")}
                        value={rc.footerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...rc, footerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.text")}
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
                              {t("library.fields.showStoreLogo")}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {t("library.fields.logoHint")}
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
                    {/* Campanhas sazonais */}
                    <div className="space-y-2">
                      <SectionLabel>
                        {t("library.campaigns.sectionLabel")}
                      </SectionLabel>
                      <p className="text-xs text-gray-600">
                        {t("library.campaigns.hint")}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CAMPAIGN_PRESETS.map((preset) => {
                          const selected = mc.campaignId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => applyCampaign(preset)}
                              className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                                selected
                                  ? "border-indigo-500/60 bg-indigo-500/10"
                                  : "border-white/6 hover:border-white/12 hover:bg-white/3"
                              }`}
                            >
                              <div className="flex gap-1 shrink-0">
                                {preset.swatch.map((c, i) => (
                                  <div
                                    key={i}
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <p
                                className={`text-xs truncate ${selected ? "text-indigo-300" : "text-gray-500"}`}
                              >
                                {t.dynamic(
                                  `library.campaigns.${preset.id}.name`,
                                )}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {mc.campaignId && mc.campaignId !== "none" && (
                        <button
                          onClick={clearCampaign}
                          className="w-full px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 border border-white/6 hover:border-white/12 rounded-lg transition-all"
                        >
                          {t("library.campaigns.clear")}
                        </button>
                      )}
                    </div>

                    {/* Faixa de campanha */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>
                        {t("library.campaignBar.sectionLabel")}
                      </SectionLabel>
                      <Toggle
                        label={t("library.campaignBar.enable")}
                        checked={mc.headerBannerEnabled === true}
                        onChange={(v) =>
                          setEditConfig({ ...mc, headerBannerEnabled: v })
                        }
                      />
                      {mc.headerBannerEnabled && (
                        <>
                          <TextField
                            label={t("library.campaignBar.text")}
                            value={mc.headerBannerText ?? ""}
                            placeholder={t(
                              "library.campaignBar.textPlaceholder",
                            )}
                            onChange={(v) =>
                              setEditConfig({ ...mc, headerBannerText: v })
                            }
                          />
                          <ColorInput
                            label={t("library.fields.background")}
                            value={
                              mc.headerBannerBackgroundColor ?? mc.primaryColor
                            }
                            onChange={(v) =>
                              setEditConfig({
                                ...mc,
                                headerBannerBackgroundColor: v,
                              })
                            }
                          />
                          <ColorInput
                            label={t("library.fields.text")}
                            value={mc.headerBannerTextColor ?? "#ffffff"}
                            onChange={(v) =>
                              setEditConfig({ ...mc, headerBannerTextColor: v })
                            }
                          />
                        </>
                      )}
                    </div>

                    {/* Cronômetro */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>
                        {t("library.countdown.sectionLabel")}
                      </SectionLabel>
                      <Toggle
                        label={t("library.countdown.enable")}
                        description={t("library.countdown.hint")}
                        checked={mc.countdownEnabled === true}
                        onChange={(v) =>
                          setEditConfig({
                            ...mc,
                            countdownEnabled: v,
                            countdownMode: mc.countdownMode ?? "endOfDay",
                            countdownTimezone:
                              mc.countdownTimezone || browserTimeZone(),
                          })
                        }
                      />
                      {mc.countdownEnabled && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                              {t("library.countdown.mode")}
                            </label>
                            <select
                              value={mc.countdownMode ?? "endOfDay"}
                              onChange={(e) =>
                                setEditConfig({
                                  ...mc,
                                  countdownMode: e.target
                                    .value as RemarketingTemplateConfig["countdownMode"],
                                })
                              }
                              className={FIELD_CLASS}
                            >
                              <option value="endOfDay">
                                {t("library.countdown.modeEndOfDay")}
                              </option>
                              <option value="hours">
                                {t("library.countdown.modeHours")}
                              </option>
                              <option value="fixedDate">
                                {t("library.countdown.modeFixedDate")}
                              </option>
                            </select>
                          </div>

                          {(mc.countdownMode ?? "endOfDay") === "hours" && (
                            <TextField
                              label={t("library.countdown.hours")}
                              type="number"
                              min={1}
                              max={720}
                              value={String(mc.countdownHours ?? 24)}
                              onChange={(v) =>
                                setEditConfig({
                                  ...mc,
                                  countdownHours: Math.min(
                                    Math.max(Number(v) || 1, 1),
                                    720,
                                  ),
                                })
                              }
                            />
                          )}

                          {mc.countdownMode === "fixedDate" && (
                            <TextField
                              label={t("library.countdown.deadline")}
                              type="datetime-local"
                              value={toLocalInputValue(mc.countdownDeadline)}
                              onChange={(v) =>
                                setEditConfig({
                                  ...mc,
                                  countdownDeadline: v
                                    ? new Date(v).toISOString()
                                    : "",
                                })
                              }
                            />
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                              {t("library.countdown.timezone")}
                            </label>
                            <select
                              value={mc.countdownTimezone || browserTimeZone()}
                              onChange={(e) =>
                                setEditConfig({
                                  ...mc,
                                  countdownTimezone: e.target.value,
                                })
                              }
                              className={FIELD_CLASS}
                            >
                              {timezoneOptions.map((tz) => (
                                <option key={tz} value={tz}>
                                  {tz}
                                </option>
                              ))}
                            </select>
                          </div>

                          <TextField
                            label={t("library.countdown.label")}
                            value={mc.countdownLabel ?? ""}
                            placeholder={t("library.countdown.labelPlaceholder")}
                            onChange={(v) =>
                              setEditConfig({ ...mc, countdownLabel: v })
                            }
                          />
                          <ColorInput
                            label={t("library.fields.background")}
                            value={mc.countdownBackgroundColor ?? "#111827"}
                            onChange={(v) =>
                              setEditConfig({
                                ...mc,
                                countdownBackgroundColor: v,
                              })
                            }
                          />
                          <ColorInput
                            label={t("library.fields.text")}
                            value={mc.countdownTextColor ?? "#fbbf24"}
                            onChange={(v) =>
                              setEditConfig({ ...mc, countdownTextColor: v })
                            }
                          />
                          <ColorInput
                            label={t("library.countdown.boxBackground")}
                            value={mc.countdownBoxColor ?? "#1f2937"}
                            onChange={(v) =>
                              setEditConfig({ ...mc, countdownBoxColor: v })
                            }
                          />
                          <ColorInput
                            label={t("library.countdown.boxText")}
                            value={mc.countdownBoxTextColor ?? "#ffffff"}
                            onChange={(v) =>
                              setEditConfig({ ...mc, countdownBoxTextColor: v })
                            }
                          />
                        </>
                      )}
                    </div>

                    {/* Textos */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>
                        {t("library.texts.sectionLabel")}
                      </SectionLabel>
                      <p className="text-xs text-gray-600">
                        {t("library.texts.hint")}
                      </p>
                      <TextField
                        label={t("library.texts.subject")}
                        value={mc.customSubject ?? ""}
                        placeholder={t("library.texts.subjectPlaceholder")}
                        onChange={(v) =>
                          setEditConfig({ ...mc, customSubject: v })
                        }
                      />
                      <TextField
                        label={t("library.texts.greeting")}
                        value={mc.customGreeting ?? ""}
                        placeholder={t("library.texts.greetingPlaceholder")}
                        onChange={(v) =>
                          setEditConfig({ ...mc, customGreeting: v })
                        }
                      />
                      <TextField
                        label={t("library.texts.body")}
                        multiline
                        value={mc.customBody ?? ""}
                        placeholder={t("library.texts.bodyPlaceholder")}
                        onChange={(v) => setEditConfig({ ...mc, customBody: v })}
                      />
                      <TextField
                        label={t("library.texts.banner")}
                        value={mc.customBannerText ?? ""}
                        placeholder={t("library.texts.bannerPlaceholder")}
                        onChange={(v) =>
                          setEditConfig({ ...mc, customBannerText: v })
                        }
                      />
                      <TextField
                        label={t("library.texts.button")}
                        value={mc.customButtonText ?? ""}
                        placeholder={t("library.texts.buttonPlaceholder")}
                        onChange={(v) =>
                          setEditConfig({ ...mc, customButtonText: v })
                        }
                      />
                      <TextField
                        label={t("library.texts.footer")}
                        value={mc.customFooterText ?? ""}
                        placeholder={t("library.texts.footerPlaceholder")}
                        onChange={(v) =>
                          setEditConfig({ ...mc, customFooterText: v })
                        }
                      />
                    </div>

                    {/* Produtos */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>
                        {t("library.products.sectionLabel")}
                      </SectionLabel>
                      <Toggle
                        label={t("library.products.showImages")}
                        description={t("library.products.showImagesHint")}
                        checked={mc.showProductImages !== false}
                        onChange={(v) =>
                          setEditConfig({ ...mc, showProductImages: v })
                        }
                      />
                    </div>

                    {/* Presets */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.presets")}</SectionLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        {REMARKETING_PRESETS.map((p) => (
                          <button
                            key={p.id}
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
                              {t(`library.presets.${p.id}`)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.cta")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.background")}
                        value={mc.buttonColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, buttonColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.text")}
                        value={mc.buttonTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, buttonTextColor: v })
                        }
                      />
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          {t("library.fields.rounding")}
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
                          <option value="0px">{t("library.radius.square")}</option>
                          <option value="4px">{t("library.radius.subtle")}</option>
                          <option value="6px">{t("library.radius.default")}</option>
                          <option value="8px">{t("library.radius.rounded")}</option>
                          <option value="12px">
                            {t("library.radius.extraRounded")}
                          </option>
                          <option value="999px">{t("library.radius.pill")}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.banner")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.background")}
                        value={mc.bannerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.border")}
                        value={mc.bannerBorderColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerBorderColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.text")}
                        value={mc.bannerTextColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, bannerTextColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.structure")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.primaryColor")}
                        value={mc.primaryColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, primaryColor: v })
                        }
                        description={t("library.fields.topBar")}
                      />
                      <ColorInput
                        label={t("library.fields.outerBackground")}
                        value={mc.backgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, backgroundColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.mainText")}
                        value={mc.textColor}
                        onChange={(v) => setEditConfig({ ...mc, textColor: v })}
                      />
                      <ColorInput
                        label={t("library.fields.borders")}
                        value={mc.borderColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, borderColor: v })
                        }
                      />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <SectionLabel>{t("library.sections.footer")}</SectionLabel>
                      <ColorInput
                        label={t("library.fields.background")}
                        value={mc.footerBackgroundColor}
                        onChange={(v) =>
                          setEditConfig({ ...mc, footerBackgroundColor: v })
                        }
                      />
                      <ColorInput
                        label={t("library.fields.text")}
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
                {t("library.editor.previewTitle")}
              </p>
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-xl border border-white/6 bg-white"
                style={{ height: "500px" }}
                title={t("library.editor.iframeTitle")}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
