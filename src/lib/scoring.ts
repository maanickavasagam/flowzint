import type {
  QualificationState,
  ScoreBreakdown,
  LeadTemperature,
} from "./types";

/**
 * Pure, deterministic lead scoring — NEVER guessed by the LLM.
 *
 * Intent-first rubric (0–13). Buying intent (budget + timeline + use-case fit)
 * dominates; company size is only a small modifier so a small-but-serious,
 * well-funded, urgent buyer is never misclassified as cold.
 *
 *   Budget:        at/above tier = 4 | vague = 2 | below = 0        (max 4)
 *   Timeline:      <1mo = 4 | 1–3mo = 2 | 3mo+/exploring = 1        (max 4)
 *   Use-case fit:  clear match = 3 | vague = 1                      (max 3)
 *   Company size:  500+ = 2 | 51–500 = 1 | 1–50 = 0  (modifier)     (max 2)
 *
 * Temperature:  0–4 Cold | 5–8 Warm | 9–13 Hot
 */
export const MAX_SCORE = 13;

export function scoreLead(state: QualificationState): ScoreBreakdown {
  const budget = scoreBudget(state.budgetLevel);
  const timeline = scoreTimeline(state.timelineBucket);
  const useCase = scoreUseCase(state.useCaseMatch);
  const companySize = scoreCompanySize(state.companySizeBucket);

  const total = budget + timeline + useCase + companySize;

  return {
    companySize,
    budget,
    timeline,
    useCase,
    total,
    temperature: temperatureFor(total),
  };
}

export function scoreCompanySize(
  bucket: QualificationState["companySizeBucket"]
): number {
  switch (bucket) {
    case "500+":
      return 2;
    case "51-500":
      return 1;
    case "1-50":
      return 0;
    default:
      return 0;
  }
}

export function scoreBudget(
  level: QualificationState["budgetLevel"]
): number {
  switch (level) {
    case "at_or_above":
      return 4;
    case "vague":
      return 2;
    case "below":
      return 0;
    default:
      return 0;
  }
}

export function scoreTimeline(
  bucket: QualificationState["timelineBucket"]
): number {
  switch (bucket) {
    case "<1mo":
      return 4;
    case "1-3mo":
      return 2;
    case "3mo+":
      return 1;
    default:
      return 0;
  }
}

export function scoreUseCase(
  match: QualificationState["useCaseMatch"]
): number {
  switch (match) {
    case "match":
      return 3;
    case "vague":
      return 1;
    default:
      return 0;
  }
}

export function temperatureFor(total: number): LeadTemperature {
  if (total >= 9) return "hot";
  if (total >= 5) return "warm";
  return "cold";
}

/** Human-readable labels for each scoring dimension (used in the CRM breakdown). */
export const SCORE_DIMENSIONS: {
  key: keyof Pick<
    ScoreBreakdown,
    "budget" | "timeline" | "useCase" | "companySize"
  >;
  label: string;
  max: number;
}[] = [
  { key: "budget", label: "Budget", max: 4 },
  { key: "timeline", label: "Timeline", max: 4 },
  { key: "useCase", label: "Use-case fit", max: 3 },
  { key: "companySize", label: "Company size", max: 2 },
];

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
    !!state.email &&
    !!state.name &&
    qualificationCompleteness(state) >= 3
  );
}
