import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite connection singleton. In dev, Next.js hot-reloads modules, so we stash
 * the connection on globalThis to avoid opening a new handle on every reload.
 */
const DB_PATH =
  process.env.FLOWZINT_DB_PATH ||
  path.join(process.cwd(), "data", "flowzint.db");

declare global {
  // eslint-disable-next-line no-var
  var __flowzint_db: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export const db: Database.Database =
  globalThis.__flowzint_db ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.__flowzint_db = db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      company TEXT,
      industry TEXT,
      company_size TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      session_id TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      score INTEGER NOT NULL DEFAULT 0,
      temperature TEXT NOT NULL DEFAULT 'cold',
      qualification TEXT NOT NULL DEFAULT '{}',
      score_breakdown TEXT NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT 'chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'discovery',
      amount INTEGER NOT NULL DEFAULT 0,
      probability INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      slot_iso TEXT NOT NULL,
      slot_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active',
      page TEXT NOT NULL DEFAULT '/',
      temperature TEXT,
      score INTEGER,
      qualification TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      lead_id INTEGER,
      type TEXT NOT NULL,
      meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slack_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      session_id TEXT,
      channel TEXT NOT NULL DEFAULT '#sales-hot-leads',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      temperature TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_id);
    CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `);
}

export function isSeeded(): boolean {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM contacts")
    .get() as { n: number };
  return row.n > 0;
}

export function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
