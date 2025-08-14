export const load = async ({ params, fetch }) => {
  const id = params.id;
  const res = await fetch(`http://localhost:3000/events/${id}`);
  if (!res.ok) {
    return { event: null };
  }
  const data = await res.json();
  return { event: data.event, rsvp: data.rsvp};
};
