import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      // NODE_ENV=test makes config/index.ts skip dotenv so tests never read .env
      NODE_ENV: 'test',
      SQLITE_DB_PATH: ':memory:',
      ADMIN_USER: 'testadmin',
      ADMIN_PASSWORD: 'testpass',
    },
  },
});
