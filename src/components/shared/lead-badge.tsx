import { Badge } from "@/components/ui/badge";
import { Snowflake, Flame, Thermometer } from "lucide-react";
import type { LeadTemperature } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  LeadTemperature,
  { label: string; icon: typeof Flame; variant: "cold" | "warm" | "hot" }
> = {
  cold: { label: "Cold", icon: Snowflake, variant: "cold" },
  warm: { label: "Warm", icon: Thermometer, variant: "warm" },
  hot: { label: "Hot", icon: Flame, variant: "hot" },
};

export function LeadBadge({
  temperature,
  score,
  className,
}: {
  temperature: LeadTemperature;
  score?: number;
  className?: string;
}) {
  const c = CONFIG[temperature];
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className={cn("capitalize", className)}>
      <Icon className="h-3 w-3" />
      {c.label}
      {typeof score === "number" && (
        <span className="opacity-70">· {score}/11</span>
      )}
    </Badge>
  );
}
