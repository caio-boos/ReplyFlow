"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";

type Variant = "public" | "dashboard";

const STYLES: Record<Variant, { button: string; menu: string; item: string; active: string }> = {
  public: {
    button:
      "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5",
    menu: "bg-zinc-900 border-white/10",
    item: "text-zinc-300 hover:bg-white/5",
    active: "text-emerald-400",
  },
  dashboard: {
    button: "border-white/10 text-gray-400 hover:text-white hover:bg-white/5",
    menu: "bg-gray-800 border-white/10",
    item: "text-gray-300 hover:bg-white/5",
    active: "text-indigo-400",
  },
};

export async function saveLocale(locale: Locale): Promise<void> {
  const res = await fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) throw new Error("locale");
}

/** Seletor compacto de idioma (globo + código). */
export default function LanguageSwitcher({
  variant = "public",
  align = "right",
  direction = "down",
  showLabel = false,
}: {
  variant?: Variant;
  align?: "left" | "right";
  direction?: "down" | "up";
  showLabel?: boolean;
}) {
  const locale = useLocale();
  const t = useT("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const s = STYLES[variant];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    try {
      await saveLocale(next);
      startTransition(() => router.refresh());
    } catch {
      // Mantém o idioma atual se não foi possível salvar.
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${s.button}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        {showLabel ? LOCALE_META[locale].label : locale.toUpperCase()}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("language.label")}
          className={`absolute z-70 min-w-36 overflow-hidden rounded-xl border py-1 shadow-2xl ${s.menu} ${
            align === "right" ? "right-0" : "left-0"
          } ${direction === "down" ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
        >
          {LOCALES.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs ${s.item} ${
                  code === locale ? `font-semibold ${s.active}` : ""
                }`}
              >
                {LOCALE_META[code].label}
                <span className="text-[10px] uppercase opacity-60">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
