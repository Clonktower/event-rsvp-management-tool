import db from '../db';
import crypto from 'crypto';

// Priority weight stamped on RSVPs created by an admin. A positive weight seeds
// them ahead of regular entrants in a lottery draw. Kept as a number (not a
// boolean) so rotation/recency weighting can reuse the same column later.
export const ADMIN_PRIORITY_WEIGHT = 1;

export function rsvpToEventService({ id, eventId, name, status, guests = 0, priorityWeight = 0 }: { id: string, eventId: string, name: string, status: string, guests?: number, priorityWeight?: number }) {
  const now = new Date().toISOString();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO rsvp (id, event_id, name, status, guests, created_at, updated_at, token, priority_weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, eventId, name, status, guests, now, now, token, priorityWeight);
  return db.prepare('SELECT * FROM rsvp WHERE id = ? AND event_id = ?').get(id, eventId);
}

// Gets all RSVPs for an event. For a lottery event that has been drawn, RSVPs
// are ordered by their assigned lottery_rank (entries that signed up after the
// draw have a null rank and fall to the back in creation order). Otherwise
// (FIFO, or a lottery not yet drawn) they are ordered by creation time ascending.
export function getRsvpByEventId(eventId: string) {
  const event = db.prepare('SELECT selection_mode, drawn_at FROM events WHERE id = ?').get(eventId) as
    | { selection_mode?: string; drawn_at?: string | null }
    | undefined;
  const isDrawnLottery = event?.selection_mode === 'lottery' && !!event?.drawn_at;
  const orderBy = isDrawnLottery
    ? 'ORDER BY lottery_rank IS NULL, lottery_rank ASC, created_at ASC'
    : 'ORDER BY created_at ASC';
  return db
    .prepare(`SELECT id, name, status, guests, created_at, updated_at, priority_weight, lottery_rank FROM rsvp WHERE event_id = ? ${orderBy}`)
    .all(eventId);
}

// Runs the lottery draw for an event: assigns a lottery_rank to every 'going'
// RSVP. Entries are seeded by priority_weight (admins get a positive weight, so
// they sort first), with ties broken randomly. The same priority_weight column
// is intended to later carry rotation/recency weighting without a schema change.
// Idempotency is the caller's responsibility (the controller guards re-draws).
export function runDrawForEvent(eventId: string) {
  const draw = db.transaction((eventId: string) => {
    const going = db
      .prepare("SELECT id, priority_weight FROM rsvp WHERE event_id = ? AND status = 'going'")
      .all(eventId) as { id: string; priority_weight: number }[];

    // Use a CSPRNG for the tiebreak: this is a fairness-sensitive draw, so the
    // ordering must not be predictable/riggable by a participant. crypto.randomInt
    // caps its range at 2^48, which is ample entropy to break ties without
    // realistic collisions for any plausible attendee count.
    const RANDOM_KEY_BOUND = 2 ** 48 - 1;
    const ordered = going
      .map((r) => ({ id: r.id, weight: r.priority_weight ?? 0, key: crypto.randomInt(0, RANDOM_KEY_BOUND) }))
      .sort((a, b) => b.weight - a.weight || a.key - b.key);

    const setRank = db.prepare('UPDATE rsvp SET lottery_rank = ? WHERE id = ? AND event_id = ?');
    ordered.forEach((r, index) => setRank.run(index + 1, r.id, eventId));

    const drawnAt = new Date().toISOString();
    db.prepare('UPDATE events SET drawn_at = ? WHERE id = ?').run(drawnAt, eventId);
    return drawnAt;
  });
  return draw(eventId);
}

// Deletes an RSVP by id
export function deleteRsvpById(id: string) {
  return db.prepare('DELETE FROM rsvp WHERE id = ?').run(id);
}

export function updateRsvpByToken({ eventId, rsvpId, token, name, status, guests }: {
  eventId: string,
  rsvpId: string,
  token: string,
  name: string,
  status: string,
  guests: number
}) {
  // Changing away from 'going' after a lottery draw forfeits the drawn seat: the
  // rank is cleared, so rejoining later puts the entrant at the back rather than
  // reclaiming a spot that may have already been promoted to a waitlister. An
  // edit that stays 'going' (e.g. changing the guest count) keeps the rank, so it
  // never demotes someone who still holds their place. No-op for un-drawn/FIFO
  // events, where lottery_rank is already null.
  const sql = `UPDATE rsvp SET name = ?, status = ?, guests = ?, updated_at = ?, lottery_rank = CASE WHEN ? = 'going' THEN lottery_rank ELSE NULL END WHERE id = ? AND event_id = ? AND token = ?`;
  const now = new Date().toISOString();
  const result = db.prepare(sql).run(name, status, guests, now, status, rsvpId, eventId, token);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM rsvp WHERE id = ? AND event_id = ?').get(rsvpId, eventId);
}

export async function getMyRsvpsService(pairs: { rsvpId: string, eventId: string }[]) {
  if (!Array.isArray(pairs) || pairs.length === 0) return [];

  const wherePairs = pairs.map(() => '(?, ?)').join(', ');
  const flatParams = pairs.flatMap(({ rsvpId, eventId }) => [rsvpId, eventId]);
  const sql = `
    SELECT e.*, r.status as your_status, r.name as rsvp_name
    FROM rsvp r
    JOIN events e ON r.event_id = e.id
    WHERE (r.id, r.event_id) IN (${wherePairs})
  `;
  const rows = db.prepare(sql).all(...flatParams);
  return rows.map(row => {
    const { your_status, rsvp_name, ...event } = row as any;
    return { event, yourStatus: your_status, attendeeName: rsvp_name };
  });
}
