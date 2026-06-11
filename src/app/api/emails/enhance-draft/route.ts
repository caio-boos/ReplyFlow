import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { computeCostUsd } from "@/lib/ai/openai";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let draft: string,
    subject: string | undefined,
    accountId: string | undefined;
  try {
    const body = await req.json();
    draft = body.draft ?? "";
    subject = typeof body.subject === "string" ? body.subject : undefined;
    accountId =
      typeof body.accountId === "string" && body.accountId.trim()
        ? body.accountId.trim()
        : undefined;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!draft || typeof draft !== "string" || !draft.trim()) {
    return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  }

  const db = getAdminDb();

  let storeName = "a loja";
  if (accountId) {
    try {
      const accountDoc = await db.collection("accounts").doc(accountId).get();
      if (accountDoc.exists) {
        const accountData = accountDoc.data()!;
        storeName = accountData.label || accountData.email;
      }
    } catch {
      /* non-fatal */
    }
  }

  const contextDoc = await db.collection("config").doc("context").get();
  const systemContext =
    contextDoc.data()?.systemPrompt ??
    "Você é um assistente de atendimento ao cliente de uma loja de e-commerce.";

  const resolvedContext = systemContext.replaceAll("{{STORE_NAME}}", storeName);

  const systemPrompt = `You are a customer support agent for the store "${storeName}".

STORE CONTEXT:
${resolvedContext}

RULES:
- ALWAYS write the final email in ENGLISH, regardless of the language the draft was written in.
- Be professional and empathetic.
- Never reveal you are an AI.
- Always end with "Best regards,\n${storeName}".`;

  const userPrompt = `--- OUTBOUND EMAIL CONTEXT ---
Subject: ${subject ?? "(no subject)"}

--- AGENT'S DRAFT ---
${draft.slice(0, 1500)}

Polish and complete the draft into a professional outbound email IN ENGLISH. Keep the intent and tone, improve clarity and professionalism. Return only the email body text in English, without any subject line or headers.`;

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
  // Log cost but don't block on it
  try {
    const cost = computeCostUsd("gpt-4o", {
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
    });
    console.log(`[enhance-draft] cost: $${cost.toFixed(6)}`);
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ enhanced });
}
