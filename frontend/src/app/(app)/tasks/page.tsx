"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, XCircle } from "lucide-react";

import DataTable, { type Column } from "@/components/DataTable";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import {
  buildWebSocketUrl,
  cancelTask,
  createTask,
  getTaskEvents,
  getTaskStats,
  listTasks,
  retryTask,
} from "@/lib/api";
import type { Task, TaskEvent, TaskStats, TaskType } from "@/types";

const taskTypeOptions: { value: TaskType; label: string }[] = [
  { value: "code_analysis", label: "コード解析" },
  { value: "writing", label: "文章作成" },
  { value: "review", label: "レビュー" },
  { value: "automation", label: "運用タスク" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [prompt, setPrompt] = useState("");
  const [workingDir, setWorkingDir] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("code_analysis");
  const [submitting, setSubmitting] = useState(false);
  const selectedRef = useRef<string | null>(null);

  async function refresh() {
    const [taskRows, statRows] = await Promise.all([listTasks(), getTaskStats()]);
    setTasks(taskRows);
    setStats(statRows);
    if (!selectedRef.current && taskRows[0]) {
      selectedRef.current = taskRows[0].id;
      setSelectedTask(taskRows[0]);
    }
  }

  async function loadEvents(taskId: string) {
    const nextEvents = await getTaskEvents(taskId);
    setEvents(nextEvents);
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const [taskRows, statRows] = await Promise.all([listTasks(), getTaskStats()]);
      if (!active) {
        return;
      }
      setTasks(taskRows);
      setStats(statRows);
      if (!selectedRef.current && taskRows[0]) {
        selectedRef.current = taskRows[0].id;
        setSelectedTask(taskRows[0]);
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const task = selectedTask;
    if (!task) return;
    const taskId = task.id;
    selectedRef.current = taskId;
    let active = true;

    async function loadSelected() {
      const nextEvents = await getTaskEvents(taskId);
      if (active) {
        setEvents(nextEvents);
      }
    }

    void loadSelected();
    return () => {
      active = false;
    };
  }, [selectedTask]);

  useEffect(() => {
    const socket = new WebSocket(buildWebSocketUrl("/ws/tasks"));
    socket.onmessage = (message) => {
      const payload = JSON.parse(message.data) as TaskEvent;
      if (payload.task) {
        setTasks((current) => {
          const exists = current.some((item) => item.id === payload.task?.id);
          const next = exists
            ? current.map((item) => (item.id === payload.task?.id ? payload.task! : item))
            : [payload.task!, ...current];
          return [...next].sort((left, right) => right.created_at.localeCompare(left.created_at));
        });
        if (payload.task.id === selectedRef.current) {
          setSelectedTask(payload.task);
          void loadEvents(payload.task.id);
        }
        void refresh();
      }
    };
    return () => socket.close();
  }, []);

  const columns: Column<Task>[] = [
    {
      key: "type",
      header: "種別",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-100">
            {taskTypeOptions.find((item) => item.value === row.type)?.label ?? row.type}
          </p>
          <p className="mt-1 text-xs text-slate-500">{row.created_by_name || "unknown"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "状態",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "prompt",
      header: "プロンプト",
      render: (row) => <p className="line-clamp-2 max-w-xl text-xs text-slate-300">{row.prompt}</p>,
    },
  ];

  const running = useMemo(() => tasks.filter((task) => task.status === "running").length, [tasks]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const task = await createTask({
        type: taskType,
        prompt,
        working_dir: workingDir || undefined,
      });
      setPrompt("");
      setWorkingDir("");
      setSelectedTask(task);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard icon={Loader2} title="実行中" value={running} />
        <KPICard icon={CheckCircle2} title="完了" value={stats?.completed ?? "--"} />
        <KPICard icon={AlertCircle} title="失敗" value={stats?.failed ?? "--"} />
        <KPICard icon={XCircle} title="取消" value={stats?.cancelled ?? "--"} />
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
        <div className="grid gap-4 xl:grid-cols-[220px_1fr_260px_auto]">
          <select
            value={taskType}
            onChange={(event) => setTaskType(event.target.value as TaskType)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
          >
            {taskTypeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Codex に渡すプロンプト"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <input
            value={workingDir}
            onChange={(event) => setWorkingDir(event.target.value)}
            placeholder="working dir (任意)"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={!prompt.trim() || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 hover:text-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <DataTable
          columns={columns}
          data={tasks}
          pageSize={10}
          pageSizeOptions={[10, 20, "all"]}
          selectedRowId={selectedTask?.id ?? null}
          onRowClick={(row) => setSelectedTask(row)}
          emptyMessage="タスクはまだありません"
        />

        <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
          {selectedTask ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{selectedTask.id}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedTask.working_dir || "(default working dir)"}</p>
                </div>
                <StatusBadge status={selectedTask.status} />
              </div>
              <pre className="overflow-auto rounded-2xl border border-white/10 bg-[rgba(6,11,18,0.95)] p-4 text-xs leading-6 text-slate-300">
                {selectedTask.prompt}
              </pre>
              <div className="flex flex-wrap gap-2">
                {selectedTask.status === "failed" && (
                  <button
                    onClick={() => retryTask(selectedTask.id).then(refresh)}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    再試行
                  </button>
                )}
                {["queued", "running"].includes(selectedTask.status) && (
                  <button
                    onClick={() => cancelTask(selectedTask.id).then(refresh)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    取消
                  </button>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Result</p>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">
                  {selectedTask.result || "(結果待ち)"}
                </pre>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Events</p>
                <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                  {events.map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} className="rounded-xl border border-white/8 bg-[rgba(7,12,20,0.96)] px-3 py-2 text-xs text-slate-300">
                      <p className="font-medium text-slate-200">{event.event}</p>
                      {event.message && <pre className="mt-1 whitespace-pre-wrap">{event.message}</pre>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">左側からタスクを選択してください。</p>
          )}
        </section>
      </div>
    </div>
  );
}
