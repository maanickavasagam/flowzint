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
  spamFlags: 0,
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
      return `This sounds like a strong fit${who}. 🎉 Let's get you a tailored walkthrough — pick a time below and it's locked in. Our team's been notified, so you'll get white-glove treatment.`;
    case "warm":
      return `Thanks${who} — I think FlowZint could genuinely move the needle for you. Grab a quick demo whenever suits you: pick a slot below to confirm.`;
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
      "What are you hoping FlowZint could help with? Tap an option below, or tell me in your own words.",
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

/** Tappable quick-reply chips offered for specific questions in the widget. */
export const FIELD_QUICK_REPLIES: Partial<
  Record<keyof QualificationState, string[]>
> = {
  useCaseMatch: [
    "More booked demos",
    "Faster lead response",
    "Qualify leads automatically",
    "Just exploring",
  ],
  timelineBucket: ["ASAP / this month", "1–3 months", "Just exploring"],
  budgetLevel: ["Under $500/mo", "$500–1,500/mo", "$1,500+/mo", "Not sure yet"],
};

export function quickRepliesFor(
  field: keyof QualificationState | undefined
): string[] | undefined {
  if (!field) return undefined;
  return FIELD_QUICK_REPLIES[field];
}

/* -------------------------------------------------------------------------- */
/*  Moderation — reject profane / nonsense answers (rule-based, no LLM needed).*/
/* -------------------------------------------------------------------------- */

const PROFANITY = [
  "fuck",
  "shit",
  "bitch",
  "dick",
  "cock",
  "pussy",
  "asshole",
  "bastard",
  "cunt",
  "slut",
  "whore",
  "suck my",
  "screw you",
  "piss off",
  "faggot",
  "nigger",
  "retard",
];

export type ModerationReason = "profane" | "gibberish" | null;

export interface ModerationResult {
  blocked: boolean;
  reason: ModerationReason;
}

/**
 * Decide whether a visitor message should be rejected before it's treated as a
 * real answer. Catches abuse and keyboard-mashing so trolls don't get scored.
 */
export function moderateMessage(text: string): ModerationResult {
  const raw = text.trim();
  const t = raw.toLowerCase();

  if (PROFANITY.some((w) => t.includes(w))) {
    return { blocked: true, reason: "profane" };
  }

  // Gibberish: a long unbroken token with almost no vowels (keyboard mashing),
  // or a message that is mostly repeated / non-letter characters.
  const longest = raw.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), "");
  if (longest.length >= 10) {
    const vowels = (longest.match(/[aeiou]/gi) || []).length;
    if (vowels / longest.length < 0.18) return { blocked: true, reason: "gibberish" };
  }
  const letters = (raw.match(/[a-z]/gi) || []).length;
  if (raw.length >= 6 && letters / raw.length < 0.35) {
    return { blocked: true, reason: "gibberish" };
  }
  if (/(.)\1{5,}/.test(t)) return { blocked: true, reason: "gibberish" };

  return { blocked: false, reason: null };
}

export function moderationReply(reason: ModerationReason): string {
  switch (reason) {
    case "profane":
      return "Let's keep it friendly 🙂 I'm here to help — could you answer that one for me?";
    case "gibberish":
      return "Hmm, I didn't quite catch that — could you rephrase?";
    default:
      return "Sorry, could you say that another way?";
  }
}

export const SPAM_LIMIT = 3;

export const SPAM_SHUTDOWN =
  "It looks like this might not be the right time. I'll be here whenever you'd like to chat properly — take care! 👋";

/* -------------------------------------------------------------------------- */
/*  Mini-FAQ — answer common product questions inline (rule-based).           */
/* -------------------------------------------------------------------------- */

const FAQ: { test: RegExp; answer: string }[] = [
  {
    test: /\b(what (is|does)|who are|tell me about|what'?s) (flowzint|this|you)|what do you (do|offer)|explain\b/,
    answer:
      "FlowZint is an AI concierge for your website — I qualify visitors in real time, figure out who's a great fit, book demos automatically, and sync everything to your team's CRM. Basically, I turn traffic into booked meetings.",
  },
  {
    test: /\bhow (does|do) (it|you|this) work|how would|how can you help\b/,
    answer:
      "Simple: I chat with each visitor, learn what they need, score how good a fit they are, and then either book them a demo or send helpful resources — all while keeping your CRM up to date automatically.",
  },
  {
    test: /\b(price|pricing|cost|how much|plans?|expensive|fee)\b/,
    answer:
      "Plans start at $99/mo (Starter), $499/mo (Growth — most popular), and $1,499/mo (Scale), with custom Enterprise pricing. You can see the full breakdown on our Pricing page.",
  },
  {
    test: /\b(integrat|crm|salesforce|hubspot|slack|calendar|api)\b/,
    answer:
      "FlowZint has a built-in CRM and can notify your team the instant a hot lead qualifies. It's built to sit alongside the tools you already use.",
  },
  {
    test: /\b(demo|trial|free|try|test)\b/,
    answer:
      "You can book a live demo any time — I can set that up for you right here in the chat once I know a little about your needs.",
  },
];

/** If the visitor asked a product question, return an answer to prepend. */
export function answerQuestion(text: string): string | null {
  const t = text.toLowerCase();
  const looksLikeQuestion =
    text.includes("?") ||
    /\b(what|how|why|who|where|when|can you|do you|does it|is it|tell me|explain)\b/.test(
      t
    );
  if (!looksLikeQuestion) return null;
  for (const f of FAQ) {
    if (f.test.test(t)) return f.answer;
  }
  return null;
}

/** Contextual nudge once the visitor has already been routed. */
export function postRoutingReply(
  status: "qualified" | "booked" | "nurture",
  name: string | null
): string {
  const who = name ? ` ${name.split(" ")[0]}` : "";
  switch (status) {
    case "qualified":
      return `Just pick a time slot above to lock in your demo${who} 👆 — or tell me a day that works and I'll find the closest slot.`;
    case "booked":
      return `You're all set${who} — your demo is confirmed and the invite is on its way to your inbox. Anything else I can help with in the meantime?`;
    case "nurture":
      return `Drop your email above and I'll send the playbook straight over. Happy to answer any questions in the meantime!`;
  }
}
