import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();

  const emailDoc = await db.collection("emails").doc(id).get();
  if (!emailDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailData = emailDoc.data()!;
  const customerId = emailData.customerId;

  // Fetch all emails for this customer
  const customerDoc = await db.collection("customers").doc(customerId).get();
  const emailIds: string[] = customerDoc.exists
    ? (customerDoc.data()?.linkedEmailIds ?? [])
    : [id];

  const allEmails: Array<{
    id: string;
    subject: string;
    from: string;
    fromName: string;
    bodyText: string;
    aiResponse?: string;
    receivedAt: { seconds: number } | null;
    status: string;
  }> = [];

  for (let i = 0; i < emailIds.length; i += 10) {
    const batch = emailIds.slice(i, i + 10);
    const snap = await db
      .collection("emails")
      .where(FieldPath.documentId(), "in", batch)
      .get();
    for (const doc of snap.docs) {
      const d = doc.data();
      allEmails.push({
        id: doc.id,
        subject: d.subject ?? "",
        from: d.from ?? "",
        fromName: d.fromName ?? "",
        bodyText: d.bodyText ?? "",
        aiResponse: d.aiResponse ?? null,
        receivedAt: d.receivedAt ? { seconds: d.receivedAt.seconds ?? d.receivedAt._seconds } : null,
        status: d.status ?? "",
      });
    }
  }

  allEmails.sort((a, b) => (a.receivedAt?.seconds ?? 0) - (b.receivedAt?.seconds ?? 0));

  const emailsBlock = allEmails
    .map((e, i) => {
      const date = e.receivedAt
        ? new Date(e.receivedAt.seconds * 1000).toLocaleString("pt-BR")
        : "data desconhecida";
      return [
        `--- Email ${i + 1} | ${date} | status: ${e.status} ---`,
        `From: ${e.fromName} <${e.from}>`,
        `Subject: ${e.subject}`,
        `Body:\n${e.bodyText?.slice(0, 800) ?? ""}`,
        e.aiResponse ? `Reply sent:\n${e.aiResponse.slice(0, 400)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const prompt = `You are analyzing a customer support conversation thread. Based on ALL the emails below, generate a concise summary IN BRAZILIAN PORTUGUESE.

IMPORTANT — Some emails arrive via Shopify's support relay (the "From" address might be a Shopify email like "no-reply@shopify.com" or similar). When this happens, the REAL customer's name and email are inside the email body. Make sure to identify the actual customer from the body content, not just the "From" field.

Emails:
${emailsBlock}

Generate a structured summary with the following sections (in Brazilian Portuguese, keep it concise):

**Cliente**
Name, email, and any other identifying info found in the emails (check the body if the from address looks like a relay).

**Problema relatado**
What issue(s) the customer reported across all their messages. Be specific.

**Histórico de atendimento**
A brief timeline of what happened: what the customer said, what was replied, what actions were taken.

**Situação atual**
Current status: resolved, pending, escalated, refund requested, etc.

**Pontos de atenção**
Any red flags, commitments made, or things that need follow-up (chargebacks, refunds promised, open questions, etc.). If none, write "Nenhum."

Reply only with the summary. Do not add any preamble.`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a customer support analyst. Be factual and concise." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 900,
  });

  const summary = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ summary });
}
