import db from '../db';

// Upserts an RSVP for an event (one per attendee per event)
export function rsvpToEventService({ eventId, attendeeId, name, status, guests = 0 }: { eventId: string, attendeeId: string, name: string, status: string, guests?: number }) {
  const id = attendeeId;
  const now = new Date().toISOString();
  // SQLite upsert using INSERT OR REPLACE
  db.prepare(`
    INSERT OR REPLACE INTO rsvp (id, event_id, name, status, guests, created_at, updated_at)
    VALUES (
      ?, ?, ?, ?, ?,
      COALESCE((SELECT created_at FROM rsvp WHERE id = ? AND event_id = ?), ?),
      ?
    )
  `).run(id, eventId, name, status, guests, id, eventId, now, now);
  return db.prepare('SELECT * FROM rsvp WHERE id = ? AND event_id = ?').get(id, eventId);
}

// Gets all RSVPs for an event, ordered by creation time ascending
export function getRsvpByEventId(eventId: string) {
  return db.prepare('SELECT id, name, status, guests, created_at, updated_at FROM rsvp WHERE event_id = ? ORDER BY created_at ASC').all(eventId);
}
