import { expect, test } from '@playwright/test';

// Log in before each admin test by presetting localStorage credentials
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('credentials', 'e2eadmin:e2epass');
  });
  // Auto-accept all browser dialogs (the form shows alerts for success/errors)
  page.on('dialog', (dialog) => dialog.accept());
});

test.describe('Admin — create event', () => {
  test('creates an event via the form and shows the event link', async ({ page }) => {
    await page.goto('/create-event');

    // Wait for the auth check to complete before filling the form
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible();

    await page.fill('input[name="name"]', 'Playwright Party');
    await page.fill('input[name="date"]', '2099-06-15');
    await page.fill('input[name="startTime"]', '19:00');
    await page.fill('input[name="endTime"]', '23:00');
    await page.fill('input[name="maxAttendees"]', '50');
    await page.fill('input[name="location"]', 'Playwright HQ');

    await page.click('button[type=submit]');

    // After the alert is dismissed, the page shows a "View Event" link
    await expect(page.getByRole('link', { name: 'View Event' })).toBeVisible({ timeout: 10000 });
  });

  test('shows an error when required fields are missing', async ({ page }) => {
    await page.goto('/create-event');
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible();

    // Submit with only name filled in — JS validation fires an alert and returns early
    await page.fill('input[name="name"]', 'Incomplete Event');
    await page.click('button[type=submit]');

    // The page stays at /create-event after the alert is dismissed
    await expect(page).toHaveURL('/create-event');
  });
});
