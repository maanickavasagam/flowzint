import type { QualificationState } from "../types";
import { fallbackTurn } from "./fallback";
import { qualifyWithGroq, groqConfigured } from "./groq";
import { qualifyWithClaude, anthropicConfigured } from "./anthropic";
import type { HistoryMessage, TurnResult } from "./shared";

export type { HistoryMessage, TurnResult } from "./shared";
export { fallbackTurn } from "./fallback";

export type Provider = "groq" | "anthropic" | "rules";

/** Which engine will handle the next turn, given the current environment. */
export function activeProvider(): Provider {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (forced === "rules") return "rules";
  if (forced === "groq" && groqConfigured()) return "groq";
  if (forced === "anthropic" && anthropicConfigured()) return "anthropic";
  if (!forced) {
    if (groqConfigured()) return "groq";
    if (anthropicConfigured()) return "anthropic";
  }
  return "rules";
}

/**
 * Run one qualification turn.
 *
 * Provider-agnostic by design: pick Groq / Anthropic / rules with one env var.
 * Every provider path returns `null` on any failure (rate limit, outage, bad
 * key, timeout, malformed output) and we fall through to the rule-based engine
 * — so a free-tier throttle degrades the conversation instead of breaking it.
 */
export async function qualifyTurn(
  history: HistoryMessage[],
  state: QualificationState
): Promise<TurnResult> {
  const provider = activeProvider();

  if (provider === "groq") {
    const result = await qualifyWithGroq(history, state);
    if (result) return result;
    console.warn("[foyer] Groq unavailable — falling back to rules engine");
  } else if (provider === "anthropic") {
    const result = await qualifyWithClaude(history, state);
    if (result) return result;
    console.warn("[foyer] Claude unavailable — falling back to rules engine");
  }

  return fallbackTurn(history, state);
}
