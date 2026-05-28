import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Strips quoted reply lines from an email body so the AI only sees the
 * customer's NEW text, not the full thread history pasted by the email client.
 * Removes lines starting with ">", "On ... wrote:" separators, and common
 * email client reply headers.
 */
function stripQuotedText(body: string): string {
  const lines = body.split("\n");
  const clean: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) break;
    if (/^on .{5,} wrote:/i.test(trimmed)) break;
    if (/^[-_]{4,}/.test(trimmed)) break;
    if (/^(from|sent|to|subject)\s*:/i.test(trimmed) && clean.length > 0) break;
    clean.push(line);
  }
  return clean.join("\n").trim() || body.trim();
}

export interface GenerateReplyParams {
  systemContext: string;
  storeName: string;
  customerName: string;
  customerEmail: string;
  currentSubject: string;
  currentEmailBody: string;
  emailHistory: Array<{
    subject: string;
    bodyText: string;
    from: string;
    receivedAt: Date;
    aiResponse?: string;
  }>;
}

export async function generateReply(params: GenerateReplyParams): Promise<string> {
  const {
    systemContext,
    storeName,
    customerName,
    customerEmail,
    currentSubject,
    currentEmailBody,
    emailHistory,
  } = params;

  const historyBlock =
    emailHistory.length > 1
      ? emailHistory
          .slice(0, -1)
          .map(
            (h, i) =>
              `--- Previous email ${i + 1} (${h.receivedAt.toLocaleDateString("en-US")}) ---\nFrom: ${h.from}\nSubject: ${h.subject}\nMessage: ${stripQuotedText(h.bodyText).slice(0, 600)}${h.aiResponse ? `\n\nReply sent: ${h.aiResponse.slice(0, 400)}` : ""}`
          )
          .join("\n\n")
      : "No previous contact from this customer.";

  const systemPrompt = `You are a customer support agent for the store "${storeName}".

⚠️ LANGUAGE RULE (highest priority): Detect the language of the customer's email and reply in that EXACT language. English email → English reply. No exceptions.

STORE CONTEXT (use as behavior guide only — do NOT affect reply language):
${systemContext}

IMPORTANT RULES:
- Your main goal is to RESOLVE the customer's issue and PREVENT chargebacks.
- If the customer mentions chargeback, dispute, PayPal claim, or bank complaint, immediately offer a solution (refund, resend, discount) before the chargeback is opened.
- Read the FULL email history before replying.
- Be concise but complete — do not leave questions unanswered.
- Never reveal you are an AI.
- Always sign as "${storeName} Support Team".
- ⚠️ ACCEPTANCE RULE (critical): If the customer's message is accepting or confirming an offer you made in a previous reply (e.g. "ok", "yes", "that works", "I accept", "deal", "fine", "agreed"), you MUST confirm the acceptance and tell them the action will be processed. Do NOT offer a higher percentage, a new deal, or any other alternative. Simply confirm: "Thank you for accepting. We will process your [X]% refund within [timeframe]." Do NOT escalate the offer when the customer has already agreed.

⚠️ REMINDER: Reply in the SAME LANGUAGE the customer used. The store context above may be in Portuguese — ignore its language, follow only its logic.`;

  const userPrompt = `EMAIL HISTORY FOR THIS CUSTOMER:
${historyBlock}

--- CURRENT EMAIL TO REPLY TO ---
From: ${customerName} <${customerEmail}>
Subject: ${currentSubject}
Message:
${stripQuotedText(currentEmailBody)}

Write a professional and empathetic reply in the SAME LANGUAGE as the customer's message above.`;


  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export interface ExtractedFlags {
  chargeback_risk: boolean;
  manual_review: boolean;
  refund_pending: boolean;
  photos_received: boolean;
  carrier_problem: boolean;
  address_problem: boolean;
  priority: "high" | "medium" | "low";
  tasks: string[];
}

export async function extractFlags(emailBody: string, aiResponse: string, previousAiResponse?: string): Promise<ExtractedFlags> {
  const defaultFlags: ExtractedFlags = {
    chargeback_risk: false, manual_review: false, refund_pending: false,
    photos_received: false, carrier_problem: false, address_problem: false,
    priority: "low", tasks: [],
  };
  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You analyze customer support email exchanges and extract flags. Return only valid JSON.",
        },
        {
          role: "user",
          content: `${previousAiResponse ? `Previous AI reply (what customer is responding to):\n${previousAiResponse.slice(0, 600)}\n\n` : ""}Customer email:\n${emailBody.slice(0, 1200)}\n\nNew AI reply sent:\n${aiResponse.slice(0, 600)}\n\nReturn JSON:\n- chargeback_risk (bool): customer threatened chargeback/PayPal dispute\n- manual_review (bool): situation requires a human to review (address change, order edit, unclear case)\n- refund_pending (bool): customer EXPLICITLY ACCEPTED a refund offer in their email (e.g. "ok", "yes I accept", "that works", "I'll take it"). FALSE if the AI only offered — the customer must have clearly agreed.\n- photos_received (bool): customer sent photos in this email\n- carrier_problem (bool): shipping carrier / tracking issue\n- address_problem (bool): customer requested address change\n- priority: "high" if chargeback or customer accepted full refund, "medium" if manual review or address, else "low"\n- tasks: ONLY create a task when a HUMAN must take a real action. Valid reasons ONLY: (1) customer EXPLICITLY ACCEPTED a refund percentage in their email → "Process X% refund for [customer email]", (2) customer refuses ALL partial refunds and demands 100% → "Process full refund for [customer email]", (3) address change requested → "Update shipping address with carrier", (4) order cancellation confirmed → "Cancel order in system". Do NOT create tasks when: the AI offered a refund but customer has not replied yet, asking for photos, chargeback risk detected, tracking delays, or any normal automated reply. Max 2 tasks.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 400,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return { ...defaultFlags, ...parsed };
  } catch {
    return defaultFlags;
  }
}
