import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getClient } from "@/lib/ai/openai";
import * as cheerio from "cheerio";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese (Português do Brasil)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  it: "Italian (Italiano)",
  nl: "Dutch (Nederlands)",
  ja: "Japanese (日本語)",
  zh: "Simplified Chinese (中文简体)",
};

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    if (!["http:", "https:"].includes(protocol)) return false;
    const h = hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
    if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

const SKIP_TAGS = new Set(["script", "style", "noscript", "code", "pre", "svg", "math"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const url = body.url?.trim();
  const language: string = body.language ?? "pt";
  const product: string = body.product?.trim() ?? "o produto";
  const brand: string = body.brand?.trim() ?? "a marca";
  const productLink: string = body.productLink?.trim() ?? "";

  if (!url) return NextResponse.json({ error: "URL é obrigatória" }, { status: 400 });
  if (!isSafeUrl(url)) return NextResponse.json({ error: "URL inválida ou não permitida" }, { status: 400 });
  if (productLink && !isSafeUrl(productLink)) return NextResponse.json({ error: "Link do produto inválido" }, { status: 400 });

  let rawHtml: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)", Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rawHtml = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível acessar a URL: ${err instanceof Error ? err.message : "erro"}` }, { status: 400 });
  }

  // ── DOM manipulation with cheerio ────────────────────────────────────────
  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  $("script").remove();
  $('link[rel="preload"], link[rel="preconnect"], link[rel="prefetch"], link[rel="dns-prefetch"]').remove();
  $('meta[name^="shopify"], meta[name="shopify-y"], meta[name="shopify-s"]').remove();
  $('link[rel="canonical"]').remove();

  // Replace <img> with [IMGn] placeholders
  let imgCounter = 0;
  $("img").each((_, el) => $(el).replaceWith(`[IMG${++imgCounter}]`));

  // Replace background-image in inline styles
  let imgBgCounter = 0;
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    const updated = style.replace(/background(?:-image)?\s*:[^;]*url\([^)]+\)[^;]*/gi, () => `background-image: url([IMGBG${++imgBgCounter}])`);
    if (updated !== style) $(el).attr("style", updated);
  });

  // Replace background-image in <style> blocks (skip data: URIs)
  $("style").each((_, el) => {
    const css = $(el).html() ?? "";
    const updated = css.replace(/url\((['"]?)(?!data:)([^'")\s]+)\1\)/gi, () => `url([IMGBG${++imgBgCounter}])`);
    if (updated !== css) $(el).html(updated);
  });

  // Replace internal <a href> with [LINKn]
  let linkCounter = 0;
  let sourceHost = "";
  try { sourceHost = new URL(url).hostname; } catch { /* ignore */ }
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const parsed = new URL(href, `https://${sourceHost}`);
      if (parsed.hostname === sourceHost) $(el).attr("href", `[LINK${++linkCounter}]`);
    } catch {
      $(el).attr("href", `[LINK${++linkCounter}]`);
    }
  });

  // ── Extract text nodes → replace with %%Tn%% placeholders ────────────────
  // AI translates only the text JSON — output tokens drop from ~50k to ~3k
  const textMap: Record<string, string> = {};
  let textIdx = 0;

  function walkNode(node: cheerio.AnyNode) {
    if (node.type === "text") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: string = (node as any).data ?? "";
      const trimmed = raw.trim();
      if (trimmed.length < 2) return;
      const key = `T${++textIdx}`;
      textMap[key] = trimmed;
      const start = raw.indexOf(trimmed);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).data = raw.slice(0, start) + `%%${key}%%` + raw.slice(start + trimmed.length);
    } else if (node.type === "tag" || node.type === "root") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tagName = ((node as any).name ?? "").toLowerCase();
      if (SKIP_TAGS.has(tagName)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const child of (node as any).children ?? []) walkNode(child);
    }
  }

  // Walk body + title
  const bodyEl = $("body")[0];
  if (bodyEl) walkNode(bodyEl);
  const titleEl = $("title")[0];
  if (titleEl) walkNode(titleEl);

  // Also translate key meta content attributes
  $('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
    const content = $(el).attr("content") ?? "";
    const trimmed = content.trim();
    if (trimmed.length < 2) return;
    const key = `T${++textIdx}`;
    textMap[key] = trimmed;
    $(el).attr("content", content.replace(trimmed, `%%${key}%%`));
  });

  const placeholderHtml = $.html();

  // ── Send ONLY text map to AI ──────────────────────────────────────────────
  const langName = LANGUAGE_NAMES[language] ?? language;

  // Cap at 400 entries to stay within token budget (covers virtually all pages)
  const entries = Object.entries(textMap).slice(0, 400);
  const textChunk = Object.fromEntries(entries);

  const linkInstruction = productLink
    ? `- Replace every [LINKn] value with: "${productLink}"`
    : `- Replace every [LINKn] value with "#"`;

  const systemPrompt = `You are a translator for HTML advertorial text.

Translate the JSON values:
1. Translate ALL text to ${langName}.
2. Replace every product/item/service name with: "${product}".
3. Replace every brand/store/company name with: "${brand}".
${linkInstruction}

Rules:
- Keep HTML tags inside values intact (e.g. <strong>, <br>).
- Do NOT translate class names, IDs, URLs, or [IMGn]/[LINKn] placeholders if they appear inside text.
- Return ONLY a valid JSON object with the same keys and translated values.`;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(textChunk) },
      ],
      temperature: 0.2,
      max_tokens: 16_384,
      response_format: { type: "json_object" },
    });

    let translatedMap: Record<string, string> = {};
    try {
      translatedMap = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    } catch {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    // Apply translations back — replace %%Tn%% with translated values
    let finalHtml = placeholderHtml;
    for (const [key, translated] of Object.entries(translatedMap)) {
      if (typeof translated === "string") {
        // Escape key for regex, then replace all occurrences
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        finalHtml = finalHtml.replace(new RegExp(`%%${escaped}%%`, "g"), translated);
      }
    }

    // Remove any unreplaced placeholders (entries beyond the 400 cap)
    finalHtml = finalHtml.replace(/%%T\d+%%/g, "");

    return NextResponse.json({ html: finalHtml });
  } catch (err) {
    return NextResponse.json({ error: `Erro na IA: ${err instanceof Error ? err.message : "erro"}` }, { status: 500 });
  }
}
