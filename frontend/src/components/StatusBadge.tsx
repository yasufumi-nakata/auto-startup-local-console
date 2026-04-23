const colorMap: Record<string, string> = {
  // ロール
  admin: "bg-cyan-600 text-cyan-100",
  operator: "bg-sky-600 text-sky-100",
  viewer: "bg-slate-600 text-slate-100",
  preview: "bg-violet-600 text-violet-100",
  connected: "bg-emerald-600 text-emerald-100",
  online: "bg-emerald-600 text-emerald-100",
  idle: "bg-amber-600 text-amber-100",
  offline: "bg-slate-600 text-slate-100",
  // 助成金ステータス
  discovered: "bg-gray-600 text-gray-200",
  matched: "bg-blue-600 text-blue-100",
  drafting: "bg-amber-600 text-amber-100",
  reviewing: "bg-orange-600 text-orange-100",
  ready: "bg-green-600 text-green-100",
  submitted: "bg-purple-600 text-purple-100",
  // 研究ステータス
  identified: "bg-gray-600 text-gray-200",
  running: "bg-blue-600 text-blue-100",
  analyzed: "bg-cyan-600 text-cyan-100",
  drafted: "bg-indigo-600 text-indigo-100",
  review_failed: "bg-rose-700 text-rose-100",
  reviewed: "bg-green-600 text-green-100",
  finalized: "bg-teal-600 text-teal-100",
  archived: "bg-slate-600 text-slate-100",
  // Codex ステータス
  queued: "bg-gray-600 text-gray-200",
  completed: "bg-green-600 text-green-100",
  failed: "bg-red-600 text-red-100",
  cancelled: "bg-gray-500 text-gray-200",
  high: "bg-rose-600 text-rose-100",
  medium: "bg-amber-600 text-amber-100",
  low: "bg-emerald-600 text-emerald-100",
  // カレンダーイベント
  grant_deadline: "bg-red-600 text-red-100",
  milestone: "bg-blue-600 text-blue-100",
  // システムステータス
  healthy: "bg-green-600 text-green-100",
  degraded: "bg-yellow-600 text-yellow-100",
  down: "bg-red-600 text-red-100",
};

const labelMap: Record<string, string> = {
  // ロール
  admin: "管理者",
  operator: "運用担当",
  viewer: "閲覧専用",
  preview: "ローカル",
  connected: "接続済み",
  online: "オンライン",
  idle: "待機中",
  offline: "オフライン",
  // 助成金ステータス
  discovered: "発見済み",
  matched: "マッチ済み",
  drafting: "作成中",
  reviewing: "レビュー中",
  ready: "準備完了",
  submitted: "提出済み",
  // 研究ステータス
  identified: "特定済み",
  running: "実行中",
  analyzed: "解析済み",
  drafted: "ドラフト済み",
  review_failed: "レビュー差戻し",
  reviewed: "レビュー済み",
  finalized: "最終化済み",
  archived: "保管済み",
  // Codex ステータス
  queued: "待機中",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル",
  high: "高",
  medium: "中",
  low: "低",
  // カレンダーイベント
  grant_deadline: "締切",
  milestone: "マイルストーン",
  // システムステータス
  healthy: "正常",
  degraded: "低下",
  down: "停止",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = colorMap[status] || "bg-gray-600 text-gray-200";
  const label = labelMap[status] || status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors} ${className}`}
    >
      {label}
    </span>
  );
}
