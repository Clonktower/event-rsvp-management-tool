import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/svelte';
import EventDetailPage from '../../routes/events/[id]/+page.svelte';
import type { Event } from '../../types/Event';
import type { Rsvp } from '../../types/Rsvp';
import type { Poll } from '../../types/Poll';

// The add-to-calendar-button web component is browser-only; stub it out so the
// dynamic import in onMount doesn't interfere with the test environment.
vi.mock('add-to-calendar-button', () => ({}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const baseEvent: Event = {
  id: 'evt-1',
  name: 'Board Game Night',
  date: '2024-06-15',
  start_time: '19:00',
  end_time: '22:00',
  location: 'The Pub, Berlin',
  max_attendees: 10,
};

function buildData(
  event: Event | null = baseEvent,
  rsvp: Rsvp[] = [],
  poll: Poll | null = null,
  clockOffset = 0,
) {
  return { event, rsvp, poll, clockOffset };
}

function stubFetchUnauthorized() {
  // removeStaleLocalStorageEntries returns early when localStorage is empty.
  // The only fetch that fires is the admin login check; return 401 so isAdmin=false.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response),
  );
}

describe('EventDetailPage — happy path', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('shows the event name after mount', async () => {
    render(EventDetailPage, { props: { data: buildData() } });
    await waitFor(() => {
      expect(screen.getByText('Board Game Night')).toBeInTheDocument();
    });
  });

  it('shows the formatted event date', async () => {
    render(EventDetailPage, { props: { data: buildData() } });
    await waitFor(() => {
      // formatDate produces something like "Saturday, June 15, 2024"
      expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
    });
  });

  it('shows the location as a map link', async () => {
    render(EventDetailPage, { props: { data: buildData() } });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'The Pub, Berlin' })).toBeInTheDocument();
    });
  });

  it('shows the going count and max attendees', async () => {
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() => {
      expect(screen.getByText(/1\/10/)).toBeInTheDocument();
    });
  });

  it('sets the page title from the event name', async () => {
    render(EventDetailPage, { props: { data: buildData() } });
    await waitFor(() => {
      expect(document.title).toBe('Board Game Night | Event RSVP');
    });
  });
});

describe('EventDetailPage — RSVP form visibility', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('shows the RSVP form when user has not responded', async () => {
    render(EventDetailPage, { props: { data: buildData() } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });
  });

  it('hides the RSVP form when user has already responded', async () => {
    // Put an existing RSVP in localStorage so getUser finds the user
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r1': 'tok' } }),
    );
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    });
  });

  it('shows status indicator when user has already responded', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r1': 'tok' } }),
    );
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() => {
      expect(screen.getByText(/You are marked as/)).toBeInTheDocument();
      expect(screen.getByText('Going')).toBeInTheDocument();
    });
  });

  it('shows Edit button on the status indicator', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r1': 'tok' } }),
    );
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() => {
      // The button text is "Edit" and title is "Edit RSVP" — accessible name comes from text content
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });

  it('shows the RSVP form again when Edit is clicked', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r1': 'tok' } }),
    );
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument(),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});

describe('EventDetailPage — waitlist', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('shows waitlist status when user is on the waitlist', async () => {
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r3': 'tok3' } }),
    );
    // max_attendees=2, r3 is third going → waitlisted
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok1' },
      { id: 'r2', name: 'Bob', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok2' },
      { id: 'r3', name: 'Charlie', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok3' },
    ];
    const event: Event = { ...baseEvent, max_attendees: 2 };
    render(EventDetailPage, { props: { data: buildData(event, rsvps) } });
    await waitFor(() => {
      expect(screen.getByText(/You are currently on the/)).toBeInTheDocument();
      expect(screen.getByText('Waitlist')).toBeInTheDocument();
    });
  });
});

describe('EventDetailPage — admin view', () => {
  it('shows admin edit link when user is admin', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response),
    );
    render(EventDetailPage, { props: { data: buildData() } });
    // The admin edit link has aria-label="Edit event"
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Edit event' })).toBeInTheDocument();
    });
  });

  it('sends admin credentials on a sign-up so the server can stamp lottery priority', async () => {
    // Regression guard: a logged-in admin's sign-up must carry credentials, or the
    // server treats it as anonymous (priority_weight 0) and the admin gets no
    // priority and no badge. The client only did this during early access before.
    localStorage.setItem('credentials', 'admin:secret');
    const fetchMock = vi.fn().mockImplementation((url: RequestInfo, opts?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/events/evt-1/rsvp') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ rsvp: { id: 'new-id', name: 'Boss', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok-new' } }),
        } as Response);
      }
      // Admin-login check and the post-submit event refetch.
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ rsvp: [], event: { ...baseEvent, selection_mode: 'lottery' }, poll: null, serverTime: Date.now() }),
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    const lotteryEvent: Event = { ...baseEvent, selection_mode: 'lottery' };
    render(EventDetailPage, { props: { data: buildData(lotteryEvent) } });

    // Wait for the admin check to resolve (the draw button only renders for admins).
    await screen.findByRole('button', { name: 'Run the draw' });

    await fireEvent.input(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Boss' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([url, opts]) => String(url).endsWith('/events/evt-1/rsvp') && (opts as RequestInit)?.method === 'POST',
      );
      expect(post).toBeTruthy();
      const headers = (post![1] as RequestInit).headers as Headers;
      expect(headers.get('Authorization')).toBe('Basic admin:secret');
    });
  });
});

describe('EventDetailPage — null event (not found)', () => {
  it('throws when rendered with a null event (BUG: no null guard)', () => {
    // BUG: the page's instance script dereferences event.id and
    // event.registration_opens_at unconditionally, so a not-found event
    // (data.event === null) crashes the component on mount instead of rendering
    // the "No Such Event was found!" message. The script should null-guard event
    // (and the <svelte:head> block) before reading its fields.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response),
    );
    expect(() => render(EventDetailPage, { props: { data: buildData(null) } })).toThrow();
  });
});

describe('EventDetailPage — +1 button', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('shows "Bringing a +1? Click here" button when user has already responded', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bringing a \+1/ })).toBeInTheDocument();
    });
  });

  it('clicking the "+1?" button shows the RSVP form', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    const btn = await screen.findByRole('button', { name: /Bringing a \+1/ });
    await fireEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('clicking "+1?" resets the form: name is empty and Going is selected', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await screen.findByRole('button', { name: /Bringing a \+1/ });
    // Drain onMount's promise chain (fetch → attendeeName = 'Alice') before clicking,
    // matching real-world timing where onMount completes before any user interaction.
    await new Promise(resolve => setTimeout(resolve, 0));
    await fireEvent.click(screen.getByRole('button', { name: /Bringing a \+1/ }));
    expect(screen.getByPlaceholderText('Enter your name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('EventDetailPage — multi-user "Editing For" select', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('does not show the "Editing For" dropdown when only one user has RSVPed from this device', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByLabelText('Editing For')).not.toBeInTheDocument();
  });

  it('shows the "Editing For" dropdown when two users have RSVPed from this device', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok1', 'r2': 'tok2' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok1' },
      { id: 'r2', name: 'Bob', event_id: 'evt-1', status: 'maybe', guests: 0, token: 'tok2' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await new Promise(r => setTimeout(r, 0));
    await waitFor(() => {
      expect(screen.getByLabelText('Editing For')).toBeInTheDocument();
    });
  });

  it('"Editing For" select contains both attendee names', async () => {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok1', 'r2': 'tok2' } }));
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok1' },
      { id: 'r2', name: 'Bob', event_id: 'evt-1', status: 'maybe', guests: 0, token: 'tok2' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await new Promise(r => setTimeout(r, 0));
    await waitFor(() => {
      const select = screen.getByLabelText('Editing For');
      expect(select).toBeInTheDocument();
      expect(select.textContent).toContain('Alice');
      expect(select.textContent).toContain('Bob');
    });
  });
});

describe('EventDetailPage — XSS safety', () => {
  beforeEach(() => stubFetchUnauthorized());

  it('renders an attendee name with HTML payload as text, not as markup', async () => {
    const xssName = '<script>alert(1)</script>';
    const rsvps: Rsvp[] = [
      { id: 'r1', name: xssName, event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' },
    ];
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await new Promise(r => setTimeout(r, 0));
    await waitFor(() => {
      // The list must be visible — toggle it
      const toggleBtn = screen.queryByRole('button', { name: /Show Responses/ });
      if (toggleBtn) toggleBtn.click();
    });
    // The raw string should appear as text content somewhere in the page
    expect(document.body.textContent).toContain('<script>alert(1)</script>');
    // No actual <script> element with that content should be present
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
      expect(s.textContent).not.toContain('alert(1)');
    });
  });
});

describe('EventDetailPage — registration opens in future', () => {
  it('shows a countdown when registration is not yet open', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const event: Event = { ...baseEvent, registration_opens_at: futureDate };

    // Stub Intl.DurationFormat since it may not be available in all jsdom versions
    const OrigIntl = globalThis.Intl;
    (globalThis as any).Intl = {
      ...OrigIntl,
      DurationFormat: class {
        format() {
          return '1:00:00';
        }
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );

    render(EventDetailPage, { props: { data: buildData(event) } });

    await waitFor(() => {
      expect(screen.getByText(/Registration opens in/)).toBeInTheDocument();
    });

    (globalThis as any).Intl = OrigIntl;
  });

  it('does not gate a lottery sign-up behind registration_opens_at (the draw is the gate)', async () => {
    // Regression guard: in lottery mode the server ignores registration_opens_at,
    // so the client must too — a non-admin visiting before the entry-window time
    // must still be able to sign up, not see a "Registration opens in" countdown
    // with a disabled form.
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const event: Event = { ...baseEvent, selection_mode: 'lottery', registration_opens_at: futureDate };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );

    render(EventDetailPage, { props: { data: buildData(event) } });

    const submit = await screen.findByRole('button', { name: 'Submit' });
    expect(submit).not.toBeDisabled();
    expect(screen.queryByText(/Registration opens in/)).not.toBeInTheDocument();
  });
});
