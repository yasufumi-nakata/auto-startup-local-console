import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  trend?: number; // percentage change, positive = up
  caption?: string;
}

export default function KPICard({ icon: Icon, title, value, trend, caption }: KPICardProps) {
  let TrendIcon = Minus;
  let trendColor = "text-gray-400";
  let trendLabel = "変化なし";

  if (trend !== undefined && trend !== 0) {
    if (trend > 0) {
      TrendIcon = TrendingUp;
      trendColor = "text-green-400";
      trendLabel = `+${trend.toFixed(1)}%`;
    } else {
      TrendIcon = TrendingDown;
      trendColor = "text-red-400";
      trendLabel = `${trend.toFixed(1)}%`;
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,28,0.92),rgba(8,13,22,0.9))] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.22)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-sky-400/15 bg-sky-400/10 p-2.5">
          <Icon className="h-5 w-5 text-sky-200" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-50">{value}</p>
        {caption && <p className="mt-2 text-xs leading-5 text-slate-400">{caption}</p>}
      </div>
    </div>
  );
}
