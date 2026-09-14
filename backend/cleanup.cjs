const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');

// Remove persistAuthData
content = content.replace(/function persistAuthData\(\) \{[\s\S]*?\}\s*restoreAuthData\(\);\s*/g, '');

// Remove declarations
content = content.replace(/let merchantsList: MerchantListItem\[\] = \[defaultDemoMerchant\];/g, '');
content = content.replace(/const defaultDemoMerchant = \{[\s\S]*?\};\s*/g, '');
content = content.replace(/const orders: OrderItem\[\] = \[\];/g, '');
content = content.replace(/const webhookLogs: WebhookLogItem\[\] = \[\];/g, '');
content = content.replace(/const userSecurityLogsMap = new Map<string, SecurityEventItem\[\]>\(\);/g, '');
content = content.replace(/const userWebhookLogsMap = new Map<string, WebhookLogItem\[\]>\(\);/g, '');
content = content.replace(/const userProfilesMap = new Map<string, typeof merchantProfile>\(\);/g, '');
content = content.replace(/const userBankAccountsMap = new Map<string, BankAccountItem\[\]>\(\);/g, '');
content = content.replace(/const userPasswordsMap = new Map<string, string>\(\);/g, '');
content = content.replace(/const verifiedEmailUsers = new Set<string>\(\);/g, '');
content = content.replace(/const sessionsMap = new Map<string, \{ user: SessionUser; expiresAt: number \}>\(\);/g, '');
content = content.replace(/const contactInquiries: ContactInquiry\[\] = \[\];/g, '');

// Replace any remaining `persistAuthData();` calls
content = content.replace(/persistAuthData\(\);/g, '// persistAuthData() removed');

// Remove the `persistAuthData` definition that might have had different whitespace
content = content.replace(/function persistAuthData\(\) \{[\s\S]*?restoreAuthData\(\);/g, '');

fs.writeFileSync('backend/server.ts', content);
