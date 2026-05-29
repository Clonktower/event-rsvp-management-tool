import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/svelte';
import MyRsvpsPage from '../../routes/my/rsvps/+page.svelte';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('My RSVPs page', () => {
  it('shows loading indicator initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'rsvp-1': 'tok' } }),
    );
    render(MyRsvpsPage);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no RSVPs are stored in localStorage', async () => {
    // No my_events key → getMyRsvps returns [] → onMount exits early
    render(MyRsvpsPage);
    await waitFor(() => {
      expect(
        screen.getByText("You haven't RSVP'd to any events"),
      ).toBeInTheDocument();
    });
  });

  it('sets the page title', () => {
    render(MyRsvpsPage);
    expect(document.title).toBe('My RSVPs | Event RSVP');
  });

  it('shows event cards after successful fetch', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'rsvp-1': 'tok' } }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rsvps: [
            {
              event: {
                id: 'evt-1',
                name: 'Board Game Night',
                date: '2024-06-15',
                start_time: '19:00',
                end_time: '22:00',
                location: 'The Pub',
                max_attendees: 10,
              },
              yourStatus: 'going',
              attendeeName: null,
            },
          ],
        }),
      } as Response),
    );

    render(MyRsvpsPage);

    await waitFor(() => {
      expect(screen.getByText('Board Game Night')).toBeInTheDocument();
    });
    expect(screen.getByText('Going')).toBeInTheDocument();
  });

  it('shows the group heading for events', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'rsvp-1': 'tok' } }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rsvps: [
            {
              event: {
                id: 'evt-1',
                name: 'Quiz Night',
                date: '2024-06-15',
                start_time: '19:00',
                end_time: '21:00',
                location: 'The Bar',
                max_attendees: 20,
              },
              yourStatus: 'maybe',
              attendeeName: null,
            },
          ],
        }),
      } as Response),
    );

    render(MyRsvpsPage);

    await waitFor(() => {
      expect(screen.getByText('Events you have responded to')).toBeInTheDocument();
    });
  });

  it('shows per-attendee status badges for group RSVPs', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'rsvp-1': 'tok', 'rsvp-2': 'tok2' } }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rsvps: [
            {
              event: {
                id: 'evt-1',
                name: 'Party',
                date: '2024-07-04',
                start_time: '20:00',
                end_time: '23:00',
                location: 'HQ',
                max_attendees: 50,
              },
              yourStatus: 'going',
              attendeeName: 'Alice',
            },
            {
              event: {
                id: 'evt-1',
                name: 'Party',
                date: '2024-07-04',
                start_time: '20:00',
                end_time: '23:00',
                location: 'HQ',
                max_attendees: 50,
              },
              yourStatus: 'maybe',
              attendeeName: 'Bob',
            },
          ],
        }),
      } as Response),
    );

    render(MyRsvpsPage);

    await waitFor(() => {
      expect(screen.getByText(/Alice: Going/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob: Maybe/i)).toBeInTheDocument();
    });
  });

  it('groups events into Upcoming and Past sections', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-past': { 'r1': 'tok' }, 'evt-future': { 'r2': 'tok2' } }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rsvps: [
            {
              event: { id: 'evt-past', name: 'Past Event', date: '2000-01-01', start_time: '18:00', end_time: '22:00', location: 'Old Venue', max_attendees: 10 },
              yourStatus: 'going',
              attendeeName: null,
            },
            {
              event: { id: 'evt-future', name: 'Future Event', date: '2099-01-01', start_time: '18:00', end_time: '22:00', location: 'New Venue', max_attendees: 10 },
              yourStatus: 'going',
              attendeeName: null,
            },
          ],
        }),
      } as Response),
    );

    render(MyRsvpsPage);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      expect(screen.getByText('Past Events')).toBeInTheDocument();
      expect(screen.getByText('Future Event')).toBeInTheDocument();
      expect(screen.getByText('Past Event')).toBeInTheDocument();
    });
  });

  it('shows "Going" status for a going RSVP (waitlist is not computed in this page)', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'rsvp-1': 'tok' } }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rsvps: [
            {
              event: { id: 'evt-1', name: 'Full Event', date: '2099-12-25', start_time: '18:00', end_time: '22:00', location: 'Venue', max_attendees: 1 },
              yourStatus: 'going',
              attendeeName: null,
            },
          ],
        }),
      } as Response),
    );

    render(MyRsvpsPage);

    await waitFor(() => {
      // My RSVPs page shows the server-side yourStatus; it does not compute waitlist
      expect(screen.getByText('Going')).toBeInTheDocument();
    });
  });
});
