"use client";

import { useEffect, useState } from "react";
import { ShieldPlus, UserRoundPlus } from "lucide-react";

import DataTable, { type Column } from "@/components/DataTable";
import { APIError, createUser, listUsers, updateUser } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { User } from "@/types";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  async function refresh() {
    try {
      const payload = await listUsers();
      setUsers(payload);
      setError(null);
    } catch (err) {
      if (err instanceof APIError && err.status === 403) {
        setError("この画面は admin のみ利用できます。");
      } else {
        setError("ユーザー一覧の取得に失敗しました。");
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const payload = await listUsers();
        if (!active) {
          return;
        }
        setUsers(payload);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof APIError && err.status === 403) {
          setError("この画面は admin のみ利用できます。");
        } else {
          setError("ユーザー一覧の取得に失敗しました。");
        }
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "ユーザー",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{row.name}</p>
          <p className="mt-1 text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "権限",
      render: (row) => (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {row.role}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "状態",
      render: (row) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            updateUser(row.id, { is_active: !row.is_active }).then(refresh).catch(() => setError("更新に失敗しました。"));
          }}
          className={`rounded-full border px-3 py-1 text-xs ${
            row.is_active
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-slate-500/30 bg-slate-500/10 text-slate-300"
          }`}
        >
          {row.is_active ? "active" : "inactive"}
        </button>
      ),
    },
  ];

  async function handleCreate() {
    try {
      await createUser({ email, name, password, role });
      setEmail("");
      setName("");
      setPassword("");
      setRole("member");
      await refresh();
    } catch (err) {
      if (err instanceof APIError && err.status === 403) {
        setError("admin 権限が必要です。");
      } else {
        setError("ユーザー追加に失敗しました。");
      }
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section>
        <DataTable
          columns={columns}
          data={users}
          pageSize={10}
          pageSizeOptions={[10, "all"]}
          emptyMessage="ユーザーを表示できません"
          emptyHint={error || "admin 権限でログインしているか確認してください。"}
        />
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
        <div className="flex items-center gap-2 text-slate-100">
          <ShieldPlus className="h-5 w-5 text-sky-300" />
          <h2 className="text-lg font-medium">ユーザー追加</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          現在のログイン権限: <span className="text-slate-200">{currentUser?.role}</span>
        </p>
        <div className="mt-5 space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="表示名"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="メールアドレス"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="初期パスワード"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "admin" | "member")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          {error && (
            <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <button
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 hover:text-white"
          >
            <UserRoundPlus className="h-4 w-4" />
            追加
          </button>
        </div>
      </section>
    </div>
  );
}
