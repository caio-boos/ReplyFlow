import nodemailer from "nodemailer";

export interface SmtpCredentials {
  smtpHost: string;
  smtpPort: number;
  email: string;
  password: string;
}

export interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  messageId?: string;
}

export async function sendEmail(creds: SmtpCredentials, opts: SendOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpPort === 465,
    auth: { user: creds.email, pass: creds.password },
  });

  const allRefs = [...(opts.references ?? [])];
  if (opts.inReplyTo && !allRefs.includes(opts.inReplyTo)) {
    allRefs.push(opts.inReplyTo);
  }

  await transporter.sendMail({
    from: creds.email,
    to: opts.to,
    subject: opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`,
    text: opts.text,
    html: opts.html,
    ...(opts.inReplyTo && { inReplyTo: opts.inReplyTo }),
    ...(allRefs.length > 0 && { references: allRefs.join(" ") }),
  });
}
