"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../../ConfirmDialog";
import { applyTokens } from "@/lib/shopify/audience";

export interface BulkAccount {
  id: string;
  email: string;
  label?: string;
  testEmail?: string | null;
  shopifyConnected?: boolean;
}

interface Product {
  id: number;
  title: string;
  handle: string;
  status: string;
  imageUrl: string | null;
}

interface AudienceMember {
  email: string;
  name: string;
  orderName: string;
  orderDate: string;
  quantity: number;
  acceptsMarketing: boolean;
}

interface AudiencePreview {
  total: number;
  totalBeforeConsentFilter: number;
  members: AudienceMember[];
}

interface Progress {
  campaignId: string;
  total: number;
  sentCount: number;
  failedCount: number;
  done: boolean;
}

interface FailedRecipient {
  email: string;
  error: string | null;
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
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

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function BulkComposer({
  accounts,
  accountsLoading,
}: {
  accounts: BulkAccount[];
  accountsLoading: boolean;
}) {
  const openConfirm = useConfirm();

  const shopifyAccounts = useMemo(
    () => accounts.filter((a) => a.shopifyConnected),
    [accounts],
  );

  const [accountId, setAccountId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedFor, setLoadedFor] = useState("");
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState<number | null>(null);

  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [onlySubscribed, setOnlySubscribed] = useState(false);

  const [audience, setAudience] = useState<AudiencePreview | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failures, setFailures] = useState<FailedRecipient[]>([]);

  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Single-store users don't need to pick anything.
  const effectiveAccountId =
    accountId || (shopifyAccounts.length === 1 ? shopifyAccounts[0].id : "");

  const productsReady = !!effectiveAccountId && loadedFor === effectiveAccountId;
  const productsLoading = !!effectiveAccountId && !productsReady;

  useEffect(() => {
    const id = effectiveAccountId;
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/shopify/products?accountId=${encodeURIComponent(id)}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Erro ao carregar produtos");
        setProducts(data.products ?? []);
        setProductsError(null);
      } catch (err) {
        if (cancelled) return;
        setProducts([]);
        setProductsError(
          err instanceof Error ? err.message : "Erro ao carregar produtos",
        );
      } finally {
        if (!cancelled) setLoadedFor(id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveAccountId]);

  const filteredProducts = useMemo(() => {
    if (!productsReady) return [];
    const term = productSearch.trim().toLowerCase();
    const list = term
      ? products.filter((p) => p.title.toLowerCase().includes(term))
      : products;
    return list.slice(0, 60);
  }, [products, productSearch, productsReady]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  useEffect(() => {
    if (!showAudienceModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAudienceModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAudienceModal]);

  const audienceResults = useMemo(() => {
    if (!audience) return [];
    const term = audienceSearch.trim().toLowerCase();
    if (!term) return audience.members;
    return audience.members.filter(
      (m) =>
        m.email.includes(term) ||
        m.name.toLowerCase().includes(term) ||
        m.orderName.toLowerCase().includes(term),
    );
  }, [audience, audienceSearch]);

  async function handleCopyEmails() {
    try {
      await navigator.clipboard.writeText(
        audienceResults.map((m) => m.email).join(", "),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked by the browser — nothing to do
    }
  }

  const selectedAccount =
    shopifyAccounts.find((a) => a.id === effectiveAccountId) ?? null;
  const fallbackTestEmail = selectedAccount?.testEmail || selectedAccount?.email || "";

  function rangePayload() {
    return {
      accountId: effectiveAccountId,
      productId,
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59`).toISOString(),
      onlySubscribed,
    };
  }

  async function handlePreview() {
    if (!effectiveAccountId || !productId) return;
    setAudienceLoading(true);
    setAudienceError(null);
    setAudience(null);
    try {
      const res = await fetch("/api/bulk-campaigns/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rangePayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar clientes");
      setAudience(data);
    } catch (err) {
      setAudienceError(
        err instanceof Error ? err.message : "Erro ao buscar clientes",
      );
    } finally {
      setAudienceLoading(false);
    }
  }

  async function handleEnhance() {
    if (!body.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/emails/enhance-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: body, subject, accountId: effectiveAccountId }),
      });
      const data = await res.json();
      if (res.ok) setBody(data.enhanced);
    } finally {
      setEnhancing(false);
    }
  }

  async function runBatches(campaignId: string, total: number) {
    let done = false;
    while (!done) {
      const res = await fetch(`/api/bulk-campaigns/${campaignId}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro durante o envio");
      done = data.done === true;
      setProgress({
        campaignId,
        total,
        sentCount: data.sentCount ?? 0,
        failedCount: data.failedCount ?? 0,
        done,
      });
      if (done && (data.failedCount ?? 0) > 0) await loadFailures(campaignId);
    }
  }

  async function loadFailures(campaignId: string) {
    try {
      const res = await fetch(`/api/bulk-campaigns/${campaignId}`);
      const data = await res.json();
      if (!res.ok) return;
      const recipients = (data.campaign?.recipients ?? []) as Array<
        FailedRecipient & { status: string }
      >;
      setFailures(
        recipients
          .filter((r) => r.status === "failed")
          .map((r) => ({ email: r.email, error: r.error })),
      );
    } catch {
      // non-fatal — the counters already reflect the failures
    }
  }

  async function handleTestSend() {
    const target = testEmail.trim() || fallbackTestEmail;
    if (!target || !subject.trim() || !body.trim()) return;

    setTestSending(true);
    setTestFeedback(null);
    try {
      const preview = audience?.members[0];
      const vars = {
        name: preview?.name ?? "Cliente",
        product: selectedProduct?.title ?? "seu produto",
        order: preview?.orderName ?? "#1001",
      };
      const res = await fetch("/api/emails/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: effectiveAccountId,
          to: target,
          subject: `[TESTE] ${applyTokens(subject.trim(), vars)}`,
          body: applyTokens(body.trim(), vars),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar teste");
      setTestFeedback({ ok: true, message: `E-mail de teste enviado para ${target}.` });
    } catch (err) {
      setTestFeedback({
        ok: false,
        message: err instanceof Error ? err.message : "Erro ao enviar teste",
      });
    } finally {
      setTestSending(false);
    }
  }

  async function handleSend() {
    if (!canSend || !audience) return;
    const confirmed = await openConfirm({
      title: `Disparar para ${audience.total} cliente(s)?`,
      description: `Os e-mails serão enviados um a um a partir de ${
        shopifyAccounts.find((a) => a.id === effectiveAccountId)?.email ?? ""
      }. Pedidos cancelados ou estornados já foram excluídos da lista.`,
      confirmLabel: "Disparar campanha",
    });
    if (!confirmed) return;

    setSending(true);
    setSendError(null);
    setProgress(null);
    setFailures([]);
    try {
      const res = await fetch("/api/bulk-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rangePayload(),
          productTitle: selectedProduct?.title ?? "",
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar campanha");

      setProgress({
        campaignId: data.id,
        total: data.total,
        sentCount: 0,
        failedCount: 0,
        done: false,
      });
      await runBatches(data.id, data.total);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleResume() {
    if (!progress) return;
    setSending(true);
    setSendError(null);
    try {
      await runBatches(progress.campaignId, progress.total);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  const canSend =
    !!effectiveAccountId &&
    !!productId &&
    !!audience &&
    audience.total > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !sending;

  const processed = progress ? progress.sentCount + progress.failedCount : 0;
  const percent =
    progress && progress.total > 0
      ? Math.round((processed / progress.total) * 100)
      : 0;

  if (accountsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 py-6">
        <Spinner className="w-3.5 h-3.5" />
        Carregando contas...
      </div>
    );
  }

  if (shopifyAccounts.length === 0) {
    return (
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-8 text-center space-y-2">
        <p className="text-sm text-gray-300">
          Nenhuma loja com Shopify conectada
        </p>
        <p className="text-xs text-gray-500">
          Conecte uma loja Shopify em Contas para disparar campanhas por produto
          comprado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — store + product */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300 flex items-center justify-center">
            1
          </span>
          <h2 className="text-sm font-semibold text-gray-200">
            Loja e produto
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Loja (conta de envio)
            </label>
            <select
              value={effectiveAccountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setProductId(null);
                setAudience(null);
                setProductSearch("");
              }}
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Selecione uma loja...
              </option>
              {shopifyAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label ? `${a.label} <${a.email}>` : a.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Buscar produto
            </label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              disabled={!effectiveAccountId}
              placeholder="Filtrar por nome..."
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {productsReady && productsError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 space-y-2">
            <p>{productsError}</p>
            <a
              href={`/api/shopify/install?accountId=${encodeURIComponent(effectiveAccountId)}`}
              className="inline-block px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300"
            >
              Reconectar loja Shopify
            </a>
          </div>
        )}

        {productsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
            <Spinner className="w-3.5 h-3.5" />
            Carregando produtos da loja...
          </div>
        ) : (
          effectiveAccountId && (
            <div className="max-h-64 overflow-y-auto border border-white/6 rounded-lg divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <div className="px-3 py-4 text-center space-y-1">
                  <p className="text-xs text-gray-600">
                    Nenhum produto encontrado.
                  </p>
                  {products.length === 0 && !productsError && (
                    <p className="text-[11px] text-gray-600">
                      Se a loja tem produtos cadastrados,{" "}
                      <a
                        href={`/api/shopify/install?accountId=${encodeURIComponent(effectiveAccountId)}`}
                        className="text-indigo-400 hover:text-indigo-300 underline"
                      >
                        reconecte o Shopify
                      </a>{" "}
                      para conceder a permissão de leitura de produtos.
                    </p>
                  )}
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProductId(p.id);
                      setAudience(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      productId === p.id
                        ? "bg-indigo-600/15"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-800 shrink-0" />
                    )}
                    <span className="text-xs text-gray-300 truncate flex-1">
                      {p.title}
                    </span>
                    {p.status !== "active" && (
                      <span className="text-[10px] text-amber-400 shrink-0">
                        {p.status}
                      </span>
                    )}
                    {productId === p.id && (
                      <span className="text-[10px] text-indigo-300 shrink-0">
                        selecionado
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )
        )}
      </div>

      {/* Step 2 — period + audience */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300 flex items-center justify-center">
            2
          </span>
          <h2 className="text-sm font-semibold text-gray-200">
            Período da compra
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              De
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setAudience(null);
              }}
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Até
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setAudience(null);
              }}
              className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Atalhos
            </label>
            <div className="flex gap-1.5">
              {[30, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setFrom(isoDaysAgo(d));
                    setTo(new Date().toISOString().slice(0, 10));
                    setAudience(null);
                  }}
                  className="flex-1 px-2 py-2 bg-gray-800/60 hover:bg-gray-700/60 border border-white/8 rounded-lg text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={onlySubscribed}
            onChange={(e) => {
              setOnlySubscribed(e.target.checked);
              setAudience(null);
            }}
            className="accent-indigo-500"
          />
          <span className="text-xs text-gray-400">
            Enviar apenas para clientes inscritos em marketing (opt-in Shopify)
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!effectiveAccountId || !productId || audienceLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/8 rounded-lg text-xs text-gray-300 transition-colors"
          >
            {audienceLoading && <Spinner className="w-3 h-3" />}
            {audienceLoading ? "Buscando clientes..." : "Buscar clientes"}
          </button>
          <p className="text-[11px] text-gray-600">
            Exclui automaticamente pedidos cancelados, estornados e de teste.
          </p>
        </div>

        {audienceError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {audienceError}
          </p>
        )}

        {audience && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-100">
                  {audience.total}
                </span>
                <span className="text-xs text-gray-500">
                  cliente(s) elegíveis
                  {onlySubscribed &&
                    audience.totalBeforeConsentFilter > audience.total &&
                    ` · ${audience.totalBeforeConsentFilter - audience.total} sem opt-in ignorados`}
                </span>
              </div>
              {audience.members.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAudienceModal(true)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/8 rounded-md text-xs text-gray-300 transition-colors shrink-0"
                >
                  Ver todos
                </button>
              )}
            </div>
            {audience.members.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-white/6 rounded-lg divide-y divide-white/5">
                {audience.members.slice(0, 25).map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center justify-between gap-3 px-3 py-1.5"
                  >
                    <span className="text-xs text-gray-300 truncate">
                      {m.name}{" "}
                      <span className="text-gray-600">{m.email}</span>
                    </span>
                    <span className="text-[11px] text-gray-600 shrink-0">
                      {m.orderName} ·{" "}
                      {new Date(m.orderDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
                {audience.total > 25 && (
                  <button
                    type="button"
                    onClick={() => setShowAudienceModal(true)}
                    className="w-full text-left text-[11px] text-indigo-400 hover:text-indigo-300 px-3 py-1.5"
                  >
                    + {audience.total - 25} outros — ver lista completa
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3 — message */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300 flex items-center justify-center">
            3
          </span>
          <h2 className="text-sm font-semibold text-gray-200">Mensagem</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">
            Assunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex.: {{nome}}, o que achou do seu {{produto}}?"
            className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              Corpo
            </label>
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhancing || !body.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600/15 hover:bg-violet-600/25 disabled:opacity-40 border border-violet-500/20 rounded-md text-xs font-medium text-violet-300 transition-all"
            >
              {enhancing && <Spinner className="w-3 h-3" />}
              {enhancing ? "Aperfeiçoando..." : "Aperfeiçoar com IA"}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Olá {{nome}}, ..."
            className="w-full bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
          />
          <p className="text-[11px] text-gray-600">
            Variáveis disponíveis:{" "}
            <code className="text-gray-400">{"{{nome}}"}</code>{" "}
            <code className="text-gray-400">{"{{produto}}"}</code>{" "}
            <code className="text-gray-400">{"{{pedido}}"}</code>
          </p>
        </div>

        {/* Test send */}
        <div className="border-t border-white/5 pt-4 space-y-2">
          <label className="text-xs text-gray-500 uppercase tracking-wider">
            Enviar teste
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => {
                setTestEmail(e.target.value);
                setTestFeedback(null);
              }}
              placeholder={fallbackTestEmail || "seu@email.com"}
              className="flex-1 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleTestSend}
              disabled={
                testSending ||
                !effectiveAccountId ||
                !subject.trim() ||
                !body.trim() ||
                !(testEmail.trim() || fallbackTestEmail)
              }
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/8 rounded-lg text-xs text-gray-300 transition-colors shrink-0"
            >
              {testSending && <Spinner className="w-3 h-3" />}
              {testSending ? "Enviando teste..." : "Enviar e-mail de teste"}
            </button>
          </div>
          <p className="text-[11px] text-gray-600">
            O teste usa os dados do primeiro cliente da lista para preencher as
            variáveis e vai com o prefixo [TESTE] no assunto.
          </p>
          {testFeedback && (
            <p
              className={`text-xs rounded-lg px-3 py-2 border ${
                testFeedback.ok
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-red-400 bg-red-500/10 border-red-500/20"
              }`}
            >
              {testFeedback.message}
            </p>
          )}
        </div>
      </div>

      {/* Send */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-4 space-y-3">
        {progress && (
          <div
            className={`rounded-lg border px-4 py-3 space-y-2.5 ${
              progress.done
                ? progress.failedCount > 0
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
                : "border-indigo-500/20 bg-indigo-500/5"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {progress.done ? (
                  <svg
                    className={`w-4 h-4 ${progress.failedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}
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
                ) : (
                  <Spinner className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-sm font-medium text-gray-200">
                  {progress.done
                    ? "Campanha concluída"
                    : "Enviando campanha..."}
                </span>
              </div>
              <span className="text-xl font-semibold tabular-nums text-gray-100">
                {percent}%
              </span>
            </div>

            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.done
                    ? progress.failedCount > 0
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                    : "bg-indigo-500 animate-pulse"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-400 tabular-nums">
                {processed} de {progress.total} processados
              </span>
              <span className="text-emerald-400 tabular-nums">
                {progress.sentCount} enviados
              </span>
              {progress.failedCount > 0 && (
                <span className="text-red-400 tabular-nums">
                  {progress.failedCount} falhas
                </span>
              )}
              {!progress.done && (
                <span className="text-gray-600 tabular-nums">
                  {progress.total - processed} restantes
                </span>
              )}
            </div>

            {failures.length > 0 && (
              <div className="max-h-32 overflow-y-auto border border-white/6 rounded-lg divide-y divide-white/5">
                {failures.map((f) => (
                  <div key={f.email} className="px-3 py-1.5">
                    <p className="text-[11px] text-gray-300 truncate">
                      {f.email}
                    </p>
                    {f.error && (
                      <p className="text-[10px] text-red-400 truncate">
                        {f.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sendError && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <span>{sendError}</span>
            {progress && !progress.done && (
              <button
                type="button"
                onClick={handleResume}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 shrink-0"
              >
                Retomar
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] text-gray-600">
            {sending
              ? `Enviando ${processed} de ${progress?.total ?? 0} — não feche esta aba.`
              : audience
                ? `Pronto para disparar para ${audience.total} cliente(s).`
                : "Busque os clientes antes de disparar."}
          </p>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            {sending && <Spinner className="w-3 h-3" />}
            {sending
              ? `Enviando... ${percent}%`
              : progress?.done
                ? "Disparar novamente"
                : "Disparar campanha"}
          </button>
        </div>
      </div>

      {showAudienceModal && audience && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowAudienceModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-gray-100">
                  Clientes selecionados
                </h3>
                <p className="text-xs text-gray-500">
                  {audience.total} cliente(s) que compraram
                  {selectedProduct ? ` "${selectedProduct.title}"` : ""} entre{" "}
                  {new Date(`${from}T00:00:00`).toLocaleDateString("pt-BR")} e{" "}
                  {new Date(`${to}T00:00:00`).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAudienceModal(false)}
                className="text-gray-600 hover:text-gray-300 transition-colors shrink-0"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <input
                type="text"
                value={audienceSearch}
                onChange={(e) => setAudienceSearch(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou pedido..."
                className="flex-1 bg-gray-800/60 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleCopyEmails}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg text-xs text-gray-300 transition-colors shrink-0"
              >
                {copied ? "Copiado!" : "Copiar e-mails"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {audienceResults.length === 0 ? (
                <p className="text-xs text-gray-600 px-5 py-6 text-center">
                  Nenhum cliente corresponde ao filtro.
                </p>
              ) : (
                audienceResults.map((m, idx) => (
                  <div
                    key={m.email}
                    className="flex items-center justify-between gap-3 px-5 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] text-gray-700 tabular-nums w-8 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-200 truncate">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400">{m.orderName}</p>
                      <p className="text-[10px] text-gray-600">
                        {new Date(m.orderDate).toLocaleDateString("pt-BR")} ·{" "}
                        {m.quantity}x
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-white/5">
              <p className="text-[11px] text-gray-600">
                Exibindo {audienceResults.length} de {audience.total}
              </p>
              <button
                type="button"
                onClick={() => setShowAudienceModal(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg text-xs text-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
