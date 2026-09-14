const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');

// Fix BankAccountItem mapping
content = content.replace(/bankLogo: row\.bank_logo\s*\}\)\);/g, 'bankLogo: row.bank_logo, createdAt: row.created_at }));');

// Fix qrType static
content = content.replace(/qrType: "static",/g, 'qrType: "static_soundbox",');

// Fix update-password async
content = content.replace(/app\.post\(\["\/api\/auth\/update-password", "\/auth\/update-password"\], requireAuth, \(req, res\) => \{/g, 'app.post(["/api/auth/update-password", "/auth/update-password"], requireAuth, async (req, res) => {');

// Fix logout async
content = content.replace(/app\.post\(\["\/api\/auth\/logout", "\/auth\/logout\.php", "\/api\/logout", "\/auth\/logout"\], \(_req, res\) => \{/g, 'app.post(["/api/auth/logout", "/auth/logout.php", "/api/logout", "/auth/logout"], async (_req, res) => {');

// Fix contact inquiries
content = content.replace(/contactInquiries\.unshift\(inquiry\);/g, 'await createContactInquiry(inquiry);');

// Fix contact inquiries async
content = content.replace(/app\.post\("\/api\/contact\/inquiries", authRateLimiter, \(req, res\) => \{/g, 'app.post("/api/contact/inquiries", authRateLimiter, async (req, res) => {');

// Fix userBankAccountsMap in API (GET /api/bank-accounts/:userId)
content = content.replace(/let bankAccounts = userBankAccountsMap\.get\(userId\) \|\| \[\];/g, 'let bankAccounts = await getBankAccountsForUser(userId);');

// Fix orders in PUT /api/admin/orders/:id
content = content.replace(/const order = orders\.find\(\(o\) => o\.id === id\);/g, 'const order = await getOrder(id);');

// Fix userBankAccountsMap in PUT /api/bank-accounts/:userId
content = content.replace(/userBankAccountsMap\.set\(userId, updatedAccounts\);/g, '');

fs.writeFileSync('backend/server.ts', content);
