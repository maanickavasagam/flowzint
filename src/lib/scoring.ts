import type {
  QualificationState,
  ScoreBreakdown,
  LeadTemperature,
} from "./types";

/**
 * Pure, deterministic lead scoring — NEVER guessed by the LLM.
 *
 * Rubric (0–11):
 *   Company size:  1–50 = 1 | 51–500 = 2 | 500+ = 3
 *   Budget:        at/above tier = 3 | vague = 1 | below = 0
 *   Timeline:      <1mo = 3 | 1–3mo = 2 | 3mo+/exploring = 1
 *   Use case:      clear match = 2 | vague = 0
 *
 * Temperature:  0–4 Cold | 5–7 Warm | 8–11 Hot
 */
export function scoreLead(state: QualificationState): ScoreBreakdown {
  const companySize = scoreCompanySize(state.companySizeBucket);
  const budget = scoreBudget(state.budgetLevel);
  const timeline = scoreTimeline(state.timelineBucket);
  const useCase = scoreUseCase(state.useCaseMatch);

  const total = companySize + budget + timeline + useCase;

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
    case "1-50":
      return 1;
    case "51-500":
      return 2;
    case "500+":
      return 3;
    default:
      return 0;
  }
}

export function scoreBudget(
  level: QualificationState["budgetLevel"]
): number {
  switch (level) {
    case "at_or_above":
      return 3;
    case "vague":
      return 1;
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
      return 3;
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
      return 2;
    case "vague":
      return 0;
    default:
      return 0;
  }
}

export function temperatureFor(total: number): LeadTemperature {
  if (total >= 8) return "hot";
  if (total >= 5) return "warm";
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
    !!state.email &&
    !!state.name &&
    qualificationCompleteness(state) >= 3
  );
}
