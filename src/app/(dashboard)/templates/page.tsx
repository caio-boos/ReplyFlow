"use client";

import { useStoreContext } from "../store-context";
import TemplateManager from "./TemplateManager";
import { useState, useEffect } from "react";

type Tab = "reply" | "remarketing";

export default function TemplatesPage() {
  const { selectedAccountId } = useStoreContext();
  const [activeTab, setActiveTab] = useState<Tab>("reply");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId === "all") {
      setLogoUrl(null);
      return;
    }
    fetch(`/api/accounts/${selectedAccountId}`)
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.account?.logoUrl ?? null))
      .catch(() => {});
  }, [selectedAccountId]);

  const tabs: { id: Tab; label: string; desc: string }[] = [
    {
      id: "reply",
      label: "Resposta IA",
      desc: "Emails enviados automaticamente pela IA",
    },
    {
      id: "remarketing",
      label: "Remarketing",
      desc: "Emails de carrinho abandonado",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-100">
          Templates de Email
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Crie e gerencie templates. Apenas o template marcado como{" "}
          <strong className="text-gray-400">Ativo</strong> será usado nos
          envios.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tabs.map(
        (tab) =>
          activeTab === tab.id && (
            <TemplateManager
              key={tab.id}
              type={tab.id}
              accountId={selectedAccountId}
              logoUrl={logoUrl}
            />
          ),
      )}
    </div>
  );
}
