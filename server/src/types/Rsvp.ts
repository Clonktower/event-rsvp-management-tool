export type Rsvp = {
  id: string;
  name: string;
  event_id: string; // The event this attendee is associated with
  status?: 'going' | 'not_going' | 'maybe';
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  guests?: number;
  token: string
}

