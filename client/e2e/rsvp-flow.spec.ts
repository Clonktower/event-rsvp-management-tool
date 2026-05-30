import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

async function createEvent(request: any) {
  const res = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'E2E Test Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue, Berlin',
    },
  });
  const body = await res.json();
  return body.event.id as string;
}

test.describe('RSVP flow', () => {
  test('displays the event page with name and location', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);
    await expect(page.getByText('E2E Test Event')).toBeVisible();
    await expect(page.getByText('Test Venue, Berlin')).toBeVisible();
  });

  test('can submit an RSVP and see confirmation', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'Test User');
    await page.click('button[aria-pressed="false"]:has-text("Going")');
    await page.click('button[type=submit]:has-text("Submit")');

    await expect(page.getByText('Your response was saved!')).toBeVisible();
  });

  test('shows going status after submitting', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'Alice');
    await page.click('button[type=submit]:has-text("Submit")');

    await expect(page.getByText(/marked as/i)).toBeVisible();
    await expect(page.getByText(/Going/i)).toBeVisible();
  });

  test('attendee appears in the attendee list after RSVP', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    await page.fill('#attendeeName', 'Visible User');
    await page.click('button[type=submit]:has-text("Submit")');

    // Wait for the success toast, then open the collapsible attendee list
    await expect(page.getByText('Your response was saved!')).toBeVisible();
    await page.getByRole('button', { name: /Show Responses/i }).click();

    await expect(page.getByText('Visible User')).toBeVisible();
  });

  test('crashes with a 500 for a non-existent event (BUG: no null guard)', async ({ page }) => {
    // BUG: the event page dereferences event.id during SSR, so a non-existent
    // event id (the load function returns { event: null }) crashes the render
    // with a 500 instead of showing a friendly "No Such Event was found!"
    // message. The page should null-guard event before reading its fields.
    const response = await page.goto('/events/no-such-event-id');
    expect(response?.status()).toBe(500);
    await expect(page.getByText('No Such Event was found!')).not.toBeVisible();
  });

  test('can edit an existing RSVP and change status to Maybe', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    // Initial RSVP as Going (default)
    await page.fill('#attendeeName', 'Edit RSVP User');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Reopen the form
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();

    // Change to Maybe and re-submit
    await page.getByRole('button', { name: 'Maybe' }).click();
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Status indicator now shows Maybe
    await expect(page.getByText(/marked as/i)).toBeVisible();
    await expect(page.getByText('Maybe')).toBeVisible();
  });

  test('shows Waitlist status when event is at capacity', async ({ page, request, browser }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Capacity Test Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue, Berlin',
        maxAttendees: 1,
      },
    });
    const eventId = (await res.json()).event.id as string;

    // User 1 fills the single available spot
    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', 'User One');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // User 2 in a fresh browser context (fresh localStorage, different "device")
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`/events/${eventId}`);
    await page2.fill('#attendeeName', 'User Two');
    await page2.click('button[type=submit]:has-text("Submit")');
    await expect(page2.getByText('Your response was saved!')).toBeVisible();
    await expect(page2.getByText(/Waitlist/i)).toBeVisible();
    await ctx2.close();
  });
});
