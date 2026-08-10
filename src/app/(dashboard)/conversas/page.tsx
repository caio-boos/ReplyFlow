"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmailDoc } from "@/lib/types";
import { useStoreContext } from "../store-context";
import ConversasList from "./ConversasList";
import ConversaDetail from "./ConversaDetail";

export interface CustomerGroup {
  groupId: string;
  fromName: string;
  from: string;
  emails: EmailDoc[];
  latestEmail: EmailDoc;
}

function groupByCustomer(emails: EmailDoc[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const e of emails) {
    if (e.remarketing) continue;
    const key = e.customerId || e.from;
    if (!map.has(key)) {
      map.set(key, {
        groupId: key,
        fromName: e.fromName || e.from,
        from: e.from,
        emails: [],
        latestEmail: e,
      });
    }
    const g = map.get(key)!;
    g.emails.push(e);
    if (
      (e.receivedAt?.seconds ?? 0) > (g.latestEmail.receivedAt?.seconds ?? 0)
    ) {
      g.latestEmail = e;
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const aUrgent = a.emails.some((e) =>
      ["pending", "failed"].includes(e.status),
    );
    const bUrgent = b.emails.some((e) =>
      ["pending", "failed"].includes(e.status),
    );
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
    return (
      (b.latestEmail.receivedAt?.seconds ?? 0) -
      (a.latestEmail.receivedAt?.seconds ?? 0)
    );
  });
}

function ConversasContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const {
    selectedAccountId,
    selectedAccount,
    loading: storeLoading,
  } = useStoreContext();

  const [emails, setEmails] = useState<EmailDoc[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dayRange, setDayRange] = useState(30);
  const initialLoaded = useRef(false);

  // Pause state — synced from selectedAccount, updated optimistically on toggle
  const [paused, setPaused] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setPaused(selectedAccount?.pausedReplies === true);
  }, [selectedAccount]);

  const fetchPage = useCallback(
    async (cursor?: number, limit = 100) => {
      const sinceSeconds = Math.floor(Date.now() / 1000 - dayRange * 86400);
      const p = new URLSearchParams({ limit: String(limit), slim: "true", since: String(sinceSeconds) });
      if (selectedAccountId !== "all") p.set("accountId", selectedAccountId);
      if (cursor) p.set("cursor", String(cursor));
      const res = await fetch(`/api/emails?${p}`);
      if (!res.ok)
        return { emails: [] as EmailDoc[], hasMore: false, nextCursor: 0 };
      const data = await res.json();
      return {
        emails: (data.emails as EmailDoc[]).filter((e) => !e.remarketing),
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor ?? 0,
      };
    },
    [selectedAccountId, dayRange],
  );

  const refreshEmails = useCallback(async () => {
    // First load fetches a large batch so counts and search cover all emails;
    // subsequent 30s polls fetch only the latest 100 for efficiency.
    const limit = initialLoaded.current ? 100 : 2000;
    const result = await fetchPage(undefined, limit);
    initialLoaded.current = true;
    setEmails((prev) => {
      if (prev.length === 0) return result.emails;
      // Merge: update changed statuses + add genuinely new emails
      const prevMap = new Map(prev.map((e) => [e.id, e]));
      result.emails.forEach((e) => prevMap.set(e.id, e));
      return Array.from(prevMap.values()).sort(
        (a, b) => (b.receivedAt?.seconds ?? 0) - (a.receivedAt?.seconds ?? 0),
      );
    });
    setHasMore(result.hasMore);
    setLoading(false);
  }, [fetchPage]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || emails.length === 0) return;
    setLoadingMore(true);
    const cursor = Math.min(...emails.map((e) => e.receivedAt?.seconds ?? 0));
    const result = await fetchPage(cursor);
    setEmails((prev) => {
      const prevMap = new Map(prev.map((e) => [e.id, e]));
      result.emails.forEach((e) => prevMap.set(e.id, e));
      return Array.from(prevMap.values()).sort(
        (a, b) => (b.receivedAt?.seconds ?? 0) - (a.receivedAt?.seconds ?? 0),
      );
    });
    setHasMore(result.hasMore);
    setLoadingMore(false);
  }, [emails, fetchPage, hasMore, loadingMore]);

  useEffect(() => {
    if (storeLoading) return;
    initialLoaded.current = false;
    setEmails([]);
    setLoading(true);
    refreshEmails();
    const id = setInterval(refreshEmails, 30_000);
    return () => clearInterval(id);
  }, [refreshEmails, storeLoading]);

  async function handleTogglePause() {
    if (toggling || selectedAccountId === "all" || !selectedAccount) return;
    setToggling(true);
    const next = !paused;
    try {
      await fetch(`/api/accounts/${selectedAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausedReplies: next }),
      });
      setPaused(next);
    } finally {
      setToggling(false);
    }
  }

  const groups = groupByCustomer(emails);

  function select(emailId: string) {
    router.push(`/conversas?id=${emailId}`, { scroll: false });
  }

  function clearSelection() {
    router.push("/conversas", { scroll: false });
  }

  const showPauseToggle = selectedAccountId !== "all";

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-full overflow-hidden">
      {/* Left panel */}
      <div
        className={`flex flex-col w-full md:w-80 lg:w-96 shrink-0 border-r border-white/6 ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <ConversasList
          groups={groups}
          loading={loading}
          selectedId={selectedId}
          onSelect={select}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          loadingMore={loadingMore}
          paused={showPauseToggle ? paused : false}
          showPauseToggle={showPauseToggle}
          toggling={toggling}
          onTogglePause={handleTogglePause}
          dayRange={dayRange}
          onDayRangeChange={setDayRange}
        />
      </div>

      {/* Right panel */}
      <div
        className={`flex-col flex-1 min-w-0 overflow-hidden ${
          selectedId ? "flex" : "hidden md:flex"
        }`}
      >
        <ConversaDetail
          emailId={selectedId}
          onBack={clearSelection}
          onRefresh={refreshEmails}
        />
      </div>
    </div>
  );
}

export default function ConversasPage() {
  return (
    <Suspense>
      <ConversasContent />
    </Suspense>
  );
}
