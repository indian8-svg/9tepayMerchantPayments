const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');

// Line 708, 709 demo seeding (remove)
content = content.replace(/userPasswordsMap\.set\("merch_live_01", hashPassword\(process\.env\.DEMO_MERCHANT_PASSWORD \|\| "merchant123"\)\);/g, '');
content = content.replace(/userPasswordsMap\.set\("usr_admin_001", hashPassword\(process\.env\.ADMIN_PASSCODE \|\| crypto\.randomBytes\(24\)\.toString\("hex"\)\)\);/g, '');

// Line 1033
content = content.replace(/userPasswordsMap\.set\(entry\[1\]\.userId, hashPassword\(newPassword\)\);/g, 'await pool.query("UPDATE user_passwords SET password_hash = $1 WHERE user_id = $2", [hashPassword(newPassword), entry[1].userId]);');

// Line 1045, 1049
content = content.replace(/const storedHash = userPasswordsMap\.get\(req\.user\.id\);/g, 'const storedHash = await checkPassword(req.user.id);');
content = content.replace(/userPasswordsMap\.set\(req\.user\.id, hashPassword\(newPassword\)\);/g, 'await pool.query("UPDATE user_passwords SET password_hash = $1 WHERE user_id = $2", [hashPassword(newPassword), req.user.id]);');

// Line 1062
content = content.replace(/const storedAdminHash = userPasswordsMap\.get\("usr_admin_001"\);/g, 'const storedAdminHash = await checkPassword("usr_admin_001");');

// Fix sessionsMap usages in update password
content = content.replace(/for \(const \[token, session\] of sessionsMap\) \{[\s\S]*?\}/g, 'await pool.query("DELETE FROM sessions WHERE user_id = $1", [req.user.id]);');

// Fix sessionsMap in logout
content = content.replace(/sessionsMap\.delete\(parts\[1\]\);/g, 'await deleteSession(parts[1]);');

fs.writeFileSync('backend/server.ts', content);
