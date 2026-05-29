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

## Testing

Tests run with [Vitest](https://vitest.dev) in a jsdom environment:

```sh
yarn test          # run once
yarn test:watch    # watch mode
yarn test:coverage # with coverage
```

Tests live in `src/__tests__/`:
- `utils/` — unit tests for the utility functions
- `components/` and `routes/` — component and page tests rendered with
  [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
