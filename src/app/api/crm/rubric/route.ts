import { NextRequest, NextResponse } from "next/server";
import {
  getScoringWeights,
  saveScoringWeights,
  resetScoringWeights,
  rescoreAllLeads,
} from "@/lib/repo";
import { DEFAULT_WEIGHTS, maxScoreFor } from "@/lib/scoring";
import type { ScoringWeights } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const weights = getScoringWeights();
  return NextResponse.json({
    weights,
    defaults: DEFAULT_WEIGHTS,
    maxScore: maxScoreFor(weights),
  });
}

/** Coerce + clamp incoming numbers so a bad payload can't corrupt the rubric. */
function num(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(20, Math.round(n)));
}

function sanitize(input: Partial<ScoringWeights> | undefined): ScoringWeights {
  const d = DEFAULT_WEIGHTS;
  const i = input ?? {};
  const weights: ScoringWeights = {
    budget: {
      at_or_above: num(i.budget?.at_or_above, d.budget.at_or_above),
      vague: num(i.budget?.vague, d.budget.vague),
      below: num(i.budget?.below, d.budget.below),
    },
    timeline: {
      "<1mo": num(i.timeline?.["<1mo"], d.timeline["<1mo"]),
      "1-3mo": num(i.timeline?.["1-3mo"], d.timeline["1-3mo"]),
      "3mo+": num(i.timeline?.["3mo+"], d.timeline["3mo+"]),
    },
    useCase: {
      match: num(i.useCase?.match, d.useCase.match),
      vague: num(i.useCase?.vague, d.useCase.vague),
    },
    companySize: {
      "500+": num(i.companySize?.["500+"], d.companySize["500+"]),
      "51-500": num(i.companySize?.["51-500"], d.companySize["51-500"]),
      "1-50": num(i.companySize?.["1-50"], d.companySize["1-50"]),
    },
    thresholds: {
      hot: num(i.thresholds?.hot, d.thresholds.hot),
      warm: num(i.thresholds?.warm, d.thresholds.warm),
    },
  };
  // Warm must sit below hot, else the bands are meaningless.
  if (weights.thresholds.warm >= weights.thresholds.hot) {
    weights.thresholds.warm = Math.max(0, weights.thresholds.hot - 1);
  }
  return weights;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "reset") {
      resetScoringWeights();
      const summary = rescoreAllLeads(DEFAULT_WEIGHTS);
      return NextResponse.json({
        ok: true,
        weights: DEFAULT_WEIGHTS,
        maxScore: maxScoreFor(DEFAULT_WEIGHTS),
        summary,
      });
    }

    const weights = sanitize(body.weights);
    saveScoringWeights(weights);
    const summary = rescoreAllLeads(weights);

    return NextResponse.json({
      ok: true,
      weights,
      maxScore: maxScoreFor(weights),
      summary,
    });
  } catch (err) {
    console.error("[/api/crm/rubric] error", err);
    return NextResponse.json(
      { error: "Could not save the rubric." },
      { status: 500 }
    );
  }
}
