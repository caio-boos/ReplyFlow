/**
 * Separators mail clients insert before the quoted thread. Anything from the
 * first match onwards belongs to a previous message (often our own AI reply),
 * so it must not be rendered/treated as the customer's new text.
 */
const QUOTE_SEPARATORS: RegExp[] = [
  // "On <date> <someone> wrote:" and its localized variants
  /^on\s.{5,}\swrote:\s*$/i,
  /^em\s.{5,}\sescreveu:\s*$/i,
  /^el\s.{5,}\sescribi[oó]:\s*$/i,
  /^le\s.{5,}\sa\s[ée]crit\s*:\s*$/i,
  /^am\s.{5,}\sschrieb\s.*:\s*$/i,
  /^il\s.{5,}\sha\sscritto:\s*$/i,
  // Japanese: "2024年1月1日(月) 10:00 Name <a@b.com>:" / "...のメッセージ:"
  /^\d{4}年\d{1,2}月\d{1,2}日.*[:：]\s*$/,
  /のメッセージ[:：]\s*$/,
  // Chinese / Korean
  /^在\s?\d{4}.*写道[:：]\s*$/,
  /님이\s.*작성[:：]?\s*$/,
  // Outlook / generic separators
  /^-{2,}\s*(original message|mensagem original|mensaje original|message d'origine|urspr[uü]ngliche nachricht)\s*-{2,}\s*$/i,
  /^[-_=*]{5,}\s*$/,
];

const FROM_HEADER = /^(from|de|von|da|発信元|差出人|送信者|보낸\s?사람)\s*[:：]/i;

const HEADER_FOLLOWUP =
  /^(sent|to|subject|enviada?(\s+em)?|para|assunto|fecha|enviado|asunto|gesendet|an|betreff|送信日時|宛先|件名|日時)\s*[:：]/i;

/** Outlook pastes a "From: x@y.com / Sent: … / To: …" block above the quoted message. */
function isPastedHeaderBlock(line: string, nextLine: string): boolean {
  return FROM_HEADER.test(line) && /@/.test(line) && HEADER_FOLLOWUP.test(nextLine);
}

/**
 * Returns only the newest message in an email body, dropping the quoted thread.
 * Falls back to the original body when stripping would leave nothing.
 */
export function stripQuotedText(body: string): string {
  if (!body) return "";
  const lines = body.split("\n");
  const clean: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(">")) break;
    if (QUOTE_SEPARATORS.some((re) => re.test(trimmed))) break;
    if (isPastedHeaderBlock(trimmed, lines[i + 1]?.trim() ?? "")) break;
    clean.push(lines[i]);
  }

  return clean.join("\n").trim() || body.trim();
}
