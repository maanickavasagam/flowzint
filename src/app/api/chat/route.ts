import { NextRequest, NextResponse } from "next/server";
import { startSession, processTurn } from "@/lib/orchestrator";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const page: string = body.page || "/";
    const sessionId: string = body.sessionId || uid("sess");

    if (body.action === "start" || !body.message) {
      const res = await startSession(sessionId, page);
      return NextResponse.json(res);
    }

    const res = await processTurn({
      sessionId,
      page,
      message: String(body.message).slice(0, 2000),
    });
    return NextResponse.json(res);
  } catch (err) {
    console.error("[/api/chat] error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
