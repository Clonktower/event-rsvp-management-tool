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

const TWO_OPTIONS = [
  { name: 'Option A', url: 'https://a.example.com' },
  { name: 'Option B', url: 'https://b.example.com' },
];

let eventId: string;
let rsvpId: string;
let rsvpToken: string;

beforeEach(async () => {
  db.prepare('DELETE FROM poll_votes').run();
  db.prepare('DELETE FROM poll_options').run();
  db.prepare('DELETE FROM polls').run();
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();

  const eventRes = await request(server)
    .post('/admin/create-event')
    .set('Authorization', AUTH)
    .send(BASE_EVENT);
  eventId = eventRes.body.event.id;

  const rsvpRes = await request(server)
    .post(`/events/${eventId}/rsvp`)
    .send({ name: 'Voter', status: 'going' });
  rsvpId = rsvpRes.body.rsvp.id;
  rsvpToken = rsvpRes.body.rsvp.token;
});

describe('POST /admin/events/:id/poll', () => {
  it('creates a poll with status open', async () => {
    const res = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS })
      .expect(201);
    expect(res.body.poll.status).toBe('open');
    expect(res.body.poll.options).toHaveLength(2);
    expect(res.body.poll.max_votes).toBeNull();
  });

  it('creates a poll with a max_votes limit', async () => {
    const res = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS, maxVotes: 1 })
      .expect(201);
    expect(res.body.poll.max_votes).toBe(1);
  });

  it('returns 400 when maxVotes is not a positive integer', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS, maxVotes: 0 })
      .expect(400);
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS, maxVotes: 1.5 })
      .expect(400);
  });

  it('returns 400 when title is missing', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ options: TWO_OPTIONS })
      .expect(400);
  });

  it('returns 400 when options array is empty', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: [] })
      .expect(400);
  });

  it('returns 400 when an option is missing url', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: [{ name: 'A' }] })
      .expect(400);
  });

  it('returns 400 when options is null (non-array)', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: null })
      .expect(400);
  });

  it('accepts a whitespace-only option name (BUG: no trim validation)', async () => {
    // BUG: the controller only checks `!opt.name`, so a whitespace-only option
    // name passes validation and is stored. It should reject empty-after-trim.
    const res = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: [{ name: '   ', url: 'https://example.com' }] })
      .expect(201);
    expect(res.body.poll.options[0].name).toBe('   ');
  });

  it('returns 401 without credentials', async () => {
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .send({ title: 'Where?', options: TWO_OPTIONS })
      .expect(401);
  });

  it('allows creating a second poll for the same event (BUG: duplicate polls)', async () => {
    // BUG: there is no UNIQUE(event_id) constraint and createPoll does not check
    // for an existing poll, so a second POST succeeds and creates a duplicate.
    // getPollByEventId then returns only one of them (the first), leaving the
    // second as an orphaned, unreachable row. This should be a 409 (or update).
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'First', options: TWO_OPTIONS })
      .expect(201);
    await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Second', options: TWO_OPTIONS })
      .expect(201);

    const polls = db.prepare('SELECT * FROM polls WHERE event_id = ?').all(eventId);
    expect(polls).toHaveLength(2);
    // Only the first poll is reachable through the API.
    const eventRes = await request(server).get(`/events/${eventId}`);
    expect(eventRes.body.poll.title).toBe('First');
  });
});

describe('PATCH /admin/polls/:id/close and /reopen', () => {
  it('closes an open poll', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    const res = await request(server)
      .patch(`/admin/polls/${pollId}/close`)
      .set('Authorization', AUTH)
      .expect(200);
    expect(res.body.poll.status).toBe('closed');
  });

  it('reopens a closed poll', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server).patch(`/admin/polls/${pollId}/close`).set('Authorization', AUTH);
    const res = await request(server)
      .patch(`/admin/polls/${pollId}/reopen`)
      .set('Authorization', AUTH)
      .expect(200);
    expect(res.body.poll.status).toBe('open');
  });

  it('returns 404 when closing an already-closed poll', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server).patch(`/admin/polls/${pollId}/close`).set('Authorization', AUTH);
    await request(server)
      .patch(`/admin/polls/${pollId}/close`)
      .set('Authorization', AUTH)
      .expect(404);
  });

  it('returns 404 when reopening an already-open poll', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server)
      .patch(`/admin/polls/${pollId}/reopen`)
      .set('Authorization', AUTH)
      .expect(404);
  });
});

describe('PATCH /admin/polls/:id', () => {
  it('updates the poll title and options', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Old', options: TWO_OPTIONS });
    const poll = created.body.poll;

    const updatedOptions = poll.options.map((o: any) => ({ id: o.id, name: o.name, url: o.url }));
    const res = await request(server)
      .patch(`/admin/polls/${poll.id}`)
      .set('Authorization', AUTH)
      .send({ title: 'New', options: updatedOptions })
      .expect(200);
    expect(res.body.poll.title).toBe('New');
  });

  it('returns 404 for a non-existent poll', async () => {
    await request(server)
      .patch('/admin/polls/ghost')
      .set('Authorization', AUTH)
      .send({ title: 'T', options: [{ name: 'x', url: 'x' }] })
      .expect(404);
  });

  it('returns 400 when title is missing', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;

    await request(server)
      .patch(`/admin/polls/${poll.id}`)
      .set('Authorization', AUTH)
      .send({ options: poll.options.map((o: any) => ({ id: o.id, name: o.name, url: o.url })) })
      .expect(400);
  });

  it('returns 400 when an option is missing url', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;

    await request(server)
      .patch(`/admin/polls/${poll.id}`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: [{ name: 'No URL' }] })
      .expect(400);
  });
});

describe('DELETE /admin/polls/:id', () => {
  it('deletes a poll and returns 200', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server).delete(`/admin/polls/${pollId}`).set('Authorization', AUTH).expect(200);

    const eventRes = await request(server).get(`/events/${eventId}`);
    expect(eventRes.body.poll).toBeNull();
  });

  it('returns 404 for a non-existent poll', async () => {
    await request(server).delete('/admin/polls/ghost').set('Authorization', AUTH).expect(404);
  });
});

describe('POST /polls/:id/vote', () => {
  it('records votes and returns the updated poll', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;
    const optionId = poll.options[0].id;

    const res = await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [optionId] })
      .expect(200);
    const votedOption = res.body.poll.options.find((o: any) => o.id === optionId);
    expect(votedOption.votes).toHaveLength(1);
    expect(votedOption.votes[0].voter_name).toBe('Voter');
  });

  it('returns 403 when the token is wrong', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server)
      .post(`/polls/${pollId}/vote`)
      .send({ rsvpId, token: 'wrongtoken', optionIds: [created.body.poll.options[0].id] })
      .expect(403);
  });

  it('returns 400 when voting for more options than max_votes allows', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS, maxVotes: 1 });
    const poll = created.body.poll;

    const res = await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: poll.options.map((o: any) => o.id) })
      .expect(400);
    expect(res.body.error).toMatch(/at most 1 option/);

    // No votes should have been recorded.
    const after = await request(server).get(`/events/${eventId}`);
    expect(after.body.poll.options.every((o: any) => o.votes.length === 0)).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const pollId = created.body.poll.id;

    await request(server).post(`/polls/${pollId}/vote`).send({ rsvpId }).expect(400);
  });

  it('returns 403 when the poll is closed', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;

    await request(server).patch(`/admin/polls/${poll.id}/close`).set('Authorization', AUTH);

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [poll.options[0].id] })
      .expect(403);
  });

  it('accepts empty optionIds and clears all previous votes', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [poll.options[0].id] });

    const res = await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [] })
      .expect(200);

    const option = res.body.poll.options.find((o: any) => o.id === poll.options[0].id);
    expect(option.votes).toHaveLength(0);
  });

  it('returns 403 for a non-existent poll', async () => {
    await request(server)
      .post('/polls/no-such-poll-id/vote')
      .send({ rsvpId, token: rsvpToken, optionIds: [] })
      .expect(403);
  });

  it('duplicate optionIds in payload cause a 500 (BUG: not deduplicated)', async () => {
    // BUG: castVotes inserts one poll_votes row per submitted optionId without
    // deduplicating, so a repeated optionId violates the (poll_option_id, rsvp_id)
    // primary key, the transaction throws, and it surfaces as an unhandled 500.
    // The service should dedupe optionIds (or INSERT OR IGNORE) before inserting.
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;
    const optId = poll.options[0].id;

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [optId, optId] })
      .expect(500);
  });

  it('allows an RSVP from a different event to vote (BUG: cross-event voting)', async () => {
    // BUG: castVotes only checks that the rsvpId+token pair is valid and that the
    // option belongs to the poll — it never checks the RSVP belongs to the poll's
    // event. So a token from event B can vote in event A's poll. It should reject
    // when rsvp.event_id !== poll.event_id (returns null -> 403).
    const otherEventRes = await request(server)
      .post('/admin/create-event')
      .set('Authorization', AUTH)
      .send(BASE_EVENT);
    const otherEventId = otherEventRes.body.event.id;

    const otherRsvpRes = await request(server)
      .post(`/events/${otherEventId}/rsvp`)
      .send({ name: 'Eve', status: 'going' });
    const otherRsvpId = otherRsvpRes.body.rsvp.id;
    const otherToken = otherRsvpRes.body.rsvp.token;

    const pollRes = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = pollRes.body.poll;

    const res = await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId: otherRsvpId, token: otherToken, optionIds: [poll.options[0].id] })
      .expect(200);
    const voted = res.body.poll.options.find((o: any) => o.id === poll.options[0].id);
    expect(voted.votes).toHaveLength(1);
  });

  it('returns 403 when voting after the RSVP has been deleted', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;

    await request(server)
      .delete(`/admin/events/rsvp/${rsvpId}`)
      .set('Authorization', AUTH);

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [poll.options[0].id] })
      .expect(403);
  });

  it('two simultaneous votes from the same rsvpId do not double-count', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;
    const optId = poll.options[0].id;

    const [r1, r2] = await Promise.all([
      request(server).post(`/polls/${poll.id}/vote`).send({ rsvpId, token: rsvpToken, optionIds: [optId] }),
      request(server).post(`/polls/${poll.id}/vote`).send({ rsvpId, token: rsvpToken, optionIds: [optId] }),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const eventRes = await request(server).get(`/events/${eventId}`);
    const option = eventRes.body.poll.options.find((o: any) => o.id === optId);
    expect(option.votes).toHaveLength(1);
  });
});

describe('PATCH /admin/polls/:id — option cascade', () => {
  it('removing an option from the update payload deletes its votes', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;
    const removedOptId = poll.options[0].id;
    const keptOptId = poll.options[1].id;

    await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [removedOptId] });

    const keptOption = poll.options.find((o: any) => o.id === keptOptId);
    await request(server)
      .patch(`/admin/polls/${poll.id}`)
      .set('Authorization', AUTH)
      .send({ title: 'Updated', options: [{ id: keptOptId, name: keptOption.name, url: keptOption.url }] })
      .expect(200);

    const votes = db.prepare('SELECT * FROM poll_votes WHERE poll_option_id = ?').all(removedOptId);
    expect(votes).toHaveLength(0);
  });

  it('adding a new option lets users vote for it', async () => {
    const created = await request(server)
      .post(`/admin/events/${eventId}/poll`)
      .set('Authorization', AUTH)
      .send({ title: 'Where?', options: TWO_OPTIONS });
    const poll = created.body.poll;
    const existingOptions = poll.options.map((o: any) => ({ id: o.id, name: o.name, url: o.url }));

    const updated = await request(server)
      .patch(`/admin/polls/${poll.id}`)
      .set('Authorization', AUTH)
      .send({
        title: 'Where?',
        options: [...existingOptions, { name: 'Option C', url: 'https://c.example.com' }],
      })
      .expect(200);
    expect(updated.body.poll.options).toHaveLength(3);

    const newOptId = updated.body.poll.options.find((o: any) => o.name === 'Option C').id;
    const voteRes = await request(server)
      .post(`/polls/${poll.id}/vote`)
      .send({ rsvpId, token: rsvpToken, optionIds: [newOptId] })
      .expect(200);
    const newOpt = voteRes.body.poll.options.find((o: any) => o.id === newOptId);
    expect(newOpt.votes).toHaveLength(1);
  });
});
