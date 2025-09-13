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
        created_at DATETIME NOT NULL DEFAULT (datetime('now'))
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
        UNIQUE(event_id, id),
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `).run();

    migrationAddTokenColumnToRsvp();

    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

if (require.main === module) {
  seed();
}
