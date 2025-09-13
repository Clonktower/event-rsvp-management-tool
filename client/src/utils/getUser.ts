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
    const userDetails = JSON.parse(localStorage.getItem("my_events") ?? "{}");

    // for now since in the ui there is no way to sign up multiple users from same browser
    // simply return the first user but in future we might need a better ui to be able to select users
    return userDetails?.[eventId]?.[0] as User;
  }
}
