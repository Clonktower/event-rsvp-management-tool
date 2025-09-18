import db from '../db';
import crypto from 'crypto';

export function rsvpToEventService({ id, eventId, name, status, guests = 0 }: { id: string, eventId: string, name: string, status: string, guests?: number }) {
  const now = new Date().toISOString();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO rsvp (id, event_id, name, status, guests, created_at, updated_at, token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, eventId, name, status, guests, now, now, token);
  return db.prepare('SELECT * FROM rsvp WHERE id = ? AND event_id = ?').get(id, eventId);
}

// Gets all RSVPs for an event, ordered by creation time ascending
export function getRsvpByEventId(eventId: string) {
  return db.prepare('SELECT id, name, status, guests, created_at, updated_at FROM rsvp WHERE event_id = ? ORDER BY created_at ASC').all(eventId);
}

// Deletes an RSVP by id
export function deleteRsvpById(id: string) {
  return db.prepare('DELETE FROM rsvp WHERE id = ?').run(id);
}

export function updateRsvpByToken({ eventId, rsvpId, token, name, status, guests }: {
  eventId: string,
  rsvpId: string,
  token: string,
  name: string,
  status: string,
  guests: number
}) {
  const sql = `UPDATE rsvp SET name = ?, status = ?, guests = ?, updated_at = ? WHERE id = ? AND event_id = ? AND token = ?`;
  const now = new Date().toISOString();
  const result = db.prepare(sql).run(name, status, guests, now, rsvpId, eventId, token);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM rsvp WHERE id = ? AND event_id = ?').get(rsvpId, eventId);
}
