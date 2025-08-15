import dotenv from 'dotenv';

dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_USER: process.env.ADMIN_USER,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
};

export default config;
