import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { decrypt } from "@/lib/crypto/encryption";
import { renderEmailHtml } from "@/lib/email/html-template";
import { sendEmail } from "@/lib/email/smtp";
import { ReplyTemplateConfig } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const t = await getT("compose");
  const tc = await getT("common");
  if (!session)
    return NextResponse.json(
      { error: tc("states.unauthorized") },
      { status: 401 },
    );

  const body = await req.json();
  const { accountId, testEmail, template } = body as {
    accountId: string;
    testEmail: string;
    template?: ReplyTemplateConfig;
  };

  if (!accountId || !testEmail)
    return NextResponse.json(
      { error: t("api.accountAndTestEmailRequired") },
      { status: 400 },
    );

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);
  if (!ownedIds.includes(accountId))
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });

  const accountDoc = await db.collection("accounts").doc(accountId).get();
  if (!accountDoc.exists)
    return NextResponse.json(
      { error: t("api.accountNotFound") },
      { status: 404 },
    );

  const account = accountDoc.data()!;

  if (
    !account.smtpHost ||
    !account.smtpPort ||
    !account.email ||
    !account.encryptedPassword
  )
    return NextResponse.json(
      { error: t("api.smtpMissing") },
      { status: 400 },
    );

  const password = decrypt(account.encryptedPassword);
  const storeName = account.fantasyName || account.label || account.email;

  const sampleText = `Olá! Obrigado por entrar em contato com a ${storeName}.

Recebemos sua mensagem e estamos analisando sua solicitação. Nossa equipe irá retornar em breve com mais informações.

Se precisar de suporte imediato, não hesite em responder este e-mail.

Atenciosamente,
Equipe ${storeName}`;

  try {
    const html = renderEmailHtml(
      sampleText,
      storeName,
      template,
      template?.showLogo ? (account.logoUrl ?? null) : null,
    );

    await sendEmail(
      {
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        email: account.email,
        password,
      },
      {
        to: testEmail,
        subject: `[TESTE] Email de Resposta IA — ${storeName}`,
        text: sampleText,
        html,
      },
    );

    return NextResponse.json({
      success: true,
      message: t("api.testSent"),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao enviar email de teste (reply template):", error);
    return NextResponse.json(
      { error: t("api.testFailed"), details: message },
      { status: 500 },
    );
  }
}
