import { describe, expect, it } from 'vitest';
import { getTotalAttendance } from '../../utils/getTotalAttendance';
import type { Rsvp } from '../../types/Rsvp';

function rsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    id: 'r1',
    name: 'Alice',
    event_id: 'e1',
    status: 'going',
    guests: 0,
    token: 'tok',
    ...overrides,
  };
}

describe('getTotalAttendance', () => {
  it('counts zero when there are no attendees', () => {
    expect(getTotalAttendance([])).toBe(0);
  });

  it('counts the attendee themselves (1) when guests is 0', () => {
    expect(getTotalAttendance([rsvp()])).toBe(1);
  });

  it('adds guests to the attendee count', () => {
    expect(getTotalAttendance([rsvp({ guests: 3 })])).toBe(4);
  });

  it('ignores "not_going" RSVPs', () => {
    expect(getTotalAttendance([rsvp({ status: 'not_going' })])).toBe(0);
  });

  it('ignores "maybe" RSVPs', () => {
    expect(getTotalAttendance([rsvp({ status: 'maybe' })])).toBe(0);
  });

  it('sums multiple going attendees with guests', () => {
    const attendees = [
      rsvp({ id: 'r1', guests: 2 }),
      rsvp({ id: 'r2', status: 'not_going' }),
      rsvp({ id: 'r3', guests: 0 }),
    ];
    // r1 = 1+2, r2 = excluded, r3 = 1+0
    expect(getTotalAttendance(attendees)).toBe(4);
  });

  it('treats undefined guests as 0', () => {
    expect(getTotalAttendance([rsvp({ guests: undefined })])).toBe(1);
  });
});
