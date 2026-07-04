import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addNewRsvp } from '../../utils/addNewRsvp';
import type { Rsvp } from '../../types/Rsvp';

function rsvp(id: string, eventId: string, token: string): Rsvp {
  return { id, name: 'Alice', event_id: eventId, status: 'going', guests: 0, token };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('addNewRsvp', () => {
  it('creates a new my_events entry when localStorage is empty', () => {
    addNewRsvp(rsvp('r1', 'e1', 'tok1'));
    const stored = JSON.parse(localStorage.getItem('my_events')!);
    expect(stored).toEqual({ e1: { r1: 'tok1' } });
  });

  it('adds a new event entry when my_events already has other events', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1' } }));
    addNewRsvp(rsvp('r2', 'e2', 'tok2'));
    const stored = JSON.parse(localStorage.getItem('my_events')!);
    expect(stored).toEqual({ e1: { r1: 'tok1' }, e2: { r2: 'tok2' } });
  });

  it('merges into an existing event entry', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1' } }));
    addNewRsvp(rsvp('r2', 'e1', 'tok2'));
    const stored = JSON.parse(localStorage.getItem('my_events')!);
    expect(stored).toEqual({ e1: { r1: 'tok1', r2: 'tok2' } });
  });

  it('overwrites the token for the same rsvp id', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'old-tok' } }));
    addNewRsvp(rsvp('r1', 'e1', 'new-tok'));
    const stored = JSON.parse(localStorage.getItem('my_events')!);
    expect(stored.e1.r1).toBe('new-tok');
  });

  it('throws when my_events contains invalid JSON (BUG: unguarded JSON.parse)', () => {
    // BUG: addNewRsvp calls JSON.parse on the raw localStorage value with no
    // try/catch, so a corrupt "my_events" makes it throw (and the RSVP is lost)
    // instead of recovering by treating the store as empty.
    localStorage.setItem('my_events', 'INVALID');
    expect(() => addNewRsvp(rsvp('r1', 'e1', 'tok1'))).toThrow();
  });
});
