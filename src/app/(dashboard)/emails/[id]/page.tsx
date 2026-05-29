"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FirestoreTimestamp {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
}

function tsToDate(ts: FirestoreTimestamp | null | undefined): Date | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  if (secs == null) return null;
  return new Date(secs * 1000);
}

interface EmailDetail {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  bodyText: string;
  aiResponse: string | null;
  status: string;
  receivedAt: FirestoreTimestamp;
  scheduledReplyAt: FirestoreTimestamp;
  sentAt: FirestoreTimestamp | null;
  error: string | null;
  accountEmail: string;
  customerId: string;
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/emails/${id}`)
      .then((r) => r.json())
      .then((data) => setEmail(data))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    await fetch(`/api/emails/${id}/cancel`, { method: "POST" });
    router.refresh();
    const updated = await fetch(`/api/emails/${id}`).then((r) => r.json());
    setEmail(updated);
    setCancelling(false);
  }

  if (loading) {
    return <div className="p-6 text-gray-400">Carregando...</div>;
  }
  if (!email) {
    return <div className="p-6 text-red-400">E-mail não encontrado</div>;
  }

  const receivedDate = tsToDate(email.receivedAt)?.toLocaleString("pt-BR") ?? "—";
  const scheduledDate = tsToDate(email.scheduledReplyAt)?.toLocaleString("pt-BR") ?? "—";

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-100 text-sm">
          ← Dashboard
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm truncate">{email.subject}</span>
      </div>

      {/* Email header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-100 mb-2">{email.subject}</h1>
            <p className="text-gray-300 text-sm">
              <span className="text-gray-400">De: </span>
              {email.fromName ? `${email.fromName} ` : ""}
              <span className="text-gray-400">&lt;{email.from}&gt;</span>
            </p>
            <p className="text-gray-400 text-xs mt-1">Recebido: {receivedDate}</p>
            <p className="text-gray-400 text-xs">Conta: {email.accountEmail}</p>
            {email.customerId && (
              <Link
                href={`/customers/${email.customerId}`}
                className="text-indigo-400 text-xs hover:underline mt-1 inline-block"
              >
                Ver perfil do cliente →
              </Link>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                email.status === "sent"
                  ? "bg-green-900 text-green-300 border-green-700"
                  : email.status === "failed"
                    ? "bg-red-900 text-red-300 border-red-700"
                    : email.status === "pending"
                      ? "bg-yellow-900 text-yellow-300 border-yellow-700"
                      : "bg-gray-800 text-gray-400 border-gray-700"
              }`}
            >
              {email.status === "sent" ? "Enviado" : email.status === "failed" ? "Falhou" : email.status === "pending" ? "Pendente" : "Cancelado"}
            </span>

            {email.status === "pending" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-300 text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Cancelar envio"}
              </button>
            )}
          </div>
        </div>

        {email.status === "pending" && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-yellow-400">
            Resposta automática agendada para: {scheduledDate}
          </div>
        )}
        {email.sentAt && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-green-400">
            Resposta enviada em: {tsToDate(email.sentAt)?.toLocaleString("pt-BR") ?? "—"}
          </div>
        )}
        {email.error && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-red-400">
            Erro: {email.error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Original email */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            E-mail do cliente
          </h2>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {email.bodyText}
          </pre>
        </div>

        {/* AI response */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Resposta gerada pela IA
          </h2>
          {email.aiResponse ? (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {email.aiResponse}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">
              {email.status === "pending"
                ? "A resposta será gerada automaticamente antes do envio."
                : "Nenhuma resposta gerada."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
