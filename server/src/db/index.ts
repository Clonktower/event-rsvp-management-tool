import Database from 'better-sqlite3';
import path from 'path';

// Use environment variable or default path
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/event_rsvp.db');
const db = new Database(dbPath);

export default db;
