"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Blocks, KeyRound } from "lucide-react";

import { APIError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@local");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        setError("メールアドレスまたはパスワードが違います。");
      } else {
        setError("ログインに失敗しました。");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(8,13,22,0.88)] shadow-[0_30px_100px_rgba(2,6,23,0.3)] lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden p-8 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.14),transparent_26%)]" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-100">
              <Blocks className="h-4 w-4" />
              auto-startup local console
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Local Control Plane</p>
              <h1 className="mt-3 text-4xl font-semibold text-slate-50">
                DB を切り離した
                <br />
                ローカル運用面
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                成果物ブラウズ、Codex 実行、設定、複数人ログインをローカルだけで扱うための軽量 OSS アプリです。
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[rgba(5,10,18,0.92)] p-8 lg:border-l lg:border-t-0 lg:p-12">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Sign In</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-50">ログイン</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                初回起動時の admin 資格情報は `backend/data/bootstrap-admin.txt` に生成されます。
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">メールアドレス</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder="admin@local"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">パスワード</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-11 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    placeholder="パスワード"
                  />
                </div>
              </label>
              {error && (
                <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 hover:text-white disabled:opacity-60"
              >
                {submitting ? "ログイン中..." : "ログイン"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
