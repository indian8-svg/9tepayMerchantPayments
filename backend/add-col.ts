import pool from './db.js';

async function run() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false');
    console.log('Added is_email_verified column');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
