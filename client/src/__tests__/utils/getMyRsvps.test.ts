import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getMyRsvps } from '../../utils/getMyRsvps';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('getMyRsvps', () => {
  it('returns an empty array when localStorage is empty', () => {
    expect(getMyRsvps()).toEqual([]);
  });

  it('returns flat {eventId, rsvpId} pairs for all stored RSVPs', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1', r2: 'tok2' } }));
    const result = getMyRsvps();
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ eventId: 'e1', rsvpId: 'r1' });
    expect(result).toContainEqual({ eventId: 'e1', rsvpId: 'r2' });
  });

  it('flattens RSVPs across multiple events', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1' }, e2: { r2: 'tok2' } }));
    const result = getMyRsvps();
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ eventId: 'e1', rsvpId: 'r1' });
    expect(result).toContainEqual({ eventId: 'e2', rsvpId: 'r2' });
  });

  it('skips corrupted entries where the value is not an object', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: 'bad', e2: { r1: 'tok1' } }));
    const result = getMyRsvps();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ eventId: 'e2', rsvpId: 'r1' });
  });

  it('skips entries where the value is an array', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: ['tok1'], e2: { r1: 'tok1' } }));
    const result = getMyRsvps();
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe('e2');
  });

  it('throws when my_events contains invalid JSON (BUG: unguarded JSON.parse)', () => {
    // BUG: getMyRsvps does JSON.parse(localStorage.getItem(...) ?? "{}") with no
    // try/catch, so a corrupt value throws instead of being treated as empty.
    localStorage.setItem('my_events', 'INVALID');
    expect(() => getMyRsvps()).toThrow();
  });

  it('returns an empty array when my_events is a top-level primitive ("hello")', () => {
    localStorage.setItem('my_events', JSON.stringify('hello'));
    expect(getMyRsvps()).toEqual([]);
  });

  it('returns an empty array when my_events is a top-level number', () => {
    localStorage.setItem('my_events', JSON.stringify(42));
    expect(getMyRsvps()).toEqual([]);
  });
});
