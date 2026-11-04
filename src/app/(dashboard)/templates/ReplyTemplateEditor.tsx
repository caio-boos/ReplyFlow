"use client";

import { useState, useEffect } from "react";
import { ReplyTemplateConfig } from "@/lib/types";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/client";

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

const DEFAULT_TEMPLATE: ReplyTemplateConfig = {
  primaryColor: "#1d4ed8",
  backgroundColor: "#f3f4f6",
  borderColor: "#e5e7eb",
  textColor: "#374151",
  footerBackgroundColor: "#f9fafb",
  footerTextColor: "#9ca3af",
  showLogo: false,
};

interface Props {
  accountId: string;
  logoUrl?: string | null;
}

export default function ReplyTemplateEditor({ accountId, logoUrl }: Props) {
  const t = useT("compose");
  const tc = useT("common");
  const [template, setTemplate] =
    useState<ReplyTemplateConfig>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!accountId || accountId === "all") {
      setLoading(false);
      return;
    }
    fetch(`/api/templates/reply?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.template) setTemplate(d.template);
      })
      .catch(() => toast.error(t("replyEditor.loadFailed")))
      .finally(() => setLoading(false));
  }, [accountId, t]);

  const handleSave = async () => {
    if (!accountId || accountId === "all") {
      toast.error(t("replyEditor.selectStore"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, template }),
      });
      if (res.ok) toast.success(t("replyEditor.saved"));
      else {
        const d = await res.json();
        toast.error(d.error || t("library.toasts.saveFailed"));
      }
    } catch {
      toast.error(tc("states.networkError"));
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm(t("replyEditor.resetConfirm"))) {
      setTemplate(DEFAULT_TEMPLATE);
      toast.info(t("replyEditor.resetDone"));
    }
  };

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error(t("replyEditor.invalidEmail"));
      return;
    }
    if (!accountId || accountId === "all") {
      toast.error(t("replyEditor.selectStore"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/templates/reply/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, testEmail, template }),
      });
      const d = await res.json();
      if (res.ok) toast.success(d.message || t("library.toasts.testSent"));
      else toast.error(d.error || t("library.toasts.sendFailed"));
    } catch {
      toast.error(tc("states.networkError"));
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-6 h-6 text-indigo-400" />
      </div>
    );
  }

  if (!accountId || accountId === "all") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-400">
            {t("library.noStore.title")}
          </p>
          <p className="text-sm text-gray-600">
            {t("replyEditor.noStoreDescription")}
          </p>
        </div>
      </div>
    );
  }

  const ColorInput = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    description?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      {description && (
        <p className="text-xs text-gray-600 mb-1.5">{description}</p>
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
            className="h-8 w-8 rounded-lg border border-white/6 cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-gray-800/60 border border-white/6 rounded-lg px-3 py-1.5 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  // Generate preview HTML client-side
  const sampleText = [
    t("preview.reply.greeting"),
    t("preview.reply.body"),
    `${t("preview.reply.signoff")}\n${t("preview.reply.signature")}`,
  ].join("\n\n");

  const previewHtml = generatePreviewHtml(
    sampleText,
    t("preview.storeName"),
    template,
    logoUrl,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-3">
        {/* Save */}
        <div className="bg-gray-900/60 border border-white/6 rounded-xl p-4 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            {saving ? (
              <>
                <Spinner className="w-4 h-4" />
                {tc("actions.saving")}
              </>
            ) : (
              t("replyEditor.saveTemplate")
            )}
          </button>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-gray-800/60 hover:bg-white/5 border border-white/6 text-gray-300 text-sm font-medium rounded-lg transition-all"
          >
            {t("replyEditor.restoreDefault")}
          </button>
        </div>

        {/* Test */}
        <div className="bg-gray-900/60 border border-white/6 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            {t("replyEditor.testLabel")}
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={t("shared.testEmailPlaceholder")}
            className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
          <button
            onClick={handleTest}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-white/5 border border-white/6 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all"
          >
            {sending ? (
              <>
                <Spinner className="w-4 h-4" />
                {tc("actions.sending")}
              </>
            ) : (
              t("replyEditor.sendTest")
            )}
          </button>
        </div>

        {/* Colors */}
        <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-xs font-semibold text-gray-500">
              {t("replyEditor.colors")}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <ColorInput
              label={t("library.fields.primaryColor")}
              value={template.primaryColor}
              onChange={(v) => setTemplate({ ...template, primaryColor: v })}
              description={t("library.fields.primaryColorDesc")}
            />
            <ColorInput
              label={t("library.fields.background")}
              value={template.backgroundColor}
              onChange={(v) => setTemplate({ ...template, backgroundColor: v })}
            />
            <ColorInput
              label={t("library.fields.cardBorder")}
              value={template.borderColor}
              onChange={(v) => setTemplate({ ...template, borderColor: v })}
            />
            <ColorInput
              label={t("library.fields.bodyText")}
              value={template.textColor}
              onChange={(v) => setTemplate({ ...template, textColor: v })}
            />
            <ColorInput
              label={t("replyEditor.footerBackground")}
              value={template.footerBackgroundColor}
              onChange={(v) =>
                setTemplate({ ...template, footerBackgroundColor: v })
              }
            />
            <ColorInput
              label={t("replyEditor.footerText")}
              value={template.footerTextColor}
              onChange={(v) => setTemplate({ ...template, footerTextColor: v })}
            />
          </div>
        </div>

        {/* Logo toggle */}
        {logoUrl && (
          <div className="bg-gray-900/60 border border-white/6 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-300">
                  {t("replyEditor.showLogo")}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {t("library.fields.logoHint")}
                </p>
              </div>
              <button
                onClick={() =>
                  setTemplate({ ...template, showLogo: !template.showLogo })
                }
                className={`relative w-9 h-5 rounded-full transition-colors ${template.showLogo ? "bg-indigo-600" : "bg-gray-700"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${template.showLogo ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
            {template.showLogo && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-8 max-w-32 object-contain opacity-70"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-medium text-gray-300">
                {t("replyEditor.previewTitle")}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t("replyEditor.previewSubtitle")}
              </p>
            </div>
            <div className="p-6 bg-white/5">
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-lg border border-white/6 bg-white"
                style={{ height: "480px" }}
                title={t("replyEditor.iframeTitle")}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generatePreviewHtml(
  text: string,
  storeName: string,
  config: ReplyTemplateConfig,
  logoUrl?: string | null,
): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const paragraphs = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => escape(l))
        .join("<br>");
      return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${escape(config.textColor)}">${lines}</p>`;
    })
    .join("");

  const logoBlock =
    config.showLogo && logoUrl
      ? `<tr><td style="padding:24px 48px 0 48px"><img src="${escape(logoUrl)}" alt="${escape(storeName)}" style="max-height:40px;max-width:160px;object-fit:contain;display:block"/></td></tr>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${escape(config.backgroundColor)}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${escape(config.backgroundColor)};padding:24px 16px">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"
        style="max-width:520px;width:100%;background:#fff;border-radius:6px;border:1px solid ${escape(config.borderColor)};overflow:hidden">
        <tr><td style="height:4px;background-color:${escape(config.primaryColor)};font-size:0">&nbsp;</td></tr>
        ${logoBlock}
        <tr><td style="padding:32px 40px 16px 40px">${paragraphs}</td></tr>
        <tr><td style="padding:12px 40px 20px 40px;border-top:1px solid ${escape(config.borderColor)};background-color:${escape(config.footerBackgroundColor)}">
          <p style="margin:0;font-size:12px;color:${escape(config.footerTextColor)};line-height:1.5">${escape(storeName)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
