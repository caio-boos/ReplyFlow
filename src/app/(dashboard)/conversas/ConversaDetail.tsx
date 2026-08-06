"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

interface FirestoreTimestamp {
  seconds?: number;
  _seconds?: number;
}

function tsToMs(ts: FirestoreTimestamp | null | undefined): number {
  if (!ts) return 0;
  return (ts.seconds ?? ts._seconds ?? 0) * 1000;
}

function formatDateTime(ts: FirestoreTimestamp | null | undefined) {
  const ms = tsToMs(ts);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  chargebackRisk?: boolean;
  attachments?: Array<{ filename: string; contentType: string; url: string }>;
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

interface TaskItem {
  id: string;
  emailId: string;
  description: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  createdAt: FirestoreTimestamp | null;
}

const STATUS_CFG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  pending: {
    label: "Pendente",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400 animate-pulse",
  },
  processing: {
    label: "Processando",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    dot: "bg-sky-400 animate-pulse",
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
};

function extractNewText(bodyText: string): string {
  const lines = bodyText.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith(">")) break;
    result.push(line);
  }
  const trimmed = result.join("\n").trim();
  return trimmed || bodyText.trim();
}

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

interface ManualAttachment {
  filename: string;
  contentType: string;
  data: string;
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
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
  );
}

interface Props {
  emailId: string | null;
  onBack: () => void;
  onRefresh: () => void;
}

export default function ConversaDetail({ emailId, onBack, onRefresh }: Props) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEmail[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [manualSending, setManualSending] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [attachments, setAttachments] = useState<ManualAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [marking, setMarking] = useState(false);
  const [customerPaused, setCustomerPaused] = useState(false);
  const [togglingCustomerPause, setTogglingCustomerPause] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const reloadEmail = useCallback(async (id: string) => {
    const res = await fetch(`/api/emails/${id}`);
    const data = await res.json();
    setEmail(data);
    return data as EmailDetail;
  }, []);

  useEffect(() => {
    if (!emailId) {
      setEmail(null);
      setHistory(null);
      setSendError(null);
      setDraft("");
      setShowReply(false);
      return;
    }

    setLoading(true);
    setEmail(null);
    setHistory(null);
    setSendError(null);
    setDraft("");
    setManualError(null);
    setManualSuccess(false);
    setShowReply(false);
    setAttachments([]);
    setCustomerPaused(false);
    setTasks([]);

    fetch(`/api/emails/${emailId}`)
      .then((r) => r.json())
      .then(async (data: EmailDetail) => {
        setEmail(data);
        if (data.customerId) {
          setHistoryLoading(true);
          try {
            const [hRes, tRes] = await Promise.all([
              fetch(`/api/customers/${data.customerId}`),
              fetch(`/api/tasks?all=true`),
            ]);
            const hData = await hRes.json();
            const tData = await tRes.json();
            const emailsList: HistoryEmail[] = hData.emailsList ?? [];
            const emailIds = new Set(emailsList.map((e) => e.id));
            setHistory(emailsList);
            setCustomerPaused(hData.pausedReplies === true);
            setTasks(
              ((tData.tasks as TaskItem[]) ?? []).filter(
                (t) => t.emailId && emailIds.has(t.emailId),
              ),
            );
          } finally {
            setHistoryLoading(false);
          }
        } else {
          setHistory([
            {
              id: data.id,
              subject: data.subject,
              status: data.status,
              receivedAt: data.receivedAt,
              from: data.from,
              fromName: data.fromName,
              bodyText: data.bodyText,
              aiResponse: data.aiResponse,
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [emailId]);

  useEffect(() => {
    if (history?.length && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [history]);

  async function handleSend(resend = false) {
    if (!emailId) return;
    const confirmed = window.confirm(
      resend
        ? "Reenviar este e-mail? O cliente receberá a resposta novamente."
        : "Enviar este e-mail agora?",
    );
    if (!confirmed) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      await reloadEmail(emailId);
      onRefresh();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    if (!emailId) return;
    setCancelling(true);
    await fetch(`/api/emails/${emailId}/cancel`, { method: "POST" });
    await reloadEmail(emailId);
    onRefresh();
    setCancelling(false);
  }

  async function handleEnhance() {
    if (!draft.trim() || !emailId) return;
    setEnhancing(true);
    setManualError(null);
    try {
      const res = await fetch(`/api/emails/${emailId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aperfeiçoar");
      setDraft(data.enhanced);
    } catch (err) {
      setManualError(
        err instanceof Error ? err.message : "Erro ao aperfeiçoar",
      );
    } finally {
      setEnhancing(false);
    }
  }

  function totalBytes(list: ManualAttachment[]) {
    return list.reduce((s, a) => s + Math.ceil((a.data.length * 3) / 4), 0);
  }

  function addFiles(files: FileList | File[]) {
    setAttachmentError(null);
    const readers = Array.from(files).map(
      (file) =>
        new Promise<ManualAttachment | string>((resolve) => {
          if (file.size > MAX_FILE_BYTES) {
            resolve(`"${file.name}" excede 15 MB.`);
            return;
          }
          const r = new FileReader();
          r.onload = () => {
            resolve({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              data: (r.result as string).split(",")[1],
            });
          };
          r.readAsDataURL(file);
        }),
    );
    Promise.all(readers).then((results) => {
      const errors: string[] = [];
      const valid: ManualAttachment[] = [];
      for (const r of results) {
        if (typeof r === "string") errors.push(r);
        else valid.push(r);
      }
      setAttachments((prev) => {
        const next = [...prev, ...valid];
        if (totalBytes(next) > MAX_TOTAL_BYTES) {
          setAttachmentError("Total dos anexos ultrapassa 20 MB.");
          return prev;
        }
        if (errors.length) setAttachmentError(errors.join(" "));
        return next;
      });
    });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(e.clipboardData.items).filter(
      (i) => i.kind === "file" && i.type.startsWith("image/"),
    );
    if (!images.length) return;
    e.preventDefault();
    addFiles(images.map((i) => i.getAsFile()!).filter(Boolean));
  }

  async function handleToggleCustomerPause() {
    if (!email?.customerId || togglingCustomerPause) return;
    setTogglingCustomerPause(true);
    const next = !customerPaused;
    try {
      await fetch(`/api/customers/${email.customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausedReplies: next }),
      });
      setCustomerPaused(next);
    } finally {
      setTogglingCustomerPause(false);
    }
  }

  async function handleMarkSpam() {
    if (!emailId || marking) return;
    const confirmed = window.confirm(
      "Marcar como spam? O cliente será bloqueado e todos os e-mails pendentes dele serão cancelados.",
    );
    if (!confirmed) return;
    setMarking(true);
    try {
      await fetch(`/api/emails/${emailId}/spam`, { method: "POST" });
      onRefresh();
      // Reload the email to reflect new status
      await reloadEmail(emailId);
    } finally {
      setMarking(false);
    }
  }

  async function handleManualSend() {
    if (!draft.trim() || !emailId) return;
    const confirmed = window.confirm("Enviar esta resposta?");
    if (!confirmed) return;
    setManualSending(true);
    setManualError(null);
    setManualSuccess(false);
    try {
      const res = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualReply: draft,
          ...(attachments.length ? { manualAttachments: attachments } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      setManualSuccess(true);
      setDraft("");
      setAttachments([]);
      setShowReply(false);
      await reloadEmail(emailId);
      onRefresh();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setManualSending(false);
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!emailId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/6 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">
            Selecione uma conversa
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Clique em um contato à esquerda para ver as mensagens
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-gray-600 text-sm">
        <Spinner />
        Carregando...
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        E-mail não encontrado
      </div>
    );
  }

  const sc = STATUS_CFG[email.status] ?? STATUS_CFG.cancelled;
  const canResend = ["sent", "failed", "cancelled"].includes(email.status);
  const sortedHistory = history
    ? [...history].sort(
        (a, b) =>
          (a.receivedAt?.seconds ?? a.receivedAt?._seconds ?? 0) -
          (b.receivedAt?.seconds ?? b.receivedAt?._seconds ?? 0),
      )
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6 shrink-0 bg-gray-900/40">
        {/* Mobile back button */}
        <button
          onClick={onBack}
          className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-all shrink-0"
          aria-label="Voltar"
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

        {/* Customer info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-100 truncate">
              {email.fromName || email.from}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            {email.chargebackRisk && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Chargeback
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">
            {email.from}
          </p>
          {email.customerId && (
            <Link
              href={`/customers/${email.customerId}`}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400/70 hover:text-indigo-300 transition-colors mt-0.5"
            >
              Ver perfil do cliente
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {email.status === "pending" && (
            <>
              <button
                onClick={() => handleSend(false)}
                disabled={sending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                {sending ? (
                  <Spinner className="w-3 h-3" />
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
                {sending ? "Enviando..." : "Enviar"}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || sending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-all"
              >
                {cancelling ? (
                  <Spinner className="w-3 h-3" />
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
                {cancelling ? "..." : "Cancelar"}
              </button>
            </>
          )}
          {canResend && (
            <button
              onClick={() => handleSend(true)}
              disabled={sending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-400 transition-all"
            >
              {sending ? (
                <Spinner className="w-3 h-3" />
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
              {sending ? "..." : "Reenviar"}
            </button>
          )}

          {/* Open full page */}
          <Link
            href={`/emails/${emailId}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-200 hover:bg-white/8 border border-white/6 transition-all"
            title="Abrir página completa"
          >
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
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            <span className="hidden sm:inline">Expandir</span>
          </Link>

          {/* Per-customer pause toggle */}
          {email?.customerId && (
            <button
              onClick={handleToggleCustomerPause}
              disabled={togglingCustomerPause}
              title={
                customerPaused
                  ? "Retomar respostas automáticas para este cliente"
                  : "Pausar respostas automáticas para este cliente"
              }
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all disabled:opacity-40 ${
                customerPaused
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                  : "text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 border-white/6 hover:border-amber-500/20"
              }`}
            >
              {togglingCustomerPause ? (
                <Spinner className="w-3 h-3" />
              ) : customerPaused ? (
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
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                  />
                </svg>
              ) : (
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
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Mark as spam */}
          <button
            onClick={handleMarkSpam}
            disabled={marking || email?.status === "cancelled"}
            title="Marcar como spam e bloquear cliente"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 border border-white/6 hover:border-red-500/20 transition-all"
          >
            {marking ? (
              <Spinner className="w-3 h-3" />
            ) : (
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
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {sendError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/5 border-b border-red-500/10 text-xs text-red-400 shrink-0">
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
          {sendError}
        </div>
      )}

      {/* ── Conversation thread ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-6">
        {historyLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    <div className="h-16 w-3/4 bg-white/5 rounded-xl animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="h-12 w-2/3 bg-indigo-500/5 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          sortedHistory?.map((item) => {
            const isCurrent = item.id === emailId;
            const sc2 = STATUS_CFG[item.status] ?? STATUS_CFG.cancelled;
            const date = formatDateTime(item.receivedAt);
            const displayName = item.fromName || item.from;
            const initial = displayName.charAt(0).toUpperCase();
            const text = item.bodyText ? extractNewText(item.bodyText) : null;

            return (
              <div key={item.id} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] text-gray-600 tabular-nums whitespace-nowrap">
                    {date}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-indigo-400 font-medium">
                      atual
                    </span>
                  )}
                  {!isCurrent && (
                    <Link
                      href={`/emails/${item.id}`}
                      className="text-[10px] text-gray-600 hover:text-indigo-400 transition-colors"
                      title="Ver e-mail completo"
                    >
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
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                    </Link>
                  )}
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Customer bubble */}
                {text && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold text-gray-300 select-none">
                        {initial}
                      </span>
                    </div>
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 ${
                        isCurrent
                          ? "border border-indigo-500/20"
                          : "border border-white/8"
                      }`}
                    >
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {text}
                      </pre>
                    </div>
                  </div>
                )}

                {/* AI response bubble */}
                {item.aiResponse && (
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-500/8 border border-indigo-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg
                          className="w-3 h-3 text-indigo-400 shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                          IA
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${sc2.bg} ${sc2.text} ${sc2.border}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${sc2.dot}`} />
                          {sc2.label}
                        </span>
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {item.aiResponse}
                      </pre>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg
                        className="w-3.5 h-3.5 text-indigo-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Pending placeholder */}
                {isCurrent &&
                  !item.aiResponse &&
                  email.status === "pending" && (
                    <div className="flex items-start justify-end gap-2.5">
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-amber-500/5 border border-amber-500/15">
                        <p className="text-xs text-amber-400/70 italic">
                          Resposta automática agendada...
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-amber-400 animate-pulse"
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
                      </div>
                    </div>
                  )}

                {/* Tasks created for this email */}
                {tasks
                  .filter((t) => t.emailId === item.id)
                  .map((task) => {
                    const priorityCfg = {
                      high: {
                        label: "Alta",
                        cls: "bg-red-500/10 text-red-400 border-red-500/20",
                      },
                      medium: {
                        label: "Média",
                        cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                      },
                      low: {
                        label: "Baixa",
                        cls: "bg-sky-500/10 text-sky-400 border-sky-500/20",
                      },
                    }[task.priority] ?? {
                      label: task.priority,
                      cls: "bg-gray-500/10 text-gray-400 border-gray-500/20",
                    };
                    return (
                      <div key={task.id} className="flex justify-center">
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/20 max-w-[88%]">
                          <svg
                            className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                                Tarefa criada pela IA
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityCfg.cls}`}
                              >
                                {priorityCfg.label}
                              </span>
                              {task.completed && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Concluída
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-300 leading-snug">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* ── Reply area ────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/6 shrink-0 px-3 py-3">
        {!showReply ? (
          <button
            onClick={() => setShowReply(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-xs text-gray-500 hover:text-gray-300 transition-all w-full"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
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
            Responder manualmente...
          </button>
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden focus-within:border-indigo-500/40 transition-colors">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={handlePaste}
              placeholder="Escreva sua resposta..."
              rows={4}
              autoFocus
              className="w-full bg-transparent px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none resize-none"
            />

            {attachments.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-xs text-gray-400"
                  >
                    <svg
                      className="w-3 h-3 shrink-0"
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
                    <span className="max-w-25 truncate">{a.filename}</span>
                    <button
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-gray-600 hover:text-red-400 ml-0.5 transition-colors"
                    >
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
                    </button>
                  </span>
                ))}
              </div>
            )}

            {(attachmentError || manualError || manualSuccess) && (
              <div className="px-4 pb-2 space-y-0.5">
                {attachmentError && (
                  <p className="text-xs text-red-400">{attachmentError}</p>
                )}
                {manualError && (
                  <p className="text-xs text-red-400">{manualError}</p>
                )}
                {manualSuccess && (
                  <p className="text-xs text-emerald-400">Resposta enviada!</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 border-t border-white/6">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar imagem"
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-all"
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
                      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleEnhance}
                  disabled={!draft.trim() || enhancing}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-40 border border-indigo-500/20 transition-all"
                >
                  {enhancing ? (
                    <Spinner className="w-3 h-3" />
                  ) : (
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                  {enhancing ? "..." : "Aperfeiçoar"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowReply(false);
                    setDraft("");
                    setAttachments([]);
                    setManualError(null);
                    setManualSuccess(false);
                  }}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 transition-all"
                  title="Fechar"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleManualSend}
                  disabled={!draft.trim() || manualSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
                >
                  {manualSending ? (
                    <Spinner className="w-3 h-3" />
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
                  {manualSending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
