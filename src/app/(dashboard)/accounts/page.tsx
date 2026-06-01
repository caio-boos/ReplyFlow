"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ShopifyParamsReader({
  onMessage,
}: {
  onMessage: (msg: { type: "success" | "error"; reason?: string }) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const shopify = searchParams.get("shopify");
    if (!shopify) return;
    if (shopify === "connected") {
      onMessage({ type: "success" });
    } else if (shopify === "error") {
      onMessage({
        type: "error",
        reason: searchParams.get("reason") ?? undefined,
      });
    }
    router.replace("/accounts");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Account {
  id: string;
  label: string;
  provider: string;
  email: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  shopifyDomain: string | null;
  active: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  godaddy: "GoDaddy",
  hostinger: "Hostinger",
  other: "Outro",
};

const PROVIDER_DEFAULTS: Record<
  string,
  { imapHost: string; smtpHost: string; imapPort: string; smtpPort: string }
> = {
  godaddy: {
    imapHost: "imap.secureserver.net",
    smtpHost: "smtpout.secureserver.net",
    imapPort: "993",
    smtpPort: "465",
  },
  hostinger: {
    imapHost: "imap.hostinger.com",
    smtpHost: "smtp.hostinger.com",
    imapPort: "993",
    smtpPort: "465",
  },
  other: { imapHost: "", smtpHost: "", imapPort: "993", smtpPort: "465" },
};

const EMPTY_ADD = {
  label: "",
  provider: "godaddy",
  email: "",
  password: "",
  imapHost: "imap.secureserver.net",
  imapPort: "993",
  smtpHost: "smtpout.secureserver.net",
  smtpPort: "465",
  shopifyDomain: "",
  shopifyToken: "",
};

type FormState = typeof EMPTY_ADD;

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  ) : (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500 mb-1.5">
      {children}
    </label>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all ${className}`}
    />
  );
}

function AccountForm({
  title,
  form,
  setForm,
  showPassword,
  setShowPassword,
  onSubmit,
  onCancel,
  saving,
  error,
  isEdit,
}: {
  title: string;
  form: FormState;
  setForm: (f: FormState) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isEdit: boolean;
}) {
  function handleProviderChange(provider: string) {
    const d = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.other;
    setForm({ ...form, provider, ...d });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-gray-900/60 border border-indigo-500/20 rounded-xl overflow-hidden mb-4"
    >
      {/* Form header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-indigo-500/5">
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
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
      </div>

      <div className="p-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
            <svg
              className="w-4 h-4 shrink-0"
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
            {error}
          </div>
        )}

        {/* Row 1: label + provider */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Nome da conta</FieldLabel>
            <Input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Loja Principal"
            />
          </div>
          <div>
            <FieldLabel>Provedor</FieldLabel>
            <select
              value={form.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            >
              <option value="godaddy">GoDaddy</option>
              <option value="hostinger">Hostinger</option>
              <option value="other">Outro (Gmail, etc.)</option>
            </select>
          </div>
        </div>

        {/* Row 2: email + password */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>E-mail</FieldLabel>
            <Input
              required={!isEdit}
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="suporte@loja.com"
            />
          </div>
          <div>
            <FieldLabel>
              Senha{" "}
              {isEdit && (
                <span className="text-gray-600">(vazio = manter atual)</span>
              )}
            </FieldLabel>
            <div className="relative">
              <Input
                required={!isEdit}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
              >
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: IMAP + SMTP */}
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
            Configuração de servidor
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <FieldLabel>IMAP Host</FieldLabel>
              <Input
                value={form.imapHost}
                onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Porta</FieldLabel>
              <Input
                value={form.imapPort}
                onChange={(e) => setForm({ ...form, imapPort: e.target.value })}
              />
            </div>
            <div className="col-span-3">
              <FieldLabel>SMTP Host</FieldLabel>
              <Input
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Porta</FieldLabel>
              <Input
                value={form.smtpPort}
                onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Shopify section */}
        <div className="border-t border-white/5 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-3.5 h-3.5 text-emerald-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.337 4.27L14.79 4.1c-.06-.016-.12-.03-.18-.042-.07-.016-.14-.027-.21-.036a2.51 2.51 0 00-.25-.022c-.085-.004-.17-.006-.255-.005-.48.004-.95.12-1.375.337-.425.218-.787.535-1.055.922-.268.388-.427.834-.463 1.296-.036.463.053.927.258 1.345.205.42.52.775.91 1.026.39.25.838.39 1.295.403.457.014.91-.099 1.315-.326.405-.228.74-.566.972-.977.233-.41.355-.877.352-1.35a2.79 2.79 0 00-.404-1.47 2.812 2.812 0 00-1.064-1.027zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
            <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">
              Shopify (opcional)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Domínio da loja</FieldLabel>
              <Input
                value={form.shopifyDomain}
                onChange={(e) =>
                  setForm({ ...form, shopifyDomain: e.target.value })
                }
                placeholder="minhaloja.myshopify.com"
              />
            </div>
            <div>
              <FieldLabel>
                Admin API Token{" "}
                {isEdit && (
                  <span className="text-gray-600">(vazio = manter)</span>
                )}
              </FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.shopifyToken}
                  onChange={(e) =>
                    setForm({ ...form, shopifyToken: e.target.value })
                  }
                  className="pr-10"
                  placeholder="shpat_..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-white/5 bg-black/20">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
        >
          {saving ? (
            <>
              <svg
                className="w-3.5 h-3.5 animate-spin"
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
              Salvando...
            </>
          ) : isEdit ? (
            "Salvar alterações"
          ) : (
            "Salvar conta"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/6 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<FormState>({ ...EMPTY_ADD });
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_ADD });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: string;
    error?: string;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [shopifyMsg, setShopifyMsg] = useState<{
    type: "success" | "error";
    reason?: string;
  } | null>(null);

  async function handleShopifyTest(accountId: string) {
    if (!testQuery.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    const res = await fetch("/api/shopify/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, query: testQuery.trim() }),
    });
    const data = await res.json();
    setTestResult(
      res.ok
        ? { success: true, data: data.result }
        : { success: false, error: data.error },
    );
    setTestLoading(false);
  }

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function handleEditOpen(acc: Account) {
    setEditingId(acc.id);
    setEditForm({
      label: acc.label,
      provider: acc.provider,
      email: acc.email,
      password: "",
      imapHost: acc.imapHost,
      imapPort: String(acc.imapPort),
      smtpHost: acc.smtpHost,
      smtpPort: String(acc.smtpPort),
      shopifyDomain: acc.shopifyDomain ?? "",
      shopifyToken: "",
    });
    setShowEditPassword(false);
    setShowAddForm(false);
    setError("");
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addForm,
        imapPort: addForm.imapPort ? parseInt(addForm.imapPort) : undefined,
        smtpPort: addForm.smtpPort ? parseInt(addForm.smtpPort) : undefined,
        shopifyDomain: addForm.shopifyDomain || undefined,
        shopifyToken: addForm.shopifyToken || undefined,
      }),
    });
    if (res.ok) {
      setShowAddForm(false);
      setAddForm({ ...EMPTY_ADD });
      loadAccounts();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar conta");
    }
    setSaving(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {
      label: editForm.label,
      imapHost: editForm.imapHost,
      imapPort: editForm.imapPort ? parseInt(editForm.imapPort) : undefined,
      smtpHost: editForm.smtpHost,
      smtpPort: editForm.smtpPort ? parseInt(editForm.smtpPort) : undefined,
      shopifyDomain: editForm.shopifyDomain || null,
    };
    if (editForm.password) body.password = editForm.password;
    if (editForm.shopifyToken) body.shopifyToken = editForm.shopifyToken;
    const res = await fetch(`/api/accounts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditingId(null);
      loadAccounts();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao editar conta");
    }
    setSaving(false);
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    loadAccounts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta conta?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <Suspense fallback={null}>
        <ShopifyParamsReader onMessage={setShopifyMsg} />
      </Suspense>

      {/* Shopify OAuth feedback */}
      {shopifyMsg && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border ${
            shopifyMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {shopifyMsg.type === "success" ? (
              <svg
                className="w-4 h-4 shrink-0"
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
            ) : (
              <svg
                className="w-4 h-4 shrink-0"
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
            )}
            {shopifyMsg.type === "success"
              ? "Shopify conectado com sucesso!"
              : `Erro ao conectar Shopify${shopifyMsg.reason ? `: ${shopifyMsg.reason.replace(/_/g, " ")}` : ""}`}
          </div>
          <button
            onClick={() => setShopifyMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">
            Contas de E-mail
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gerencie as caixas IMAP/SMTP conectadas ao ReplyFlow
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setError("");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Adicionar conta
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AccountForm
          title="Nova conta"
          form={addForm}
          setForm={setAddForm}
          showPassword={showAddPassword}
          setShowPassword={setShowAddPassword}
          onSubmit={handleAddSubmit}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
          error={error}
          isEdit={false}
        />
      )}

      {/* Accounts list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
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
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/6 rounded-2xl bg-gray-900/30 text-gray-600">
          <svg
            className="w-10 h-10 mb-3 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            Nenhuma conta cadastrada
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Adicione sua primeira conta acima para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id}>
              {editingId === acc.id ? (
                <AccountForm
                  title={`Editando: ${acc.label}`}
                  form={editForm}
                  setForm={setEditForm}
                  showPassword={showEditPassword}
                  setShowPassword={setShowEditPassword}
                  onSubmit={handleEditSubmit}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  error={error}
                  isEdit={true}
                />
              ) : (
                <div
                  className={`bg-gray-900/50 border rounded-xl overflow-hidden transition-colors ${acc.active ? "border-white/6" : "border-white/4 opacity-70"}`}
                >
                  {/* Account card body */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${acc.active ? "bg-indigo-500/10" : "bg-gray-800"}`}
                    >
                      <svg
                        className={`w-5 h-5 ${acc.active ? "text-indigo-400" : "text-gray-600"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-100 text-sm">
                          {acc.label}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-800/80 border border-white/6 text-gray-500 rounded-md">
                          {PROVIDER_LABELS[acc.provider] ?? acc.provider}
                        </span>
                        {!acc.active && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                            Inativa
                          </span>
                        )}
                        {acc.shopifyDomain && (
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                            Shopify
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {acc.email}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 font-mono">
                        IMAP {acc.imapHost}:{acc.imapPort} · SMTP {acc.smtpHost}
                        :{acc.smtpPort}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {acc.shopifyDomain && (
                        <>
                          <a
                            href={`/api/shopify/install?accountId=${acc.id}&shop=${acc.shopifyDomain}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            Reconectar
                          </a>
                          <button
                            onClick={() => {
                              setTestingId(
                                testingId === acc.id ? null : acc.id,
                              );
                              setTestQuery("");
                              setTestResult(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              testingId === acc.id
                                ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                                : "bg-gray-800/60 text-gray-400 border-white/6 hover:text-gray-200 hover:bg-gray-800"
                            }`}
                          >
                            Testar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditOpen(acc)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-white/6 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(acc.id, acc.active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          acc.active
                            ? "bg-gray-800/60 text-gray-500 border-white/6 hover:text-gray-200 hover:bg-gray-800"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {acc.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  {/* Shopify test panel */}
                  {testingId === acc.id && (
                    <div className="px-5 py-4 border-t border-white/5 bg-black/20 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-violet-400 font-medium">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                          />
                        </svg>
                        Testar integração Shopify
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={testQuery}
                          onChange={(e) => setTestQuery(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleShopifyTest(acc.id)
                          }
                          className="flex-1 bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
                          placeholder="Número do pedido (#1234) ou e-mail do cliente"
                        />
                        <button
                          onClick={() => handleShopifyTest(acc.id)}
                          disabled={testLoading || !testQuery.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-all"
                        >
                          {testLoading ? (
                            <svg
                              className="w-3.5 h-3.5 animate-spin"
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
                          ) : null}
                          {testLoading ? "Buscando..." : "Buscar"}
                        </button>
                      </div>
                      {testResult &&
                        (testResult.success ? (
                          <pre className="bg-gray-950 border border-white/6 rounded-lg p-3 text-xs text-emerald-300 whitespace-pre-wrap overflow-auto max-h-64">
                            {testResult.data}
                          </pre>
                        ) : (
                          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400">
                            <svg
                              className="w-3.5 h-3.5 shrink-0 mt-0.5"
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
                            {testResult.error}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
