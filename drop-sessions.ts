import pool from './backend/db.js';

async function test() {
  await pool.query('DROP TABLE IF EXISTS sessions');
  console.log('dropped');
  process.exit(0);
}
test();
