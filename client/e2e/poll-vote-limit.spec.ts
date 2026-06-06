import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

// Creates an event with one RSVP and a poll that limits each voter to `maxVotes`
// selections across three options (Chips, Pretzels, Popcorn).
async function setupLimitedPoll(request: any, maxVotes: number) {
  const eventRes = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'Poll Vote Limit Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue',
    },
  });
  const eventId = (await eventRes.json()).event.id as string;

  const rsvpRes = await request.post(`${API}/events/${eventId}/rsvp`, {
    data: { name: 'Limit Tester', status: 'going' },
  });
  const { rsvp } = await rsvpRes.json();

  const pollRes = await request.post(`${API}/admin/events/${eventId}/poll`, {
    headers: { Authorization: AUTH },
    data: {
      title: 'Favourite Snack',
      maxVotes,
      options: [
        { name: 'Chips', url: 'https://example.com/chips' },
        { name: 'Pretzels', url: 'https://example.com/pretzels' },
        { name: 'Popcorn', url: 'https://example.com/popcorn' },
      ],
    },
  });
  const pollId = (await pollRes.json()).poll.id as string;

  return { eventId, rsvpId: rsvp.id as string, token: rsvp.token as string, pollId };
}

test.describe('Poll vote limit', () => {
  test('user cannot select more options than the poll allows', async ({ page, request }) => {
    const { eventId, rsvpId, token } = await setupLimitedPoll(request, 2);

    await page.addInitScript(
      ({ eventId, rsvpId, token }: { eventId: string; rsvpId: string; token: string }) => {
        localStorage.setItem('my_events', JSON.stringify({ [eventId]: { [rsvpId]: token } }));
      },
      { eventId, rsvpId, token }
    );

    await page.goto(`/events/${eventId}`);

    // Hint reflects the limit and starts at zero selected.
    await expect(page.getByText('Select up to 2 options. (0 selected)')).toBeVisible();

    const chips = page.locator('li').filter({ hasText: 'Chips' });
    const pretzels = page.locator('li').filter({ hasText: 'Pretzels' });
    const popcorn = page.locator('li').filter({ hasText: 'Popcorn' });

    // Select the two allowed options.
    await chips.locator('input[type="checkbox"]').check();
    await pretzels.locator('input[type="checkbox"]').check();
    await expect(page.getByText('Select up to 2 options. (2 selected)')).toBeVisible();

    // At the limit, the third option is disabled and cannot be selected.
    await expect(popcorn.locator('input[type="checkbox"]')).toBeDisabled();

    // Saving stores exactly the two selected votes.
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(chips.getByText('1 vote')).toBeVisible();
    await expect(pretzels.getByText('1 vote')).toBeVisible();
    await expect(popcorn.getByText('0 votes')).toBeVisible();

    // Deselecting one option re-enables the disabled option.
    await chips.locator('input[type="checkbox"]').uncheck();
    await expect(popcorn.locator('input[type="checkbox"]')).toBeEnabled();
  });
});
