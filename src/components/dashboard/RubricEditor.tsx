"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Save, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadBadge } from "@/components/shared/lead-badge";
import { cn } from "@/lib/utils";
import type { ScoringWeights, LeadTemperature } from "@/lib/types";

interface Summary {
  total: number;
  changed: number;
  transitions: { from: LeadTemperature; to: LeadTemperature; count: number }[];
  distribution: Record<LeadTemperature, number>;
}

const GROUPS: {
  key: keyof Omit<ScoringWeights, "thresholds">;
  title: string;
  hint: string;
  rows: { field: string; label: string }[];
}[] = [
  {
    key: "budget",
    title: "Budget",
    hint: "How much buying power moves the needle.",
    rows: [
      { field: "at_or_above", label: "At/above tier ($499+/mo)" },
      { field: "vague", label: "Vague / unsure" },
      { field: "below", label: "Below tier" },
    ],
  },
  {
    key: "timeline",
    title: "Timeline",
    hint: "Urgency is usually the strongest intent signal.",
    rows: [
      { field: "<1mo", label: "Under 1 month" },
      { field: "1-3mo", label: "1–3 months" },
      { field: "3mo+", label: "3 months+ / exploring" },
    ],
  },
  {
    key: "useCase",
    title: "Use-case fit",
    hint: "Does their goal match what we actually do?",
    rows: [
      { field: "match", label: "Clear match" },
      { field: "vague", label: "Vague" },
    ],
  },
  {
    key: "companySize",
    title: "Company size",
    hint: "A modifier — keep it small so intent dominates.",
    rows: [
      { field: "500+", label: "500+ people" },
      { field: "51-500", label: "51–500 people" },
      { field: "1-50", label: "1–50 people" },
    ],
  },
];

export function RubricEditor({
  initialWeights,
  initialMax,
}: {
  initialWeights: ScoringWeights;
  initialMax: number;
}) {
  const [weights, setWeights] = React.useState<ScoringWeights>(initialWeights);
  const [saved, setSaved] = React.useState<ScoringWeights>(initialWeights);
  const [maxScore, setMaxScore] = React.useState(initialMax);
  const [saving, setSaving] = React.useState(false);
  const [summary, setSummary] = React.useState<Summary | null>(null);

  const dirty = JSON.stringify(weights) !== JSON.stringify(saved);

  // Live max, recomputed as you type — no round-trip needed.
  const liveMax = React.useMemo(() => {
    const best = (o: Record<string, number>) => Math.max(0, ...Object.values(o));
    return (
      best(weights.budget) +
      best(weights.timeline) +
      best(weights.useCase) +
      best(weights.companySize)
    );
  }, [weights]);

  function setWeight(
    group: keyof Omit<ScoringWeights, "thresholds">,
    field: string,
    value: number
  ) {
    setWeights((w) => ({
      ...w,
      [group]: {
        ...(w[group] as unknown as Record<string, number>),
        [field]: value,
      },
    }));
  }

  async function save(action?: "reset") {
    setSaving(true);
    setSummary(null);
    try {
      const res = await fetch("/api/crm/rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reset" ? { action } : { weights }),
      }).then((r) => r.json());
      if (res.ok) {
        setWeights(res.weights);
        setSaved(res.weights);
        setMaxScore(res.maxScore);
        setSummary(res.summary);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Scoring rubric</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Tune how Foyer scores intent. Saving re-scores{" "}
            <span className="text-foreground">every existing lead</span>{" "}
            instantly — no black box, no retraining.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => save("reset")}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="gradient" onClick={() => save()} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" /> Save &amp; re-score
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Re-score result */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="gradient-border rounded-2xl bg-card/60 p-5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                Re-scored {summary.total} leads · {summary.changed} changed
              </p>
            </div>
            {summary.transitions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.transitions.map((t) => (
                  <span
                    key={`${t.from}-${t.to}`}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs"
                  >
                    <LeadBadge temperature={t.from} />
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <LeadBadge temperature={t.to} />
                    <span className="font-semibold">×{t.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No leads changed temperature.
              </p>
            )}
            <div className="mt-3 flex gap-2 text-xs">
              <Badge variant="hot">Hot {summary.distribution.hot}</Badge>
              <Badge variant="warm">Warm {summary.distribution.warm}</Badge>
              <Badge variant="cold">Cold {summary.distribution.cold}</Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weights */}
      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((g) => (
          <div
            key={g.key}
            className="rounded-2xl border border-border bg-card/50 p-5"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display font-semibold">{g.title}</h3>
              <span className="text-xs text-muted-foreground">
                max{" "}
                {Math.max(
                  0,
                  ...Object.values(
                    weights[g.key] as unknown as Record<string, number>
                  )
                )}
              </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">{g.hint}</p>
            <div className="space-y-3">
              {g.rows.map((r) => {
                const value =
                  (weights[g.key] as unknown as Record<string, number>)[
                    r.field
                  ] ?? 0;
                return (
                  <div key={r.field} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-muted-foreground">
                      {r.label}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={value}
                      onChange={(e) =>
                        setWeight(g.key, r.field, Number(e.target.value))
                      }
                      className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-secondary accent-violet"
                    />
                    <span className="w-6 text-right text-sm font-semibold tabular-nums">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Thresholds */}
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display font-semibold">Temperature bands</h3>
          <span className="text-xs text-muted-foreground">
            max attainable score: <span className="text-foreground">{liveMax}</span>
            {liveMax !== maxScore && " (unsaved)"}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Where cold becomes warm, and warm becomes hot.
        </p>

        <div className="space-y-3">
          {(["hot", "warm"] as const).map((band) => (
            <div key={band} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-muted-foreground">
                {band === "hot" ? "Hot at or above" : "Warm at or above"}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(1, liveMax)}
                value={weights.thresholds[band]}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    thresholds: {
                      ...w.thresholds,
                      [band]: Number(e.target.value),
                    },
                  }))
                }
                className={cn(
                  "h-1 w-40 cursor-pointer appearance-none rounded-full bg-secondary",
                  band === "hot" ? "accent-[hsl(0_84%_62%)]" : "accent-[hsl(38_92%_55%)]"
                )}
              />
              <span className="w-6 text-right text-sm font-semibold tabular-nums">
                {weights.thresholds[band]}
              </span>
            </div>
          ))}
        </div>

        {/* Band preview */}
        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full">
          <div
            className="bg-cold"
            style={{ width: `${(weights.thresholds.warm / Math.max(1, liveMax)) * 100}%` }}
          />
          <div
            className="bg-warm"
            style={{
              width: `${((weights.thresholds.hot - weights.thresholds.warm) / Math.max(1, liveMax)) * 100}%`,
            }}
          />
          <div className="flex-1 bg-hot" />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>0 · Cold</span>
          <span>{weights.thresholds.warm} · Warm</span>
          <span>{weights.thresholds.hot} · Hot</span>
          <span>{liveMax}</span>
        </div>
      </div>
    </div>
  );
}
