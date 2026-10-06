const MAX_EDGE = 1024;
const QUALITY = 0.82;

/**
 * Reduz e reencoda a imagem de referência em JPEG. O corpo da requisição na
 * Vercel é de ~4,5MB e precisa caber o vídeo comprimido junto.
 */
export async function prepareReferenceImage(
  file: File,
  index: number,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("Não foi possível preparar a imagem de referência.");

  return new File([blob], `ref-${index}.jpg`, { type: "image/jpeg" });
}
