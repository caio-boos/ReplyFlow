import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { computeCostUsd } from "@/lib/ai/openai";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export interface TitleOption {
  name: string;
  recommended: boolean;
  explanation?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const productDescription: string = body?.productDescription ?? "";
  if (!productDescription.trim()) {
    return NextResponse.json({ error: "Missing productDescription" }, { status: 400 });
  }

  const prompt = `You are an expert in old money fashion copywriting. Your task is to generate a premium product name for a men's clothing item. The name must follow these strict rules:

1. **Never cite any brand name** — no Ralph Lauren, Lacoste, Massimo Dutti, or any other brand

2. **Never cite any color** — the name must work for all color variants

3. **Use a proper noun as the first word** — always a place name or aristocratic surname that evokes old money, British heritage, Mediterranean luxury, or European nobility. Examples: Portofino, Caldwell, Harrow, Salcombe, Biarritz, Gstaad, Windsor, Amalfi, Capri, Monaco

4. **Follow the proper noun with a descriptive product name** — fabric + garment type. Examples: Linen Shirt, Corduroy Overshirt, Knit Polo, Rugby Shirt, Textured Set, Quarter-Zip Sweater

5. **Always use "The" at the beginning** — format: The [Place/Name] [Fabric] [Garment Type]

6. **The name must sound like it belongs in a luxury fashion house collection** — timeless, not trendy

7. **Generate 5 options and recommend the best one with a brief explanation**

The product is: ${productDescription}

Respond ONLY in this JSON format (no extra text):
{
  "options": [
    { "name": "The Windsor Linen Shirt", "recommended": false },
    { "name": "The Portofino Linen Shirt", "recommended": true, "explanation": "Brief explanation here" },
    { "name": "The Caldwell Linen Shirt", "recommended": false },
    { "name": "The Amalfi Linen Shirt", "recommended": false },
    { "name": "The Harrow Linen Shirt", "recommended": false }
  ]
}`;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(content) as { options: TitleOption[] };
    const usage = completion.usage
      ? { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens }
      : { promptTokens: 0, completionTokens: 0 };
    const costUsd = computeCostUsd("gpt-4o", usage);
    return NextResponse.json({ options: data.options ?? [], usage, costUsd });
  } catch (err) {
    console.error("generate-title error:", err);
    return NextResponse.json({ error: "Failed to generate titles" }, { status: 500 });
  }
}
