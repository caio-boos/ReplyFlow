import { Firestore } from "firebase-admin/firestore";
import { getAuthContext } from "./session";

/**
 * Lojas do workspace visíveis para o usuário atual. Para o dono retorna todas
 * as lojas; para um membro de equipe apenas as lojas liberadas no convite.
 */
export async function getOwnedAccountIds(db: Firestore, userId: string): Promise<string[]> {
  const snap = await db.collection("accounts").where("userId", "==", userId).get();
  const ids = snap.docs.map((d) => d.id);

  const ctx = await getAuthContext();
  if (!ctx || ctx.isOwner || !ctx.allowedAccountIds) return ids;

  const allowed = new Set(ctx.allowedAccountIds);
  return ids.filter((id) => allowed.has(id));
}
