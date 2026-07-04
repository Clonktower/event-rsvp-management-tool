import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

test.describe('Poll voting', () => {
  test('can vote on a poll option and see the vote count update', async ({ page, request }) => {
    const eventRes = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Poll Voting Test Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
      },
    });
    const eventId = (await eventRes.json()).event.id as string;

    const rsvpRes = await request.post(`${API}/events/${eventId}/rsvp`, {
      data: { name: 'Poll Voter', status: 'going' },
    });
    const { rsvp } = await rsvpRes.json();
    const rsvpId = rsvp.id as string;
    const token = rsvp.token as string;

    await request.post(`${API}/admin/events/${eventId}/poll`, {
      headers: { Authorization: AUTH },
      data: {
        title: 'Script Vote',
        options: [
          { name: 'Script A', url: 'https://example.com/a' },
          { name: 'Script B', url: 'https://example.com/b' },
        ],
      },
    });

    await page.addInitScript(
      ({ eventId, rsvpId, token }: { eventId: string; rsvpId: string; token: string }) => {
        localStorage.setItem('my_events', JSON.stringify({ [eventId]: { [rsvpId]: token } }));
      },
      { eventId, rsvpId, token }
    );

    await page.goto(`/events/${eventId}`);

    const optionA = page.locator('li').filter({ hasText: 'Script A' });
    const optionB = page.locator('li').filter({ hasText: 'Script B' });

    // Vote for Script A
    await optionA.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(optionA.getByText('1 vote')).toBeVisible();

    // Switch vote to Script B
    await optionA.locator('input[type="checkbox"]').uncheck();
    await optionB.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Save vote' }).click();
    await expect(page.getByText('Vote saved!')).toBeVisible();
    await expect(optionA.getByText('0 votes')).toBeVisible();
    await expect(optionB.getByText('1 vote')).toBeVisible();
  });
});
