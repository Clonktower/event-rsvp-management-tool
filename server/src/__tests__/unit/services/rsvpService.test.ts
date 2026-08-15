import { beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  deleteRsvpById,
  getMyRsvpsService,
  getRsvpByEventId,
  rsvpToEventService,
  runDrawForEvent,
  updateRsvpByToken,
} from '../../../services/rsvp';
import { createEvent, deleteEvent } from '../../../services/event';
import db from '../../../db';

const BASE_EVENT = {
  name: 'Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Venue',
};

let eventId: string;

// `as any` below is needed because the rsvp service returns raw snake_case DB
// rows (via `SELECT *`) while the declared types are camelCase — the same type
// drift documented in eventService.test.ts.

beforeEach(() => {
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();
  eventId = createEvent(BASE_EVENT).id;
});

describe('rsvpToEventService', () => {
  it('creates an RSVP with a 64-character hex token', () => {
    const rsvp = rsvpToEventService({ id: uuidv4(), eventId, name: 'Alice', status: 'going' }) as any;
    expect(rsvp.token).toHaveLength(64);
    expect(rsvp.name).toBe('Alice');
    expect(rsvp.status).toBe('going');
  });

  it('defaults guests to 0', () => {
    const rsvp = rsvpToEventService({ id: uuidv4(), eventId, name: 'Bob', status: 'maybe' }) as any;
    expect(rsvp.guests).toBe(0);
  });

  it('stores the provided guest count', () => {
    const rsvp = rsvpToEventService({ id: uuidv4(), eventId, name: 'Carol', status: 'going', guests: 3 }) as any;
    expect(rsvp.guests).toBe(3);
  });

  it('throws on a duplicate id rather than guarding client-supplied ids (BUG)', () => {
    // BUG: rsvpToEventService trusts the caller-supplied `id` as the primary key,
    // and the controller lets clients send their own id. A collision (accidental,
    // or a malicious attempt to "claim" a specific UUID) hits the PK/UNIQUE
    // constraint and surfaces as an unhandled 500 instead of a clean 4xx. The
    // server should generate the id itself rather than trust the client.
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    expect(() =>
      rsvpToEventService({ id, eventId, name: 'Mallory', status: 'going' }),
    ).toThrow();
  });
});

describe('getRsvpByEventId', () => {
  it('returns RSVPs for an event and orders by created_at ascending', () => {
    // Insert with explicit timestamps to guarantee ordering
    const now = new Date();
    const idA = uuidv4();
    const idB = uuidv4();
    db.prepare(
      `INSERT INTO rsvp (id, event_id, name, status, guests, created_at, updated_at, token) VALUES (?, ?, 'Alice', 'going', 0, ?, ?, 'tokA')`,
    ).run(idA, eventId, new Date(now.getTime() - 1000).toISOString(), new Date(now.getTime() - 1000).toISOString());
    db.prepare(
      `INSERT INTO rsvp (id, event_id, name, status, guests, created_at, updated_at, token) VALUES (?, ?, 'Bob', 'maybe', 0, ?, ?, 'tokB')`,
    ).run(idB, eventId, now.toISOString(), now.toISOString());
    const rsvps = getRsvpByEventId(eventId) as any[];
    expect(rsvps).toHaveLength(2);
    expect(rsvps[0].name).toBe('Alice');
    expect(rsvps[1].name).toBe('Bob');
  });

  it('does not expose the token in results', () => {
    rsvpToEventService({ id: uuidv4(), eventId, name: 'Alice', status: 'going' });
    const rsvps = getRsvpByEventId(eventId) as any[];
    expect(rsvps[0]).not.toHaveProperty('token');
  });

  it('returns an empty array for an event with no RSVPs', () => {
    expect(getRsvpByEventId(eventId)).toEqual([]);
  });
});

describe('deleteRsvpById', () => {
  it('deletes an RSVP and reports 1 change', () => {
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    const result = deleteRsvpById(id);
    expect(result.changes).toBe(1);
    expect(getRsvpByEventId(eventId)).toHaveLength(0);
  });

  it('reports 0 changes for an unknown id', () => {
    expect(deleteRsvpById('ghost').changes).toBe(0);
  });
});

describe('updateRsvpByToken', () => {
  it('updates name, status, and guests when the token matches', () => {
    const id = uuidv4();
    const rsvp = rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' }) as any;
    const updated = updateRsvpByToken({
      eventId,
      rsvpId: id,
      token: rsvp.token,
      name: 'Alice B',
      status: 'maybe',
      guests: 2,
    }) as any;
    expect(updated.name).toBe('Alice B');
    expect(updated.status).toBe('maybe');
    expect(updated.guests).toBe(2);
  });

  it('leaks the secret token in its return value (BUG: token disclosure)', () => {
    // BUG: updateRsvpByToken does `SELECT *`, so the per-RSVP secret edit token is
    // included in the returned object and serialized straight back to the client
    // by the controller. That token is a capability — anyone holding it can edit
    // or delete the RSVP — so it must never appear in a response. The query should
    // select explicit columns (as getRsvpByEventId already does). Until that is
    // fixed, this test pins the leak so the eventual fix is a visible change.
    const id = uuidv4();
    const rsvp = rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' }) as any;
    const updated = updateRsvpByToken({
      eventId,
      rsvpId: id,
      token: rsvp.token,
      name: 'Alice B',
      status: 'maybe',
      guests: 0,
    }) as any;
    expect(updated).toHaveProperty('token');
  });

  it('returns null when the token is wrong', () => {
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    expect(
      updateRsvpByToken({ eventId, rsvpId: id, token: 'wrongtoken', name: 'X', status: 'going', guests: 0 }),
    ).toBeNull();
  });

  it('returns null when the rsvpId does not exist', () => {
    expect(
      updateRsvpByToken({ eventId, rsvpId: 'ghost', token: 'any', name: 'X', status: 'going', guests: 0 }),
    ).toBeNull();
  });

  it('returns null when the eventId does not match', () => {
    const id = uuidv4();
    const rsvp = rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' }) as any;
    const otherId = createEvent(BASE_EVENT).id;
    expect(
      updateRsvpByToken({ eventId: otherId, rsvpId: id, token: rsvp.token, name: 'X', status: 'going', guests: 0 }),
    ).toBeNull();
  });
});

describe('getMyRsvpsService', () => {
  it('returns event+status pairs for matching rsvpId/eventId pairs', async () => {
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    const results = (await getMyRsvpsService([{ rsvpId: id, eventId }])) as any[];
    expect(results).toHaveLength(1);
    expect(results[0].yourStatus).toBe('going');
    expect(results[0].event.id).toBe(eventId);
  });

  it('includes attendeeName from the rsvp record', async () => {
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    const results = (await getMyRsvpsService([{ rsvpId: id, eventId }])) as any[];
    expect(results[0].attendeeName).toBe('Alice');
  });

  it('returns correct attendeeNames for multiple RSVPs on the same event', async () => {
    const idA = uuidv4();
    const idB = uuidv4();
    rsvpToEventService({ id: idA, eventId, name: 'Alice', status: 'going' });
    rsvpToEventService({ id: idB, eventId, name: 'Bob', status: 'maybe' });
    const results = (await getMyRsvpsService([
      { rsvpId: idA, eventId },
      { rsvpId: idB, eventId },
    ])) as any[];
    expect(results).toHaveLength(2);
    const names = results.map((r: any) => r.attendeeName).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('returns empty array for empty input', async () => {
    expect(await getMyRsvpsService([])).toEqual([]);
  });

  it('ignores pairs that do not exist', async () => {
    const results = await getMyRsvpsService([{ rsvpId: 'ghost', eventId: 'ghost' }]);
    expect(results).toHaveLength(0);
  });
});

describe('runDrawForEvent', () => {
  function createLotteryEvent() {
    return createEvent({ ...BASE_EVENT, selectionMode: 'lottery' }).id;
  }

  it('assigns a lottery_rank to every going RSVP and records drawn_at on the event', () => {
    const lotteryId = createLotteryEvent();
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Alice', status: 'going' });
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Bob', status: 'going' });
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Carol', status: 'going' });

    runDrawForEvent(lotteryId);

    const ranks = (getRsvpByEventId(lotteryId) as any[]).map((r) => r.lottery_rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
    const event = db.prepare('SELECT drawn_at FROM events WHERE id = ?').get(lotteryId) as any;
    expect(event.drawn_at).toBeTruthy();
  });

  it('does not rank non-going RSVPs', () => {
    const lotteryId = createLotteryEvent();
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Alice', status: 'going' });
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Maybe', status: 'maybe' });

    runDrawForEvent(lotteryId);

    const rows = getRsvpByEventId(lotteryId) as any[];
    const maybeRow = rows.find((r) => r.name === 'Maybe');
    expect(maybeRow.lottery_rank).toBeNull();
  });

  it('seeds higher priority_weight to the front of the draw', () => {
    const lotteryId = createLotteryEvent();
    // Many zero-weight entrants plus one priority entrant; a priority weight must
    // always win rank 1 regardless of the random tiebreak among the rest.
    for (let i = 0; i < 20; i++) {
      rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: `Reg${i}`, status: 'going' });
    }
    const vipId = uuidv4();
    rsvpToEventService({ id: vipId, eventId: lotteryId, name: 'Vip', status: 'going', priorityWeight: 1 });

    runDrawForEvent(lotteryId);

    const vip = db.prepare('SELECT lottery_rank FROM rsvp WHERE id = ?').get(vipId) as any;
    expect(vip.lottery_rank).toBe(1);
  });

  it('keeps a post-draw maybe→going entrant at the back of the list (null rank)', () => {
    const lotteryId = createLotteryEvent();
    const goingId = uuidv4();
    rsvpToEventService({ id: goingId, eventId: lotteryId, name: 'Alice', status: 'going' });
    const maybeId = uuidv4();
    const maybeRsvp = rsvpToEventService({ id: maybeId, eventId: lotteryId, name: 'Bob', status: 'maybe' }) as any;

    runDrawForEvent(lotteryId);

    // Bob was 'maybe' at draw time, so he was never ranked. Flipping to 'going'
    // afterwards must not jump him ahead of the drawn entrants — he joins the back.
    updateRsvpByToken({ eventId: lotteryId, rsvpId: maybeId, token: maybeRsvp.token, name: 'Bob', status: 'going', guests: 0 });

    const ordered = getRsvpByEventId(lotteryId) as any[];
    const bob = ordered.find((r) => r.id === maybeId);
    expect(bob.status).toBe('going');
    expect(bob.lottery_rank).toBeNull();
    expect(ordered[ordered.length - 1].id).toBe(maybeId);
    expect(ordered[0].id).toBe(goingId);
  });

  it('forfeits the drawn rank when a going entrant leaves and rejoins (no seat take-backs)', () => {
    const lotteryId = createLotteryEvent();
    // Three seats, four entrants: ranks 1-3 are in, rank 4 is waitlisted.
    db.prepare('UPDATE events SET max_attendees = 3 WHERE id = ?').run(lotteryId);
    const winners: any[] = [];
    for (const name of ['A', 'B', 'C', 'D']) {
      winners.push(rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name, status: 'going' }) as any);
    }
    runDrawForEvent(lotteryId);

    const ranked = getRsvpByEventId(lotteryId) as any[];
    const seatHolder = ranked[2]; // rank 3, the last person inside capacity
    const waitlisted = ranked[3]; // rank 4, first on the waitlist
    const seatHolderRow = winners.find((w) => w.id === seatHolder.id);

    // Seat holder steps out...
    updateRsvpByToken({ eventId: lotteryId, rsvpId: seatHolder.id, token: seatHolderRow.token, name: seatHolder.name, status: 'not_going', guests: 0 });
    // ...then changes their mind and comes back to going.
    updateRsvpByToken({ eventId: lotteryId, rsvpId: seatHolder.id, token: seatHolderRow.token, name: seatHolder.name, status: 'going', guests: 0 });

    const after = getRsvpByEventId(lotteryId) as any[];
    const seatHolderAfter = after.find((r) => r.id === seatHolder.id);
    const waitlistedAfter = after.find((r) => r.id === waitlisted.id);
    // The returning entrant lost their rank and is now behind the promoted waitlister.
    expect(seatHolderAfter.lottery_rank).toBeNull();
    expect(waitlistedAfter.lottery_rank).toBe(4);
    expect(after[after.length - 1].id).toBe(seatHolder.id);
  });

  it('preserves the drawn rank when a going entrant edits without leaving going', () => {
    const lotteryId = createLotteryEvent();
    const id = uuidv4();
    const row = rsvpToEventService({ id, eventId: lotteryId, name: 'Alice', status: 'going' }) as any;
    runDrawForEvent(lotteryId);
    const rankBefore = (db.prepare('SELECT lottery_rank FROM rsvp WHERE id = ?').get(id) as any).lottery_rank;

    // Editing guest count while staying 'going' must not demote her.
    updateRsvpByToken({ eventId: lotteryId, rsvpId: id, token: row.token, name: 'Alice', status: 'going', guests: 2 });

    const rankAfter = (db.prepare('SELECT lottery_rank FROM rsvp WHERE id = ?').get(id) as any).lottery_rank;
    expect(rankAfter).toBe(rankBefore);
    expect(rankAfter).not.toBeNull();
  });

  it('orders a drawn lottery by lottery_rank, with post-draw signups last', () => {
    const lotteryId = createLotteryEvent();
    const firstId = uuidv4();
    const secondId = uuidv4();
    rsvpToEventService({ id: firstId, eventId: lotteryId, name: 'First', status: 'going' });
    rsvpToEventService({ id: secondId, eventId: lotteryId, name: 'Second', status: 'going' });

    runDrawForEvent(lotteryId);

    // Someone signs up after the draw — they have no rank and must fall to the back.
    rsvpToEventService({ id: uuidv4(), eventId: lotteryId, name: 'Latecomer', status: 'going' });

    const ordered = getRsvpByEventId(lotteryId) as any[];
    expect(ordered[ordered.length - 1].name).toBe('Latecomer');
    // The first two are the ranked entries, in ascending rank order.
    expect(ordered[0].lottery_rank).toBe(1);
    expect(ordered[1].lottery_rank).toBe(2);
  });
});

describe('foreign key cascade', () => {
  it('cascade-deletes an event\'s RSVPs when the event is deleted', () => {
    // The schema declares `FOREIGN KEY(event_id) ... ON DELETE CASCADE`, and
    // better-sqlite3 enables foreign key enforcement by default (verified:
    // `PRAGMA foreign_keys` is 1 on this connection), so deleting an event also
    // removes its RSVPs rather than leaving orphaned rows. This guards against a
    // future regression where the pragma gets turned off.
    const id = uuidv4();
    rsvpToEventService({ id, eventId, name: 'Alice', status: 'going' });
    deleteEvent(eventId);
    const orphan = db.prepare('SELECT id FROM rsvp WHERE id = ?').get(id);
    expect(orphan).toBeFalsy();
  });
});
