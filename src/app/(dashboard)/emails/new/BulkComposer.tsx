"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../../ConfirmDialog";

export interface BulkAccount {
  id: string;
  email: string;
  label?: string;
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
  sample: AudienceMember[];
}

interface Progress {
  campaignId: string;
  total: number;
  sentCount: number;
  failedCount: number;
  done: boolean;
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

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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
            {audience.sample.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-white/6 rounded-lg divide-y divide-white/5">
                {audience.sample.map((m) => (
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
                {audience.total > audience.sample.length && (
                  <p className="text-[11px] text-gray-600 px-3 py-1.5">
                    + {audience.total - audience.sample.length} outros...
                  </p>
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
      </div>

      {/* Send */}
      <div className="bg-gray-900/60 border border-white/6 rounded-xl px-5 py-4 space-y-3">
        {progress && (
          <div className="space-y-1.5">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{
                  width: `${
                    progress.total > 0
                      ? ((progress.sentCount + progress.failedCount) /
                          progress.total) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {progress.sentCount + progress.failedCount} de {progress.total}{" "}
              processados · {progress.sentCount} enviados
              {progress.failedCount > 0 && (
                <span className="text-red-400">
                  {" "}
                  · {progress.failedCount} falhas
                </span>
              )}
              {progress.done && (
                <span className="text-emerald-400"> · concluído</span>
              )}
            </p>
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
            {audience
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
            {sending ? "Enviando..." : "Disparar campanha"}
          </button>
        </div>
      </div>
    </div>
  );
}
