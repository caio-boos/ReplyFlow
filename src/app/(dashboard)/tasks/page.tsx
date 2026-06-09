"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TaskDoc, TaskPriority } from "@/lib/types";

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; bar: string }
> = {
  high: {
    label: "Alta",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    bar: "bg-red-500",
  },
  medium: {
    label: "Média",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    bar: "bg-yellow-400",
  },
  low: {
    label: "Baixa",
    color: "bg-gray-500/10 text-gray-500 border-gray-600/20",
    bar: "bg-gray-500",
  },
};

const FLAG_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  chargeback_risk: {
    label: "Chargeback",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
  manual_review: {
    label: "Revisão manual",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  refund_pending: {
    label: "Reembolso",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"
        />
      </svg>
    ),
  },
  address_problem: {
    label: "Endereço",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
    ),
  },
};

interface CustomerGroup {
  customerId: string;
  customerName: string;
  accountEmail: string;
  pending: TaskDoc[];
  done: TaskDoc[];
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function groupByCustomer(tasks: TaskDoc[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const t of tasks) {
    if (!map.has(t.customerId)) {
      map.set(t.customerId, {
        customerId: t.customerId,
        customerName: t.customerName,
        accountEmail: t.accountEmail,
        pending: [],
        done: [],
      });
    }
    const g = map.get(t.customerId)!;
    if (t.completed) g.done.push(t);
    else g.pending.push(t);
  }
  for (const g of map.values()) {
    g.pending.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
    g.done.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
  }
  // Groups with pending tasks come first, sorted by top priority; fully-done groups at bottom
  return Array.from(map.values()).sort((a, b) => {
    const hasPendingA = a.pending.length > 0;
    const hasPendingB = b.pending.length > 0;
    if (hasPendingA !== hasPendingB) return hasPendingA ? -1 : 1;
    const topA = a.pending[0] ? PRIORITY_ORDER[a.pending[0].priority] : 99;
    const topB = b.pending[0] ? PRIORITY_ORDER[b.pending[0].priority] : 99;
    return topA - topB;
  });
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onSaveNote,
  isCompleting,
  isHighlighted,
}: {
  task: TaskDoc;
  onToggle: (t: TaskDoc) => void;
  onDelete: (id: string) => void;
  onSaveNote: (id: string, note: string) => Promise<void>;
  isCompleting: boolean;
  isHighlighted?: boolean;
}) {
  const cfg = PRIORITY_CONFIG[task.priority];
  const activeFlags = task.flags
    ? Object.entries(task.flags).filter(([k, v]) => v && FLAG_CONFIG[k])
    : [];

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(task.note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function openNote() {
    setNoteValue(task.note ?? "");
    setNoteOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleSaveNote() {
    setNoteSaving(true);
    await onSaveNote(task.id, noteValue.trim());
    setNoteSaving(false);
    setNoteOpen(false);
  }

  return (
    <div
      id={`task-${task.id}`}
      className={`px-4 py-3.5 flex gap-3 items-start group transition-all duration-700 ${
        isHighlighted
          ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40 shadow-[inset_0_0_24px_rgba(99,102,241,0.12)]"
          : isCompleting
          ? "bg-emerald-500/8"
          : task.completed
          ? "opacity-55 hover:bg-white/2"
          : "hover:bg-white/2"
      }`}
    >
      {/* Priority bar */}
      <div
        className={`w-0.5 self-stretch rounded-full shrink-0 transition-colors duration-500 ${
          isCompleting || task.completed ? "bg-gray-700" : cfg.bar
        }`}
      />

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 ${
          isCompleting
            ? "bg-emerald-500 border-emerald-400 scale-125 ring-4 ring-emerald-500/35"
            : task.completed
            ? "bg-emerald-600/80 border-emerald-600"
            : "border-gray-600 hover:border-indigo-400 hover:bg-indigo-500/10"
        }`}
      >
        {(task.completed || isCompleting) && (
          <svg
            className={`w-3 h-3 text-white transition-all duration-200 ${isCompleting ? "scale-110" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-snug transition-all duration-500 ${
            task.completed ? "line-through text-gray-600" : "text-gray-200"
          }`}
        >
          {task.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${cfg.color}`}
          >
            {task.priority === "high" && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            )}
            {cfg.label}
          </span>
          {activeFlags.map(([k]) => {
            const fc = FLAG_CONFIG[k];
            return (
              <span
                key={k}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${fc.color}`}
              >
                {fc.icon}
                {fc.label}
              </span>
            );
          })}
          <Link
            href={`/emails/${task.emailId}`}
            onClick={() => {
              sessionStorage.setItem('taskNavCtx', JSON.stringify({ taskId: task.id }));
            }}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-400 transition-colors truncate max-w-xs"
          >
            <svg
              className="w-3 h-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            {task.emailSubject}
          </Link>
        </div>

        {/* Existing note display */}
        {task.note && !noteOpen && (
          <div className="mt-2.5 flex items-start gap-1.5 text-xs text-gray-500 bg-gray-800/40 border border-white/5 rounded-lg px-3 py-2">
            <svg className="w-3 h-3 mt-0.5 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            <span className="leading-relaxed">{task.note}</span>
            <button
              onClick={openNote}
              className="ml-auto shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
              title="Editar observação"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
          </div>
        )}

        {/* Note editor */}
        {noteOpen ? (
          <div className="mt-2.5 space-y-2">
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Adicione uma observação..."
              rows={2}
              className="w-full bg-gray-800/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 resize-none transition-all"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md text-xs font-medium text-white transition-all"
              >
                {noteSaving ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvando...
                  </>
                ) : "Salvar"}
              </button>
              <button
                onClick={() => setNoteOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 bg-gray-800/60 border border-white/6 rounded-md transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          !task.note && (
            <button
              onClick={openNote}
              className="mt-2 inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
              Adicionar observação
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all shrink-0 mt-0.5 p-1 rounded-md hover:bg-red-500/10"
        title="Remover tarefa"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks?completed=true");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('highlightTask');
    if (raw) {
      sessionStorage.removeItem('highlightTask');
      setHighlightedTaskId(raw);
      setTimeout(() => {
        const el = document.getElementById(`task-${raw}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      setTimeout(() => setHighlightedTaskId(null), 4000);
    }
  }, []);

  async function toggleComplete(task: TaskDoc) {
    const newCompleted = !task.completed;

    if (newCompleted) {
      // Start animation
      setCompleting((prev) => new Set(prev).add(task.id));
      // After animation settles, flip local state
      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t)),
        );
        setCompleting((prev) => {
          const s = new Set(prev);
          s.delete(task.id);
          return s;
        });
      }, 550);
    } else {
      // Unchecking — instant
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: false } : t)),
      );
    }

    // Fire API (non-blocking)
    fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newCompleted }),
    });
  }

  async function saveNote(id: string, note: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, note } : t)),
    );
  }

  async function deleteTask(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  const groups = groupByCustomer(tasks);
  const openCount = tasks.filter((t) => !t.completed).length;
  const doneCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-gray-100">Tarefas</h1>
            {openCount > 0 && (
              <span className="inline-flex items-center justify-center text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 min-w-5">
                {openCount}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Ações manuais geradas pela IA — agrupadas por cliente
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900/60 border border-white/6 text-gray-500 hover:text-gray-200 hover:border-white/12 transition-all"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Summary */}
      {!loading && tasks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div className="flex items-center gap-3 bg-gray-900/60 border border-white/6 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pendentes</p>
              <p className="text-lg font-bold text-yellow-400 leading-none">
                {openCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-900/60 border border-white/6 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Concluídas</p>
              <p className="text-lg font-bold text-emerald-400 leading-none">
                {doneCount}
              </p>
            </div>
          </div>
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
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600 border border-white/6 rounded-2xl bg-gray-900/30">
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
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            Nenhuma tarefa ainda
          </p>
          <p className="text-xs text-gray-600 mt-1 text-center max-w-xs">
            As tarefas são criadas quando há necessidade de ação manual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const allDone = group.pending.length === 0;
            const initials = group.customerName
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div
                key={group.customerId}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  allDone
                    ? "border-white/4 bg-gray-900/20"
                    : "border-white/6 bg-gray-900/50"
                }`}
              >
                {/* Customer header */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${allDone ? "border-white/4" : "border-white/5"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        allDone
                          ? "bg-emerald-600/30 text-emerald-400"
                          : "bg-linear-to-br from-indigo-500 to-violet-600"
                      }`}
                    >
                      {allDone ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-sm font-medium ${allDone ? "text-gray-500" : "text-gray-200"}`}
                      >
                        {group.customerName}
                      </span>
                      <span className="text-xs text-gray-600 ml-2">
                        {group.accountEmail}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.pending.length > 0 && (
                      <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5">
                        {group.pending.length} pendente
                        {group.pending.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {group.done.length > 0 && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        {group.done.length} concluída
                        {group.done.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pending tasks */}
                {group.pending.length > 0 && (
                  <div className="divide-y divide-white/4">
                    {group.pending.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={toggleComplete}
                        onDelete={deleteTask}
                        onSaveNote={saveNote}
                        isCompleting={completing.has(task.id)}
                        isHighlighted={highlightedTaskId === task.id}
                      />
                    ))}
                  </div>
                )}

                {/* History divider + completed tasks */}
                {group.done.length > 0 && (
                  <>
                    {group.pending.length > 0 && (
                      <div className="flex items-center gap-3 px-4 py-2 border-t border-white/4 bg-black/20">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-xs text-gray-700 font-medium uppercase tracking-wider">
                          Histórico
                        </span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                    )}
                    <div className="divide-y divide-white/3">
                      {group.done.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={toggleComplete}
                          onDelete={deleteTask}
                          onSaveNote={saveNote}
                          isCompleting={completing.has(task.id)}
                          isHighlighted={highlightedTaskId === task.id}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
