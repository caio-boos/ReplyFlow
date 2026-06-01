"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const ACCOUNT_VIEW_STORAGE_KEY = "replyflow.customers.viewAccount";

interface FirestoreTimestamp {
  seconds?: number;
  _seconds?: number;
}

function tsToDate(ts: FirestoreTimestamp | null | undefined): Date | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  if (secs == null) return null;
  return new Date(secs * 1000);
}

interface EmailEntry {
  id: string;
  subject: string;
  from: string;
  status: string;
  receivedAt: FirestoreTimestamp;
  accountId?: string;
  accountEmail?: string;
  bodyText?: string;
  aiResponse?: string;
}

interface AccountViewOption {
  id: string;
  label: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  emails: string[];
  orderNumbers: string[];
  suggestedLinks: Array<{ reason: string; incomingEmail: string; incomingEmailDocId: string }>;
  emails_list: EmailEntry[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhou",
  cancelled: "Cancelado",
  processing: "Processando",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  sent: "text-green-400",
  failed: "text-red-400",
  cancelled: "text-gray-500",
  processing: "text-blue-400",
};

function TranslatableText({ text }: { text: string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  async function translate() {
    if (translated) { setShowTranslated((v) => !v); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setTranslated(data.translated ?? "");
      setShowTranslated(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
        {showTranslated && translated ? translated : text}
      </pre>
      <button
        onClick={translate}
        disabled={loading}
        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
      >
        {loading ? "Traduzindo..." : showTranslated ? "Ver original" : "Traduzir para português"}
      </button>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [accountFilterReady, setAccountFilterReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const { emailsList, ...rest } = data;
        setCustomer({ ...rest, emails_list: emailsList ?? [] });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const accountOptions: AccountViewOption[] = customer
    ? Array.from(
        new Map(
          customer.emails_list
            .map((email) => {
              const id = email.accountId ?? email.accountEmail;
              if (!id) return null;
              return [id, { id, label: email.accountEmail ?? email.accountId ?? id }] as const;
            })
            .filter((entry): entry is readonly [string, AccountViewOption] => entry !== null)
        ).values()
      )
    : [];

  useEffect(() => {
    if (!customer) return;

    const availableAccountIds = new Set(
      customer.emails_list
        .map((email) => email.accountId ?? email.accountEmail)
        .filter((value): value is string => Boolean(value))
    );

    const saved = window.localStorage.getItem(ACCOUNT_VIEW_STORAGE_KEY);
    if (!saved || saved === "all") {
      setAccountFilter("all");
      setAccountFilterReady(true);
      return;
    }

    if (availableAccountIds.has(saved)) {
      setAccountFilter(saved);
      setAccountFilterReady(true);
      return;
    }

    window.localStorage.removeItem(ACCOUNT_VIEW_STORAGE_KEY);
    setAccountFilter("all");
    setAccountFilterReady(true);
  }, [customer]);

  useEffect(() => {
    if (!accountFilterReady) return;
    window.localStorage.setItem(ACCOUNT_VIEW_STORAGE_KEY, accountFilter);
  }, [accountFilter, accountFilterReady]);

  const visibleEmails = customer
    ? customer.emails_list.filter((email) => {
        if (accountFilter === "all") return true;
        return (email.accountId ?? email.accountEmail) === accountFilter;
      })
    : [];

  if (loading) return <div className="p-6 text-gray-400">Carregando...</div>;
  if (!customer) return <div className="p-6 text-red-400">Cliente não encontrado</div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-gray-400 hover:text-gray-100 text-sm">
          ← Clientes
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">{customer.name}</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h1 className="text-xl font-bold text-gray-100 mb-3">{customer.name || "(sem nome)"}</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">E-mails cadastrados</p>
            <div className="flex flex-col gap-1">
              {customer.emails.map((e) => (
                <span key={e} className="text-sm text-gray-300">{e}</span>
              ))}
            </div>
          </div>
          {customer.orderNumbers.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Pedidos mencionados</p>
              <div className="flex flex-wrap gap-1.5">
                {customer.orderNumbers.map((o) => (
                  <span key={o} className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                    #{o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {customer.suggestedLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-yellow-400 font-medium mb-2">
              Sugestões de clientes duplicados:
            </p>
            {customer.suggestedLinks.map((s, i) => (
              <div key={i} className="text-xs text-gray-400 bg-yellow-900/20 border border-yellow-900 rounded px-3 py-2 mb-1">
                {s.reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {accountOptions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Conta em visualizacao</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            <button
              onClick={() => setAccountFilter("all")}
              className={`text-left rounded-xl border p-3 transition-colors ${
                accountFilter === "all"
                  ? "border-indigo-600 bg-indigo-900/40"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
            >
              <p className="text-sm font-semibold text-gray-100">Todas as contas</p>
              <p className="text-xs text-gray-400 mt-1">Mostra todos os e-mails deste cliente</p>
            </button>

            {accountOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setAccountFilter(option.id)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  accountFilter === option.id
                    ? "border-indigo-600 bg-indigo-900/40"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <p className="text-sm font-semibold text-gray-100 truncate">{option.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation timeline */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4">
        Conversa ({visibleEmails.length} e-mail{visibleEmails.length !== 1 ? "s" : ""})
      </h2>

      {visibleEmails.length === 0 ? (
        <p className="text-gray-500">Nenhum e-mail encontrado</p>
      ) : (
        <div className="space-y-6">
          {visibleEmails.map((email) => (
            <div key={email.id} className="space-y-2">
              {/* Thread header */}
              <div className="flex items-center justify-between">
                <Link
                  href={`/emails/${email.id}`}
                  prefetch={false}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  {email.subject}
                </Link>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${STATUS_COLORS[email.status] ?? "text-gray-400"}`}>
                    {STATUS_LABEL[email.status] ?? email.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {tsToDate(email.receivedAt)?.toLocaleString("pt-BR") ?? "—"}
                  </span>
                </div>
              </div>

              {/* Customer message bubble */}
              {email.bodyText && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-medium">
                    {(customer.name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm p-4">
                    <p className="text-xs text-gray-400 mb-2">{email.from}</p>
                    <TranslatableText text={email.bodyText} />
                  </div>
                </div>
              )}

              {/* AI response bubble */}
              {email.aiResponse && (
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-[90%] bg-indigo-950 border border-indigo-800 rounded-xl rounded-tr-sm p-4">
                    <p className="text-xs text-indigo-400 mb-2">Resposta automática</p>
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {email.aiResponse}
                    </pre>
                  </div>
                  <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs text-white font-medium">
                    IA
                  </div>
                </div>
              )}

              {email !== visibleEmails[visibleEmails.length - 1] && (
                <div className="border-t border-gray-800/60 pt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
