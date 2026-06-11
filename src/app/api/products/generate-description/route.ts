import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { computeCostUsd } from "@/lib/ai/openai";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const productName: string = body?.productName ?? "";
  const productDescription: string = body?.productDescription ?? "";
  const pieces: string = body?.pieces ?? "1";

  if (!productName.trim() || !productDescription.trim()) {
    return NextResponse.json({ error: "Missing productName or productDescription" }, { status: 400 });
  }

  const piecesLabel = pieces === "2" ? "2 pieces (set)" : "1 piece";

  const prompt = `You are an expert old money fashion copywriter specializing in premium menswear for an international luxury e-commerce store. Your task is to write a complete Shopify product description in English following these strict rules:

**CONTENT RULES:**

1. Never cite any brand name under any circumstances

2. Never cite any specific color — the description must work for all color variants

3. Never include any images or image tags

4. Write in the AIDA model (Attention, Interest, Desire, Action) separated into exactly 3 paragraphs with H3 titles

5. Reference real luxury destinations to sell the lifestyle — use places like Positano, Monaco, Lake Como, Santorini, Portofino, Amalfi Coast, Côte d'Azur, Algarve, Saint-Tropez, Gstaad

6. The tone must be quiet, confident and aspirational — never loud, never salesy

7. End with a short powerful call to action

**FORMAT RULES:**
8. Use only H3 for titles — never H1 or H2
9. No bullet points unless specifically requested
10. No bold text inside paragraphs
11. 100% Shopify compatible HTML — no DOCTYPE, no html, no head, no body tags
12. Include a size guide table at the end using this exact CSS and structure:

<div class="size-wrap">
<style>
  .size-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .size-table{width:100%;min-width:420px;border-collapse:collapse;font-family:-apple-system,sans-serif;font-size:13px;text-align:center}
  .size-table thead{background:#111;color:#fff}
  .size-table th,.size-table td{padding:10px 12px;border:1px solid #e0e0e0}
  .size-table tbody tr:nth-child(even){background:#f9f9f9}
  .size-note{font-family:-apple-system,sans-serif;font-size:12px;color:#888;margin-top:8px}
</style>
<h3>Size Guide</h3>
<table class="size-table">
  <thead><tr><th>Size</th><th>Chest (cm)</th><th>Shoulder (cm)</th><th>Length (cm)</th><th>Sleeve (cm)</th></tr></thead>
  <tbody>
    [rows from S to 3XL with realistic measurements]
  </tbody>
</table>
<p class="size-note">Measurements are in centimeters. We recommend measuring your chest and choosing accordingly.</p>
</div>

**THE PRODUCT:**
Name: ${productName}
Description: ${productDescription}
Number of pieces: ${piecesLabel}

Return ONLY the HTML content — no markdown code blocks, no extra explanation, no \`\`\`html fences.`;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const html = completion.choices[0].message.content ?? "";
    // Strip any accidental markdown fences
    const cleanHtml = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const usage = completion.usage
      ? { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens }
      : { promptTokens: 0, completionTokens: 0 };
    const costUsd = computeCostUsd("gpt-4o", usage);
    return NextResponse.json({ html: cleanHtml, usage, costUsd });
  } catch (err) {
    console.error("generate-description error:", err);
    return NextResponse.json({ error: "Failed to generate description" }, { status: 500 });
  }
}
