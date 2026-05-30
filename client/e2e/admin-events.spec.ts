import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

async function createEvent(request: any) {
  const res = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'Admin Events Test Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue',
    },
  });
  return ((await res.json()).event.id) as string;
}

test.describe('Admin — events list', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.get(`${API}/admin/events`, { headers: { Authorization: AUTH } });
    const { events } = await res.json();
    for (const event of events) {
      await request.delete(`${API}/admin/events/${event.id}`, { headers: { Authorization: AUTH } });
    }
  });

  test('shows unauthorized message when not logged in', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText(/unauthorized/i)).toBeVisible();
  });

  test('shows the events list when logged in', async ({ page, request }) => {
    await createEvent(request);
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });
    await page.goto('/events');
    await expect(page.getByText('Admin Events Test Event')).toBeVisible();
  });

  test('deletes an event and removes it from the list', async ({ page, request }) => {
    await createEvent(request);
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/events');
    await expect(page.getByText('Admin Events Test Event')).toBeVisible();

    await page.getByRole('button', { name: 'Delete event' }).first().click();
    await expect(page.getByText('Admin Events Test Event')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin — edit event', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });
  });

  test('can edit an event name', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}/edit`);
    await expect(page.getByRole('heading', { name: 'Edit Event' })).toBeVisible();
    await page.locator('#name').fill('Updated Event Name');
    await page.click('button[type=submit]');
    await page.waitForURL(`/events/${eventId}`);
    await expect(page.getByText('Updated Event Name').first()).toBeVisible();
  });
});

test.describe('Admin — auth guard', () => {
  test('navigating to /create-event without credentials shows unauthorized state', async ({ page }) => {
    await page.goto('/create-event');
    await expect(page.getByText(/not authorized/i)).toBeVisible();
  });
});
