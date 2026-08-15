import type { Page, Response } from '@playwright/test';

/**
 * Wait until the client app has hydrated.
 *
 * The SSR'd markup is in the DOM before any JavaScript runs, so Playwright's
 * auto-waiting is happy to click a submit button whose handler is not attached
 * yet. Every form in this app submits via `on:submit|preventDefault`, so such a
 * click falls through to a native GET submit: the URL becomes something like
 * `/admin/login?name=e2eadmin&password=...` and the test times out waiting for a
 * navigation that never happens.
 *
 * The root layout sets `data-hydrated` on <body> from `onMount`, which only runs
 * once the client app has taken over, so waiting on it closes the race. Load
 * states are not a substitute — hydration finishes somewhere between
 * `domcontentloaded` and `load`, and which side of `load` it lands on depends on
 * how fast the machine is. That is exactly why this only ever failed on CI.
 */
export async function waitForHydration(page: Page) {
  await page.waitForSelector('body[data-hydrated="true"]', { state: 'attached' });
}

/**
 * `page.goto` plus a hydration wait, returning the navigation response so callers
 * can still assert on the status. The error routes hydrate too, so this is safe
 * for 404 and 500 pages.
 */
export async function gotoHydrated(page: Page, url: string): Promise<Response | null> {
  const response = await page.goto(url);
  await waitForHydration(page);
  return response;
}
