export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface BankAccountQR {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  vpa: string;
  qrTitle: string;
  qrType: 'dynamic_intent' | 'static_soundbox' | 'custom_branding' | 'custom_upload';
  qrColor?: string;
  customQrImage?: string; // Uploaded custom QR code (Base64 data URL or URL)
  isPrimary: boolean;
  isActive: boolean;
  dailyLimit: number;
  dailyVolume: number;
  totalSettled: number;
  routingWeight: number; // 1 to 10 for round-robin weighting
  bankLogo?: string;
  createdAt: string;
}

export type BankRoutingStrategy = 'smart_round_robin' | 'primary_only' | 'limit_aware' | 'manual';

export interface SecurityEvent {
  id: string;
  type: 'UTR_DUPLICATE_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'SIGNATURE_MISMATCH' | 'INVALID_UTR_FORMAT' | 'IP_ANOMALY';
  severity: 'high' | 'medium' | 'critical' | 'info';
  timestamp: string;
  ipAddress: string;
  details: string;
  orderNumber?: string;
  utr?: string;
  status: 'BLOCKED' | 'FLAGGED' | 'RESOLVED';
}

export interface Order {
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
  status: OrderStatus;
  utrNumber?: string;
  reviewRequired?: boolean;
  paymentApp?: string;
  provider?: string;
  upiString: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  callbackUrl?: string;
  webhookDelivered?: boolean;
}

export interface MerchantProfile {
  businessName: string;
  vpa: string;
  phone: string;
  email: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  autoApproveUtr: boolean;
  settlementRate: number;
  routingStrategy?: BankRoutingStrategy;
  requireStrictUtrFormat?: boolean;
  preventDuplicateUtr?: boolean;
}

export interface WebhookLog {
  id: string;
  orderId: string;
  timestamp: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  url: string;
  statusCode: number;
  payload: Record<string, any>;
  response?: string;
}

export interface UpilinkConfig {
  merchantVpa: string;
  merchantName: string;
  amount: number;
  orderNumber: string;
  note: string;
}

// Audit & Analysis Interfaces
export interface RedFlagItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface SecurityCheckItem {
  id?: string;
  name: string;
  header?: string;
  status: 'pass' | 'warn' | 'fail';
  value?: string;
  observedValue?: string;
  description?: string;
  recommendation: string;
}

export interface TechStackItem {
  category: string;
  name: string;
  version?: string;
  confidence: string;
  evidence: string;
}

export interface EndpointInfo {
  path: string;
  method?: string;
  type?: 'auth' | 'admin' | 'merchant' | 'api' | 'payment';
  status: number;
  authRequired: boolean;
  purpose?: string;
  details?: string;
  description?: string;
}

export interface GatewayWorkflowStep {
  step: number;
  title: string;
  description: string;
  risks: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'merchant' | 'admin';
  businessName?: string;
  vpa?: string;
  status: 'active' | 'suspended' | 'pending_kyc';
  createdAt: string;
}

export interface AdminStats {
  totalMerchants: number;
  totalGmv: number;
  totalTransactions: number;
  webhookSuccessRate: number;
  activeVpas: number;
  serverUptime: string;
  phpVersion: string;
  hostingerNode: string;
  reconciliationQueue: number;
}

export interface MerchantListItem {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  vpa: string;
  bankAccount?: string;
  ifsc?: string;
  commissionRate: number;
  status: 'active' | 'suspended' | 'pending_kyc';
  totalVolume: number;
  totalOrders: number;
  createdAt: string;
}

export interface TargetAnalysisData {
  url: string;
  canonicalUrl: string;
  domain: string;
  title: string;
  summary: string;
  riskRating: string;
  riskScore: number;
  hosting: {
    provider: string;
    server: string;
    cdn: string;
    phpVersion: string;
    panel: string;
    ipAddresses: string[];
  };
  headers: Record<string, string>;
  cookieAnalysis: {
    cookieName: string;
    lifetime: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    evaluation: string;
  };
  redFlags: RedFlagItem[];
  securityChecks?: SecurityCheckItem[];
  securityAudit?: SecurityCheckItem[];
  techStack: TechStackItem[];
  endpoints: EndpointInfo[];
  workflow?: GatewayWorkflowStep[];
  workflowSteps?: GatewayWorkflowStep[];
}
