import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

async function createEvent(request: any) {
  const res = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'My RSVPs Test Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue',
    },
  });
  return ((await res.json()).event.id) as string;
}

test.describe('My RSVPs page', () => {
  test('shows empty state when user has no stored RSVPs', async ({ page }) => {
    await page.goto('/my/rsvps');
    await expect(page.getByText("You haven't RSVP'd to any events")).toBeVisible();
  });

  test('shows the event after RSVPing to it', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'My RSVPs User');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    await page.goto('/my/rsvps');
    await expect(page.getByText('My RSVPs Test Event')).toBeVisible();
    await expect(page.getByText(/Going/i)).toBeVisible();
  });

  test('shows group attendee badges when two RSVPs are stored for the same event', async ({ page, request }) => {
    const eventId = await createEvent(request);

    // First RSVP
    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', 'Alice');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Add a +1 via the "Bringing a +1?" button so a second RSVP is stored
    await page.getByRole('button', { name: /Bringing a \+1/i }).click();
    await page.fill('#attendeeName', 'Bob');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    await page.goto('/my/rsvps');
    // Both attendee names should be visible as per-attendee badges
    await expect(page.getByText(/Alice/)).toBeVisible();
    await expect(page.getByText(/Bob/)).toBeVisible();
  });

  test('shows empty state after RSVPed event is deleted', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'Stale RSVP User');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    await request.delete(`${API}/admin/events/${eventId}`, {
      headers: { Authorization: AUTH },
    });

    await page.goto('/my/rsvps');
    await expect(page.getByText("You haven't RSVP'd to any events")).toBeVisible();
  });

  test('shows empty state after admin deletes the individual RSVP server-side', async ({
    page,
    request,
  }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'Server-Deleted User');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Fetch the RSVP id from the event detail page's stored localStorage
    const rsvpId = await page.evaluate((eId: string) => {
      const stored = JSON.parse(localStorage.getItem('my_events') || '{}');
      return Object.keys(stored[eId] || {})[0] ?? null;
    }, eventId);
    expect(rsvpId).toBeTruthy();

    // Admin deletes the individual RSVP (not the whole event)
    const delRes = await request.delete(`${API}/admin/events/rsvp/${rsvpId}`, {
      headers: { Authorization: AUTH },
    });
    expect(delRes.ok()).toBeTruthy();

    await page.goto('/my/rsvps');
    await expect(page.getByText("You haven't RSVP'd to any events")).toBeVisible();
  });
});
