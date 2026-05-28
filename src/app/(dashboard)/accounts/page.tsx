"use client";

import { useEffect, useState } from "react";

interface Account {
  id: string;
  label: string;
  provider: string;
  email: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  active: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  godaddy: "GoDaddy",
  hostinger: "Hostinger",
  other: "Outro",
};

const PROVIDER_DEFAULTS: Record<string, { imapHost: string; smtpHost: string; imapPort: string; smtpPort: string }> = {
  godaddy: { imapHost: "imap.secureserver.net", smtpHost: "smtpout.secureserver.net", imapPort: "993", smtpPort: "465" },
  hostinger: { imapHost: "imap.hostinger.com", smtpHost: "smtp.hostinger.com", imapPort: "993", smtpPort: "465" },
  other: { imapHost: "", smtpHost: "", imapPort: "993", smtpPort: "465" },
};

const EMPTY_ADD = {
  label: "", provider: "godaddy", email: "", password: "",
  imapHost: "imap.secureserver.net", imapPort: "993",
  smtpHost: "smtpout.secureserver.net", smtpPort: "465",
};

type FormState = typeof EMPTY_ADD;

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
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
  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  return (
    <form onSubmit={onSubmit} className="bg-gray-900 border border-indigo-800 rounded-xl p-5 mb-4 space-y-4">
      <h2 className="font-semibold text-gray-200">{title}</h2>
      {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nome da conta</label>
          <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} placeholder="Ex: Loja Principal" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Provedor</label>
          <select value={form.provider} onChange={(e) => handleProviderChange(e.target.value)} className={inputCls}>
            <option value="godaddy">GoDaddy</option>
            <option value="hostinger">Hostinger</option>
            <option value="other">Outro (Gmail, etc.)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">E-mail</label>
          <input required={!isEdit} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Senha {isEdit && <span className="text-gray-500">(vazio = manter atual)</span>}
          </label>
          <div className="relative">
            <input
              required={!isEdit}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${inputCls} pr-10`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
              <EyeIcon show={showPassword} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">IMAP Host</label>
          <input value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">IMAP Port</label>
          <input value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">SMTP Host</label>
          <input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">SMTP Port</label>
          <input value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors">
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar conta"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
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

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
    setLoading(false);
  }

  useEffect(() => { loadAccounts(); }, []);

  function handleEditOpen(acc: Account) {
    setEditingId(acc.id);
    setEditForm({
      label: acc.label, provider: acc.provider, email: acc.email, password: "",
      imapHost: acc.imapHost, imapPort: String(acc.imapPort),
      smtpHost: acc.smtpHost, smtpPort: String(acc.smtpPort),
    });
    setShowEditPassword(false);
    setShowAddForm(false);
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
      }),
    });
    if (res.ok) { setShowAddForm(false); setAddForm({ ...EMPTY_ADD }); loadAccounts(); }
    else { const data = await res.json(); setError(data.error ?? "Erro ao salvar conta"); }
    setSaving(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true); setError("");
    const body: Record<string, unknown> = {
      label: editForm.label,
      imapHost: editForm.imapHost,
      imapPort: editForm.imapPort ? parseInt(editForm.imapPort) : undefined,
      smtpHost: editForm.smtpHost,
      smtpPort: editForm.smtpPort ? parseInt(editForm.smtpPort) : undefined,
    };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/accounts/${editingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setEditingId(null); loadAccounts(); }
    else { const data = await res.json(); setError(data.error ?? "Erro ao editar conta"); }
    setSaving(false);
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
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
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Contas de E-mail</h1>
          <p className="text-gray-400 text-sm mt-1">Adicione quantas contas IMAP/SMTP quiser</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setError(""); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
        >
          + Adicionar conta
        </button>
      </div>

      {showAddForm && (
        <AccountForm title="Nova conta" form={addForm} setForm={setAddForm}
          showPassword={showAddPassword} setShowPassword={setShowAddPassword}
          onSubmit={handleAddSubmit} onCancel={() => setShowAddForm(false)}
          saving={saving} error={error} isEdit={false} />
      )}

      {loading ? (
        <div className="text-gray-400">Carregando...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          Nenhuma conta cadastrada. Adicione sua primeira conta acima.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id}>
              {editingId === acc.id ? (
                <AccountForm title={`Editando: ${acc.label}`} form={editForm} setForm={setEditForm}
                  showPassword={showEditPassword} setShowPassword={setShowEditPassword}
                  onSubmit={handleEditSubmit} onCancel={() => setEditingId(null)}
                  saving={saving} error={error} isEdit={true} />
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-100">{acc.label}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                        {PROVIDER_LABELS[acc.provider] ?? acc.provider}
                      </span>
                      {!acc.active && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-400 border border-red-800 rounded">Inativa</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{acc.email}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      IMAP: {acc.imapHost}:{acc.imapPort} · SMTP: {acc.smtpHost}:{acc.smtpPort}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleEditOpen(acc)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleToggle(acc.id, acc.active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        acc.active ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-900"
                      }`}>
                      {acc.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => handleDelete(acc.id)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900/50 transition-colors">
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
