import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

test.describe('Capacity changes', () => {
  test('expanding maxAttendees removes waitlist status for previously waitlisted user', async ({
    page,
    request,
    browser,
  }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Capacity Expand Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
        maxAttendees: 1,
      },
    });
    const eventId = (await res.json()).event.id as string;

    // User 1 fills the single spot
    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', 'First User');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // User 2 ends up on waitlist
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`/events/${eventId}`);
    await page2.fill('#attendeeName', 'Second User');
    await page2.click('button[type=submit]:has-text("Submit")');
    await expect(page2.getByText('Your response was saved!')).toBeVisible();
    await expect(page2.getByText(/Waitlist/i)).toBeVisible();

    // Admin expands capacity to 2
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });
    await request.patch(`${API}/admin/events/${eventId}`, {
      headers: { Authorization: AUTH },
      data: { maxAttendees: 2 },
    });

    // After reload, User 2 should no longer be on the waitlist
    await page2.reload();
    await expect(page2.getByText(/Waitlist/i)).not.toBeVisible({ timeout: 5000 });
    await expect(page2.getByText('Going', { exact: true })).toBeVisible();

    await ctx2.close();
  });

  test('shrinking maxAttendees below current count puts later RSVPs on waitlist', async ({
    page,
    request,
    browser,
  }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Capacity Shrink Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
        maxAttendees: 3,
      },
    });
    const eventId = (await res.json()).event.id as string;

    // Three users all RSVP as going
    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', 'User One');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`/events/${eventId}`);
    await page2.fill('#attendeeName', 'User Two');
    await page2.click('button[type=submit]:has-text("Submit")');
    await expect(page2.getByText('Your response was saved!')).toBeVisible();
    await expect(page2.getByText('Going', { exact: true })).toBeVisible();

    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();
    await page3.goto(`/events/${eventId}`);
    await page3.fill('#attendeeName', 'User Three');
    await page3.click('button[type=submit]:has-text("Submit")');
    await expect(page3.getByText('Your response was saved!')).toBeVisible();
    await expect(page3.getByText('Going', { exact: true })).toBeVisible();

    // Admin shrinks capacity to 1
    await request.patch(`${API}/admin/events/${eventId}`, {
      headers: { Authorization: AUTH },
      data: { maxAttendees: 1 },
    });

    // After reload, users 2 and 3 should be on the waitlist
    await page2.reload();
    await expect(page2.getByText(/Waitlist/i)).toBeVisible({ timeout: 5000 });

    await page3.reload();
    await expect(page3.getByText(/Waitlist/i)).toBeVisible({ timeout: 5000 });

    await ctx2.close();
    await ctx3.close();
  });
});

test.describe('Group RSVP attendee list', () => {
  test('both Alice and Bob appear in attendee list after group RSVP', async ({ page, request }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Group RSVP Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
      },
    });
    const eventId = (await res.json()).event.id as string;

    await page.goto(`/events/${eventId}`);

    // First RSVP as Alice
    await page.fill('#attendeeName', 'Alice');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Add +1 as Bob
    await page.getByRole('button', { name: /Bringing a \+1/i }).click();
    await page.fill('#attendeeName', 'Bob');
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    // Open attendee list
    await page.getByRole('button', { name: /Show Responses/i }).click();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
  });
});

test.describe('Past event grouping', () => {
  test('event with past date appears under Past Events in admin /events list', async ({
    page,
    request,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });

    await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'Old Time Event',
        date: '2000-01-01',
        startTime: '12:00',
        endTime: '14:00',
        location: 'History',
      },
    });

    await page.goto('/events');
    await expect(page.getByText('Past Events')).toBeVisible();
    await expect(page.getByText('Old Time Event')).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('navigating to a non-existent route shows 404 Not Found', async ({ page }) => {
    await page.goto('/not-a-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Not Found')).toBeVisible();
  });
});

test.describe('XSS smoke test', () => {
  test('RSVP name with script tag renders as text, not injected HTML', async ({ page, request }) => {
    const res = await request.post(`${API}/admin/create-event`, {
      headers: { Authorization: AUTH },
      data: {
        name: 'XSS Test Event',
        date: '2099-12-25',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Test Venue',
      },
    });
    const eventId = (await res.json()).event.id as string;

    const xssName = '<script>window.__xss=1</script>Mallory';

    await page.goto(`/events/${eventId}`);
    await page.fill('#attendeeName', xssName);
    await page.click('button[type=submit]:has-text("Submit")');
    await expect(page.getByText('Your response was saved!')).toBeVisible();

    await page.getByRole('button', { name: /Show Responses/i }).click();

    // The raw text (including angle brackets) should appear in the DOM as text
    await expect(page.getByText(/Mallory/)).toBeVisible();

    // The script tag must NOT have been injected — window.__xss should be undefined
    const injected = await page.evaluate(() => (window as any).__xss);
    expect(injected).toBeUndefined();
  });
});
