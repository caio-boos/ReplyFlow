"use client";

import { useStoreContext } from "../store-context";
import TemplateManager from "./TemplateManager";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/client";

type Tab = "reply" | "remarketing";

export default function TemplatesPage() {
  const { selectedAccountId } = useStoreContext();
  const t = useT("compose");
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
      label: t("library.tabs.reply"),
      desc: t("library.tabs.replyDesc"),
    },
    {
      id: "remarketing",
      label: t("library.tabs.remarketing"),
      desc: t("library.tabs.remarketingDesc"),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-100">
          {t("library.title")}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t.rich("library.description", {
            strong: (chunks) => (
              <strong className="text-gray-400">{chunks}</strong>
            ),
          })}
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
