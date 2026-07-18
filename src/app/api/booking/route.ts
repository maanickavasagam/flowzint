import { NextRequest, NextResponse } from "next/server";
import { generateSlots } from "@/lib/booking";
import {
  getSession,
  createMeeting,
  updateSession,
  upsertContact,
  createOpportunity,
  setLeadStatus,
  logEvent,
  createNotification,
} from "@/lib/repo";
import { sendBookingConfirmation, triggerN8n } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ slots: generateSlots(5) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, name, email, company, slotIso, slotLabel } = body;

    if (!name || !email || !slotIso) {
      return NextResponse.json(
        { error: "Name, email and a time slot are required." },
        { status: 400 }
      );
    }
    if (!/^[\w.+-]+@[\w-]+\.[\w.-]{2,}$/.test(String(email).trim())) {
      return NextResponse.json(
        { error: "That email doesn't look right — mind checking it?" },
        { status: 400 }
      );
    }

    const session = sessionId ? getSession(sessionId) : undefined;

    // Ensure a contact exists even for direct (non-chat) bookings.
    const contact = upsertContact({
      name,
      email,
      company: company?.trim() || null,
    });
    const contactId = session?.contact_id ?? contact.id;
    const leadId = session?.lead_id ?? null;

    const meeting = createMeeting({
      leadId,
      contactId,
      name,
      email,
      slotIso,
      slotLabel: slotLabel || new Date(slotIso).toLocaleString(),
    });

    // A chat-driven booking carries a session; a direct /book-demo booking
    // doesn't. The temperature/opportunity bits only apply when we have one.
    const temperature = session?.temperature ?? "warm";

    if (session) {
      updateSession(session.id, { status: "booked" });
      if (leadId) {
        setLeadStatus(leadId, "booked");
        // Booked leads become opportunities.
        createOpportunity({
          leadId,
          contactId: contactId!,
          name: `${name} — booked demo`,
          stage: "demo_scheduled",
          amount: temperature === "hot" ? 24000 : 12000,
          probability: temperature === "hot" ? 65 : 45,
        });
        logEvent({
          sessionId: session.id,
          leadId,
          type: "opportunity_created",
        });
      }
    }

    // Fire the alert + log the event for EVERY booking, chat-driven or direct,
    // so the dashboard and analytics always reflect it.
    logEvent({ sessionId: session?.id ?? null, leadId, type: "meeting_booked" });
    createNotification({
      leadId,
      sessionId: session?.id ?? null,
      channel: "#sales-demos",
      title: `📅 Demo booked: ${name}`,
      body: `${name} confirmed a demo for ${
        slotLabel || slotIso
      }. Calendar invite sent.`,
      temperature,
    });

    // Best-effort real-world side effects (no-op unless env vars are set).
    const emailed = await sendBookingConfirmation({
      to: email,
      name,
      slotLabel: meeting.slot_label,
    });
    void triggerN8n("meeting_booked", {
      name,
      email,
      slot: meeting.slot_label,
      sessionId: sessionId ?? null,
    });

    return NextResponse.json({ ok: true, meeting, emailed });
  } catch (err) {
    console.error("[/api/booking] error", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
