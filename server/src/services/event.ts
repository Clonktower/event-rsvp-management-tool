import db from '../db';
import { Event } from '../types/Event';
import { v4 as uuidv4 } from 'uuid';

// Creates a new event in the SQLite database
export function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Event {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const { name, date, startTime, endTime, maxAttendees, location } = event;
  db.prepare(`
    INSERT INTO events (id, name, date, start_time, end_time, max_attendees, location, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, date, startTime, endTime || null, maxAttendees ?? null, location, createdAt);
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

// Gets an event by its ID
export function getEventById(id: string): Event | null {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) || null;
}

// Deletes an event by its ID
export function deleteEvent(id: string): boolean {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return result.changes > 0;
}

// Gets all events, ordered by creation date descending
export function getAllEvents(): Event[] {
  return db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
}
