import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ALL_PERMISSIONS,
  Permission,
  hasAccess,
  requiredAccessFor,
  sanitizePermissions,
} from "./permissions";
import { COOKIE_NAME, verifySession } from "./jwt";

export {
  COOKIE_NAME,
  MAX_AGE,
  createSession,
  sessionCookieOptions,
  shouldRefreshSession,
  verifySession,
} from "./jwt";
export type { JwtSession } from "./jwt";

/** Header injetado pelo proxy com o pathname real da requisição. */
export const PATHNAME_HEADER = "x-rf-pathname";

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
 * Contexto de autenticação sem verificação de permissão de rota.
 * Use em layouts, onde o redirecionamento é tratado manualmente.
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

/**
 * Contexto de autenticação já validado contra a permissão exigida pela rota
 * atual. Retorna `null` quando o usuário não tem acesso, fazendo as rotas de
 * API responderem 401 sem precisar de checagem extra em cada arquivo.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const ctx = await getAuthContext();
  if (!ctx || ctx.isOwner) return ctx;

  let pathname: string | null = null;
  try {
    pathname = (await headers()).get(PATHNAME_HEADER);
  } catch {
    pathname = null;
  }
  if (!pathname) return ctx;

  const requirement = requiredAccessFor(pathname);
  if (!hasAccess(requirement, ctx.isOwner, ctx.permissions)) return null;

  return ctx;
}

/** Contexto restrito ao dono do workspace. */
export async function getOwnerSession(): Promise<SessionPayload | null> {
  const ctx = await getAuthContext();
  return ctx?.isOwner ? ctx : null;
}
