const fs = require('fs');

let c = fs.readFileSync('backend/server.ts', 'utf8');

const regex = /app\.get\("\/api\/admin\/merchants", requireAdmin, async \(_req, res\) => \{\s*const users = await pool\.query\("SELECT \* FROM users WHERE role = 'merchant'"\);\s*res\.json\(users\.rows\);\s*\}\);/;

const replacement = `app.get("/api/admin/merchants", requireAdmin, async (_req, res) => {
  const usersRes = await pool.query("SELECT * FROM users WHERE role = 'merchant'");
  const enriched = await Promise.all(usersRes.rows.map(async (u) => {
    const profRes = await pool.query("SELECT settlement_rate FROM merchant_profiles WHERE user_id = $1", [u.id]);
    const rate = profRes.rows[0]?.settlement_rate;
    const volRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE merchant_id = $1 AND status = 'PAID'", [u.id]);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      businessName: u.business_name,
      vpa: u.vpa,
      status: u.status,
      createdAt: u.created_at,
      commissionRate: rate ? parseFloat(rate) : 0,
      totalProcessed: parseFloat(volRes.rows[0].total)
    };
  }));
  res.json(enriched);
});`;

c = c.replace(regex, replacement);

fs.writeFileSync('backend/server.ts', c);
