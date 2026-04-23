"use client";

import { useEffect, useState } from "react";
import { FileSearch, Search } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

import DataTable, { type Column } from "@/components/DataTable";
import MarkdownPreview from "@/components/MarkdownPreview";
import { getArtifactContent, listArtifacts } from "@/lib/api";
import type { ArtifactContent, ArtifactItem } from "@/types";

function relative(value: string) {
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: ja });
}

export default function ArtifactsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ArtifactItem[]>([]);
  const [selected, setSelected] = useState<ArtifactItem | null>(null);
  const [content, setContent] = useState<ArtifactContent | null>(null);

  useEffect(() => {
    async function load() {
      const result = await listArtifacts(query);
      setItems(result.items);
      if (!selected && result.items[0]) {
        setSelected(result.items[0]);
      }
    }
    void load();
  }, [query, selected]);

  useEffect(() => {
    async function loadPreview() {
      if (!selected) {
        setContent(null);
        return;
      }
      const result = await getArtifactContent(selected.path);
      setContent(result);
    }
    void loadPreview();
  }, [selected]);

  const columns: Column<ArtifactItem>[] = [
    {
      key: "display_path",
      header: "成果物",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{row.display_path}</p>
          <p className="mt-1 text-xs text-slate-500">{row.workspace_root}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "カテゴリ",
      sortable: true,
    },
    {
      key: "modified_at",
      header: "更新",
      sortable: true,
      render: (row) => <span className="text-xs text-slate-400">{relative(row.modified_at)}</span>,
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="path や category で検索"
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={items}
          pageSize={8}
          pageSizeOptions={[8, 16, "all"]}
          emptyMessage="成果物が見つかりません"
          emptyHint="settings で workspace roots と artifact dirs を確認してください。"
          selectedRowId={selected?.path ?? null}
          onRowClick={(row) => setSelected(row)}
        />
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-6">
        {content ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-100">{content.display_path}</p>
                <p className="mt-1 text-xs text-slate-500">{content.workspace_root}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                {content.extension}
              </div>
            </div>
            {content.content_type === "text" && content.preview ? (
              content.extension === ".md" ? (
                <MarkdownPreview content={content.preview} />
              ) : (
                <pre className="overflow-auto rounded-2xl border border-white/10 bg-[rgba(6,11,18,0.95)] p-4 text-xs leading-6 text-slate-300">
                  {content.preview}
                </pre>
              )
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
                {content.content_type === "pdf"
                  ? "PDF はプレビュー対象外です。ファイルパスから直接開いてください。"
                  : "この形式はテキストプレビュー対象外です。"}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
              <FileSearch className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-300">左側から成果物を選択してください。</p>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              markdown / json / csv / txt は preview、pdf は path の確認用に扱います。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
