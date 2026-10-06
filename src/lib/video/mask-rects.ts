export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Converte a máscara pintada pelo usuário em retângulos agrupados.
 * O filtro `delogo` do ffmpeg só aceita retângulos, então componentes
 * conectados da pintura viram bounding boxes.
 */
export function maskToRects(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  cell = 4,
): Rect[] {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const grid = new Uint8Array(cols * rows);

  for (let y = 0; y < height; y++) {
    const gy = (y / cell) | 0;
    for (let x = 0; x < width; x++) {
      if (alpha[(y * width + x) * 4 + 3] > 16) grid[gy * cols + ((x / cell) | 0)] = 1;
    }
  }

  const seen = new Uint8Array(cols * rows);
  const rects: Rect[] = [];
  const stack: number[] = [];

  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || seen[i]) continue;
    seen[i] = 1;
    stack.push(i);
    let minC = cols,
      maxC = 0,
      minR = rows,
      maxR = 0;

    while (stack.length) {
      const idx = stack.pop()!;
      const c = idx % cols;
      const r = (idx / cols) | 0;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const n = nr * cols + nc;
          if (grid[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }

    rects.push({
      x: minC * cell,
      y: minR * cell,
      w: (maxC - minC + 1) * cell,
      h: (maxR - minR + 1) * cell,
    });
  }

  return mergeRects(rects);
}

function intersects(a: Rect, b: Rect, gap = 8): boolean {
  return (
    a.x - gap < b.x + b.w &&
    b.x - gap < a.x + a.w &&
    a.y - gap < b.y + b.h &&
    b.y - gap < a.y + a.h
  );
}

function mergeRects(input: Rect[]): Rect[] {
  const rects = [...input];
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (!intersects(rects[i], rects[j])) continue;
        const x = Math.min(rects[i].x, rects[j].x);
        const y = Math.min(rects[i].y, rects[j].y);
        const w = Math.max(rects[i].x + rects[i].w, rects[j].x + rects[j].w) - x;
        const h = Math.max(rects[i].y + rects[i].h, rects[j].y + rects[j].h) - y;
        rects.splice(j, 1);
        rects[i] = { x, y, w, h };
        merged = true;
        break outer;
      }
    }
  }
  return rects;
}

/**
 * Expande e limita os retângulos. O delogo exige uma borda de 1px válida ao
 * redor da área, senão aborta com "Logo area is outside of the frame".
 */
export function normalizeRects(
  rects: Rect[],
  padding: number,
  width: number,
  height: number,
): Rect[] {
  const out: Rect[] = [];
  for (const r of rects) {
    const x = Math.max(1, Math.round(r.x - padding));
    const y = Math.max(1, Math.round(r.y - padding));
    const right = Math.min(width - 2, Math.round(r.x + r.w + padding));
    const bottom = Math.min(height - 2, Math.round(r.y + r.h + padding));
    const w = right - x;
    const h = bottom - y;
    if (w >= 2 && h >= 2) out.push({ x, y, w, h });
  }
  return out;
}

/** Resolução de saída com o lado menor em 720px (sem upscale), par para o x264. */
export function targetSize(
  videoWidth: number,
  videoHeight: number,
  shortSide = 720,
): { w: number; h: number } {
  const current = Math.min(videoWidth, videoHeight);
  const scale = current > shortSide ? shortSide / current : 1;
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { w: even(videoWidth), h: even(videoHeight) };
}
