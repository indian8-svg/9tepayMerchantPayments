import pool from './backend/db.js';

async function test() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions'");
  console.log(res.rows);
  process.exit(0);
}
test();
