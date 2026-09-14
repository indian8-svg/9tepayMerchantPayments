import pool from './backend/db.js';
import { getUser } from './backend/db-service.js';

async function getProfileForUser(userId: string) {
  const profileRes = await pool.query("SELECT * FROM merchant_profiles WHERE user_id = $1", [userId]);
  return profileRes.rows[0];
}

async function getBankAccountsForUser(userId: string) {
  const res = await pool.query("SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC", [userId]);
  return res.rows;
}

async function test() {
  try {
    const found = await getUser('rohankr77800@gmail.com');
    console.log('found:', found);
    
    if (found.status === 'pending_kyc' && found.isEmailVerified === false) {
      console.log('Needs email verification');
      return;
    }
    
    const totpRes = await pool.query('SELECT secret FROM totp_secrets WHERE user_id = $1', [found.id]);
    console.log('totpRes:', totpRes.rows);
    
    const userProf = await getProfileForUser(found.id);
    console.log('userProf:', userProf);
    
    const userBanks = await getBankAccountsForUser(found.id);
    console.log('userBanks:', userBanks);
    
  } catch (error) {
    console.error('Login Error:', error);
  } finally {
    process.exit(0);
  }
}
test();
