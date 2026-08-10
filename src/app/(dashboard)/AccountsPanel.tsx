"use client";

import { useEffect, useRef, useState } from "react";
import { useStoreContext } from "./store-context";

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
  shopifyClientId: string | null;
  shopifyConnected: boolean;
  trackingUrlTemplate: string | null;
  logoUrl?: string | null;
  replyLanguage?: string;
  active: boolean;
  remarketingEnabled?: boolean;
  testEmail?: string | null;
  fantasyName?: string | null;
  recoveryLookbackDays?: number | null;
  couponCode?: string | null;
  discountPercent?: number | null;
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
  godaddy: { imapHost: "imap.secureserver.net", smtpHost: "smtpout.secureserver.net", imapPort: "993", smtpPort: "465" },
  hostinger: { imapHost: "imap.hostinger.com", smtpHost: "smtp.hostinger.com", imapPort: "993", smtpPort: "465" },
  other: { imapHost: "", smtpHost: "", imapPort: "993", smtpPort: "465" },
};

const EMPTY_ADD = {
  label: "", provider: "godaddy", email: "", password: "",
  imapHost: "imap.secureserver.net", imapPort: "993",
  smtpHost: "smtpout.secureserver.net", smtpPort: "465",
  shopifyDomain: "", shopifyClientId: "", shopifyClientSecret: "",
  trackingUrlTemplate: "", logoUrl: "", replyLanguage: "en", fantasyName: "",
};

type FormState = typeof EMPTY_ADD;

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all ${className}`}
    />
  );
}

function AccountForm({
  title, form, setForm, showPassword, setShowPassword,
  onSubmit, onCancel, saving, error, isEdit,
}: {
  title: string; form: FormState; setForm: (f: FormState) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void;
  saving: boolean; error: string; isEdit: boolean;
}) {
  function handleProviderChange(provider: string) {
    const d = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.other;
    setForm({ ...form, provider, ...d });
  }

  return (
    <form onSubmit={onSubmit} className="bg-gray-900/60 border border-indigo-500/20 rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-indigo-500/5">
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
      </div>

      <div className="p-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Nome da conta</FieldLabel>
            <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Loja Principal" />
          </div>
          <div>
            <FieldLabel>Provedor</FieldLabel>
            <select value={form.provider} onChange={(e) => handleProviderChange(e.target.value)} className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
              <option value="godaddy">GoDaddy</option>
              <option value="hostinger">Hostinger</option>
              <option value="other">Outro (Gmail, etc.)</option>
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Nome fantasia (para emails)</FieldLabel>
          <Input value={form.fantasyName} onChange={(e) => setForm({ ...form, fantasyName: e.target.value })} placeholder="Ex: Kenbi™ — nome exibido nos e-mails de remarketing" />
          <p className="text-xs text-gray-600 mt-1.5">Nome público da loja exibido nos e-mails. Se vazio, usa o nome da conta.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Idioma das respostas</FieldLabel>
            <select value={form.replyLanguage} onChange={(e) => setForm({ ...form, replyLanguage: e.target.value })} className="w-full bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="nl">Nederlands</option>
              <option value="ja">日本語</option>
              <option value="zh">中文（简体）</option>
            </select>
            <p className="text-xs text-gray-600 mt-1.5">Idioma em que o ReplyFlow vai responder os clientes desta conta.</p>
          </div>
        </div>

        <div>
          <FieldLabel>Logo da loja (ícone)</FieldLabel>
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-gray-800 border border-white/6 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-800 border border-white/6 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-white/6 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-white/12 cursor-pointer transition-all">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {form.logoUrl ? "Trocar logo" : "Carregar logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 300 * 1024) { alert("Imagem muito grande. Máximo 300KB."); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => setForm({ ...form, logoUrl: ev.target?.result as string });
                  reader.readAsDataURL(file);
                }} />
              </label>
              <p className="text-xs text-gray-600 mt-1">PNG, JPG ou SVG — máx. 300KB. Recomendado: 64×64px.</p>
            </div>
            {form.logoUrl && (
              <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="text-gray-600 hover:text-red-400 transition-colors shrink-0" title="Remover logo">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>E-mail</FieldLabel>
            <Input required={!isEdit} type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="suporte@loja.com" />
          </div>
          <div>
            <FieldLabel>Senha {isEdit && <span className="text-gray-600">(vazio = manter atual)</span>}</FieldLabel>
            <div className="relative">
              <Input required={!isEdit} type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Configuração de servidor</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3"><FieldLabel>IMAP Host</FieldLabel><Input value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} /></div>
            <div><FieldLabel>Porta</FieldLabel><Input value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: e.target.value })} /></div>
            <div className="col-span-3"><FieldLabel>SMTP Host</FieldLabel><Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} /></div>
            <div><FieldLabel>Porta</FieldLabel><Input value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} /></div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.337 4.27L14.79 4.1c-.06-.016-.12-.03-.18-.042-.07-.016-.14-.027-.21-.036a2.51 2.51 0 00-.25-.022c-.085-.004-.17-.006-.255-.005-.48.004-.95.12-1.375.337-.425.218-.787.535-1.055.922-.268.388-.427.834-.463 1.296-.036.463.053.927.258 1.345.205.42.52.775.91 1.026.39.25.838.39 1.295.403.457.014.91-.099 1.315-.326.405-.228.74-.566.972-.977.233-.41.355-.877.352-1.35a2.79 2.79 0 00-.404-1.47 2.812 2.812 0 00-1.064-1.027zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
            <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Shopify (opcional)</p>
          </div>

          <div className="mb-4 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4 text-xs text-gray-400 space-y-2.5">
            <p className="font-medium text-emerald-400">Como criar seu App no Dev Dashboard da Shopify:</p>
            <ol className="space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">1.</span><span>Acesse <span className="text-gray-300 font-mono">admin.shopify.com</span> → Configurações → Apps → <strong className="text-gray-300">Desenvolver apps</strong></span></li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">2.</span><span>Clique em <strong className="text-gray-300">Criar app</strong> → dê um nome (ex: ReplyFlow) → desmarque <em>Embed app in Shopify admin</em></span></li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">3.</span><span>Em <strong className="text-gray-300">App URL</strong> cole: <code className="bg-gray-800 px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}/api/shopify/callback</code></span></li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">4.</span><span>Em <strong className="text-gray-300">Access scopes</strong> cole: <code className="bg-gray-800 px-1 rounded">read_orders,read_customers</code></span></li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">5.</span><span>Em <strong className="text-gray-300">Settings</strong> copie o <em>Client ID</em> e <em>Client secret</em> e cole nos campos abaixo</span></li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">6.</span><span>Salve a conta e clique em <strong className="text-gray-300">Conectar Shopify</strong> para autorizar</span></li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FieldLabel>Domínio da loja</FieldLabel>
              <Input value={form.shopifyDomain} onChange={(e) => setForm({ ...form, shopifyDomain: e.target.value })} placeholder="minhaloja.myshopify.com" />
            </div>
            <div>
              <FieldLabel>Client ID</FieldLabel>
              <Input value={form.shopifyClientId} onChange={(e) => setForm({ ...form, shopifyClientId: e.target.value })} placeholder="abc123def456..." autoComplete="off" />
            </div>
            <div>
              <FieldLabel>Client Secret {isEdit && <span className="text-gray-600">(vazio = manter)</span>}</FieldLabel>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={form.shopifyClientSecret} onChange={(e) => setForm({ ...form, shopifyClientSecret: e.target.value })} className="pr-10" placeholder="shpss_..." autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>URL de rastreio</FieldLabel>
          <Input value={form.trackingUrlTemplate} onChange={(e) => setForm({ ...form, trackingUrlTemplate: e.target.value })} placeholder="https://minhaloja.shop/apps/17TRACK?nums={{tracking_number}}" />
          <p className="text-xs text-gray-600 mt-1.5">Use <code className="bg-gray-800 px-1 rounded text-gray-400">{"{{tracking_number}}"}</code> como marcador. Se vazio, usa o link padrão da Shopify.</p>
        </div>
      </div>

      <div className="flex gap-3 px-5 py-4 border-t border-white/5 bg-black/20">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0">
          {saving ? (
            <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Salvando...</>
          ) : isEdit ? "Salvar alterações" : "Salvar conta"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/6 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-all">Cancelar</button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialView: "list" | "add";
  initialEditId?: string | null;
}

export default function AccountsPanel({ initialView, initialEditId }: Props) {
  const { refreshAccounts } = useStoreContext();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  // subView drives which screen is shown: list, the add form, or the edit form
  const [subView, setSubView] = useState<"list" | "add" | "edit">(
    initialView === "add" ? "add" : "list",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<FormState>({ ...EMPTY_ADD });
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_ADD });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; data?: string; error?: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [remarketingTogglingId, setRemarketingTogglingId] = useState<string | null>(null);
  const [remarketingEditId, setRemarketingEditId] = useState<string | null>(null);
  const [remarketingTestInput, setRemarketingTestInput] = useState("");
  const [recoveryDaysEditId, setRecoveryDaysEditId] = useState<string | null>(null);
  const [recoveryDaysInput, setRecoveryDaysInput] = useState("7");
  const [couponEditId, setCouponEditId] = useState<string | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState("CART20");
  const [couponPercentInput, setCouponPercentInput] = useState("20");
  const [couponInstructionsId, setCouponInstructionsId] = useState<string | null>(null);

  const pendingEditId = useRef(initialEditId ?? null);

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      const accs: Account[] = data.accounts;
      setAccounts(accs);
      if (pendingEditId.current) {
        const acc = accs.find((a) => a.id === pendingEditId.current);
        if (acc) openEdit(acc);
        pendingEditId.current = null;
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(acc: Account) {
    setEditingId(acc.id);
    setEditForm({
      label: acc.label, provider: acc.provider, email: acc.email, password: "",
      imapHost: acc.imapHost, imapPort: String(acc.imapPort),
      smtpHost: acc.smtpHost, smtpPort: String(acc.smtpPort),
      shopifyDomain: acc.shopifyDomain ?? "", shopifyClientId: acc.shopifyClientId ?? "",
      shopifyClientSecret: "", trackingUrlTemplate: acc.trackingUrlTemplate ?? "",
      logoUrl: acc.logoUrl ?? "", replyLanguage: acc.replyLanguage ?? "en",
      fantasyName: acc.fantasyName ?? "",
    });
    setShowEditPassword(false);
    setError("");
    setSubView("edit");
  }

  function goToList() {
    setSubView("list");
    setEditingId(null);
    setError("");
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addForm,
        imapPort: addForm.imapPort ? parseInt(addForm.imapPort) : undefined,
        smtpPort: addForm.smtpPort ? parseInt(addForm.smtpPort) : undefined,
        shopifyDomain: addForm.shopifyDomain || undefined,
        shopifyClientId: addForm.shopifyClientId || undefined,
        shopifyClientSecret: addForm.shopifyClientSecret || undefined,
        trackingUrlTemplate: addForm.trackingUrlTemplate || undefined,
        logoUrl: addForm.logoUrl || null,
        fantasyName: addForm.fantasyName || null,
      }),
    });
    if (res.ok) {
      setAddForm({ ...EMPTY_ADD });
      await loadAccounts();
      refreshAccounts();
      goToList();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar conta");
    }
    setSaving(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true); setError("");
    const body: Record<string, unknown> = {
      label: editForm.label, provider: editForm.provider,
      imapHost: editForm.imapHost, imapPort: editForm.imapPort ? parseInt(editForm.imapPort) : undefined,
      smtpHost: editForm.smtpHost, smtpPort: editForm.smtpPort ? parseInt(editForm.smtpPort) : undefined,
      shopifyDomain: editForm.shopifyDomain || null, shopifyClientId: editForm.shopifyClientId || null,
      trackingUrlTemplate: editForm.trackingUrlTemplate || null, logoUrl: editForm.logoUrl || null,
      replyLanguage: editForm.replyLanguage || "en", fantasyName: editForm.fantasyName || null,
    };
    if (editForm.password) body.password = editForm.password;
    if (editForm.shopifyClientSecret) body.shopifyClientSecret = editForm.shopifyClientSecret;
    const res = await fetch(`/api/accounts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await loadAccounts();
      refreshAccounts();
      goToList();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao editar conta");
    }
    setSaving(false);
  }

  async function handleDisconnectShopify(id: string) {
    if (!confirm("Desconectar a integração Shopify desta conta? O token OAuth será removido.")) return;
    setDisconnectingId(id);
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disconnectShopify: true }) });
    setDisconnectingId(null);
    loadAccounts();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    loadAccounts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta conta?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await loadAccounts();
    refreshAccounts();
  }

  async function handleToggleRemarketing(id: string, current: boolean) {
    setRemarketingTogglingId(id);
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remarketingEnabled: !current }) });
    setRemarketingTogglingId(null);
    loadAccounts();
  }

  async function handleSaveTestEmail(id: string) {
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testEmail: remarketingTestInput.trim() || null }) });
    setRemarketingEditId(null);
    loadAccounts();
  }

  async function handleSaveRecoveryDays(id: string) {
    const days = parseInt(recoveryDaysInput, 10);
    if (!days || days < 1 || days > 365) return;
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoveryLookbackDays: days }) });
    setRecoveryDaysEditId(null);
    loadAccounts();
  }

  async function handleSaveCoupon(id: string) {
    const pct = parseInt(couponPercentInput, 10);
    if (!couponCodeInput.trim() || !pct || pct < 1 || pct > 100) return;
    await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: couponCodeInput.trim().toUpperCase(), discountPercent: pct }) });
    setCouponEditId(null);
    loadAccounts();
  }

  async function handleShopifyTest(accountId: string) {
    if (!testQuery.trim()) return;
    setTestLoading(true); setTestResult(null);
    const res = await fetch("/api/shopify/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, query: testQuery.trim() }) });
    const data = await res.json();
    setTestResult(res.ok ? { success: true, data: data.result } : { success: false, error: data.error });
    setTestLoading(false);
  }

  // ── Add sub-view ──────────────────────────────────────────────────────────
  if (subView === "add") {
    return (
      <div className="space-y-4">
        <button
          onClick={goToList}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para lista
        </button>
        <AccountForm
          title="Nova conta" form={addForm} setForm={setAddForm}
          showPassword={showAddPassword} setShowPassword={setShowAddPassword}
          onSubmit={handleAddSubmit} onCancel={goToList}
          saving={saving} error={error} isEdit={false}
        />
      </div>
    );
  }

  // ── Edit sub-view ──────────────────────────────────────────────────────────
  if (subView === "edit") {
    const editingAcc = accounts.find((a) => a.id === editingId);
    return (
      <div className="space-y-4">
        <button
          onClick={goToList}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para lista
        </button>
        {loading || !editingAcc ? (
          <div className="flex items-center justify-center py-12 text-gray-600">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Carregando...
          </div>
        ) : (
          <AccountForm
            title={`Editando: ${editingAcc.label}`} form={editForm} setForm={setEditForm}
            showPassword={showEditPassword} setShowPassword={setShowEditPassword}
            onSubmit={handleEditSubmit} onCancel={goToList}
            saving={saving} error={error} isEdit={true}
          />
        )}
      </div>
    );
  }

  // ── List sub-view (default) ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500">Gerencie as caixas IMAP/SMTP conectadas ao ReplyFlow</p>
        <button
          onClick={() => { setAddForm({ ...EMPTY_ADD }); setError(""); setSubView("add"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-px active:translate-y-0 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova conta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-600">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando...
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-white/6 rounded-2xl bg-gray-900/30 text-gray-600">
          <svg className="w-10 h-10 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Nenhuma conta cadastrada</p>
          <p className="text-xs text-gray-600 mt-1">Clique em "Nova conta" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className={`bg-gray-900/50 border rounded-xl overflow-hidden transition-colors ${acc.active ? "border-white/6" : "border-white/4 opacity-70"}`}>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${acc.active ? "bg-indigo-500/10" : "bg-gray-800"}`}>
                  {acc.logoUrl ? (
                    <img src={acc.logoUrl} alt={acc.label} className="w-full h-full object-contain" />
                  ) : (
                    <svg className={`w-5 h-5 ${acc.active ? "text-indigo-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-100 text-sm">{acc.label}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-800/80 border border-white/6 text-gray-500 rounded-md">{PROVIDER_LABELS[acc.provider] ?? acc.provider}</span>
                    {!acc.active && <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">Inativa</span>}
                    {acc.shopifyConnected && <span className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">Shopify ✓</span>}
                    {acc.shopifyClientId && !acc.shopifyConnected && <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">Shopify: pendente</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{acc.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">IMAP {acc.imapHost}:{acc.imapPort} · SMTP {acc.smtpHost}:{acc.smtpPort}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {acc.shopifyClientId && (
                    <>
                      <a href={`/api/shopify/install?accountId=${acc.id}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                        {acc.shopifyConnected ? "Reconectar" : "Conectar Shopify"}
                      </a>
                      {acc.shopifyConnected && (
                        <>
                          <button onClick={() => { setTestingId(testingId === acc.id ? null : acc.id); setTestQuery(""); setTestResult(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${testingId === acc.id ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-gray-800/60 text-gray-400 border-white/6 hover:text-gray-200 hover:bg-gray-800"}`}>
                            Testar
                          </button>
                          <button onClick={() => handleDisconnectShopify(acc.id)} disabled={disconnectingId === acc.id} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 disabled:opacity-50 transition-colors">
                            {disconnectingId === acc.id ? "..." : "Desconectar"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  <button onClick={() => openEdit(acc)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-white/6 hover:text-gray-200 hover:bg-gray-800 transition-colors">Editar</button>
                  <button onClick={() => handleToggle(acc.id, acc.active)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${acc.active ? "bg-gray-800/60 text-gray-500 border-white/6 hover:text-gray-200 hover:bg-gray-800" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"}`}>
                    {acc.active ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Remover</button>
                </div>
              </div>

              {acc.shopifyConnected && (
                <div className="border-t border-white/5 bg-black/10">
                  {/* Toggle row */}
                  <div className="flex items-center gap-4 px-5 py-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => handleToggleRemarketing(acc.id, acc.remarketingEnabled ?? false)} disabled={remarketingTogglingId === acc.id} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${acc.remarketingEnabled ? "bg-indigo-600" : "bg-gray-700"}`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${acc.remarketingEnabled ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs text-gray-400">Recuperação de carrinho{!acc.remarketingEnabled && <span className="ml-1 text-gray-600">(desabilitado)</span>}</span>
                    </div>
                    {acc.remarketingEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 shrink-0">Janela:</span>
                        <input type="number" min="1" max="365" value={recoveryDaysEditId === acc.id ? recoveryDaysInput : String(acc.recoveryLookbackDays ?? 7)} onFocus={() => { setRecoveryDaysEditId(acc.id); setRecoveryDaysInput(String(acc.recoveryLookbackDays ?? 7)); }} onChange={(e) => setRecoveryDaysInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveRecoveryDays(acc.id)} className="bg-gray-800/60 border border-white/6 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-14 text-center" />
                        <span className="text-xs text-gray-600">dias</span>
                        {recoveryDaysEditId === acc.id && <button type="button" onClick={() => handleSaveRecoveryDays(acc.id)} className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shrink-0">Salvar</button>}
                      </div>
                    )}
                    {acc.remarketingEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 shrink-0">Teste:</span>
                        <input value={remarketingEditId === acc.id ? remarketingTestInput : (acc.testEmail ?? "")} onFocus={() => { setRemarketingEditId(acc.id); setRemarketingTestInput(acc.testEmail ?? ""); }} onChange={(e) => setRemarketingTestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveTestEmail(acc.id)} className="bg-gray-800/60 border border-white/6 rounded-md px-2.5 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-44" placeholder="e-mail de teste" />
                        {remarketingEditId === acc.id && <button type="button" onClick={() => handleSaveTestEmail(acc.id)} className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shrink-0">Salvar</button>}
                        {acc.testEmail && remarketingEditId !== acc.id && <span className="text-xs text-amber-400 font-mono">{acc.testEmail}</span>}
                        {!acc.testEmail && remarketingEditId !== acc.id && <span className="text-xs text-gray-600">todos</span>}
                      </div>
                    )}
                  </div>

                  {/* Coupon configuration */}
                  {acc.remarketingEnabled && (
                    <div className="px-5 py-3 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM14.25 15h.008v.008h-.008V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-300">Cupom de desconto</span>
                          <span className="text-xs text-gray-600">— incluído no e-mail de recuperação</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCouponInstructionsId(couponInstructionsId === acc.id ? null : acc.id); }}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                          </svg>
                          Como criar no Shopify
                        </button>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">Código:</span>
                          <input
                            value={couponEditId === acc.id ? couponCodeInput : (acc.couponCode ?? "CART20")}
                            onFocus={() => { setCouponEditId(acc.id); setCouponCodeInput(acc.couponCode ?? "CART20"); setCouponPercentInput(String(acc.discountPercent ?? 20)); }}
                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCoupon(acc.id)}
                            className="bg-gray-800/60 border border-white/6 rounded-md px-2.5 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500/50 w-28 uppercase"
                            placeholder="CART20"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">Desconto:</span>
                          <input
                            type="number" min="1" max="100"
                            value={couponEditId === acc.id ? couponPercentInput : String(acc.discountPercent ?? 20)}
                            onFocus={() => { setCouponEditId(acc.id); setCouponCodeInput(acc.couponCode ?? "CART20"); setCouponPercentInput(String(acc.discountPercent ?? 20)); }}
                            onChange={(e) => setCouponPercentInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCoupon(acc.id)}
                            className="bg-gray-800/60 border border-white/6 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 w-14 text-center"
                          />
                          <span className="text-xs text-gray-600">%</span>
                        </div>
                        {couponEditId === acc.id && (
                          <button type="button" onClick={() => handleSaveCoupon(acc.id)} className="text-xs px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md transition-colors shrink-0">Salvar</button>
                        )}
                        {couponEditId !== acc.id && (
                          <span className="text-xs text-yellow-400 font-mono">{acc.couponCode ?? "CART20"} · {acc.discountPercent ?? 20}% off</span>
                        )}
                      </div>

                      {/* Shopify coupon creation instructions */}
                      {couponInstructionsId === acc.id && (
                        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-4 text-xs text-gray-400 space-y-2.5 mt-1">
                          <p className="font-medium text-yellow-400">Como criar o cupom <span className="font-mono">{acc.couponCode ?? "CART20"}</span> no Shopify:</p>
                          <ol className="space-y-1.5 list-none">
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">1.</span><span>Acesse <span className="text-gray-300 font-mono">admin.shopify.com</span> → <strong className="text-gray-300">Descontos</strong> → clique em <strong className="text-gray-300">Criar desconto</strong></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">2.</span><span>Selecione <strong className="text-gray-300">Valor de desconto no pedido</strong> → tipo <strong className="text-gray-300">Código</strong></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">3.</span><span>No campo <strong className="text-gray-300">Código de desconto</strong> digite: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-yellow-300 font-mono">{acc.couponCode ?? "CART20"}</code></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">4.</span><span>Em <strong className="text-gray-300">Valor do desconto</strong>: selecione <em>Porcentagem</em> e digite <code className="bg-gray-800 px-1.5 py-0.5 rounded text-yellow-300">{acc.discountPercent ?? 20}</code></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">5.</span><span>Em <strong className="text-gray-300">Elegibilidade</strong>: <em>Todos os clientes</em></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">6.</span><span>Em <strong className="text-gray-300">Máximo de usos</strong>: marque <em>Limitar a um uso por cliente</em></span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">7.</span><span>Em <strong className="text-gray-300">Combinações</strong>: habilite <em>Descontos de produto</em> (para acumular com promoções de item)</span></li>
                            <li className="flex gap-2"><span className="text-yellow-500 font-bold shrink-0">8.</span><span>Clique em <strong className="text-gray-300">Salvar desconto</strong> — pronto! O ReplyFlow usará este código automaticamente.</span></li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {testingId === acc.id && (
                <div className="px-5 py-4 border-t border-white/5 bg-black/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-violet-400 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    Testar integração Shopify
                  </div>
                  <div className="flex gap-2">
                    <input value={testQuery} onChange={(e) => setTestQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleShopifyTest(acc.id)} className="flex-1 bg-gray-800/60 border border-white/6 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all" placeholder="Número do pedido (#1234) ou e-mail do cliente" />
                    <button onClick={() => handleShopifyTest(acc.id)} disabled={testLoading || !testQuery.trim()} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-all">
                      {testLoading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                      {testLoading ? "Buscando..." : "Buscar"}
                    </button>
                  </div>
                  {testResult && (testResult.success ? (
                    <pre className="bg-gray-950 border border-white/6 rounded-lg p-3 text-xs text-emerald-300 whitespace-pre-wrap overflow-auto max-h-64">{testResult.data}</pre>
                  ) : (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      {testResult.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
