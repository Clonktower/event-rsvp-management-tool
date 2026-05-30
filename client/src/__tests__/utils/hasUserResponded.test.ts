import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasUserResponded } from '../../utils/hasUserResponded';
import type { Rsvp } from '../../types/Rsvp';

function rsvp(id: string, status: Rsvp['status'] = 'going'): Rsvp {
  return { id, name: id, event_id: 'e1', status, guests: 0, token: 'tok' };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('hasUserResponded', () => {
  it('returns hasResponded: false when no localStorage entry exists for the event', () => {
    const result = hasUserResponded('e1', [rsvp('r1')]);
    expect(result.hasResponded).toBe(false);
    expect(result.status).toBeUndefined();
  });

  it('returns hasResponded: false when the user id is not in the attendees list', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { 'other-id': 'tok' } }));
    const result = hasUserResponded('e1', [rsvp('r1')]);
    expect(result.hasResponded).toBe(false);
  });

  it('returns hasResponded: true and the status when the user is in the attendees list', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok' } }));
    const result = hasUserResponded('e1', [rsvp('r1', 'going')]);
    expect(result.hasResponded).toBe(true);
    expect(result.status).toBe('going');
  });

  it('reflects the correct status for different RSVP values', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok' } }));
    expect(hasUserResponded('e1', [rsvp('r1', 'maybe')]).status).toBe('maybe');
    expect(hasUserResponded('e1', [rsvp('r1', 'not_going')]).status).toBe('not_going');
  });

  it('throws when my_events contains invalid JSON (BUG: via getUser JSON.parse)', () => {
    // BUG: hasUserResponded calls getUser, which does an unguarded JSON.parse of
    // "my_events", so a corrupt value propagates as a throw instead of being
    // treated as "no response yet".
    localStorage.setItem('my_events', 'INVALID');
    expect(() => hasUserResponded('e1', [rsvp('r1')])).toThrow();
  });
});
