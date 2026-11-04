import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { formatDateValue, formatNumberValue, type DateInput } from "./format";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { pt } from "./messages/pt";
import { createTranslator, type Translator } from "./translator";
import type { Messages, Namespace } from "./types";

const DICTIONARIES: Record<Locale, Messages> = { en, pt, es, fr };

/** Idioma da requisição atual (cookie `rf_locale`; padrão inglês). */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
});

export function getMessages(locale: Locale, namespaces: readonly Namespace[]): Partial<Messages> {
  const dict = DICTIONARIES[locale];
  const out: Partial<Messages> = {};
  for (const ns of namespaces) {
    (out as Record<string, unknown>)[ns] = dict[ns];
  }
  return out;
}

/** Tradutor para um idioma específico (cron, e-mails, webhooks). */
export function createT<N extends Namespace>(locale: Locale, namespace: N): Translator<N> {
  return createTranslator(locale, DICTIONARIES[locale], namespace);
}

/** Tradutor para Server Components e Route Handlers (usa o cookie da requisição). */
export async function getT<N extends Namespace>(namespace: N): Promise<Translator<N>> {
  return createT(await getLocale(), namespace);
}

/** Idioma a partir de um Request (útil fora do contexto de `cookies()`). */
export function localeFromRequest(req: Request): Locale {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  return resolveLocale(match?.[1]);
}

export async function getFormat() {
  const locale = await getLocale();
  return {
    locale,
    date: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
      formatDateValue(value, locale, options),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumberValue(value, locale, options),
  };
}
