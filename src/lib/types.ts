// Shared domain types for Foyer.

export type LeadTemperature = "cold" | "warm" | "hot";

export type LeadStatus =
  | "new"
  | "qualifying"
  | "qualified"
  | "nurture"
  | "demo_offered"
  | "booked"
  | "won"
  | "lost";

export type OpportunityStage =
  | "discovery"
  | "demo_scheduled"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type EventType =
  | "chat_started"
  | "info_captured"
  | "qualified"
  | "demo_offered"
  | "meeting_booked"
  | "opportunity_created"
  | "objection_handled"
  | "nurture_sent";

// The structured state we maintain turn-by-turn (never re-parsed from transcript).
export interface QualificationState {
  name: string | null;
  email: string | null;
  industry: string | null;
  companySize: string | null; // raw phrase, e.g. "about 200 people"
  companySizeBucket: "1-50" | "51-500" | "500+" | null;
  useCase: string | null;
  useCaseMatch: "match" | "vague" | null;
  budget: string | null;
  budgetLevel: "at_or_above" | "vague" | "below" | null;
  timeline: string | null;
  timelineBucket: "<1mo" | "1-3mo" | "3mo+" | null;
  currentTools: string | null;
  objectionsRaised: string[];
  // Count of profane / nonsense messages — flags low-quality or troll sessions.
  spamFlags: number;
  // How many times we've asked for an email without getting one (avoids a loop).
  emailAsks?: number;
}

/**
 * Tunable scoring rubric. Persisted in the DB and editable from the dashboard;
 * changing it re-scores every existing lead.
 */
export interface ScoringWeights {
  budget: { at_or_above: number; vague: number; below: number };
  timeline: { "<1mo": number; "1-3mo": number; "3mo+": number };
  useCase: { match: number; vague: number };
  companySize: { "500+": number; "51-500": number; "1-50": number };
  thresholds: { hot: number; warm: number };
}

export interface ScoreBreakdown {
  companySize: number;
  budget: number;
  timeline: number;
  useCase: number;
  total: number;
  temperature: LeadTemperature;
}

export type ChatRole = "assistant" | "user" | "system";

export interface ChatMessageDTO {
  id: number;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  contact_id: number;
  session_id: string | null;
  status: LeadStatus;
  score: number;
  temperature: LeadTemperature;
  qualification: string; // JSON string of QualificationState
  score_breakdown: string; // JSON string of ScoreBreakdown
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: number;
  lead_id: number;
  contact_id: number;
  name: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  lead_id: number | null;
  contact_id: number | null;
  name: string;
  email: string;
  slot_iso: string;
  slot_label: string;
  status: "confirmed" | "cancelled";
  created_at: string;
}

export interface ChatSession {
  id: string;
  contact_id: number | null;
  lead_id: number | null;
  status: "active" | "qualified" | "booked" | "nurture" | "closed";
  page: string;
  temperature: LeadTemperature | null;
  score: number | null;
  qualification: string; // JSON QualificationState
  started_at: string;
  updated_at: string;
}

export interface AppEvent {
  id: number;
  session_id: string | null;
  lead_id: number | null;
  type: EventType;
  meta: string | null;
  created_at: string;
}

export interface SlackNotification {
  id: number;
  lead_id: number | null;
  session_id: string | null;
  channel: string;
  title: string;
  body: string;
  temperature: LeadTemperature | null;
  read: number; // 0 | 1
  created_at: string;
}

export interface BookingSlot {
  iso: string;
  label: string;
  day: string;
  time: string;
}
