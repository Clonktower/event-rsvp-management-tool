export type Attendee = {
  id: string;
  name: string;
  eventId: string; // The event this attendee is associated with
  rsvpStatus?: 'yes' | 'no' | 'maybe';
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

