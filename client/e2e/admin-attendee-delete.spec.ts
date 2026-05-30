import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

async function createEvent(request: any) {
  const res = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'Attendee Delete Test Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue',
    },
  });
  return ((await res.json()).event.id) as string;
}

test.describe('Admin — delete attendee', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('credentials', 'e2eadmin:e2epass');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('admin deletes attendee: name disappears and toast is shown', async ({ page, request }) => {
    const eventId = await createEvent(request);

    const rsvpRes = await request.post(`${API}/events/${eventId}/rsvp`, {
      data: { name: 'Deletable Alice', status: 'going' },
    });
    expect(rsvpRes.ok()).toBeTruthy();

    await page.goto(`/events/${eventId}`);
    await page.getByRole('button', { name: /Show Responses/i }).click();
    await expect(page.getByText('Deletable Alice')).toBeVisible();

    await page.getByRole('button', { name: 'Delete attendee' }).first().click();

    await expect(page.getByText('Attendee deleted!')).toBeVisible();
    await expect(page.getByText('Deletable Alice')).not.toBeVisible({ timeout: 5000 });
  });

  test('admin deletes one attendee out of two: other attendee remains', async ({ page, request }) => {
    const eventId = await createEvent(request);

    await request.post(`${API}/events/${eventId}/rsvp`, {
      data: { name: 'Keep Me', status: 'going' },
    });
    await request.post(`${API}/events/${eventId}/rsvp`, {
      data: { name: 'Delete Me', status: 'going' },
    });

    await page.goto(`/events/${eventId}`);
    await page.getByRole('button', { name: /Show Responses/i }).click();
    await expect(page.getByText('Delete Me')).toBeVisible();
    await expect(page.getByText('Keep Me')).toBeVisible();

    // Delete the first attendee in the list
    const deleteButtons = page.getByRole('button', { name: 'Delete attendee' });
    await deleteButtons.first().click();

    await expect(page.getByText('Attendee deleted!')).toBeVisible();
    // Exactly one attendee should remain
    await expect(page.getByRole('button', { name: 'Delete attendee' })).toHaveCount(1);
  });
});
