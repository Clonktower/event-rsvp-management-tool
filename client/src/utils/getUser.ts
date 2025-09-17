import { legacyEventIds } from "../constants/legacyEventIds";
import type { User } from "../types/User";

export function getUser(eventId: string): User | undefined {
  if (eventId in legacyEventIds) {
    const cookieMatch = document.cookie.match(/user_details=([^;]+)/);
    if (cookieMatch) {
      try {
        return JSON.parse(decodeURIComponent(cookieMatch[1]));
      } catch (err) {
        console.error(err);
      }
    }
  } else {
    const userDetails =
      JSON.parse(localStorage.getItem("my_events") ?? "{}") ?? {};
    const eventDetails = userDetails?.[eventId];

    if (Object.keys(eventDetails ?? {}).length) {
      return {
        id: Object.keys(eventDetails)[0],
        token: Object.values(eventDetails)[0] as string,
      };
    }
  }
}
