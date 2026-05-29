import dotenv from 'dotenv';

// Load variables from .env for local dev (and as a no-op fallback in the
// container, where the runtime already injects them). We deliberately skip this
// under test: the test runner injects its own env (see vitest.config.ts), and
// loading .env there could pull real/prod values into the test process.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_USER: process.env.ADMIN_USER,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
};

export default config;
