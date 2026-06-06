import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

// Log in as admin and auto-accept dialogs (the forms/draw use alerts + confirm).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('credentials', 'e2eadmin:e2epass');
  });
  page.on('dialog', (dialog) => dialog.accept());
});

test.describe('Lottery — create and draw', () => {
  test('admin creates a lottery event via the form, then runs the draw', async ({ page, browser }) => {
    // Create the event through the real form, choosing Lottery mode.
    await page.goto('/create-event');
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible();
    await page.fill('input[name="name"]', 'Lottery Night');
    await page.fill('input[name="date"]', '2099-06-15');
    await page.fill('input[name="startTime"]', '19:00');
    await page.fill('input[name="endTime"]', '23:00');
    await page.fill('input[name="maxAttendees"]', '10');
    await page.fill('input[name="location"]', 'The Venue');
    await page.selectOption('#selectionMode', 'lottery');
    await page.click('button[type=submit]');

    await page.getByRole('link', { name: 'View Event' }).click();

    // Before the draw: the lottery banner and the admin draw button are shown.
    await expect(page.getByText(/lottery event/i)).toBeVisible();
    const drawButton = page.getByRole('button', { name: 'Run the draw' });
    await expect(drawButton).toBeVisible();

    // Two people sign up as going.
    await page.fill('#attendeeName', 'Alice');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(page.url());
    await page2.fill('#attendeeName', 'Bob');
    await page2.click('button[type=submit]:has-text("Submit")');
    await expect(page2.getByText('Your response was saved!')).toBeVisible();
    await ctx2.close();

    // Admin runs the draw; the UI flips to the drawn state and the button disappears.
    await drawButton.click();
    await expect(page.getByText(/allocated by random draw/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run the draw' })).toHaveCount(0);
  });

  test('hides the waitlist before the draw and reveals it afterwards', async ({ page, request, browser }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Lottery Seat Race',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
        maxAttendees: 1,
        selectionMode: 'lottery',
      },
    });
    const eventId = (await res.json()).event.id as string;

    // Two entrants for one seat.
    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', 'Alice');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`/events/${eventId}`);
    await page2.fill('#attendeeName', 'Bob');
    await page2.click('button[type=submit]:has-text("Submit")');
    await expect(page2.getByText('Your response was saved!')).toBeVisible();
    await ctx2.close();

    // Before the draw: both entrants listed, no waitlist split.
    await page.reload();
    await page.getByRole('button', { name: /Show Responses/i }).click();
    const attendeeList = page.locator('#attendees-list');
    await expect(attendeeList.getByText('In the draw')).toBeVisible();
    await expect(attendeeList.getByText('Waitlist', { exact: true })).toHaveCount(0);
    // The admin signed up while logged in, so their entry carries the priority
    // badge (the client must send credentials on the sign-up for this to work).
    await expect(attendeeList.getByText('Priority')).toBeVisible();

    // After the draw: capacity applies, so one entrant is waitlisted.
    await page.getByRole('button', { name: 'Run the draw' }).click();
    await expect(page.getByText(/allocated by random draw/i)).toBeVisible();
    await expect(attendeeList.getByText('Waitlist', { exact: true })).toBeVisible();
    await expect(attendeeList.getByText('In the draw')).toHaveCount(0);
  });

  test('lets a non-admin sign up before registration_opens_at (the draw is the gate)', async ({ request, browser }) => {
    // A lottery event with a registration window that has not opened yet. The
    // server ignores registration_opens_at for lottery, so the client must too:
    // a non-admin must be able to enter the draw, not be blocked by a countdown.
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Lottery Open Early',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
        maxAttendees: 10,
        selectionMode: 'lottery',
        registrationOpensAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
    const eventId = (await res.json()).event.id as string;

    // Visit as a non-admin (fresh context, no credentials).
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/events/${eventId}`);

    // No "Registration opens in" countdown, and the sign-up actually goes through.
    await expect(page.getByText(/Registration opens in/i)).toHaveCount(0);
    await page.fill('#attendeeName', 'EarlyBird');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    await ctx.close();
  });

  test('shows a priority badge and hides the draw button from non-admins', async ({ request, browser }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Lottery Badge Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
        maxAttendees: 10,
        selectionMode: 'lottery',
      },
    });
    const eventId = (await res.json()).event.id as string;

    // An admin-created RSVP is stamped with priority; a public one is not.
    await request.post(`${API}/events/${eventId}/rsvp`, {
      headers: { Authorization: AUTH },
      data: { name: 'Captain', status: 'going' },
    });
    await request.post(`${API}/events/${eventId}/rsvp`, {
      data: { name: 'Regular', status: 'going' },
    });

    // Visit as a non-admin (fresh context, no credentials).
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/events/${eventId}`);

    // The lottery banner is shown to everyone, but the draw button is admin-only.
    await expect(page.getByText(/lottery event/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run the draw' })).toHaveCount(0);

    // The priority entrant carries a visible badge in the attendee list.
    await page.getByRole('button', { name: /Show Responses/i }).click();
    await expect(page.getByText('Captain')).toBeVisible();
    await expect(page.getByText('Priority')).toBeVisible();

    await ctx.close();
  });
});
