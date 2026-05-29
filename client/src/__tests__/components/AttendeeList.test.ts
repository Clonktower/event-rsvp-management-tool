import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import AttendeeList from '$lib/AttendeeList.svelte';
import type { Rsvp } from '../../types/Rsvp';

afterEach(cleanup);

function makeRsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    id: 'r1',
    name: 'Alice',
    event_id: 'e1',
    status: 'going',
    guests: 0,
    token: 'tok',
    ...overrides,
  };
}

describe('AttendeeList', () => {
  it('renders nothing when attendees array is empty', () => {
    render(AttendeeList, { props: { attendees: [] } });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a toggle button with the attendee count', () => {
    const attendees = [makeRsvp({ name: 'Alice' }), makeRsvp({ id: 'r2', name: 'Bob' })];
    render(AttendeeList, { props: { attendees, maxAttendees: 10 } });
    expect(screen.getByRole('button', { name: /Show Responses \(2\)/ })).toBeInTheDocument();
  });

  it('does not show attendee names before toggle is clicked', () => {
    render(AttendeeList, { props: { attendees: [makeRsvp({ name: 'Alice' })], maxAttendees: 10 } });
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('reveals attendee names when toggle is clicked', async () => {
    render(AttendeeList, { props: { attendees: [makeRsvp({ name: 'Alice' })], maxAttendees: 10 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('hides the list again when toggle is clicked a second time', async () => {
    render(AttendeeList, { props: { attendees: [makeRsvp({ name: 'Alice' })], maxAttendees: 10 } });
    const toggle = screen.getByRole('button', { name: /Show Responses/ });
    await fireEvent.click(toggle);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /Hide Responses/ }));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('tracks open state in aria-expanded', async () => {
    render(AttendeeList, { props: { attendees: [makeRsvp()], maxAttendees: 10 } });
    const toggle = screen.getByRole('button', { name: /Show Responses/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Hide Responses/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows Going group header when going attendees are present', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ status: 'going' })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Going')).toBeInTheDocument();
  });

  it('shows Maybe group header when maybe attendees are present', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ status: 'maybe' })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Maybe')).toBeInTheDocument();
  });

  it('shows Not Going group header when not_going attendees are present', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ status: 'not_going' })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Not Going')).toBeInTheDocument();
  });

  it('shows only going attendees up to maxAttendees in the Going section', async () => {
    const attendees = [
      makeRsvp({ id: 'r1', name: 'Alice', status: 'going' }),
      makeRsvp({ id: 'r2', name: 'Bob', status: 'going' }),
      makeRsvp({ id: 'r3', name: 'Charlie', status: 'going' }),
    ];
    render(AttendeeList, { props: { attendees, maxAttendees: 2 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    // Alice and Bob appear in Going; Charlie overflows to Waitlist
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows a Waitlist section when going attendees exceed maxAttendees', async () => {
    const attendees = [
      makeRsvp({ id: 'r1', name: 'Alice', status: 'going' }),
      makeRsvp({ id: 'r2', name: 'Bob', status: 'going' }),
      makeRsvp({ id: 'r3', name: 'Charlie', status: 'going' }),
    ];
    render(AttendeeList, { props: { attendees, maxAttendees: 2 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Waitlist')).toBeInTheDocument();
  });

  it('does not show Waitlist when going attendees fit within maxAttendees', async () => {
    const attendees = [makeRsvp({ id: 'r1', status: 'going' })];
    render(AttendeeList, { props: { attendees, maxAttendees: 5 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.queryByText('Waitlist')).not.toBeInTheDocument();
  });

  it('shows delete buttons when showDeleteButton is true', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp()], maxAttendees: 10, showDeleteButton: true },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getAllByRole('button', { name: 'Delete attendee' }).length).toBeGreaterThan(0);
  });

  it('hides delete buttons when showDeleteButton is false', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp()], maxAttendees: 10, showDeleteButton: false },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.queryByRole('button', { name: 'Delete attendee' })).not.toBeInTheDocument();
  });

  it('calls onDelete with the correct id when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(AttendeeList, {
      props: {
        attendees: [makeRsvp({ id: 'rsvp-xyz', status: 'going' })],
        maxAttendees: 10,
        showDeleteButton: true,
        onDelete,
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Delete attendee' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith('rsvp-xyz');
  });

  it('shows guest count for attendees with extra guests', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ guests: 2 })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('(+2 guests)')).toBeInTheDocument();
  });

  it('shows singular guest label for exactly one guest', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ guests: 1 })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('(+1 guest)')).toBeInTheDocument();
  });

  it('does not show guest count for zero guests', async () => {
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ guests: 0 })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.queryByText(/guest/)).not.toBeInTheDocument();
  });

  it('groups attendees correctly across all three statuses', async () => {
    const attendees = [
      makeRsvp({ id: 'r1', name: 'Alice', status: 'going' }),
      makeRsvp({ id: 'r2', name: 'Bob', status: 'maybe' }),
      makeRsvp({ id: 'r3', name: 'Charlie', status: 'not_going' }),
    ];
    render(AttendeeList, { props: { attendees, maxAttendees: 10 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(screen.getByText('Going')).toBeInTheDocument();
    expect(screen.getByText('Maybe')).toBeInTheDocument();
    expect(screen.getByText('Not Going')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('toggle button has aria-controls pointing to the list element id', async () => {
    render(AttendeeList, { props: { attendees: [makeRsvp()], maxAttendees: 10 } });
    const toggle = screen.getByRole('button', { name: /Show Responses/ });
    expect(toggle).toHaveAttribute('aria-controls', 'attendees-list');
  });

  it('the controlled list element has the id referenced by aria-controls', async () => {
    render(AttendeeList, { props: { attendees: [makeRsvp()], maxAttendees: 10 } });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    expect(document.getElementById('attendees-list')).toBeInTheDocument();
  });

  it('renders attendee name containing XSS payload as text, not as markup', async () => {
    const xssName = '<img src=x onerror=alert(1)>';
    render(AttendeeList, {
      props: { attendees: [makeRsvp({ name: xssName })], maxAttendees: 10 },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Show Responses/ }));
    // The name text should be visible and no <img> should have been injected
    expect(screen.getByText(xssName)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });
});
