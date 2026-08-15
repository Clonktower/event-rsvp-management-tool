import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

// The rest of the suite depends on the root layout marking <body> as hydrated.
// If that marker is ever removed, every other spec would go back to racing
// hydration and failing intermittently on slower machines. These tests make that
// breakage obvious and immediate instead.
test.describe('hydration marker', () => {
  test('is set on the body once the client app takes over', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('body[data-hydrated="true"]')).toBeAttached();
  });

  test('is absent before hydration, so waiting on it is meaningful', async ({ page }) => {
    // 'commit' resolves as soon as the response starts, before scripts run. The
    // SSR'd form is already present at this point, which is why Playwright will
    // happily click it — but the marker is not, which is what makes the wait work.
    await page.goto('/admin/login', { waitUntil: 'commit' });
    expect(await page.locator('form').count()).toBe(1);
    expect(await page.evaluate(() => document.body.dataset.hydrated ?? null)).toBeNull();
  });

  test('a form submits through its JS handler once hydrated', async ({ page }) => {
    // Guards the actual failure mode: a pre-hydration click falls through to a
    // native GET submit, landing on /admin/login?name=... instead of /events.
    await gotoHydrated(page, '/admin/login');
    await page.fill('#name', 'e2eadmin');
    await page.fill('#password', 'e2epass');
    await page.click('button[type=submit]');
    await page.waitForURL('/events');
    expect(page.url()).not.toContain('?name=');
  });
});
