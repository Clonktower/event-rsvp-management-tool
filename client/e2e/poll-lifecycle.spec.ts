import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

async function setupEventWithRsvpAndPoll(request: any) {
  const eventRes = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'Poll Lifecycle Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue',
    },
  });
  const eventId = (await eventRes.json()).event.id as string;

  const rsvpRes = await request.post(`${API}/events/${eventId}/rsvp`, {
    data: { name: 'Poll Tester', status: 'going' },
  });
  const { rsvp } = await rsvpRes.json();

  const pollRes = await request.post(`${API}/admin/events/${eventId}/poll`, {
    headers: { Authorization: AUTH },
    data: {
      title: 'Favourite Snack',
      options: [
        { name: 'Chips', url: 'https://example.com/chips' },
        { name: 'Pretzels', url: 'https://example.com/pretzels' },
      ],
    },
  });
  const poll = (await pollRes.json()).poll;
  const options = poll.options as { id: string; name: string; url: string }[];

  return {
    eventId,
    rsvpId: rsvp.id as string,
    token: rsvp.token as string,
    pollId: poll.id as string,
    options,
  };
}

test.describe('Poll lifecycle', () => {
  test('admin closes poll: voting disabled, results still visible', async ({ page, request }) => {
    const { eventId, rsvpId, token, pollId } = await setupEventWithRsvpAndPoll(request);

    await page.addInitScript(
      ({ eventId, rsvpId, token }: { eventId: string; rsvpId: string; token: string }) => {
        localStorage.setItem('my_events', JSON.stringify({ [eventId]: { [rsvpId]: token } }));
      },
      { eventId, rsvpId, token }
    );

    // Cast a vote before closing
    await request.post(`${API}/polls/${pollId}/vote`, {
      data: { rsvpId, token, optionIds: [] },
    });

    // Admin closes the poll
    const closeRes = await request.patch(`${API}/admin/polls/${pollId}/close`, {
      headers: { Authorization: AUTH },
    });
    expect(closeRes.ok()).toBeTruthy();

    await page.goto(`/events/${eventId}`);

    // Vote checkboxes should be gone (poll is closed)
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);

    // Poll options (Chips, Pretzels) should still be visible
    await expect(page.getByText('Chips')).toBeVisible();
    await expect(page.getByText('Pretzels')).toBeVisible();
  });

  test('admin reopens poll: user can change vote', async ({ page, request }) => {
    const { eventId, rsvpId, token, pollId } = await setupEventWithRsvpAndPoll(request);

    await page.addInitScript(
      ({ eventId, rsvpId, token }: { eventId: string; rsvpId: string; token: string }) => {
        localStorage.setItem('my_events', JSON.stringify({ [eventId]: { [rsvpId]: token } }));
      },
      { eventId, rsvpId, token }
    );

    // Close then reopen
    await request.patch(`${API}/admin/polls/${pollId}/close`, { headers: { Authorization: AUTH } });
    const reopenRes = await request.patch(`${API}/admin/polls/${pollId}/reopen`, {
      headers: { Authorization: AUTH },
    });
    expect(reopenRes.ok()).toBeTruthy();

    await page.goto(`/events/${eventId}`);

    // Vote for Chips
    const chipsItem = page.locator('li').filter({ hasText: 'Chips' });
    await chipsItem.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(chipsItem.getByText('1 vote')).toBeVisible();

    // Change vote to Pretzels
    await chipsItem.locator('input[type="checkbox"]').uncheck();
    const pretzelsItem = page.locator('li').filter({ hasText: 'Pretzels' });
    await pretzelsItem.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(chipsItem.getByText('0 votes')).toBeVisible();
    await expect(pretzelsItem.getByText('1 vote')).toBeVisible();
  });

  test('admin adds a third option: existing votes preserved and user can vote for new option', async ({
    page,
    request,
  }) => {
    const { eventId, rsvpId, token, pollId, options } = await setupEventWithRsvpAndPoll(request);

    await page.addInitScript(
      ({ eventId, rsvpId, token }: { eventId: string; rsvpId: string; token: string }) => {
        localStorage.setItem('my_events', JSON.stringify({ [eventId]: { [rsvpId]: token } }));
      },
      { eventId, rsvpId, token }
    );

    // Vote for Chips first
    await page.goto(`/events/${eventId}`);
    await page.locator('li').filter({ hasText: 'Chips' }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();

    // Admin adds a third option via PATCH — include existing option IDs so votes are preserved
    const updateRes = await request.patch(`${API}/admin/polls/${pollId}`, {
      headers: { Authorization: AUTH },
      data: {
        title: 'Favourite Snack',
        options: [
          ...options.map((o) => ({ id: o.id, name: o.name, url: o.url })),
          { name: 'Popcorn', url: 'https://example.com/popcorn' },
        ],
      },
    });
    expect(updateRes.ok()).toBeTruthy();

    await page.reload();

    // Chips vote should still be there
    await expect(page.locator('li').filter({ hasText: 'Chips' }).getByText('1 vote')).toBeVisible();

    // New option should be present and voteable
    const popcornItem = page.locator('li').filter({ hasText: 'Popcorn' });
    await expect(popcornItem).toBeVisible();
    await popcornItem.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(popcornItem.getByText('1 vote')).toBeVisible();
  });

  test('admin deletes poll: widget disappears from event page', async ({ page, request }) => {
    const { eventId, pollId } = await setupEventWithRsvpAndPoll(request);

    await page.goto(`/events/${eventId}`);
    await expect(page.getByText('Favourite Snack')).toBeVisible();

    const deleteRes = await request.delete(`${API}/admin/polls/${pollId}`, {
      headers: { Authorization: AUTH },
    });
    expect(deleteRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText('Favourite Snack')).not.toBeVisible({ timeout: 5000 });
  });
});
