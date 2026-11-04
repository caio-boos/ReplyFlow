import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getBillingConfig, getEntitlementPolicy } from "./config";
import {
  isAdminUid,
  resolveEntitlement,
  type BillingRecord,
  type Entitlement,
} from "./entitlements";

/**
 * Dados de teste e de produção ficam em coleções separadas: uma assinatura
 * feita com chave sk_test_ nunca libera acesso em produção (e vice-versa),
 * mesmo usando o mesmo projeto Firebase.
 */
function modeSuffix(): string {
  return getBillingConfig().livemode ? "" : "_test";
}
export const billingCollection = () => `billing${modeSuffix()}`;
export const stripeEventsCollection = () => `stripeEvents${modeSuffix()}`;
export const billingFeedbackCollection = () => `billingFeedback${modeSuffix()}`;

const DAY = 86_400;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function billingRef(ownerUid: string) {
  return getAdminDb().collection(billingCollection()).doc(ownerUid);
}

function stripServerFields(data: FirebaseFirestore.DocumentData): BillingRecord {
  const rest = { ...data };
  delete rest.updatedAt;
  delete rest.createdAt;
  delete rest.migratedBy;
  return rest as BillingRecord;
}

/**
 * Membros existentes (contas criadas antes de BILLING_LAUNCH_AT) recebem um
 * período de transição com acesso completo. Nada é removido nem alterado:
 * apenas cria-se o documento `billing/{uid}` na primeira leitura.
 */
async function legacyGrantFor(ownerUid: string): Promise<BillingRecord["legacy"]> {
  const cfg = getBillingConfig();
  if (!cfg.launchAt) return null;
  try {
    const user = await getAdminAuth().getUser(ownerUid);
    const created = Math.floor(Date.parse(user.metadata.creationTime) / 1000);
    if (!Number.isFinite(created) || created >= cfg.launchAt) return null;
    return {
      accessUntil: cfg.launchAt + cfg.legacyAccessDays * DAY,
      grantedAt: nowSeconds(),
    };
  } catch (err) {
    console.error(`[billing] legacy lookup failed for ${ownerUid}`, err);
    return null;
  }
}

export async function getBillingRecord(ownerUid: string): Promise<BillingRecord> {
  const ref = billingRef(ownerUid);
  const snap = await ref.get();
  if (snap.exists) return stripServerFields(snap.data()!);

  if (!getBillingConfig().enabled) return { ownerUid };

  const record: BillingRecord = {
    ownerUid,
    legacy: await legacyGrantFor(ownerUid),
    trialUsed: false,
  };
  try {
    await ref.create({
      ...record,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return record;
  } catch {
    // Criado em paralelo por outra requisição — usa o que já existe.
    const again = await ref.get();
    return again.exists ? stripServerFields(again.data()!) : record;
  }
}

export async function updateBillingRecord(
  ownerUid: string,
  patch: Partial<BillingRecord>,
): Promise<void> {
  await billingRef(ownerUid).set(
    { ...patch, ownerUid, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  invalidateEntitlement(ownerUid);
}

// Só acessos completos ficam em cache: quem acabou de pagar nunca fica preso
// num bloqueio antigo, e revogações propagam em poucos segundos.
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { ent: Entitlement; at: number }>();

export function invalidateEntitlement(ownerUid: string): void {
  cache.delete(ownerUid);
}

export async function getEntitlement(
  ownerUid: string,
  opts: { fresh?: boolean } = {},
): Promise<Entitlement> {
  const policy = getEntitlementPolicy();
  if (!policy.enabled) return resolveEntitlement(null, policy);
  // Sem leitura no Firestore: administradores nunca dependem do estado de cobrança.
  if (isAdminUid(policy, ownerUid)) return resolveEntitlement({ ownerUid }, policy);

  if (!opts.fresh) {
    const hit = cache.get(ownerUid);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.ent;
  }

  const record = await getBillingRecord(ownerUid);
  const ent = resolveEntitlement(record, policy);
  if (ent.mode === "full") cache.set(ownerUid, { ent, at: Date.now() });
  else cache.delete(ownerUid);
  return ent;
}

export async function getBillingState(ownerUid: string): Promise<{
  record: BillingRecord;
  entitlement: Entitlement;
}> {
  const policy = getEntitlementPolicy();
  if (!policy.enabled) {
    return { record: { ownerUid }, entitlement: resolveEntitlement(null, policy) };
  }
  const record = await getBillingRecord(ownerUid);
  return { record, entitlement: resolveEntitlement(record, policy) };
}

/** Memoização por execução de cron — uma leitura por workspace. */
export function entitlementMemo() {
  const memo = new Map<string, Promise<Entitlement>>();
  return (ownerUid: string | null | undefined): Promise<Entitlement | null> => {
    if (!ownerUid) return Promise.resolve(null);
    let pending = memo.get(ownerUid);
    if (!pending) {
      pending = getEntitlement(ownerUid, { fresh: true }).catch((err) => {
        console.error(`[billing] entitlement failed for ${ownerUid}`, err);
        // Falha de infraestrutura não deve derrubar o atendimento de quem paga.
        return resolveEntitlement(null, { ...getEntitlementPolicy(), enabled: false });
      });
      memo.set(ownerUid, pending);
    }
    return pending;
  };
}

function usageMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function incrementAiReplyUsage(ownerUid: string): Promise<void> {
  try {
    await billingRef(ownerUid)
      .collection("usage")
      .doc(usageMonthKey())
      .set(
        { aiReplies: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
  } catch (err) {
    console.error(`[billing] usage increment failed for ${ownerUid}`, err);
  }
}

export async function getMonthlyUsage(ownerUid: string): Promise<{ aiReplies: number }> {
  const snap = await billingRef(ownerUid).collection("usage").doc(usageMonthKey()).get();
  return { aiReplies: Number(snap.data()?.aiReplies ?? 0) };
}
