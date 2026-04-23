"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Settings2 } from "lucide-react";

import { APIError, getSettings, updateSettings } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { LocalSettings } from "@/types";

function emptySettings(): LocalSettings {
  return {
    workspace_roots: [],
    artifact_dirs: [],
    default_working_dir: "",
    default_prompt_prefix: "",
    updated_at: null,
    updated_by: null,
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LocalSettings>(emptySettings);
  const [workspaceRootsText, setWorkspaceRootsText] = useState("");
  const [artifactDirsText, setArtifactDirsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const payload = await getSettings();
        setSettings(payload);
        setWorkspaceRootsText(payload.workspace_roots.join("\n"));
        setArtifactDirsText(payload.artifact_dirs.join("\n"));
      } catch {
        setError("設定の読み込みに失敗しました。");
      }
    }
    void load();
  }, []);

  const isAdmin = user?.role === "admin";

  async function handleSave() {
    setSaving(true);
    try {
      const payload = await updateSettings({
        workspace_roots: workspaceRootsText.split(/\n+/).map((item) => item.trim()).filter(Boolean),
        artifact_dirs: artifactDirsText.split(/\n+/).map((item) => item.trim()).filter(Boolean),
        default_working_dir: settings.default_working_dir,
        default_prompt_prefix: settings.default_prompt_prefix,
      });
      setSettings(payload);
      setError(null);
    } catch (err) {
      if (err instanceof APIError && err.status === 403) {
        setError("member 権限では保存できません。");
      } else {
        setError("設定の保存に失敗しました。");
      }
    } finally {
      setSaving(false);
    }
  }

  const saveStatus = useMemo(() => {
    if (!isAdmin) return "read only";
    return saving ? "saving..." : "admin writable";
  }, [isAdmin, saving]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
              <Settings2 className="h-6 w-6 text-emerald-400" />
              共有設定
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              workspace root と artifact 対象、Codex 既定 prefix をローカル JSON に保存します。
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            {saveStatus}
          </span>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">workspace roots</span>
            <textarea
              value={workspaceRootsText}
              onChange={(event) => setWorkspaceRootsText(event.target.value)}
              disabled={!isAdmin}
              rows={6}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">artifact dirs</span>
            <textarea
              value={artifactDirsText}
              onChange={(event) => setArtifactDirsText(event.target.value)}
              disabled={!isAdmin}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">default working dir</span>
            <input
              value={settings.default_working_dir}
              onChange={(event) => setSettings((current) => ({ ...current, default_working_dir: event.target.value }))}
              disabled={!isAdmin}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">default prompt prefix</span>
            <textarea
              value={settings.default_prompt_prefix}
              onChange={(event) => setSettings((current) => ({ ...current, default_prompt_prefix: event.target.value }))}
              disabled={!isAdmin}
              rows={8}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
            />
          </label>
          {error && (
            <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={!isAdmin || saving}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 hover:text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Metadata</p>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">last updated</dt>
            <dd className="mt-1 text-slate-200">{settings.updated_at || "--"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">updated by</dt>
            <dd className="mt-1 text-slate-200">{settings.updated_by || "--"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">current role</dt>
            <dd className="mt-1 text-slate-200">{user?.role}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
