"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";

const routeMeta = [
  {
    match: (pathname: string) => pathname === "/",
    kicker: "Overview",
    title: "ローカル運転席",
    description: "workspace roots、成果物、Codex 実行状況を 1 画面で把握します。",
  },
  {
    match: (pathname: string) => pathname.startsWith("/artifacts"),
    kicker: "Artifacts",
    title: "成果物ブラウザ",
    description: "markdown / json / csv / pdf をまたいで最新成果物を確認します。",
  },
  {
    match: (pathname: string) => pathname.startsWith("/tasks"),
    kicker: "Operations",
    title: "Codex タスク運用",
    description: "ローカル実行タスクの生成、監視、再試行、取消を扱います。",
  },
  {
    match: (pathname: string) => pathname.startsWith("/settings"),
    kicker: "Configuration",
    title: "共有設定",
    description: "workspace root、artifact 対象、既定 working dir を保ちます。",
  },
  {
    match: (pathname: string) => pathname.startsWith("/users"),
    kicker: "Access",
    title: "利用者管理",
    description: "複数人のログインと運用権限をローカルで管理します。",
  },
];

function resolveRouteMeta(pathname: string) {
  return routeMeta.find((item) => item.match(pathname)) ?? routeMeta[0];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = useMemo(() => resolveRouteMeta(pathname), [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <header className="sticky top-0 z-30 overflow-hidden border-b border-white/10 bg-[rgba(7,12,20,0.82)] px-6 py-4 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_24%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="ml-12 space-y-1 lg:ml-0">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{meta.kicker}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-base font-semibold text-slate-50 sm:text-lg">{meta.title}</h1>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                {user?.role === "admin" ? "admin" : "member"}
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{meta.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              ログアウト
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/tasks")}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 hover:text-white"
            >
              タスクへ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="px-6 pb-10 pt-6 md:px-8">{children}</main>
    </div>
  );
}
