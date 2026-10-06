import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findVideoEditModel } from "@/lib/video/edit-models";
import { improveEditPrompt } from "@/lib/video/prompt-assistant";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada." },
      { status: 428 },
    );
  }

  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const model = findVideoEditModel(String(body?.model ?? ""));
  const referenceCount = Math.max(0, Math.min(7, Number(body?.referenceCount) || 0));

  if (!prompt) {
    return NextResponse.json({ error: "Escreva o pedido antes." }, { status: 400 });
  }
  if (!model) {
    return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
  }

  try {
    const improved = await improveEditPrompt(prompt, model, referenceCount);
    return NextResponse.json({ prompt: improved });
  } catch (err) {
    console.error("[clone] falha ao melhorar prompt", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao melhorar o prompt." },
      { status: 502 },
    );
  }
}
