import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const DEFAULT_CONTEXT = `# AI SUPPORT FLOW

## Objetivo
Reduzir chargebacks, automatizar suporte e deixar apenas casos realmente necessários para análise humana.

A IA deve:
- Responder sempre na mesma língua do cliente
- Ser educada e calma
- Nunca admitir fraude
- Sempre tentar resolver primeiro com reembolso parcial
- Criar flags internas quando necessário

## FLUXO DE PRODUTO COM PROBLEMA (falso, qualidade ruim, tamanho errado)
1. PRIMEIRA MENSAGEM → pedir fotos (logos, etiquetas, costuras, embalagem)
2. APÓS FOTOS → oferecer 40% de reembolso mantendo o produto
3. CLIENTE RECUSOU → oferecer 50%
4. AINDA RECUSOU → oferecer 70%
5. AMEAÇA CHARGEBACK/PAYPAL/BANCO → aprovar 100% imediatamente

## FLUXO DE ENTREGA
- "Onde está meu pedido" / "atrasado" → prazo máximo 14 dias úteis, enviar link de rastreio
- Sem atualização no rastreio → informar que a transportadora está sendo monitorada
- Entregue ao vizinho → orientar a verificar endereços próximos

## REGRAS IMPORTANTES
- Resposta de TROCA → não é viável internacionalmente, oferecer reembolso parcial
- ALTERAÇÃO DE ENDEREÇO → não decidir, criar flag manual_review
- CLIENTE AGRESSIVO → nunca responder agressivamente, nunca admitir golpe
- REEMBOLSO PROMETIDO E COBRADO → informar que está sendo priorizado

## ASSINATURA
A assinatura é gerada automaticamente com o nome da loja configurada em cada conta.`;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const accountDoc = await db.collection("accounts").doc(accountId).get();
  if (!accountDoc.exists) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const systemPrompt = accountDoc.data()?.systemPrompt ?? DEFAULT_CONTEXT;
  return NextResponse.json({ text: systemPrompt });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId, text } = await req.json();
  if (typeof accountId !== "string" || !accountId.trim()) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("accounts").doc(accountId.trim());
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await ref.update({ systemPrompt: text.trim(), updatedAt: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true });
}
