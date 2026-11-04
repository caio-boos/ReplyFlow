import type { MessageValues } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages/en";
import type { Translator } from "@/lib/i18n/translator";

/** Chave em `tools.errors` — traduzida na exibição (rota ou página). */
export type VideoErrorCode = keyof Messages["tools"]["errors"];

/**
 * Erro com código estável. A mensagem em inglês serve de fallback (logs e
 * chamadores que ainda usam só `err.message`).
 */
export class VideoError extends Error {
  readonly code: VideoErrorCode;
  readonly values?: MessageValues;

  constructor(code: VideoErrorCode, message: string, values?: MessageValues) {
    super(message);
    this.name = "VideoError";
    this.code = code;
    this.values = values;
  }
}

/** Mensagem para o usuário: traduz `VideoError`, repassa outros erros como estão. */
export function videoErrorMessage(
  t: Translator<"tools">,
  err: unknown,
  fallback: string,
): string {
  if (err instanceof VideoError) return t(`errors.${err.code}`, err.values);
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
