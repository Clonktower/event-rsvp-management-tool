import { Pool } from 'pg';

// You can use environment variables or hardcode for demo
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'event_rsvp',
  password: process.env.PGPASSWORD || 'password',
  port: Number(process.env.PGPORT) || 5432,
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
});

export default pool;

