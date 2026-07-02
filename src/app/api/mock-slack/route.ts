import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mock Slack webhook. In a real system this would POST to Slack's Incoming
 * Webhook API; here we log a formatted message into the in-app notification
 * bell so the "sales alert" is visible in the demo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, text, channel, leadId, sessionId, temperature } = body;
    if (!title && !text) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }
    const notif = createNotification({
      leadId: leadId ?? null,
      sessionId: sessionId ?? null,
      channel: channel || "#sales-hot-leads",
      title: title || "New alert",
      body: text || "",
      temperature: temperature ?? null,
    });
    return NextResponse.json({ ok: true, notification: notif });
  } catch (err) {
    console.error("[/api/mock-slack] error", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
