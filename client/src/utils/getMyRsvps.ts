export const getMyRsvps = () => {
  const myEvents = JSON.parse(localStorage.getItem("my_events") ?? "{}") ?? {};

  // all the type assertions are just for safety, in case the localStorage data is corrupted
  return Object.entries(myEvents).flatMap(([eventId, rsvps]) =>
    rsvps && typeof rsvps === "object" && !Array.isArray(rsvps)
      ? Object.keys(rsvps).map((rsvpId) => ({ eventId, rsvpId }))
      : [],
  );
};
