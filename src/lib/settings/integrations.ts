import { getAdminDb } from "@/lib/firebase/admin";
import { decrypt, encrypt } from "@/lib/crypto/encryption";

const COLLECTION = "userSettings";

export async function getReplicateToken(userId: string): Promise<string | null> {
  const doc = await getAdminDb().collection(COLLECTION).doc(userId).get();
  const stored = doc.data()?.replicateToken;
  if (typeof stored !== "string" || !stored) {
    return process.env.REPLICATE_API_TOKEN || null;
  }
  try {
    return decrypt(stored);
  } catch {
    return process.env.REPLICATE_API_TOKEN || null;
  }
}

export async function setReplicateToken(
  userId: string,
  token: string | null,
  username?: string,
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTION)
    .doc(userId)
    .set(
      {
        replicateToken: token ? encrypt(token) : null,
        replicateUsername: token ? (username ?? null) : null,
      },
      { merge: true },
    );
}

export async function getReplicateStatus(
  userId: string,
): Promise<{ configured: boolean; username: string | null }> {
  const data = (await getAdminDb().collection(COLLECTION).doc(userId).get()).data();
  const stored = data?.replicateToken;
  return {
    configured: typeof stored === "string" && !!stored,
    username: typeof data?.replicateUsername === "string" ? data.replicateUsername : null,
  };
}

/** E-mail que recebe notificações quando um cliente acompanhado responde. */
export async function getNotificationEmail(userId: string): Promise<string | null> {
  const doc = await getAdminDb().collection(COLLECTION).doc(userId).get();
  const stored = doc.data()?.notificationEmail;
  return typeof stored === "string" && stored.trim() ? stored.trim() : null;
}

export async function setNotificationEmail(
  userId: string,
  email: string | null,
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTION)
    .doc(userId)
    .set({ notificationEmail: email?.trim() || null }, { merge: true });
}
