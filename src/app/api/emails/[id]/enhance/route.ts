import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { getCustomerEmailHistory, extractOrderNumbers } from "@/lib/customer/identifier";
import {
  getShopifyOrderByNumber,
  getShopifyOrdersByEmail,
  formatOrderForAI,
} from "@/lib/shopify/client";
import { computeCostUsd } from "@/lib/ai/openai";
import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { draft } = await req.json();
  if (!draft || typeof draft !== "string") {
    return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  }

  const db = getAdminDb();
  const emailDoc = await db.collection("emails").doc(id).get();
  if (!emailDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailData = emailDoc.data()!;

  const accountDoc = await db.collection("accounts").doc(emailData.accountId).get();
  if (!accountDoc.exists) return NextResponse.json({ error: "Account not found" }, { status: 400 });
  const accountData = accountDoc.data()!;

  const systemContext =
    accountData.systemPrompt ??
    "Você é um assistente de atendimento ao cliente de uma loja de e-commerce.";

  const storeName = accountData.label || accountData.email;
  const emailHistory = await getCustomerEmailHistory(emailData.customerId);

  // Shopify lookup (best-effort)
  let orderInfo: string | null = null;
  if (accountData.shopifyDomain && accountData.encryptedShopifyToken) {
    try {
      const shopifyToken = decrypt(accountData.encryptedShopifyToken);
      const searchText = (emailData.subject ?? "") + " " + (emailData.bodyText ?? "");
      const orderNumbers = extractOrderNumbers(searchText);
      let order = null;
      for (const num of orderNumbers) {
        order = await getShopifyOrderByNumber(accountData.shopifyDomain, shopifyToken, num);
        if (order) break;
      }
      if (!order) {
        const orders = await getShopifyOrdersByEmail(accountData.shopifyDomain, shopifyToken, emailData.from);
        if (orders.length > 0) order = orders[0];
      }
      if (order) orderInfo = formatOrderForAI(order, accountData.trackingUrlTemplate);
    } catch {
      /* non-fatal */
    }
  }

  const historyBlock =
    emailHistory.length > 1
      ? emailHistory
          .slice(0, -1)
          .map(
            (h, i) =>
              `--- Previous email ${i + 1} (${h.receivedAt.toLocaleDateString("en-US")}) ---\nFrom: ${h.from}\nSubject: ${h.subject}\nMessage: ${h.bodyText.slice(0, 600)}${h.aiResponse ? `\n\nReply sent: ${h.aiResponse.slice(0, 400)}` : ""}`,
          )
          .join("\n\n")
      : "No previous contact from this customer.";

  const resolvedContext = systemContext.replaceAll("{{STORE_NAME}}", storeName);

  const systemPrompt = `You are a customer support agent for the store "${storeName}".

STORE CONTEXT:
${resolvedContext}

RULES:
- Always reply in ENGLISH.
- Be professional and empathetic.
- Never reveal you are an AI.
- Always end with "Best regards,\n${storeName}".`;

  const userPrompt = `EMAIL HISTORY FOR THIS CUSTOMER:
${historyBlock}
${orderInfo ? `\n--- SHOPIFY ORDER DATA ---\n${orderInfo}\n` : ""}
--- CURRENT EMAIL TO REPLY TO ---
From: ${emailData.fromName || emailData.from} <${emailData.from}>
Subject: ${emailData.subject}
Message:
${emailData.bodyText?.slice(0, 1200) ?? ""}

--- AGENT'S DRAFT (use this as the base — keep the intent and tone, polish and complete it into a professional reply) ---
${draft.slice(0, 1000)}

Write the final polished reply in ENGLISH based on the agent's draft above.`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.35,
    max_tokens: 800,
  });

  const enhanced = completion.choices[0]?.message?.content?.trim() ?? "";
  const cost = computeCostUsd("gpt-4o", {
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
  });
  await db.collection("emails").doc(id).update({ aiCostUsd: FieldValue.increment(cost) });
  return NextResponse.json({ enhanced });
}
