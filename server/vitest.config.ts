import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      // NODE_ENV=test makes config/index.ts skip dotenv and app.ts skip the
      // request logger, so the suite uses only the injected env.
      NODE_ENV: 'test',
      SQLITE_DB_PATH: ':memory:',
      ADMIN_USER: 'testadmin',
      ADMIN_PASSWORD: 'testpass',
    },
  },
});
