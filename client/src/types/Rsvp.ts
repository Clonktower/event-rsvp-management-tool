export type RsvpStatus = 'going' | 'not_going' | 'maybe';

export type Rsvp = {
  id: string;
  name: string;
  eventId: string;
  status: RsvpStatus;
  guests: number;
  createdAt?: string;
  updatedAt?: string;
};

