import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import server from './testServer';
import db from '../../db';

const AUTH = 'Basic testadmin:testpass';

const BASE_EVENT = {
  name: 'Test Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Venue',
};

let eventId: string;

beforeEach(async () => {
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();
  const res = await request(server)
    .post('/admin/create-event')
    .set('Authorization', AUTH)
    .send(BASE_EVENT);
  eventId = res.body.event.id;
});

describe('POST /events/:id/rsvp', () => {
  it('creates an RSVP and returns 201', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' })
      .expect(201);
    expect(res.body.rsvp.name).toBe('Alice');
    expect(res.body.rsvp.token).toBeTruthy();
  });

  it('accepts guest count', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going', guests: 2 })
      .expect(201);
    expect(res.body.rsvp.guests).toBe(2);
  });

  it('returns 400 when name is missing', async () => {
    await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ status: 'going' })
      .expect(400);
  });

  it('accepts a whitespace-only name (BUG: no trim validation)', async () => {
    // BUG: the controller only checks `!name`, so a whitespace-only name passes
    // and is stored verbatim. It should reject names that are empty after trim.
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: '   ', status: 'going' })
      .expect(201);
    expect(res.body.rsvp.name).toBe('   ');
  });

  it('accepts a negative guest count (BUG: no guest-count validation)', async () => {
    // BUG: the server never validates `guests`, so a negative count is stored
    // verbatim. It should reject non-integer or negative guest counts with a 400.
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going', guests: -1 })
      .expect(201);
    expect(res.body.rsvp.guests).toBe(-1);
  });

  it('returns 400 for an invalid status', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'yes' })
      .expect(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('returns 404 for a non-existent event', async () => {
    await request(server)
      .post('/events/no-such-event/rsvp')
      .send({ name: 'Alice', status: 'going' })
      .expect(404);
  });

  it('blocks registration when registrationOpensAt is in the future', async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const eventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, registrationOpensAt: future });
    const futureEventId = eventRes.body.event.id;

    await request(server)
      .post(`/events/${futureEventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' })
      .expect(403);
  });

  it('accepts a name consisting entirely of emoji', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: '🎉🎊🎈', status: 'going' })
      .expect(201);
    expect(res.body.rsvp.name).toBe('🎉🎊🎈');
  });

  it('stores an HTML/script payload in the name verbatim (no server-side sanitization)', async () => {
    const xssName = '<script>alert(1)</script>';
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: xssName, status: 'going' })
      .expect(201);
    expect(res.body.rsvp.name).toBe(xssName);
  });

  it('accepts guests > 0 with status: maybe (server stores raw value)', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'maybe', guests: 3 })
      .expect(201);
    expect(res.body.rsvp.guests).toBe(3);
    expect(res.body.rsvp.status).toBe('maybe');
  });

  it('accepts very large guest counts', async () => {
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going', guests: 9999 })
      .expect(201);
    expect(res.body.rsvp.guests).toBe(9999);
  });

  it('allows RSVPing to an event with a past date', async () => {
    const pastEventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, date: '2000-01-01' });
    const pastId = pastEventRes.body.event.id;
    await request(server)
      .post(`/events/${pastId}/rsvp`)
      .send({ name: 'Alice', status: 'going' })
      .expect(201);
  });

  it('allows RSVPing exactly when registrationOpensAt is within the 1-second grace window', async () => {
    const justOpened = new Date(Date.now() - 500).toISOString();
    const eventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, registrationOpensAt: justOpened });
    const id = eventRes.body.event.id;
    await request(server)
      .post(`/events/${id}/rsvp`)
      .send({ name: 'Alice', status: 'going' })
      .expect(201);
  });

  it('two simultaneous RSVPs to a capacity=1 event both succeed (no server-side capacity gate)', async () => {
    const capRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, maxAttendees: 1 });
    const capId = capRes.body.event.id;

    const [r1, r2] = await Promise.all([
      request(server).post(`/events/${capId}/rsvp`).send({ name: 'Alice', status: 'going' }),
      request(server).post(`/events/${capId}/rsvp`).send({ name: 'Bob', status: 'going' }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    const eventRes = await request(server).get(`/events/${capId}`);
    expect(eventRes.body.rsvp).toHaveLength(2);
  });

  it('allows admin to RSVP even when registration is not yet open', async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const eventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, registrationOpensAt: future });
    const futureEventId = eventRes.body.event.id;

    await request(server)
      .post(`/events/${futureEventId}/rsvp`)
      .set('Authorization', AUTH)
      .send({ name: 'Admin', status: 'going' })
      .expect(201);
  });
});

describe('PATCH /events/:id/rsvp/:rsvpId', () => {
  it('updates the RSVP when the correct token is provided', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId, token } = rsvpRes.body.rsvp;

    const res = await request(server)
      .patch(`/events/${eventId}/rsvp/${rsvpId}`)
      .send({ token, name: 'Alice B', status: 'maybe', guests: 1 })
      .expect(200);
    expect(res.body.rsvp.name).toBe('Alice B');
    expect(res.body.rsvp.status).toBe('maybe');
    expect(res.body.rsvp.guests).toBe(1);
  });

  it('returns 404 when the token is wrong', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId } = rsvpRes.body.rsvp;

    await request(server)
      .patch(`/events/${eventId}/rsvp/${rsvpId}`)
      .send({ token: 'wrongtoken', name: 'Alice', status: 'going', guests: 0 })
      .expect(404);
  });

  it('returns 404 when the event id in the URL does not match the RSVP event', async () => {
    const otherEventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_EVENT);
    const otherEventId = otherEventRes.body.event.id;

    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId, token } = rsvpRes.body.rsvp;

    await request(server)
      .patch(`/events/${otherEventId}/rsvp/${rsvpId}`)
      .send({ token, name: 'Alice', status: 'going', guests: 0 })
      .expect(404);
  });

  it('returns 400 when token is missing from request body', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId } = rsvpRes.body.rsvp;

    await request(server)
      .patch(`/events/${eventId}/rsvp/${rsvpId}`)
      .send({ name: 'Alice', status: 'going' })
      .expect(400);
  });

  it('returns 400 for an invalid status', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId, token } = rsvpRes.body.rsvp;

    await request(server)
      .patch(`/events/${eventId}/rsvp/${rsvpId}`)
      .send({ token, name: 'Alice', status: 'yes' })
      .expect(400);
  });

  it('returns 404 when using a stale/mismatched token', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const { id: rsvpId } = rsvpRes.body.rsvp;

    await request(server)
      .patch(`/events/${eventId}/rsvp/${rsvpId}`)
      .send({ token: 'stale-token-that-never-matched', name: 'Alice', status: 'going', guests: 0 })
      .expect(404);
  });
});

describe('DELETE /admin/events/rsvp/:id', () => {
  it('deletes an RSVP and returns 200', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const rsvpId = rsvpRes.body.rsvp.id;

    await request(server)
      .delete(`/admin/events/rsvp/${rsvpId}`)
      .set('Authorization', AUTH)
      .expect(200);

    const eventRes = await request(server).get(`/events/${eventId}`);
    expect(eventRes.body.rsvp).toHaveLength(0);
  });

  it('returns 404 for a non-existent RSVP', async () => {
    await request(server)
      .delete('/admin/events/rsvp/ghost')
      .set('Authorization', AUTH)
      .expect(404);
  });
});

describe('POST /rsvps/my', () => {
  it('returns events matching the supplied rsvpId/eventId pairs', async () => {
    const rsvpRes = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const rsvpId = rsvpRes.body.rsvp.id;

    const res = await request(server)
      .post('/rsvps/my')
      .send({ myRsvps: [{ rsvpId, eventId }] })
      .expect(200);
    expect(res.body.rsvps).toHaveLength(1);
    expect(res.body.rsvps[0].yourStatus).toBe('going');
    expect(res.body.rsvps[0].attendeeName).toBe('Alice');
  });

  it('returns 400 when myRsvps is not an array', async () => {
    await request(server).post('/rsvps/my').send({ myRsvps: 'bad' }).expect(400);
  });

  it('returns empty array when no pairs match', async () => {
    const res = await request(server)
      .post('/rsvps/my')
      .send({ myRsvps: [{ rsvpId: 'ghost', eventId: 'ghost' }] })
      .expect(200);
    expect(res.body.rsvps).toEqual([]);
  });
});
