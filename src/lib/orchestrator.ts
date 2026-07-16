import { qualifyTurn, type HistoryMessage } from "./llm";
import { scoreLead, isQualified } from "./scoring";
import {
  EMPTY_STATE,
  mergeState,
  routingMessage,
  postRoutingReply,
  OBJECTION_REBUTTALS,
  NURTURE_RESOURCE,
  nextMissingField,
  quickRepliesFor,
  moderateMessage,
  moderationReply,
  answerQuestion,
  SPAM_LIMIT,
  SPAM_SHUTDOWN,
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
  getScoringWeights,
} from "./repo";
import { notifyHotLead } from "./integrations";
import type { QualificationState, LeadTemperature, LeadStatus } from "./types";

export interface TurnResponse {
  sessionId: string;
  reply: string;
  actions: {
    booking?: boolean;
    newsletter?: boolean;
    resource?: { title: string; description: string; url: string };
  };
  options?: string[];
  history?: { role: "assistant" | "user"; content: string }[];
  greeting?: boolean;
}

const GREETING =
  "Hi there! I'm Zia, Foyer's AI concierge 👋 I qualify visitors, answer questions, and book demos. To point you in the right direction — what's your name?";

function currentQuestion(state: QualificationState): string {
  return nextMissingField(state)?.question ?? "";
}

function currentOptions(state: QualificationState): string[] | undefined {
  return quickRepliesFor(nextMissingField(state)?.field);
}

export async function startSession(
  sessionId: string,
  page: string
): Promise<TurnResponse> {
  let session = getSession(sessionId);
  if (!session) {
    session = createSession({ id: sessionId, page });
    logEvent({ sessionId, type: "chat_started", meta: { page } });
  }
  let existing = listMessages(sessionId);
  if (existing.length === 0) {
    addMessage({ sessionId, role: "assistant", content: GREETING });
    existing = listMessages(sessionId);
  }
  const state = safeParseState(session.qualification);
  const routed =
    session.status === "qualified" ||
    session.status === "booked" ||
    session.status === "nurture";
  return {
    sessionId,
    reply: existing[existing.length - 1].content,
    actions: routed
      ? session.status === "nurture"
        ? { newsletter: true, resource: NURTURE_RESOURCE }
        : { booking: true }
      : {},
    options: routed ? undefined : currentOptions(state),
    history: existing
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    greeting: existing.length === 1,
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

  /* ---- Moderation gate: reject profanity / gibberish before scoring ------ */
  const mod = moderateMessage(message);
  if (mod.blocked) {
    state.spamFlags = (state.spamFlags ?? 0) + 1;
    updateSession(sessionId, { qualification: state });

    if (state.spamFlags >= SPAM_LIMIT) {
      updateSession(sessionId, { status: "closed" });
      addMessage({ sessionId, role: "assistant", content: SPAM_SHUTDOWN });
      return { sessionId, reply: SPAM_SHUTDOWN, actions: {} };
    }
    const q = currentQuestion(state);
    const reply = q ? `${moderationReply(mod.reason)}\n\n${q}` : moderationReply(mod.reason);
    addMessage({ sessionId, role: "assistant", content: reply });
    return { sessionId, reply, actions: {}, options: currentOptions(state) };
  }

  /* ---- Mini-FAQ: answer product questions without losing our place ------- */
  const alreadyRouted =
    session.status === "qualified" ||
    session.status === "booked" ||
    session.status === "nurture";

  if (!alreadyRouted) {
    const faq = answerQuestion(message);
    if (faq) {
      const q = currentQuestion(state);
      const reply = q ? `${faq}\n\n${q}` : faq;
      addMessage({ sessionId, role: "assistant", content: reply });
      return { sessionId, reply, actions: {}, options: currentOptions(state) };
    }
  }

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

  // Score with the pure function against the live (tunable) rubric — never the LLM.
  const breakdown = scoreLead(state, getScoringWeights());
  // Flagged (troll) sessions are capped to cold so they never alert sales.
  const flagged = (state.spamFlags ?? 0) >= 2;
  const temperature: LeadTemperature = flagged ? "cold" : breakdown.temperature;

  // Bounded email ask — if the visitor keeps skipping their email, route anyway
  // (the booking / newsletter card collects it) instead of looping forever.
  const missingField = nextMissingField(state)?.field;
  if (!state.email && missingField === "email") {
    state.emailAsks = (state.emailAsks ?? 0) + 1;
  }
  const forceRoute =
    !state.email && missingField === "email" && (state.emailAsks ?? 0) >= 2;
  const readyToRoute = isQualified(state) || forceRoute;

  // Persist contact + lead once we have an email OR are ready to route.
  let contactId = session.contact_id ?? null;
  let leadId = session.lead_id ?? null;

  if (state.email || readyToRoute) {
    if (state.email) {
      const contact = upsertContact({
        name: state.name,
        email: state.email,
        company: null,
        industry: state.industry,
        companySize: state.companySize,
      });
      contactId = contact.id;
    } else if (!contactId) {
      // No email yet — create the contact once so the scored lead + transcript
      // are still saved; email is filled in when they book / subscribe.
      const contact = upsertContact({
        name: state.name,
        email: null,
        company: null,
        industry: state.industry,
        companySize: state.companySize,
      });
      contactId = contact.id;
    }

    if (contactId) {
      const status: LeadStatus = readyToRoute ? "qualified" : "qualifying";
      const lead = upsertLeadForSession({
        contactId,
        sessionId,
        status,
        score: breakdown.total,
        temperature,
        qualification: state,
        breakdown: { ...breakdown, temperature },
      });
      leadId = lead.id;

      if (state.name) {
        logEvent({ sessionId, leadId, type: "info_captured" });
      }
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
  let options = currentOptions(state);

  if (readyToRoute && !alreadyRouted) {
    logEvent({ sessionId, leadId, type: "qualified" });
    reply = routingMessage(temperature, state.name);
    options = undefined;

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
        const title = `🔥 Hot lead: ${state.name ?? "Unknown"}`;
        const body = `${state.name ?? "A visitor"}${
          state.industry ? ` (${state.industry})` : ""
        } scored ${breakdown.total}/13 — team size ${
          state.companySizeBucket ?? "?"
        }, timeline ${state.timelineBucket ?? "?"}. Demo offered. Reach out fast!`;
        createNotification({
          leadId,
          sessionId,
          channel: "#sales-hot-leads",
          title,
          body,
          temperature,
        });
        // Best-effort real Slack webhook if configured (no-op otherwise).
        void notifyHotLead(title, body);
      }
    } else {
      // Cold → nurture.
      actions.newsletter = true;
      actions.resource = NURTURE_RESOURCE;
      updateSession(sessionId, { status: "nurture" });
      logEvent({ sessionId, leadId, type: "nurture_sent" });
    }
  } else if (alreadyRouted) {
    // Post-routing: contextual nudge toward the relevant next step.
    const st = session.status as "qualified" | "booked" | "nurture";
    reply = postRoutingReply(st, state.name);
    options = undefined;
    if (st === "qualified") actions.booking = true;
    if (st === "nurture") {
      actions.newsletter = true;
      actions.resource = NURTURE_RESOURCE;
    }
  }

  const finalReply = rebuttal ? `${rebuttal}\n\n${reply}` : reply;
  addMessage({ sessionId, role: "assistant", content: finalReply });

  return { sessionId, reply: finalReply, actions, options };
}

function safeParseState(json: string): QualificationState {
  try {
    const parsed = JSON.parse(json);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return { ...EMPTY_STATE };
  }
}
