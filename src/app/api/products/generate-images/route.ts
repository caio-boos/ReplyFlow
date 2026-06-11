import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import OpenAI, { toFile } from "openai";
import path from "path";
import fs from "fs/promises";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Known logo file paths relative to /public
const LOGO_FILES: Record<string, string> = {
  ralph_lauren: path.join(process.cwd(), "public", "logotipoproduto", "ralph-lauren.png"),
};

function positionToDescription(x: number, y: number): string {
  const col = x < 33 ? "left" : x < 67 ? "center" : "right";
  const row =
    y < 25 ? "upper chest" : y < 45 ? "chest" : y < 65 ? "midriff" : "lower";
  if (col === "center") return row;
  return `${row} on the ${col} side`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const imageFile = formData.get("image") as File | null;
  const color = (formData.get("color") as string | null)?.trim();
  const colorNote = (formData.get("colorNote") as string | null)?.trim() ?? "";
  const gender = (formData.get("gender") as string | null) ?? "male";
  const logoType = (formData.get("logoType") as string | null) ?? "none";
  const logoPositionRaw = formData.get("logoPosition") as string | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No reference image provided" }, { status: 400 });
  }
  if (!color) {
    return NextResponse.json({ error: "No color specified" }, { status: 400 });
  }

  const logoPositionObj = logoPositionRaw
    ? (JSON.parse(logoPositionRaw) as { x: number; y: number })
    : null;
  const positionDesc = logoPositionObj
    ? positionToDescription(logoPositionObj.x, logoPositionObj.y)
    : "upper left chest";

  const hasLogo = logoType !== "none" && !!LOGO_FILES[logoType];

  const genderContext =
    gender === "female"
      ? "women's garment — slightly tailored, feminine silhouette"
      : "men's garment — structured, masculine silhouette with broader shoulders and straighter torso";

  const logoRule = hasLogo
    ? `6. The garment has a small embroidered logo at the ${positionDesc}. The logo is shown in the SECOND reference image — replicate its exact shape, graphic, and proportions as a stitched embroidery on the fabric. Size: no larger than 2cm. It must look factory-embroidered, not printed or pasted.${colorNote ? ` Additional instruction: ${colorNote}.` : ""}`
    : `6. NO logo, NO embroidery, NO text, NO badge — completely clean fabric surface.`;

  const prompt = `You are a professional luxury fashion product photographer. Generate a high-quality e-commerce product image of this exact ${genderContext}.

STRICT RULES:
1. Ghost mannequin: the garment hovers as if worn by an invisible ${gender === "female" ? "woman" : "man"} — full 3D body volume, natural weight and gravity in the fabric, realistic ${gender === "female" ? "slim feminine" : "athletic masculine"} chest and shoulder width
2. Natural fabric drape — slight soft folds at sleeves and hem exactly as worn — never stiff, flat or paper-like
3. NO model, body, hands, face, mannequin or hanger visible
4. NO inner garment visible — no white t-shirt or undershirt at collar or hem
5. Collar relaxed and open naturally
${logoRule}
7. Replicate EVERY detail from the first reference image exactly: fabric texture and weave, collar style, button count and placement, pocket details, sleeve length and cuff, hem shape, fit and silhouette — do not alter any design element
8. Change ONLY the color to: ${color} — apply uniformly across all fabric panels
9. Pure seamless white studio background, no shadows on background
10. Three-point fashion lighting: soft 45° key light, opposite fill, rear rim light to separate from background
11. Zero harsh shadows, zero reflections — even soft light revealing fabric texture
12. Garment perfectly centered in frame
13. Photorealistic, razor-sharp, 8K resolution`;

  try {
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const garmentFile = await toFile(
      imageBuffer,
      imageFile.name || "reference.jpg",
      { type: imageFile.type || "image/jpeg" }
    );

    // Build image input: garment reference + logo reference (if selected)
    const imageInput = hasLogo
      ? [
          garmentFile,
          await toFile(
            await fs.readFile(LOGO_FILES[logoType]),
            `${logoType}.png`,
            { type: "image/png" }
          ),
        ]
      : garmentFile;

    const response = await getClient().images.edit({
      model: "gpt-image-2",
      image: imageInput,
      prompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    });

    const imageData = response.data?.[0];
    let resultB64 = imageData?.b64_json ?? "";

    if (!resultB64 && imageData && "url" in imageData && imageData.url) {
      const fetched = await fetch(imageData.url as string);
      resultB64 = Buffer.from(await fetched.arrayBuffer()).toString("base64");
    }

    const finalUrl = `data:image/png;base64,${resultB64}`;
    return NextResponse.json({ url: finalUrl, color, costUsd: 0.25 });
  } catch (err) {
    console.error(`generate-images error for color "${color}":`, err);
    const message = err instanceof Error ? err.message : "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

