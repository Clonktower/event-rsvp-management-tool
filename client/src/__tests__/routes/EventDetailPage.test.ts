import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/svelte';
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
  vi.restoreAllMocks();
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

  it('passes the event details through to the button', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('name')).toBe('Board Game Night');
    expect(button.getAttribute('start-date')).toBe('2024-06-15');
    expect(button.getAttribute('start-time')).toBe('19:00');
    expect(button.getAttribute('end-time')).toBe('22:00');
    expect(button.getAttribute('time-zone')).toBe('Europe/Berlin');
    expect(button.getAttribute('location')).toBe('The Pub, Berlin');
  });

  it('defaults the end time to one hour after the start', async () => {
    const button = await renderCalendarButton({ ...baseEvent, end_time: undefined });

    expect(button.getAttribute('end-time')).toBe('20:00');
  });

  it('identifies the calendar entry by the event id', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('uid')).toBe('evt-1');
  });

  it('offers Apple among the calendar options', async () => {
    const button = await renderCalendarButton();

    expect(button.getAttribute('options')).toContain("'apple'");
  });

  it('lets the button generate the calendar file itself', async () => {
    const button = await renderCalendarButton();

    expect(button.hasAttribute('ics-file')).toBe(false);
    expect(button.hasAttribute('icsfile')).toBe(false);
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

describe('EventDetailPage — submitting an RSVP', () => {
  const created: Rsvp = { id: 'new-1', name: 'Dana', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok-new' };

  function jsonResponse(status: number, body: unknown) {
    return { ok: status < 400, status, json: async () => body } as Response;
  }

  // POST resolves only when the returned `release` is called, so a test can act
  // while the request is still in flight.
  function stubSlowPost() {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        await gate;
        return jsonResponse(201, { rsvp: created });
      }
      return jsonResponse(200, { event: baseEvent, rsvp: [created] });
    });
    vi.stubGlobal('fetch', fetchSpy);
    return { fetchSpy, release };
  }

  const posts = (spy: ReturnType<typeof vi.fn>) =>
    spy.mock.calls.filter(([, init]) => init?.method === 'POST');

  async function fillName(name = 'Dana') {
    const input = await screen.findByLabelText(/Your Name/);
    await fireEvent.input(input, { target: { value: name } });
  }

  it('sends one request when Submit is pressed repeatedly before the first answer', async () => {
    const { fetchSpy, release } = stubSlowPost();
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();

    const form = screen.getByRole('button', { name: 'Submit' }).closest('form')!;
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(posts(fetchSpy)).toHaveLength(1);

    release();
    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
    expect(posts(fetchSpy)).toHaveLength(1);
  });

  it('shows the server error and keeps the form when the submit is rejected', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(403, { error: 'Registration not yet open.' }));
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Registration not yet open.');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    expect(screen.queryByText('Your response was saved!')).not.toBeInTheDocument();
  });

  it('falls back to a generic message when the rejection has no readable body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('clears the previous error as soon as a new attempt starts', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(403, { error: 'Registration not yet open.' }))
      .mockImplementationOnce(async () => { await gate; return jsonResponse(201, { rsvp: created }); })
      .mockResolvedValueOnce(jsonResponse(200, { event: baseEvent, rsvp: [created] }));
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration not yet open.');

    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    // The retry is still in flight, so the form (and with it the place the
    // error is shown) is still on screen: the old error must be gone already.
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    release();
    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
  });

  it('locks the name, the status buttons and Submit while the request is in flight', async () => {
    const { release } = stubSlowPost();
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByLabelText(/Your Name/)).toHaveAttribute('readonly');
    for (const label of ['Going', 'Maybe', 'Not Going']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }

    release();
    await waitFor(() => {
      expect(screen.getByText(/You are marked as/)).toBeInTheDocument();
    });
  });

  it('confirms the response even when refreshing the list afterwards fails', async () => {
    // The RSVP is saved at this point. Leaving the form open would invite a
    // second submit for something that already went through.
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(jsonResponse(201, { rsvp: created }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(EventDetailPage, { props: { data: buildData() } });
    await fillName();
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('my_events') ?? '{}')).toEqual({ 'evt-1': { 'new-1': 'tok-new' } });
  });
});

describe('EventDetailPage — a new RSVP that could not be confirmed', () => {
  // The request may have reached the server even though no answer came back.
  // This device then holds no token for it, so another submit would create a
  // second RSVP rather than edit the first.
  async function submitNewRsvp() {
    const input = await screen.findByLabelText(/Your Name/);
    await fireEvent.input(input, { target: { value: 'Dana' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  }

  async function expectLocked(fetchSpy: ReturnType<typeof vi.fn>) {
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn't confirm that your response was saved/);
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
    // The name is still filled in, so the submit below is not stopped by the
    // empty-name check: only the lock can be what keeps it from sending.
    expect(screen.getByLabelText(/Your Name/)).toHaveValue('Dana');
    const callsBefore = fetchSpy.mock.calls.length;
    await fireEvent.submit(submit.closest('form')!);
    expect(fetchSpy).toHaveBeenCalledTimes(callsBefore);
    expect(screen.queryByText('Your response was saved!')).not.toBeInTheDocument();
  }

  it('keeps Submit locked and asks for a reload when the request fails without an answer', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(EventDetailPage, { props: { data: buildData() } });
    await submitNewRsvp();
    await expectLocked(fetchSpy);
  });

  it('does the same when the server says it saved but the answer cannot be read', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => { throw new SyntaxError('Unexpected end of JSON input'); },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(EventDetailPage, { props: { data: buildData() } });
    await submitNewRsvp();
    await expectLocked(fetchSpy);
  });

  it('does the same when a proxy answers 5xx, since the server may have saved by then', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await submitNewRsvp();
    await expectLocked(fetchSpy);
  });

  it('does the same when the token for the saved RSVP cannot be stored', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ rsvp: { id: 'new-1', name: 'Dana', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok-new' } }),
    } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    render(EventDetailPage, { props: { data: buildData() } });
    await submitNewRsvp();
    await expectLocked(fetchSpy);
  });

  it('goes through the admin request during early access, and locks the same way when it fails', async () => {
    const event: Event = { ...baseEvent, registration_opens_at: new Date(Date.now() + 3_600_000).toISOString() };
    const restoreIntl = stubDurationFormat();
    localStorage.setItem('credentials', 'admin:secret');
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/admin/login')) return { ok: true, status: 200, json: async () => ({}) } as Response;
      if (init?.method === 'POST') throw new TypeError('Failed to fetch');
      return { ok: true, status: 200, json: async () => ({ event, rsvp: [] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(EventDetailPage, { props: { data: buildData(event) } });
      // Submit only becomes available to an admin once the login probe has answered.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
      });
      await submitNewRsvp();
      await expectLocked(fetchSpy as ReturnType<typeof vi.fn>);

      const post = fetchSpy.mock.calls.find(([url]) => String(url).endsWith('/events/evt-1/rsvp'))!;
      expect(post[1]!.method).toBe('POST');
      expect(new Headers(post[1]!.headers).get('Authorization')).toBe('Basic admin:secret');
    } finally {
      restoreIntl();
    }
  });

  it('lifts the lock when "Editing For" switches to a stored response, since the next submit is then an edit', async () => {
    const alice: Rsvp = { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' };
    const bob: Rsvp = { id: 'r2', name: 'Bob', event_id: 'evt-1', status: 'maybe', guests: 0, token: 'tok2' };
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': { 'r1': 'tok', 'r2': 'tok2' } }));
    const fetchSpy = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(EventDetailPage, { props: { data: buildData(baseEvent, [alice, bob]) } });

    // A +1 is a new RSVP, so its failure locks the form.
    await fireEvent.click(await screen.findByRole('button', { name: /Bringing a \+1/ }));
    await submitNewRsvp();
    await expectLocked(fetchSpy);

    await fireEvent.change(screen.getByLabelText('Editing For'), { target: { value: 'r2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();

    // And that next submit is an edit of the chosen response, not another create.
    await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true);
    });
    const patch = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
    expect(String(patch[0])).toMatch(/\/events\/evt-1\/rsvp\/r2$/);
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('does the same when the answer carries no RSVP to store a token for', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    render(EventDetailPage, { props: { data: buildData() } });
    await submitNewRsvp();
    await expectLocked(fetchSpy);
  });
});

describe('EventDetailPage — editing an existing RSVP', () => {
  const alice: Rsvp = { id: 'r1', name: 'Alice', event_id: 'evt-1', status: 'going', guests: 0, token: 'tok' };
  const bob: Rsvp = { id: 'r2', name: 'Bob', event_id: 'evt-1', status: 'maybe', guests: 0, token: 'tok2' };

  const patches = (spy: ReturnType<typeof vi.fn>) =>
    spy.mock.calls.filter(([, init]) => init?.method === 'PATCH');

  async function openEditForm(stored: Record<string, string> = { 'r1': 'tok' }, rsvps: Rsvp[] = [alice]) {
    localStorage.setItem('my_events', JSON.stringify({ 'evt-1': stored }));
    render(EventDetailPage, { props: { data: buildData(baseEvent, rsvps) } });
    await fireEvent.click(await screen.findByTitle('Edit RSVP'));
    return screen.getByRole('button', { name: 'Submit' }).closest('form')!;
  }

  it('sends one request when Submit is pressed repeatedly before the first answer', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        await gate;
        return { ok: true, status: 200, json: async () => ({ rsvp: alice }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ event: baseEvent, rsvp: [alice] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchSpy);
    const form = await openEditForm();

    await fireEvent.submit(form);
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(patches(fetchSpy)).toHaveLength(1);
    expect(String(patches(fetchSpy)[0][0])).toMatch(/\/events\/evt-1\/rsvp\/r1$/);

    release();
    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
    expect(patches(fetchSpy)).toHaveLength(1);
  });

  it('shows the server error and keeps the form when the edit is rejected', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'RSVP not found or token invalid.' }),
    } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    const form = await openEditForm();
    await fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('RSVP not found or token invalid.');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('lets a failed edit be retried, since repeating an edit cannot create a duplicate', async () => {
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rsvp: alice }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ event: baseEvent, rsvp: [alice] }) } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const form = await openEditForm();
    await fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not be saved/);
    expect(within(alert).queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();

    await fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
    expect(patches(fetchSpy)).toHaveLength(2);
  });

  it('locks the "Editing For" select while saving and clears an old error when it changes', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }) } as Response)
      .mockImplementationOnce(async () => {
        await gate;
        return { ok: true, status: 200, json: async () => ({ rsvp: bob }) } as Response;
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ event: baseEvent, rsvp: [alice, bob] }) } as Response);
    vi.stubGlobal('fetch', fetchSpy);
    const form = await openEditForm({ 'r1': 'tok', 'r2': 'tok2' }, [alice, bob]);
    const select = screen.getByLabelText('Editing For');

    await fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal Server Error');

    // Switching to the other person drops the error that belonged to the first.
    await fireEvent.change(select, { target: { value: 'r2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await fireEvent.submit(form);
    await screen.findByRole('button', { name: 'Saving…' });
    expect(select).toBeDisabled();

    release();
    await waitFor(() => {
      expect(screen.getByText('Your response was saved!')).toBeInTheDocument();
    });
    // The retry went to Bob with Bob's token and status, and the banner shows
    // Bob's status.
    const retry = fetchSpy.mock.calls[1];
    expect(String(retry[0])).toMatch(/\/events\/evt-1\/rsvp\/r2$/);
    expect(JSON.parse(retry[1].body)).toMatchObject({ name: 'Bob', status: 'maybe', token: 'tok2' });
    expect(screen.getByText('Maybe')).toBeInTheDocument();
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
    // Credentials stored, so the admin probe runs and startCountdown is deferred
    // to its .finally(). That deferral is the window where the box could render
    // blank; without credentials the countdown is computed synchronously during
    // mount and there is no window to test.
    localStorage.setItem('credentials', 'admin:secret');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response),
    );

    render(EventDetailPage, { props: { data: buildData(event) } });

    // The countdown has not been computed yet. The box must stay hidden rather
    // than render "Registration opens in" with a blank value.
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
    // The admin probe only fires when credentials are stored; ok:true then makes
    // it succeed, so isAdmin becomes true.
    localStorage.setItem('credentials', 'admin:secret');
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
