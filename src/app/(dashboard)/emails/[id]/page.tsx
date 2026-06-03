"use client";

import { useEffect, useState, useCallback } from "react";
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
  attachments?: Array<{ filename: string; contentType: string; url: string }>;
}

interface Attachment {
  filename: string;
  contentType: string;
  url: string;
}

function ImageCarousel({ attachments }: { attachments: Attachment[] }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + attachments.length) % attachments.length),
    [attachments.length],
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % attachments.length),
    [attachments.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  const att = attachments[current];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 uppercase tracking-wider">
          Imagens anexadas
        </p>
        <p className="text-xs text-gray-600">
          {current + 1} / {attachments.length}
        </p>
      </div>

      {/* Carousel */}
      <div className="relative rounded-lg overflow-hidden border border-white/6 bg-black/20 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt={att.filename}
          className="w-full max-h-64 object-contain cursor-zoom-in"
          onClick={() => setLightbox(true)}
        />

        {attachments.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-opacity opacity-0 group-hover:opacity-100"
              aria-label="Anterior"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-opacity opacity-0 group-hover:opacity-100"
              aria-label="Próxima"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {attachments.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === current ? "bg-white" : "bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-2 right-2 p-1 rounded bg-black/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
            />
          </svg>
        </div>
      </div>

      <p className="text-xs text-gray-600 truncate">{att.filename}</p>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightbox(false)}
            aria-label="Fechar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {attachments.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Anterior"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Próxima"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={att.url}
            alt={att.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xs text-gray-400">{att.filename}</p>
            {attachments.length > 1 && (
              <p className="text-xs text-gray-600 mt-0.5">
                {current + 1} / {attachments.length} · ← → para navegar · Esc
                para fechar
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface HistoryEmail {
  id: string;
  subject: string;
  status: string;
  receivedAt: FirestoreTimestamp;
  from: string;
  fromName?: string;
  bodyText?: string;
  aiResponse?: string | null;
}

function extractNewText(bodyText: string): string {
  const lines = bodyText.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith(">")) break;
    result.push(line);
  }
  const newText = result.join("\n").trim();
  return newText || bodyText.trim();
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  pending: {
    label: "Pendente",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  sent: {
    label: "Enviado",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  failed: {
    label: "Falhou",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-gray-500/10",
    text: "text-gray-500",
    border: "border-gray-500/20",
    dot: "bg-gray-500",
  },
  processing: {
    label: "Processando",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    dot: "bg-sky-400 animate-pulse",
  },
};

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEmail[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [historyTranslations, setHistoryTranslations] = useState<Record<string, string>>({});
  const [historyTranslating, setHistoryTranslating] = useState<Record<string, boolean>>({});
  const [historyShowTranslation, setHistoryShowTranslation] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [manualSending, setManualSending] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  async function handleSend(resend = false) {
    const confirmed = window.confirm(
      resend
        ? "Tem certeza que deseja REENVIAR este e-mail? O cliente receberá a resposta novamente."
        : "Tem certeza que deseja enviar este e-mail agora?",
    );
    if (!confirmed) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/emails/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      const updated = await fetch(`/api/emails/${id}`).then((r) => r.json());
      setEmail(updated);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleTranslate() {
    if (translated) {
      setShowTranslation((v) => !v);
      return;
    }
    if (!email) return;
    setTranslating(true);
    const textToTranslate = extractNewText(email.bodyText);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToTranslate }),
      });
      const data = await res.json();
      if (res.ok && data.translated) {
        setTranslated(data.translated);
        setShowTranslation(true);
      }
    } finally {
      setTranslating(false);
    }
  }

  async function loadHistory() {
    if (!email?.customerId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/customers/${email.customerId}`);
      const data = await res.json();
      setHistory(data.emailsList ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleHistoryTranslate(itemId: string, text: string) {
    if (historyTranslations[itemId]) {
      setHistoryShowTranslation((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
      return;
    }
    setHistoryTranslating((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.translated) {
        setHistoryTranslations((prev) => ({ ...prev, [itemId]: data.translated }));
        setHistoryShowTranslation((prev) => ({ ...prev, [itemId]: true }));
      }
    } finally {
      setHistoryTranslating((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  function toggleHistory() {
    setShowHistory((prev) => {
      if (!prev && history === null) loadHistory();
      return !prev;
    });
  }

  async function handleGenerateSummary() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/emails/${id}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar resumo");
      setSummary(data.summary);
      setShowSummary(true);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Erro ao gerar resumo");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleEnhance() {
    if (!draft.trim()) return;
    setEnhancing(true);
    setManualError(null);
    try {
      const res = await fetch(`/api/emails/${id}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aperfeiçoar");
      setDraft(data.enhanced);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Erro ao aperfeiçoar");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleManualSend() {
    if (!draft.trim()) return;
    const confirmed = window.confirm("Tem certeza que deseja enviar esta resposta?");
    if (!confirmed) return;
    setManualSending(true);
    setManualError(null);
    setManualSuccess(false);
    try {
      const res = await fetch(`/api/emails/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualReply: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      setManualSuccess(true);
      setDraft("");
      const updated = await fetch(`/api/emails/${id}`).then((r) => r.json());
      setEmail(updated);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setManualSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-600">
        <svg
          className="w-5 h-5 animate-spin mr-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Carregando...
      </div>
    );
  }
  if (!email) {
    return (
      <div className="p-6 text-red-400 text-sm">E-mail não encontrado</div>
    );
  }

  const sc = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.cancelled;
  const receivedDate =
    tsToDate(email.receivedAt)?.toLocaleString("pt-BR") ?? "—";
  const scheduledDate =
    tsToDate(email.scheduledReplyAt)?.toLocaleString("pt-BR") ?? "—";
  const canResend =
    email.status === "sent" ||
    email.status === "failed" ||
    email.status === "cancelled";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Dashboard
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 truncate max-w-xs">{email.subject}</span>
      </nav>

      {/* Header card */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: subject + metadata */}
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-lg font-semibold text-gray-100 leading-snug">
                {email.subject}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">{receivedDate}</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">
                  <span className="text-gray-600">De: </span>
                  {email.fromName ? (
                    <span className="text-gray-300">{email.fromName} </span>
                  ) : null}
                  <span className="font-mono text-gray-500">
                    &lt;{email.from}&gt;
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Conta:{" "}
                  <span className="text-gray-500 font-mono">
                    {email.accountEmail}
                  </span>
                </p>
                {email.customerId && (
                  <Link
                    href={`/customers/${email.customerId}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Ver perfil do cliente
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {email.status === "pending" && (
                <>
                  <button
                    onClick={() => handleSend(false)}
                    disabled={sending}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
                  >
                    {sending ? (
                      <svg
                        className="w-3 h-3 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    )}
                    {sending ? "Enviando..." : "Enviar agora"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling || sending}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors"
                  >
                    {cancelling ? (
                      <svg
                        className="w-3 h-3 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    {cancelling ? "Cancelando..." : "Cancelar envio"}
                  </button>
                </>
              )}
              {canResend && (
                <button
                  onClick={() => handleSend(true)}
                  disabled={sending}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-400 transition-colors"
                >
                  {sending ? (
                    <svg
                      className="w-3 h-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  )}
                  {sending ? "Reenviando..." : "Reenviar"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status footer banners */}
        {(email.status === "pending" ||
          email.sentAt ||
          email.error ||
          sendError) && (
          <div className="border-t border-white/5">
            {email.status === "pending" && (
              <div className="flex items-center gap-2 px-5 py-3 bg-amber-500/5 text-xs text-amber-400">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resposta automática agendada para{" "}
                <span className="font-medium">{scheduledDate}</span>
              </div>
            )}
            {email.sentAt && (
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/5 text-xs text-emerald-400">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resposta enviada em{" "}
                <span className="font-medium">
                  {tsToDate(email.sentAt)?.toLocaleString("pt-BR") ?? "—"}
                </span>
              </div>
            )}
            {email.error && (
              <div className="flex items-center gap-2 px-5 py-3 bg-red-500/5 text-xs text-red-400">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                {email.error}
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 px-5 py-3 bg-red-500/5 text-xs text-red-400">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                Erro ao enviar: {sendError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message + AI response side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Customer message */}
        <div className="bg-gray-900/50 border border-white/6 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/10">
            <svg
              className="w-3.5 h-3.5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              E-mail do cliente
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleTranslate}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 disabled:opacity-50 transition-colors"
              >
                {translating ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                )}
                {translating
                  ? "Traduzindo..."
                  : translated && showTranslation
                  ? "Ocultar tradução"
                  : translated
                  ? "Mostrar tradução"
                  : "Traduzir"}
              </button>
              {!!email.attachments?.length && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                    />
                  </svg>
                  {email.attachments.length} imagem
                  {email.attachments.length !== 1 ? "ns" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-4">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed" suppressHydrationWarning>
              {email.bodyText}
            </pre>
            {showTranslation && translated && (
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <p className="text-xs text-blue-400/70 uppercase tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Tradução automática
                </p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {translated}
                </p>
              </div>
            )}
            {!!email.attachments?.length && (
              <ImageCarousel attachments={email.attachments} />
            )}
          </div>
        </div>

        {/* AI response */}
        <div className="bg-gray-900/50 border border-white/6 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-indigo-500/5">
            <svg
              className="w-3.5 h-3.5 text-indigo-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Resposta gerada pela IA
            </h2>
          </div>
          <div className="p-4">
            {email.aiResponse ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed" suppressHydrationWarning>
                {email.aiResponse}
              </pre>
            ) : (
              <p className="text-sm text-gray-600 italic">
                {email.status === "pending"
                  ? "A resposta será gerada automaticamente antes do envio."
                  : "Nenhuma resposta gerada."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer history */}
      {email.customerId && (
        <div className="bg-gray-900/50 border border-white/6 rounded-xl overflow-hidden">
          <button
            onClick={toggleHistory}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Histórico do cliente
              </h2>
              {history && (
                <span className="text-xs text-gray-600">
                  ({history.length} mensagem{history.length !== 1 ? "s" : ""})
                </span>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${showHistory ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showHistory && (
            <div className="border-t border-white/5">
              {historyLoading ? (
                <div className="flex items-center gap-2 px-4 py-8 text-gray-600 text-sm justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Carregando histórico...
                </div>
              ) : history?.length ? (
                <div className="px-4 py-4 space-y-6 max-h-150 overflow-y-auto">
                  {[...history]
                    .sort((a, b) => {
                      const aS = (a.receivedAt?.seconds ?? a.receivedAt?._seconds) ?? 0;
                      const bS = (b.receivedAt?.seconds ?? b.receivedAt?._seconds) ?? 0;
                      return aS - bS;
                    })
                    .map((item) => {
                      const isCurrent = item.id === id;
                      const sc2 = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.cancelled;
                      const date = tsToDate(item.receivedAt)?.toLocaleString("pt-BR") ?? "—";
                      const displayName = item.fromName || item.from;
                      const initial = displayName.charAt(0).toUpperCase();
                      const customerText = item.bodyText ? extractNewText(item.bodyText) : null;

                      return (
                        <div
                          key={item.id}
                          className={`space-y-3 ${
                            isCurrent
                              ? "rounded-xl p-3 -mx-1 ring-1 ring-indigo-500/30 bg-indigo-500/4"
                              : ""
                          }`}
                        >
                          {/* date + subject + link */}
                          <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-xs text-gray-600">{date}</span>
                            {isCurrent && (
                              <span className="text-xs text-indigo-400 font-medium">atual</span>
                            )}
                            <Link
                              href={`/emails/${item.id}`}
                              className="text-xs text-gray-600 hover:text-indigo-400 transition-colors"
                              title={item.subject}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </Link>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>

                          {/* Customer bubble — LEFT */}
                          {customerText && (
                            <div className="flex items-end gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300 shrink-0">
                                {initial}
                              </div>
                              <div className="max-w-[82%] space-y-1">
                                <p className="text-xs text-gray-600 pl-1">{displayName}</p>
                                <div className="bg-gray-800/80 border border-white/5 rounded-xl rounded-bl-sm px-3 py-2.5">
                                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {customerText}
                                  </p>
                                  {historyShowTranslation[item.id] && historyTranslations[item.id] && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                      <p className="text-xs text-blue-400/70 mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                        Tradução
                                      </p>
                                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {historyTranslations[item.id]}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleHistoryTranslate(item.id, customerText)}
                                  disabled={historyTranslating[item.id]}
                                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-400 disabled:opacity-50 transition-colors pl-1"
                                >
                                  {historyTranslating[item.id] ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                  )}
                                  {historyTranslating[item.id]
                                    ? "Traduzindo..."
                                    : historyTranslations[item.id] && historyShowTranslation[item.id]
                                    ? "Ocultar tradução"
                                    : historyTranslations[item.id]
                                    ? "Mostrar tradução"
                                    : "Traduzir"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* AI response bubble — RIGHT */}
                          {item.aiResponse ? (
                            <div className="flex items-end gap-2 justify-end">
                              <div className="max-w-[82%] space-y-1 flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs px-1.5 py-0.5 rounded border ${sc2.bg} ${sc2.text} ${sc2.border}`}>
                                    {sc2.label}
                                  </span>
                                  <p className="text-xs text-gray-600 pr-1">IA</p>
                                </div>
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl rounded-br-sm px-3 py-2.5">
                                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {item.aiResponse}
                                  </p>
                                </div>
                              </div>
                              <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end pr-9">
                              <span className={`text-xs px-2 py-0.5 rounded border ${sc2.bg} ${sc2.text} ${sc2.border}`}>
                                {sc2.label}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-gray-600 text-center">
                  Nenhum histórico encontrado.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer summary */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Resumo do cliente
            </h2>
          </div>
          <button
            onClick={() => {
              if (!summary) {
                handleGenerateSummary();
              } else {
                setShowSummary((v) => !v);
              }
            }}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-300 transition-colors"
          >
            {summaryLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            )}
            {summaryLoading
              ? "Gerando..."
              : summary && showSummary
              ? "Ocultar"
              : summary
              ? "Mostrar"
              : "Gerar resumo com IA"}
          </button>
        </div>

        {summaryError && (
          <div className="px-4 pb-4">
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {summaryError}
            </p>
          </div>
        )}

        {showSummary && summary && (
          <div className="border-t border-white/5 px-4 py-4">
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              {summary.split(/\n(?=\*\*)/).map((block, i) => {
                const titleMatch = block.match(/^\*\*(.+?)\*\*/);
                if (titleMatch) {
                  const title = titleMatch[1];
                  const body = block.replace(/^\*\*.+?\*\*\n?/, "").trim();
                  return (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {title}
                      </p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{body}</p>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-sm text-gray-300 whitespace-pre-wrap">
                    {block.trim()}
                  </p>
                );
              })}
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="mt-4 flex items-center gap-1 text-xs text-gray-600 hover:text-amber-400 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Regenerar
            </button>
          </div>
        )}
      </div>

      {/* Manual reply compose */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/10">
          <svg
            className="w-3.5 h-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Responder manualmente
          </h2>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setManualSuccess(false);
              setManualError(null);
            }}
            placeholder="Escreva sua resposta aqui... A IA pode aperfeiçoar seu rascunho mantendo seu raciocínio."
            rows={6}
            className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors leading-relaxed"
          />

          {manualError && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {manualError}
            </p>
          )}
          {manualSuccess && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resposta enviada com sucesso!
            </p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleEnhance}
              disabled={enhancing || !draft.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 border border-violet-500/20 rounded-lg text-xs font-medium text-violet-300 transition-colors"
            >
              {enhancing ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
              {enhancing ? "Aperfeiçoando..." : "Aperfeiçoar com IA"}
            </button>

            <button
              onClick={handleManualSend}
              disabled={manualSending || !draft.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
            >
              {manualSending ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
              {manualSending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
