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
  db.prepare('DELETE FROM poll_votes').run();
  db.prepare('DELETE FROM poll_options').run();
  db.prepare('DELETE FROM polls').run();
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();

  const res = await request(server)
    .post('/admin/create-event')
    .set('Authorization', AUTH)
    .send(BASE_EVENT);
  eventId = res.body.event.id;
});

describe('SQL injection safety', () => {
  it('stores SQL injection payload in event name verbatim without dropping tables', async () => {
    const payload = "'); DROP TABLE events; --";
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_EVENT, name: payload })
      .expect(201);
    expect(res.body.event.name).toBe(payload);

    const events = await request(server).get('/admin/events').set('Authorization', AUTH);
    expect(events.body.events.length).toBeGreaterThanOrEqual(1);
  });

  it('stores single quotes in RSVP name without corruption', async () => {
    const name = "O'Brien";
    const res = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name, status: 'going' })
      .expect(201);
    expect(res.body.rsvp.name).toBe(name);
  });

  it('stores a poll option URL with query parameters without corruption', async () => {
    const url = 'https://example.com/venue?city=Berlin&cap=50&name=O%27Reilly';
    const res = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: [{ name: 'Venue', url }] })
      .expect(201);
    expect(res.body.poll.options[0].url).toBe(url);
  });
});

describe('IDOR — token/identity isolation', () => {
  it("User A's rsvpId + User B's token cannot vote in a poll", async () => {
    const rsvpA = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });
    const rsvpB = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Bob', status: 'going' });

    const pollRes = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Q', options: [{ name: 'A', url: 'https://a.example.com' }] });
    const poll = pollRes.body.poll;

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({
        rsvpId: rsvpA.body.rsvp.id,
        token: rsvpB.body.rsvp.token,
        optionIds: [poll.options[0].id],
      })
      .expect(403);
  });

  it("BUG: User A's event-1 rsvpId + token CAN vote in event 2's poll (cross-event)", async () => {
    // BUG: a valid RSVP from event 1 can vote in event 2's poll because castVotes
    // never verifies the RSVP belongs to the poll's event. This should be a 403.
    const event2Res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_EVENT);
    const event2Id = event2Res.body.event.id;

    const rsvpEvent1 = await request(server)
      .post(`/events/${eventId}/rsvp`)
      .send({ name: 'Alice', status: 'going' });

    const pollRes = await request(server)
      .post(`/admin/events/${event2Id}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Q', options: [{ name: 'A', url: 'https://a.example.com' }] });
    const poll = pollRes.body.poll;

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({
        rsvpId: rsvpEvent1.body.rsvp.id,
        token: rsvpEvent1.body.rsvp.token,
        optionIds: [poll.options[0].id],
      })
      .expect(200);
  });
});

describe('Resource exhaustion boundaries', () => {
  it('a body over the Express limit returns 500, not 413 (BUG: payload error not handled)', async () => {
    // express.json() rejects bodies over its default ~100kb limit by throwing a
    // PayloadTooLargeError (status 413). BUG: the errorHandler ignores err.status
    // and always responds 500, so the client gets an opaque 500 instead of 413.
    // The handler should map entity.too.large to 413 (and ideally set an explicit
    // body limit).
    const bigString = 'x'.repeat(1_100_000);
    await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .set('Content-Type', 'application/json')
      .send(`{"name":"${bigString}","date":"2025-12-25","startTime":"18:00","endTime":"22:00","location":"Venue"}`)
      .expect(500);
  });
});
