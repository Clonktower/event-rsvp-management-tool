import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllUsersForEvent } from '../../utils/getAllUsersForEvent';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('getAllUsersForEvent', () => {
  it('returns an empty array when localStorage is empty', () => {
    expect(getAllUsersForEvent('e1')).toEqual([]);
  });

  it('returns an empty array when the event has no users', () => {
    localStorage.setItem('my_events', JSON.stringify({ e2: { r1: 'tok1' } }));
    expect(getAllUsersForEvent('e1')).toEqual([]);
  });

  it('returns all users stored for the given event', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1', r2: 'tok2' } }));
    const users = getAllUsersForEvent('e1')!;
    expect(users).toHaveLength(2);
    expect(users).toContainEqual({ id: 'r1', token: 'tok1' });
    expect(users).toContainEqual({ id: 'r2', token: 'tok2' });
  });

  it('returns only users for the requested event, not others', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1' }, e2: { r2: 'tok2' } }));
    const users = getAllUsersForEvent('e1')!;
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('r1');
  });

  it('throws when my_events contains invalid JSON (BUG: unguarded JSON.parse)', () => {
    // BUG: getAllUsersForEvent does JSON.parse(localStorage.getItem(...) ?? "{}")
    // with no try/catch, so a corrupt value throws instead of being treated as empty.
    localStorage.setItem('my_events', 'INVALID');
    expect(() => getAllUsersForEvent('e1')).toThrow();
  });
});
