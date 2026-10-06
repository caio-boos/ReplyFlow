import { getClient } from "@/lib/ai/openai";
import type { VideoEditModel } from "./edit-models";

const MAX_OUTPUT_CHARS = 1500;

function modelRules(model: VideoEditModel, referenceCount: number): string {
  if (!model.usesReferenceTags) {
    return referenceCount > 0
      ? "A single reference image was uploaded. This model has no tag syntax, so describe the intended look in words; do not invent any <<<image>>> markers."
      : "This model takes no reference images. Never emit <<<image>>> markers.";
  }
  if (referenceCount === 0) {
    return "No reference images were uploaded, so never emit <<<image>>> markers.";
  }

  const tags = Array.from(
    { length: referenceCount },
    (_, i) => `<<<image_${i + 1}>>>`,
  ).join(", ");

  return [
    `The user uploaded ${referenceCount} reference image(s), addressable as ${tags}.`,
    "Each marker IS the person or element pictured; use it as a noun, never as a file reference.",
    "Write ONE separate imperative sentence per marker.",
    "Never use the word 'respectively' and never group two markers into a single instruction — that makes the model apply only the first one.",
    "Identify each target in the video unambiguously (position in frame, clothing colour, hair, who holds the product).",
  ].join(" ");
}

/** Reescreve o pedido do usuário no formato que os modelos de edição seguem. */
export async function improveEditPrompt(
  rawPrompt: string,
  model: VideoEditModel,
  referenceCount: number,
): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: [
          `You rewrite prompts for the AI video editing model "${model.label}" running on Replicate.`,
          "Return ONLY the rewritten prompt: no preamble, no explanation, no markdown, no surrounding quotes.",
          "Write in English — these models follow English far better than other languages.",
          "Use direct imperative instructions ('Replace the woman on the left with X'), never descriptive statements ('the women should be Japanese').",
          "Never instruct the model to keep the appearance of the very thing that must change.",
          "Finish with one sentence listing what must stay identical (body movement, poses, clothing, product, background, camera motion) plus any removal request such as on-screen text.",
          `Keep the result under ${MAX_OUTPUT_CHARS} characters. Plain text only.`,
          modelRules(model, referenceCount),
        ].join(" "),
      },
      { role: "user", content: rawPrompt.trim().slice(0, 2000) },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const improved = completion.choices[0]?.message?.content?.trim();
  if (!improved) throw new Error("A IA não retornou um prompt.");
  return improved.slice(0, MAX_OUTPUT_CHARS);
}
