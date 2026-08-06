import { Firestore } from "firebase-admin/firestore";

export async function getOwnedAccountIds(db: Firestore, userId: string): Promise<string[]> {
  const snap = await db.collection("accounts").where("userId", "==", userId).get();
  return snap.docs.map((d) => d.id);
}
