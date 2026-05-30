import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
    alias: {
      $lib: '/src/lib',
      '$app/environment': '/src/__mocks__/app-environment.ts',
      '$app/stores': '/src/__mocks__/app-stores.ts',
    },
  },
});
