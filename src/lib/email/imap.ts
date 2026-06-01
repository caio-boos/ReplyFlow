import { ImapFlow, ImapFlowOptions } from "imapflow";
import { simpleParser } from "mailparser";
import { isSpamOrAutomated } from "./spam-filter";

export interface AccountCredentials {
  id: string;
  email: string;
  imapHost: string;
  imapPort: number;
  password: string;
  lastUid: number;
  createdAt?: Date;
}

export interface FetchedEmail {
  accountId: string;
  accountEmail: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  from: string;
  fromName: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  uid: number;
  receivedAt: Date;
  attachments: Array<{ filename: string; contentType: string; data: Buffer }>;
}

// Emails larger than this are fetched but attachments are skipped to avoid timeout
const MAX_EMAIL_BYTES = 15 * 1024 * 1024; // 15 MB

export async function fetchNewEmails(
  account: AccountCredentials,
): Promise<FetchedEmail[]> {
  const options: ImapFlowOptions = {
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: { user: account.email, pass: account.password },
    logger: false,
  };

  const client = new ImapFlow(options);
  const results: FetchedEmail[] = [];

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Fetch messages with UID > lastUid
      // On first run (lastUid === 0), limit to emails since account creation date
      let uids: number[];
      if (account.lastUid > 0) {
        const result = await client.search(
          { uid: `${account.lastUid + 1}:*` },
          { uid: true },
        );
        uids = result || [];
      } else {
        const since = account.createdAt ?? new Date();
        since.setHours(0, 0, 0, 0);
        const result = await client.search({ since }, { uid: true });
        uids = result || [];
      }

      if (!uids || uids.length === 0) return results;

      for await (const message of client.fetch(
        { uid: uids.join(",") },
        { uid: true, source: true, envelope: true, size: true },
        { uid: true },
      )) {
        try {
          if (!message.source) continue;

          // Skip downloading attachments for oversized emails to prevent cron timeouts
          const tooLarge = (message.size ?? 0) > MAX_EMAIL_BYTES;
          const parsed = await simpleParser(message.source);

          const headers = {
            from: parsed.from?.text ?? "",
            precedence: parsed.headers.get("precedence") as string | undefined,
            listUnsubscribe: parsed.headers.get("list-unsubscribe") as
              | string
              | undefined,
            autoSubmitted: parsed.headers.get("auto-submitted") as
              | string
              | undefined,
            xAutoReply: parsed.headers.get("x-autoreply") as string | undefined,
          };

          if (isSpamOrAutomated(headers)) continue;

          const msgId = (
            parsed.messageId ?? `uid-${message.uid}@${account.imapHost}`
          ).trim();
          const inReplyTo = (parsed.inReplyTo ?? null)?.trim() ?? null;
          const references = parsed.references
            ? typeof parsed.references === "string"
              ? [parsed.references.trim()]
              : parsed.references.map((r) => r.trim())
            : [];

          results.push({
            accountId: account.id,
            accountEmail: account.email,
            messageId: msgId,
            inReplyTo,
            references,
            from: parsed.from?.value[0]?.address ?? "",
            fromName: parsed.from?.value[0]?.name ?? "",
            to: account.email,
            subject: parsed.subject ?? "(sem assunto)",
            bodyText: parsed.text ?? "",
            bodyHtml: parsed.html || "",
            uid: message.uid,
            receivedAt: parsed.date ?? new Date(),
            attachments: tooLarge
              ? []
              : (parsed.attachments ?? [])
              .filter(
                (a) =>
                  a.contentType.startsWith("image/") &&
                  a.content.byteLength <= 10 * 1024 * 1024,
              )
              .map((a) => ({
                filename: a.filename ?? `image-${Date.now()}.jpg`,
                contentType: a.contentType,
                data: a.content,
              })),
          });
        } catch {
          // Skip unparseable messages
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}
