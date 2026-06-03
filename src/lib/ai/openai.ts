import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

// Pricing per 1M tokens (USD) — update when OpenAI changes rates
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o":      { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output:  0.60 },
};

export function computeCostUsd(model: string, usage: TokenUsage): number {
  const rates = COST_PER_1M[model] ?? COST_PER_1M["gpt-4o"];
  return (
    (usage.promptTokens     / 1_000_000) * rates.input +
    (usage.completionTokens / 1_000_000) * rates.output
  );
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
  orderInfo?: string | null;
  emailHistory: Array<{
    subject: string;
    bodyText: string;
    from: string;
    receivedAt: Date;
    aiResponse?: string;
  }>;
}

export async function generateReply(params: GenerateReplyParams): Promise<{ text: string; usage: TokenUsage }> {
  const {
    systemContext,
    storeName,
    customerName,
    customerEmail,
    currentSubject,
    currentEmailBody,
    orderInfo,
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

  // Replace {{STORE_NAME}} placeholder in context, and also replace any
  // hardcoded store name that differs from the current account's store name
  // so that templates in the context always use the correct name.
  const resolvedContext = systemContext.replaceAll("{{STORE_NAME}}", storeName);

  const systemPrompt = `You are a customer support agent for the store "${storeName}".

⚠️ LANGUAGE RULE (highest priority): Always reply in ENGLISH, regardless of the language the customer used. No exceptions.

STORE CONTEXT (use as behavior guide only):
${resolvedContext}

IMPORTANT RULES:
- Your main goal is to RESOLVE the customer's issue and PREVENT chargebacks.
- If the customer mentions chargeback, dispute, PayPal claim, or bank complaint, immediately offer a solution (refund, resend, discount) before the chargeback is opened.
- Read the FULL email history before replying.
- Be concise but complete — do not leave questions unanswered.
- Never reveal you are an AI.
- ⚠️ SIGNATURE RULE (override any template): Always end every reply with "Best regards,\n${storeName}" — never use any other name in the signature, regardless of what the templates above say.
- ⚠️ ACCEPTANCE RULE (critical): If the customer's message is accepting or confirming an offer you made in a previous reply (e.g. "ok", "yes", "that works", "I accept", "deal", "fine", "agreed"), you MUST confirm the acceptance and tell them the action will be processed. Do NOT offer a higher percentage, a new deal, or any other alternative. Simply confirm: "Thank you for accepting. We will process your [X]% refund within [timeframe]." Do NOT escalate the offer when the customer has already agreed.

⚠️ REMINDER: Always reply in ENGLISH. Ignore the language of the customer's email and the store context above — reply only in English.`;

  const cleanBody = stripQuotedText(currentEmailBody);
  const bodyDisplay = cleanBody.trim()
    ? cleanBody
    : "[Customer sent no text — replied with images/attachments only. Based on the conversation history, infer the context and proceed to the appropriate next step (e.g. if photos were previously requested, now offer the partial refund).]";

  const userPrompt = `EMAIL HISTORY FOR THIS CUSTOMER:
${historyBlock}
${orderInfo ? `\n--- SHOPIFY ORDER DATA (use this for accurate delivery/tracking info) ---\n${orderInfo}\n` : ""}
--- CURRENT EMAIL TO REPLY TO ---
From: ${customerName} <${customerEmail}>
Subject: ${currentSubject}
Message:
${bodyDisplay}

Write a professional and empathetic reply in ENGLISH.`;


  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  return {
    text: completion.choices[0]?.message?.content?.trim() ?? "",
    usage: {
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
    },
  };
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

export async function extractFlags(emailBody: string, aiResponse: string, previousAiResponse?: string): Promise<{ flags: ExtractedFlags; usage: TokenUsage }> {
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
          content: `${previousAiResponse ? `Previous AI reply (what customer is responding to):\n${previousAiResponse.slice(0, 600)}\n\n` : ""}Customer email:\n${emailBody.trim() ? emailBody.slice(0, 1200) : "[No text body — customer sent images/attachments only. If the previous AI reply requested photos, set photos_received: true]"}\n\nNew AI reply sent:\n${aiResponse.slice(0, 600)}\n\nReturn JSON:\n- chargeback_risk (bool): customer threatened chargeback/PayPal dispute\n- manual_review (bool): situation requires a human to review (address change, order edit, unclear case)\n- refund_pending (bool): customer EXPLICITLY ACCEPTED a refund offer in their email (e.g. "ok", "yes I accept", "that works", "I'll take it"). FALSE if the AI only offered — the customer must have clearly agreed.\n- photos_received (bool): customer sent photos or attachments in this email (true also when body is empty and previous reply asked for photos)\n- carrier_problem (bool): shipping carrier / tracking issue\n- address_problem (bool): customer requested address change\n- priority: "high" if chargeback or customer accepted full refund, "medium" if manual review or address, else "low"\n- tasks: ONLY create a task when a HUMAN must take a real action. Valid reasons ONLY: (1) customer EXPLICITLY ACCEPTED a refund percentage in their email → "Process X% refund for [customer email]", (2) customer refuses ALL partial refunds and demands 100% → "Process full refund for [customer email]", (3) address change requested → "Update shipping address with carrier", (4) order cancellation confirmed → "Cancel order in system". Do NOT create tasks when: the AI offered a refund but customer has not replied yet, asking for photos, chargeback risk detected, tracking delays, or any normal automated reply. Max 2 tasks.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 400,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return {
      flags: { ...defaultFlags, ...parsed },
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    return { flags: defaultFlags, usage: { promptTokens: 0, completionTokens: 0 } };
  }
}

export interface EmailClassification {
  type: "customer" | "alert" | "ignore";
  reason: string; // short explanation
  taskDescription?: string; // only when type === "alert"
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function isLikelyFakeCustomerMarketing(subject: string, bodyText: string): boolean {
  const text = normalizeText(`${subject} ${bodyText}`);
  if (!text) return false;

  const fakeCustomerPatterns = [
    /\bis this (store|shop|business|website) available\b/,
    /\bis your (store|shop|business|website) available\b/,
    /\bare you the owner of (this )?(store|shop|business|website)\b/,
    /\b(is|are) (the )?(store|shop|business|website) for sale\b/,
  ];

  const hasFakeCustomerPattern = fakeCustomerPatterns.some((pattern) => pattern.test(text));
  if (!hasFakeCustomerPattern) return false;

  // If there is clear purchase/support intent, do not auto-ignore.
  const customerIntentSignals =
    /\b(order|tracking|refund|return|exchange|shipment|shipping|cancel|complaint|broken|defect|wrong item|never arrived|didn't arrive|not received)\b/;
  return !customerIntentSignals.test(text);
}

/**
 * Quickly classifies an incoming email before any processing.
 * - "customer": real customer needing a reply (order issues, complaints, questions)
 * - "alert": important non-customer email requiring human attention (Shopify critical
 *   alerts, chargebacks, legal threats, account suspension warnings, payment failures)
 * - "ignore": marketing, newsletters, proposals, service offers, cold outreach
 */
export async function classifyEmail(
  from: string,
  subject: string,
  bodyText: string
): Promise<EmailClassification & { usage: TokenUsage }> {
  const zeroUsage: TokenUsage = { promptTokens: 0, completionTokens: 0 };
  if (isLikelyFakeCustomerMarketing(subject, bodyText)) {
    return {
      type: "ignore",
      reason: "Likely fake-customer marketing/prospecting message",
      usage: zeroUsage,
    };
  }

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You classify incoming emails for an e-commerce store. Return only valid JSON with no markdown.",
        },
        {
          role: "user",
          content: `From: ${from}
Subject: ${subject}
Body (first 800 chars): ${bodyText.slice(0, 800)}

Classify this email. Return JSON:
{
  "type": "customer" | "alert" | "ignore",
  "reason": "<one sentence>",
  "taskDescription": "<only if type is alert, else null>"
}

Rules:
- "customer": real customer asking about their order, complaint, refund request, tracking question, product issue, or any human who bought or wants to buy something.
- "alert": automated or business email that REQUIRES human attention: Shopify chargeback notification, Shopify payment/payout issue, Shopify account warning/suspension, fraud alert, legal threat, DMCA, dispute opened by payment provider, critical system alert.
- "ignore": everything else — marketing emails, newsletters, promotional offers, SEO/agency proposals, cold sales outreach, partnership offers, service pitches, automated shipping notifications that need no action, social media notifications, any bulk/no-reply sender that is not critical.
- Treat vague owner/business prospecting as "ignore" (common fake-customer marketing), e.g.: "Hey, is this store available?", "Is your business available?", "Are you the owner?", "Is this website for sale?".
- If the message has no order details, no product question, and no post-purchase issue, prefer "ignore".

When in doubt between "customer" and "ignore", choose "customer".
When in doubt between "alert" and "ignore", choose "alert".`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 150,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return {
      type: parsed.type ?? "customer",
      reason: parsed.reason ?? "",
      taskDescription: parsed.taskDescription ?? undefined,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    return { type: "customer", reason: "Classification failed — defaulting to customer", usage: zeroUsage };
  }
}
