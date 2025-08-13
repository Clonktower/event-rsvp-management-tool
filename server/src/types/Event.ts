export type Event = {
  id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // e.g. '16:00'
  endTime?: string;   // Optional, e.g. '16:00'
  maxAttendees?: number;
  location: string;
  createdAt?: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)
};

