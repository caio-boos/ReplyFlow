"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm: ConfirmFn = useCallback(
    (opts) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  function settle(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  // Close on Escape
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state) confirmBtnRef.current?.focus();
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="confirm-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => settle(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm mx-4 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3
              id="confirm-title"
              className="text-sm font-semibold text-gray-100"
            >
              {state.title}
            </h3>
            {state.description && (
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {state.description}
              </p>
            )}

            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => settle(false)}
                className="px-3.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-800/60 hover:bg-gray-800 border border-white/8 rounded-xl transition-all"
              >
                {state.cancelLabel ?? "Cancelar"}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => settle(true)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                  state.danger
                    ? "bg-red-600 hover:bg-red-500 text-white border border-red-500/30 shadow-sm shadow-red-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 shadow-sm shadow-indigo-600/20"
                }`}
              >
                {state.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be inside <ConfirmProvider>");
  return ctx;
}
