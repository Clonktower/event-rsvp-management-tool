import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Poll, PollOption } from '../types/Poll';

type RawPoll = { id: string; event_id: string; title: string; status: string; created_at: string };
type RawOption = { id: string; poll_id: string; name: string; url: string; description: string | null; created_at: string };
type RawVote = { rsvp_id: string; voter_name: string };

function buildPoll(raw: RawPoll): Poll {
  const options = db.prepare(
    'SELECT * FROM poll_options WHERE poll_id = ? ORDER BY created_at ASC'
  ).all(raw.id) as RawOption[];

  const optionsWithVotes: PollOption[] = options.map(opt => {
    const votes = db.prepare(`
      SELECT pv.rsvp_id, r.name as voter_name
      FROM poll_votes pv
      JOIN rsvp r ON pv.rsvp_id = r.id
      WHERE pv.poll_option_id = ?
    `).all(opt.id) as RawVote[];
    return { ...opt, description: opt.description ?? undefined, votes };
  });

  if (raw.status === 'closed') {
    optionsWithVotes.sort((a, b) => b.votes.length - a.votes.length);
  }

  return { ...raw, status: raw.status as 'open' | 'closed', options: optionsWithVotes };
}

export function getPollByEventId(eventId: string): Poll | null {
  const raw = db.prepare('SELECT * FROM polls WHERE event_id = ?').get(eventId) as RawPoll | undefined;
  if (!raw) return null;
  return buildPoll(raw);
}

export function createPoll(
  eventId: string,
  title: string,
  options: { name: string; url: string; description?: string }[]
): Poll {
  const pollId = uuidv4();
  const now = new Date().toISOString();

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO polls (id, event_id, title, status, created_at) VALUES (?, ?, ?, 'open', ?)`
    ).run(pollId, eventId, title, now);

    for (const opt of options) {
      db.prepare(
        `INSERT INTO poll_options (id, poll_id, name, url, description, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), pollId, opt.name, opt.url, opt.description || null, now);
    }
  });

  run();
  return buildPoll(db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as RawPoll);
}

export function closePoll(pollId: string): Poll | null {
  const result = db.prepare(`UPDATE polls SET status = 'closed' WHERE id = ? AND status = 'open'`).run(pollId);
  if (result.changes === 0) return null;
  return buildPoll(db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as RawPoll);
}

export function reopenPoll(pollId: string): Poll | null {
  const result = db.prepare(`UPDATE polls SET status = 'open' WHERE id = ? AND status = 'closed'`).run(pollId);
  if (result.changes === 0) return null;
  return buildPoll(db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as RawPoll);
}

export function updatePoll(
  pollId: string,
  title: string,
  options: { id?: string; name: string; url: string; description?: string }[]
): Poll | null {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as RawPoll | undefined;
  if (!poll) return null;

  const now = new Date().toISOString();

  const run = db.transaction(() => {
    db.prepare('UPDATE polls SET title = ? WHERE id = ?').run(title, pollId);

    const currentOptions = db.prepare('SELECT id FROM poll_options WHERE poll_id = ?').all(pollId) as { id: string }[];
    const currentIds = new Set(currentOptions.map(o => o.id));
    const submittedIds = new Set(options.filter(o => o.id).map(o => o.id as string));

    // Delete options removed from the list (cascades their votes)
    for (const id of currentIds) {
      if (!submittedIds.has(id)) {
        db.prepare('DELETE FROM poll_options WHERE id = ?').run(id);
      }
    }

    for (const opt of options) {
      if (opt.id && currentIds.has(opt.id)) {
        db.prepare('UPDATE poll_options SET name = ?, url = ?, description = ? WHERE id = ?')
          .run(opt.name, opt.url, opt.description || null, opt.id);
      } else if (!opt.id) {
        db.prepare('INSERT INTO poll_options (id, poll_id, name, url, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), pollId, opt.name, opt.url, opt.description || null, now);
      }
    }
  });

  run();
  return buildPoll(db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as RawPoll);
}

export function deletePoll(pollId: string): boolean {
  return db.prepare('DELETE FROM polls WHERE id = ?').run(pollId).changes > 0;
}

export function castVotes(
  pollId: string,
  rsvpId: string,
  token: string,
  optionIds: string[]
): Poll | null {
  const rsvp = db.prepare('SELECT id FROM rsvp WHERE id = ? AND token = ?').get(rsvpId, token);
  if (!rsvp) return null;

  const poll = db.prepare(`SELECT * FROM polls WHERE id = ? AND status = 'open'`).get(pollId) as RawPoll | undefined;
  if (!poll) return null;

  const allOptions = db.prepare('SELECT id FROM poll_options WHERE poll_id = ?').all(pollId) as { id: string }[];
  const validIds = new Set(allOptions.map(o => o.id));
  if (!optionIds.every(id => validIds.has(id))) return null;

  const allOptionIds = allOptions.map(o => o.id);
  const now = new Date().toISOString();

  const run = db.transaction(() => {
    if (allOptionIds.length > 0) {
      const placeholders = allOptionIds.map(() => '?').join(',');
      db.prepare(
        `DELETE FROM poll_votes WHERE poll_option_id IN (${placeholders}) AND rsvp_id = ?`
      ).run(...allOptionIds, rsvpId);
    }
    for (const optId of optionIds) {
      db.prepare(
        'INSERT INTO poll_votes (poll_option_id, rsvp_id, created_at) VALUES (?, ?, ?)'
      ).run(optId, rsvpId, now);
    }
  });

  run();
  return buildPoll(poll);
}
