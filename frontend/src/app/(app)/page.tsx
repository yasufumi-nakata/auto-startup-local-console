"use client";

import { useEffect, useState } from "react";
import { FolderClock, ShieldCheck, UsersRound, Workflow } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

import KPICard from "@/components/KPICard";
import { getDashboardSummary } from "@/lib/api";
import type { DashboardSummary } from "@/types";

function relative(value: string) {
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: ja });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const payload = await getDashboardSummary();
        setSummary(payload);
        setError(null);
      } catch {
        setError("ダッシュボードの読み込みに失敗しました。");
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,16,27,0.94),rgba(11,21,37,0.92))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Snapshot</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-50">いまの local workspace を即読する</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              DB 抜きで運用したい成果物、Codex 実行、共有設定、権限だけを切り出した control-plane です。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Codex</p>
              <p className="mt-2 text-sm font-medium text-slate-100">
                {summary?.codex_available ? "実行可能" : "未検出"}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recent artifacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{summary?.artifact_count ?? "--"}</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard icon={FolderClock} title="成果物候補" value={summary?.artifact_count ?? "--"} />
        <KPICard icon={Workflow} title="実行中タスク" value={summary?.tasks_running ?? "--"} />
        <KPICard icon={UsersRound} title="有効ユーザー" value={summary?.users_active ?? "--"} />
        <KPICard icon={ShieldCheck} title="workspace root" value={summary?.workspace_count ?? "--"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
          <h3 className="text-lg font-medium text-slate-100">最新成果物</h3>
          <div className="mt-4 space-y-3">
            {summary?.latest_artifacts.length ? (
              summary.latest_artifacts.map((item) => (
                <div key={item.path} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-slate-100">{item.display_path}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.workspace_root}</p>
                  <p className="mt-2 text-xs text-slate-400">{relative(item.modified_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">表示できる成果物がありません。</p>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
          <h3 className="text-lg font-medium text-slate-100">Workspace health</h3>
          <div className="mt-4 space-y-3">
            {summary?.workspace_health.map((item) => (
              <div key={item.root} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-slate-100">{item.root}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {item.exists ? "exists" : "missing"} / artifacts: {item.artifact_count}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
