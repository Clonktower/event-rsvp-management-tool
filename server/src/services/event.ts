import db from '../db';
import { Event } from '../types/Event';
import { v4 as uuidv4 } from 'uuid';

// Creates a new event in the SQLite database
export function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Event {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const { name, date, startTime, endTime, maxAttendees, location, registrationOpensAt } = event;
  db.prepare(`
    INSERT INTO events (id, name, date, start_time, end_time, max_attendees, location, created_at, registration_opens_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, date, startTime, endTime || null, maxAttendees ?? null, location, createdAt, registrationOpensAt ?? null);
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;
}

// Gets an event by its ID
export function getEventById(id: string): Event | null {
  return (db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event) || null;
}

// Deletes an event by its ID
export function deleteEvent(id: string): boolean {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return result.changes > 0;
}

// Updates an existing event by its ID
export function updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'createdAt'>>): Event | null {
  const existing = getEventById(id);
  if (!existing) return null;
  const { name, date, startTime, endTime, maxAttendees, location, registrationOpensAt } = updates;
  db.prepare(`
    UPDATE events SET
      name = COALESCE(?, name),
      date = COALESCE(?, date),
      start_time = COALESCE(?, start_time),
      end_time = COALESCE(?, end_time),
      max_attendees = CASE WHEN ? = 1 THEN ? ELSE max_attendees END,
      location = COALESCE(?, location),
      registration_opens_at = CASE WHEN ? = 1 THEN ? ELSE registration_opens_at END
    WHERE id = ?
  `).run(
    name ?? null,
    date ?? null,
    startTime ?? null,
    endTime ?? null,
    maxAttendees !== undefined ? 1 : 0,
    maxAttendees ?? null,
    location ?? null,
    registrationOpensAt !== undefined ? 1 : 0,
    registrationOpensAt ?? null,
    id
  );
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;
}

// Gets all events, ordered by creation date descending
export function getAllEvents(): Event[] {
  return db.prepare('SELECT * FROM events ORDER BY created_at DESC').all() as Event[];
}
