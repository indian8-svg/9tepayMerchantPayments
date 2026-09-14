const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');

// emailVerificationMap
content = content.replace(/emailVerificationMap\.set\(email\.toLowerCase\(\), \{\s*userId,\s*codeHash: hashAuthCode\(code\),\s*expiresAt: Date\.now\(\) \+ 10 \* 60 \* 1000,\s*\}\);/g, 'await pool.query("INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at", [userId, hashAuthCode(code), Date.now() + 10 * 60 * 1000]);');

content = content.replace(/const pending = emailVerificationMap\.get\(email\);/g, 'const evRes = await pool.query("SELECT * FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)", [email]); const pending = evRes.rows.length ? { userId: evRes.rows[0].user_id, codeHash: evRes.rows[0].code_hash, expiresAt: Number(evRes.rows[0].expires_at) } : null;');

// passwordResetMap
content = content.replace(/passwordResetMap\.set\(email, \{\s*userId: merchant\.id,\s*tokenHash: hashAuthCode\(token\),\s*expiresAt: Date\.now\(\) \+ 15 \* 60 \* 1000,\s*\}\);/g, 'await pool.query("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at", [merchant.id, hashAuthCode(token), Date.now() + 15 * 60 * 1000]);');

content = content.replace(/const entry = \[\.\.\.passwordResetMap\.entries\(\)\]\.find\(\s*\(\[, value\]\) => value\.expiresAt >= Date\.now\(\) && value\.tokenHash === hashAuthCode\(token\)\s*\);/g, 'const prRes = await pool.query("SELECT * FROM password_resets WHERE token_hash = $1 AND expires_at >= $2", [hashAuthCode(token), Date.now()]); const entry = prRes.rows.length ? [prRes.rows[0].user_id, { userId: prRes.rows[0].user_id }] : null;');

// verifiedEmailUsers
content = content.replace(/verifiedEmailUsers\.add\(pending\.userId\);/g, 'await pool.query("UPDATE users SET is_email_verified = true WHERE id = $1", [pending.userId]);');

// get rid of map declarations
content = content.replace(/const emailVerificationMap = new Map<string, \{ userId: string; codeHash: string; expiresAt: number \}>\(\);/g, '');
content = content.replace(/const passwordResetMap = new Map<string, \{ userId: string; tokenHash: string; expiresAt: number \}>\(\);/g, '');
content = content.replace(/const totpSecretsMap = new Map<string, string>\(\);/g, '');
content = content.replace(/const pendingTwoFactorLogins = new Map<string, \{ userId: string; expiresAt: number \}>\(\);/g, '');

fs.writeFileSync('backend/server.ts', content);
