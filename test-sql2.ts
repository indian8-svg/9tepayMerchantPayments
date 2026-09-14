import pool from './backend/db.js';

async function getProfileForUser(userId: string) {
  const profileRes = await pool.query("SELECT * FROM merchant_profiles WHERE user_id = $1", [userId]);
  return profileRes.rows[0];
}

async function test() {
  try {
    const adminProf = await getProfileForUser("usr_admin_001");
    console.log(adminProf);
  } catch (err) {
    console.error('SQL Error:', err);
  } finally {
    process.exit(0);
  }
}
test();
