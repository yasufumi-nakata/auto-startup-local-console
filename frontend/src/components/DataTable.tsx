"use client";

import { type ReactNode, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, SearchX } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  caption?: string;
  pageSize?: number;
  pageSizeOptions?: Array<number | "all">;
  selectedRowId?: string | null;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "データなし",
  emptyHint,
  emptyActionLabel,
  onEmptyAction,
  caption,
  pageSize = 10,
  pageSizeOptions,
  selectedRowId = null,
  onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSizeValue, setPageSizeValue] = useState<number | "all">(pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const activeSortKey = sortKey;
    const sortColumn = columns.find((column) => column.key === activeSortKey);

    function valueFor(row: T): string | number | null | undefined {
      if (sortColumn?.sortValue) {
        return sortColumn.sortValue(row);
      }
      return (row as Record<string, unknown>)[activeSortKey] as string | number | null | undefined;
    }

    return [...data].sort((a, b) => {
      const aVal = valueFor(a);
      const bVal = valueFor(b);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "ja");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [columns, data, sortKey, sortDir]);

  const effectivePageSize =
    pageSizeValue === "all" ? Math.max(sorted.length, 1) : pageSizeValue;
  const totalPages = Math.max(1, Math.ceil(sorted.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(
    currentPage * effectivePageSize,
    (currentPage + 1) * effectivePageSize
  );

  function getRowId(row: T, index: number): string {
    const maybeId = (row as { id?: string | number }).id;
    if (typeof maybeId === "string" || typeof maybeId === "number") {
      return String(maybeId);
    }
    return String(index);
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
          読み込み中...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(9,15,25,0.86)] p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
            <SearchX className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-100">{emptyMessage}</p>
            {emptyHint && (
              <p className="max-w-xl text-sm leading-6 text-slate-400">{emptyHint}</p>
            )}
          </div>
          {emptyActionLabel && onEmptyAction && (
            <button
              onClick={onEmptyAction}
              className="rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-white"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {((pageSizeOptions && pageSizeOptions.length > 0) || caption) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rows</p>
            <p className="text-sm text-slate-300">{sorted.length} 件</p>
            {caption && <p className="max-w-2xl text-xs leading-5 text-slate-500">{caption}</p>}
          </div>
          {pageSizeOptions && pageSizeOptions.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              表示件数
              <select
                value={String(pageSizeValue)}
                onChange={(event) => {
                  const nextValue = event.target.value === "all" ? "all" : Number(event.target.value);
                  setPageSizeValue(nextValue);
                  setPage(0);
                }}
                className="rounded-full border border-white/10 bg-[rgba(8,13,22,0.92)] px-3 py-1.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                {pageSizeOptions.map((option) => (
                  <option key={String(option)} value={String(option)}>
                    {option === "all" ? "全件" : `${option}件`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-[rgba(9,15,25,0.86)] shadow-[0_20px_70px_rgba(3,7,18,0.28)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[rgba(7,12,20,0.96)] text-slate-300 backdrop-blur-md">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="sticky top-0 z-10 px-4 py-3 text-xs font-medium tracking-[0.12em] text-slate-400"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-left hover:text-white"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {paged.map((row, i) => (
              <tr
                key={getRowId(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                aria-selected={selectedRowId != null && selectedRowId === getRowId(row, i)}
                className={`${
                  i % 2 === 0 ? "bg-[rgba(10,16,28,0.9)]" : "bg-[rgba(8,13,22,0.88)]"
                } ${
                  onRowClick ? "cursor-pointer hover:bg-[rgba(20,32,52,0.92)]" : ""
                } ${
                  selectedRowId != null && selectedRowId === getRowId(row, i)
                    ? "bg-[rgba(12,35,58,0.92)] ring-1 ring-inset ring-sky-500/30"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 align-top text-slate-300">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {sorted.length}件中 {currentPage * effectivePageSize + 1}–
            {Math.min((currentPage + 1) * effectivePageSize, sorted.length)} 件を表示
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
            >
              前へ
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
