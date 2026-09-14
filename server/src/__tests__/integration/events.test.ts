import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import server from './testServer';
import db from '../../db';

const AUTH = 'Basic testadmin:testpass';

const BASE_BODY = {
  name: 'Test Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Test Venue',
};

beforeEach(() => {
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();
});

describe('POST /admin/create-event', () => {
  it('creates an event and returns 201', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY)
      .expect(201);
    expect(res.body.event.name).toBe('Test Event');
    expect(res.body.event.id).toBeTruthy();
  });

  it('stores optional maxAttendees', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, maxAttendees: 50 })
      .expect(201);
    expect(res.body.event.max_attendees).toBe(50);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ name: 'Missing Date' })
      .expect(400);
    expect(res.body.error).toBeTruthy();
  });

  it('accepts a whitespace-only name (BUG: no trim validation)', async () => {
    // BUG: the controller only checks `!name`, so a whitespace-only name passes
    // and is stored verbatim. It should reject names that are empty after trim.
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, name: '   ' })
      .expect(201);
    expect(res.body.event.name).toBe('   ');
  });

  it('returns 400 when endTime is not after startTime', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, startTime: '20:00', endTime: '18:00' })
      .expect(400);
    expect(res.body.error).toMatch(/endTime/);
  });

  it('returns 400 when endTime equals startTime', async () => {
    await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, startTime: '18:00', endTime: '18:00' })
      .expect(400);
  });

  it('allows creating an event with a date in the past', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, date: '2000-01-01' })
      .expect(201);
    expect(res.body.event.date).toBe('2000-01-01');
  });

  it('accepts maxAttendees: 0 (treated as unlimited by the client)', async () => {
    const res = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, maxAttendees: 0 })
      .expect(201);
    expect(res.body.event.max_attendees).toBe(0);
  });

  it('returns 401 without credentials', async () => {
    await request(server).post('/admin/create-event').send(BASE_BODY).expect(401);
  });
});

describe('GET /admin/events', () => {
  it('returns the events list', async () => {
    await request(server).post('/admin/create-event').set('Authorization', AUTH).send(BASE_BODY);
    const res = await request(server).get('/admin/events').set('Authorization', AUTH).expect(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].name).toBe('Test Event');
  });

  it('returns an empty array when no events exist', async () => {
    const res = await request(server).get('/admin/events').set('Authorization', AUTH).expect(200);
    expect(res.body.events).toEqual([]);
  });
});

describe('GET /events/:id', () => {
  it('returns the event with rsvp and poll fields', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    const res = await request(server).get(`/events/${id}`).expect(200);
    expect(res.body.event.id).toBe(id);
    expect(res.body.rsvp).toEqual([]);
    expect(res.body.poll).toBeNull();
    expect(res.body.serverTime).toBeTypeOf('number');
  });

  it('returns 404 for a non-existent event', async () => {
    await request(server).get('/events/no-such-id').expect(404);
  });
});

describe('GET /events/:id — serverTime', () => {
  it('serverTime is a number close to Date.now()', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;
    const before = Date.now();
    const res = await request(server).get(`/events/${id}`).expect(200);
    const after = Date.now();
    expect(res.body.serverTime).toBeGreaterThanOrEqual(before);
    expect(res.body.serverTime).toBeLessThanOrEqual(after + 50);
  });
});

describe('DELETE /admin/events/:id — cascade', () => {
  it('cascades and removes associated RSVPs on event delete', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    await request(server).post(`/events/${id}/rsvp`).send({ name: 'Alice', status: 'going' });
    await request(server).delete(`/admin/events/${id}`).set('Authorization', AUTH).expect(200);

    const rows = db.prepare('SELECT * FROM rsvp WHERE event_id = ?').all(id);
    expect(rows).toHaveLength(0);
  });

  it('cascades and removes associated poll and votes on event delete', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    const rsvpRes = await request(server).post(`/events/${id}/rsvp`).send({ name: 'Alice', status: 'going' });
    const { id: rsvpId, token } = rsvpRes.body.rsvp;

    const pollRes = await request(server)
      .post(`/admin/events/${id}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Q', options: [{ name: 'A', url: 'https://a.example.com' }] });
    const pollId = pollRes.body.poll.id;
    const optId = pollRes.body.poll.options[0].id;

    await request(server).post(`/polls/${pollId}/vote`).send({ rsvpId, token, optionIds: [optId] });

    await request(server).delete(`/admin/events/${id}`).set('Authorization', AUTH).expect(200);

    const polls = db.prepare('SELECT * FROM polls WHERE event_id = ?').all(id);
    const votes = db.prepare('SELECT * FROM poll_votes WHERE poll_option_id = ?').all(optId);
    expect(polls).toHaveLength(0);
    expect(votes).toHaveLength(0);
  });
});

describe('PATCH /admin/events/:id — capacity edge cases', () => {
  it('shrinking maxAttendees below current going count is accepted by the server', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send({ ...BASE_BODY, maxAttendees: 5 });
    const id = created.body.event.id;

    for (let i = 0; i < 3; i++) {
      await request(server).post(`/events/${id}/rsvp`).send({ name: `User${i}`, status: 'going' });
    }

    const res = await request(server)
      .patch(`/admin/events/${id}`)
      .set('Authorization', AUTH)
      .send({ maxAttendees: 1 })
      .expect(200);
    expect(res.body.event.max_attendees).toBe(1);
  });
});

describe('PATCH /admin/events/:id', () => {
  it('updates an event and returns the updated data', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    const res = await request(server)
      .patch(`/admin/events/${id}`)
      .set('Authorization', AUTH)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(res.body.event.name).toBe('Updated Name');
    expect(res.body.event.location).toBe('Test Venue');
  });

  it('returns 404 for a non-existent event', async () => {
    await request(server)
      .patch('/admin/events/ghost')
      .set('Authorization', AUTH)
      .send({ name: 'X' })
      .expect(404);
  });

  it('returns 400 when endTime is not after startTime', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    await request(server)
      .patch(`/admin/events/${id}`)
      .set('Authorization', AUTH)
      .send({ startTime: '20:00', endTime: '10:00' })
      .expect(400);
  });
});

describe('DELETE /admin/events/:id', () => {
  it('deletes an event and returns 200', async () => {
    const created = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_BODY);
    const id = created.body.event.id;

    await request(server).delete(`/admin/events/${id}`).set('Authorization', AUTH).expect(200);
    await request(server).get(`/events/${id}`).expect(404);
  });

  it('returns 404 for a non-existent event', async () => {
    await request(server).delete('/admin/events/ghost').set('Authorization', AUTH).expect(404);
  });
});
