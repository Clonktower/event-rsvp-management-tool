export type Event = {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time?: string;
  max_attendees: number;
  location: string;
  created_at?: string;
};
