import type { Rsvp } from '../types/Rsvp';

export const getTotalAttendance = (attendees: Rsvp[]) => {
	return attendees
		.filter((a) => a.status === 'going')
		.reduce((total, attendee) => total + 1 + (attendee.guests ?? 0), 0);
};
