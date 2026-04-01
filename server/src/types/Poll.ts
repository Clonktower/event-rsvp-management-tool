export type PollOption = {
  id: string;
  poll_id: string;
  name: string;
  url: string;
  description?: string;
  created_at: string;
  votes: { rsvp_id: string; voter_name: string }[];
};

export type Poll = {
  id: string;
  event_id: string;
  title: string;
  status: 'open' | 'closed';
  created_at: string;
  options: PollOption[];
};
