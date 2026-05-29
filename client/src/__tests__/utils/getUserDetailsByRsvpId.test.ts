import { describe, expect, it } from 'vitest';
import { getUserDetailsByRsvpId } from '../../utils/getUserDetailsByRsvpId';
import type { Rsvp } from '../../types/Rsvp';

function rsvp(id: string): Rsvp {
  return { id, name: id, event_id: 'e1', status: 'going', guests: 0, token: 'tok' };
}

describe('getUserDetailsByRsvpId', () => {
  it('returns the RSVP matching the given id', () => {
    const rsvps = [rsvp('r1'), rsvp('r2')];
    expect(getUserDetailsByRsvpId('r2', rsvps)).toEqual(rsvp('r2'));
  });

  it('returns undefined when the id does not match any RSVP', () => {
    expect(getUserDetailsByRsvpId('ghost', [rsvp('r1')])).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(getUserDetailsByRsvpId('r1', [])).toBeUndefined();
  });
});
