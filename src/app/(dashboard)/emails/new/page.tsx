"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "../../ConfirmDialog";
import BulkComposer from "./BulkComposer";
import {
  COMPOSE_TEMPLATES,
  fillTemplate,
  getTemplateContent,
  type TemplateVars,
} from "@/lib/email/compose-templates";
import type { ShopifyOrderDetails } from "@/lib/shopify/client";
import { shopifyStoreId } from "../../store-context";

interface Account {
  id: string;
  email: string;
  label?: string;
  testEmail?: string | null;
  shopifyConnected?: boolean;
  shopifyDomain?: string | null;
  replyLanguage?: string;
}

interface ManualAttachment {
  filename: string;
  contentType: string;
  data: string; // base64
}

// Same limits as email detail page
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  nl: "Nederlands",
  ja: "日本語",
  zh: "中文（简体）",
};

function SpinnerIcon({ className = "w-4 h-4" }: { className?: string }) {
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

interface OrderLookupResult {
  order: ShopifyOrderDetails;
  storeLabel: string;
  trackingUrlTemplate: string | null;
}

export default function NewEmailPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"individual" | "bulk">("individual");

  // Form state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Shopify template helper
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<OrderLookupResult | null>(
    null,
  );
  const [templateId, setTemplateId] = useState("");
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(
    null,
  );
  const [createAnnotation, setCreateAnnotation] = useState(true);
  const [annotationCreated, setAnnotationCreated] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<ManualAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI enhance
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // Send
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list: Account[] = d.accounts ?? [];
        setAccounts(list);
        if (list.length === 1) setAccountId(list[0].id);
      })
      .finally(() => setAccountsLoading(false));
  }, []);

  // ---------- attachments ----------
  function totalAttachmentBytes(list: ManualAttachment[]) {
    return list.reduce((sum, a) => sum + Math.ceil((a.data.length * 3) / 4), 0);
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    setAttachmentError(null);
    const arr = Array.from(files);
    const readers = arr.map(
      (file) =>
        new Promise<ManualAttachment | string>((resolve) => {
          if (file.size > MAX_FILE_BYTES) {
            resolve(`"${file.name}" excede o limite de 15 MB por arquivo.`);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            resolve({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              data: base64,
            });
          };
          reader.readAsDataURL(file);
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
        const totalBytes = totalAttachmentBytes(next);
        if (totalBytes > MAX_TOTAL_BYTES) {
          setAttachmentError(
            "Total dos anexos ultrapassa 20 MB (limite dos provedores de e-mail).",
          );
          return prev;
        }
        if (errors.length > 0) setAttachmentError(errors.join(" "));
        return next;
      });
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    addFiles(files);
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentError(null);
  }

  // ---------- AI enhance ----------
  async function handleEnhance() {
    if (!body.trim()) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const res = await fetch("/api/emails/enhance-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: body, subject, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aperfeiçoar");
      setBody(data.enhanced);
    } catch (err) {
      setEnhanceError(
        err instanceof Error ? err.message : "Erro ao aperfeiçoar",
      );
    } finally {
      setEnhancing(false);
    }
  }

  const openConfirm = useConfirm();

  // ---------- Shopify template helper ----------
  async function handleLookup() {
    if (!accountId || !lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const params = new URLSearchParams({
        accountId,
        query: lookupQuery.trim(),
      });
      const res = await fetch(`/api/shopify/order-lookup?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar pedido");
      setLookupResult(data as OrderLookupResult);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Erro ao buscar pedido",
      );
    } finally {
      setLookupLoading(false);
    }
  }

  function buildTemplateVars(result: OrderLookupResult): TemplateVars {
    const { order, storeLabel, trackingUrlTemplate } = result;
    const nome = order.customer?.name ?? "";
    const trackingLink =
      trackingUrlTemplate && order.trackingNumber
        ? trackingUrlTemplate.replace("{{tracking_number}}", order.trackingNumber)
        : (order.trackingUrl ?? "");
    return {
      nome,
      primeiroNome: order.customer?.firstName ?? nome.split(" ")[0] ?? "",
      pedido: order.name,
      itens: order.lineItems
        .map((i) => `${i.quantity}x ${i.title}`)
        .join(", "),
      loja: storeLabel,
      rastreio: order.trackingNumber ?? "",
      linkRastreio: trackingLink,
      endereco: order.shippingAddress ?? "",
      total:
        order.totalPrice != null
          ? `${order.currency ?? ""} ${order.totalPrice.toFixed(2)}`.trim()
          : "",
    };
  }

  function handleApplyTemplate() {
    if (!lookupResult || !templateId) return;
    const template = COMPOSE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const account = accounts.find((a) => a.id === accountId);
    const content = getTemplateContent(template, account?.replyLanguage);
    const vars = buildTemplateVars(lookupResult);
    if (lookupResult.order.customer?.email)
      setTo(lookupResult.order.customer.email);
    setSubject(fillTemplate(content.subject, vars));
    setBody(fillTemplate(content.body, vars));
    setAppliedTemplateName(template.name);
  }

  async function maybeCreateAnnotation(emailId: string | null) {
    if (!createAnnotation || !lookupResult) return;
    const { order } = lookupResult;
    const titleBase = appliedTemplateName ?? "E-mail enviado";
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          title: `${titleBase} — Pedido ${order.name}`,
          text: [
            order.customer?.name ? `Cliente: ${order.customer.name}` : null,
            order.customer?.email ? `E-mail: ${order.customer.email}` : null,
            `Assunto: ${subject.trim()}`,
            "Aguardando retorno do cliente.",
          ]
            .filter(Boolean)
            .join("\n"),
          linkedEmailId: emailId ?? undefined,
          orderNumber: order.name,
          customerName: order.customer?.name ?? undefined,
          customerEmail: order.customer?.email ?? undefined,
        }),
      });
      if (res.ok) setAnnotationCreated(true);
    } catch {
      // non-fatal — e-mail already sent
    }
  }

  async function handleSend() {
    if (!accountId || !to.trim() || !subject.trim() || !body.trim()) return;
    const confirmed = await openConfirm({
      title: "Enviar e-mail?",
      description:
        "Confirme o envio deste e-mail para o destinatário informado.",
      confirmLabel: "Enviar",
    });
    if (!confirmed) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/emails/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          ...(lookupResult?.order.customer?.name &&
          lookupResult.order.customer.email?.toLowerCase() ===
            to.trim().toLowerCase()
            ? { customerName: lookupResult.order.customer.name }
            : {}),
          ...(attachments.length > 0 ? { attachments } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      await maybeCreateAnnotation(
        typeof data.emailId === "string" ? data.emailId : null,
      );
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  const canSend =
    !!accountId &&
    to.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !sending;

  // ---------- success state ----------
  if (sent && mode === "individual") {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-gray-900/60 border border-white/6 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-100">
              E-mail enviado com sucesso
            </p>
            <p className="text-sm text-gray-500">
              Sua mensagem foi entregue ao destinatário.
            </p>
            {annotationCreated && (
              <p className="text-xs text-amber-400/90">
                Uma anotação de acompanhamento foi criada em{" "}
                <button
                  onClick={() => router.push("/anotacoes")}
                  className="underline hover:text-amber-300"
                >
                  Anotações
                </button>
                .
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setSent(false);
                setTo("");
                setSubject("");
                setBody("");
                setAttachments([]);
                setLookupQuery("");
                setLookupResult(null);
                setLookupError(null);
                setTemplateId("");
                setAppliedTemplateName(null);
                setAnnotationCreated(false);
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg text-sm text-gray-300 transition-colors"
            >
              Escrever outro
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Ir ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/dashboard")}
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
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Novo E-mail</span>
      </nav>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-indigo-400"
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
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-100">
            Compor Novo E-mail
          </h1>
          <p className="text-xs text-gray-500">
            {mode === "individual"
              ? "Envie um e-mail a qualquer destinatário sem precisar de um contato anterior."
              : "Dispare uma campanha para quem comprou um produto específico na sua loja Shopify."}
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="inline-flex p-0.5 bg-gray-900/60 border border-white/6 rounded-lg">
        {(
          [
            ["individual", "Envio individual"],
            ["bulk", "Campanha em lote"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === value
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "bulk" ? (
        <BulkComposer accounts={accounts} accountsLoading={accountsLoading} />
      ) : (
        <>
      {/* Shopify templates card */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
          <img
            src="/images/shopify-logo.png"
            alt="Shopify"
            className="w-4 h-4 object-contain"
          />
          <div>
            <p className="text-sm font-medium text-gray-200 leading-tight">
              Templates prontos
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              Busque um pedido na Shopify e preencha o e-mail automaticamente.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Lookup */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Pedido ou e-mail do cliente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                placeholder="#2361 ou cliente@email.com"
                className="flex-1 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={!accountId || !lookupQuery.trim() || lookupLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors shrink-0"
              >
                {lookupLoading ? (
                  <SpinnerIcon className="w-3.5 h-3.5" />
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
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                )}
                {lookupLoading ? "Buscando..." : "Buscar na Shopify"}
              </button>
            </div>
            {!accountId && (
              <p className="text-xs text-gray-600">
                Selecione a loja no campo &quot;Enviar de&quot; abaixo para
                buscar o pedido.
              </p>
            )}
            {accountId &&
              !accounts.find((a) => a.id === accountId)?.shopifyConnected && (
                <p className="text-xs text-amber-400">
                  A conta selecionada não tem a Shopify conectada.
                </p>
              )}
          </div>

          {lookupError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {lookupError}
            </p>
          )}

          {/* Order summary */}
          {lookupResult && (
            <div className="bg-gray-800/40 border border-white/5 rounded-lg px-4 py-3 space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-violet-500/10 text-violet-400 border-violet-500/20 font-medium">
                  Pedido {lookupResult.order.name}
                </span>
                <span className="text-gray-500">
                  {lookupResult.order.fulfillmentStatus ?? "não enviado"} ·{" "}
                  {lookupResult.order.financialStatus}
                </span>
              </div>
              {lookupResult.order.customer?.name && (
                <p className="text-gray-400">
                  Cliente:{" "}
                  <span className="text-gray-200">
                    {lookupResult.order.customer.name}
                  </span>
                  {lookupResult.order.customer.email && (
                    <span className="text-gray-500">
                      {" "}
                      &lt;{lookupResult.order.customer.email}&gt;
                    </span>
                  )}
                </p>
              )}
              {lookupResult.order.lineItems.length > 0 && (
                <p className="text-gray-500">
                  Itens:{" "}
                  {lookupResult.order.lineItems
                    .map((i) => `${i.quantity}x ${i.title}`)
                    .join(", ")}
                </p>
              )}
              {lookupResult.order.shippingAddress && (
                <p className="text-gray-500 whitespace-pre-line">
                  Endereço: {lookupResult.order.shippingAddress}
                </p>
              )}
              {lookupResult.order.trackingNumber && (
                <p className="text-gray-500">
                  Rastreio: {lookupResult.order.trackingNumber}
                </p>
              )}
            </div>
          )}

          {/* Template picker */}
          {lookupResult && (() => {
            const account = accounts.find((a) => a.id === accountId);
            const accountLang = (account?.replyLanguage ?? "en")
              .toLowerCase()
              .split("-")[0];
            const selectedTemplate = COMPOSE_TEMPLATES.find(
              (t) => t.id === templateId,
            );
            const effectiveLang = selectedTemplate
              ? selectedTemplate.content[accountLang]
                ? accountLang
                : "en"
              : accountLang;
            const langLabel =
              LANGUAGE_LABELS[effectiveLang] ?? effectiveLang.toUpperCase();
            return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 uppercase tracking-wider">
                  Template
                </label>
                <span className="text-xs text-gray-600">
                  Idioma da loja:{" "}
                  <span className="text-gray-400">{langLabel}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="flex-1 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled>
                    Selecione um template...
                  </option>
                  {COMPOSE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  disabled={!templateId}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors shrink-0"
                >
                  Preencher e-mail
                </button>
              </div>
              {templateId && (
                <p className="text-xs text-gray-600">
                  {
                    COMPOSE_TEMPLATES.find((t) => t.id === templateId)
                      ?.description
                  }
                </p>
              )}
              {appliedTemplateName && (
                <p className="text-xs text-emerald-400">
                  Template &quot;{appliedTemplateName}&quot; aplicado —
                  revise o e-mail abaixo antes de enviar.
                </p>
              )}
            </div>
            );
          })()}

          {/* Annotation toggle */}
          {lookupResult && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAnnotation}
                onChange={(e) => setCreateAnnotation(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500/40"
              />
              <span className="text-xs text-gray-400">
                Criar anotação de acompanhamento ao enviar (fica em{" "}
                <span className="text-amber-400">Anotações</span>)
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl overflow-hidden">
        <div className="px-5 py-5 space-y-4">
          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Enviar de
            </label>
            {accountsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
                <SpinnerIcon className="w-3.5 h-3.5" />
                Carregando contas...
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-red-400">
                Nenhuma conta configurada. Adicione uma conta primeiro.
              </p>
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                {accounts.length > 1 && (
                  <option value="" disabled>
                    Selecione uma conta...
                  </option>
                )}
                {accounts.map((a) => {
                  const shopId = shopifyStoreId(a);
                  const name = a.label
                    ? `${a.label}${shopId ? `(${shopId})` : ""}`
                    : null;
                  return (
                    <option key={a.id} value={a.id}>
                      {name ? `${name} <${a.email}>` : a.email}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Para
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@email.com"
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Assunto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do e-mail"
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Mensagem
              </label>
              <button
                type="button"
                onClick={handleEnhance}
                disabled={enhancing || !body.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600/15 hover:bg-violet-600/25 disabled:opacity-40 disabled:cursor-not-allowed border border-violet-500/20 rounded-md text-xs font-medium text-violet-300 transition-all"
              >
                {enhancing ? (
                  <SpinnerIcon className="w-3 h-3" />
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
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                )}
                {enhancing ? "Aperfeiçoando..." : "Aperfeiçoar com IA"}
              </button>
            </div>

            {enhanceError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {enhanceError}
              </p>
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite sua mensagem aqui... Você pode colar imagens diretamente neste campo."
              rows={10}
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono leading-relaxed"
            />
          </div>

          {/* Attachments drop zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Anexos
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 hover:bg-gray-700/60 border border-white/8 rounded-md text-xs text-gray-400 hover:text-gray-200 transition-colors"
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
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                  />
                </svg>
                Adicionar arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border border-dashed border-white/10 rounded-lg px-4 py-4 text-center text-xs text-gray-600 hover:border-white/20 hover:text-gray-500 transition-colors cursor-default"
            >
              Arraste arquivos aqui ou cole imagens no campo de texto acima
              <span className="block mt-0.5 text-gray-700">
                Máx. 15 MB por arquivo · 20 MB total
              </span>
            </div>

            {attachmentError && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                {attachmentError}
              </p>
            )}

            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-3 bg-gray-800/50 border border-white/6 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        className="w-3.5 h-3.5 text-gray-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                        />
                      </svg>
                      <span className="text-xs text-gray-300 truncate">
                        {att.filename}
                      </span>
                      <span className="text-xs text-gray-600 shrink-0">
                        {(Math.ceil((att.data.length * 3) / 4) / 1024).toFixed(
                          0,
                        )}{" "}
                        KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer / Send */}
        <div className="border-t border-white/5 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            {sendError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {sendError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
            >
              {sending ? (
                <SpinnerIcon className="w-3 h-3" />
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
              {sending ? "Enviando..." : "Enviar E-mail"}
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
