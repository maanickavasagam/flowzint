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

/**
 * Groq provider (OpenAI-compatible chat completions + function calling).
 *
 * Uses plain fetch — no SDK dependency — which also means this same code path
 * works for any OpenAI-compatible endpoint (Cerebras, OpenRouter, Together,
 * Gemini's compat layer) just by changing GROQ_BASE_URL + GROQ_MODEL.
 */
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function qualifyWithGroq(
  history: HistoryMessage[],
  state: QualificationState
): Promise<TurnResult | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const baseUrl = process.env.GROQ_BASE_URL || DEFAULT_BASE_URL;

  // Abort rather than hang the visitor's chat if the provider is slow.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Conversation state so far:\n${summarizeState(state)}`,
          },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        tools: [
          {
            type: "function",
            function: {
              name: TOOL_NAME,
              description: TOOL_DESCRIPTION,
              parameters: TOOL_SCHEMA,
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: TOOL_NAME },
        },
      }),
    });

    if (!res.ok) {
      console.error("[foyer] Groq error", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = call?.function?.arguments;
    if (!rawArgs) {
      console.error("[foyer] Groq returned no tool call");
      return null;
    }

    let input: Record<string, unknown>;
    try {
      input = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
    } catch {
      console.error("[foyer] Groq tool args were not valid JSON");
      return null;
    }

    return {
      reply: String(input.reply || "").trim() || defaultQuestion(state),
      patch: extractPatch(input, userText(history)),
      objection: normalizeObjection(input.objection),
      usedLlm: true,
      provider: "groq",
    };
  } catch (err) {
    console.error("[foyer] Groq call failed:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Concatenate everything the visitor typed, for grounding extraction. */
function userText(history: HistoryMessage[]): string {
  return history
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}
