// Copia os assets do ffmpeg.wasm (build ESM) para public/ffmpeg para serem
// servidos na mesma origem — evita que o bundler processe o worker/core.
// Apenas .js/.wasm: os .d.ts do pacote usam `no-default-lib` e quebrariam o
// type-check do projeto se ficassem dentro de public/.
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "public/ffmpeg");

const sources = [
  ["node_modules/@ffmpeg/ffmpeg/dist/esm", "worker"],
  ["node_modules/@ffmpeg/core/dist/esm", "core"],
];

const allowed = new Set([".js", ".mjs", ".wasm"]);

try {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const [from, to] of sources) {
    await cp(resolve(root, from), resolve(target, to), {
      recursive: true,
      filter: (src) => !extname(src) || allowed.has(extname(src)),
    });
  }
  console.log("[ffmpeg] assets copiados para public/ffmpeg");
} catch (err) {
  console.warn("[ffmpeg] falha ao copiar assets:", err.message);
}
