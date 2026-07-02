"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  MessageSquareText,
  CalendarCheck,
  Target,
  Timer,
  ArrowDownRight,
} from "lucide-react";
import { KpiCard } from "./KpiCard";
import { LeadBadge } from "@/components/shared/lead-badge";
import { Badge } from "@/components/ui/badge";
import { pct, relativeTime } from "@/lib/utils";
import type { LeadTemperature } from "@/lib/types";

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  dropoff: number;
  conversion: number;
}
interface Kpis {
  totalChats: number;
  meetings: number;
  chatToMeeting: number;
  sqls: number;
  chatToSql: number;
  avgQualificationMinutes: number;
}
interface RecentSession {
  id: string;
  page: string;
  status: string;
  temperature: LeadTemperature | null;
  score: number | null;
  contact_name: string | null;
  company: string | null;
  started_at: string;
  outcome: string;
}

const STAGE_COLORS = [
  "hsl(263 90% 63%)",
  "hsl(268 85% 62%)",
  "hsl(255 82% 62%)",
  "hsl(200 85% 55%)",
  "hsl(173 80% 45%)",
  "hsl(160 80% 45%)",
];

export function AnalyticsView({
  funnel,
  kpis,
  trend,
  recent,
}: {
  funnel: FunnelStage[];
  kpis: Kpis;
  trend: { date: string; chats: number; meetings: number }[];
  recent: RecentSession[];
}) {
  const top = funnel[0]?.count || 1;
  const chatTrend = trend.map((t) => t.chats);
  const meetTrend = trend.map((t) => t.meetings);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total chats"
          value={String(kpis.totalChats)}
          delta={14}
          icon={MessageSquareText}
          trend={chatTrend}
          accent="hsl(263 90% 63%)"
        />
        <KpiCard
          label="Chat → meeting"
          value={pct(kpis.chatToMeeting, 1)}
          delta={6}
          icon={CalendarCheck}
          trend={meetTrend}
          accent="hsl(173 80% 45%)"
        />
        <KpiCard
          label="Chat → SQL"
          value={pct(kpis.chatToSql, 1)}
          delta={8}
          icon={Target}
          trend={[3, 4, 4, 5, 6, 7, 7, 8]}
          accent="hsl(38 92% 55%)"
        />
        <KpiCard
          label="Avg. qualification time"
          value={`${kpis.avgQualificationMinutes.toFixed(1)}m`}
          delta={-11}
          icon={Timer}
          trend={[6, 5, 5, 4, 4, 3, 4, 3]}
          accent="hsl(280 90% 60%)"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Funnel */}
        <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Conversion funnel</h2>
            <Badge variant="secondary">{top} chats</Badge>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            From first hello to a created opportunity.
          </p>
          <div className="space-y-3">
            {funnel.map((s, i) => {
              const widthPct = Math.max((s.count / top) * 100, 4);
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {s.count}
                      </span>
                      {i > 0 && s.dropoff > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-hot">
                          <ArrowDownRight className="h-3 w-3" />
                          {pct(s.dropoff)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-9 w-full overflow-hidden rounded-xl bg-secondary/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{
                        duration: 0.9,
                        delay: i * 0.1,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      className="flex h-full items-center rounded-xl px-3"
                      style={{
                        background: `linear-gradient(90deg, ${STAGE_COLORS[i]}, ${
                          STAGE_COLORS[i]
                        }cc)`,
                      }}
                    >
                      <span className="text-xs font-semibold text-white/90">
                        {pct(s.conversion)}
                      </span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend area chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
          <h2 className="font-display text-lg font-semibold">Activity · 14 days</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Chats started vs. meetings booked.
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 6, right: 6, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(263 90% 63%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(263 90% 63%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gMeet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(173 80% 45%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(173 80% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(230 20% 30% / 0.2)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tick={{ fill: "hsl(220 12% 62%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "hsl(220 12% 62%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={34}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(230 28% 9%)",
                    border: "1px solid hsl(230 20% 20%)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(220 20% 96%)" }}
                  labelFormatter={(d) =>
                    new Date(d as string).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke="hsl(263 90% 63%)"
                  strokeWidth={2}
                  fill="url(#gChats)"
                  name="Chats"
                />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  stroke="hsl(173 80% 45%)"
                  strokeWidth={2}
                  fill="url(#gMeet)"
                  name="Meetings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet" /> Chats
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal" /> Meetings
            </span>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-2xl border border-white/[0.06] bg-card/40">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Recent sessions</h2>
          <Badge variant="secondary">Live</Badge>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recent.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No sessions recorded yet.
            </p>
          ) : (
            recent.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="flex items-center gap-4 px-6 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.contact_name || "Anonymous visitor"}
                    {s.company ? (
                      <span className="text-muted-foreground"> · {s.company}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    on {s.page} · {relativeTime(s.started_at)}
                  </p>
                </div>
                {s.temperature ? (
                  <LeadBadge
                    temperature={s.temperature}
                    score={s.score ?? undefined}
                  />
                ) : (
                  <Badge variant="secondary">Unscored</Badge>
                )}
                <span className="hidden w-36 text-right text-sm text-muted-foreground sm:block">
                  {s.outcome}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
