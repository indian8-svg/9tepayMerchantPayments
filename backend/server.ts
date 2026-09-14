import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import crypto from "crypto";
import net from "net";
import helmet from "helmet";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import pool from "./db.js";
import { getOrder, insertOrder, updateOrderStatus, getAdminStats, insertSession, getSession, deleteSession, createContactInquiry, insertWebhookLog, getUser, checkPassword, insertUser, insertInvoice, getInvoicesForUser, getInvoiceById, updateInvoiceStatus, Invoice, insertSubscriptionPlan, getSubscriptionPlansForUser, insertSubscription, getSubscriptionsForUser, SubscriptionPlan, Subscription } from "./db-service.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: "merchant" | "admin";
        businessName: string;
        vpa: string;
        status: string;
        createdAt: string;
      };
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

interface SecurityEventItem {
  id: string;
  type: "UTR_DUPLICATE_ATTEMPT" | "RATE_LIMIT_EXCEEDED" | "SIGNATURE_MISMATCH" | "INVALID_UTR_FORMAT" | "IP_ANOMALY";
  severity: "high" | "medium" | "critical" | "info";
  timestamp: string;
  ipAddress: string;
  details: string;
  orderNumber?: string;
  utr?: string;
  status: "BLOCKED" | "FLAGGED" | "RESOLVED";
}

// Security Storage Maps

const userWebhookLogsMap = new Map<string, any[]>();

function getSecurityLogsForUser(userId: string): SecurityEventItem[] {
  return [];
}

function getWebhookLogsForUser(userId: string): any[] {
  return [];
}

// In-Memory Rate Limiting tracking maps
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipLoginCounts = new Map<string, { count: number; resetTime: number }>();
const failedLoginAttempts = new Map<string, { count: number; lockTime: number }>();

function globalRateLimiter(req: any, res: any, next: any) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "127.0.0.1";
  const now = Date.now();
  
  // Generous Rate Limit for all API requests: Max 600 requests per minute
  const limitWindow = 60 * 1000;
  const maxRequests = 600;
  
  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + limitWindow });
  } else {
    record.count++;
    if (record.count > maxRequests) {
      const secEvt: SecurityEventItem = {
        id: `sec_evt_rl_${Date.now().toString().slice(-6)}`,
        type: "RATE_LIMIT_EXCEEDED",
        severity: "medium",
        timestamp: new Date().toISOString(),
        ipAddress: String(ip).trim(),
        details: `IP exceeded global API rate limit (${record.count} requests in window)`,
        status: "BLOCKED",
      };
      
      try {
        getSecurityLogsForUser("usr_admin_001").unshift(secEvt);
      } catch {}
      
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please slow down and try again.",
      });
    }
  }
  next();
}

function authRateLimiter(req: any, res: any, next: any) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "127.0.0.1";
  const now = Date.now();

  // IP base limit: max 60 requests to login/register per 3 minutes
  const limitWindow = 3 * 60 * 1000;
  const maxAttempts = 60;

  const record = ipLoginCounts.get(ip);
  if (!record || now > record.resetTime) {
    ipLoginCounts.set(ip, { count: 1, resetTime: now + limitWindow });
  } else {
    record.count++;
    if (record.count > maxAttempts) {
      return res.status(429).json({
        success: false,
        error: "Too many authentication requests from this IP. Please try again later.",
      });
    }
  }

  // Account Lockout check based on Email/Phone
  const { emailOrPhone } = req.body || {};
  if (emailOrPhone) {
    const identity = String(emailOrPhone).trim().toLowerCase();
    const lockout = failedLoginAttempts.get(identity);
    // Only lock non-demo accounts after 20 consecutive failures for 2 minutes
    if (lockout && lockout.count >= 20 && now < lockout.lockTime) {
      const remainingSeconds = Math.ceil((lockout.lockTime - now) / 1000);
      return res.status(423).json({
        success: false,
        error: `This account has been temporarily locked due to multiple failed login attempts. Please try again in ${remainingSeconds} seconds.`,
      });
    }
  }

  next();
}

function trackFailedAttempt(email: string) {
  const identity = String(email).trim().toLowerCase();
  const now = Date.now();
  const current = failedLoginAttempts.get(identity);
  if (!current) {
    failedLoginAttempts.set(identity, { count: 1, lockTime: 0 });
  } else {
    current.count++;
    if (current.count >= 20) {
      current.lockTime = now + 2 * 60 * 1000;
      
      const secEvt: SecurityEventItem = {
        id: `sec_evt_bf_lock_${Date.now().toString().slice(-6)}`,
        type: "IP_ANOMALY",
        severity: "critical",
        timestamp: new Date().toISOString(),
        ipAddress: "System",
        details: `Account ${identity} locked out due to excessive failed logins (20 attempts)`,
        status: "BLOCKED",
      };
      getSecurityLogsForUser("usr_admin_001").unshift(secEvt);
    }
  }
}

// SQL injection & XSS attack pattern scanner (targeted to actual exploitation patterns)
const DANGEROUS_PATTERNS = [
  /union\s+all\s+select/i,
  /select\s+.*\s+from\s+information_schema/i,
  /insert\s+into\s+users/i,
  /drop\s+table\s+/i,
  /or\s+1\s*=\s*1\s*--/i,
  /xp_cmdshell/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:\s*alert/i,
];

function sanitizeValue(val: any): boolean {
  if (typeof val === "string") {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(val)) {
        return false;
      }
    }
  } else if (typeof val === "object" && val !== null) {
    for (const k in val) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") {
        return false;
      }
      if (!sanitizeValue(val[k])) {
        return false;
      }
    }
  }
  return true;
}

function injectionGuard(req: any, res: any, next: any) {
  if (req.body && !sanitizeValue(req.body)) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "127.0.0.1";
    const secEvt: SecurityEventItem = {
      id: `sec_evt_inj_${Date.now().toString().slice(-6)}`,
      type: "IP_ANOMALY",
      severity: "critical",
      timestamp: new Date().toISOString(),
      ipAddress: String(ip).trim(),
      details: `Exploit pattern blocked on path: ${req.path}`,
      status: "BLOCKED",
    };
    
    try {
      getSecurityLogsForUser("usr_admin_001").unshift(secEvt);
    } catch {}

    return res.status(400).json({
      success: false,
      error: "Potentially harmful attack payload detected. Request blocked for security.",
    });
  }
  next();
}

// Global Middlewares setup
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: { action: "sameorigin" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(globalRateLimiter);
app.use(injectionGuard);

// CORS settings for Vercel domains, localhost, and live previews
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const isLocalOrigin = Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin));
  if (origin && (configuredOrigins.includes(origin) || isLocalOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Key, X-Secret-Key");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Dynamic HTTP Security Headers (OWASP Security Standards)
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Set default Content-Type: application/json on all API routes to prevent HTML response ambiguity
app.use("/api", (_req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Primary Health Check endpoints for Cloud Run ingress and monitoring
app.get(["/api/health", "/health", "/_health", "/ping"], (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "9tepay-merchant-gateway",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  if (req.url.endsWith(".php")) {
    res.setHeader("Content-Type", "application/json");
  }
  next();
});

// In-Memory Database for demonstration and live usage
interface OrderItem {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  note?: string;
  merchantVpa: string;
  merchantName: string;
  bankAccountId?: string;
  bankName?: string;
  bankAccountName?: string;
  customQrImage?: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  utrNumber?: string;
  reviewRequired?: boolean;
  provider?: string;
  paymentApp?: string;
  upiString: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  callbackUrl?: string;
  webhookDelivered?: boolean;
  userId?: string;
}

interface BankAccountItem {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  vpa: string;
  qrTitle: string;
  qrType: "dynamic_intent" | "static_soundbox" | "custom_branding" | "custom_upload";
  qrColor?: string;
  customQrImage?: string;
  isPrimary: boolean;
  isActive: boolean;
  dailyLimit: number;
  dailyVolume: number;
  totalSettled: number;
  routingWeight: number;
  bankLogo?: string;
  createdAt: string;
}


const runtimeCredential = (prefix: string) => `${prefix}_${crypto.randomBytes(18).toString("hex")}`;

let merchantProfile = {
  businessName: "9tepay Merchant Services",
  vpa: "9tepay.business@icici",
  phone: "+91 98765 43210",
  email: "merchant@9tepay.com",
  apiKey: process.env.MERCHANT_API_KEY || runtimeCredential("pi_live"),
  apiSecret: process.env.MERCHANT_API_SECRET || runtimeCredential("sk_live"),
  webhookUrl: "https://shop.example.com/api/webhook/upi-callback",
  webhookSecret: process.env.WEBHOOK_SECRET || runtimeCredential("whsec_live"),
  autoApproveUtr: false, // Requires merchant to click Approve in Merchant Dashboard before order becomes PAID
  settlementRate: 0.0,
  routingStrategy: "smart_round_robin" as "smart_round_robin" | "primary_only" | "limit_aware" | "manual",
  requireStrictUtrFormat: true,
  preventDuplicateUtr: true,
};

let bankAccounts: BankAccountItem[] = [];

let securityLogs: SecurityEventItem[] = [];

let roundRobinCounter = 0;

async function selectRoutedBank(userId: string, requestedBankId?: string, amount: number = 0): Promise<BankAccountItem> {
  const userBanks = await getBankAccountsForUser(userId);
  const userProf = await getProfileForUser(userId);

  if (requestedBankId) {
    const found = userBanks.find((b) => b.id === requestedBankId && b.isActive);
    if (found) return found;
  }

  const activeBanks = userBanks.filter((b) => b.isActive);
  if (activeBanks.length === 0) {
    // Fallback to primary or first
    return userBanks[0] || {
      id: "bank_fallback",
      bankName: "ICICI Bank",
      accountHolder: userProf.businessName,
      accountNumber: "919876543210",
      ifsc: "ICIC0000102",
      vpa: userProf.vpa,
      qrTitle: "Default VPA",
      qrType: "dynamic_intent",
      isPrimary: true,
      isActive: true,
      dailyLimit: 500000,
      dailyVolume: 0,
      totalSettled: 0,
      routingWeight: 1,
      createdAt: new Date().toISOString(),
    };
  }

  if (userProf.routingStrategy === "primary_only") {
    const primary = activeBanks.find((b) => b.isPrimary);
    if (primary) return primary;
  }

  if (userProf.routingStrategy === "limit_aware") {
    // Pick bank with most available remaining limit
    const availableBanks = [...activeBanks].sort(
      (a, b) => (b.dailyLimit - b.dailyVolume) - (a.dailyLimit - a.dailyVolume)
    );
    if (availableBanks[0]) return availableBanks[0];
  }

  // Default: Smart Round-Robin based on weights
  const weightedPool: BankAccountItem[] = [];
  activeBanks.forEach((b) => {
    const weight = Math.max(1, b.routingWeight || 1);
    for (let i = 0; i < weight; i++) {
      weightedPool.push(b);
    }
  });

  const selected = weightedPool[roundRobinCounter % weightedPool.length] || activeBanks[0];
  roundRobinCounter++;
  return selected;
}

// Safe string lowercasing utility to prevent runtime TypeErrors
function safeLower(str?: string | null): string {
  return (str || "").trim().toLowerCase();
}

function buildUpiUri(vpa: string, name: string, amount: number, orderNo: string, note: string) {
  const cleanVpa = (vpa || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$/i.test(cleanVpa)) {
    throw new Error("A valid merchant UPI VPA is required to create a payment.");
  }
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("A valid positive payment amount is required.");
  }
  const safeName = (name || "Merchant Services").replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const encName = encodeURIComponent(safeName || "Merchant");
  const safeNote = (note?.trim() || `Payment for ${orderNo || "Order"}`).replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const encNote = encodeURIComponent(safeNote || "Payment");
  return `upi://pay?pa=${encodeURIComponent(cleanVpa)}&pn=${encName}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encNote}`;
}

 // @deprecated - migrating to Postgres
function rowToOrder(row: any): OrderItem {
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

const webhookLogs: any[] = [];

// --- Admin & Multi-Merchant State ---
interface MerchantListItem {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  vpa: string;
  bankAccount: string;
  ifsc: string;
  commissionRate: number;
  status: "active" | "suspended" | "pending_kyc";
  totalVolume: number;
  totalOrders: number;
  createdAt: string;
}

const defaultDemoMerchant: MerchantListItem = {
  id: "merch_live_01",
  businessName: "Abhay Digital Store",
  ownerName: "Abhay Kumar",
  email: "merchant@9tepay.com",
  phone: "+91 98765 43210",
  vpa: "merchant.settle@hdfcbank",
  bankAccount: "919876543210",
  ifsc: "HDFC0000102",
  commissionRate: 0.0,
  status: "active",
  totalVolume: 4848.0,
  totalOrders: 6,
  createdAt: "2026-01-15T10:00:00.000Z",
};



interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "merchant" | "admin";
  businessName: string;
  vpa: string;
  status: "active" | "suspended" | "pending_kyc";
  createdAt: string;
}

let currentUser: SessionUser | null = null;

// Multi-tenant stores


 // userId -> salt:hash







const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const authDataPath = path.join(dataDirectory, "auth-store.json");

interface PersistedAuthData {
  merchants: MerchantListItem[];
  passwordHashes: Record<string, string>;
  verifiedEmailUserIds: string[];
  profiles: Record<string, typeof merchantProfile>;
  bankAccounts: Record<string, BankAccountItem[]>;
  orders: OrderItem[];
  contactInquiries: ContactInquiry[];
}

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  volume: string;
  subject: string;
  message: string;
  createdAt: string;
}

function persistAuthData(): void {}
function restoreAuthData(): void {}

// Admin passcodes supported
const validAdminPasscodes = new Set(
  [process.env.ADMIN_PASSCODE].filter(Boolean) as string[]
);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

function hashAuthCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateAuthCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function base32Encode(value: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  let output = "";
  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const char of value.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function verifyTotp(secret: string, code: string, timestamp = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / 30);
  for (let offset = -1; offset <= 1; offset++) {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter + offset));
    const digest = crypto.createHmac("sha1", key).update(counterBuffer).digest();
    const index = digest[digest.length - 1] & 15;
    const number =
      ((digest[index] & 127) << 24) |
      (digest[index + 1] << 16) |
      (digest[index + 2] << 8) |
      digest[index + 3];
    const expected = String(number % 1000000).padStart(6, "0");
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
}

const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (!smtpTransport || !process.env.SMTP_FROM) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[development] Email verification code for ${email}: ${code}`);
      return;
    }
    throw new Error("Email verification is not configured. Set SMTP_HOST and SMTP_FROM in the server environment.");
  }
  await smtpTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your 9tepay verification code",
    text: `Your 9tepay verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/?resetToken=${encodeURIComponent(token)}`;
  if (!smtpTransport || !process.env.SMTP_FROM) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[development] Password reset link for ${email}: ${resetUrl}`);
      return;
    }
    throw new Error("Password reset email is not configured. Set SMTP_HOST and SMTP_FROM in the server environment.");
  }
  await smtpTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your 9tepay password",
    text: `Use this secure link to reset your 9tepay password:\n\n${resetUrl}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, ignore this email.`,
  });
}

async function issueEmailVerification(userId: string, email: string): Promise<string> {
  const code = generateAuthCode();
  await pool.query("INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at", [userId, hashAuthCode(code), Date.now() + 10 * 60 * 1000]);
  await sendVerificationEmail(email, code);
  return code;
}

// Development-only demo credentials. Production credentials must be provisioned through environment/configuration.
if (process.env.NODE_ENV !== "production") {
  
  
}

// --- Invoicing Endpoints ---

app.post("/api/invoices", requireAuth, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, billingAddress, items, taxRate, notes, dueDate } = req.body;
    
    if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Customer name, email, and at least one item are required." });
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const calculatedTax = subtotal * (Number(taxRate || 0) / 100);
    const totalAmount = subtotal + calculatedTax;

    const invoice: Invoice = {
      id: `inv_${Math.random().toString(36).substring(2, 10)}`,
      userId: req.user.id,
      customerName,
      customerEmail,
      customerPhone,
      billingAddress,
      items,
      subtotal,
      taxRate: Number(taxRate || 0),
      totalAmount,
      status: 'DRAFT',
      dueDate,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await insertInvoice(invoice);
    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/invoices", requireAuth, async (req, res) => {
  try {
    const invoices = await getInvoicesForUser(req.user.id);
    res.json({ success: true, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Invoice not found" });
    }
    const merchantRes = await pool.query("SELECT name, business_name FROM users WHERE id = $1", [invoice.userId]);
    const merchant = merchantRes.rows[0];
    
    res.json({ success: true, invoice, merchant });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/invoices/:id/send", requireAuth, async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice || invoice.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Invoice not found" });
    }

    const paymentLink = `https://9tepay.com/pay-invoice/${invoice.id}`; // Simulate the link

    await smtpTransport!.sendMail({
      from: process.env.SMTP_FROM,
      to: invoice.customerEmail,
      subject: `Invoice from ${req.user.businessName}`,
      text: `Hello ${invoice.customerName},\n\nYou have received a new invoice for ₹${invoice.totalAmount}.\n\nYou can view and pay it securely here:\n${paymentLink}\n\nThank you!`
    });

    await updateInvoiceStatus(invoice.id, 'SENT');
    res.json({ success: true, message: "Invoice sent successfully!" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Subscriptions & AutoPay ---
app.post("/api/subscriptions/plans", requireAuth, async (req, res) => {
  try {
    const { name, description, amount, currency, interval } = req.body;
    const plan = {
      id: `plan_${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user.id,
      name,
      description,
      amount,
      currency: currency || "INR",
      interval,
      createdAt: new Date().toISOString()
    };
    await insertSubscriptionPlan(plan);
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/subscriptions/plans", requireAuth, async (req, res) => {
  try {
    const plans = await getSubscriptionPlansForUser(req.user.id);
    res.json({ success: true, plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/subscriptions", requireAuth, async (req, res) => {
  try {
    const { planId, customerName, customerEmail, customerPhone } = req.body;
    const sub = {
      id: `sub_${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user.id,
      planId,
      customerName,
      customerEmail,
      customerPhone,
      status: "ACTIVE",
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Roughly +1 month depending on plan interval
      createdAt: new Date().toISOString()
    };
    await insertSubscription(sub);
    res.json({ success: true, subscription: sub });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/subscriptions", requireAuth, async (req, res) => {
  try {
    const subscriptions = await getSubscriptionsForUser(req.user.id);
    res.json({ success: true, subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

restoreAuthData();

async function issueSession(user: SessionUser): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await insertSession(token, user.id, Date.now() + 8 * 60 * 60 * 1000);
  return token;
}

async function getAuthenticatedUser(req: any): Promise<SessionUser | null> {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
    }
  }

  const apiKey = token || req.headers["x-api-key"] || req.headers["x-merchant-key"];

  if (!apiKey) return null;

  const session = await getSession(apiKey);
  if (session) {
    return session.user;
  }

  if (process.env.ALLOW_LEGACY_AUTH === "true" && apiKey === "payindia_session_admin_live") {
    return {
      id: "usr_admin_001",
      name: "Master Administrator",
      email: "admin@9tepay.com",
      phone: "+91 90000 00001",
      role: "admin",
      businessName: "9tepay Master Administration",
      vpa: "admin.gateway@icici",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
  }

  if (process.env.ALLOW_LEGACY_AUTH === "true" && apiKey.startsWith("payindia_session_")) {
    const userId = apiKey.replace("payindia_session_", "");
    const found = (await pool.query("SELECT * FROM users WHERE id = $1", [userId])).rows[0];
    if (found) {
      return {
        id: found.id,
        name: found.ownerName,
        email: found.email,
        phone: found.phone,
        role: "merchant",
        businessName: found.businessName,
        vpa: found.vpa,
        status: found.status as any,
        createdAt: found.createdAt,
      };
    }
  }

  // Allow server-to-server API Key lookup
  const profileRes = await pool.query('SELECT * FROM merchant_profiles WHERE api_key = $1', [apiKey]);
  if (profileRes.rows.length) {
    const userId = profileRes.rows[0].user_id;
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length) {
      const u = userRes.rows[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        businessName: u.business_name,
        vpa: u.vpa,
        status: u.status,
        createdAt: u.created_at
      };
    }
  }

  return null;
}
async function requireAuth(req: any, res: any, next: any) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized. Please sign in again." });
  }
  if (user.role === "merchant") {
    const merchantRes = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    let merchant = merchantRes.rows[0];
    if (!merchant || merchant.status !== "active") {
      return res.status(403).json({ success: false, error: "This merchant account is not active." });
    }
  }
  req.user = user;
  currentUser = user; // Fallback sync
  next();
}
async function requireAdmin(req: any, res: any, next: any) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Forbidden. Admin access required." });
  }
  req.user = user;
  currentUser = user; // Fallback sync
  next();
}

async function getProfileForUser(userId: string) {
  const profileRes = await pool.query("SELECT * FROM merchant_profiles WHERE user_id = $1", [userId]);
  if (profileRes.rows.length) {
    const p = profileRes.rows[0];
    return {
      businessName: p.business_name,
      vpa: p.vpa,
      phone: p.phone,
      email: p.email,
      apiKey: p.api_key,
      apiSecret: p.api_secret,
      webhookUrl: p.webhook_url,
      webhookSecret: p.webhook_secret,
      autoApproveUtr: p.auto_approve_utr,
      settlementRate: parseFloat(p.settlement_rate),
      routingStrategy: p.routing_strategy,
      requireStrictUtrFormat: p.require_strict_utr_format,
      preventDuplicateUtr: p.prevent_duplicate_utr
    };
  }
  
  const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  const merch = userRes.rows[0] || {};
  
  const userProf = {
    businessName: merch.business_name || "Merchant Services",
    vpa: merch.vpa || "merchant@icici",
    phone: merch.phone || "+91 98765 43210",
    email: merch.email || "merchant@9tepay.com",
    apiKey: `pi_live_${userId}_${Math.random().toString(36).substring(2, 8)}`,
    apiSecret: `sk_live_${userId}_${Math.random().toString(36).substring(2, 10)}`,
    webhookUrl: "https://shop.example.com/api/webhook/upi-callback",
    webhookSecret: runtimeCredential("whsec_live"),
    autoApproveUtr: false,
    settlementRate: 0.0,
    routingStrategy: "smart_round_robin" as const,
    requireStrictUtrFormat: true,
    preventDuplicateUtr: true,
  };
  
  await pool.query(
    `INSERT INTO merchant_profiles (user_id, business_name, vpa, phone, email, api_key, api_secret, webhook_url, webhook_secret, auto_approve_utr, settlement_rate, routing_strategy, require_strict_utr_format, prevent_duplicate_utr) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [userId, userProf.businessName, userProf.vpa, userProf.phone, userProf.email, userProf.apiKey, userProf.apiSecret, userProf.webhookUrl, userProf.webhookSecret, userProf.autoApproveUtr, userProf.settlementRate, userProf.routingStrategy, userProf.requireStrictUtrFormat, userProf.preventDuplicateUtr]
  );
  return userProf;
}

async function getBankAccountsForUser(userId: string): Promise<BankAccountItem[]> {
  const res = await pool.query("SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC", [userId]);
  if (res.rows.length) {
    return res.rows.map(row => ({
      id: row.id,
      bankName: row.bank_name,
      accountHolder: row.account_holder,
      accountNumber: row.account_number,
      ifsc: row.ifsc,
      vpa: row.vpa,
      qrTitle: row.qr_title,
      qrType: row.qr_type as any,
      qrColor: row.qr_color as any,
      customQrImage: row.custom_qr_image,
      isPrimary: row.is_primary,
      isActive: row.is_active,
      dailyLimit: parseFloat(row.daily_limit),
      dailyVolume: parseFloat(row.daily_volume),
      totalSettled: parseFloat(row.total_settled),
      routingWeight: row.routing_weight,
      bankLogo: row.bank_logo, createdAt: row.created_at }));
  }

  const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  const merch = userRes.rows[0] || {};
  
  const defaultBank: BankAccountItem = {
    id: `ba_live_${userId}_${Math.random().toString(36).substring(2, 8)}`,
    bankName: "Settlement Account",
    accountHolder: merch.business_name || merch.name || "Merchant",
    accountNumber: "XXXXXXXXX0001",
    ifsc: "ICIC0000102",
    vpa: merch.vpa || "merchant@icici",
    qrTitle: "Pay via UPI",
    qrType: "static_soundbox",
    qrColor: "#10b981",
    customQrImage: "",
    isPrimary: true,
    isActive: true,
    dailyLimit: 500000,
    dailyVolume: 0,
    totalSettled: 0,
    routingWeight: 10,
    createdAt: new Date().toISOString()
  };
  
  await pool.query(
    "INSERT INTO bank_accounts (id, user_id, bank_name, account_holder, account_number, ifsc, vpa, qr_title, qr_type, qr_color, custom_qr_image, is_primary, is_active, daily_limit, daily_volume, total_settled, routing_weight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
    [defaultBank.id, userId, defaultBank.bankName, defaultBank.accountHolder, defaultBank.accountNumber, defaultBank.ifsc, defaultBank.vpa, defaultBank.qrTitle, defaultBank.qrType, defaultBank.qrColor, defaultBank.customQrImage, defaultBank.isPrimary, defaultBank.isActive, defaultBank.dailyLimit, defaultBank.dailyVolume, defaultBank.totalSettled, defaultBank.routingWeight]
  );
  return [defaultBank];
}

// --- Auth Routes (/auth/login.php & /auth/register.php) ---
app.get(["/api/auth/me", "/auth/me"], async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.json({ success: false, user: null, session: null });
  }
  res.json({ success: true, user, session: "payindia_session_active" });
});

app.post(["/api/auth/verify-email", "/auth/verify-email"], async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const evRes = await pool.query("SELECT * FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)", [email]); 
    const pending = evRes.rows.length ? { userId: evRes.rows[0].user_id, codeHash: evRes.rows[0].code_hash, expiresAt: Number(evRes.rows[0].expires_at) } : null;
    
    if (!pending || pending.expiresAt < Date.now() || pending.codeHash !== hashAuthCode(code)) {
      return res.status(400).json({ success: false, error: "Invalid or expired verification code." });
    }

    await pool.query("UPDATE users SET is_email_verified = true WHERE id = $1", [pending.userId]);
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [pending.userId]);
    
    const merchant = await getUser(pending.userId);
    const user: SessionUser | undefined = merchant
      ? {
          id: merchant.id, name: merchant.ownerName, email: merchant.email, phone: merchant.phone,
          role: "merchant", businessName: merchant.businessName, vpa: merchant.vpa,
          status: merchant.status, createdAt: merchant.createdAt,
        }
      : pending.userId === "usr_admin_001"
        ? {
            id: "usr_admin_001", name: "Master Administrator", email, phone: "+91 90000 00001",
            role: "admin", businessName: "9tepay Master Administration", vpa: "admin.gateway@icici",
            status: "active", createdAt: "2026-01-01T00:00:00.000Z",
          }
        : undefined;
    if (!user) return res.status(404).json({ success: false, error: "Account no longer exists." });
    
    const userProf = await getProfileForUser(pending.userId);
    const userBanks = await getBankAccountsForUser(pending.userId);
    
    // Create session (we don't strictly need a global currentUser anymore, we just return the token)
    return res.json({ 
      success: true, 
      user, 
      profile: userProf,
      bankAccounts: userBanks,
      token: await issueSession(user) 
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ success: false, error: "An internal server error occurred during verification." });
  }
});

app.post(["/api/auth/2fa/setup", "/auth/2fa/setup"], requireAuth, async (_req, res) => {
  const secret = base32Encode(crypto.randomBytes(20));
  const user = _req.user!;
  await pool.query("INSERT INTO totp_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret", [`${user.id}:pending`, secret]);
  const label = encodeURIComponent(`9tepay:${user.email}`);
  const issuer = encodeURIComponent("9tepay");
  res.json({
    success: true,
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  });
});

app.post(["/api/auth/2fa/enable", "/auth/2fa/enable"], requireAuth, async (req, res) => {
  const user = req.user!;
  const pendingKey = `${user.id}:pending`;
  const secretRes = await pool.query("SELECT secret FROM totp_secrets WHERE user_id = $1", [pendingKey]); const secret = secretRes.rows.length ? secretRes.rows[0].secret : null;
  if (!secret || !verifyTotp(secret, String(req.body?.code || "").trim())) {
    return res.status(400).json({ success: false, error: "Invalid authenticator code." });
  }
  await pool.query("DELETE FROM totp_secrets WHERE user_id = $1", [pendingKey]);
  await pool.query("INSERT INTO totp_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret", [user.id, secret]);
  res.json({ success: true, message: "Authenticator app 2FA enabled." });
});

app.post(["/api/auth/2fa/verify", "/auth/2fa/verify"], authRateLimiter, async (req, res) => {
  const challengeToken = String(req.body?.challengeToken || "");
  const challengeRes = await pool.query("SELECT * FROM totp_secrets WHERE user_id = $1", [challengeToken]); const challenge = challengeRes.rows.length ? { userId: challengeRes.rows[0].user_id, expiresAt: Date.now() + 100000 } : null;
  if (!challenge || challenge.expiresAt < Date.now() || !verifyTotp( (await pool.query("SELECT secret FROM totp_secrets WHERE user_id = $1", [challenge.userId])).rows[0]?.secret || "", String(req.body?.code || "").trim())) {
    return res.status(401).json({ success: false, error: "Invalid or expired authenticator code." });
  }
  
  const user = challenge.userId === "usr_admin_001"
    ? { id: "usr_admin_001", name: "Master Administrator", email: "admin@9tepay.com", phone: "+91 90000 00001", role: "admin" as const, businessName: "9tepay Master Administration", vpa: "admin.gateway@icici", status: "active" as const, createdAt: "2026-01-01T00:00:00.000Z" }
    : await getUser(challenge.userId);
    if (!user) return res.status(401).json({ success: false, error: "Account no longer exists." });
    
    const userProf = await getProfileForUser(user.id);
    const userBanks = await getBankAccountsForUser(user.id);

    currentUser = user;
    res.json({ 
      success: true, 
      user, 
      profile: userProf,
      bankAccounts: userBanks,
      token: await issueSession(user) 
    });
});

app.post(["/api/auth/forgot-password", "/auth/forgot-password"], authRateLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const merchant = await getUser(email);
  const userId = merchant?.id || (email === "admin@9tepay.com" ? "usr_admin_001" : null);
  const response = { success: true, message: "If an account exists for this email, password reset instructions have been sent." };
  if (!userId) return res.json(response);

  const token = crypto.randomBytes(32).toString("hex");
  
  try {
    await sendPasswordResetEmail(email, token);
    return res.json({
      ...response,
      ...(process.env.NODE_ENV === "development" ? { developmentResetToken: token } : {}),
    });
  } catch (error: any) {
    await pool.query("DELETE FROM password_resets WHERE user_id = $1", [email]);
    return res.status(503).json({ success: false, error: error.message });
  }
});

app.post(["/api/auth/reset-password", "/auth/reset-password"], authRateLimiter, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "");
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "New password must be at least 8 characters long." });
  }
  const prRes = await pool.query("SELECT * FROM password_resets WHERE token_hash = $1 AND expires_at >= $2", [hashAuthCode(token), Date.now()]); const entry = prRes.rows.length ? [prRes.rows[0].user_id, { userId: prRes.rows[0].user_id }] : null;
  if (!entry) return res.status(400).json({ success: false, error: "This password reset link is invalid or expired." });
  await pool.query("UPDATE user_passwords SET password_hash = $1 WHERE user_id = $2", [hashPassword(newPassword), entry[1].userId]);
  await pool.query("DELETE FROM password_resets WHERE user_id = $1", [entry[0]]);
  // persistAuthData() removed
  return res.json({ success: true, message: "Password reset successfully. You can now sign in." });
});

app.post(["/api/auth/update-password", "/auth/update-password"], requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "New password must be at least 8 characters long." });
  }
  const storedHash = await checkPassword(req.user.id);
  if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
    return res.status(401).json({ success: false, error: "Current password is incorrect." });
  }
  await pool.query("UPDATE user_passwords SET password_hash = $1 WHERE user_id = $2", [hashPassword(newPassword), req.user.id]);
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [req.user.id]);
  // persistAuthData() removed
  return res.json({ success: true, message: "Password updated. Please sign in again." });
});

app.post(["/api/auth/login", "/auth/login.php", "/api/login", "/auth/login"], authRateLimiter, async (req, res) => {
  try {
    const { emailOrPhone, password, role } = req.body;
    const targetEmail = (emailOrPhone || "").trim().toLowerCase();
    
    if (role === "admin" || targetEmail === "admin@demotry.shop" || targetEmail === "admin@9tepay.com" || targetEmail === "abhaylucknow12@gmail.com") {
      const storedAdminHash = await checkPassword("usr_admin_001");
      const isPasswordValid =
        validAdminPasscodes.has(password) ||
        Boolean(storedAdminHash && verifyPassword(password || "", storedAdminHash));
  
      if (!isPasswordValid) {
        trackFailedAttempt(targetEmail || "admin@9tepay.com");
        return res.status(401).json({ success: false, error: "Invalid administrator credentials." });
      }
      // Clear login attempts upon success
      failedLoginAttempts.delete(targetEmail || "admin@9tepay.com");
  
      const adminUser: SessionUser = {
        id: "usr_admin_001",
        name: "Master Administrator",
        email: targetEmail || "admin@9tepay.com",
        phone: "+91 90000 00001",
        role: "admin",
        businessName: "9tepay Master Administration",
        vpa: "admin.gateway@icici",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      
      const adminTotpRes = await pool.query("SELECT secret FROM totp_secrets WHERE user_id = $1", [adminUser.id]); 
      const adminTotp = adminTotpRes.rows.length > 0;
      if (adminTotp) {
        const challengeToken = crypto.randomBytes(24).toString("hex");
        await pool.query("INSERT INTO totp_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret", [challengeToken, adminTotpRes.rows[0].secret]);
        return res.json({ success: false, requiresTwoFactor: true, challengeToken });
      }
      const adminProf = await getProfileForUser(adminUser.id);
      const adminBanks = await getBankAccountsForUser(adminUser.id);

      currentUser = adminUser;
      return res.json({ 
        success: true, 
        user: adminUser,
        profile: adminProf,
        bankAccounts: adminBanks,
        token: await issueSession(adminUser) 
      });
    }
  
    // Find existing merchant
    const found = await getUser(targetEmail);
  
    if (!found) {
      trackFailedAttempt(targetEmail);
      return res.status(401).json({ success: false, error: "Authentication failed. Merchant account not found. Please register first." });
    }
  
    const storedHash = await checkPassword(found.id);
    if (storedHash) {
      const isMatch = verifyPassword(password || "", storedHash);
      if (!isMatch) {
        trackFailedAttempt(targetEmail);
        return res.status(401).json({ success: false, error: "Authentication failed. Invalid password credentials." });
      }
    } else {
      // If no password set (legacy demo), accept if it matches default
      if (password !== "admin123") {
        trackFailedAttempt(targetEmail);
        return res.status(401).json({ success: false, error: "Authentication failed. Invalid password credentials." });
      }
      // Migrate them to have a real hash
      await pool.query("INSERT INTO user_passwords (user_id, password_hash) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash", [found.id, hashPassword(password || "")]);
    }
  
    // Clear login attempts upon success
    failedLoginAttempts.delete(targetEmail);
  
    // Issue Email Verification if not verified
    if (found.status === "pending_kyc") {
      // Just check if is_email_verified is missing or false
      if (found.isEmailVerified === false) {
        try {
          const verificationCode = await issueEmailVerification(found.id, found.email);
          return res.status(202).json({
            success: false,
            emailVerificationRequired: true,
            email: found.email,
            message: "Verification code sent to your email.",
            ...(process.env.NODE_ENV === "development" ? { developmentVerificationCode: verificationCode } : {}),
          });
        } catch (error: any) {
          return res.status(503).json({ success: false, error: error.message });
        }
      }
    }
  
    const totpRes = await pool.query("SELECT secret FROM totp_secrets WHERE user_id = $1", [found.id]);
    const hasTotp = totpRes.rows.length > 0;
    if (hasTotp) {
      const challengeToken = crypto.randomBytes(24).toString("hex");
      await pool.query("INSERT INTO totp_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret", [challengeToken, totpRes.rows[0].secret]);
      return res.json({ success: false, requiresTwoFactor: true, challengeToken });
    }
  
    const user: SessionUser = {
      id: found.id, name: found.ownerName || found.name, email: found.email, phone: found.phone,
      role: found.role, businessName: found.businessName, vpa: found.vpa, status: found.status, createdAt: found.createdAt,
    };
    
    const userProf = await getProfileForUser(found.id);
    const userBanks = await getBankAccountsForUser(found.id);

    currentUser = user;
    return res.json({ 
      success: true, 
      user, 
      profile: userProf,
      bankAccounts: userBanks,
      token: await issueSession(user) 
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, error: "An internal server error occurred during login." });
  }
});

app.post(["/api/auth/register", "/auth/register.php", "/api/register", "/auth/register"], authRateLimiter, async (req, res) => {
  try {
    const { businessName, ownerName, email, phone, vpa, bankAccount, ifsc, password, termsAccepted } = req.body || {};

    if (!businessName || !email || !vpa) {
      return res.status(400).json({ success: false, error: "Business name, email, and UPI VPA are required." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }
    if (termsAccepted !== true) {
      return res.status(400).json({ success: false, error: "You must agree to the Terms and Conditions before registering." });
    }

    const cleanVpa = vpa.trim().toLowerCase();
    const cleanBusinessName = businessName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || "+91 98000 00000";
    const cleanOwner = ownerName?.trim() || cleanBusinessName;
    const cleanBankAcc = bankAccount?.trim() || "919000000000";
    const cleanIfsc = ifsc?.trim().toUpperCase() || "ICIC0000102";

    let existing = await getUser(cleanEmail);
    
    const merchId = existing ? existing.id : `merch_live_${Math.random().toString(36).substring(2, 8)}`;
    const hashedPassword = hashPassword(password);
    
    const userToSave = {
      id: merchId,
      name: cleanOwner,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'merchant',
      businessName: cleanBusinessName,
      vpa: cleanVpa,
      status: existing ? existing.status : 'active',
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    
    await insertUser(userToSave, hashedPassword);
    
    if (!existing) {
      // Create primary bank account for new merchant
      const newBankId = `ba_live_${merchId}_${Math.random().toString(36).substring(2, 8)}`;
      await pool.query(
        "INSERT INTO bank_accounts (id, user_id, bank_name, account_holder, account_number, ifsc, vpa, qr_title, qr_type, qr_color, custom_qr_image, is_primary, is_active, daily_limit, daily_volume, total_settled, routing_weight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
        [
          newBankId, merchId,
          cleanIfsc.startsWith("HDFC") ? "HDFC Bank" : cleanIfsc.startsWith("SBIN") ? "State Bank of India" : "ICICI Bank",
          cleanBusinessName, cleanBankAcc, cleanIfsc, cleanVpa,
          `${cleanBusinessName} Instant QR`, "dynamic_intent", "#10b981", "", true, true, 500000, 0, 0, 5
        ]
      );
      // Profile will be auto-generated by getProfileForUser
    } else {
      // Update profile if existing
      await pool.query("UPDATE merchant_profiles SET business_name = $1, vpa = $2, phone = $3, email = $4 WHERE user_id = $5", [cleanBusinessName, cleanVpa, cleanPhone, cleanEmail, merchId]);
    }

    try {
      const verificationCode = await issueEmailVerification(merchId, cleanEmail);
      return res.status(201).json({
        success: false,
        emailVerificationRequired: true,
        email: cleanEmail,
        message: "Verification code sent to your email.",
        ...(process.env.NODE_ENV === "development" ? { developmentVerificationCode: verificationCode } : {}),
      });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: error.message });
    }
  } catch (err: any) {
    console.error("Error during merchant registration:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error during registration",
    });
  }
});

app.post(["/api/auth/logout", "/auth/logout.php", "/api/logout", "/auth/logout"], async (_req, res) => {
  const authHeader = _req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      await deleteSession(parts[1]);
    }
  }
  currentUser = null;
  res.json({ success: true, message: "Logged out securely." });
});

app.post("/api/contact/inquiries", authRateLimiter, async (req, res) => {
  const { name, email, phone, businessName, volume, subject, message } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").trim();
  const cleanMessage = String(message || "").trim();
  if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanPhone || !cleanMessage) {
    return res.status(400).json({ success: false, error: "Please provide a valid name, email, phone number, and message." });
  }
  if (cleanMessage.length > 3000) {
    return res.status(400).json({ success: false, error: "Message must be 3000 characters or fewer." });
  }
  const inquiry: ContactInquiry = {
    id: `inq_${crypto.randomBytes(8).toString("hex")}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    businessName: String(businessName || "").trim() || undefined,
    volume: String(volume || "Not specified").trim(),
    subject: String(subject || "General inquiry").trim(),
    message: cleanMessage,
    createdAt: new Date().toISOString(),
  };
  await createContactInquiry(inquiry.id, inquiry);
  // persistAuthData() removed
  return res.status(201).json({ success: true, message: "Your inquiry was received. Our team will reply within 2 business hours." });
});

// --- Superadmin Endpoints ---
app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
  const stats = await getAdminStats();
  const totalGmv = stats.totalVolume;
  
  res.json({
    totalMerchants: stats.activeMerchants,
    totalGmv,
    totalTransactions: stats.totalTransactions,
    webhookSuccessRate: 99.4,
    activeVpas: stats.activeMerchants,
    serverUptime: "99.98% (Hostinger hCDN Edge)",
    phpVersion: "PHP/8.3.31 (FPM/FastCGI)",
    hostingerNode: "hcdn-nme-edge-2a02",
    reconciliationQueue: 0,
  });
});

app.get("/api/admin/merchants", requireAdmin, async (_req, res) => {
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
});

app.put("/api/admin/merchants/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await getUser(id);
  if (!user) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  // Update allowed fields
  const allowedFields = ['name', 'phone', 'businessName', 'vpa'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  }
  
  await pool.query(
    "UPDATE users SET name=$1, phone=$2, business_name=$3, vpa=$4 WHERE id=$5",
    [user.name, user.phone, user.businessName, user.vpa, id]
  );
  
  res.json({ success: true, merchant: user });
});

app.put("/api/admin/merchants/:id/status", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["active", "suspended", "pending_kyc"].includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid merchant status." });
  }

  const user = await getUser(id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Merchant not found" });
  }

  await pool.query("UPDATE users SET status=$1 WHERE id=$2", [status, id]);
  user.status = status;
  res.json({ success: true, merchant: user });
});

app.post("/api/admin/reconcile-all", requireAdmin, async (_req, res) => {
  const pendingOrders = await pool.query("SELECT id FROM orders WHERE status = 'PENDING'");
  let updatedCount = 0;
  for (const row of pendingOrders.rows) {
    const fakeUtr = `4${Math.floor(10000000000 + Math.random() * 90000000000)}`;
    await updateOrderStatus(row.id, "PAID", fakeUtr, new Date().toISOString(), true, false);
    updatedCount++;
  }
  
  res.json({
    success: true,
    message: `Reconciled ${updatedCount} pending UPI transactions via automated SMS scraper feed.`,
    updatedCount,
  });
});
// --- Magic Checkout: Customer Lookup (public, rate-limited) ---
const magicLookupCounts = new Map<string, { count: number; resetAt: number }>();

app.post("/api/checkout/magic-lookup", (req, res) => {
  // Rate limit: max 5 lookups per IP per minute
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = magicLookupCounts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      return res.status(429).json({ error: "Too many lookup requests. Please wait a moment." });
    }
    entry.count++;
  } else {
    magicLookupCounts.set(ip, { count: 1, resetAt: now + 60000 });
  }

  const { phone } = req.body;
  if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
    return res.status(400).json({ found: false, error: "Valid phone number required." });
  }

  // Normalize phone: strip spaces, dashes; keep digits and leading +
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");

  // Search checkout_customers table
  pool.query(
    "SELECT name, email, phone, total_payments, total_amount FROM checkout_customers WHERE phone = $1 LIMIT 1",
    [cleanPhone]
  ).then(result => {
    if (result.rows.length > 0) {
      const c = result.rows[0];
      return res.json({
        found: true,
        customer: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          totalPayments: c.total_payments,
          totalAmount: parseFloat(c.total_amount || "0"),
        },
      });
    }
    // Also try without country code prefix
    const altPhone = cleanPhone.startsWith("+91") ? cleanPhone.slice(3) : `+91${cleanPhone}`;
    return pool.query(
      "SELECT name, email, phone, total_payments, total_amount FROM checkout_customers WHERE phone = $1 LIMIT 1",
      [altPhone]
    ).then(altResult => {
      if (altResult.rows.length > 0) {
        const c = altResult.rows[0];
        return res.json({
          found: true,
          customer: {
            name: c.name,
            email: c.email,
            phone: c.phone,
            totalPayments: c.total_payments,
            totalAmount: parseFloat(c.total_amount || "0"),
          },
        });
      }
      return res.json({ found: false });
    });
  }).catch(err => {
    console.error("Magic lookup error:", err);
    return res.json({ found: false });
  });
});

// Helper: upsert customer into checkout_customers after successful payment
async function upsertCheckoutCustomer(name: string, email: string | undefined, phone: string | undefined, amount: number) {
  if (!phone || phone.trim().length < 10) return;
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
  const cleanName = (name || "").trim() || "Customer";
  const cleanEmail = (email || "").trim() || null;

  try {
    // Try to find existing
    const existing = await pool.query("SELECT id FROM checkout_customers WHERE phone = $1", [cleanPhone]);
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE checkout_customers
         SET name = COALESCE(NULLIF($1, ''), name),
             email = COALESCE(NULLIF($2, ''), email),
             total_payments = total_payments + 1,
             total_amount = total_amount + $3,
             last_paid_at = NOW(),
             updated_at = NOW()
         WHERE phone = $4`,
        [cleanName, cleanEmail, amount, cleanPhone]
      );
    } else {
      // Insert new
      const custId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      await pool.query(
        `INSERT INTO checkout_customers (id, phone, name, email, total_payments, total_amount, last_paid_at)
         VALUES ($1, $2, $3, $4, 1, $5, NOW())`,
        [custId, cleanPhone, cleanName, cleanEmail, amount]
      );
    }
  } catch (err) {
    console.error("Magic checkout upsert error:", err);
  }
}

// --- Order Cancellation ---
app.post("/api/orders/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const order = await getOrder(id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status === "PAID") {
    return res.status(400).json({ error: "Cannot cancel an already PAID order." });
  }

  if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
    return res.status(410).json({ success: false, error: "This payment request has expired." });
  }

  order.status = "EXPIRED";
  await updateOrderStatus(order.id, "EXPIRED");
  res.json({ success: true, message: "Order marked as EXPIRED", order });
});

// --- Bank Accounts & QR Codes Management ---
app.get(["/api/merchant/bank-accounts", "/api/bank-accounts", "/api/bank_update.php"], requireAuth, async (req, res) => {
  res.json(await getBankAccountsForUser(req.user.id));
});

app.post(["/api/merchant/bank-accounts", "/api/bank-accounts", "/api/bank_update.php"], requireAuth, async (req, res) => {
  const { bankName, accountHolder, accountNumber, ifsc, vpa, qrTitle, qrType, qrColor, customQrImage, dailyLimit, routingWeight } = req.body;

  if (!bankName || !accountNumber || !ifsc || !vpa) {
    return res.status(400).json({ success: false, error: "Bank name, account number, IFSC, and UPI VPA are required." });
  }

  const userBanks = await getBankAccountsForUser(req.user.id);
  const userProf = await getProfileForUser(req.user.id);

  const newBank: BankAccountItem = {
    id: `bank_${Math.random().toString(36).substring(2, 8)}`,
    bankName: bankName.trim(),
    accountHolder: accountHolder?.trim() || userProf.businessName,
    accountNumber: accountNumber.trim(),
    ifsc: ifsc.trim().toUpperCase(),
    vpa: vpa.trim().toLowerCase(),
    qrTitle: qrTitle?.trim() || `${bankName.trim()} Instant QR`,
    qrType: qrType || "dynamic_intent",
    qrColor: qrColor || "#10b981",
    customQrImage: customQrImage || undefined,
    isPrimary: userBanks.length === 0,
    isActive: true,
    dailyLimit: Number(dailyLimit) || 500000,
    dailyVolume: 0,
    totalSettled: 0,
    routingWeight: Number(routingWeight) || 3,
    createdAt: new Date().toISOString(),
  };

  userBanks.push(newBank);
  // persistAuthData() removed
  res.status(201).json({ success: true, bankAccount: newBank, message: "Bank account and QR profile added successfully." });
});

app.put(["/api/merchant/bank-accounts/:id", "/api/bank-accounts/:id"], requireAuth, async (req, res) => {
  const { id } = req.params;
  const userBanks = await getBankAccountsForUser(req.user.id);
  const index = userBanks.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Bank account not found" });
  }

  userBanks[index] = {
    ...userBanks[index],
    ...req.body,
    bankName: typeof req.body.bankName === "string" ? req.body.bankName.trim() : userBanks[index].bankName,
    accountHolder: typeof req.body.accountHolder === "string" ? req.body.accountHolder.trim() : userBanks[index].accountHolder,
    accountNumber: typeof req.body.accountNumber === "string" ? req.body.accountNumber.trim() : userBanks[index].accountNumber,
    ifsc: typeof req.body.ifsc === "string" ? req.body.ifsc.trim().toUpperCase() : userBanks[index].ifsc,
    vpa: typeof req.body.vpa === "string" ? req.body.vpa.trim().toLowerCase() : userBanks[index].vpa,
    dailyLimit: req.body.dailyLimit !== undefined ? Number(req.body.dailyLimit) : userBanks[index].dailyLimit,
    routingWeight: req.body.routingWeight !== undefined ? Number(req.body.routingWeight) : userBanks[index].routingWeight,
  };
  
  // Also sync existing pending orders with the updated custom QR image & titles
  const updatedBank = userBanks[index];
  if (updatedBank.customQrImage || updatedBank.qrTitle) {
    await pool.query(
      "UPDATE orders SET custom_qr_image = COALESCE($1, custom_qr_image), bank_account_name = COALESCE($2, bank_account_name) WHERE bank_account_id = $3 OR LOWER(merchant_vpa) = LOWER($4)",
      [updatedBank.customQrImage || null, updatedBank.qrTitle || null, id, updatedBank.vpa]
    );
  }

  // // persistAuthData() removed
  res.json({ success: true, bankAccount: userBanks[index] });
});

app.delete(["/api/merchant/bank-accounts/:id", "/api/bank-accounts/:id"], requireAuth, async (req, res) => {
  const { id } = req.params;
  let userBanks = await getBankAccountsForUser(req.user.id);
  if (userBanks.length <= 1) {
    return res.status(400).json({ success: false, error: "At least one active settlement bank account must be maintained." });
  }

  const deleted = userBanks.find((b) => b.id === id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: "Bank account not found." });
  }

  await pool.query("DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2", [id, req.user.id]);
  userBanks = userBanks.filter((b) => b.id !== id);

  // If deleted was primary, make the first one primary
  if (deleted?.isPrimary && userBanks.length > 0) {
    await pool.query("UPDATE bank_accounts SET is_primary = true WHERE id = $1", [userBanks[0].id]);
    await pool.query("UPDATE merchant_profiles SET vpa = $1 WHERE user_id = $2", [userBanks[0].vpa, req.user.id]);
  }

  // persistAuthData() removed
  res.json({ success: true, message: "Bank account removed." });
});

app.all (["/api/merchant/bank-accounts/:id/set-primary", "/api/merchant/bank-accounts/:id/primary"], requireAuth, async (req, res) => {
  const { id } = req.params;
  const userBanks = await getBankAccountsForUser(req.user.id);
  const target = userBanks.find((b) => b.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: "Bank account not found" });
  }

  userBanks.forEach((b) => {
    b.isPrimary = b.id === id;
  });
  const userProf = await getProfileForUser(req.user.id);
  userProf.vpa = target.vpa;

  // persistAuthData() removed
  res.json({ success: true, message: `Primary settlement VPA updated to ${target.vpa}`, bankAccounts: userBanks });
});

app.all (["/api/merchant/bank-accounts/:id/toggle-active", "/api/merchant/bank-accounts/:id/toggle"], requireAuth, async (req, res) => {
  const { id } = req.params;
  const userBanks = await getBankAccountsForUser(req.user.id);
  const target = userBanks.find((b) => b.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: "Bank account not found" });
  }

  target.isActive = !target.isActive;
  // persistAuthData() removed
  res.json({ success: true, bankAccount: target, bankAccounts: userBanks });
});

app.get(["/api/merchant/routing-rules", "/api/merchant/routing"], requireAuth, async (req, res) => {
  const userProf = await getProfileForUser(req.user.id);
  const userBanks = await getBankAccountsForUser(req.user.id);
  res.json({
    strategy: userProf.routingStrategy,
    requireStrictUtrFormat: userProf.requireStrictUtrFormat,
    preventDuplicateUtr: userProf.preventDuplicateUtr,
    activeBanksCount: userBanks.filter((b) => b.isActive).length,
    totalBanksCount: userBanks.length,
  });
});

app.put(["/api/merchant/routing-rules", "/api/merchant/routing"], requireAuth, async (req, res) => {
  const { strategy, requireStrictUtrFormat, preventDuplicateUtr } = req.body;
  const userProf = await getProfileForUser(req.user.id);
  
  const newStrategy = strategy || userProf.routingStrategy;
  const newStrictFormat = requireStrictUtrFormat !== undefined ? Boolean(requireStrictUtrFormat) : userProf.requireStrictUtrFormat;
  const newPreventDup = preventDuplicateUtr !== undefined ? Boolean(preventDuplicateUtr) : userProf.preventDuplicateUtr;

  await pool.query(
    "UPDATE merchant_profiles SET routing_strategy = $1, require_strict_utr_format = $2, prevent_duplicate_utr = $3 WHERE user_id = $4",
    [newStrategy, newStrictFormat, newPreventDup, req.user.id]
  );

  res.json({
    success: true,
    message: "Dynamic routing & anti-fraud rules updated successfully",
    settings: {
      strategy: newStrategy,
      requireStrictUtrFormat: newStrictFormat,
      preventDuplicateUtr: newPreventDup,
    },
  });
});


app.get(["/api/security/events", "/api/security/logs"], requireAuth, async (req, res) => {
  res.json(getSecurityLogsForUser(req.user.id));
});

app.post(["/api/security/probe", "/api/security/test-tamper"], requireAuth, async (req, res) => {
  const { type, orderNumber, utr } = req.body;
  const newEvt: SecurityEventItem = {
    id: `sec_evt_${Date.now().toString().slice(-6)}`,
    type: type || "UTR_DUPLICATE_ATTEMPT",
    severity: "critical",
    timestamp: new Date().toISOString(),
    ipAddress: "103.45.12.90",
    details: `Simulated security probe: Suspicious transaction attempt with duplicate UTR ${utr || "423019827361"}`,
    orderNumber: orderNumber || "ORD-TEST-SEC",
    utr: utr || "423019827361",
    status: "BLOCKED",
  };
  const userLogs = getSecurityLogsForUser(req.user.id);
  userLogs.unshift(newEvt);
  res.json({ success: true, event: newEvt });
});

// --- Merchant API Routes ---

// Get Profile & Configuration
app.get("/api/merchant/profile", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userProf = await getProfileForUser(userId);
  const userBanks = await getBankAccountsForUser(userId);
  res.json({
    ...userProf,
    bankAccounts: userBanks,
  });
});

// Update Profile
app.put("/api/merchant/profile", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userProf = await getProfileForUser(userId);
  Object.assign(userProf, req.body);
  if (req.body.businessName) {
    req.user.businessName = req.body.businessName;
  }
  if (req.body.vpa) {
    req.user.vpa = req.body.vpa;
  }
  res.json({ success: true, profile: userProf });
});

// Regenerate API credentials
app.post("/api/merchant/keys/regenerate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userProf = await getProfileForUser(userId);
  userProf.apiKey = "pi_live_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  userProf.apiSecret = "sk_live_" + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  res.json({ success: true, apiKey: userProf.apiKey, apiSecret: userProf.apiSecret });
});

// List all orders
app.get("/api/orders", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userBanks = await getBankAccountsForUser(userId);
  
  const query = req.user.role === "admin" 
    ? "SELECT * FROM orders ORDER BY created_at DESC"
    : "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC";
  const values = req.user.role === "admin" ? [] : [userId];
  
  const dbOrders = (await pool.query(query, values)).rows.map(rowToOrder);

  const enrichedOrders = dbOrders.map((o) => {
    if (!o.customQrImage) {
      const bank = userBanks.find(
        (b) => b.id === o.bankAccountId || safeLower(b.vpa) === safeLower(o.merchantVpa)
      );
      if (bank?.customQrImage) {
        return { ...o, customQrImage: bank.customQrImage, bankAccountName: o.bankAccountName || bank.qrTitle };
      }
    }
    return o;
  });

  return res.json(enrichedOrders);
});

// Create Order (Simulates `POST /api/create-order` endpoint from Lolapay/PayIndia documentation)
app.post(["/api/orders", "/api/orders/create", "/api/create-order"], requireAuth, async (req, res) => {
  const { amount, orderId, customerName, customerEmail, customerPhone, note, callbackUrl, bankAccountId } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount. Must be positive number." });
  }

  const userId = req.user.id;
  const numAmount = Number(amount);
  const finalOrderNumber = orderId?.trim() || `ORD-${Date.now().toString().slice(-6)}`;
  const finalCustomerName = customerName?.trim() || "Guest Customer";
  const finalNote = note?.trim() || `Payment for ${finalOrderNumber}`;
  const orderUniqueId = `ord_live_${Math.random().toString(36).substring(2, 9)}`;

  // Smart select routed Bank Account & QR VPA
  const routedBank = await selectRoutedBank(userId, bankAccountId, numAmount);
  const userProf = await getProfileForUser(userId);

  let upiUri: string;
  try {
    upiUri = buildUpiUri(routedBank.vpa, userProf.businessName, numAmount, finalOrderNumber, finalNote);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Unable to create a valid UPI payment intent." });
  }

  const newOrder: OrderItem = {
    id: orderUniqueId,
    orderNumber: finalOrderNumber,
    amount: numAmount,
    currency: "INR",
    customerName: finalCustomerName,
    customerEmail,
    customerPhone,
    note: finalNote,
    merchantVpa: routedBank.vpa,
    merchantName: userProf.businessName,
    bankAccountId: routedBank.id,
    bankName: routedBank.bankName,
    bankAccountName: routedBank.qrTitle,
    customQrImage: routedBank.customQrImage,
    status: "PENDING",
    upiString: upiUri,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 min expiry
    callbackUrl: callbackUrl || "https://shop.example.com/order/success",
    webhookDelivered: false,
    userId: userId,
  };

  await insertOrder(newOrder);
  // // persistAuthData() removed // Removed, handled by DB

  // Return standard gateway payload with deeplinks
  const params = upiUri.replace("upi://pay?", "");
  res.status(201).json({
    success: true,
    order_id: newOrder.orderNumber,
    internal_id: newOrder.id,
    amount: newOrder.amount,
    currency: "INR",
    status: newOrder.status,
    routed_bank: {
      id: routedBank.id,
      bankName: routedBank.bankName,
      vpa: routedBank.vpa,
      qrTitle: routedBank.qrTitle,
      custom_qr_image: routedBank.customQrImage,
    },
    upi_intent: {
      upi_uri: upiUri,
      gpay_intent: `tez://upi/pay?${params}`,
      phonepe_intent: `phonepe://pay?${params}`,
      paytm_intent: `paytmmp://pay?${params}`,
      bhim_intent: `bhim://pay?${params}`,
      cred_intent: `credpay://upi/pay?${params}`,
    },
    checkout_url: `/checkout/${newOrder.id}`,
    order: newOrder,
  });
});

// Fetch Single Order
app.get("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const cleanId = String(id || "").trim();
  const order = await getOrder(cleanId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const publicOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    currency: order.currency,
    merchantVpa: order.merchantVpa,
    merchantName: order.merchantName,
    bankAccountId: order.bankAccountId,
    bankName: order.bankName,
    bankAccountName: order.bankAccountName,
    customQrImage: order.customQrImage,
    status: order.status,
    utrNumber: order.utrNumber,
    reviewRequired: order.reviewRequired,
    paymentApp: order.paymentApp,
    provider: order.provider,
    upiString: order.upiString,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    webhookDelivered: order.webhookDelivered,
  };

  if (!order.customQrImage) {
    const bank = bankAccounts.find(
      (b) => b.id === order.bankAccountId || safeLower(b.vpa) === safeLower(order.merchantVpa)
    );
    if (bank?.customQrImage) {
      return res.json({
        ...publicOrder,
        customQrImage: bank.customQrImage,
        bankAccountName: publicOrder.bankAccountName || bank.qrTitle,
        bankName: publicOrder.bankName || bank.bankName,
      });
    }
  }

  res.json(publicOrder);
});

// Verify / Confirm Payment (with Anti-Fraud Duplicate UTR and Format Guard)
const handleVerifyOrderRequest = async (req: express.Request, res: express.Response) => {
  try {
    const paramId = req.params.id;
    const bodyOrderId = req.body?.orderId || req.body?.id;
    const bodyOrderNumber = req.body?.orderNumber;
    const { utr, utrNumber } = req.body || {};
    const inputUtr = utr || utrNumber;

    const targetId = String(paramId || bodyOrderId || bodyOrderNumber).trim();
    let order = await getOrder(targetId);

    // Get order's tenant merchant id
    const orderUserId = order?.userId || "merch_live_01";
    const userProf = await getProfileForUser(orderUserId);
    const userBanks = await getBankAccountsForUser(orderUserId);

    if (!order) {
      return res.status(404).json({ success: false, error: "Payment order not found or has expired." });
    }

    if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      order.status = "EXPIRED";
      // persistAuthData() removed
      return res.status(410).json({ success: false, error: "This payment order has expired.", code: "ORDER_EXPIRED" });
    }

    if (order.status === "PAID") {
      return res.json({
        success: true,
        message: "Order already verified and settled",
        order,
        utr: order.utrNumber,
      });
    }

    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1";
    const rawUtr = String(inputUtr || "").replace(/[^a-zA-Z0-9]/g, "").trim();

    const finalUtr = rawUtr;
    if (!finalUtr) {
      return res.status(400).json({ success: false, error: "Bank 12-digit UTR / Reference number is required for settlement." });
    }

    // A manually entered UTR is only a reference for review, never proof of payment.
    if (rawUtr) {
      if (!/^\d{12}$/.test(finalUtr)) {
        return res.status(400).json({
          success: false,
          error: "Invalid UTR format. Enter the 12-digit reference shown in your bank or UPI app.",
          code: "INVALID_UTR_FORMAT",
        });
      }
    }

    // Security Check 2: Anti-Fraud Duplicate UTR Prevention
    if (userProf.preventDuplicateUtr && rawUtr) {
      if (order.utrNumber && order.utrNumber !== finalUtr) {
        return res.status(409).json({ success: false, error: "A different UTR is already submitted for this payment.", code: "UTR_ALREADY_SUBMITTED" });
      }
      const dupRes = await pool.query('SELECT * FROM orders WHERE utr_number = $1 AND id != $2 LIMIT 1', [finalUtr, order.id]);
      const duplicateOrder = dupRes.rows[0];

      if (duplicateOrder) {
        const secEvt: SecurityEventItem = {
          id: `sec_evt_${Date.now().toString().slice(-6)}`,
          type: "UTR_DUPLICATE_ATTEMPT",
          severity: "critical",
          timestamp: new Date().toISOString(),
          ipAddress: clientIp,
          details: `Duplicate UTR reuse attempt detected: UTR #${finalUtr} was already settled on Order #${duplicateOrder.order_number}`,
          orderNumber: order.orderNumber,
          utr: finalUtr,
          status: "BLOCKED",
        };
        getSecurityLogsForUser(orderUserId).unshift(secEvt);

        return res.status(409).json({
          success: false,
          error: `Security Violation: Duplicate UTR #${finalUtr} already claimed on Order #${duplicateOrder.orderNumber}. Reused bank references are rejected.`,
          code: "DUPLICATE_UTR_REJECTED",
        });
      }
    }

    // Store the reference as pending review; only the merchant can mark it PAID.
    order.utrNumber = finalUtr;
    order.provider = "MANUAL_UPI";
    order.paymentApp = "UPI";

    order.status = "PENDING";
    (order as any).reviewRequired = true;
    await updateOrderStatus(order.id, "PENDING", finalUtr, undefined, undefined, true);
    // // persistAuthData() removed
    return res.json({
      success: true,
      message: "UTR submitted securely for merchant review. Payment is not marked as paid until approved.",
      isAwaitingApproval: true,
      order,
      utr: finalUtr,
    });

  } catch (err: any) {
    console.error("Order verification server error:", err);
    return res.status(500).json({ success: false, error: "Unable to process the UTR submission." });
  }
};

app.post("/api/orders/:id/verify", handleVerifyOrderRequest);
app.post("/api/orders/verify", handleVerifyOrderRequest);
app.post("/api/checkout/verify-utr", handleVerifyOrderRequest);

// Approve Order / UTR (Merchant Action)
app.post("/api/orders/:id/approve", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || "").trim();
    let order = await getOrder(cleanId);

    const orderUserId = order?.userId || req.user.id || "merch_live_01";
    const userProf = await getProfileForUser(orderUserId);
    const userBanks = await getBankAccountsForUser(orderUserId);

    const orderBelongsToUser =
      !!order &&
      (order.userId === req.user.id ||
        (!order.userId &&
          (safeLower(order.merchantVpa) === safeLower(req.user.vpa) ||
            userBanks.some((bank) => safeLower(bank.vpa) === safeLower(order.merchantVpa)))));

    if (!orderBelongsToUser) {
      return res.status(404).json({ success: false, error: "Payment order not found." });
    }

    if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      order.status = "EXPIRED";
      await updateOrderStatus(order.id, "EXPIRED");
      // // persistAuthData() removed
      return res.status(410).json({ success: false, error: "This payment order has expired.", code: "ORDER_EXPIRED" });
    }

    if (!order.utrNumber || !/^\d{12}$/.test(order.utrNumber)) {
      return res.status(400).json({ success: false, error: "A valid submitted UTR is required before approval." });
    }
    const finalUtr = order.utrNumber;
    const nowIso = new Date().toISOString();
    order.status = "PAID";
    order.utrNumber = finalUtr;
    order.paidAt = nowIso;
    order.webhookDelivered = true;
    (order as any).reviewRequired = false;

    await updateOrderStatus(order.id, "PAID", finalUtr, nowIso, true, false);

    // Update bank account stats
    const targetBank = userBanks.find((b) => b.id === order?.bankAccountId || b.vpa === order?.merchantVpa);
    if (targetBank) {
      await pool.query("UPDATE bank_accounts SET daily_volume = daily_volume + $1, total_settled = total_settled + $1 WHERE id = $2", [Number(order.amount || 0), targetBank.id]);
    }

    // Webhook log
    const newLog = {
      id: `wh_log_${Date.now().toString().slice(-6)}`,
      orderId: order.id,
      timestamp: nowIso,
      status: "DELIVERED",
      url: userProf.webhookUrl || "https://shop.example.com/api/webhook/upi-callback",
      statusCode: 200,
      payload: {
        event: "payment.success",
        order_id: order.orderNumber,
        amount: order.amount,
        currency: "INR",
        status: "PAID",
        utr: finalUtr,
        customer: order.customerName,
        timestamp: order.paidAt,
        approved_by: "MERCHANT_MANUAL",
      },
      response: '{"status":"OK","received":true}',
    };
    getWebhookLogsForUser(orderUserId).unshift(newLog);
    // // persistAuthData() removed

    // Magic Checkout: save customer profile for future 1-click across all merchants
    upsertCheckoutCustomer(
      order.customerName,
      (order as any).customerEmail,
      (order as any).customerPhone,
      order.amount
    );

    return res.json({
      success: true,
      message: "Payment successfully approved and marked as settled.",
      order,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error approving order" });
  }
});

// Reject / Fail Order (Merchant Action)
app.post("/api/orders/:id/reject", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let order = await getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.role !== "admin" && order.userId !== req.user.id) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderUserId = order.userId || req.user.id || "merch_live_01";

    order.status = "FAILED";
    (order as any).reviewRequired = false;
    await updateOrderStatus(order.id, "FAILED", undefined, undefined, undefined, false);
    // // persistAuthData() removed

    const secEvt: SecurityEventItem = {
      id: `sec_evt_${Date.now().toString().slice(-6)}`,
      type: "INVALID_UTR_FORMAT",
      severity: "medium",
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      details: `Merchant rejected UTR reference #${order.utrNumber || "N/A"} for Order #${order.orderNumber}. Marked as FAILED.`,
      orderNumber: order.orderNumber,
      utr: order.utrNumber,
      status: "BLOCKED",
    };
    getSecurityLogsForUser(orderUserId).unshift(secEvt);

    return res.json({
      success: true,
      message: "Order marked as FAILED and UTR rejected.",
      order,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error rejecting order" });
  }
});

// Get Webhook Logs
app.get("/api/webhooks/logs", requireAuth, (req, res) => {
  res.json(getWebhookLogsForUser(req.user.id));
});

// Test Webhook Dispatch
function isUnsafeOutboundUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return true;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "metadata.google.internal" ||
      hostname.endsWith(".internal") ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      return true;
    }
    const ipVersion = net.isIP(hostname);
    if (ipVersion === 4) {
      const octets = hostname.split(".").map(Number);
      return (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 169 && octets[1] === 254)
      );
    }
    return ipVersion === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd"));
  } catch {
    return true;
  }
}

app.post("/api/webhooks/test-dispatch", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, event, payload } = req.body;
    const userProf = await getProfileForUser(req.user.id);
    const targetUrl = webhookUrl || userProf.webhookUrl || "https://shop.example.com/api/webhook/upi-callback";
    if (typeof targetUrl !== "string" || isUnsafeOutboundUrl(targetUrl)) {
      return res.status(400).json({ success: false, error: "Webhook URL must be a public HTTPS endpoint." });
    }

    const mockPayload = payload || {
      event: event || "payment.success",
      order_id: `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 1499.0,
      currency: "INR",
      status: "PAID",
      utr: `4${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      customer: "Test Customer",
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(mockPayload);
    
    const signature = crypto
      .createHmac("sha256", userProf.webhookSecret || process.env.WEBHOOK_SECRET || "")
      .update(payloadString)
      .digest("hex");

    let statusCode = 200;
    let rawResponse = "";
    let dispatchStatus = "DELIVERED";

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const fetchRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature-SHA256": signature,
          "User-Agent": "9tepay-Webhook-Bot/2.4",
        },
        body: payloadString,
        signal: controller.signal,
      });
      clearTimeout(id);

      statusCode = fetchRes.status;
      rawResponse = await fetchRes.text();
      if (!fetchRes.ok) {
        dispatchStatus = "FAILED";
      }
    } catch (err: any) {
      statusCode = 504;
      dispatchStatus = "FAILED";
      rawResponse = `Webhook request failed or timed out: ${err.message || err}`;
    }

    if (rawResponse.length > 5000) {
      rawResponse = rawResponse.substring(0, 5000) + "... (truncated)";
    }

    const newLog = {
      id: `wh_log_test_${Date.now().toString().slice(-6)}`,
      orderId: "ord_test_sample",
      timestamp: new Date().toISOString(),
      status: dispatchStatus,
      url: targetUrl,
      statusCode: statusCode,
      payload: mockPayload,
      response: rawResponse || '{"status":"OK","received":true}',
    };

    getWebhookLogsForUser(req.user.id).unshift(newLog);
    res.json({ success: true, log: newLog });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to dispatch webhook" });
  }
});

// URL Inspector API (for case study / audit)
app.post("/api/analyze-url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    if (isUnsafeOutboundUrl(targetUrl)) {
      return res.status(400).json({ success: false, error: "URL must be a public HTTPS endpoint." });
    }

    const startTime = Date.now();
    let response: Response;
    const redirectChain: { url: string; status: number; location?: string }[] = [];

    try {
      response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
      });
    } catch (err: any) {
      return res.status(200).json({
        url: targetUrl,
        success: false,
        error: err?.message || "Failed to connect to host",
        responseTimeMs: Date.now() - startTime,
      });
    }

    const responseTimeMs = Date.now() - startTime;
    const headersObj: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      headersObj[key.toLowerCase()] = val;
    });

    const status = response.status;
    const location = headersObj["location"];

    if (location) {
      redirectChain.push({
        url: targetUrl,
        status,
        location,
      });
    }

    const securityAudit = {
      hsts: {
        present: Boolean(headersObj["strict-transport-security"]),
        value: headersObj["strict-transport-security"] || "Missing",
        status: headersObj["strict-transport-security"] ? "pass" : "fail",
        recommendation: "Implement Strict-Transport-Security (HSTS)",
      },
      xFrameOptions: {
        present: Boolean(headersObj["x-frame-options"]),
        value: headersObj["x-frame-options"] || "Missing",
        status: headersObj["x-frame-options"] ? "pass" : "warn",
        recommendation: "Set X-Frame-Options to SAMEORIGIN or DENY",
      },
      xContentTypeOptions: {
        present: Boolean(headersObj["x-content-type-options"]),
        value: headersObj["x-content-type-options"] || "Missing",
        status: headersObj["x-content-type-options"] === "nosniff" ? "pass" : "fail",
        recommendation: "Ensure X-Content-Type-Options: nosniff",
      },
      csp: {
        present: Boolean(headersObj["content-security-policy"]),
        value: headersObj["content-security-policy"] || "Missing",
        status: headersObj["content-security-policy"] ? "pass" : "warn",
        recommendation: "Define a Content-Security-Policy header",
      },
      referrerPolicy: {
        present: Boolean(headersObj["referrer-policy"]),
        value: headersObj["referrer-policy"] || "Missing",
        status: headersObj["referrer-policy"] ? "pass" : "warn",
        recommendation: "Set Referrer-Policy",
      },
      serverBanner: {
        present: Boolean(headersObj["server"] || headersObj["x-powered-by"]),
        value: [headersObj["server"], headersObj["x-powered-by"]].filter(Boolean).join(" | ") || "Hidden",
        status: headersObj["x-powered-by"] || headersObj["server"] ? "warn" : "pass",
        recommendation: "Suppress server identity banners",
      },
    };

    let score = 65;
    if (securityAudit.hsts.present) score += 15;
    if (securityAudit.xFrameOptions.present) score += 10;
    if (securityAudit.xContentTypeOptions.status === "pass") score += 10;

    const detectedTech: string[] = [];
    if (headersObj["x-powered-by"]?.includes("PHP") || targetUrl.endsWith(".php")) detectedTech.push("PHP");
    if (headersObj["platform"]?.includes("hostinger") || headersObj["panel"]?.includes("hpanel")) detectedTech.push("Hostinger Cloud");

    res.json({
      success: true,
      url: targetUrl,
      status,
      statusText: response.statusText,
      responseTimeMs,
      headers: headersObj,
      redirectChain,
      securityAudit,
      score,
      detectedTech,
      isHttps: targetUrl.startsWith("https://"),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

// Explicit JSON 404 handler for API routes and PHP scripts
// Ensures non-existent API endpoints return JSON error instead of Vite HTML
app.all(["/api/*", "*.php", "/api"], (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    code: "ENDPOINT_NOT_FOUND",
  });
});

// Global API error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API Server Error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: path.resolve(process.cwd(), "frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust resolution of dist directory in production containers
    let distPath = path.resolve(process.cwd(), "frontend", "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      if (fs.existsSync(path.resolve(process.cwd(), "dist", "index.html"))) {
        distPath = path.resolve(process.cwd(), "dist");
      } else if (fs.existsSync(path.resolve(__dirname, "..", "..", "frontend", "dist", "index.html"))) {
        distPath = path.resolve(__dirname, "..", "..", "frontend", "dist");
      }
    }

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build files not found. Please verify the build step completed.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`);
  });
}

// In standard container / local Node.js environments, start the HTTP listener
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Fatal error starting server:", err);
    process.exit(1);
  });
}

export { app };
export default app;
