const fs = require('fs');

let content = fs.readFileSync('backend/server.ts', 'utf8');

// Replace 1160 (login)
content = content.replace(
  /const found = merchantsList\.find\(\s*\(m\) => m\.email\.toLowerCase\(\) === targetEmail \|\| m\.phone === targetEmail\s*\);/g,
  `const found = await getUser(targetEmail);`
);

// Replace 989 (2FA)
content = content.replace(
  /const merchant = merchantsList\.find\(\(item\) => item\.id === pending\.userId\);/g,
  `const merchant = await getUser(pending.userId);`
);

// Replace 1050 (Password reset)
content = content.replace(
  /const merchant = merchantsList\.find\(\(item\) => item\.email\.toLowerCase\(\) === email\);/g,
  `const merchant = await getUser(email);`
);

// Replace 1042 (2FA setup)
content = content.replace(
  /:\s*\(\(\) => { const m = merchantsList\.find\(\(item\) => item\.id === challenge\.userId\); return m \? { id: m\.id, name: m\.ownerName, email: m\.email, phone: m\.phone, role: "merchant" as const, businessName: m\.businessName, vpa: m\.vpa, status: m\.status, createdAt: m\.createdAt } : null; }\)\(\);/g,
  `: await getUser(challenge.userId);`
);

fs.writeFileSync('backend/server.ts', content);
