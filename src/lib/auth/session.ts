import { cookies } from "next/headers";
import { cache } from "react";
import { getAdminDb } from "@/lib/firebase/admin";
import { ALL_PERMISSIONS, Permission, sanitizePermissions } from "./permissions";
import { COOKIE_NAME, SessionClaims, verifySession } from "./jwt";

export {
  COOKIE_NAME,
  MAX_AGE,
  createSession,
  sessionCookieOptions,
  shouldRefreshSession,
  verifySession,
} from "./jwt";
export type { JwtSession, SessionClaims } from "./jwt";

export const MEMBER_INDEX_COLLECTION = "memberIndex";
export const MEMBERSHIPS_COLLECTION = "memberships";

export interface SessionPayload {
  /**
   * Identificador do workspace. Para o dono é o próprio uid; para um membro
   * de equipe é o uid do dono — todos os dados são lidos/escritos nesse escopo.
   */
  uid: string;
  email: string;
  /** uid real do usuário logado (difere de `uid` quando é membro de equipe). */
  actorUid: string;
  isOwner: boolean;
  permissions: Permission[];
  /** Lojas liberadas para o membro. `null` = todas as lojas do workspace. */
  allowedAccountIds: string[] | null;
  membershipId: string | null;
  exp?: number;
}

async function resolveContext(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const jwt = await verifySession(token);
  if (!jwt) return null;

  const db = getAdminDb();
  const indexSnap = await db
    .collection(MEMBER_INDEX_COLLECTION)
    .doc(jwt.uid)
    .get();

  if (!indexSnap.exists) {
    return {
      uid: jwt.uid,
      email: jwt.email,
      actorUid: jwt.uid,
      isOwner: true,
      permissions: ALL_PERMISSIONS,
      allowedAccountIds: null,
      membershipId: null,
      exp: jwt.exp,
    };
  }

  const membershipId = indexSnap.data()?.membershipId as string | undefined;
  if (!membershipId) return null;

  const memberSnap = await db
    .collection(MEMBERSHIPS_COLLECTION)
    .doc(membershipId)
    .get();
  const member = memberSnap.data();
  if (!memberSnap.exists || !member || member.status !== "active") return null;

  // Cookie emitido antes da última mudança de permissões: força novo login.
  if (Number(member.permVersion ?? 0) !== jwt.permVersion) return null;

  const accountIds: string[] = Array.isArray(member.accountIds)
    ? member.accountIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  return {
    uid: member.ownerId as string,
    email: jwt.email,
    actorUid: jwt.uid,
    isOwner: false,
    permissions: sanitizePermissions(member.permissions),
    allowedAccountIds: accountIds,
    membershipId,
    exp: jwt.exp,
  };
}

/**
 * Contexto de autenticação resolvido no Firestore (fonte da verdade).
 * O bloqueio por rota acontece no proxy, a partir do snapshot do cookie.
 */
export const getAuthContext = cache(
  async (): Promise<SessionPayload | null> => {
    try {
      return await resolveContext();
    } catch {
      return null;
    }
  },
);

export async function getSession(): Promise<SessionPayload | null> {
  return getAuthContext();
}

/** Contexto restrito ao dono do workspace. */
export async function getOwnerSession(): Promise<SessionPayload | null> {
  const ctx = await getAuthContext();
  return ctx?.isOwner ? ctx : null;
}

/**
 * Snapshot de acesso para gravar no cookie de sessão no login.
 * Lê direto do Firestore — não depende de cookie existente.
 */
export async function resolveSessionClaims(
  uid: string,
): Promise<SessionClaims> {
  const db = getAdminDb();
  const indexSnap = await db
    .collection(MEMBER_INDEX_COLLECTION)
    .doc(uid)
    .get();

  const membershipId = indexSnap.data()?.membershipId as string | undefined;
  if (!membershipId) {
    return {
      ownerId: uid,
      isOwner: true,
      permissions: ALL_PERMISSIONS,
      permVersion: 0,
    };
  }

  const memberSnap = await db
    .collection(MEMBERSHIPS_COLLECTION)
    .doc(membershipId)
    .get();
  const member = memberSnap.data();
  if (!member || member.status !== "active") {
    return { ownerId: uid, isOwner: false, permissions: [], permVersion: 0 };
  }

  return {
    ownerId: member.ownerId as string,
    isOwner: false,
    permissions: sanitizePermissions(member.permissions),
    permVersion: Number(member.permVersion ?? 0),
  };
}
