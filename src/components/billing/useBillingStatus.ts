"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingSummary } from "@/lib/billing/http";

let cached: BillingSummary | null = null;
let inflight: Promise<BillingSummary | null> | null = null;
const listeners = new Set<(s: BillingSummary | null) => void>();

async function load(): Promise<BillingSummary | null> {
  if (!inflight) {
    inflight = fetch("/api/billing/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<BillingSummary>) : null))
      .catch(() => null)
      .then((data) => {
        if (data) cached = data;
        listeners.forEach((fn) => fn(data ?? cached));
        return data ?? cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Recarrega o status em todos os componentes que o exibem. */
export function refreshBillingStatus(): Promise<BillingSummary | null> {
  return load();
}

export function useBillingStatus(initial?: BillingSummary | null) {
  const [data, setData] = useState<BillingSummary | null>(initial ?? cached);
  const [loading, setLoading] = useState(!initial && !cached);

  useEffect(() => {
    if (initial) cached = initial;
    const listener = (s: BillingSummary | null) => {
      setData(s);
      setLoading(false);
    };
    listeners.add(listener);
    if (!initial) load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("focus", onFocus);
    };
  }, [initial]);

  const refresh = useCallback(() => load(), []);
  return { data, loading, refresh };
}
