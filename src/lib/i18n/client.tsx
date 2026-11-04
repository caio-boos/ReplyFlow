"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { DEFAULT_LOCALE, LOCALE_META } from "./config";
import {
  formatDateValue,
  formatNumberValue,
  formatRelativeValue,
  type DateInput,
} from "./format";
import { createTranslator, type Translator } from "./translator";
import type { Messages, Namespace } from "./types";

interface I18nValue {
  locale: Locale;
  messages: Partial<Messages>;
}

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: {} });

/** Pode ser aninhado: o provider interno acrescenta namespaces ao externo. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Partial<Messages>;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo(
    () => ({ locale, messages: { ...parent.messages, ...messages } }),
    [locale, messages, parent.messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export function useT<N extends Namespace>(namespace: N): Translator<N> {
  const { locale, messages } = useContext(I18nContext);
  return useMemo(
    () => createTranslator(locale, messages, namespace),
    [locale, messages, namespace],
  );
}

/** Datas e números no formato do idioma escolhido. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      intl: LOCALE_META[locale].intl,
      date: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        formatDateValue(value, locale, options),
      dateShort: (value: DateInput) =>
        formatDateValue(value, locale, { day: "2-digit", month: "short", year: "numeric" }),
      dateTime: (value: DateInput) =>
        formatDateValue(value, locale, {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumberValue(value, locale, options),
      relative: (value: DateInput) => formatRelativeValue(value, locale),
    }),
    [locale],
  );
}
