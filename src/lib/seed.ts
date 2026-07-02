import { db, isSeeded } from "./db";
import { scoreLead } from "./scoring";
import type { QualificationState } from "./types";

/* Deterministic RNG so the seed set is stable across runs. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = makeRng(20260702);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

type Bucket = QualificationState["companySizeBucket"];
type Budget = QualificationState["budgetLevel"];
type Timeline = QualificationState["timelineBucket"];
type UseCase = QualificationState["useCaseMatch"];

interface Persona {
  name: string;
  email: string;
  company: string;
  industry: string;
  size: Bucket;
  sizePhrase: string;
  budget: Budget;
  timeline: Timeline;
  useCase: UseCase;
  page: string;
  reached:
    | "info_captured"
    | "qualified"
    | "demo_offered"
    | "meeting_booked"
    | "opportunity_created";
  daysAgo: number;
}

const PERSONAS: Persona[] = [
  // Hot, booked
  { name: "Priya Raman", email: "priya@latchpoint.io", company: "Latchpoint", industry: "B2B SaaS", size: "51-500", sizePhrase: "about 240 people", budget: "at_or_above", timeline: "<1mo", useCase: "match", page: "/pricing", reached: "opportunity_created", daysAgo: 1 },
  { name: "Marcus Bell", email: "marcus@cindershift.com", company: "Cindershift", industry: "Fintech", size: "500+", sizePhrase: "around 900", budget: "at_or_above", timeline: "<1mo", useCase: "match", page: "/book-demo", reached: "opportunity_created", daysAgo: 2 },
  { name: "Dana Okonkwo", email: "dana@northwindlabs.com", company: "Northwind Labs", industry: "Marketing agency", size: "51-500", sizePhrase: "roughly 120", budget: "at_or_above", timeline: "1-3mo", useCase: "match", page: "/pricing", reached: "opportunity_created", daysAgo: 3 },
  { name: "Ethan Cole", email: "ethan@verdant.co", company: "Verdant", industry: "Climate tech", size: "500+", sizePhrase: "1,200+", budget: "at_or_above", timeline: "<1mo", useCase: "match", page: "/book-demo", reached: "meeting_booked", daysAgo: 4 },
  { name: "Sofia Marin", email: "sofia@kwiklane.com", company: "Kwiklane", industry: "Logistics", size: "51-500", sizePhrase: "about 300", budget: "at_or_above", timeline: "<1mo", useCase: "match", page: "/pricing", reached: "meeting_booked", daysAgo: 5 },
  // Hot, demo offered (not yet booked)
  { name: "Liam Fraser", email: "liam@ortus.ai", company: "Ortus AI", industry: "AI tooling", size: "51-500", sizePhrase: "~180", budget: "at_or_above", timeline: "1-3mo", useCase: "match", page: "/pricing", reached: "demo_offered", daysAgo: 2 },
  { name: "Ava Nguyen", email: "ava@brightpeak.io", company: "BrightPeak", industry: "HR software", size: "500+", sizePhrase: "800 people", budget: "at_or_above", timeline: "<1mo", useCase: "match", page: "/book-demo", reached: "demo_offered", daysAgo: 6 },
  // Warm, booked
  { name: "Noah Whitfield", email: "noah@stackforge.dev", company: "StackForge", industry: "DevTools", size: "1-50", sizePhrase: "about 30", budget: "at_or_above", timeline: "1-3mo", useCase: "match", page: "/pricing", reached: "meeting_booked", daysAgo: 7 },
  { name: "Isabella Reyes", email: "isabella@peppercloud.com", company: "PepperCloud", industry: "E-commerce", size: "51-500", sizePhrase: "around 90", budget: "vague", timeline: "1-3mo", useCase: "match", page: "/book-demo", reached: "meeting_booked", daysAgo: 8 },
  // Warm, demo offered
  { name: "Oliver Grant", email: "oliver@finchart.io", company: "FinChart", industry: "Fintech", size: "1-50", sizePhrase: "a team of 20", budget: "vague", timeline: "1-3mo", useCase: "match", page: "/pricing", reached: "demo_offered", daysAgo: 4 },
  { name: "Mia Sørensen", email: "mia@glintco.com", company: "Glint", industry: "Design SaaS", size: "51-500", sizePhrase: "~140", budget: "vague", timeline: "3mo+", useCase: "match", page: "/book-demo", reached: "demo_offered", daysAgo: 9 },
  { name: "James Park", email: "james@routehub.com", company: "RouteHub", industry: "Logistics", size: "1-50", sizePhrase: "12 of us", budget: "at_or_above", timeline: "1-3mo", useCase: "match", page: "/pricing", reached: "qualified", daysAgo: 5 },
  // Cold / nurture
  { name: "Chloe Adams", email: "chloe@tinkergarden.com", company: "TinkerGarden", industry: "Education", size: "1-50", sizePhrase: "just me and a cofounder", budget: "below", timeline: "3mo+", useCase: "vague", page: "/", reached: "qualified", daysAgo: 6 },
  { name: "Ben Carter", email: "ben@quillstack.com", company: "Quillstack", industry: "Consulting", size: "1-50", sizePhrase: "about 8", budget: "vague", timeline: "3mo+", useCase: "vague", page: "/pricing", reached: "qualified", daysAgo: 10 },
  { name: "Grace Liu", email: "grace@moonlit.studio", company: "Moonlit Studio", industry: "Creative agency", size: "1-50", sizePhrase: "5 person studio", budget: "below", timeline: "3mo+", useCase: "match", page: "/", reached: "info_captured", daysAgo: 11 },
  { name: "Daniel Weiss", email: "daniel@harborline.co", company: "Harborline", industry: "Real estate", size: "51-500", sizePhrase: "around 70", budget: "vague", timeline: "3mo+", useCase: "vague", page: "/book-demo", reached: "info_captured", daysAgo: 12 },
  { name: "Zoe Martins", email: "zoe@brambly.com", company: "Brambly", industry: "Retail", size: "1-50", sizePhrase: "15ish", budget: "below", timeline: "3mo+", useCase: "vague", page: "/pricing", reached: "info_captured", daysAgo: 8 },
  { name: "Aarav Shah", email: "aarav@nimbus.works", company: "Nimbus Works", industry: "SaaS", size: "51-500", sizePhrase: "~110", budget: "vague", timeline: "1-3mo", useCase: "match", page: "/book-demo", reached: "qualified", daysAgo: 3 },
];

const FUTURE_SLOT_TIMES = ["10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM"];

function nextBusinessDate(offset: number): Date {
  const d = new Date();
  let added = 0;
  while (added < offset) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function stageRank(reached: Persona["reached"]): number {
  return [
    "info_captured",
    "qualified",
    "demo_offered",
    "meeting_booked",
    "opportunity_created",
  ].indexOf(reached);
}

function buildQualification(p: Persona): QualificationState {
  return {
    name: p.name,
    email: p.email,
    industry: p.industry,
    companySize: p.sizePhrase,
    companySizeBucket: p.size,
    useCase: p.useCase === "match" ? "Convert more inbound into booked demos" : "General improvement",
    useCaseMatch: p.useCase,
    budget: p.budget === "at_or_above" ? "~$500-1500/mo" : p.budget === "below" ? "pretty tight" : "not sure yet",
    budgetLevel: p.budget,
    timeline: p.timeline === "<1mo" ? "ASAP" : p.timeline === "1-3mo" ? "next couple months" : "just exploring",
    timelineBucket: p.timeline,
    currentTools: pick(["HubSpot", "Intercom + spreadsheets", "Drift", "nothing yet", "Salesforce"]),
    objectionsRaised: [],
  };
}

const CONVO_SNIPPETS = (p: Persona) => [
  { role: "assistant", content: "Hi there! I'm Zia, FlowZint's AI concierge 👋 What's your name?" },
  { role: "user", content: `Hey, I'm ${p.name.split(" ")[0]}.` },
  { role: "assistant", content: "Great to meet you! What kind of business are you in?" },
  { role: "user", content: `We're in ${p.industry.toLowerCase()}.` },
  { role: "assistant", content: "Nice. Roughly how big is your team?" },
  { role: "user", content: p.sizePhrase },
  { role: "assistant", content: "What are you hoping FlowZint can help with?" },
  { role: "user", content: p.useCase === "match" ? "Booking more demos from our website traffic." : "Just seeing what's out there." },
];

export function seedDatabase(force = false): { seeded: boolean } {
  if (isSeeded() && !force) return { seeded: false };

  const clear = db.transaction(() => {
    for (const t of [
      "slack_notifications",
      "events",
      "chat_messages",
      "chat_sessions",
      "meetings",
      "opportunities",
      "leads",
      "contacts",
    ]) {
      db.prepare(`DELETE FROM ${t}`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t);
    }
  });
  clear();

  const insertContact = db.prepare(
    `INSERT INTO contacts (name, email, company, industry, company_size, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`
  );
  const insertSession = db.prepare(
    `INSERT INTO chat_sessions (id, contact_id, lead_id, status, page, temperature, score, qualification, started_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`
  );
  const insertMessage = db.prepare(
    `INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, datetime('now', ?))`
  );
  const insertLead = db.prepare(
    `INSERT INTO leads (contact_id, session_id, status, score, temperature, qualification, score_breakdown, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`
  );
  const insertOpp = db.prepare(
    `INSERT INTO opportunities (lead_id, contact_id, name, stage, amount, probability, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`
  );
  const insertMeeting = db.prepare(
    `INSERT INTO meetings (lead_id, contact_id, name, email, slot_iso, slot_label, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed', datetime('now', ?))`
  );
  const insertEvent = db.prepare(
    `INSERT INTO events (session_id, lead_id, type, meta, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`
  );
  const insertNotif = db.prepare(
    `INSERT INTO slack_notifications (lead_id, session_id, channel, title, body, temperature, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
  );

  const run = db.transaction(() => {
    let sessionCounter = 0;
    let slotCounter = 0;

    for (const p of PERSONAS) {
      const mod = `-${p.daysAgo} days`;
      const sid = `seed_${(++sessionCounter).toString().padStart(3, "0")}`;
      const q = buildQualification(p);
      const breakdown = scoreLead(q);
      const rank = stageRank(p.reached);

      // Contact
      const contactInfo = insertContact.run(
        p.name,
        p.email,
        p.company,
        p.industry,
        p.sizePhrase,
        mod,
        mod
      );
      const contactId = Number(contactInfo.lastInsertRowid);

      const statusForStage =
        p.reached === "meeting_booked" || p.reached === "opportunity_created"
          ? "booked"
          : p.reached === "qualified" || p.reached === "demo_offered"
            ? "qualified"
            : "qualifying";

      // Lead
      const leadInfo = insertLead.run(
        contactId,
        sid,
        breakdown.temperature === "cold" ? "nurture" : statusForStage,
        breakdown.total,
        breakdown.temperature,
        JSON.stringify(q),
        JSON.stringify(breakdown),
        "chat",
        mod,
        mod
      );
      const leadId = Number(leadInfo.lastInsertRowid);

      // Session
      const sessStatus =
        p.reached === "meeting_booked" || p.reached === "opportunity_created"
          ? "booked"
          : breakdown.temperature === "cold"
            ? "nurture"
            : "qualified";
      insertSession.run(
        sid,
        contactId,
        leadId,
        sessStatus,
        p.page,
        breakdown.temperature,
        breakdown.total,
        JSON.stringify(q),
        mod,
        mod
      );

      // Messages
      CONVO_SNIPPETS(p).forEach((m) => insertMessage.run(sid, m.role, m.content, mod));

      // Funnel events (respect ordering + our dedup semantics)
      insertEvent.run(sid, leadId, "chat_started", JSON.stringify({ page: p.page }), mod);
      if (rank >= 0) insertEvent.run(sid, leadId, "info_captured", null, mod);
      if (rank >= 1) insertEvent.run(sid, leadId, "qualified", null, mod);
      if (rank >= 2) insertEvent.run(sid, leadId, "demo_offered", null, mod);

      // Meeting + opportunity
      if (rank >= 3) {
        slotCounter++;
        const dt = nextBusinessDate((slotCounter % 3) + 1);
        const time = FUTURE_SLOT_TIMES[slotCounter % FUTURE_SLOT_TIMES.length];
        const label = `${dt.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} · ${time}`;
        insertMeeting.run(leadId, contactId, p.name, p.email, dt.toISOString(), label, mod);
        insertEvent.run(sid, leadId, "meeting_booked", null, mod);
      }
      if (rank >= 4 || p.reached === "meeting_booked") {
        const amount =
          p.size === "500+" ? 48000 : p.size === "51-500" ? 18000 : 6000;
        insertOpp.run(
          leadId,
          contactId,
          `${p.company} — ${p.industry}`,
          p.reached === "opportunity_created" ? "demo_scheduled" : "discovery",
          amount,
          breakdown.temperature === "hot" ? 65 : 45,
          mod,
          mod
        );
        insertEvent.run(sid, leadId, "opportunity_created", null, mod);
      }

      // Notifications for hot leads / bookings
      if (breakdown.temperature === "hot") {
        insertNotif.run(
          leadId,
          sid,
          "#sales-hot-leads",
          `🔥 Hot lead: ${p.name}`,
          `${p.name} (${p.industry}) scored ${breakdown.total}/11 — team ${p.sizePhrase}, timeline ${p.timeline}. Reach out fast!`,
          "hot",
          p.daysAgo <= 2 ? 0 : 1,
          mod
        );
      }
      if (rank >= 3) {
        insertNotif.run(
          leadId,
          sid,
          "#sales-demos",
          `📅 Demo booked: ${p.name}`,
          `${p.name} from ${p.company} confirmed a demo. Calendar invite sent.`,
          breakdown.temperature,
          p.daysAgo <= 3 ? 0 : 1,
          mod
        );
      }
    }

    // Anonymous top-of-funnel sessions (chat_started, some info_captured)
    const anonPages = ["/", "/pricing", "/book-demo"];
    for (let i = 0; i < 16; i++) {
      const sid = `seed_anon_${i.toString().padStart(2, "0")}`;
      const daysAgo = 1 + Math.floor(rand() * 13);
      const mod = `-${daysAgo} days`;
      const page = pick(anonPages);
      insertSession.run(sid, null, null, "active", page, null, null, "{}", mod, mod);
      insertMessage.run(sid, "assistant", "Hi there! I'm Zia 👋 What's your name?", mod);
      insertEvent.run(sid, null, "chat_started", JSON.stringify({ page }), mod);
      if (rand() < 0.4) insertEvent.run(sid, null, "info_captured", null, mod);
    }
  });

  run();
  return { seeded: true };
}

export function seedIfEmpty(): void {
  try {
    if (!isSeeded()) seedDatabase(false);
  } catch (err) {
    console.error("[flowzint] auto-seed failed:", err);
  }
}
