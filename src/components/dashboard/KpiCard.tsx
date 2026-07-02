import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

function Sparkline({
  data,
  color = "hsl(263 90% 63%)",
}: {
  data: number[];
  color?: string;
}) {
  const w = 96;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / range) * h;
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  trend,
  accent = "hsl(263 90% 63%)",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  trend?: number[];
  accent?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="group rounded-2xl border border-border bg-card/50 p-5 transition-all hover:border-foreground/20">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent.replace(")", " / 0.14)")}`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              up ? "bg-teal/10 text-teal" : "bg-hot/10 text-hot"
            )}
          >
            {up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-bold tracking-tight">{value}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {trend && trend.length > 1 && <Sparkline data={trend} color={accent} />}
      </div>
    </div>
  );
}
