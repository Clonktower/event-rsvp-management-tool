import type { Rsvp } from "../types/Rsvp";
import type { MyEvents } from "../types/MyEvents";

export const updateMyEvents = (rsvp: Rsvp) => {
  const rsvpDetails = { id: rsvp.id, token: rsvp.token };
  const myEvents = localStorage.getItem("my_events");

  if (myEvents) {
    const parsedEvents = JSON.parse(myEvents) as MyEvents;

    if (parsedEvents[rsvp.eventId]) {
      parsedEvents[rsvp.eventId].push(rsvpDetails);
    } else {
      parsedEvents[rsvp.eventId] = [rsvpDetails];
    }
  } else {
    localStorage.setItem(
      "my_events",
      JSON.stringify({
        [rsvp.eventId]: [rsvpDetails],
      }),
    );
  }
};
