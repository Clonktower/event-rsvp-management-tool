import pool from './index';

async function seed() {
  try {
    // Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        max_attendees INTEGER,
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create attendees table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendees (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        rsvp_status VARCHAR(10),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    // Only close the pool if this script is run directly
    if (require.main === module) {
      await pool.end();
    }
  }
}

seed();
