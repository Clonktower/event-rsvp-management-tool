import type { User } from "../types/User";

export function getUser(eventId: string): User | undefined {
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
