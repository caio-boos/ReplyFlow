import { randomUUID } from "crypto";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

const SIGNED_URL_TTL_MS = 60 * 60 * 1000;

export type JobKind = "watermark" | "clone";

const COLLECTIONS: Record<JobKind, string> = {
  watermark: "watermarkJobs",
  clone: "videoCloneJobs",
};

const PREFIXES: Record<JobKind, string> = {
  watermark: "watermark-jobs",
  clone: "clone-jobs",
};

/**
 * Os cogs decidem como ler a entrada pela extensão do arquivo, e a Files API do
 * Replicate serve URLs terminadas em `/download`. Por isso os arquivos ficam
 * hospedados aqui, com uma URL assinada que termina na extensão certa.
 */
export async function uploadJobAsset(
  userId: string,
  kind: JobKind,
  file: Blob,
  extension: string,
  contentType: string,
): Promise<{ url: string; path: string }> {
  const path = `${PREFIXES[kind]}/${userId}/${randomUUID()}.${extension}`;
  const storageFile = getAdminStorage().file(path);

  await storageFile.save(Buffer.from(await file.arrayBuffer()), {
    contentType,
    resumable: false,
  });

  const [url] = await storageFile.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });

  return { url, path };
}

export function uploadSourceVideo(
  userId: string,
  kind: JobKind,
  file: Blob,
): Promise<{ url: string; path: string }> {
  return uploadJobAsset(userId, kind, file, "mp4", "video/mp4");
}

export interface VideoJob {
  userId: string;
  storagePaths: string[];
}

export async function recordJob(
  kind: JobKind,
  predictionId: string,
  userId: string,
  storagePaths: string[],
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS[kind])
    .doc(predictionId)
    .set({ userId, storagePaths, createdAt: Date.now() });
}

export async function getJob(
  kind: JobKind,
  predictionId: string,
): Promise<VideoJob | null> {
  const doc = await getAdminDb().collection(COLLECTIONS[kind]).doc(predictionId).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  // `storagePath` no singular é o formato dos jobs criados antes dos anexos múltiplos.
  const storagePaths: string[] = Array.isArray(data.storagePaths)
    ? data.storagePaths
    : typeof data.storagePath === "string" && data.storagePath
      ? [data.storagePath]
      : [];

  return { userId: data.userId, storagePaths };
}

export async function deleteJobAssets(storagePaths: string[]): Promise<void> {
  const bucket = getAdminStorage();
  await Promise.all(
    storagePaths.map((path) => bucket.file(path).delete({ ignoreNotFound: true })),
  );
}

/** Remove os arquivos de origem assim que o modelo termina de usá-los. */
export async function releaseJobAssets(
  kind: JobKind,
  predictionId: string,
  storagePaths: string[],
): Promise<void> {
  await deleteJobAssets(storagePaths);
  await getAdminDb()
    .collection(COLLECTIONS[kind])
    .doc(predictionId)
    .set({ storagePaths: [], storagePath: null }, { merge: true });
}
