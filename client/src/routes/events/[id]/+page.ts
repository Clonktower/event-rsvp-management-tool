import { API_HOST } from "../../../utils/apiHost";

export const load = async ({ params, fetch }) => {
  const id = params.id;
  const t1 = Date.now();
  const res = await fetch(`${API_HOST}/events/${id}`);
  const t2 = Date.now();
  if (!res.ok) {
    return { event: null };
  }
  const data = await res.json();
  const clockOffset = typeof data.serverTime === 'number'
    ? data.serverTime - (t1 + (t2 - t1) / 2)
    : 0;
  return { event: data.event, rsvp: data.rsvp, poll: data.poll ?? null, clockOffset };
};
