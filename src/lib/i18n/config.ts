/** Configuração de idiomas — segura para cliente e servidor. */

export const LOCALES = ["en", "pt", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_COOKIE = "rf_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface LocaleMeta {
  /** Nome no próprio idioma (exibido no seletor). */
  label: string;
  /** Tag BCP 47 usada por Intl (datas, números) e <html lang>. */
  intl: string;
  /** Locale aceito pela Stripe (Checkout e Customer Portal). */
  stripe: "en" | "pt-BR" | "es" | "fr";
  /** Nome em inglês — usado em instruções para modelos de IA. */
  aiName: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { label: "English", intl: "en-US", stripe: "en", aiName: "English" },
  pt: { label: "Português", intl: "pt-BR", stripe: "pt-BR", aiName: "Brazilian Portuguese" },
  es: { label: "Español", intl: "es-ES", stripe: "es", aiName: "Spanish" },
  fr: { label: "Français", intl: "fr-FR", stripe: "fr", aiName: "French" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
