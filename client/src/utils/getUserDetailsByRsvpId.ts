import type { Rsvp } from "../types/Rsvp";

export const getUserDetailsByRsvpId = (rsvpId: string, rsvps: Rsvp[]) => {
  const filter = rsvps.filter((rsvp) => rsvp.id === rsvpId);
  return filter?.length ? filter[0] : undefined;
};
