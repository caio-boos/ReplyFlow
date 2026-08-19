"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { StoreProvider, useStoreContext, StoreAccount } from "./store-context";
import { ConfirmProvider } from "./ConfirmDialog";
import { Toaster } from "sonner";
import AccountsPanel from "./AccountsPanel";

// ─── Navigation structure ────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        ),
      },
      {
        href: "/conversas",
        label: "Conversas",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        ),
      },
      {
        href: "/tasks",
        label: "Tarefas",
        icon: (
          <svg
            className="w-4 h-4"
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
        ),
      },
      {
        href: "/customers",
        label: "Clientes",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
        ),
      },
      {
        href: "/remarketing",
        label: "Remarketing",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
        ),
      },
      {
        href: "/stats",
        label: "Relatórios",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      {
        href: "/templates",
        label: "Templates",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
            />
          </svg>
        ),
      },
      {
        href: "/advertorials",
        label: "Advertoriais",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
            />
          </svg>
        ),
      },
      {
        href: "/emails/new",
        label: "Compor E-mail",
        icon: (
          <svg
            className="w-4 h-4"
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
        ),
      },
    ],
  },
];

// ─── Store avatar helper ──────────────────────────────────────────────────────

function StoreAvatar({
  account,
  size = "sm",
}: {
  account: StoreAccount | null;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "w-14 h-14 rounded-xl" : "w-7 h-7 rounded-md";
  const iconSize = size === "lg" ? "w-6 h-6" : "w-3.5 h-3.5";
  const textSize = size === "lg" ? "text-2xl" : "text-xs";

  if (!account) {
    return (
      <div
        className={`${dim} bg-gray-700/80 border border-white/10 flex items-center justify-center shrink-0`}
      >
        <svg
          className={`${iconSize} text-gray-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
          />
        </svg>
      </div>
    );
  }
  if (account.logoUrl) {
    return (
      <img
        src={account.logoUrl}
        alt={account.label}
        className={`${dim} object-contain shrink-0 bg-white/5`}
      />
    );
  }
  return (
    <div
      className={`${dim} bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0`}
    >
      <span className={`text-indigo-300 ${textSize} font-bold leading-none`}>
        {account.label[0]?.toUpperCase()}
      </span>
    </div>
  );
}

// ─── Store selector dropdown ──────────────────────────────────────────────────

function StoreSelector() {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    loading,
  } = useStoreContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading) {
    return (
      <div className="mx-3 mb-2 h-13 bg-white/3 rounded-lg animate-pulse" />
    );
  }

  const displayName = selectedAccount?.label ?? "Todas as lojas";
  const displaySub =
    selectedAccount?.email ??
    `${accounts.length} loja${accounts.length !== 1 ? "s" : ""}`;

  return (
    <div ref={ref} className="mx-3 mb-2 relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/4 hover:bg-white/6 border border-white/8 transition-all text-left"
      >
        <StoreAvatar account={selectedAccount} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 truncate leading-tight">
            {displaySub}
          </p>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-gray-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
          {/* All stores */}
          <button
            onClick={() => {
              setSelectedAccountId("all");
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
              selectedAccountId === "all"
                ? "bg-indigo-500/15"
                : "hover:bg-white/5"
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-gray-700/80 border border-white/10 flex items-center justify-center shrink-0">
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 leading-tight">
                Todas as lojas
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                {accounts.length} loja{accounts.length !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedAccountId === "all" && (
              <svg
                className="w-3.5 h-3.5 text-indigo-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            )}
          </button>

          {accounts.length > 0 && <div className="h-px bg-white/6 mx-2 my-1" />}

          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedAccountId(a.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                selectedAccountId === a.id
                  ? "bg-indigo-500/15"
                  : "hover:bg-white/5"
              }`}
            >
              <StoreAvatar account={a} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate leading-tight">
                  {a.label}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight">
                  {a.email}
                </p>
              </div>
              {selectedAccountId === a.id && (
                <svg
                  className="w-3.5 h-3.5 text-indigo-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings panel ──────────────────────────────────────────────────────────

function SettingsPanel({
  open,
  onClose,
  theme,
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const { accounts } = useStoreContext();
  const [panelView, setPanelView] = useState<"settings" | "accounts">(
    "settings",
  );
  const [accountInitialView, setAccountInitialView] = useState<"list" | "add">(
    "list",
  );
  const [accountInitialEditId, setAccountInitialEditId] = useState<
    string | null
  >(null);
  // Remount AccountsPanel when opening to pick up fresh initialView/editId
  const [accountsPanelKey, setAccountsPanelKey] = useState(0);

  function openAccounts(view: "list" | "add", editId?: string) {
    setAccountInitialView(view);
    setAccountInitialEditId(editId ?? null);
    setAccountsPanelKey((k) => k + 1);
    setPanelView("accounts");
  }

  useEffect(() => {
    if (!open) setPanelView("settings");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-60 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-modal="true"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel — slides up from bottom, full screen */}
      <div
        className={`absolute inset-0 flex flex-col bg-gray-950 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header — changes based on which sub-view is active */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {panelView === "accounts" ? (
              <button
                onClick={() => setPanelView("settings")}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="font-semibold text-white">
                  Contas de E-mail
                </span>
              </button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
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
                      d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white">
                    Configurações
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Gerencie sua conta e preferências
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            aria-label="Fechar configurações"
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
            {panelView === "accounts" ? (
              <AccountsPanel
                key={accountsPanelKey}
                initialView={accountInitialView}
                initialEditId={accountInitialEditId}
              />
            ) : (
              <>
                {/* ── Aparência ── */}
                <section>
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-white">
                      Aparência
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Escolha o tema da interface
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => theme !== "dark" && onToggleTheme()}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        theme === "dark"
                          ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-inset ring-indigo-500/30"
                          : "bg-white/3 border-white/6 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme === "dark" ? "bg-indigo-500/20" : "bg-white/5"}`}
                      >
                        <svg
                          className={`w-5 h-5 ${theme === "dark" ? "text-indigo-300" : "text-gray-500"}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${theme === "dark" ? "text-white" : "text-gray-400"}`}
                        >
                          Modo escuro
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Interface com fundo escuro
                        </p>
                      </div>
                      {theme === "dark" && (
                        <svg
                          className="w-4 h-4 text-indigo-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => theme !== "light" && onToggleTheme()}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        theme === "light"
                          ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-inset ring-indigo-500/30"
                          : "bg-white/3 border-white/6 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme === "light" ? "bg-indigo-500/20" : "bg-white/5"}`}
                      >
                        <svg
                          className={`w-5 h-5 ${theme === "light" ? "text-indigo-300" : "text-gray-500"}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${theme === "light" ? "text-white" : "text-gray-400"}`}
                        >
                          Modo claro
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Interface com fundo claro
                        </p>
                      </div>
                      {theme === "light" && (
                        <svg
                          className="w-4 h-4 text-indigo-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </section>

                {/* ── Lojas conectadas ── */}
                <section>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        Lojas conectadas
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Gerencie suas integrações com a Shopify
                      </p>
                    </div>
                    <button
                      onClick={() => openAccounts("add")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Nova conta
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {accounts.length === 0 ? (
                      <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#96BF48]/10 border border-[#96BF48]/20 flex items-center justify-center">
                          <Image
                            src="/images/shopify-logo.png"
                            alt="Shopify"
                            width={40}
                            height={12}
                            className="opacity-70"
                            style={{ height: "auto" }}
                            unoptimized
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-400 mb-1">
                          Nenhuma loja conectada
                        </p>
                        <p className="text-xs text-gray-600 mb-5">
                          Conecte sua loja Shopify para começar a usar o
                          ReplyFlow
                        </p>
                        <button
                          onClick={() => openAccounts("add")}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#96BF48] hover:bg-[#85aa3d] text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Conectar loja Shopify
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
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        {accounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center gap-4 p-4 bg-white/3 border border-white/6 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <StoreAvatar account={account} size="lg" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white truncate">
                                  {account.label}
                                </span>
                                {account.shopifyConnected && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#96BF48]/10 border border-[#96BF48]/20 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#96BF48]" />
                                    <span className="text-[10px] font-medium text-[#96BF48]">
                                      Shopify
                                    </span>
                                  </span>
                                )}
                                {account.remarketingEnabled && (
                                  <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-medium text-yellow-400">
                                    Remarketing
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {account.email}
                              </p>
                            </div>
                            <button
                              onClick={() => openAccounts("list", account.id)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all shrink-0"
                            >
                              Gerenciar
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => openAccounts("add")}
                          className="flex items-center gap-4 p-4 w-full text-left border border-dashed border-white/10 rounded-xl hover:border-[#96BF48]/40 hover:bg-[#96BF48]/5 transition-all group"
                        >
                          <div className="w-14 h-14 rounded-xl bg-[#96BF48]/10 border border-[#96BF48]/20 flex items-center justify-center shrink-0">
                            <Image
                              src="/images/shopify-logo.png"
                              alt="Shopify"
                              width={36}
                              height={11}
                              unoptimized
                              style={{ height: "auto" }}
                              className="opacity-60 group-hover:opacity-90 transition-opacity"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                              Conectar nova loja
                            </p>
                            <p className="text-xs text-gray-600">
                              Adicione mais uma loja Shopify ao ReplyFlow
                            </p>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* ── Contexto de IA ── */}
                <section>
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold text-white">
                      Contexto de IA
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure o tom de voz e o comportamento das respostas
                      automáticas
                    </p>
                  </div>
                  <Link
                    href="/context"
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 bg-white/3 border border-white/6 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <svg
                        className="w-6 h-6 text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">
                        Prompt e tom de voz
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Personalize como a IA responde seus clientes
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </section>

                {/* ── Recuperação de carrinho ── */}
                <section>
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold text-white">
                      Recuperação de carrinho
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Campanhas automáticas para carrinhos abandonados
                    </p>
                  </div>
                  <Link
                    href="/remarketing"
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 bg-white/3 border border-white/6 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <svg
                        className="w-6 h-6 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">
                        Campanhas de remarketing
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Acompanhe e configure a recuperação de carrinhos
                        abandonados
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Sidebar inner (needs context) ───────────────────────────────────────────

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("replyflow.theme");
    if (saved === "light") setTheme("light");
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
    localStorage.setItem("replyflow.theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-gray-900/95 backdrop-blur-sm border-b border-white/6">
        <Image
          src="/images/logo-com-texto-branco-simples.png"
          alt="ReplyFlow"
          width={100}
          height={12}
          className="object-contain"
          style={{ height: "auto" }}
          unoptimized
        />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-all"
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
              strokeWidth={1.75}
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      <div className="flex h-screen overflow-hidden bg-gray-950">
        {/* Mobile backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
            mobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          className={`fixed md:relative inset-y-0 left-0 md:inset-auto z-50 w-60 flex flex-col shrink-0 border-r border-white/6 bg-gray-900/60 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Brand */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 mb-1">
            <Image
              src="/images/logo-com-texto-branco-simples.png"
              alt="ReplyFlow"
              width={120}
              height={14}
              className="object-contain"
              style={{ height: "auto" }}
              priority
              unoptimized
            />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-all"
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

          {/* Store selector */}
          <StoreSelector />

          {/* Divider */}
          <div className="h-px bg-white/5 mx-3 mb-3" />

          {/* Nav */}
          <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-4 min-h-0">
            {NAV_SECTIONS.map((section, si) => (
              <div key={si}>
                {section.label && (
                  <p className="px-3 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={active ? "text-white" : "text-gray-600"}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-white/6 space-y-0.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                settingsOpen
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <span className={settingsOpen ? "text-white" : "text-gray-600"}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
              Configurações
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all duration-150"
            >
              <span className="text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
              </span>
              Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 h-full overflow-y-auto bg-gray-950 pt-14 md:pt-0">
          {children}
        </main>
      </div>

      {/* Settings modal — fixed, covers sidebar + content */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </>
  );
}

// ─── Root layout export ───────────────────────────────────────────────────────

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </ConfirmProvider>
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{ classNames: { toast: "!font-sans !text-xs" } }}
      />
    </StoreProvider>
  );
}
