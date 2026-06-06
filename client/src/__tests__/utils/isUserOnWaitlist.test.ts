import { describe, expect, it } from 'vitest';
import { isUserOnWaitlist } from '../../utils/isUserOnWaitlist';
import type { Rsvp } from '../../types/Rsvp';

function going(id: string): Rsvp {
  return { id, name: id, event_id: 'e1', status: 'going', guests: 0, token: 'tok' };
}

describe('isUserOnWaitlist', () => {
  it('returns false when userId is empty', () => {
    expect(isUserOnWaitlist([going('u1')], '', 1)).toBe(false);
  });

  it('returns false when maxAttendees is not set', () => {
    expect(isUserOnWaitlist([going('u1')], 'u1', undefined)).toBe(false);
  });

  it('returns false when user is within the capacity limit', () => {
    const attendees = [going('u1'), going('u2')];
    expect(isUserOnWaitlist(attendees, 'u1', 3)).toBe(false);
    expect(isUserOnWaitlist(attendees, 'u2', 3)).toBe(false);
  });

  it('returns false for the last person within capacity (index === maxAttendees - 1)', () => {
    const attendees = [going('u1'), going('u2')];
    expect(isUserOnWaitlist(attendees, 'u2', 2)).toBe(false);
  });

  it('returns true when user is at or beyond the capacity limit (waitlisted)', () => {
    const attendees = [going('u1'), going('u2'), going('u3')];
    expect(isUserOnWaitlist(attendees, 'u3', 2)).toBe(true);
  });

  it('returns false for a not_going user even if list is over capacity', () => {
    const attendees: Rsvp[] = [
      going('u1'),
      going('u2'),
      { id: 'u3', name: 'u3', event_id: 'e1', status: 'not_going', guests: 0, token: 'tok' },
    ];
    // u3 is not_going so is not in the goingAttendees list
    expect(isUserOnWaitlist(attendees, 'u3', 2)).toBe(false);
  });

  it('returns false when user id is not found at all', () => {
    const attendees = [going('u1'), going('u2')];
    expect(isUserOnWaitlist(attendees, 'ghost', 1)).toBe(false);
  });

  it('returns false when maxAttendees is 0 (treated as unlimited)', () => {
    expect(isUserOnWaitlist([going('u1')], 'u1', 0)).toBe(false);
  });

  it('returns false when maxAttendees is null (treated the same as undefined)', () => {
    expect(isUserOnWaitlist([going('u1')], 'u1', null as any)).toBe(false);
  });
});
