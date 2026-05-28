/** Headers / sender patterns that indicate a non-human automated email */

const BULK_PRECEDENCE = /^(bulk|list|junk)$/i;

const NO_REPLY_PATTERN =
  /^(no.?reply|noreply|do.?not.?reply|donotreply|mailer.?daemon|daemon|postmaster|bounce|notifications?|newsletter|alerts?|updates?|info@.*\.(com|net|org))$/i;

const AUTO_SUBMITTED_SKIP = /^auto-(generated|replied|notified)/i;

export interface EmailHeaders {
  from?: string;
  precedence?: string;
  listUnsubscribe?: string;
  autoSubmitted?: string;
  xAutoReply?: string;
  xMailer?: string;
}

export function isSpamOrAutomated(headers: EmailHeaders): boolean {
  // List-Unsubscribe header → bulk mail / newsletter
  if (headers.listUnsubscribe) return true;

  // Precedence: bulk / list / junk
  if (headers.precedence && BULK_PRECEDENCE.test(headers.precedence.trim())) return true;

  // Auto-Submitted header
  if (headers.autoSubmitted && AUTO_SUBMITTED_SKIP.test(headers.autoSubmitted.trim()))
    return true;

  // X-AutoReply header (various mail clients)
  if (headers.xAutoReply) return true;

  // Sender address is a no-reply pattern
  if (headers.from) {
    const address = extractAddress(headers.from);
    const local = address.split("@")[0] ?? "";
    if (NO_REPLY_PATTERN.test(local)) return true;
  }

  return false;
}

function extractAddress(from: string): string {
  // Handle "Name <email>" and plain "email" formats
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : from.toLowerCase().trim();
}
