import type { Rsvp } from "../types/Rsvp";
import { getUser } from "./getUser";

export const hasUserResponded = (eventId: string, attendees: Rsvp[]) => {
  if (typeof document === "undefined")
    return { hasResponded: false, status: undefined };

  const attendeeId = getUser(eventId)?.id;

  if (!attendeeId) return { hasResponded: false, status: undefined };

  const f = attendees.filter((a) => a.id === attendeeId);

  return {
    hasResponded: f.length > 0,
    status: f.length ? f[0]?.status : undefined,
  };
};
