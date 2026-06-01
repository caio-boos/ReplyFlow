"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-violet-600",
  "from-amber-500 to-orange-600",
];

function avatarGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  pending:    { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-400" },
  sent:       { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  failed:     { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     dot: "bg-red-400" },
  cancelled:  { bg: "bg-gray-500/10",    text: "text-gray-500",    border: "border-gray-500/20",    dot: "bg-gray-500" },
  processing: { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20",     dot: "bg-sky-400 animate-pulse" },
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

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-600">
      <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Carregando...
    </div>
  );
  if (!customer) return (
    <div className="p-6 text-red-400 text-sm">Cliente não encontrado</div>
  );

  const displayName = customer.name || "(sem nome)";
  const initials = getInitials(displayName);
  const gradient = avatarGradient(customer.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/customers" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Clientes
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 truncate max-w-xs">{displayName}</span>
      </nav>

      {/* Customer profile card */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="flex items-start gap-4 px-5 py-5">
          <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shrink-0 text-white text-base font-semibold`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-100">{displayName}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customer.emails.map((e) => (
                <span key={e} className="text-xs font-mono text-gray-400 bg-gray-800/60 border border-white/5 px-2 py-0.5 rounded-md">
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-semibold text-gray-100">{customer.emails_list.length}</p>
            <p className="text-xs text-gray-600 mt-0.5">e-mail{customer.emails_list.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Orders row */}
        {customer.orderNumbers.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 bg-black/10 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600 uppercase tracking-wider">Pedidos</span>
            {customer.orderNumbers.map((o) => (
              <span key={o} className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-mono">
                #{o}
              </span>
            ))}
          </div>
        )}

        {/* Suggested duplicates */}
        {customer.suggestedLinks.length > 0 && (
          <div className="px-5 py-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Possíveis clientes duplicados
              </p>
            </div>
            <div className="space-y-2">
              {customer.suggestedLinks.map((s, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5 text-xs text-amber-300/80">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 font-medium">{i + 1}</span>
                  {s.reason}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account filter */}
      {accountOptions.length > 0 && (
        <div className="bg-gray-900/50 border border-white/6 rounded-xl p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Visualizar por conta</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAccountFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                accountFilter === "all"
                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                  : "bg-gray-800/60 text-gray-500 border-white/6 hover:text-gray-300 hover:bg-gray-800"
              }`}
            >
              Todas as contas
            </button>
            {accountOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setAccountFilter(option.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all truncate max-w-50 ${
                  accountFilter === option.id
                    ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                    : "bg-gray-800/60 text-gray-500 border-white/6 hover:text-gray-300 hover:bg-gray-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-200">
            Conversa
          </h2>
          <span className="text-xs text-gray-600">
            {visibleEmails.length} e-mail{visibleEmails.length !== 1 ? "s" : ""}
          </span>
        </div>

        {visibleEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-white/6 rounded-2xl bg-gray-900/30 text-gray-600">
            <svg className="w-8 h-8 mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <p className="text-sm text-gray-500">Nenhum e-mail encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEmails.map((email) => {
              const sc = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.cancelled;
              return (
                <div key={email.id} className="bg-gray-900/50 border border-white/6 rounded-xl overflow-hidden">
                  {/* Email header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5">
                    <Link
                      href={`/emails/${email.id}`}
                      prefetch={false}
                      className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-2 truncate transition-colors"
                    >
                      {email.subject}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {STATUS_LABEL[email.status] ?? email.status}
                      </span>
                      <span className="text-xs text-gray-600">
                        {tsToDate(email.receivedAt)?.toLocaleString("pt-BR") ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Customer message */}
                    {email.bodyText && (
                      <div className="flex gap-3">
                        <div className={`shrink-0 w-7 h-7 rounded-lg bg-linear-to-br ${gradient} flex items-center justify-center text-xs text-white font-semibold`}>
                          {initials}
                        </div>
                        <div className="flex-1 bg-gray-800/60 border border-white/5 rounded-xl rounded-tl-sm p-4">
                          <p className="text-xs text-gray-500 mb-2 font-mono">{email.from}</p>
                          <TranslatableText text={email.bodyText} />
                        </div>
                      </div>
                    )}

                    {/* AI response */}
                    {email.aiResponse && (
                      <div className="flex gap-3 justify-end">
                        <div className="flex-1 max-w-[90%] bg-indigo-500/8 border border-indigo-500/15 rounded-xl rounded-tr-sm p-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                            <p className="text-xs text-indigo-400 font-medium">Resposta automática</p>
                          </div>
                          <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                            {email.aiResponse}
                          </pre>
                        </div>
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 font-semibold">
                          IA
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
