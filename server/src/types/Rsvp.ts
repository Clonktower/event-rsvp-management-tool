export type Rsvp = {
  id: string;
  name: string;
  event_id: string; // The event this attendee is associated with
  status?: 'going' | 'not_going' | 'maybe';
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  guests?: number;
  token: string;
  priority_weight?: number; // higher = seeded earlier in a lottery draw (admins > 0)
  lottery_rank?: number | null; // assigned position after a draw; null until drawn
}

