import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getUser } from '../../utils/getUser';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('getUser', () => {
  it('returns undefined when localStorage is empty', () => {
    expect(getUser('e1')).toBeUndefined();
  });

  it('returns undefined when the event has no users', () => {
    localStorage.setItem('my_events', JSON.stringify({ e2: { r1: 'tok1' } }));
    expect(getUser('e1')).toBeUndefined();
  });

  it('returns the first user for the event', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1' } }));
    expect(getUser('e1')).toEqual({ id: 'r1', token: 'tok1' });
  });

  it('returns only the first user even when multiple are stored', () => {
    localStorage.setItem('my_events', JSON.stringify({ e1: { r1: 'tok1', r2: 'tok2' } }));
    const user = getUser('e1')!;
    expect(user.id).toBe('r1');
    expect(user.token).toBe('tok1');
  });

  it('throws when my_events contains invalid JSON (BUG: unguarded JSON.parse)', () => {
    // BUG: getUser does JSON.parse(localStorage.getItem(...) ?? "{}") with no
    // try/catch, so a corrupt value throws instead of being treated as empty.
    localStorage.setItem('my_events', 'INVALID');
    expect(() => getUser('e1')).toThrow();
  });
});
