import type { User } from "../types/User";

export function getAllUsersForEvent(eventId: string): User[] | undefined {
  const userDetails =
    JSON.parse(localStorage.getItem("my_events") ?? "{}") ?? {};
  const eventDetails = userDetails?.[eventId];

  const users: User[] = [];
  Object.keys(eventDetails ?? {}).forEach((key) => {
    users.push({
      id: key,
      token: eventDetails[key] as string,
    });
  });

  return users;
}
