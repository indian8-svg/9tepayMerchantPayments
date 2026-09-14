const fs = require('fs');
let c = fs.readFileSync('backend/server.ts', 'utf8');

const regex = /app\.get\("\/api\/admin\/merchants"[\s\S]*?res\.json\(enriched\);\s*\}\s*catch\s*\(error\)\s*\{[\s\S]*?\}\s*\}\);/;
const replacement = `app.get("/api/admin/merchants", requireAdmin, async (_req, res) => {
  try {
    const usersRes = await pool.query("SELECT * FROM users WHERE role = 'merchant'");
    const enriched = await Promise.all(usersRes.rows.map(async (u) => {
      const profRes = await pool.query("SELECT settlement_rate FROM merchant_profiles WHERE user_id = $1", [u.id]);
      const rate = profRes.rows[0]?.settlement_rate;
      
      const volRes = await pool.query("SELECT COALESCE(SUM(o.amount), 0) as total, COUNT(o.id) as count FROM orders o JOIN bank_accounts b ON o.bank_account_id = b.id WHERE b.user_id = $1 AND o.status = 'PAID'", [u.id]);
      
      return {
        id: u.id,
        ownerName: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        businessName: u.business_name,
        vpa: u.vpa,
        status: u.status,
        createdAt: u.created_at,
        commissionRate: rate ? parseFloat(rate) : 0,
        totalVolume: parseFloat(volRes.rows[0].total),
        totalOrders: parseInt(volRes.rows[0].count)
      };
    }));
    res.json(enriched);
  } catch (error) {
    console.error("Admin Merchants Error:", error);
    res.status(500).json({ error: "Failed to fetch merchants" });
  }
});`;

c = c.replace(regex, replacement);
fs.writeFileSync('backend/server.ts', c);
