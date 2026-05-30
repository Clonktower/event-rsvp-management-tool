import { expect, test } from '@playwright/test';

test.describe('Admin login', () => {
  test('redirects to /events on valid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#name', 'e2eadmin');
    await page.fill('#password', 'e2epass');
    await page.click('button[type=submit]');
    await page.waitForURL('/events');
    expect(page.url()).toContain('/events');
  });

  test('shows error message for wrong credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#name', 'e2eadmin');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type=submit]');
    await expect(page.getByText('Invalid username or password')).toBeVisible();
    expect(page.url()).toContain('/admin/login');
  });
});
