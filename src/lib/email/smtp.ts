import nodemailer from "nodemailer";

export interface SmtpCredentials {
  smtpHost: string;
  smtpPort: number;
  email: string;
  password: string;
}

export interface AttachmentItem {
  filename: string;
  contentType: string;
  /** Base64-encoded file content */
  data: string;
}

export interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  messageId?: string;
  attachments?: AttachmentItem[];
}

export interface SendResult {
  messageId: string;
  smtpResponse: string;
}

export async function sendEmail(creds: SmtpCredentials, opts: SendOptions): Promise<SendResult> {
  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpPort === 465,
    auth: { user: creds.email, pass: creds.password },
    connectionTimeout: 15_000, // 15s to establish connection
    greetingTimeout: 10_000,   // 10s for SMTP greeting
    socketTimeout: 30_000,     // 30s for socket inactivity
  });

  const allRefs = [...(opts.references ?? [])];
  if (opts.inReplyTo && !allRefs.includes(opts.inReplyTo)) {
    allRefs.push(opts.inReplyTo);
  }

  try {
    const info = await transporter.sendMail({
      from: creds.email,
      to: opts.to,
      subject: opts.inReplyTo
        ? opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`
        : opts.subject,
      text: opts.text,
      html: opts.html,
      ...(opts.inReplyTo && { inReplyTo: opts.inReplyTo }),
      ...(allRefs.length > 0 && { references: allRefs.join(" ") }),
      ...(opts.attachments?.length
        ? {
            attachments: opts.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.data, "base64"),
              contentType: a.contentType,
            })),
          }
        : {}),
    });
    return {
      messageId: info.messageId ?? "",
      smtpResponse: info.response ?? "",
    };
  } finally {
    transporter.close();
  }
}

export type BatchSendResult =
  | { ok: true; to: string; result: SendResult }
  | { ok: false; to: string; error: string };

/**
 * Sends several messages over a single SMTP connection, pausing between each
 * one so shared-hosting providers don't throttle or blacklist the sender.
 */
export async function sendEmailBatch(
  creds: SmtpCredentials,
  messages: SendOptions[],
  opts: { delayMs?: number } = {},
): Promise<BatchSendResult[]> {
  const delayMs = opts.delayMs ?? 500;
  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpPort === 465,
    auth: { user: creds.email, pass: creds.password },
    pool: true,
    maxConnections: 1,
    maxMessages: Infinity,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  const results: BatchSendResult[] = [];

  try {
    for (let i = 0; i < messages.length; i++) {
      const opt = messages[i];
      try {
        const info = await transporter.sendMail({
          from: creds.email,
          to: opt.to,
          subject: opt.subject,
          text: opt.text,
          html: opt.html,
          ...(opt.attachments?.length
            ? {
                attachments: opt.attachments.map((a) => ({
                  filename: a.filename,
                  content: Buffer.from(a.data, "base64"),
                  contentType: a.contentType,
                })),
              }
            : {}),
        });
        results.push({
          ok: true,
          to: opt.to,
          result: {
            messageId: info.messageId ?? "",
            smtpResponse: info.response ?? "",
          },
        });
      } catch (err) {
        results.push({
          ok: false,
          to: opt.to,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (delayMs > 0 && i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  } finally {
    transporter.close();
  }

  return results;
}
