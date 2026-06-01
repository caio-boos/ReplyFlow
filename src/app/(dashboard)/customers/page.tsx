"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  emails: string[];
  orderNumbers: string[];
  linkedEmailIds: string[];
  suggestedLinks: Array<{ reason: string; incomingEmail: string }>;
  updatedAt: { seconds: number };
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-violet-600",
  "from-amber-500 to-orange-600",
];

function avatarGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/customers", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? customers.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.emails.some((e) => e.toLowerCase().includes(q)) ||
          c.orderNumbers.some((o) => o.toLowerCase().includes(q))
        );
      })
    : customers;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Perfis automáticos criados a partir dos e-mails recebidos
          </p>
        </div>
        {!loading && customers.length > 0 && (
          <span className="shrink-0 text-xs px-2.5 py-1 bg-gray-800/80 border border-white/6 text-gray-400 rounded-lg">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Search */}
      {!loading && customers.length > 0 && (
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou pedido…"
            className="w-full bg-gray-900/60 border border-white/6 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
          />
        </div>
      )}

      {/* Content */}
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
      ) : customers.length === 0 ? (
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
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            Nenhum cliente identificado
          </p>
          <p className="text-xs text-gray-600 mt-1 text-center max-w-xs">
            Os perfis são criados automaticamente quando e-mails chegam.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-white/6 rounded-2xl bg-gray-900/30">
          <svg
            className="w-8 h-8 mb-2 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            Nenhum resultado para &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const displayName = c.name || "(sem nome)";
            const initials = getInitials(displayName);
            const gradient = avatarGradient(c.id);
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                prefetch={false}
                className="group flex items-center gap-4 bg-gray-900/50 border border-white/6 hover:border-indigo-500/30 hover:bg-gray-900/80 rounded-xl px-4 py-3.5 transition-all"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shrink-0 text-white text-sm font-semibold`}
                >
                  {initials}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-100 text-sm">
                      {displayName}
                    </span>
                    {c.suggestedLinks.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                        {c.suggestedLinks.length} sugest
                        {c.suggestedLinks.length === 1 ? "ão" : "ões"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.emails.slice(0, 3).map((e) => (
                      <span
                        key={e}
                        className="text-xs text-gray-500 bg-gray-800/60 border border-white/5 px-2 py-0.5 rounded-md font-mono"
                      >
                        {e}
                      </span>
                    ))}
                    {c.emails.length > 3 && (
                      <span className="text-xs text-gray-600">
                        +{c.emails.length - 3}
                      </span>
                    )}
                  </div>
                  {c.orderNumbers.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Pedidos: {c.orderNumbers.slice(0, 4).join(", ")}
                      {c.orderNumbers.length > 4 &&
                        ` +${c.orderNumbers.length - 4}`}
                    </p>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-300">
                      {c.linkedEmailIds.length}
                    </p>
                    <p className="text-xs text-gray-600">
                      e-mail{c.linkedEmailIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-700 group-hover:text-indigo-500 transition-colors"
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
