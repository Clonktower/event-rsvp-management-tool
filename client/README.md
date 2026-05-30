# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## End-to-end tests

End-to-end tests run with [Playwright](https://playwright.dev) against the real
app. The Playwright config starts the API server (in-memory SQLite) and the
SvelteKit dev server automatically before the tests.

```sh
yarn playwright install chromium   # one-time: install the browser
yarn test:e2e                       # run the suite
yarn test:e2e:ui                    # interactive UI mode
```

Specs live in `e2e/`.
