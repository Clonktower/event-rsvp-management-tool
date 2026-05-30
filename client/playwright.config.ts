import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both the API server and the SvelteKit dev server before tests run
  webServer: [
    {
      command: 'yarn dev',
      url: 'http://localhost:3000/ping',
      reuseExistingServer: false,
      cwd: '../server',
      env: {
        PORT: '3000',
        SQLITE_DB_PATH: ':memory:',
        ADMIN_USER: 'e2eadmin',
        ADMIN_PASSWORD: 'e2epass',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'vite dev --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
});
