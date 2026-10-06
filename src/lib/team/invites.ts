import * as crypto from "crypto";
import { Firestore } from "firebase-admin/firestore";
import { decrypt } from "@/lib/crypto/encryption";
import { sendEmail } from "@/lib/email/smtp";
import { PERMISSION_META, Permission } from "@/lib/auth/permissions";

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

/** URL base usada nos links de convite. */
export function appOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(requestUrl).origin;
}

export function areaLabels(permissions: Permission[]): string[] {
  return permissions.map((p) => PERMISSION_META[p].label);
}

export function generateInviteToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

interface SmtpAccount {
  label: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  password: string;
}

/** Primeira loja do workspace com SMTP configurado — usada para enviar convites. */
export async function findSenderAccount(
  db: Firestore,
  workspaceId: string,
): Promise<SmtpAccount | null> {
  const snap = await db
    .collection("accounts")
    .where("userId", "==", workspaceId)
    .get();

  for (const doc of snap.docs) {
    const a = doc.data();
    if (a.smtpHost && a.smtpPort && a.email && a.encryptedPassword) {
      return {
        label: a.label ?? a.email,
        email: a.email,
        smtpHost: a.smtpHost,
        smtpPort: Number(a.smtpPort),
        password: decrypt(a.encryptedPassword),
      };
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderInviteEmail(params: {
  workspaceName: string;
  inviteUrl: string;
  areas: string[];
}): { subject: string; text: string; html: string } {
  const { workspaceName, inviteUrl, areas } = params;
  const safeName = escapeHtml(workspaceName);
  const safeUrl = escapeHtml(inviteUrl);

  const subject = `Convite para acessar ${workspaceName} no ReplyFlow`;

  const text = [
    `Voce foi convidado para fazer parte da equipe de ${workspaceName} no ReplyFlow.`,
    "",
    areas.length ? `Areas liberadas: ${areas.join(", ")}` : "",
    "",
    "Acesse o link abaixo para criar sua senha e ativar o acesso:",
    inviteUrl,
    "",
    "O link expira em 7 dias.",
  ]
    .filter(Boolean)
    .join("\n");

  const areasHtml = areas.length
    ? `<p style="margin:0 0 24px;font-size:14px;color:#4b5563;">
         <strong style="color:#111827;">Áreas liberadas:</strong> ${escapeHtml(areas.join(", "))}
       </p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Você foi convidado para a equipe</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
            Você recebeu um convite para colaborar em <strong style="color:#111827;">${safeName}</strong> no ReplyFlow.
            Clique no botão abaixo para criar sua senha e ativar o acesso.
          </p>
          ${areasHtml}
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
            Aceitar convite
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Ou copie e cole no navegador:<br />
            <span style="word-break:break-all;color:#6b7280;">${safeUrl}</span>
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
            Este convite expira em 7 dias. Se você não esperava este e-mail, ignore-o.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export async function sendInviteEmail(params: {
  sender: SmtpAccount;
  to: string;
  workspaceName: string;
  inviteUrl: string;
  areas: string[];
}): Promise<void> {
  const { sender, to, workspaceName, inviteUrl, areas } = params;
  const { subject, text, html } = renderInviteEmail({
    workspaceName,
    inviteUrl,
    areas,
  });

  await sendEmail(
    {
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      email: sender.email,
      password: sender.password,
    },
    { to, subject, text, html },
  );
}
