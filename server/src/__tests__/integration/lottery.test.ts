import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import server from './testServer';
import db from '../../db';

const AUTH = 'Basic testadmin:testpass';

const BASE_EVENT = {
  name: 'Lottery Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Venue',
};

async function createEvent(overrides: Record<string, unknown> = {}) {
  const res = await request(server)
    .post('/admin/create-event')
    .set('Authorization', AUTH)
    .send({ ...BASE_EVENT, ...overrides });
  return res.body.event;
}

beforeEach(() => {
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();
});

describe('event selection_mode', () => {
  it('defaults to fifo when not specified', async () => {
    const event = await createEvent();
    expect(event.selection_mode).toBe('fifo');
  });

  it('creates an event in lottery mode', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });
    expect(event.selection_mode).toBe('lottery');
    expect(event.drawn_at).toBeFalsy();
  });

  it('rejects an invalid selectionMode', async () => {
    await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, selectionMode: 'bogus' })
      .expect(400);
  });

  it('can switch an existing event to lottery mode via PATCH', async () => {
    const event = await createEvent();
    await request(server)
      .patch(`/admin/events/${event.id}`)
      .set('Authorization', AUTH)
      .send({ selectionMode: 'lottery' })
      .expect(200);
    const fetched = await request(server).get(`/events/${event.id}`);
    expect(fetched.body.event.selection_mode).toBe('lottery');
  });
});

describe('lottery registration window', () => {
  it('does NOT block sign-ups before registrationOpensAt (the draw is the gate)', async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const event = await createEvent({ selectionMode: 'lottery', registrationOpensAt: future });

    // In FIFO mode this same request would be 403; in lottery mode it must succeed.
    await request(server)
      .post(`/events/${event.id}/rsvp`)
      .send({ name: 'Alice', status: 'going' })
      .expect(201);
  });

  it('stamps a priority weight on an admin-created RSVP and zero for the public', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });

    await request(server)
      .post(`/events/${event.id}/rsvp`)
      .set('Authorization', AUTH)
      .send({ name: 'Admin', status: 'going' })
      .expect(201);
    await request(server)
      .post(`/events/${event.id}/rsvp`)
      .send({ name: 'Public', status: 'going' })
      .expect(201);

    const fetched = await request(server).get(`/events/${event.id}`);
    const byName = Object.fromEntries(fetched.body.rsvp.map((r: any) => [r.name, r.priority_weight]));
    expect(byName.Admin).toBeGreaterThan(0);
    expect(byName.Public).toBe(0);
  });
});

describe('POST /admin/events/:id/draw', () => {
  it('requires admin authentication', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });
    await request(server).post(`/admin/events/${event.id}/draw`).expect(401);
  });

  it('returns 404 for a non-existent event', async () => {
    await request(server)
      .post('/admin/events/ghost/draw')
      .set('Authorization', AUTH)
      .expect(404);
  });

  it('rejects a draw on a fifo event', async () => {
    const event = await createEvent();
    await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(400);
  });

  it('draws the lottery and assigns ranks reflected in GET /events/:id', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });
    for (const name of ['Alice', 'Bob', 'Carol']) {
      await request(server).post(`/events/${event.id}/rsvp`).send({ name, status: 'going' });
    }

    const drawRes = await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(200);
    expect(drawRes.body.drawnAt).toBeTruthy();

    const fetched = await request(server).get(`/events/${event.id}`);
    expect(fetched.body.event.drawn_at).toBeTruthy();
    const ranks = fetched.body.rsvp.map((r: any) => r.lottery_rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
  });

  it('places a maybe→going change made after the draw at the end of the list', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });
    await request(server).post(`/events/${event.id}/rsvp`).send({ name: 'Alice', status: 'going' });
    const bobRes = await request(server).post(`/events/${event.id}/rsvp`).send({ name: 'Bob', status: 'maybe' });
    const { id: bobId, token } = bobRes.body.rsvp;

    await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(200);

    // Bob flips maybe -> going after the draw; he must land at the back, unranked.
    await request(server)
      .patch(`/events/${event.id}/rsvp/${bobId}`)
      .send({ token, name: 'Bob', status: 'going', guests: 0 })
      .expect(200);

    const fetched = await request(server).get(`/events/${event.id}`);
    const rows = fetched.body.rsvp;
    const bob = rows.find((r: any) => r.id === bobId);
    expect(bob.status).toBe('going');
    expect(bob.lottery_rank).toBeNull();
    expect(rows[rows.length - 1].id).toBe(bobId);
  });

  it('does not let a returning entrant snatch back a seat already promoted to a waitlister', async () => {
    const event = await createEvent({ selectionMode: 'lottery', maxAttendees: 2 });
    const rsvps: Record<string, { id: string; token: string }> = {};
    for (const name of ['A', 'B', 'C']) {
      const res = await request(server).post(`/events/${event.id}/rsvp`).send({ name, status: 'going' });
      rsvps[name] = { id: res.body.rsvp.id, token: res.body.rsvp.token };
    }

    await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(200);

    // Identify the last in-capacity seat holder (rank 2) and the first waitlister (rank 3).
    let fetched = await request(server).get(`/events/${event.id}`);
    const drawn = fetched.body.rsvp;
    const seatHolder = drawn.find((r: any) => r.lottery_rank === 2);
    const waitlister = drawn.find((r: any) => r.lottery_rank === 3);
    const seatHolderToken = Object.values(rsvps).find((r) => r.id === seatHolder.id)!.token;

    // Seat holder leaves, then returns to going.
    await request(server)
      .patch(`/events/${event.id}/rsvp/${seatHolder.id}`)
      .send({ token: seatHolderToken, name: seatHolder.name, status: 'not_going', guests: 0 })
      .expect(200);
    await request(server)
      .patch(`/events/${event.id}/rsvp/${seatHolder.id}`)
      .send({ token: seatHolderToken, name: seatHolder.name, status: 'going', guests: 0 })
      .expect(200);

    fetched = await request(server).get(`/events/${event.id}`);
    const rows = fetched.body.rsvp;
    const seatHolderAfter = rows.find((r: any) => r.id === seatHolder.id);
    const waitlisterAfter = rows.find((r: any) => r.id === waitlister.id);
    // The waitlister keeps rank 2 and stays in; the returner is now last.
    expect(waitlisterAfter.lottery_rank).toBe(3);
    expect(seatHolderAfter.lottery_rank).toBeNull();
    expect(rows[rows.length - 1].id).toBe(seatHolder.id);
  });

  it('is guarded against re-running once drawn', async () => {
    const event = await createEvent({ selectionMode: 'lottery' });
    await request(server).post(`/events/${event.id}/rsvp`).send({ name: 'Alice', status: 'going' });

    await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(200);
    await request(server)
      .post(`/admin/events/${event.id}/draw`)
      .set('Authorization', AUTH)
      .expect(409);
  });
});
