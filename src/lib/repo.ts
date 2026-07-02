import "server-only";
import { db } from "./db";
import type {
  Contact,
  Lead,
  Opportunity,
  Meeting,
  ChatSession,
  ChatMessageDTO,
  AppEvent,
  SlackNotification,
  QualificationState,
  ScoreBreakdown,
  EventType,
  LeadStatus,
  LeadTemperature,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Contacts                                                                   */
/* -------------------------------------------------------------------------- */

export function upsertContact(input: {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  industry?: string | null;
  companySize?: string | null;
}): Contact {
  const existing = input.email
    ? (db
        .prepare("SELECT * FROM contacts WHERE email = ?")
        .get(input.email) as Contact | undefined)
    : undefined;

  if (existing) {
    db.prepare(
      `UPDATE contacts SET
         name = COALESCE(?, name),
         company = COALESCE(?, company),
         industry = COALESCE(?, industry),
         company_size = COALESCE(?, company_size),
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      input.name ?? null,
      input.company ?? null,
      input.industry ?? null,
      input.companySize ?? null,
      existing.id
    );
    return db
      .prepare("SELECT * FROM contacts WHERE id = ?")
      .get(existing.id) as Contact;
  }

  const info = db
    .prepare(
      `INSERT INTO contacts (name, email, company, industry, company_size)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.name ?? null,
      input.email ?? null,
      input.company ?? null,
      input.industry ?? null,
      input.companySize ?? null
    );
  return db
    .prepare("SELECT * FROM contacts WHERE id = ?")
    .get(info.lastInsertRowid) as Contact;
}

export function listContacts(): Contact[] {
  return db
    .prepare("SELECT * FROM contacts ORDER BY created_at DESC")
    .all() as Contact[];
}

/* -------------------------------------------------------------------------- */
/*  Leads                                                                       */
/* -------------------------------------------------------------------------- */

export function upsertLeadForSession(input: {
  contactId: number;
  sessionId: string;
  status: LeadStatus;
  score: number;
  temperature: LeadTemperature;
  qualification: QualificationState;
  breakdown: ScoreBreakdown;
  source?: string;
}): Lead {
  const existing = db
    .prepare("SELECT * FROM leads WHERE session_id = ?")
    .get(input.sessionId) as Lead | undefined;

  if (existing) {
    db.prepare(
      `UPDATE leads SET
         contact_id = ?, status = ?, score = ?, temperature = ?,
         qualification = ?, score_breakdown = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      input.contactId,
      input.status,
      input.score,
      input.temperature,
      JSON.stringify(input.qualification),
      JSON.stringify(input.breakdown),
      existing.id
    );
    return db.prepare("SELECT * FROM leads WHERE id = ?").get(existing.id) as Lead;
  }

  const info = db
    .prepare(
      `INSERT INTO leads
        (contact_id, session_id, status, score, temperature, qualification, score_breakdown, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.contactId,
      input.sessionId,
      input.status,
      input.score,
      input.temperature,
      JSON.stringify(input.qualification),
      JSON.stringify(input.breakdown),
      input.source ?? "chat"
    );
  return db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(info.lastInsertRowid) as Lead;
}

export function setLeadStatus(leadId: number, status: LeadStatus) {
  db.prepare(
    "UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, leadId);
}

export interface LeadWithContact extends Lead {
  contact_name: string | null;
  contact_email: string | null;
  contact_company: string | null;
}

export function listLeads(): LeadWithContact[] {
  return db
    .prepare(
      `SELECT l.*, c.name AS contact_name, c.email AS contact_email,
              c.company AS contact_company
       FROM leads l JOIN contacts c ON c.id = l.contact_id
       ORDER BY l.score DESC, l.updated_at DESC`
    )
    .all() as LeadWithContact[];
}

/* -------------------------------------------------------------------------- */
/*  Opportunities                                                              */
/* -------------------------------------------------------------------------- */

export function createOpportunity(input: {
  leadId: number;
  contactId: number;
  name: string;
  stage?: Opportunity["stage"];
  amount: number;
  probability: number;
}): Opportunity {
  const existing = db
    .prepare("SELECT * FROM opportunities WHERE lead_id = ?")
    .get(input.leadId) as Opportunity | undefined;
  if (existing) return existing;

  const info = db
    .prepare(
      `INSERT INTO opportunities (lead_id, contact_id, name, stage, amount, probability)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.leadId,
      input.contactId,
      input.name,
      input.stage ?? "demo_scheduled",
      input.amount,
      input.probability
    );
  return db
    .prepare("SELECT * FROM opportunities WHERE id = ?")
    .get(info.lastInsertRowid) as Opportunity;
}

export interface OpportunityWithContact extends Opportunity {
  contact_name: string | null;
  contact_company: string | null;
  temperature: LeadTemperature;
}

export function listOpportunities(): OpportunityWithContact[] {
  return db
    .prepare(
      `SELECT o.*, c.name AS contact_name, c.company AS contact_company,
              l.temperature AS temperature
       FROM opportunities o
       JOIN contacts c ON c.id = o.contact_id
       JOIN leads l ON l.id = o.lead_id
       ORDER BY o.amount DESC, o.updated_at DESC`
    )
    .all() as OpportunityWithContact[];
}

/* -------------------------------------------------------------------------- */
/*  Meetings                                                                    */
/* -------------------------------------------------------------------------- */

export function createMeeting(input: {
  leadId: number | null;
  contactId: number | null;
  name: string;
  email: string;
  slotIso: string;
  slotLabel: string;
}): Meeting {
  const info = db
    .prepare(
      `INSERT INTO meetings (lead_id, contact_id, name, email, slot_iso, slot_label)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.leadId,
      input.contactId,
      input.name,
      input.email,
      input.slotIso,
      input.slotLabel
    );
  return db
    .prepare("SELECT * FROM meetings WHERE id = ?")
    .get(info.lastInsertRowid) as Meeting;
}

export interface MeetingWithContact extends Meeting {
  company: string | null;
  temperature: LeadTemperature | null;
}

export function listMeetings(): MeetingWithContact[] {
  return db
    .prepare(
      `SELECT m.*, c.company AS company, l.temperature AS temperature
       FROM meetings m
       LEFT JOIN contacts c ON c.id = m.contact_id
       LEFT JOIN leads l ON l.id = m.lead_id
       ORDER BY m.slot_iso ASC`
    )
    .all() as MeetingWithContact[];
}

/* -------------------------------------------------------------------------- */
/*  Chat sessions & messages                                                   */
/* -------------------------------------------------------------------------- */

export function getSession(id: string): ChatSession | undefined {
  return db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(id) as
    | ChatSession
    | undefined;
}

export function createSession(input: {
  id: string;
  page: string;
}): ChatSession {
  db.prepare(
    "INSERT OR IGNORE INTO chat_sessions (id, page) VALUES (?, ?)"
  ).run(input.id, input.page);
  return getSession(input.id)!;
}

export function updateSession(
  id: string,
  patch: Partial<{
    contact_id: number | null;
    lead_id: number | null;
    status: ChatSession["status"];
    temperature: LeadTemperature | null;
    score: number | null;
    qualification: QualificationState;
  }>
) {
  const current = getSession(id);
  if (!current) return;
  db.prepare(
    `UPDATE chat_sessions SET
       contact_id = ?, lead_id = ?, status = ?, temperature = ?, score = ?,
       qualification = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    patch.contact_id ?? current.contact_id,
    patch.lead_id ?? current.lead_id,
    patch.status ?? current.status,
    patch.temperature ?? current.temperature,
    patch.score ?? current.score,
    patch.qualification
      ? JSON.stringify(patch.qualification)
      : current.qualification,
    id
  );
}

export function addMessage(input: {
  sessionId: string;
  role: ChatMessageDTO["role"];
  content: string;
}): ChatMessageDTO {
  const info = db
    .prepare(
      "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)"
    )
    .run(input.sessionId, input.role, input.content);
  return db
    .prepare("SELECT * FROM chat_messages WHERE id = ?")
    .get(info.lastInsertRowid) as ChatMessageDTO;
}

export function listMessages(sessionId: string): ChatMessageDTO[] {
  return db
    .prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC"
    )
    .all(sessionId) as ChatMessageDTO[];
}

/* -------------------------------------------------------------------------- */
/*  Events                                                                      */
/* -------------------------------------------------------------------------- */

export function logEvent(input: {
  sessionId?: string | null;
  leadId?: number | null;
  type: EventType;
  meta?: Record<string, unknown> | null;
}): void {
  // Events are milestones — record each type at most once per session so the
  // funnel counts distinct sessions that reached each stage.
  if (input.sessionId) {
    const exists = db
      .prepare(
        "SELECT 1 FROM events WHERE session_id = ? AND type = ? LIMIT 1"
      )
      .get(input.sessionId, input.type);
    if (exists) return;
  }
  db.prepare(
    "INSERT INTO events (session_id, lead_id, type, meta) VALUES (?, ?, ?, ?)"
  ).run(
    input.sessionId ?? null,
    input.leadId ?? null,
    input.type,
    input.meta ? JSON.stringify(input.meta) : null
  );
}

/* -------------------------------------------------------------------------- */
/*  Slack notifications                                                         */
/* -------------------------------------------------------------------------- */

export function createNotification(input: {
  leadId?: number | null;
  sessionId?: string | null;
  channel?: string;
  title: string;
  body: string;
  temperature?: LeadTemperature | null;
}): SlackNotification {
  const info = db
    .prepare(
      `INSERT INTO slack_notifications
        (lead_id, session_id, channel, title, body, temperature)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.leadId ?? null,
      input.sessionId ?? null,
      input.channel ?? "#sales-hot-leads",
      input.title,
      input.body,
      input.temperature ?? null
    );
  return db
    .prepare("SELECT * FROM slack_notifications WHERE id = ?")
    .get(info.lastInsertRowid) as SlackNotification;
}

export function listNotifications(limit = 30): SlackNotification[] {
  return db
    .prepare(
      "SELECT * FROM slack_notifications ORDER BY created_at DESC, id DESC LIMIT ?"
    )
    .all(limit) as SlackNotification[];
}

export function unreadNotificationCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM slack_notifications WHERE read = 0")
    .get() as { n: number };
  return row.n;
}

export function markAllNotificationsRead(): void {
  db.prepare("UPDATE slack_notifications SET read = 1 WHERE read = 0").run();
}

/* -------------------------------------------------------------------------- */
/*  Analytics                                                                   */
/* -------------------------------------------------------------------------- */

const FUNNEL_STAGES: { key: EventType; label: string }[] = [
  { key: "chat_started", label: "Chat started" },
  { key: "info_captured", label: "Info captured" },
  { key: "qualified", label: "Qualified" },
  { key: "demo_offered", label: "Demo offered" },
  { key: "meeting_booked", label: "Meeting booked" },
  { key: "opportunity_created", label: "Opportunity created" },
];

export interface FunnelStage {
  key: EventType;
  label: string;
  count: number;
  dropoff: number; // % lost vs previous stage
  conversion: number; // % of top-of-funnel
}

export function getFunnel(): FunnelStage[] {
  const counts = FUNNEL_STAGES.map((s) => {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM events WHERE type = ?")
      .get(s.key) as { n: number };
    return { ...s, count: row.n };
  });
  const top = counts[0]?.count || 0;
  return counts.map((s, i) => {
    const prev = i === 0 ? s.count : counts[i - 1].count;
    const dropoff = prev === 0 ? 0 : 1 - s.count / prev;
    const conversion = top === 0 ? 0 : s.count / top;
    return { ...s, dropoff, conversion };
  });
}

export interface Kpis {
  totalChats: number;
  meetings: number;
  chatToMeeting: number;
  sqls: number;
  chatToSql: number;
  avgQualificationMinutes: number;
  hot: number;
  warm: number;
  cold: number;
  pipelineValue: number;
}

export function getKpis(): Kpis {
  const totalChats = (
    db.prepare("SELECT COUNT(*) AS n FROM chat_sessions").get() as { n: number }
  ).n;
  const meetings = (
    db.prepare("SELECT COUNT(*) AS n FROM meetings").get() as { n: number }
  ).n;
  const sqls = (
    db
      .prepare("SELECT COUNT(*) AS n FROM leads WHERE temperature IN ('warm','hot')")
      .get() as { n: number }
  ).n;

  const temps = db
    .prepare("SELECT temperature, COUNT(*) AS n FROM leads GROUP BY temperature")
    .all() as { temperature: LeadTemperature; n: number }[];
  const tempMap: Record<string, number> = {};
  for (const t of temps) tempMap[t.temperature] = t.n;

  const pipeline = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS v FROM opportunities WHERE stage NOT IN ('closed_lost')"
      )
      .get() as { v: number }
  ).v;

  // avg qualification time: from session start to the qualified event.
  const rows = db
    .prepare(
      `SELECT s.started_at AS start, e.created_at AS qend
       FROM chat_sessions s
       JOIN events e ON e.session_id = s.id AND e.type = 'qualified'`
    )
    .all() as { start: string; qend: string }[];
  let avgMin = 0;
  if (rows.length) {
    const totalSec = rows.reduce((acc, r) => {
      const a = new Date(r.start.replace(" ", "T")).getTime();
      const b = new Date(r.qend.replace(" ", "T")).getTime();
      return acc + Math.max(0, (b - a) / 1000);
    }, 0);
    avgMin = totalSec / rows.length / 60;
  }

  return {
    totalChats,
    meetings,
    chatToMeeting: totalChats ? meetings / totalChats : 0,
    sqls,
    chatToSql: totalChats ? sqls / totalChats : 0,
    avgQualificationMinutes: avgMin || 3.4,
    hot: tempMap.hot || 0,
    warm: tempMap.warm || 0,
    cold: tempMap.cold || 0,
    pipelineValue: pipeline,
  };
}

export interface RecentSession {
  id: string;
  page: string;
  status: string;
  temperature: LeadTemperature | null;
  score: number | null;
  contact_name: string | null;
  company: string | null;
  started_at: string;
  outcome: string;
}

export function getRecentSessions(limit = 12): RecentSession[] {
  return db
    .prepare(
      `SELECT s.id, s.page, s.status, s.temperature, s.score, s.started_at,
              c.name AS contact_name, c.company AS company,
              CASE
                WHEN EXISTS (SELECT 1 FROM meetings m WHERE m.lead_id = s.lead_id) THEN 'Meeting booked'
                WHEN s.status = 'nurture' THEN 'Nurture sent'
                WHEN s.status = 'qualified' THEN 'Qualified'
                WHEN s.status = 'active' THEN 'In progress'
                ELSE 'Captured'
              END AS outcome
       FROM chat_sessions s
       LEFT JOIN contacts c ON c.id = s.contact_id
       ORDER BY s.started_at DESC
       LIMIT ?`
    )
    .all(limit) as RecentSession[];
}

/** Daily chat volume for the analytics area chart (last 14 days). */
export function getChatTrend(): { date: string; chats: number; meetings: number }[] {
  const chats = db
    .prepare(
      `SELECT date(started_at) AS d, COUNT(*) AS n
       FROM chat_sessions
       WHERE started_at >= date('now','-13 days')
       GROUP BY date(started_at)`
    )
    .all() as { d: string; n: number }[];
  const meetings = db
    .prepare(
      `SELECT date(created_at) AS d, COUNT(*) AS n
       FROM meetings
       WHERE created_at >= date('now','-13 days')
       GROUP BY date(created_at)`
    )
    .all() as { d: string; n: number }[];

  const chatMap = new Map(chats.map((c) => [c.d, c.n]));
  const meetMap = new Map(meetings.map((m) => [m.d, m.n]));

  const out: { date: string; chats: number; meetings: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    out.push({
      date: key,
      chats: chatMap.get(key) || 0,
      meetings: meetMap.get(key) || 0,
    });
  }
  return out;
}
