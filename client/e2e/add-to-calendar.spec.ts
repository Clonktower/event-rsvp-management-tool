import { expect, test, type APIRequestContext } from '@playwright/test';

const API = 'http://localhost:3000';
const AUTH = 'Basic e2eadmin:e2epass';

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

// The calendar button used to build a data: URL in the browser, which iOS
// Safari 26.6+ silently refuses. It now points at the API's .ics endpoint, so
// what matters end to end is that the advertised URL exists and serves a
// calendar file the browser will hand to a calendar app.
test.describe('Add to Calendar', () => {
  test('advertises an .ics URL for the event', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    const button = page.locator('add-to-calendar-button');
    await expect(button).toHaveAttribute('icsFile', `${API}/events/${eventId}/calendar.ics`);
  });

  test('the advertised URL serves a calendar file for the event', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    const icsUrl = await page.locator('add-to-calendar-button').getAttribute('icsFile');
    expect(icsUrl).toBeTruthy();

    const res = await request.get(icsUrl as string);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('text/calendar; charset=utf-8');

    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('SUMMARY:E2E Calendar Event');
    expect(body).toContain('LOCATION:Test Venue\\, Berlin');
    expect(body).toContain('DTSTART;TZID=Europe/Berlin:20991225T180000');
    expect(body).toContain('DTEND;TZID=Europe/Berlin:20991225T220000');
  });

  test('choosing Apple hands a calendar file to the browser', async ({ page, request }) => {
    const eventId = await createEvent(request);
    await page.goto(`/events/${eventId}`);

    // The button renders into a shadow root; Playwright's CSS engine pierces it.
    await page.locator('add-to-calendar-button').getByText('Add to Calendar').click();

    const appleOption = page.locator('[id$="-apple"]');
    await expect(appleOption).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await appleOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    expect(download.url()).toBe(`${API}/events/${eventId}/calendar.ics`);
  });
});
