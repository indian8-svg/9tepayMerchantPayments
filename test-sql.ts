import pool from './backend/db.js';

async function test() {
  try {
    const volRes = await pool.query("SELECT COALESCE(SUM(o.amount), 0) as total FROM orders o JOIN bank_accounts b ON o.bank_account_id = b.id WHERE b.user_id = $1 AND o.status = 'PAID'", ['merch_live_ch4d45']);
    console.log(volRes.rows);
  } catch (err) {
    console.error('SQL Error:', err);
  } finally {
    process.exit(0);
  }
}
test();
