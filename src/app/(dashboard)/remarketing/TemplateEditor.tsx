"use client";

import { useState, useEffect } from "react";
import { RemarketingTemplateConfig } from "@/lib/types";
import { toast } from "sonner";
import { useFormat, useT } from "@/lib/i18n/client";

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

interface TemplateEditorProps {
  accountId: string;
}

const DEFAULT_TEMPLATE: RemarketingTemplateConfig = {
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

const COLOR_PRESETS: Array<{
  id: "modernBlue" | "successGreen" | "premiumPurple" | "energyRed" | "vibrantOrange";
  primary: string;
  button: string;
  accent: string;
}> = [
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

const RADIUS_OPTIONS = [
  { value: "0px", key: "square" },
  { value: "4px", key: "soft" },
  { value: "6px", key: "default" },
  { value: "8px", key: "rounded" },
  { value: "12px", key: "extraRounded" },
  { value: "999px", key: "pill" },
] as const;

export default function TemplateEditor({ accountId }: TemplateEditorProps) {
  const t = useT("marketing");
  const tc = useT("common");
  const f = useFormat();
  const [template, setTemplate] =
    useState<RemarketingTemplateConfig>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "colors" | "text" | "preview"
  >("preview");

  useEffect(() => {
    if (!accountId || accountId === "all") {
      setLoading(false);
      return;
    }

    fetch(`/api/remarketing/template?accountId=${accountId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.template) {
          setTemplate(data.template);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error(t("template.toasts.loadError"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleSave = async () => {
    if (!accountId || accountId === "all") {
      toast.error(t("template.toasts.selectStore"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/remarketing/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, template }),
      });

      if (res.ok) {
        toast.success(t("template.toasts.saved"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("template.toasts.saveError"));
      }
    } catch {
      toast.error(tc("states.networkError"));
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm(t("template.toasts.resetConfirm"))) {
      setTemplate(DEFAULT_TEMPLATE);
      toast.info(t("template.toasts.resetDone"));
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error(t("template.toasts.invalidEmail"));
      return;
    }

    if (!accountId || accountId === "all") {
      toast.error(t("template.toasts.selectStore"));
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/remarketing/template/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, testEmail, template }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || t("template.toasts.testSent"));
      } else {
        toast.error(data.error || t("template.toasts.testError"));
      }
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
            {t("template.noStore.title")}
          </p>
          <p className="text-sm text-gray-600">
            {t("template.noStore.description")}
          </p>
        </div>
      </div>
    );
  }

  const samplePrice = f.number(99.9, { style: "currency", currency: "USD" });

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setTemplate({
      ...template,
      primaryColor: preset.primary,
      buttonColor: preset.button,
      accentColor: preset.accent,
      bannerBorderColor: preset.accent,
    });
    toast.success(
      t("template.toasts.presetApplied", { name: t(`template.presets.${preset.id}`) }),
    );
  };

  const ColorInput = ({ label, value, onChange, description }: any) => (
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

  const TextInput = ({ label, value, onChange, placeholder }: any) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Sidebar */}
      <div className="lg:col-span-1 space-y-3">
        {/* Save + Reset */}
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
              t("template.save")
            )}
          </button>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-gray-800/60 hover:bg-white/5 border border-white/6 text-gray-300 text-sm font-medium rounded-lg transition-all"
          >
            {t("template.reset")}
          </button>
        </div>

        {/* Test Email */}
        <div className="bg-gray-900/60 border border-white/6 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            {t("template.test.label")}
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={t("template.test.placeholder")}
            className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
          <button
            onClick={handleTestEmail}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-white/5 border border-white/6 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all"
          >
            {sending ? (
              <>
                <Spinner className="w-4 h-4" />
                {tc("actions.sending")}
              </>
            ) : (
              t("template.test.send")
            )}
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-0 border-b border-white/6">
          {(["preview", "colors", "text"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 text-xs font-medium transition-all border-b-2 capitalize ${
                activeSection === s
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t(`template.tabs.${s}`)}
            </button>
          ))}
        </div>

        {/* Colors Section */}
        {activeSection === "colors" && (
          <div className="space-y-3">
            {/* Presets */}
            <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-500">
                  {t("template.sections.presets")}
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="p-2.5 rounded-lg border border-white/6 hover:border-white/10 hover:bg-white/3 transition-all text-left group"
                  >
                    <div className="flex gap-1.5 mb-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: preset.button }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      {t(`template.presets.${preset.id}`)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Colors */}
            <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-500">
                  {t("template.sections.core")}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <ColorInput
                  label={t("template.colors.primary")}
                  value={template.primaryColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, primaryColor: v })
                  }
                  description={t("template.colors.primaryHint")}
                />
                <ColorInput
                  label={t("template.colors.button")}
                  value={template.buttonColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, buttonColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.buttonText")}
                  value={template.buttonTextColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, buttonTextColor: v })
                  }
                />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    {t("template.colors.buttonRadius")}
                  </label>
                  <select
                    value={template.buttonBorderRadius}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        buttonBorderRadius: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  >
                    {RADIUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {t(`template.radius.${o.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Colors */}
            <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-500">
                  {t("template.sections.advanced")}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <ColorInput
                  label={t("template.colors.background")}
                  value={template.backgroundColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, backgroundColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.text")}
                  value={template.textColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, textColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.borders")}
                  value={template.borderColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, borderColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.bannerBackground")}
                  value={template.bannerBackgroundColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, bannerBackgroundColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.bannerBorder")}
                  value={template.bannerBorderColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, bannerBorderColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.bannerText")}
                  value={template.bannerTextColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, bannerTextColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.footerBackground")}
                  value={template.footerBackgroundColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, footerBackgroundColor: v })
                  }
                />
                <ColorInput
                  label={t("template.colors.footerText")}
                  value={template.footerTextColor}
                  onChange={(v: string) =>
                    setTemplate({ ...template, footerTextColor: v })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Text Section */}
        {activeSection === "text" && (
          <div className="space-y-3">
            <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-500">
                  {t("template.sections.text")}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2.5 p-3 bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl">
                  <svg
                    className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    {t.rich("template.text.variables", {
                      code: (chunks) => (
                        <code className="font-mono bg-indigo-500/20 px-1 rounded text-indigo-300">
                          {"{{"}
                          {chunks}
                          {"}}"}
                        </code>
                      ),
                    })}
                  </p>
                </div>
                <TextInput
                  label={t("template.text.greeting")}
                  value={template.customGreeting}
                  onChange={(v: string) =>
                    setTemplate({ ...template, customGreeting: v })
                  }
                  placeholder={t("template.text.greetingPlaceholder", { name: "{{name}}" })}
                />
                <TextInput
                  label={t("template.text.body")}
                  value={template.customBody}
                  onChange={(v: string) =>
                    setTemplate({ ...template, customBody: v })
                  }
                  placeholder={t("template.text.bodyPlaceholder", { store: "{{store}}" })}
                />
                <TextInput
                  label={t("template.text.button")}
                  value={template.customButtonText}
                  onChange={(v: string) =>
                    setTemplate({ ...template, customButtonText: v })
                  }
                  placeholder={t("template.text.buttonPlaceholder", { discount: "{{discount}}" })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Preview */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-medium text-gray-300">
                {t("template.preview.title")}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t("template.preview.subtitle")}
              </p>
            </div>
            <div className="p-6 bg-white/5">
              <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                  <div
                    className="h-1"
                    style={{ backgroundColor: template.primaryColor }}
                  />
                  <div className="p-8 space-y-5">
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: template.textColor }}
                    >
                      {template.customGreeting?.replace(
                        "{{name}}",
                        t("template.preview.sampleCustomer"),
                      ) ||
                        t("template.preview.greeting", {
                          name: t("template.preview.sampleCustomer"),
                        })}
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {template.customBody?.replace(
                        "{{store}}",
                        t("template.preview.sampleStore"),
                      ) || t("template.preview.body")}
                    </p>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("template.preview.yourCart")}
                    </p>
                    <div
                      className="p-4 rounded-lg border"
                      style={{ borderColor: template.borderColor }}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-sm truncate"
                            style={{ color: template.textColor }}
                          >
                            {t("template.preview.sampleProduct")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("template.preview.quantity", {
                              quantity: 1,
                              price: samplePrice,
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        className="mt-3 pt-3 border-t flex justify-between items-center"
                        style={{ borderColor: template.borderColor }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{ color: template.textColor }}
                        >
                          {t("template.preview.total")}
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: template.textColor }}
                        >
                          {samplePrice}
                        </span>
                      </div>
                    </div>
                    <div
                      className="p-4 rounded-lg text-center border"
                      style={{
                        backgroundColor: template.bannerBackgroundColor,
                        borderColor: template.bannerBorderColor,
                        color: template.bannerTextColor,
                      }}
                    >
                      <p className="text-sm font-semibold">
                        {t.rich(
                          "template.preview.banner",
                          { b: (chunks) => <strong>{chunks}</strong> },
                          { percent: 10 },
                        )}
                      </p>
                      <p className="text-xs mt-1 opacity-80">
                        {t("template.preview.validity")}
                      </p>
                    </div>
                    <button
                      className="w-full py-3.5 font-semibold text-sm"
                      style={{
                        backgroundColor: template.buttonColor,
                        color: template.buttonTextColor,
                        borderRadius: template.buttonBorderRadius,
                      }}
                    >
                      {template.customButtonText?.replace(
                        "{{discount}}",
                        "10",
                      ) || t("template.preview.button", { percent: 10 })}
                    </button>
                  </div>
                  <div
                    className="px-8 py-4 border-t"
                    style={{
                      backgroundColor: template.footerBackgroundColor,
                      borderColor: template.borderColor,
                      color: template.footerTextColor,
                    }}
                  >
                    <p className="text-xs leading-relaxed">
                      {t("template.preview.footer", {
                        store: t("template.preview.sampleStore"),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
