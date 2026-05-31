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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Clientes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Perfis automáticos criados a partir dos e-mails recebidos
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400">Carregando...</div>
      ) : customers.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          Nenhum cliente identificado ainda. Os perfis são criados automaticamente quando e-mails chegam.
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              prefetch={false}
              className="block bg-gray-900 border border-gray-800 hover:border-indigo-700 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-100">{c.name || "(sem nome)"}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {c.emails.map((e) => (
                      <span key={e} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {e}
                      </span>
                    ))}
                  </div>
                  {c.orderNumbers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Pedidos: {c.orderNumbers.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-400">{c.linkedEmailIds.length} e-mail(s)</p>
                  {c.suggestedLinks.length > 0 && (
                    <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {c.suggestedLinks.length} sugestão de link
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
