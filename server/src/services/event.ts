import pool from '../db';
import { Event } from '../types/Event';
import { v4 as uuidv4 } from 'uuid';

export async function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const { name, date, startTime, endTime, maxAttendees, location } = event;
  const query = `
    INSERT INTO events (id, name, date, start_time, end_time, max_attendees, location, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [id, name, date, startTime, endTime || null, maxAttendees ?? null, location, createdAt];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function getEventById(id: string): Promise<Event | null> {
  const query = 'SELECT * FROM events WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const query = 'DELETE FROM events WHERE id = $1';
  const result = await pool.query(query, [id]);
  return !!result.rowCount && result.rowCount > 0;
}
