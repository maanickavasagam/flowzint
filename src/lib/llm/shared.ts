import type { QualificationState } from "../types";
import { PRODUCT_CONTEXT, nextMissingField, type ObjectionType } from "../conversation";

export interface TurnResult {
  reply: string;
  patch: Partial<QualificationState>;
  objection: ObjectionType;
  usedLlm: boolean;
  /** Which engine produced this turn — surfaced for debugging/telemetry. */
  provider?: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const SYSTEM_PROMPT = `You are "Zia", the friendly AI concierge for Foyer, embedded on the marketing website.

${PRODUCT_CONTEXT}

Your job: qualify the visitor through natural conversation while it feels like a helpful chat, not an interrogation.

RULES:
- Ask exactly ONE question at a time. Keep replies to 1–2 short sentences. Warm, human, lightly enthusiastic — never robotic or salesy.
- Progressively gather: their name, industry, team size, their use case / goal, timeline, rough budget, and their email.
- NEVER mention scoring, qualification, "leads", internal tooling, or pricing tiers unprompted.
- If the visitor raises an objection (price, timing, needing approval, just browsing), set the "objection" field but do NOT try to overcome it yourself — briefly acknowledge and keep the conversation moving. The system will add the tailored response.
- When you have gathered name + email + most details, warmly wrap up your question turn; the system will present next steps (don't offer to book a meeting yourself).
- Always extract structured fields from what the visitor just said and pass them to the tool.
- CRITICAL — never invent data. Only include a field if the visitor has ACTUALLY stated it in their own words. Never guess, infer, or make up an email address, budget, team size, or timeline. If they haven't said it, omit the field entirely and ask about it instead. An invented email or budget corrupts the customer's CRM.

Bucketing rules for the tool:
- companySizeBucket: "1-50" | "51-500" | "500+"
- budgetLevel: "at_or_above" if their budget is ~$499/mo or higher or clearly enterprise; "below" if clearly under $499/mo; "vague" if unsure / no number.
- timelineBucket: "<1mo" (ASAP / this month), "1-3mo", "3mo+" (this quarter or later / just exploring).
- useCaseMatch: "match" if it maps to lead capture, qualification, demo booking, faster lead response, or pipeline growth; "vague" if generic with no specifics.

You MUST respond by calling the record_turn tool.`;

/** Provider-agnostic JSON Schema for the structured turn. */
export const TOOL_NAME = "record_turn";
export const TOOL_DESCRIPTION =
  "Record your reply to the visitor plus any structured fields you extracted from their latest message.";

export const TOOL_SCHEMA = {
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
    companySizeBucket: { type: "string", enum: ["1-50", "51-500", "500+"] },
    useCase: {
      type: "string",
      description: "Raw description of what they want to achieve.",
    },
    useCaseMatch: { type: "string", enum: ["match", "vague"] },
    budget: { type: "string", description: "Raw budget phrase." },
    budgetLevel: { type: "string", enum: ["at_or_above", "vague", "below"] },
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
} as const;

/** Compact summary of what we already know — keeps the model on track. */
export function summarizeState(state: QualificationState): string {
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

export function defaultQuestion(state: QualificationState): string {
  const missing = nextMissingField(state);
  return missing ? missing.question : "Thanks so much for sharing all of that!";
}

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]{2,}$/;

/**
 * Pull only the fields we trust out of a model's tool-call arguments.
 *
 * Everything here is untrusted model output, so anything that flows into the
 * CRM or an outbound email is validated. Models will happily "extract" an email
 * from a sentence that contains none (e.g. "we need it live" -> "needed"), which
 * would otherwise create junk contacts and mark a lead qualified too early.
 */
export function extractPatch(
  input: Record<string, unknown>,
  /** Everything the visitor has actually typed — used to ground extraction. */
  userText = ""
): Partial<QualificationState> {
  const patch: Partial<QualificationState> = {};
  const str = (k: string) =>
    typeof input[k] === "string" && (input[k] as string).trim()
      ? (input[k] as string).trim()
      : undefined;

  patch.name = str("name")?.slice(0, 60) ?? undefined;

  // An email must be well-formed AND actually present in what the visitor
  // typed. Models invent plausible addresses (e.g. "maanick@example.com" from
  // a first name) that pass a format check but would create a fake contact and
  // receive a real confirmation email.
  const email = str("email")?.toLowerCase();
  patch.email =
    email && EMAIL_RE.test(email) && userText.toLowerCase().includes(email)
      ? email
      : undefined;
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

  return Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<QualificationState>;
}

export function normalizeObjection(v: unknown): ObjectionType {
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
