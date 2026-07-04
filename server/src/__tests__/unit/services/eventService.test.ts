import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from '../../../services/event';
import db from '../../../db';

// TYPE DRIFT (documented, not fixed): the services do `SELECT *` and return raw
// snake_case DB rows, but the server's `types/Event.ts` is camelCase
// (startTime, maxAttendees, registrationOpensAt...). So the declared return type
// lies about the real shape. These tests assert against the *actual* wire/DB
// shape via this local snake_case type and `as unknown as DbEvent` casts. The
// proper fix is to split a snake_case RawEventRow from the camelCase app Event
// and map between them (or commit to snake_case end to end).
type DbEvent = { id: string; name: string; location: string; max_attendees: number | null; registration_opens_at: string | null };

const BASE = {
  name: 'Test Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Test Venue',
};

beforeEach(() => {
  db.prepare('DELETE FROM events').run();
});

describe('createEvent', () => {
  it('creates an event and returns it with a generated id', () => {
    const event = createEvent(BASE) as unknown as DbEvent;
    expect(event.id).toBeTruthy();
    expect(event.name).toBe('Test Event');
    expect(event.location).toBe('Test Venue');
  });

  it('stores maxAttendees', () => {
    const event = createEvent({ ...BASE, maxAttendees: 30 }) as unknown as DbEvent;
    expect(event.max_attendees).toBe(30);
  });

  it('stores registrationOpensAt', () => {
    const opensAt = '2025-11-01T09:00:00.000Z';
    const event = createEvent({ ...BASE, registrationOpensAt: opensAt }) as unknown as DbEvent;
    expect(event.registration_opens_at).toBe(opensAt);
  });

  it('defaults max_attendees to null when not provided', () => {
    const event = createEvent(BASE) as unknown as DbEvent;
    expect(event.max_attendees).toBeNull();
  });

  it('accepts a whitespace-only name (validation is a controller-level concern)', () => {
    const event = createEvent({ ...BASE, name: '   ' }) as unknown as DbEvent;
    expect(event.name).toBe('   ');
  });

  it('round-trips a name containing emoji and 4-byte Unicode', () => {
    const name = '🎉 Board Game Night 🃏 — مرحبا 你好';
    const event = createEvent({ ...BASE, name }) as unknown as DbEvent;
    expect(event.name).toBe(name);
  });

  it('round-trips a name containing RTL text', () => {
    const name = 'אירוע גיימינג';
    const event = createEvent({ ...BASE, name }) as unknown as DbEvent;
    expect(event.name).toBe(name);
  });
});

describe('getEventById', () => {
  it('retrieves an event by its id', () => {
    const created = createEvent(BASE);
    const found = getEventById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('returns null for a non-existent id', () => {
    expect(getEventById('no-such-id')).toBeNull();
  });
});

describe('getAllEvents', () => {
  it('returns all events and orders by created_at descending', () => {
    // Insert with explicit timestamps to guarantee ordering
    const now = new Date();
    const older = new Date(now.getTime() - 1000).toISOString();
    const newer = now.toISOString();
    db.prepare(
      `INSERT INTO events (id, name, date, start_time, end_time, location, created_at) VALUES ('id-1', 'First', '2025-12-25', '18:00', '22:00', 'Venue', ?)`,
    ).run(older);
    db.prepare(
      `INSERT INTO events (id, name, date, start_time, end_time, location, created_at) VALUES ('id-2', 'Second', '2025-12-25', '18:00', '22:00', 'Venue', ?)`,
    ).run(newer);
    const events = getAllEvents();
    expect(events).toHaveLength(2);
    expect(events[0].name).toBe('Second');
    expect(events[1].name).toBe('First');
  });

  it('returns an empty array when there are no events', () => {
    expect(getAllEvents()).toEqual([]);
  });
});

describe('updateEvent', () => {
  it('updates name while leaving other fields intact', () => {
    const created = createEvent(BASE);
    const updated = updateEvent(created.id, { name: 'Renamed Event' });
    expect(updated!.name).toBe('Renamed Event');
    expect(updated!.location).toBe('Test Venue');
  });

  it('can clear maxAttendees by passing null', () => {
    const created = createEvent({ ...BASE, maxAttendees: 50 });
    const updated = updateEvent(created.id, { maxAttendees: null as any }) as unknown as DbEvent;
    expect(updated!.max_attendees).toBeNull();
  });

  it('can clear registrationOpensAt by passing null', () => {
    const created = createEvent({ ...BASE, registrationOpensAt: '2025-11-01T09:00:00.000Z' });
    const updated = updateEvent(created.id, { registrationOpensAt: null as any }) as unknown as DbEvent;
    expect(updated!.registration_opens_at).toBeNull();
  });

  it('returns null for a non-existent id', () => {
    expect(updateEvent('ghost', { name: 'X' })).toBeNull();
  });

  it('clearing maxAttendees to null is reflected on next read', () => {
    const created = createEvent({ ...BASE, maxAttendees: 5 }) as unknown as DbEvent;
    updateEvent(created.id, { maxAttendees: null as any });
    const reread = getEventById(created.id) as unknown as DbEvent;
    expect(reread!.max_attendees).toBeNull();
  });

  it('shrinking maxAttendees below existing count is accepted by the service', () => {
    const created = createEvent({ ...BASE, maxAttendees: 10 });
    const updated = updateEvent(created.id, { maxAttendees: 1 }) as unknown as DbEvent;
    expect(updated!.max_attendees).toBe(1);
  });
});

describe('deleteEvent', () => {
  it('deletes an event and returns true', () => {
    const created = createEvent(BASE);
    expect(deleteEvent(created.id)).toBe(true);
    expect(getEventById(created.id)).toBeNull();
  });

  it('returns false for a non-existent id', () => {
    expect(deleteEvent('ghost')).toBe(false);
  });
});
