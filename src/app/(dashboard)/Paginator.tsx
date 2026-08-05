"use client";

interface PaginatorProps {
  page: number; // 1-based
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPages(page: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (page >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", page - 1, page, page + 1, "...", total];
}

export default function Paginator({
  page,
  totalPages,
  onPageChange,
  className = "",
}: PaginatorProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12 disabled:opacity-30 disabled:cursor-not-allowed bg-gray-900/60 transition-all"
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
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      {getPages(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-gray-600 text-sm select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            aria-label={`Página ${p}`}
            aria-current={page === p ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
              page === p
                ? "bg-indigo-600 text-white border border-indigo-500/50 shadow-sm shadow-indigo-600/30"
                : "border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12 bg-gray-900/60"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Próxima página"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12 disabled:opacity-30 disabled:cursor-not-allowed bg-gray-900/60 transition-all"
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
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </nav>
  );
}
