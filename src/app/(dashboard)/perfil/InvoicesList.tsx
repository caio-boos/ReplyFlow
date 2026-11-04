"use client";

import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/billing/plans";
import { TONE_CLASSES, type Tone } from "@/lib/billing/ui";
import type { InvoiceRow } from "@/lib/billing/service";
import { useFormat, useT } from "@/lib/i18n/client";

/** Rótulos em `billing.invoices.status.<status>`. */
const INVOICE_TONE: Record<string, Tone> = {
  paid: "emerald",
  open: "amber",
  uncollectible: "red",
  void: "gray",
};

export default function InvoicesList() {
  const t = useT("billing");
  const f = useFormat();
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/billing/invoices", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <section className="rounded-xl border border-white/6 bg-gray-900/60">
      <div className="px-5 sm:px-6 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-white">{t("invoices.title")}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t("invoices.subtitle")}</p>
      </div>

      {error ? (
        <p className="px-6 pb-6 text-xs text-red-400">
          {t("invoices.loadError")}
        </p>
      ) : invoices === null ? (
        <div className="px-5 sm:px-6 pb-5 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <p className="px-6 pb-6 text-xs text-gray-500">{t("invoices.empty")}</p>
      ) : (
        <ul className="divide-y divide-white/4 border-t border-white/6">
          {invoices.map((inv) => {
            const st = {
              label: t.dynamic(`invoices.status.${inv.status ?? ""}`, undefined, inv.status ?? "—"),
              tone: INVOICE_TONE[inv.status ?? ""] ?? ("gray" as Tone),
            };
            const isTrialInvoice = inv.total === 0 && inv.status === "paid";
            return (
              <li
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 sm:px-6 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">
                    {f.dateShort(inv.created)}
                    <span className="text-gray-600"> · {inv.number ?? "—"}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isTrialInvoice
                      ? t("invoices.trialStart")
                      : (inv.description ?? t("invoices.defaultDescription"))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-200 tabular-nums">
                    {formatUsd(inv.total, { cents: true })}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[st.tone].badge}`}>
                    {st.label}
                  </span>
                  {inv.hostedInvoiceUrl && (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {inv.status === "open" ? t("invoices.pay") : t("invoices.receipt")}
                    </a>
                  )}
                  {inv.invoicePdf && (
                    <a
                      href={inv.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
