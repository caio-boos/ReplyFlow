"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TaskDoc, TaskPriority } from "@/lib/types";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  high: { label: "ALTA", color: "bg-red-900/50 text-red-300 border-red-800", dot: "bg-red-400" },
  medium: { label: "MÉDIA", color: "bg-yellow-900/50 text-yellow-300 border-yellow-800", dot: "bg-yellow-400" },
  low: { label: "BAIXA", color: "bg-gray-800 text-gray-400 border-gray-700", dot: "bg-gray-500" },
};

const FLAG_LABELS: Record<string, string> = {
  chargeback_risk: "⚠️ Chargeback",
  manual_review: "👁 Revisão manual",
  refund_pending: "💰 Reembolso",
  address_problem: "📍 Endereço",
};

interface CustomerGroup {
  customerId: string;
  customerName: string;
  accountEmail: string;
  pending: TaskDoc[];
  done: TaskDoc[];
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

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
    g.pending.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    g.done.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
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
}: {
  task: TaskDoc;
  onToggle: (t: TaskDoc) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = PRIORITY_CONFIG[task.priority];
  return (
    <div
      className={`px-4 py-3 flex gap-3 items-start transition-all ${
        task.completed ? "bg-green-950/20" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? "bg-green-600 border-green-600 text-white"
            : "border-gray-600 hover:border-indigo-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className={`flex-1 min-w-0 ${task.completed ? "opacity-50" : ""}`}>
        <p className={`text-sm font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
          {task.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`text-xs px-2 py-0.5 rounded border ${task.completed ? "opacity-50 " : ""}${cfg.color}`}>
            {cfg.label}
          </span>
          {task.flags &&
            Object.entries(task.flags)
              .filter(([k, v]) => v && FLAG_LABELS[k])
              .map(([k]) => (
                <span key={k} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
                  {FLAG_LABELS[k]}
                </span>
              ))}
          <Link
            href={`/emails/${task.emailId}`}
            className="text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors truncate max-w-xs"
          >
            📧 {task.emailSubject}
          </Link>
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-700 hover:text-red-400 transition-colors shrink-0 mt-0.5 text-sm"
        title="Remover tarefa"
      >
        ✕
      </button>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    setLoading(true);
    // Always load all tasks (including completed) for full history
    const res = await fetch("/api/tasks?completed=true");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
    setLoading(false);
  }

  useEffect(() => { loadTasks(); }, []);

  async function toggleComplete(task: TaskDoc) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    loadTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  const groups = groupByCustomer(tasks);
  const openCount = tasks.filter((t) => !t.completed).length;
  const doneCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            Tarefas
            {openCount > 0 && (
              <span className="text-sm bg-red-600 text-white rounded-full px-2 py-0.5 font-medium">{openCount}</span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Ações manuais geradas pela IA — agrupadas por cliente</p>
        </div>
        <button
          onClick={loadTasks}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 bg-gray-800 rounded-lg"
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Summary bar */}
      {!loading && tasks.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">{openCount}</span> pendente{openCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">{doneCount}</span> concluída{doneCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
          <p className="text-lg mb-1">Nenhuma tarefa ainda</p>
          <p className="text-sm">As tarefas são criadas quando o cliente aceita um estorno ou há necessidade de ação manual.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const allDone = group.pending.length === 0;
            return (
              <div
                key={group.customerId}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  allDone
                    ? "bg-gray-900/50 border-gray-800/60"
                    : "bg-gray-900 border-gray-700"
                }`}
              >
                {/* Customer header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${allDone ? "border-gray-800/60" : "border-gray-800"}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        allDone ? "bg-green-800" : "bg-indigo-700"
                      }`}
                    >
                      {allDone ? "✓" : group.customerName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${allDone ? "text-gray-400" : "text-gray-100"}`}>
                        {group.customerName}
                      </span>
                      <span className="text-xs text-gray-600 ml-2">{group.accountEmail}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.pending.length > 0 && (
                      <span className="text-xs bg-yellow-900/60 text-yellow-400 border border-yellow-800/50 rounded-full px-2 py-0.5">
                        {group.pending.length} pendente{group.pending.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {group.done.length > 0 && (
                      <span className="text-xs bg-green-900/40 text-green-500 border border-green-900/50 rounded-full px-2 py-0.5">
                        {group.done.length} concluída{group.done.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pending tasks */}
                {group.pending.length > 0 && (
                  <div className="divide-y divide-gray-800">
                    {group.pending.map((task) => (
                      <TaskRow key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {/* History divider + completed tasks */}
                {group.done.length > 0 && (
                  <>
                    {group.pending.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-950/40 border-t border-gray-800">
                        <div className="h-px flex-1 bg-gray-800" />
                        <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">Histórico</span>
                        <div className="h-px flex-1 bg-gray-800" />
                      </div>
                    )}
                    <div className={`divide-y divide-gray-800/50 ${allDone ? "" : "bg-gray-950/30"}`}>
                      {group.done.map((task) => (
                        <TaskRow key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
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
