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


    // Create rsvp table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvp (
        id UUID PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        guests INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, id)
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
