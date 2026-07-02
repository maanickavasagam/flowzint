import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { QualificationState } from "./types";
import {
  PRODUCT_CONTEXT,
  nextMissingField,
  type ObjectionType,
} from "./conversation";

export interface TurnResult {
  reply: string;
  patch: Partial<QualificationState>;
  objection: ObjectionType;
  usedLlm: boolean;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client)
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are "Zia", the friendly AI concierge for FlowZint, embedded on the marketing website.

${PRODUCT_CONTEXT}

Your job: qualify the visitor through natural conversation while it feels like a helpful chat, not an interrogation.

RULES:
- Ask exactly ONE question at a time. Keep replies to 1–2 short sentences. Warm, human, lightly enthusiastic — never robotic or salesy.
- Progressively gather: their name, industry, team size, their use case / goal, timeline, rough budget, and their email.
- NEVER mention scoring, qualification, "leads", internal tooling, or pricing tiers unprompted.
- If the visitor raises an objection (price, timing, needing approval, just browsing), set the "objection" field but do NOT try to overcome it yourself — briefly acknowledge and keep the conversation moving. The system will add the tailored response.
- When you have gathered name + email + most details, warmly wrap up your question turn; the system will present next steps (don't offer to book a meeting yourself).
- Always extract structured fields from what the visitor just said and pass them to the tool. Only include fields you are reasonably confident about.

Bucketing rules for the tool:
- companySizeBucket: "1-50" | "51-500" | "500+"
- budgetLevel: "at_or_above" if their budget is ~$499/mo or higher or clearly enterprise; "below" if clearly under $499/mo; "vague" if unsure / no number.
- timelineBucket: "<1mo" (ASAP / this month), "1-3mo", "3mo+" (this quarter or later / just exploring).
- useCaseMatch: "match" if it maps to lead capture, qualification, demo booking, faster lead response, or pipeline growth; "vague" if generic with no specifics.`;

const TOOL: Anthropic.Tool = {
  name: "record_turn",
  description:
    "Record your reply to the visitor plus any structured fields you extracted from their latest message.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description:
          "Your next message to the visitor. One question, 1–2 short sentences, warm and human.",
      },
      name: { type: "string", description: "Visitor's name if stated." },
      email: { type: "string", description: "Visitor's email if stated." },
      industry: {
        type: "string",
        description: "Their industry / business type if stated.",
      },
      companySize: {
        type: "string",
        description: "Raw team-size phrase, e.g. 'about 200 people'.",
      },
      companySizeBucket: {
        type: "string",
        enum: ["1-50", "51-500", "500+"],
      },
      useCase: {
        type: "string",
        description: "Raw description of what they want to achieve.",
      },
      useCaseMatch: { type: "string", enum: ["match", "vague"] },
      budget: { type: "string", description: "Raw budget phrase." },
      budgetLevel: {
        type: "string",
        enum: ["at_or_above", "vague", "below"],
      },
      timeline: { type: "string", description: "Raw timeline phrase." },
      timelineBucket: { type: "string", enum: ["<1mo", "1-3mo", "3mo+"] },
      currentTools: {
        type: "string",
        description: "Any current tools they mention using.",
      },
      objection: {
        type: "string",
        enum: [
          "none",
          "too_expensive",
          "not_ready",
          "need_approval",
          "just_exploring",
        ],
      },
    },
    required: ["reply"],
  },
};

export async function qualifyTurn(
  history: HistoryMessage[],
  state: QualificationState
): Promise<TurnResult> {
  const c = getClient();
  if (!c) return fallbackTurn(history, state);

  try {
    const stateSummary = summarizeState(state);
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Conversation so far and current known state:\n${stateSummary}\n\nHere is the transcript; respond to the visitor's most recent message by calling record_turn.`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_turn" },
      messages,
    });

    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return fallbackTurn(history, state);

    const input = block.input as Record<string, unknown>;
    const patch = extractPatch(input);
    const objection = normalizeObjection(input.objection);

    return {
      reply: String(input.reply || "").trim() || defaultQuestion(state),
      patch,
      objection,
      usedLlm: true,
    };
  } catch (err) {
    console.error("[flowzint] Claude call failed, using fallback:", err);
    return fallbackTurn(history, state);
  }
}

function summarizeState(state: QualificationState): string {
  const known: string[] = [];
  if (state.name) known.push(`name=${state.name}`);
  if (state.email) known.push(`email=${state.email}`);
  if (state.industry) known.push(`industry=${state.industry}`);
  if (state.companySizeBucket) known.push(`size=${state.companySizeBucket}`);
  if (state.useCaseMatch) known.push(`useCase=${state.useCaseMatch}`);
  if (state.timelineBucket) known.push(`timeline=${state.timelineBucket}`);
  if (state.budgetLevel) known.push(`budget=${state.budgetLevel}`);
  const missing = nextMissingField(state);
  return `Known: ${known.join(", ") || "nothing yet"}\nStill needed: ${
    missing ? missing.field : "all captured"
  }`;
}

function extractPatch(input: Record<string, unknown>): Partial<QualificationState> {
  const patch: Partial<QualificationState> = {};
  const str = (k: string) =>
    typeof input[k] === "string" && (input[k] as string).trim()
      ? (input[k] as string).trim()
      : undefined;

  patch.name = str("name") ?? undefined;
  patch.email = str("email") ?? undefined;
  patch.industry = str("industry") ?? undefined;
  patch.companySize = str("companySize") ?? undefined;
  patch.useCase = str("useCase") ?? undefined;
  patch.budget = str("budget") ?? undefined;
  patch.timeline = str("timeline") ?? undefined;
  patch.currentTools = str("currentTools") ?? undefined;

  const csb = str("companySizeBucket");
  if (csb === "1-50" || csb === "51-500" || csb === "500+")
    patch.companySizeBucket = csb;
  const ucm = str("useCaseMatch");
  if (ucm === "match" || ucm === "vague") patch.useCaseMatch = ucm;
  const bl = str("budgetLevel");
  if (bl === "at_or_above" || bl === "vague" || bl === "below")
    patch.budgetLevel = bl;
  const tb = str("timelineBucket");
  if (tb === "<1mo" || tb === "1-3mo" || tb === "3mo+") patch.timelineBucket = tb;

  // drop undefined keys
  return Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<QualificationState>;
}

function normalizeObjection(v: unknown): ObjectionType {
  const s = typeof v === "string" ? v : "none";
  if (
    s === "too_expensive" ||
    s === "not_ready" ||
    s === "need_approval" ||
    s === "just_exploring"
  )
    return s;
  return null;
}

function defaultQuestion(state: QualificationState): string {
  const missing = nextMissingField(state);
  return missing
    ? missing.question
    : "Thanks so much for sharing all of that!";
}

/* -------------------------------------------------------------------------- */
/*  Keyless fallback — heuristic extraction so the demo works with no API key. */
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

  if (collecting === "name" && text && !email) {
    patch.name = cleanName(text);
  }
  if (collecting === "industry" && text) {
    patch.industry = text.slice(0, 60);
  }

  const size = bucketSize(text);
  if (size && !state.companySizeBucket) {
    patch.companySizeBucket = size;
    patch.companySize = text.slice(0, 60);
  }

  const budget = bucketBudget(text);
  if (budget && !state.budgetLevel) {
    patch.budgetLevel = budget;
    patch.budget = text.slice(0, 60);
  }

  const timeline = bucketTimeline(text);
  if (timeline && !state.timelineBucket) {
    patch.timelineBucket = timeline;
    patch.timeline = text.slice(0, 60);
  }

  const use = bucketUseCase(text);
  if (use && !state.useCaseMatch && collecting === "useCaseMatch") {
    patch.useCaseMatch = use;
    patch.useCase = text.slice(0, 80);
  }

  const objection = detectObjection(text);

  // Decide the next question from the merged view.
  const merged = { ...state, ...patch } as QualificationState;
  const next = nextMissingField(merged);
  const reply = next
    ? next.question
    : "Amazing — that's everything I need. One sec while I pull together next steps for you. ✨";

  return { reply, patch, objection, usedLlm: false };
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
  const num = t.match(/([\d,]{1,7})\s*(?:\+|people|employees|person|folks|of us|staff)?/);
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
  const money = t.match(/\$?\s?([\d,]{2,7})\s?(k|\/mo|per month|month|a month|dollars)?/);
  if (money) {
    let n = parseInt(money[1].replace(/,/g, ""), 10);
    if (/k/.test(money[2] || "")) n *= 1000;
    if (!isNaN(n) && n > 0) {
      if (n >= 499) return "at_or_above";
      if (n < 499) return "below";
    }
  }
  if (/\b(enterprise|whatever it takes|no.?limit|flexible budget|good budget)\b/.test(t))
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
  if (/\b(next month|month or two|few weeks|this quarter|1-3|couple months)\b/.test(t))
    return "1-3mo";
  if (/\b(later|no rush|next quarter|next year|exploring|someday|eventually|just looking)\b/.test(t))
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
