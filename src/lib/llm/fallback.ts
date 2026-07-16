import type { QualificationState } from "../types";
import { nextMissingField, type ObjectionType } from "../conversation";
import type { HistoryMessage, TurnResult } from "./shared";

/* -------------------------------------------------------------------------- */
/*  Keyless heuristic engine.                                                  */
/*                                                                            */
/*  This is both the no-API-key default AND the safety net: if a provider is  */
/*  rate-limited, down, or misconfigured, the conversation degrades to this   */
/*  instead of breaking. Scripted, but always available.                      */
/* -------------------------------------------------------------------------- */

export function fallbackTurn(
  history: HistoryMessage[],
  state: QualificationState
): TurnResult {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content || "").trim();
  const patch: Partial<QualificationState> = {};

  // Which field were we most likely collecting? The first still-missing one.
  const collecting = nextMissingField(state)?.field;

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (email) patch.email = email;

  const t = text.toLowerCase();
  const hasMoneySignal = /\$|\/mo|per month|a month|budget|\bk\b|dollar/.test(t);
  const hasSizeSignal =
    /\b(people|employees|team|staff|person|folks|of us|headcount)\b/.test(t);

  // Attribute the message primarily to the field we're currently collecting.
  // Cross-field extraction only fires on a strong, unambiguous signal so that
  // e.g. "600 people" is read as team size, not budget.
  if (collecting === "name" && text && !email) {
    patch.name = cleanName(text);
  } else if (collecting === "industry" && text) {
    patch.industry = text.slice(0, 60);
  } else if (collecting === "companySizeBucket") {
    patch.companySizeBucket = bucketSize(text) ?? "51-500";
    patch.companySize = text.slice(0, 60);
  } else if (collecting === "useCaseMatch") {
    patch.useCaseMatch = bucketUseCase(text) ?? "vague";
    patch.useCase = text.slice(0, 80);
  } else if (collecting === "timelineBucket") {
    patch.timelineBucket = bucketTimeline(text) ?? "3mo+";
    patch.timeline = text.slice(0, 60);
  } else if (collecting === "budgetLevel") {
    patch.budgetLevel = bucketBudget(text) ?? "vague";
    patch.budget = text.slice(0, 60);
  }

  // Opportunistic extraction when a visitor volunteers info out of order.
  if (!state.companySizeBucket && !patch.companySizeBucket && hasSizeSignal) {
    const s = bucketSize(text);
    if (s) {
      patch.companySizeBucket = s;
      patch.companySize = text.slice(0, 60);
    }
  }
  if (!state.budgetLevel && !patch.budgetLevel && hasMoneySignal) {
    const b = bucketBudget(text);
    if (b) {
      patch.budgetLevel = b;
      patch.budget = text.slice(0, 60);
    }
  }

  const objection = detectObjection(text);

  // Decide the next question from the merged view.
  const merged = { ...state, ...patch } as QualificationState;
  const next = nextMissingField(merged);
  const reply = next
    ? next.question
    : "Amazing — that's everything I need. One sec while I pull together next steps for you. ✨";

  return { reply, patch, objection, usedLlm: false, provider: "rules" };
}

function cleanName(text: string): string {
  const cleaned = text
    .replace(/^(hi|hey|hello|yeah|yo|sure)[,!.\s]*/i, "")
    .replace(/(i'?m|my name is|this is|it'?s|i am)\s+/i, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 2).join(" ");
  return words.replace(/[^A-Za-z\s'-]/g, "").slice(0, 40) || "there";
}

function bucketSize(text: string): QualificationState["companySizeBucket"] {
  const t = text.toLowerCase();
  const num = t.match(
    /([\d,]{1,7})\s*(?:\+|people|employees|person|folks|of us|staff)?/
  );
  if (num) {
    const n = parseInt(num[1].replace(/,/g, ""), 10);
    if (!isNaN(n)) {
      if (n <= 50) return "1-50";
      if (n <= 500) return "51-500";
      return "500+";
    }
  }
  if (/\b(solo|just me|founder|startup|small)\b/.test(t)) return "1-50";
  if (/\b(enterprise|thousands|huge|large)\b/.test(t)) return "500+";
  if (/\b(mid|hundreds|couple hundred)\b/.test(t)) return "51-500";
  return null;
}

function bucketBudget(text: string): QualificationState["budgetLevel"] {
  const t = text.toLowerCase();
  const money = t.match(
    /\$?\s?([\d,]{2,7})\s?(k|\/mo|per month|month|a month|dollars)?/
  );
  if (money) {
    let n = parseInt(money[1].replace(/,/g, ""), 10);
    if (/k/.test(money[2] || "")) n *= 1000;
    if (!isNaN(n) && n > 0) {
      if (n >= 499) return "at_or_above";
      if (n < 499) return "below";
    }
  }
  if (
    /\b(enterprise|whatever it takes|no.?limit|flexible budget|good budget)\b/.test(t)
  )
    return "at_or_above";
  if (/\b(not sure|no idea|tbd|depends|don'?t know|flexible|open)\b/.test(t))
    return "vague";
  if (/\b(tight|cheap|free|shoestring|bootstrap|limited)\b/.test(t))
    return "below";
  return null;
}

function bucketTimeline(text: string): QualificationState["timelineBucket"] {
  const t = text.toLowerCase();
  if (/\b(asap|immediately|right away|this week|this month|now|urgent)\b/.test(t))
    return "<1mo";
  if (
    /\b(next month|month or two|few weeks|this quarter|1-3|couple months)\b/.test(t)
  )
    return "1-3mo";
  if (
    /\b(later|no rush|next quarter|next year|exploring|someday|eventually|just looking)\b/.test(
      t
    )
  )
    return "3mo+";
  return null;
}

function bucketUseCase(text: string): QualificationState["useCaseMatch"] {
  const t = text.toLowerCase();
  if (
    /\b(lead|leads|demo|book|booking|qualif|convert|conversion|pipeline|response|capture|sales|inbound|sign.?up|funnel)\b/.test(
      t
    )
  )
    return "match";
  if (t.length > 3) return "vague";
  return null;
}

function detectObjection(text: string): ObjectionType {
  const t = text.toLowerCase();
  if (/\b(expensive|too much|pricey|cost|afford|cheap|price)\b/.test(t))
    return "too_expensive";
  if (/\b(not ready|later|no rush|not now|down the road|premature)\b/.test(t))
    return "not_ready";
  if (/\b(approv|boss|manager|team decide|check with|sign.?off|budget holder)\b/.test(t))
    return "need_approval";
  if (/\b(just exploring|just looking|browsing|curious|window shop|research)\b/.test(t))
    return "just_exploring";
  return null;
}
