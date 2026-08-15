import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import PollWidget from '$lib/PollWidget.svelte';
import type { Poll } from '../../types/Poll';
import type { User } from '../../types/User';

afterEach(cleanup);

const openPoll: Poll = {
  id: 'poll-1',
  event_id: 'evt-1',
  title: 'Vote for tonight\'s script',
  status: 'open',
  created_at: '2024-01-01T00:00:00.000Z',
  options: [
    {
      id: 'opt-1',
      poll_id: 'poll-1',
      name: 'Script A',
      url: 'https://example.com/a',
      description: 'A description',
      created_at: '2024-01-01T00:00:00.000Z',
      votes: [],
    },
    {
      id: 'opt-2',
      poll_id: 'poll-1',
      name: 'Script B',
      url: 'https://example.com/b',
      description: '',
      created_at: '2024-01-01T00:00:00.000Z',
      votes: [{ rsvp_id: 'rsvp-x', voter_name: 'Dave' }],
    },
  ],
};

const closedPoll: Poll = {
  ...openPoll,
  status: 'closed',
  options: [
    {
      id: 'opt-1',
      poll_id: 'poll-1',
      name: 'Script A',
      url: 'https://example.com/a',
      created_at: '2024-01-01T00:00:00.000Z',
      votes: [
        { rsvp_id: 'rsvp-a', voter_name: 'Alice' },
        { rsvp_id: 'rsvp-b', voter_name: 'Bob' },
      ],
    },
    {
      id: 'opt-2',
      poll_id: 'poll-1',
      name: 'Script B',
      url: 'https://example.com/b',
      created_at: '2024-01-01T00:00:00.000Z',
      votes: [{ rsvp_id: 'rsvp-c', voter_name: 'Charlie' }],
    },
  ],
};

const loggedInUser: User = { id: 'rsvp-x', token: 'token-x' };

describe('PollWidget — no poll', () => {
  it('renders nothing visible when poll is null and user is not admin', () => {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows Add script vote button when poll is null and user is admin', () => {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    expect(screen.getByRole('button', { name: /Add script vote/ })).toBeInTheDocument();
  });

  it('shows create form when admin clicks Add script vote', async () => {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Add script vote/ }));
    expect(screen.getByText('Create script vote')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Vote for tonight/)).toBeInTheDocument();
  });

  it('cancels the create form when Cancel is clicked', async () => {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Add script vote/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Create script vote')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add script vote/ })).toBeInTheDocument();
  });

  it('shows validation error when submitting create form without data', async () => {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Add script vote/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));
    expect(screen.getByText(/title and at least one option/i)).toBeInTheDocument();
  });
});

describe('PollWidget — open poll', () => {
  it('displays the poll title', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText("Vote for tonight's script")).toBeInTheDocument();
  });

  it('shows Voting open status badge', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText('Voting open')).toBeInTheDocument();
  });

  it('shows all option names', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText('Script A')).toBeInTheDocument();
    expect(screen.getByText('Script B')).toBeInTheDocument();
  });

  it('shows "RSVP first" message when no user', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText(/RSVP first to participate/)).toBeInTheDocument();
  });

  it('shows vote checkboxes when user is logged in', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(openPoll.options.length);
  });

  it('shows Save vote button when user is logged in', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByRole('button', { name: 'Save vote' })).toBeInTheDocument();
  });

  it('pre-selects options the user has already voted for', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // opt-2 has a vote from rsvp-x (= loggedInUser.id), opt-1 has no vote
    const [cbA, cbB] = checkboxes;
    expect(cbA).not.toBeChecked();
    expect(cbB).toBeChecked();
  });

  it('toggles checkbox when user clicks an option', async () => {
    render(PollWidget, {
      props: { poll: openPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    const [cbA] = screen.getAllByRole('checkbox');
    expect(cbA).not.toBeChecked();
    await fireEvent.change(cbA);
    expect(cbA).toBeChecked();
  });

  it('hides RSVP first message when user is logged in', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.queryByText(/RSVP first/)).not.toBeInTheDocument();
  });

  it('shows existing vote count per option', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    // Script A has 0 votes, Script B has 1
    expect(screen.getByText('0 votes')).toBeInTheDocument();
    expect(screen.getByText('1 vote')).toBeInTheDocument();
  });

  it('shows admin controls when isAdmin is true', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    expect(screen.getByRole('button', { name: 'Close voting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides admin controls when isAdmin is false', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.queryByRole('button', { name: 'Close voting' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('opens the edit form when admin clicks Edit', async () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Poll title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('closes edit form when Cancel is clicked', async () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('shows option description when present', () => {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText('A description')).toBeInTheDocument();
  });
});

describe('PollWidget — create form option management', () => {
  async function openCreateForm() {
    render(PollWidget, {
      props: { poll: null, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Add script vote/ }));
  }

  it('starts with one option row and no Remove button', async () => {
    await openCreateForm();
    expect(screen.queryByRole('button', { name: 'Remove option' })).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(1);
  });

  it('"Add another option" adds a second option row', async () => {
    await openCreateForm();
    await fireEvent.click(screen.getByRole('button', { name: /Add another option/ }));
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Remove option' })).toHaveLength(2);
  });

  it('"Remove option" removes that row and hides Remove buttons when only one remains', async () => {
    await openCreateForm();
    await fireEvent.click(screen.getByRole('button', { name: /Add another option/ }));
    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[0]);
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Remove option' })).not.toBeInTheDocument();
  });
});

describe('PollWidget — edit form option management', () => {
  async function openEditForm() {
    render(PollWidget, {
      props: { poll: openPoll, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  }

  it('edit form shows one row per poll option', async () => {
    await openEditForm();
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(openPoll.options.length);
    expect(screen.getAllByRole('button', { name: 'Remove option' })).toHaveLength(openPoll.options.length);
  });

  it('"Add another option" in edit form adds a new row', async () => {
    await openEditForm();
    await fireEvent.click(screen.getByRole('button', { name: /Add another option/ }));
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(openPoll.options.length + 1);
    expect(screen.getAllByRole('button', { name: 'Remove option' })).toHaveLength(openPoll.options.length + 1);
  });

  it('"Remove option" in edit form removes that row', async () => {
    await openEditForm();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[1]);
    expect(screen.getAllByPlaceholderText('Script name')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Remove option' })).not.toBeInTheDocument();
  });
});

describe('PollWidget — closed poll', () => {
  it('shows Voting closed status badge', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText('Voting closed')).toBeInTheDocument();
  });

  it('does not show vote checkboxes', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('does not show Save vote button', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: loggedInUser, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.queryByRole('button', { name: 'Save vote' })).not.toBeInTheDocument();
  });

  it('shows sorted results with vote counts', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText('Script A')).toBeInTheDocument();
    expect(screen.getByText('Script B')).toBeInTheDocument();
    expect(screen.getByText('2 votes')).toBeInTheDocument();
    expect(screen.getByText('1 vote')).toBeInTheDocument();
  });

  it('shows voter names for closed results', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(screen.getByText(/Alice.*Bob|Bob.*Alice/)).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows Re-open button for admin when poll is closed', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: undefined, isAdmin: true, eventId: 'evt-1' },
    });
    expect(screen.getByRole('button', { name: 'Re-open' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close voting' })).not.toBeInTheDocument();
  });

  it('options sorted by votes descending (most voted first in the DOM)', () => {
    render(PollWidget, {
      props: { poll: closedPoll, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    const items = screen.getAllByRole('listitem');
    const scriptAIndex = items.findIndex(li => li.textContent?.includes('Script A'));
    const scriptBIndex = items.findIndex(li => li.textContent?.includes('Script B'));
    // Script A has 2 votes, Script B has 1 vote, so A appears before B
    expect(scriptAIndex).toBeLessThan(scriptBIndex);
  });

  it('poll option name with XSS payload renders as text, not markup', () => {
    const pollWithXss = {
      ...closedPoll,
      options: [
        {
          ...closedPoll.options[0],
          name: '<img src=x onerror=alert(1)>',
          votes: [],
        },
      ],
    };
    render(PollWidget, {
      props: { poll: pollWithXss, user: undefined, isAdmin: false, eventId: 'evt-1' },
    });
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.body.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
