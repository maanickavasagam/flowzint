import type { QualificationState, LeadTemperature } from "./types";

export const EMPTY_STATE: QualificationState = {
  name: null,
  email: null,
  industry: null,
  companySize: null,
  companySizeBucket: null,
  useCase: null,
  useCaseMatch: null,
  budget: null,
  budgetLevel: null,
  timeline: null,
  timelineBucket: null,
  currentTools: null,
  objectionsRaised: [],
};

/** Product context injected into the system prompt so Claude stays on-message. */
export const PRODUCT_CONTEXT = `
FlowZint is an AI lead-capture and conversion platform for B2B teams. It embeds a
smart chat agent on marketing sites that qualifies visitors in real time, scores
them, books demos automatically, and syncs everything to a built-in CRM.
Ideal customers: B2B SaaS, agencies, and services companies that get inbound
website traffic and want to convert more of it into booked demos without adding
sales headcount. Pricing tiers: Starter $99/mo, Growth $499/mo, Scale $1,499/mo,
Enterprise custom. The Growth plan ($499/mo) is our anchor tier.
`.trim();

export type ObjectionType =
  | "too_expensive"
  | "not_ready"
  | "need_approval"
  | "just_exploring"
  | null;

export const OBJECTION_REBUTTALS: Record<
  Exclude<ObjectionType, null>,
  string
> = {
  too_expensive:
    "Totally fair to weigh the cost. Most teams recoup FlowZint inside the first month — one customer, Northwind, added $42k in pipeline in 30 days because no inbound lead slipped through overnight. Happy to tailor a plan to your volume.",
  not_ready:
    "No pressure at all — plenty of teams start when they're ready. Worth noting setup takes under 15 minutes and there's nothing to rip out, so when the timing's right it's a soft landing.",
  need_approval:
    "Makes sense to loop in your team. I can put together a one-pager with ROI numbers you can forward to your decision-maker — most managers greenlight it once they see the pipeline math.",
  just_exploring:
    "Great place to be — no commitment needed. I can show you a 12-minute walkthrough so you have a real reference point as you compare options. Zero sales pressure.",
};

/** Deterministic routing copy — never LLM-generated, never leaks the score. */
export function routingMessage(
  temperature: LeadTemperature,
  name: string | null
): string {
  const who = name ? `, ${name.split(" ")[0]}` : "";
  switch (temperature) {
    case "hot":
      return `This sounds like a strong fit${who}. 🎉 I'd love to get you in front of our team for a tailored walkthrough — pick a time that works and you're set. Our team's been notified so you'll get white-glove treatment.`;
    case "warm":
      return `Thanks${who} — I think FlowZint could genuinely move the needle for you. Want to grab a quick demo? Pick whichever slot suits you and we'll take it from there.`;
    case "cold":
      return `Appreciate you sharing all that${who}. Based on where you're at, I'll send over our "Inbound Conversion Playbook" — it's the fastest way to see the ideas in action. Drop your email below and I'll also keep you posted with the occasional high-signal tip.`;
  }
}

export const NURTURE_RESOURCE = {
  title: "The Inbound Conversion Playbook",
  description:
    "22 pages on turning anonymous site traffic into booked demos — the exact framework behind FlowZint.",
  url: "/docs/inbound-conversion-playbook",
};

/** Merge a partial state patch into the running state (explicit, turn-by-turn). */
export function mergeState(
  current: QualificationState,
  patch: Partial<QualificationState>
): QualificationState {
  const next: QualificationState = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) continue;
    if (k === "objectionsRaised") continue;
    // @ts-expect-error dynamic assignment across a known union of keys
    next[k] = v;
  }
  if (patch.objectionsRaised && patch.objectionsRaised.length) {
    next.objectionsRaised = Array.from(
      new Set([...current.objectionsRaised, ...patch.objectionsRaised])
    );
  }
  return next;
}

export const FIELD_QUESTIONS: {
  field: keyof QualificationState;
  question: string;
}[] = [
  {
    field: "name",
    question: "Before we dive in — what's your name?",
  },
  {
    field: "industry",
    question: "Nice to meet you! What kind of business are you in?",
  },
  {
    field: "companySizeBucket",
    question: "Got it. Roughly how many people are on your team?",
  },
  {
    field: "useCaseMatch",
    question:
      "What are you hoping FlowZint could help you with — more booked demos, faster lead response, something else?",
  },
  {
    field: "timelineBucket",
    question:
      "If it's a fit, what's your timeline for getting something in place?",
  },
  {
    field: "budgetLevel",
    question:
      "And do you have a rough monthly budget in mind for a tool like this?",
  },
  {
    field: "email",
    question:
      "Perfect. What's the best email to reach you at so I can pull everything together?",
  },
];

export function nextMissingField(
  state: QualificationState
): (typeof FIELD_QUESTIONS)[number] | null {
  for (const q of FIELD_QUESTIONS) {
    if (!state[q.field]) return q;
  }
  return null;
}
