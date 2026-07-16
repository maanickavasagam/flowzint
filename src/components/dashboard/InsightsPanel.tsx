"use client";

import { motion } from "framer-motion";
import { MessageSquareWarning, TrendingDown, Lightbulb } from "lucide-react";
import { pct } from "@/lib/utils";

interface ObjectionStat {
  key: string;
  label: string;
  raised: number;
  booked: number;
  lost: number;
  bookedRate: number;
}
interface DropOffStat {
  field: string;
  label: string;
  stalled: number;
  pct: number;
}

/**
 * Turns raw conversation data into business insight: which objections cost the
 * most pipeline, and which question bleeds the funnel.
 */
export function InsightsPanel({
  objections,
  dropOff,
}: {
  objections: ObjectionStat[];
  dropOff: DropOffStat[];
}) {
  const worstObjection = objections[0];
  const worstDrop = [...dropOff].sort((a, b) => b.stalled - a.stalled)[0];
  const maxDrop = Math.max(1, ...dropOff.map((d) => d.stalled));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Objections */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-1 flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-warm" />
          <h2 className="font-display text-lg font-semibold">
            Objection impact
          </h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          What visitors push back on — and whether they booked anyway.
        </p>

        {objections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No objections recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {objections.map((o, i) => (
              <div key={o.key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {o.raised}
                    </span>{" "}
                    raised ·{" "}
                    <span className="text-teal">{o.booked} booked</span>
                  </span>
                </div>
                {/* booked vs lost split */}
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${o.bookedRate * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    className="bg-teal"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(1 - o.bookedRate) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    className="bg-hot/70"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pct(1 - o.bookedRate)} of these leads never booked
                </p>
              </div>
            ))}
          </div>
        )}

        {worstObjection && worstObjection.lost > 0 && (
          <div className="mt-5 flex gap-2 rounded-xl border border-warm/30 bg-warm/10 p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warm" />
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">
                &ldquo;{worstObjection.label}&rdquo;
              </span>{" "}
              is your costliest objection —{" "}
              {pct(1 - worstObjection.bookedRate)} of leads who raised it never
              booked. Consider strengthening that rebuttal.
            </p>
          </div>
        )}
      </div>

      {/* Drop-off */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-1 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-hot" />
          <h2 className="font-display text-lg font-semibold">
            Where visitors drop off
          </h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          The question unfinished conversations stall on.
        </p>

        {dropOff.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No abandoned conversations — everyone finished.
          </p>
        ) : (
          <div className="space-y-3">
            {dropOff.map((d, i) => (
              <div key={d.field} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">
                  {d.label}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-secondary/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.stalled / maxDrop) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06 }}
                    className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-violet/70 to-hot/70 px-2"
                  >
                    <span className="text-[11px] font-semibold text-white">
                      {d.stalled}
                    </span>
                  </motion.div>
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {pct(d.pct)}
                </span>
              </div>
            ))}
          </div>
        )}

        {worstDrop && (
          <div className="mt-5 flex gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">{pct(worstDrop.pct)}</span> of
              abandoned chats stall at{" "}
              <span className="font-semibold">
                &ldquo;{worstDrop.label}&rdquo;
              </span>
              . Try asking it later, or making it optional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
