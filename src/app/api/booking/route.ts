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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ slots: generateSlots(5) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, name, email, slotIso, slotLabel } = body;

    if (!name || !email || !slotIso) {
      return NextResponse.json(
        { error: "Name, email and a time slot are required." },
        { status: 400 }
      );
    }

    const session = sessionId ? getSession(sessionId) : undefined;

    // Ensure a contact exists even for direct (non-chat) bookings.
    const contact = upsertContact({ name, email });
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

    if (session) {
      updateSession(session.id, { status: "booked" });
      logEvent({ sessionId: session.id, leadId, type: "meeting_booked" });
      if (leadId) {
        setLeadStatus(leadId, "booked");
        // Booked leads become opportunities.
        createOpportunity({
          leadId,
          contactId: contactId!,
          name: `${name} — booked demo`,
          stage: "demo_scheduled",
          amount: session.temperature === "hot" ? 24000 : 12000,
          probability: session.temperature === "hot" ? 65 : 45,
        });
        logEvent({
          sessionId: session.id,
          leadId,
          type: "opportunity_created",
        });
      }
      createNotification({
        leadId,
        sessionId: session.id,
        channel: "#sales-demos",
        title: `📅 Demo booked: ${name}`,
        body: `${name} confirmed a demo for ${
          slotLabel || slotIso
        }. Calendar invite sent.`,
        temperature: session.temperature,
      });
    }

    return NextResponse.json({ ok: true, meeting });
  } catch (err) {
    console.error("[/api/booking] error", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
