import Anthropic from "@anthropic-ai/sdk";
import type { QualificationState } from "../types";
import {
  SYSTEM_PROMPT,
  TOOL_NAME,
  TOOL_DESCRIPTION,
  TOOL_SCHEMA,
  summarizeState,
  defaultQuestion,
  extractPatch,
  normalizeObjection,
  type HistoryMessage,
  type TurnResult,
} from "./shared";

/** Anthropic provider — optional "turbo mode" if a key is configured. */
const DEFAULT_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function qualifyWithClaude(
  history: HistoryMessage[],
  state: QualificationState
): Promise<TurnResult | null> {
  const c = getClient();
  if (!c) return null;

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  try {
    const res = await c.messages.create({
      model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description: TOOL_DESCRIPTION,
          input_schema: TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `Conversation state so far:\n${summarizeState(
            state
          )}\n\nRespond to the visitor's most recent message by calling ${TOOL_NAME}.`,
        },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;

    const input = block.input as Record<string, unknown>;
    return {
      reply: String(input.reply || "").trim() || defaultQuestion(state),
      patch: extractPatch(input, userText(history)),
      objection: normalizeObjection(input.objection),
      usedLlm: true,
      provider: "anthropic",
    };
  } catch (err) {
    console.error("[flowzint] Claude call failed:", err);
    return null;
  }
}

/** Concatenate everything the visitor typed, for grounding extraction. */
function userText(history: HistoryMessage[]): string {
  return history
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}
