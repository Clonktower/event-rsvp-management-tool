import db from './index';

// Migration: Add token column to rsvp if missing
function migrationAddTokenColumnToRsvp() {
  type PragmaColumn = { name: string };
  const pragma = db.prepare("PRAGMA table_info(rsvp);").all() as PragmaColumn[];
  const hasToken = pragma.some(col => col.name === 'token');
  if (!hasToken) {
    db.prepare("ALTER TABLE rsvp ADD COLUMN token TEXT NOT NULL DEFAULT 'legacy';").run();
    console.log("Added 'token' column to rsvp table.");
  }
}

// Migration: Add registration_opens_at column to events if missing
function migrationAddRegistrationOpensAtToEvents() {
  type PragmaColumn = { name: string };
  const pragma = db.prepare("PRAGMA table_info(events);").all() as PragmaColumn[];
  if (!pragma.some(col => col.name === 'registration_opens_at')) {
    db.prepare("ALTER TABLE events ADD COLUMN registration_opens_at TEXT;").run();
    console.log("Added 'registration_opens_at' column to events table.");
  }
}

// Migration: Add lottery columns to events if missing
function migrationAddLotteryColumnsToEvents() {
  type PragmaColumn = { name: string };
  const pragma = db.prepare("PRAGMA table_info(events);").all() as PragmaColumn[];
  if (!pragma.some(col => col.name === 'selection_mode')) {
    db.prepare("ALTER TABLE events ADD COLUMN selection_mode TEXT NOT NULL DEFAULT 'fifo';").run();
    console.log("Added 'selection_mode' column to events table.");
  }
  if (!pragma.some(col => col.name === 'drawn_at')) {
    db.prepare("ALTER TABLE events ADD COLUMN drawn_at TEXT;").run();
    console.log("Added 'drawn_at' column to events table.");
  }
}

// Migration: Add lottery columns to rsvp if missing
function migrationAddLotteryColumnsToRsvp() {
  type PragmaColumn = { name: string };
  const pragma = db.prepare("PRAGMA table_info(rsvp);").all() as PragmaColumn[];
  if (!pragma.some(col => col.name === 'priority_weight')) {
    db.prepare("ALTER TABLE rsvp ADD COLUMN priority_weight REAL NOT NULL DEFAULT 0;").run();
    console.log("Added 'priority_weight' column to rsvp table.");
  }
  if (!pragma.some(col => col.name === 'lottery_rank')) {
    db.prepare("ALTER TABLE rsvp ADD COLUMN lottery_rank INTEGER;").run();
    console.log("Added 'lottery_rank' column to rsvp table.");
  }
}

// Seeds the SQLite database with required tables
export default function seed() {
  try {
    // Create events table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        max_attendees INTEGER,
        location TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        selection_mode TEXT NOT NULL DEFAULT 'fifo',
        drawn_at TEXT
      );
    `).run();

    // Create rsvp table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rsvp (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        guests INTEGER DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
        token TEXT NOT NULL DEFAULT 'legacy',
        priority_weight REAL NOT NULL DEFAULT 0,
        lottery_rank INTEGER,
        UNIQUE(event_id, id),
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `).run();

    migrationAddTokenColumnToRsvp();
    migrationAddRegistrationOpensAtToEvents();
    migrationAddLotteryColumnsToEvents();
    migrationAddLotteryColumnsToRsvp();

    // Create polls table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `).run();

    // Create poll_options table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
      );
    `).run();

    // Create poll_votes table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        poll_option_id TEXT NOT NULL,
        rsvp_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY(poll_option_id, rsvp_id),
        FOREIGN KEY(poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
        FOREIGN KEY(rsvp_id) REFERENCES rsvp(id) ON DELETE CASCADE
      );
    `).run();

    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

if (require.main === module) {
  seed();
}
