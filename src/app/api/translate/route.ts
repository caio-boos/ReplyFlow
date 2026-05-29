import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Translate the following text to Brazilian Portuguese. Return only the translation, no explanations.",
      },
      { role: "user", content: text.slice(0, 3000) },
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  const translated = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ translated });
}
