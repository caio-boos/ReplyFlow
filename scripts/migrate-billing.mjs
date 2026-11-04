#!/usr/bin/env node
/**
 * Migração dos membros existentes para o modelo de assinaturas.
 * NÃO altera nem apaga nada: apenas cria `billing/{uid}` para donos de workspace
 * que ainda não têm esse documento, com o período de transição (acesso completo).
 *
 * Por padrão roda em modo simulação (dry-run). Para gravar, use --apply.
 *
 *   pnpm billing:migrate              # relatório
 *   pnpm billing:migrate -- --apply   # grava
 *
 * Regras (as mesmas do app — src/lib/billing/store.ts):
 *  - Dono de workspace = usuário do Firebase Auth sem entrada em `memberIndex`.
 *  - Membros de equipe não são cobrados: herdam a assinatura do dono.
 *  - Contas criadas antes de BILLING_LAUNCH_AT recebem acesso completo até
 *    BILLING_LAUNCH_AT + BILLING_LEGACY_ACCESS_DAYS (padrão 30 dias).
 *  - Ao assinar, o teste gratuito termina em max(hoje + 30 dias, fim da transição).
 *  - Nenhuma cobrança retroativa.
 *
 * O app também faz essa criação sob demanda no primeiro acesso; este script
 * serve para antecipar, auditar e validar a migração antes de ativar a cobrança.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const DAY = 86_400;

const launchRaw = process.env.BILLING_LAUNCH_AT;
const launchAt = launchRaw ? Math.floor(Date.parse(launchRaw) / 1000) : NaN;
if (!Number.isFinite(launchAt)) {
  console.error("Defina BILLING_LAUNCH_AT (ex.: 2026-11-10T00:00:00Z).");
  process.exit(1);
}
const legacyDays = Number.parseInt(process.env.BILLING_LEGACY_ACCESS_DAYS ?? "30", 10) || 30;
const accessUntil = launchAt + legacyDays * DAY;
// Mesma separação do app: chaves de teste gravam em `billing_test`.
const LIVE = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
const COLLECTION = LIVE ? "billing" : "billing_test";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

const memberIndex = new Set((await db.collection("memberIndex").select().get()).docs.map((d) => d.id));

const stats = { users: 0, teamMembers: 0, alreadyMigrated: 0, legacy: 0, newAccounts: 0, written: 0 };
const preview = [];

let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  pageToken = page.pageToken;

  for (const user of page.users) {
    stats.users++;
    if (memberIndex.has(user.uid)) {
      stats.teamMembers++;
      continue;
    }

    const ref = db.collection(COLLECTION).doc(user.uid);
    const snap = await ref.get();
    if (snap.exists) {
      stats.alreadyMigrated++;
      continue;
    }

    const created = Math.floor(Date.parse(user.metadata.creationTime) / 1000);
    const isLegacy = Number.isFinite(created) && created < launchAt;
    if (!isLegacy) {
      // Conta nova: o app cria o documento no primeiro acesso, sem transição.
      stats.newAccounts++;
      continue;
    }

    stats.legacy++;
    const stores = (await db.collection("accounts").where("userId", "==", user.uid).count().get()).data().count;
    preview.push({
      uid: user.uid,
      email: user.email ?? "—",
      criadoEm: user.metadata.creationTime,
      lojas: stores,
      acessoAte: new Date(accessUntil * 1000).toISOString().slice(0, 10),
    });

    if (APPLY) {
      try {
        await ref.create({
          ownerUid: user.uid,
          email: user.email ?? null,
          legacy: { accessUntil, grantedAt: Math.floor(Date.now() / 1000) },
          trialUsed: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          migratedBy: "scripts/migrate-billing.mjs",
        });
        stats.written++;
      } catch (err) {
        // Já criado pelo app entre a leitura e a escrita — mantém o existente.
        if (err?.code !== 6) throw err;
        stats.alreadyMigrated++;
      }
    }
  }
} while (pageToken);

console.log(`\nMigração de assinaturas — ${APPLY ? "APLICANDO" : "SIMULAÇÃO (use --apply para gravar)"}`);
console.log(`Coleção: ${COLLECTION} (${LIVE ? "produção" : "teste"})`);
console.log(`Lançamento: ${new Date(launchAt * 1000).toISOString()} · transição até ${new Date(accessUntil * 1000).toISOString()}\n`);
if (preview.length) console.table(preview);
console.table([stats]);
console.log(
  "\nNada foi alterado em contas, lojas, membros ou permissões existentes; apenas documentos `billing/{uid}` novos.\n",
);
process.exit(0);
