const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(/function selectRoutedBank/g, 'async function selectRoutedBank');
c = c.replace(/(?<!function |async function |await )selectRoutedBank\(/g, 'await selectRoutedBank(');
c = c.replace(/selectRoutedBank\([\s\S]*?\): BankAccountItem \{/g, match => match.replace(': BankAccountItem {', ': Promise<BankAccountItem> {'));

c = c.replace(/function getBankAccountsForUser/g, 'async function getBankAccountsForUser');
c = c.replace(/(?<!function |async function |await )getBankAccountsForUser\(/g, 'await getBankAccountsForUser(');
c = c.replace(/getBankAccountsForUser\([\s\S]*?\): BankAccountItem\[\] \{/g, match => match.replace(': BankAccountItem[] {', ': Promise<BankAccountItem[]> {'));

c = c.replace(/(?<!function |async function |await )getProfileForUser\(/g, 'await getProfileForUser(');

c = c.replace(/merchantsList\.find\(\(m\) => m\.id === (.*?)\)/g, '(await pool.query("SELECT * FROM users WHERE id = $1", [$1])).rows[0]');
c = c.replace(/merchantsList\.findIndex\(\(m\) => m\.id === (.*?)\)/g, '(-1) /* deprecated */');

c = c.replace(/passwordResetMap\.set\((.*?), {\s*userId: (.*?),\s*tokenHash: (.*?),\s*expiresAt: (.*?)\s*}\)/g, 
  'await pool.query("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at", [$2, $3, $4])');
c = c.replace(/passwordResetMap\.delete\((.*?)\)/g, 'await pool.query("DELETE FROM password_resets WHERE user_id = $1", [$1])');

c = c.replace(/emailVerificationMap\.set\((.*?),\s*{\s*userId: (.*?),\s*codeHash: (.*?),\s*expiresAt: (.*?)\s*}\)/g, 
  'await pool.query("INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at", [$2, $3, $4])');
c = c.replace(/emailVerificationMap\.delete\((.*?)\)/g, 'await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [$1])');

c = c.replace(/totpSecretsMap\.set\((.*?), (.*?)\)/g, 'await pool.query("INSERT INTO totp_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret", [$1, $2])');
c = c.replace(/totpSecretsMap\.delete\((.*?)\)/g, 'await pool.query("DELETE FROM totp_secrets WHERE user_id = $1", [$1])');

fs.writeFileSync('server-postgres.ts', c);
