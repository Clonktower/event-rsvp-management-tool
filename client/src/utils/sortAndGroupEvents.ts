import type { Event } from "../types/Event";

/**
 * Represents a logical group of event-related items
 * (e.g., "Upcoming Events" or "Past Events").
 */
export type Group<T> = {
  /** Group title, e.g. "Upcoming Events" */
  title: string;
  /** Items belonging to this group */
  items: T[];
};

/**
 * Extracts the underlying `Event` object from either:
 *  - an `Event` itself, or
 *  - an object containing an `event: Event` property.
 *
 * @param obj - The object to extract the event from
 * @returns The extracted Event instance
 */
function extractEvent(obj: Event | { event: Event }): Event {
  return "event" in obj ? obj.event : obj;
}

/**
 * Builds a Date object from an Event's `date` and `start_time`.
 *
 * @param event - The Event to extract the datetime from
 * @returns A JavaScript Date representing the event's start
 */
function getEventDateTime(event: Event): Date {
  return new Date(`${event.date}T${event.start_time}`);
}

/**
 * Sorts and groups an array of Event-like items into "Upcoming" and "Past" groups.
 *
 * Works with either:
 *  - `Event[]`
 *  - or any array of objects that include a field `event: Event`
 *
 * Items are sorted chronologically by start time before grouping.
 *
 * @typeParam T - The array element type (either Event or { event: Event })
 * @param items - Array of events or event-containing objects
 * @returns An array of groups, each with a `title` and corresponding `items`.
 *
 * @example
 * ```ts
 * // For plain events:
 * const grouped = splitAndSortByEvent(events);
 *
 * // For RSVP objects:
 * const grouped = splitAndSortByEvent(rsvps);
 * ```
 */
export function splitAndSortByEvent<T extends Event | { event: Event }>(
  items: T[],
): Group<T>[] {
  const now = new Date();

  // Sort chronologically by event start date/time
  const sorted = [...items].sort(
    (a, b) =>
      getEventDateTime(extractEvent(a)).getTime() -
      getEventDateTime(extractEvent(b)).getTime(),
  );

  const upcoming: T[] = [];
  const past: T[] = [];

  for (const item of sorted) {
    const eventDate = getEventDateTime(extractEvent(item));
    (eventDate >= now ? upcoming : past).push(item);
  }

  const groups: Group<T>[] = [];
  if (upcoming.length)
    groups.push({ title: "Upcoming Events", items: upcoming });
  if (past.length) groups.push({ title: "Past Events", items: past });

  return groups;
}
