import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { findVideoEditModel } from "@/lib/video/edit-models";
import { videoErrorMessage } from "@/lib/video/errors";
import { improveEditPrompt } from "@/lib/video/prompt-assistant";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }
  const t = await getT("tools");

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: t("errors.openaiKeyMissing") },
      { status: 428 },
    );
  }

  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const model = findVideoEditModel(String(body?.model ?? ""));
  const referenceCount = Math.max(0, Math.min(7, Number(body?.referenceCount) || 0));

  if (!prompt) {
    return NextResponse.json({ error: t("errors.writePromptFirst") }, { status: 400 });
  }
  if (!model) {
    return NextResponse.json({ error: t("errors.invalidModel") }, { status: 400 });
  }

  try {
    const improved = await improveEditPrompt(prompt, model, referenceCount);
    return NextResponse.json({ prompt: improved });
  } catch (err) {
    console.error("[clone] falha ao melhorar prompt", err);
    return NextResponse.json(
      { error: videoErrorMessage(t, err, t("errors.improveFailed")) },
      { status: 502 },
    );
  }
}
