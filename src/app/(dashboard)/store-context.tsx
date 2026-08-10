"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const STORAGE_KEY = "replyflow.selectedStore";

export interface StoreAccount {
  id: string;
  label: string;
  email: string;
  logoUrl?: string | null;
  shopifyConnected?: boolean;
  remarketingEnabled?: boolean;
  active?: boolean;
  pausedReplies?: boolean;
}

interface StoreContextValue {
  accounts: StoreAccount[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedAccount: StoreAccount | null;
  loading: boolean;
  refreshAccounts: () => void;
}

const StoreContext = createContext<StoreContextValue>({
  accounts: [],
  selectedAccountId: "all",
  setSelectedAccountId: () => {},
  selectedAccount: null,
  loading: true,
  refreshAccounts: () => {},
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [selectedAccountId, setSelectedAccountIdState] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) ?? "all")
        : "all";
    setSelectedAccountIdState(saved);

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        const fetched: StoreAccount[] = d.accounts ?? [];
        setAccounts(fetched);
        // If the saved account no longer exists, fall back to "all"
        if (saved !== "all" && !fetched.find((a) => a.id === saved)) {
          setSelectedAccountIdState("all");
          if (typeof window !== "undefined")
            localStorage.setItem(STORAGE_KEY, "all");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function setSelectedAccountId(id: string) {
    setSelectedAccountIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }

  function refreshAccounts() {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []));
  }

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? null;

  return (
    <StoreContext.Provider
      value={{
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        selectedAccount,
        loading,
        refreshAccounts,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  return useContext(StoreContext);
}
