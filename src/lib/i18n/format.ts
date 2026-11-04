/**
 * Formatação de mensagens (subconjunto de ICU, sem dependências):
 *   "Hello {name}"
 *   "{count, plural, =0 {No stores} one {# store} other {# stores}}"
 *   "{role, select, owner {Owner} other {Member}}"
 * Segura para cliente e servidor.
 */
import { LOCALE_META, type Locale } from "./config";

export type MessageValues = Record<string, string | number | null | undefined>;

/** Chaves "a.b.c" de um objeto de mensagens aninhado. */
export type MessageKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${MessageKeys<T[K]>}`
      : never;
}[keyof T & string];

function findClose(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseOptions(body: string): Map<string, string> {
  const options = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    const keyStart = i;
    while (i < body.length && body[i] !== "{" && !/\s/.test(body[i])) i++;
    const key = body.slice(keyStart, i);
    while (i < body.length && /\s/.test(body[i])) i++;
    if (body[i] !== "{") break;
    const close = findClose(body, i);
    if (close === -1) break;
    options.set(key, body.slice(i + 1, close));
    i = close + 1;
  }
  return options;
}

export function formatMessage(
  message: string,
  values: MessageValues | undefined,
  locale: Locale,
): string {
  if (!message.includes("{")) return message;
  const intl = LOCALE_META[locale].intl;
  let out = "";
  let i = 0;
  while (i < message.length) {
    const open = message.indexOf("{", i);
    if (open === -1) {
      out += message.slice(i);
      break;
    }
    out += message.slice(i, open);
    const close = findClose(message, open);
    if (close === -1) {
      out += message.slice(open);
      break;
    }
    const inner = message.slice(open + 1, close);
    const [rawName, rawType, ...rest] = inner.split(",");
    const name = rawName.trim();
    const value = values?.[name];
    const type = rawType?.trim();

    if (type === "plural" || type === "select") {
      const options = parseOptions(rest.join(","));
      let branch: string | undefined;
      if (type === "plural") {
        const n = Number(value ?? 0);
        branch =
          options.get(`=${n}`) ??
          options.get(new Intl.PluralRules(intl).select(n)) ??
          options.get("other");
        if (branch !== undefined) {
          branch = branch.replace(/#/g, new Intl.NumberFormat(intl).format(n));
        }
      } else {
        branch = options.get(String(value)) ?? options.get("other");
      }
      out += branch !== undefined ? formatMessage(branch, values, locale) : "";
    } else if (value === undefined || value === null) {
      out += `{${name}}`;
    } else {
      out += typeof value === "number" ? new Intl.NumberFormat(intl).format(value) : value;
    }
    i = close + 1;
  }
  return out;
}

export function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type DateInput = Date | number | string | null | undefined;

/** Números < 1e11 são tratados como segundos epoch (padrão da Stripe). */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value < 1e11 ? value * 1000 : value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateValue(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" },
): string {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, options).format(d);
}

export function formatNumberValue(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl, options).format(value);
}

export function formatRelativeValue(value: DateInput, locale: Locale): string {
  const d = toDate(value);
  if (!d) return "—";
  const diff = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_META[locale].intl, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}
