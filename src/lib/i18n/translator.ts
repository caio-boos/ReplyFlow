import type { ReactNode } from "react";
import type { Locale } from "./config";
import { formatMessage, lookup, type MessageKeys, type MessageValues } from "./format";
import { renderRich, type RichTags } from "./rich";
import type { Messages, Namespace } from "./types";

export type TranslationKey<N extends Namespace> = MessageKeys<Messages[N]>;

export interface Translator<N extends Namespace> {
  (key: TranslationKey<N>, values?: MessageValues): string;
  /** Mensagens com marcação: "Read the <link>terms</link>". */
  rich(key: TranslationKey<N>, tags: RichTags, values?: MessageValues): ReactNode;
  /** Verifica se a chave existe (útil para chaves montadas dinamicamente). */
  has(key: string): boolean;
  /** Chave montada em tempo de execução (ex.: `status.${value}`), com fallback. */
  dynamic(key: string, values?: MessageValues, fallback?: string): string;
}

export function createTranslator<N extends Namespace>(
  locale: Locale,
  messages: Partial<Messages>,
  namespace: N,
): Translator<N> {
  const scope = messages[namespace];

  function resolve(key: string, values?: MessageValues, fallback?: string): string {
    const message = lookup(scope, key);
    if (message === undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] missing "${namespace}.${key}" (${locale})`);
      }
      return fallback ?? `${namespace}.${key}`;
    }
    return formatMessage(message, values, locale);
  }

  const t = ((key: TranslationKey<N>, values?: MessageValues) =>
    resolve(key, values)) as Translator<N>;
  t.rich = (key, tags, values) => renderRich(resolve(key, values), tags);
  t.has = (key) => lookup(scope, key) !== undefined;
  t.dynamic = (key, values, fallback) => resolve(key, values, fallback);
  return t;
}
