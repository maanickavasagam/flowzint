import { qualifyTurn, type HistoryMessage } from "./anthropic";
import { scoreLead, isQualified } from "./scoring";
import {
  EMPTY_STATE,
  mergeState,
  routingMessage,
  OBJECTION_REBUTTALS,
  NURTURE_RESOURCE,
} from "./conversation";
import {
  getSession,
  createSession,
  updateSession,
  addMessage,
  listMessages,
  upsertContact,
  upsertLeadForSession,
  createOpportunity,
  createNotification,
  logEvent,
} from "./repo";
import type { QualificationState, LeadTemperature, LeadStatus } from "./types";

export interface TurnResponse {
  sessionId: string;
  reply: string;
  actions: {
    booking?: boolean;
    newsletter?: boolean;
    resource?: { title: string; description: string; url: string };
  };
  greeting?: boolean;
}

const GREETING =
  "Hi there! I'm Zia, FlowZint's AI concierge 👋 I'll ask a couple of quick questions to point you in the right direction. First up — what's your name?";

export async function startSession(
  sessionId: string,
  page: string
): Promise<TurnResponse> {
  let session = getSession(sessionId);
  if (!session) {
    session = createSession({ id: sessionId, page });
    logEvent({ sessionId, type: "chat_started", meta: { page } });
  }
  const existing = listMessages(sessionId);
  if (existing.length === 0) {
    addMessage({ sessionId, role: "assistant", content: GREETING });
    return { sessionId, reply: GREETING, actions: {}, greeting: true };
  }
  return {
    sessionId,
    reply: existing[existing.length - 1].content,
    actions: {},
  };
}

function amountForSize(state: QualificationState): number {
  switch (state.companySizeBucket) {
    case "500+":
      return 48000;
    case "51-500":
      return 18000;
    case "1-50":
      return 6000;
    default:
      return 12000;
  }
}

export async function processTurn(input: {
  sessionId: string;
  page: string;
  message: string;
}): Promise<TurnResponse> {
  const { sessionId, page, message } = input;

  let session = getSession(sessionId);
  if (!session) {
    session = createSession({ id: sessionId, page });
    logEvent({ sessionId, type: "chat_started", meta: { page } });
    addMessage({ sessionId, role: "assistant", content: GREETING });
  }

  let state: QualificationState = safeParseState(session.qualification);

  // Record the visitor's message.
  addMessage({ sessionId, role: "user", content: message });

  const history: HistoryMessage[] = listMessages(sessionId)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    .slice(-16);

  const turn = await qualifyTurn(history, state);
  state = mergeState(state, turn.patch);

  // Prepend a canned rebuttal the first time each objection type appears.
  let rebuttal = "";
  if (turn.objection && !state.objectionsRaised.includes(turn.objection)) {
    rebuttal = OBJECTION_REBUTTALS[turn.objection];
    state.objectionsRaised = [...state.objectionsRaised, turn.objection];
    logEvent({
      sessionId,
      type: "objection_handled",
      meta: { objection: turn.objection },
    });
  }

  // Score with the pure function — never the LLM.
  const breakdown = scoreLead(state);
  const temperature: LeadTemperature = breakdown.temperature;

  // Persist contact + lead as soon as we have an email.
  let contactId = session.contact_id ?? null;
  let leadId = session.lead_id ?? null;

  if (state.email) {
    const contact = upsertContact({
      name: state.name,
      email: state.email,
      company: state.industry ? `${state.industry} Co.` : null,
      industry: state.industry,
      companySize: state.companySize,
    });
    contactId = contact.id;

    const status: LeadStatus = isQualified(state) ? "qualified" : "qualifying";
    const lead = upsertLeadForSession({
      contactId,
      sessionId,
      status,
      score: breakdown.total,
      temperature,
      qualification: state,
      breakdown,
    });
    leadId = lead.id;

    if (state.name) {
      logEvent({ sessionId, leadId, type: "info_captured" });
    }
  }

  updateSession(sessionId, {
    contact_id: contactId,
    lead_id: leadId,
    temperature,
    score: breakdown.total,
    qualification: state,
  });

  // Compose reply + decide routing.
  const actions: TurnResponse["actions"] = {};
  let reply = turn.reply;

  const alreadyRouted =
    session.status === "qualified" ||
    session.status === "booked" ||
    session.status === "nurture";

  if (isQualified(state) && !alreadyRouted) {
    logEvent({ sessionId, leadId, type: "qualified" });
    reply = routingMessage(temperature, state.name);

    if (temperature === "hot" || temperature === "warm") {
      actions.booking = true;
      logEvent({ sessionId, leadId, type: "demo_offered" });
      updateSession(sessionId, { status: "qualified" });

      if (temperature === "hot" && leadId && contactId) {
        // Immediate opportunity + mock Slack alert for hot leads.
        createOpportunity({
          leadId,
          contactId,
          name: `${state.name ?? "New"} — ${state.industry ?? "Inbound"}`,
          stage: "discovery",
          amount: amountForSize(state),
          probability: 60,
        });
        logEvent({ sessionId, leadId, type: "opportunity_created" });
        createNotification({
          leadId,
          sessionId,
          channel: "#sales-hot-leads",
          title: `🔥 Hot lead: ${state.name ?? "Unknown"}`,
          body: `${state.name ?? "A visitor"}${
            state.industry ? ` (${state.industry})` : ""
          } scored ${breakdown.total}/11 — team size ${
            state.companySizeBucket ?? "?"
          }, timeline ${state.timelineBucket ?? "?"}. Demo offered. Reach out fast!`,
          temperature,
        });
      }
    } else {
      // Cold → nurture.
      actions.newsletter = true;
      actions.resource = NURTURE_RESOURCE;
      updateSession(sessionId, { status: "nurture" });
      logEvent({ sessionId, leadId, type: "nurture_sent" });
    }
  } else if (alreadyRouted) {
    // Post-routing: keep offering the relevant next step.
    if (session.status === "qualified") actions.booking = true;
    if (session.status === "nurture") {
      actions.newsletter = true;
      actions.resource = NURTURE_RESOURCE;
    }
  }

  const finalReply = rebuttal ? `${rebuttal}\n\n${reply}` : reply;
  addMessage({ sessionId, role: "assistant", content: finalReply });

  return { sessionId, reply: finalReply, actions };
}

function safeParseState(json: string): QualificationState {
  try {
    const parsed = JSON.parse(json);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return { ...EMPTY_STATE };
  }
}
