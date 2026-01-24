import type { Rsvp } from "../types/Rsvp";

/**
 * Returns true if the user is marked as 'going' and their position is beyond max_attendees.
 */
export function isUserOnWaitlist(
  attendees: Rsvp[],
  userId: string,
  maxAttendees?: number,
): boolean {
  if (!userId || !maxAttendees) return false;
  const goingAttendees = attendees.filter((a) => a.status === "going");
  const userIndex = goingAttendees.findIndex((a) => a.id === userId);
  return userIndex >= maxAttendees && userIndex !== -1;
}
