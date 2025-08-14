import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

export async function rsvpToEventService({ eventId, attendeeId, name, status, guests = 0 }: { eventId: string, attendeeId: string, name: string, status: string, guests?: number }) {
  const id = attendeeId;
  const createdAt = new Date().toISOString();
  const updatedAt = new Date().toISOString();

  // Upsert based on (event_id, id) so one attendee can RSVP once per event otherwise update their status and guests
  const upsertQuery = `
    INSERT INTO rsvp (id, event_id, name, status, guests, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (event_id, id)
    DO UPDATE SET status = EXCLUDED.status, guests = EXCLUDED.guests, updated_at = EXCLUDED.updated_at
    RETURNING *
  `;
  const values = [id, eventId, name, status, guests, createdAt, updatedAt];
  const { rows } = await pool.query(upsertQuery, values);
  return rows[0];
}

export async function getRsvpByEventId(eventId: string) {
  const query = 'SELECT id, name, status, guests, created_at, updated_at FROM rsvp WHERE event_id = $1 ORDER BY created_at ASC';
  const { rows } = await pool.query(query, [eventId]);
  return rows;
}
