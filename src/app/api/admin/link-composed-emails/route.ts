import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { getOwnedAccountIds } from "@/lib/auth/owned-accounts";
import { matchOrCreateCustomer } from "@/lib/customer/identifier";

/**
 * Backfill pontual: vincula e-mails enviados pelo "Compor E-mail" que ficaram
 * sem cliente (customerId: null) ao cliente correto, criando-o se necessário.
 * Com isso, respostas antigas e futuras desses destinatários aparecem na
 * mesma conversa. Idempotente — pode ser executado mais de uma vez.
 */
async function runBackfill() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const ownedIds = new Set(await getOwnedAccountIds(db, session.uid));
  if (ownedIds.size === 0)
    return NextResponse.json({ linked: 0, message: "Nenhuma loja encontrada." });

  const snap = await db
    .collection("emails")
    .where("direction", "==", "outbound")
    .where("customerId", "==", null)
    .limit(500)
    .get();

  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!ownedIds.has(data.accountId)) {
      skipped++;
      continue;
    }

    // "from" guarda o destinatário nos e-mails compostos
    const recipient = (data.from as string | undefined)?.trim();
    if (!recipient || !recipient.includes("@")) {
      skipped++;
      continue;
    }

    try {
      const match = await matchOrCreateCustomer({
        fromEmail: recipient,
        fromName: (data.fromName as string) || "",
        bodyText: `${data.subject ?? ""}\n${data.aiResponse ?? ""}`,
        emailDocId: doc.id,
        accountId: data.accountId,
      });
      await doc.ref.update({ customerId: match.customerId });
      linked++;
    } catch (err) {
      errors.push(`${doc.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    found: snap.size,
    linked,
    skipped,
    ...(errors.length > 0 ? { errors } : {}),
    message:
      linked > 0
        ? `${linked} e-mail(s) vinculados às conversas dos clientes.`
        : "Nenhum e-mail pendente de vínculo.",
  });
}

// GET permite executar abrindo a URL no navegador (logado como dono)
export async function GET() {
  return runBackfill();
}

export async function POST() {
  return runBackfill();
}
