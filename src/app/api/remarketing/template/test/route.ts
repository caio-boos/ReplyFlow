import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { renderRemarketingEmailHtml } from "@/lib/email/html-template";
import { RemarketingTemplateConfig } from "@/lib/types";
import { sendEmail } from "@/lib/email/smtp";
import { decrypt } from "@/lib/crypto/encryption";
import { getT } from "@/lib/i18n/server";

export async function POST(req: NextRequest) {
  const [t, tc] = await Promise.all([getT("marketing"), getT("common")]);
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });

  const body = await req.json();
  const { accountId, testEmail, template } = body as {
    accountId: string;
    testEmail: string;
    template?: RemarketingTemplateConfig;
  };

  if (!accountId || !testEmail) {
    return NextResponse.json(
      { error: t("api.testEmailRequired") },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const ownedIds = await getOwnedAccountIds(db, session.uid);

  if (!ownedIds.includes(accountId)) {
    return NextResponse.json({ error: tc("states.forbidden") }, { status: 403 });
  }

  // Buscar configuração da conta
  const accountDoc = await db.collection("accounts").doc(accountId).get();
  if (!accountDoc.exists) {
    return NextResponse.json({ error: t("api.accountNotFound") }, { status: 404 });
  }

  const account = accountDoc.data();

  //   console.log("Account data:", account);

  // Validar credenciais SMTP
  if (
    !account ||
    !account.smtpHost ||
    !account.smtpPort ||
    !account.email ||
    !account.encryptedPassword
  ) {
    return NextResponse.json(
      {
        error: t("api.smtpMissing"),
        details: t("api.smtpMissingDetails"),
        missing: {
          smtpHost: !account?.smtpHost,
          smtpPort: !account?.smtpPort,
          email: !account?.email,
          password: !account?.encryptedPassword,
        },
      },
      { status: 400 },
    );
  }

  // Descriptografar senha
  const password = decrypt(account.encryptedPassword);

  // Dados de exemplo para o email de teste
  const testData = {
    customerName: "Cliente Teste",
    storeName: account?.label || "Sua Loja",
    items: [
      {
        title: "Produto Exemplo 1",
        quantity: 2,
        price: 99.9,
        currency: "R$",
        imageUrl: "https://via.placeholder.com/150",
      },
      {
        title: "Produto Exemplo 2",
        quantity: 1,
        price: 149.9,
        currency: "R$",
        imageUrl: "https://via.placeholder.com/150",
      },
    ],
    totalPrice: 349.7,
    currency: "R$",
    discountPercent: 10,
    checkoutUrl: "https://exemplo.com/checkout",
    language: "pt-BR",
  };

  try {
    const emailHtml = renderRemarketingEmailHtml(testData, template);

    await sendEmail(
      {
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        email: account.email,
        password: password,
      },
      {
        to: testEmail,
        subject: `[TESTE] Email de Remarketing - ${account.label}`,
        text: "Este é um email de teste do sistema de remarketing.",
        html: emailHtml,
      },
    );

    return NextResponse.json({
      success: true,
      message: t("api.testSent"),
    });
  } catch (error: any) {
    console.error("Erro ao enviar email de teste:", error);
    return NextResponse.json(
      {
        error: t("api.testFailed"),
        details: error.message,
      },
      { status: 500 },
    );
  }
}
