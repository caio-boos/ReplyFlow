import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getBillingConfig } from "@/lib/billing/config";
import { getStripe } from "@/lib/billing/stripe";
import { stripeEventsCollection } from "@/lib/billing/store";
import { customerIdFromObject, syncCustomer } from "@/lib/billing/sync";

export const dynamic = "force-dynamic";

/** Eventos que alteram o estado da assinatura/pagamento do workspace. */
const HANDLED = new Set<string>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.updated",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.marked_uncollectible",
  "invoice.voided",
  "payment_method.attached",
  "payment_method.detached",
  "payment_method.updated",
  "payment_method.automatically_updated",
]);

// Um processamento travado (instância encerrada no meio) pode ser retomado.
const STALE_LOCK_MS = 5 * 60 * 1000;

type Claim = "process" | "duplicate" | "in_progress";

async function claimEvent(event: Stripe.Event): Promise<Claim> {
  const db = getAdminDb();
  const ref = db.collection(stripeEventsCollection()).doc(event.id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (data?.status === "processed") return "duplicate";
    if (
      data?.status === "processing" &&
      Date.now() - Number(data.lockedAt ?? 0) < STALE_LOCK_MS
    ) {
      return "in_progress";
    }
    tx.set(
      ref,
      {
        type: event.type,
        livemode: event.livemode,
        created: event.created,
        status: "processing",
        lockedAt: Date.now(),
        attempts: FieldValue.increment(1),
        receivedAt: data?.receivedAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return "process";
  });
}

async function handleEvent(event: Stripe.Event): Promise<string | null> {
  const object = event.data.object as unknown;
  let customerId = customerIdFromObject(object);
  let hintOwnerUid: string | null = null;

  if (event.type.startsWith("checkout.session.")) {
    const session = object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return null;
    hintOwnerUid = session.client_reference_id ?? session.metadata?.ownerUid ?? null;
    customerId =
      typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  }

  if (!customerId) return null;
  const result = await syncCustomer(customerId, hintOwnerUid);
  return result?.ownerUid ?? null;
}

export async function POST(req: NextRequest) {
  const cfg = getBillingConfig();
  if (!cfg.secretKey || !cfg.webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Corpo bruto: qualquer reserialização invalida a assinatura.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, cfg.webhookSecret);
  } catch (err) {
    console.warn("[stripe-webhook] invalid signature", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Evento do ambiente errado (ex.: teste chegando na produção) — nunca aplica.
  if (event.livemode !== cfg.livemode) {
    return NextResponse.json({ received: true, ignored: "livemode_mismatch" });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: "unhandled_type" });
  }

  const claim = await claimEvent(event);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claim === "in_progress") {
    // 409 faz a Stripe tentar de novo depois, caso o processamento atual falhe.
    return NextResponse.json({ received: true, inProgress: true }, { status: 409 });
  }

  const ref = getAdminDb().collection(stripeEventsCollection()).doc(event.id);
  try {
    const ownerUid = await handleEvent(event);
    await ref.set(
      {
        status: "processed",
        ownerUid,
        processedAt: FieldValue.serverTimestamp(),
        error: null,
      },
      { merge: true },
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe-webhook] failed ${event.type} ${event.id}`, err);
    await ref
      .set(
        { status: "failed", error: String((err as Error).message ?? err).slice(0, 500) },
        { merge: true },
      )
      .catch(() => undefined);
    // 500 → a Stripe reenvia com backoff; a sincronização é idempotente.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
