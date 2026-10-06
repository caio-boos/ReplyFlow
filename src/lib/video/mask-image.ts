/**
 * Converte a máscara pintada em PNG preto e branco (branco = área a remover),
 * formato esperado pelo ProPainter. A dilatação é feita desenhando a máscara
 * deslocada em várias direções.
 */
export function maskToPngBlob(
  source: HTMLCanvasElement,
  dilation: number,
): Promise<Blob> {
  const { width, height } = source;
  const ctx = source.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  const painted = ctx.getImageData(0, 0, width, height);
  const binary = new ImageData(width, height);
  let hasMask = false;
  for (let i = 0; i < painted.data.length; i += 4) {
    const on = painted.data[i + 3] > 16;
    if (on) hasMask = true;
    const value = on ? 255 : 0;
    binary.data[i] = value;
    binary.data[i + 1] = value;
    binary.data[i + 2] = value;
    binary.data[i + 3] = 255;
  }
  if (!hasMask) throw new Error("Pinte sobre a marca d'água antes de processar.");

  const stamp = document.createElement("canvas");
  stamp.width = width;
  stamp.height = height;
  stamp.getContext("2d")!.putImageData(binary, 0, 0);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d")!;
  outCtx.fillStyle = "#000";
  outCtx.fillRect(0, 0, width, height);
  outCtx.globalCompositeOperation = "lighter";

  outCtx.drawImage(stamp, 0, 0);
  const radius = Math.max(0, Math.round(dilation));
  if (radius > 0) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      outCtx.drawImage(
        stamp,
        Math.round(Math.cos(angle) * radius),
        Math.round(Math.sin(angle) * radius),
      );
    }
  }

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a máscara."))),
      "image/png",
    );
  });
}
