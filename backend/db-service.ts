import pool from './db.js';

export interface DbSession {
  sessionToken: string;
  userId: string;
  expiresAt: number;
}

// Map from DB row to OrderItem
export function rowToOrder(row: any): any {
  return {
    id: row.id,
    orderNumber: row.order_number,
    amount: parseFloat(row.amount),
    currency: row.currency,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    note: row.note,
    merchantVpa: row.merchant_vpa,
    merchantName: row.merchant_name,
    bankAccountId: row.bank_account_id,
    bankName: row.bank_name,
    bankAccountName: row.bank_account_name,
    customQrImage: row.custom_qr_image,
    status: row.status,
    utrNumber: row.utr_number,
    reviewRequired: row.review_required,
    provider: row.provider,
    paymentApp: row.payment_app,
    upiString: row.upi_string,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    callbackUrl: row.callback_url,
    webhookDelivered: row.webhook_delivered,
    userId: row.user_id,
  };
}

export async function getOrder(idOrNumber: string): Promise<any | null> {
  const res = await pool.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1', [idOrNumber]);
  return res.rows.length ? rowToOrder(res.rows[0]) : null;
}

export async function insertOrder(order: any): Promise<void> {
  await pool.query(
    `INSERT INTO orders (
      id, order_number, amount, currency, customer_name, customer_email, customer_phone,
      note, merchant_vpa, merchant_name, bank_account_id, bank_name, bank_account_name,
      custom_qr_image, status, upi_string, created_at, expires_at, callback_url, user_id, webhook_delivered
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      order.id, order.orderNumber, order.amount, order.currency, order.customerName, order.customerEmail, order.customerPhone,
      order.note, order.merchantVpa, order.merchantName, order.bankAccountId, order.bankName, order.bankAccountName,
      order.customQrImage, order.status, order.upiString, order.createdAt, order.expiresAt, order.callbackUrl, order.userId, order.webhookDelivered || false
    ]
  );
}
export async function getUser(emailOrId: string) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1 OR id = $1 LIMIT 1', [emailOrId.toLowerCase()]);
  return res.rows[0] ? camelCaseRow(res.rows[0]) : null;
}

export async function insertUser(user: any, passwordHash: string) {
  await pool.query(
    'INSERT INTO users (id, name, email, phone, role, business_name, vpa, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, business_name=EXCLUDED.business_name, vpa=EXCLUDED.vpa, phone=EXCLUDED.phone',
    [user.id, user.name, user.email, user.phone, user.role, user.businessName, user.vpa, user.status, user.createdAt]
  );
  await pool.query(
    'INSERT INTO user_passwords (user_id, password_hash) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash',
    [user.id, passwordHash]
  );
}

export async function checkPassword(userId: string): Promise<string | null> {
  const res = await pool.query('SELECT password_hash FROM user_passwords WHERE user_id = $1', [userId]);
  return res.rows.length ? res.rows[0].password_hash : null;
}

function camelCaseRow(row: any) {
  const newRow: any = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newRow[camelKey] = row[key];
  }
  return newRow;
}

export async function updateOrderStatus(id: string, status: string, utrNumber?: string, paidAt?: string, webhookDelivered?: boolean, reviewRequired?: boolean): Promise<void> {
  await pool.query(
    `UPDATE orders SET status = $1, utr_number = COALESCE($2, utr_number), paid_at = COALESCE($3, paid_at), webhook_delivered = COALESCE($4, webhook_delivered), review_required = COALESCE($5, review_required) WHERE id = $6 OR order_number = $6`,
    [status, utrNumber || null, paidAt || null, webhookDelivered ?? null, reviewRequired ?? null, id]
  );
}

export async function getAdminStats() {
  const [totalRes, volRes, todayVolRes] = await Promise.all([
    pool.query("SELECT COUNT(*) as count FROM orders"),
    pool.query("SELECT SUM(amount) as sum FROM orders WHERE status = 'PAID'"),
    pool.query("SELECT SUM(amount) as sum FROM orders WHERE status = 'PAID' AND paid_at >= CURRENT_DATE")
  ]);
  const activeMerchantsRes = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'merchant'");
  return {
    totalTransactions: parseInt(totalRes.rows[0].count) || 0,
    totalVolume: parseFloat(volRes.rows[0].sum) || 0,
    activeMerchants: parseInt(activeMerchantsRes.rows[0].count) || 0,
    volumeToday: parseFloat(todayVolRes.rows[0].sum) || 0
  };
}

export async function insertSession(token: string, userId: string, expiresAt: number) {
  await pool.query('INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expiresAt]);
}

export async function getSession(token: string): Promise<any | null> {
  const res = await pool.query('SELECT s.*, u.name, u.email, u.phone, u.role, u.business_name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1', [token]);
  if (!res.rows.length) return null;
  const row = res.rows[0];
  if (Date.now() > row.expires_at) {
    await deleteSession(token);
    return null;
  }
  return {
    user: { id: row.user_id, name: row.name, email: row.email, phone: row.phone, role: row.role, businessName: row.business_name },
    expiresAt: row.expires_at
  };
}

export async function deleteSession(token: string) {
  await pool.query('DELETE FROM sessions WHERE session_token = $1', [token]);
}

export async function createContactInquiry(id: string, data: any) {
  await pool.query(
    'INSERT INTO contact_inquiries (id, name, email, phone, business_name, volume, subject, message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, data.name, data.email, data.phone, data.businessName, data.volume, data.subject, data.message]
  );
}

export async function insertWebhookLog(log: any) {
  await pool.query(
    'INSERT INTO webhook_logs (id, user_id, order_id, timestamp, status, url, status_code, payload, response) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [log.id, log.userId, log.orderId, log.timestamp, log.status, log.url, log.statusCode, JSON.stringify(log.payload), log.response]
  );
}

// --- Invoices ---
export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  dueDate?: string;
  orderId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function insertInvoice(invoice: Invoice) {
  await pool.query(
    `INSERT INTO invoices 
    (id, user_id, customer_name, customer_email, customer_phone, billing_address, items, subtotal, tax_rate, total_amount, status, due_date, order_id, notes, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      invoice.id, invoice.userId, invoice.customerName, invoice.customerEmail, invoice.customerPhone, invoice.billingAddress,
      JSON.stringify(invoice.items), invoice.subtotal, invoice.taxRate, invoice.totalAmount, invoice.status,
      invoice.dueDate, invoice.orderId, invoice.notes, invoice.createdAt, invoice.updatedAt
    ]
  );
}

export async function getInvoicesForUser(userId: string): Promise<Invoice[]> {
  const res = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows.map(mapInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const res = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  return res.rows.length ? mapInvoice(res.rows[0]) : null;
}

export async function updateInvoiceStatus(id: string, status: string, orderId?: string) {
  await pool.query(
    'UPDATE invoices SET status = $1, order_id = COALESCE($2, order_id), updated_at = $3 WHERE id = $4',
    [status, orderId, new Date().toISOString(), id]
  );
}

function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    billingAddress: row.billing_address,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    subtotal: parseFloat(row.subtotal),
    taxRate: parseFloat(row.tax_rate),
    totalAmount: parseFloat(row.total_amount),
    status: row.status,
    dueDate: row.due_date,
    orderId: row.order_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface SubscriptionPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  nextBillingDate: string;
  createdAt: string;
}

export async function insertSubscriptionPlan(plan: SubscriptionPlan) {
  await pool.query(
    'INSERT INTO subscription_plans (id, user_id, name, description, amount, currency, interval, created_at) VALUES (\, \, \, \, \, \, \, \)',
    [plan.id, plan.userId, plan.name, plan.description, plan.amount, plan.currency, plan.interval, plan.createdAt]
  );
}

export async function getSubscriptionPlansForUser(userId: string): Promise<SubscriptionPlan[]> {
  const res = await pool.query('SELECT * FROM subscription_plans WHERE user_id = \ ORDER BY created_at DESC', [userId]);
  return res.rows.map(camelCaseRow) as SubscriptionPlan[];
}

export async function insertSubscription(sub: Subscription) {
  await pool.query(
    'INSERT INTO subscriptions (id, user_id, plan_id, customer_name, customer_email, customer_phone, status, next_billing_date, created_at) VALUES (\, \, \, \, \, \, \, \, \)',
    [sub.id, sub.userId, sub.planId, sub.customerName, sub.customerEmail, sub.customerPhone, sub.status, sub.nextBillingDate, sub.createdAt]
  );
}

export async function getSubscriptionsForUser(userId: string): Promise<(Subscription & { plan: SubscriptionPlan })[]> {
  const res = await pool.query('SELECT s.*, p.name as plan_name, p.amount as plan_amount, p.currency as plan_currency, p.interval as plan_interval FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = \ ORDER BY s.created_at DESC', [userId]);
  return res.rows.map(r => {
    const s = camelCaseRow(r);
    return {
      ...s,
      plan: {
        id: r.plan_id,
        userId: r.user_id,
        name: r.plan_name,
        amount: r.plan_amount,
        currency: r.plan_currency,
        interval: r.plan_interval
      }
    };
  });
}

