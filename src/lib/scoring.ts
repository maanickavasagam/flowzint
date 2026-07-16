import type {
  QualificationState,
  ScoreBreakdown,
  LeadTemperature,
  ScoringWeights,
} from "./types";

/**
 * Pure, deterministic lead scoring — NEVER guessed by the LLM.
 *
 * The rubric is *configurable*: weights and thresholds live in the database and
 * can be tuned live from the dashboard, after which every existing lead is
 * re-scored with the new rubric. Scoring itself stays a pure function of
 * (state, weights), so it remains deterministic and auditable.
 *
 * Intent-first by default: buying intent (budget + timeline + use-case fit)
 * dominates, and company size is only a small modifier — so a small-but-serious,
 * well-funded, urgent buyer is never misclassified as cold.
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  budget: { at_or_above: 4, vague: 2, below: 0 },
  timeline: { "<1mo": 4, "1-3mo": 2, "3mo+": 1 },
  useCase: { match: 3, vague: 1 },
  companySize: { "500+": 2, "51-500": 1, "1-50": 0 },
  thresholds: { hot: 9, warm: 5 },
};

/** Highest attainable total for a given rubric. */
export function maxScoreFor(w: ScoringWeights = DEFAULT_WEIGHTS): number {
  const best = (o: Record<string, number>) => Math.max(0, ...Object.values(o));
  return (
    best(w.budget) + best(w.timeline) + best(w.useCase) + best(w.companySize)
  );
}

/** Per-dimension labels + maxima, used by the CRM breakdown UI. */
export function dimensionsFor(w: ScoringWeights = DEFAULT_WEIGHTS): {
  key: keyof Pick<
    ScoreBreakdown,
    "budget" | "timeline" | "useCase" | "companySize"
  >;
  label: string;
  max: number;
}[] {
  const best = (o: Record<string, number>) => Math.max(0, ...Object.values(o));
  return [
    { key: "budget", label: "Budget", max: best(w.budget) },
    { key: "timeline", label: "Timeline", max: best(w.timeline) },
    { key: "useCase", label: "Use-case fit", max: best(w.useCase) },
    { key: "companySize", label: "Company size", max: best(w.companySize) },
  ];
}

export function scoreLead(
  state: QualificationState,
  w: ScoringWeights = DEFAULT_WEIGHTS
): ScoreBreakdown {
  const budget = state.budgetLevel ? (w.budget[state.budgetLevel] ?? 0) : 0;
  const timeline = state.timelineBucket
    ? (w.timeline[state.timelineBucket] ?? 0)
    : 0;
  const useCase = state.useCaseMatch ? (w.useCase[state.useCaseMatch] ?? 0) : 0;
  const companySize = state.companySizeBucket
    ? (w.companySize[state.companySizeBucket] ?? 0)
    : 0;

  const total = budget + timeline + useCase + companySize;

  return {
    companySize,
    budget,
    timeline,
    useCase,
    total,
    temperature: temperatureFor(total, w),
  };
}

export function temperatureFor(
  total: number,
  w: ScoringWeights = DEFAULT_WEIGHTS
): LeadTemperature {
  if (total >= w.thresholds.hot) return "hot";
  if (total >= w.thresholds.warm) return "warm";
  return "cold";
}

/**
 * How many of the four qualifying dimensions have we captured? Used to decide
 * whether the conversation has gathered enough to make a routing decision.
 */
export function qualificationCompleteness(state: QualificationState): number {
  let n = 0;
  if (state.companySizeBucket) n++;
  if (state.budgetLevel) n++;
  if (state.timelineBucket) n++;
  if (state.useCaseMatch) n++;
  return n;
}

export function isQualified(state: QualificationState): boolean {
  // We consider a lead "qualified" once we have identity + at least 3 of the
  // 4 scoring dimensions captured.
  return (
    !!state.email && !!state.name && qualificationCompleteness(state) >= 3
  );
}
