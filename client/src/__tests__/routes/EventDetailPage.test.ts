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
  // No credentials in localStorage → admin login probe is skipped entirely.
  vi.stubGlobal('fetch', vi.fn());
}

// Intl.DurationFormat is not available in every jsdom version; return a fixed
// duration so the countdown renders deterministically. Call the result to restore.
function stubDurationFormat() {
  const OrigIntl = globalThis.Intl;
  (globalThis as any).Intl = {
    ...OrigIntl,
    DurationFormat: class {
      format() {
        return '1:00:00';
      }
    },
  };
  return () => {
    (globalThis as any).Intl = OrigIntl;
  };
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
    localStorage.setItem('credentials', 'admin:secret');
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
    // Drain onMount before clicking, matching real-world timing where onMount
    // completes before any user interaction.
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

// iOS Safari 26.6+ ignores the data: URL the calendar button builds by default,
// so the button has to be pointed at the API's .ics endpoint instead.
describe('EventDetailPage — Add to Calendar', () => {
  beforeEach(() => stubFetchUnauthorized());

  async function renderCalendarButton(event: Event = baseEvent) {
    // Built inline rather than via buildData, which widens event to Event | null.
    const data = { event, rsvp: [] as Rsvp[], poll: null, clockOffset: 0 };
    const { container } = render(EventDetailPage, { props: { data } });
    return await waitFor(() => {
      const button = container.querySelector('add-to-calendar-button');
      expect(button).not.toBeNull();
      return button as HTMLElement;
    });
  }

  it('points the button at the .ics endpoint for this event', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('icsFile')).toBe('http://localhost:3000/events/evt-1/calendar.ics');
  });

  it('offers Apple among the calendar options', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('options')).toContain('Apple');
  });

  it('passes the event details through to the button', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('name')).toBe('Board Game Night');
    expect(button.getAttribute('startDate')).toBe('2024-06-15');
    expect(button.getAttribute('startTime')).toBe('19:00');
    expect(button.getAttribute('endTime')).toBe('22:00');
    expect(button.getAttribute('location')).toBe('The Pub, Berlin');
  });

  it('defaults the end time to one hour after the start', async () => {
    const button = await renderCalendarButton({ ...baseEvent, end_time: undefined });

    expect(button.getAttribute('endTime')).toBe('20:00');
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

describe('EventDetailPage — server call reduction', () => {
  it('does not fire the admin login probe when no credentials are stored', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    // Drain onMount's synchronous body and any microtasks.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fires the admin login probe exactly once when credentials are stored', async () => {
    localStorage.setItem('credentials', 'admin:secret');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/admin/login');
  });

  it('prunes stale localStorage RSVP entries absent from the loaded attendees', async () => {
    // 'stale' is not in the loaded attendees, so it should be pruned; 'r1' stays.
    localStorage.setItem(
      'my_events',
      JSON.stringify({ 'evt-1': { 'r1': 'tok1', 'stale': 'tok2' } }),
    );
    const rsvps: Rsvp[] = [
      { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok1' },
    ];
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await new Promise(resolve => setTimeout(resolve, 0));
    const stored = JSON.parse(localStorage.getItem('my_events') ?? '{}');
    expect(stored['evt-1']).toHaveProperty('r1');
    expect(stored['evt-1']).not.toHaveProperty('stale');
    // Pruning must rely on the already-loaded attendees, not a fresh fetch.
    expect(fetchSpy).not.toHaveBeenCalled();
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

    vi.stubGlobal('fetch', vi.fn());

    render(EventDetailPage, { props: { data: buildData(event) } });

    await waitFor(() => {
      expect(screen.getByText(/Registration opens in/)).toBeInTheDocument();
    });

    (globalThis as any).Intl = OrigIntl;
  });

  it('does not flash the countdown box before the countdown has a value', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const event: Event = { ...baseEvent, registration_opens_at: futureDate };
    const restoreIntl = stubDurationFormat();
    stubFetchUnauthorized();

    render(EventDetailPage, { props: { data: buildData(event) } });

    // On the very first paint the countdown has not been computed yet. The box
    // must stay hidden rather than render "Registration opens in" with a blank
    // value, which is the flicker this guards against.
    expect(screen.queryByText(/Registration opens in/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Registration opens in/)).toBeInTheDocument();
    });

    restoreIntl();
  });

  it('never renders the countdown box with an empty value', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const event: Event = { ...baseEvent, registration_opens_at: futureDate };
    const restoreIntl = stubDurationFormat();
    stubFetchUnauthorized();

    const { container } = render(EventDetailPage, { props: { data: buildData(event) } });

    await waitFor(() => {
      expect(screen.getByText(/Registration opens in/)).toBeInTheDocument();
    });

    // Whenever the box is on screen its <span class="font-mono"> must hold a
    // real duration, never the empty string the component starts out with.
    const values = [...container.querySelectorAll('span.font-mono')].map(s => s.textContent);
    expect(values.length).toBeGreaterThan(0);
    values.forEach(v => expect(v?.trim()).not.toBe(''));

    restoreIntl();
  });

  it('shows no countdown box at all when registration is already open', async () => {
    // registration_opens_at absent => countdown is irrelevant and must never appear.
    stubFetchUnauthorized();

    render(EventDetailPage, { props: { data: buildData(baseEvent) } });

    await waitFor(() => {
      expect(screen.getByText('Board Game Night')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Registration opens in/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Public registration opens in/)).not.toBeInTheDocument();
  });

  it('shows the admin public-registration countdown with a real value', async () => {
    // Admins get early access, so they see the event plus a separate box counting
    // down to public registration. Nothing else covers that second box.
    // Note this is not a flicker test: isAdmin is false until the async login
    // check resolves, by which point the countdown is already computed, so the
    // admin box could not flash even before the countdownReady guard existed.
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const event: Event = { ...baseEvent, registration_opens_at: futureDate };
    const restoreIntl = stubDurationFormat();
    // ok:true makes the admin login check succeed, so isAdmin becomes true.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response),
    );

    render(EventDetailPage, { props: { data: buildData(event) } });

    await waitFor(() => {
      expect(screen.getByText(/Public registration opens in/)).toBeInTheDocument();
    });
    expect(screen.getByText('1:00:00')).toBeInTheDocument();

    restoreIntl();
  });
});
