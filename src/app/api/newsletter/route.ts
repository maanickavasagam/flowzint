import { NextRequest, NextResponse } from "next/server";
import { upsertContact, getSession, updateSession, logEvent } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, sessionId } = body;
    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }
    const contact = upsertContact({ email, name: name ?? null });
    if (sessionId) {
      const s = getSession(sessionId);
      if (s) {
        updateSession(sessionId, {
          contact_id: contact.id,
          status: "nurture",
        });
        logEvent({ sessionId, type: "nurture_sent", meta: { newsletter: true } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/newsletter] error", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
