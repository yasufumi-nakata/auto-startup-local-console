"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Settings,
  UserSquare2,
  Workflow,
  X,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";

const items = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/artifacts", label: "成果物", icon: FolderKanban },
  { href: "/tasks", label: "Codex タスク", icon: Workflow },
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/users", label: "ユーザー", icon: UserSquare2, adminOnly: true },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  const visibleItems = items.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <>
      <button
        onClick={() => onMobileOpenChange(true)}
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-[rgba(8,13,22,0.94)] p-2.5 text-slate-200 shadow-[0_18px_40px_rgba(2,6,23,0.28)] lg:hidden"
        aria-label="ナビゲーションを開く"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(7,12,20,0.98),rgba(5,9,16,0.98))] shadow-[0_24px_80px_rgba(2,6,23,0.35)] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => onMobileOpenChange(false)}>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-2 text-sky-200">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">Local Console</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">auto-startup</p>
            </div>
          </Link>
          <button
            onClick={() => onMobileOpenChange(false)}
            className="rounded-xl border border-white/10 p-1.5 text-slate-400 hover:border-white/20 hover:text-white lg:hidden"
            aria-label="ナビゲーションを閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Signed in</p>
          <p className="mt-2 text-sm font-medium text-slate-100">{user?.name}</p>
          <p className="mt-1 text-xs text-slate-400">{user?.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              DB を持たないローカル運用面として、成果物・設定・Codex 実行を一元管理します。
            </p>
          </div>

          <ul className="mt-4 space-y-1">
            {visibleItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => onMobileOpenChange(false)}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "border border-sky-400/20 bg-[linear-gradient(90deg,rgba(14,165,233,0.18),rgba(14,165,233,0.03))] text-slate-50"
                        : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-sky-200" : "group-hover:text-slate-200"}`} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
