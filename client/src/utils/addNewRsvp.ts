import type { Rsvp } from "../types/Rsvp";
import type { MyEvents } from "../types/MyEvents";

export const addNewRsvp = (rsvp: Rsvp) => {
  const rsvpDetails = { [rsvp.id]: rsvp.token };
  const myEvents = localStorage.getItem("my_events");

  if (myEvents) {
    const parsedEvents = JSON.parse(myEvents) as MyEvents;

    if (parsedEvents[rsvp.event_id]) {
      parsedEvents[rsvp.event_id] = {
        ...parsedEvents[rsvp.event_id],
        ...rsvpDetails,
      };
    } else {
      parsedEvents[rsvp.event_id] = rsvpDetails;
    }
  } else {
    localStorage.setItem(
      "my_events",
      JSON.stringify({
        [rsvp.event_id]: [rsvpDetails],
      }),
    );
  }
};
