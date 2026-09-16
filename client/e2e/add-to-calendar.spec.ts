import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gotoHydrated } from './helpers';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1';
// iPad Safari requests desktop sites by default, so it identifies as a Mac.
const SAFARI_IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15';

async function createEvent(request: APIRequestContext) {
  const res = await request.post(`${API}/admin/create-event`, {
    headers: { Authorization: AUTH },
    data: {
      name: 'E2E Calendar Event',
      date: '2099-12-25',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Test Venue, Berlin',
    },
  });
  const body = await res.json();
  return body.event.id as string;
}

async function openCalendarOptions(page: Page, eventId: string) {
  await gotoHydrated(page, `/events/${eventId}`);
  // The button renders into a shadow root; Playwright's CSS engine pierces it.
  await page.locator('add-to-calendar-button').getByText('Add to Calendar').click();
  const appleOption = page.locator('[id$="-apple"]');
  await expect(appleOption).toBeVisible();
  return appleOption;
}

test.describe('Add to Calendar', () => {
  test('choosing Apple downloads a calendar file for the event', async ({ page, request }) => {
    const eventId = await createEvent(request);
    const appleOption = await openCalendarOptions(page, eventId);

    const downloadPromise = page.waitForEvent('download');
    await appleOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    const ics = await readFile(await download.path(), 'utf8');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain(`UID:${eventId}`);
    expect(ics).toContain('SUMMARY:E2E Calendar Event');
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20991225T180000');
    expect(ics).toContain('DTEND;TZID=Europe/Berlin:20991225T220000');
    expect(ics).toContain('LOCATION:Test Venue\\, Berlin');
  });

  // iOS Safari refuses data: URL downloads, so on iPhone and iPad the Apple option
  // has to be a blob: link.
  test.describe('on iPhone', () => {
    test.use({ userAgent: SAFARI_IPHONE, hasTouch: true, isMobile: true, viewport: { width: 393, height: 852 } });

    test('the Apple option is a blob: link', async ({ page, request }) => {
      const eventId = await createEvent(request);
      const appleOption = await openCalendarOptions(page, eventId);

      await expect(appleOption).toHaveAttribute('href', /^blob:/);
    });
  });

  test.describe('on iPad', () => {
    test.use({ userAgent: SAFARI_IPAD, hasTouch: true, viewport: { width: 820, height: 1180 } });

    test('the Apple option is a blob: link', async ({ page, request }) => {
      await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 });
      });
      const eventId = await createEvent(request);
      const appleOption = await openCalendarOptions(page, eventId);

      await expect(appleOption).toHaveAttribute('href', /^blob:/);
    });
  });
});
