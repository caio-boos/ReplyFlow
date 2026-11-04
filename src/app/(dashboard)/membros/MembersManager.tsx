"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PERMISSION_GROUPS, Permission } from "@/lib/auth/permissions";
import { useT } from "@/lib/i18n/client";
import { useConfirm } from "../ConfirmDialog";

interface Member {
  id: string;
  email: string;
  name: string | null;
  status: "pending" | "active" | string;
  permissions: Permission[];
  accountIds: string[];
  inviteExpiresAt: number | null;
}

interface AccountOption {
  id: string;
  label: string;
  email: string;
}

// PERMISSION_GROUPS labels are internal; map them to translation keys for display.
const GROUP_LABEL_KEYS: Record<string, "groups.main" | "groups.tools"> = {
  Principal: "groups.main",
  Ferramentas: "groups.tools",
};

const emptyDraft = {
  email: "",
  name: "",
  permissions: [] as Permission[],
  accountIds: [] as string[],
};

export default function MembersManager() {
  const confirm = useConfirm();
  const t = useT("team");
  const tc = useT("common");
  const tp = useT("permissions");
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    const res = await fetch("/api/team");
    if (!res.ok) {
      toast.error(t("toasts.loadError"));
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMembers(data.members ?? []);
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial assíncrono
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setDraft({ ...emptyDraft, accountIds: accounts.map((a) => a.id) });
    setFormOpen(true);
  }

  function openEdit(member: Member) {
    setEditingId(member.id);
    setDraft({
      email: member.email,
      name: member.name ?? "",
      permissions: member.permissions,
      accountIds: member.accountIds,
    });
    setFormOpen(true);
  }

  function togglePermission(key: Permission) {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(key)
        ? d.permissions.filter((p) => p !== key)
        : [...d.permissions, key],
    }));
  }

  function toggleAccount(id: string) {
    setDraft((d) => ({
      ...d,
      accountIds: d.accountIds.includes(id)
        ? d.accountIds.filter((a) => a !== id)
        : [...d.accountIds, id],
    }));
  }

  async function submit() {
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/team/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              permissions: draft.permissions,
              accountIds: draft.accountIds,
            }),
          })
        : await fetch("/api/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("toasts.saveError"));
        return;
      }

      toast.success(editingId ? t("toasts.updated") : t("toasts.invited"));
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function resend(member: Member) {
    const res = await fetch(`/api/team/${member.id}/resend`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? t("toasts.resendError"));
      return;
    }
    toast.success(t("toasts.resent"));
    await load();
  }

  async function remove(member: Member) {
    const ok = await confirm({
      title: t("confirmRemove.title"),
      description: t("confirmRemove.description", { email: member.email }),
      confirmLabel: t("confirmRemove.confirm"),
      cancelLabel: tc("actions.cancel"),
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("toasts.removeError"));
      return;
    }
    toast.success(t("toasts.removed"));
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-lg font-semibold text-white">{t("title")}</h1>
          <p className="text-xs text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={openNew}
          disabled={accounts.length === 0}
          className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {t("invite")}
        </button>
      </div>

      {accounts.length === 0 && !loading && (
        <p className="mb-6 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          {t("noStores")}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-white/6 bg-white/3 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">{t("empty.title")}</p>
          <p className="text-xs text-gray-600 mt-1">{t("empty.hint")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="rounded-xl border border-white/6 bg-white/3 px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {member.name || member.email}
                    </p>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        member.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {member.status === "active"
                        ? t("status.active")
                        : t("status.pending")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {member.email}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5">
                    {t("summary", {
                      count: member.accountIds.length,
                      areas:
                        member.permissions
                          .map((p) => tp(`${p}.label`))
                          .join(", ") || t("noAccess"),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {member.status === "pending" && (
                    <button
                      onClick={() => resend(member)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {t("actions.resend")}
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(member)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {t("actions.permissions")}
                  </button>
                  <button
                    onClick={() => remove(member)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    {t("actions.remove")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setFormOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h2 className="text-sm font-semibold text-white">
              {editingId ? t("form.editTitle") : t("form.inviteTitle")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {editingId ? t("form.editHint") : t("form.inviteHint")}
            </p>

            {!editingId && (
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-400">
                    {t("form.email")}
                  </span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, email: e.target.value }))
                    }
                    placeholder={t("form.emailPlaceholder")}
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-400">
                    {t("form.name")}
                  </span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </label>
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs font-semibold text-white">{t("form.stores")}</p>
              <p className="text-[11px] text-gray-600 mb-2">
                {t("form.storesHint")}
              </p>
              <div className="space-y-1">
                {accounts.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={draft.accountIds.includes(a.id)}
                      onChange={() => toggleAccount(a.id)}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-gray-200">{a.label}</span>
                    <span className="text-xs text-gray-600 truncate">
                      {a.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="mt-6">
                <p className="text-xs font-semibold text-white mb-2">
                  {GROUP_LABEL_KEYS[group.label]
                    ? tp(GROUP_LABEL_KEYS[group.label])
                    : group.label}
                </p>
                <div className="space-y-1">
                  {group.keys.map((key) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={draft.permissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        className="mt-0.5 accent-indigo-500"
                      />
                      <span>
                        <span className="block text-sm text-gray-200">
                          {tp(`${key}.label`)}
                        </span>
                        <span className="block text-[11px] text-gray-600">
                          {tp(`${key}.description`)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-7 flex justify-end gap-2">
              <button
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                {tc("actions.cancel")}
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? tc("actions.saving")
                  : editingId
                    ? tc("actions.save")
                    : t("form.sendInvite")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
