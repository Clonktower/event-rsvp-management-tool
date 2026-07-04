import { beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  castVotes,
  closePoll,
  createPoll,
  deletePoll,
  getPollByEventId,
  reopenPoll,
  updatePoll,
} from '../../../services/poll';
import { createEvent } from '../../../services/event';
import { rsvpToEventService } from '../../../services/rsvp';
import db from '../../../db';

const BASE_EVENT = {
  name: 'Event',
  date: '2025-12-25',
  startTime: '18:00',
  endTime: '22:00',
  location: 'Venue',
};

const TWO_OPTIONS = [
  { name: 'Option A', url: 'https://a.example.com' },
  { name: 'Option B', url: 'https://b.example.com' },
];

// NOTE on ordering: createPoll inserts all options inside one transaction with a
// single `now` timestamp, so they share an identical created_at. buildPoll orders
// options by `created_at ASC`, and SQLite does NOT guarantee a stable order for
// tied sort keys — it just happens to return them in insertion (rowid) order here.
// Tests that index options positionally (options[0] === 'Option A', etc.) rely on
// that. If this ever flakes, give poll_options a deterministic tiebreaker
// (e.g. a sort_order column, or ORDER BY created_at, rowid).

let eventId: string;
let rsvpId: string;
let rsvpToken: string;

beforeEach(() => {
  db.prepare('DELETE FROM poll_votes').run();
  db.prepare('DELETE FROM poll_options').run();
  db.prepare('DELETE FROM polls').run();
  db.prepare('DELETE FROM rsvp').run();
  db.prepare('DELETE FROM events').run();

  eventId = createEvent(BASE_EVENT).id;
  const rsvp = rsvpToEventService({ id: uuidv4(), eventId, name: 'Voter', status: 'going' }) as any;
  rsvpId = rsvp.id;
  rsvpToken = rsvp.token;
});

describe('getPollByEventId', () => {
  it('returns null when no poll exists for the event', () => {
    expect(getPollByEventId(eventId)).toBeNull();
  });

  it('returns the poll with empty votes on its options', () => {
    createPoll(eventId, 'Where?', TWO_OPTIONS);
    const poll = getPollByEventId(eventId)!;
    expect(poll.title).toBe('Where?');
    expect(poll.options).toHaveLength(2);
    expect(poll.options[0].votes).toEqual([]);
  });
});

describe('createPoll', () => {
  it('creates a poll with status open and the given options', () => {
    const poll = createPoll(eventId, 'When?', TWO_OPTIONS);
    expect(poll.status).toBe('open');
    expect(poll.event_id).toBe(eventId);
    expect(poll.options).toHaveLength(2);
  });

  it('stores an optional description on options', () => {
    const poll = createPoll(eventId, 'Where?', [
      { name: 'A', url: 'https://a.example.com', description: 'Nice place' },
    ]);
    expect(poll.options[0].description).toBe('Nice place');
  });

  it('does NOT prevent a second poll for the same event (BUG: duplicate polls)', () => {
    // BUG: there is no UNIQUE(event_id) constraint and createPoll does not check
    // for an existing poll, so two polls can be created for one event. Worse,
    // getPollByEventId uses `.get()` and silently returns only one of them, so the
    // second poll becomes an orphaned, unreachable row. createPoll should reject a
    // duplicate (or update the existing poll) instead of creating a second.
    const first = createPoll(eventId, 'First', TWO_OPTIONS);
    const second = createPoll(eventId, 'Second', TWO_OPTIONS);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    const polls = db.prepare('SELECT * FROM polls WHERE event_id = ?').all(eventId);
    expect(polls).toHaveLength(2);
    // Only the first poll is ever reachable via the public API.
    expect(getPollByEventId(eventId)!.title).toBe('First');
  });
});

describe('closePoll', () => {
  it('changes the poll status to closed', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(closePoll(poll.id)!.status).toBe('closed');
  });

  it('returns null when the poll is already closed', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    closePoll(poll.id);
    expect(closePoll(poll.id)).toBeNull();
  });

  it('sorts options by vote count descending when closing', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    // Give Option B one vote before closing
    castVotes(poll.id, rsvpId, rsvpToken, [poll.options[1].id]);
    const closed = closePoll(poll.id)!;
    expect(closed.options[0].id).toBe(poll.options[1].id);
  });
});

describe('reopenPoll', () => {
  it('changes the poll status back to open', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    closePoll(poll.id);
    expect(reopenPoll(poll.id)!.status).toBe('open');
  });

  it('returns null when the poll is already open', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(reopenPoll(poll.id)).toBeNull();
  });
});

describe('updatePoll', () => {
  it('updates the title', () => {
    const poll = createPoll(eventId, 'Old Title', TWO_OPTIONS);
    const updated = updatePoll(
      poll.id,
      'New Title',
      poll.options.map((o) => ({ id: o.id, name: o.name, url: o.url })),
    )!;
    expect(updated.title).toBe('New Title');
  });

  it('adds a new option', () => {
    const poll = createPoll(eventId, 'Where?', TWO_OPTIONS);
    const existing = poll.options.map((o) => ({ id: o.id, name: o.name, url: o.url }));
    const updated = updatePoll(poll.id, 'Where?', [
      ...existing,
      { name: 'Option C', url: 'https://c.example.com' },
    ])!;
    expect(updated.options).toHaveLength(3);
  });

  it('removes an option not included in the update', () => {
    const poll = createPoll(eventId, 'Where?', TWO_OPTIONS);
    const keepFirst = [{ id: poll.options[0].id, name: poll.options[0].name, url: poll.options[0].url }];
    const updated = updatePoll(poll.id, 'Where?', keepFirst)!;
    expect(updated.options).toHaveLength(1);
    expect(updated.options[0].id).toBe(poll.options[0].id);
  });

  it('returns null for an unknown poll id', () => {
    expect(updatePoll('ghost', 'Title', [{ name: 'x', url: 'x' }])).toBeNull();
  });
});

describe('deletePoll', () => {
  it('deletes the poll and returns true', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(deletePoll(poll.id)).toBe(true);
    expect(getPollByEventId(eventId)).toBeNull();
  });

  it('returns false for an unknown poll id', () => {
    expect(deletePoll('ghost')).toBe(false);
  });
});

describe('castVotes', () => {
  it('records a vote for a valid rsvp+token', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    const result = castVotes(poll.id, rsvpId, rsvpToken, [poll.options[0].id])!;
    expect(result.options[0].votes).toHaveLength(1);
    expect(result.options[0].votes[0].voter_name).toBe('Voter');
  });

  it('allows voting for multiple options', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    const result = castVotes(poll.id, rsvpId, rsvpToken, [poll.options[0].id, poll.options[1].id])!;
    expect(result.options[0].votes).toHaveLength(1);
    expect(result.options[1].votes).toHaveLength(1);
  });

  it('replaces previous votes when re-voting', () => {
    // Relies on stable option ordering (see the ordering NOTE near TWO_OPTIONS):
    // options[0] is 'Option A', options[1] is 'Option B'.
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    castVotes(poll.id, rsvpId, rsvpToken, [poll.options[0].id]);
    castVotes(poll.id, rsvpId, rsvpToken, [poll.options[1].id]);
    const final = getPollByEventId(eventId)!;
    expect(final.options[0].votes).toHaveLength(0);
    expect(final.options[1].votes).toHaveLength(1);
  });

  it('returns null for a wrong token', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(castVotes(poll.id, rsvpId, 'wrongtoken', [poll.options[0].id])).toBeNull();
  });

  it('returns null for a closed poll', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    closePoll(poll.id);
    expect(castVotes(poll.id, rsvpId, rsvpToken, [poll.options[0].id])).toBeNull();
  });

  it('returns null when an option id does not belong to the poll', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(castVotes(poll.id, rsvpId, rsvpToken, ['invalid-option-id'])).toBeNull();
  });

  it('rejects the whole submission when any option id is invalid (mixed valid + invalid)', () => {
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(
      castVotes(poll.id, rsvpId, rsvpToken, [poll.options[0].id, 'invalid-option-id']),
    ).toBeNull();
    // The valid option must not have been recorded either — it is all-or-nothing.
    expect(getPollByEventId(eventId)!.options[0].votes).toHaveLength(0);
  });

  it("rejects an option id that belongs to a different poll", () => {
    const otherEventId = createEvent(BASE_EVENT).id;
    const otherPoll = createPoll(otherEventId, 'Other', TWO_OPTIONS);
    const poll = createPoll(eventId, 'Vote', TWO_OPTIONS);
    expect(castVotes(poll.id, rsvpId, rsvpToken, [otherPoll.options[0].id])).toBeNull();
  });
});
