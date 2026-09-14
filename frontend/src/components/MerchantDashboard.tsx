import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PlusCircle,
  Key,
  Webhook,
  Settings,
  ExternalLink,
  Copy,
  Check,
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  Sliders,
  PieChart as PieChartIcon,
  BarChart3,
  XCircle,
  Radio,
  QrCode,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Eye,
  EyeOff, FileText, Repeat, Route,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Order, MerchantProfile, WebhookLog, BankAccountQR, BankRoutingStrategy, SecurityEvent } from '../types';
import { formatCurrency } from '../utils/upi';
import { BankAccountsManager } from './BankAccountsManager';
import { SecurityCenterPanel } from './SecurityCenterPanel';
import { TransactionsManager } from './TransactionsManager';
import { CustomersManager } from './CustomersManager';
import { InvoicesManager } from './InvoicesManager';
import { SubscriptionsManager } from './SubscriptionsManager';
import { SplitPaymentsManager } from './SplitPaymentsManager';
import { QRCodeSVG } from 'qrcode.react';

interface MerchantDashboardProps {
  orders: Order[];
  profile: MerchantProfile;
  webhookLogs: WebhookLog[];
  bankAccounts?: BankAccountQR[];
  onApproveOrder?: (orderId: string) => Promise<void>;
  onRejectOrder?: (orderId: string) => Promise<void>;
  onAddBank?: (bank: Partial<BankAccountQR>) => Promise<void>;
  onUpdateBank?: (id: string, bank: Partial<BankAccountQR>) => Promise<void>;
  onDeleteBank?: (id: string) => Promise<void>;
  onSetPrimary?: (id: string) => Promise<void>;
  onToggleActive?: (id: string) => Promise<void>;
  routingStrategy?: BankRoutingStrategy;
  onUpdateRoutingStrategy?: (strategy: BankRoutingStrategy, strictUtr: boolean, preventDup: boolean) => Promise<void>;
  securityEvents?: SecurityEvent[];
  onTriggerSecurityProbe?: (type: string, orderNumber: string, utr: string) => Promise<void>;
  onOpenCheckout: (order: Order) => void;
  onCreateOrder: (newOrderData: any) => Promise<Order>;
  onUpdateProfile: (updatedProfile: Partial<MerchantProfile>) => Promise<void>;
  onRegenerateKeys: () => Promise<void>;
  onTriggerTestWebhook: () => Promise<void>;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  orders = [],
  profile = {} as MerchantProfile,
  webhookLogs = [],
  bankAccounts = [],
  onApproveOrder = async (_orderId: string) => {},
  onRejectOrder = async (_orderId: string) => {},
  onAddBank = async () => {},
  onUpdateBank = async () => {},
  onDeleteBank = async () => {},
  onSetPrimary = async () => {},
  onToggleActive = async () => {},
  routingStrategy = 'smart_round_robin',
  onUpdateRoutingStrategy = async () => {},
  securityEvents = [],
  onTriggerSecurityProbe = async () => {},
  onOpenCheckout,
  onCreateOrder,
  onUpdateProfile,
  onRegenerateKeys,
  onTriggerTestWebhook,
}) => {
  type TabType = 'transactions' | 'customers' | 'invoices' | 'subscriptions' | 'routing' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings';
  
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    const validTabs = ['transactions', 'customers', 'invoices', 'subscriptions', 'routing', 'orders', 'banks', 'security', 'analytics', 'api', 'webhooks', 'settings'];
    return validTabs.includes(hash) ? hash : 'transactions';
  });

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.history.pushState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      const validTabs = ['transactions', 'customers', 'invoices', 'subscriptions', 'routing', 'orders', 'banks', 'security', 'analytics', 'api', 'webhooks', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('transactions');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'EXPIRED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showApiCredentials, setShowApiCredentials] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<string | null>(null);

  // Form states for creating an order
  const [amount, setAmount] = useState('1499.00');
  const [customerName, setCustomerName] = useState('Aarav Sharma');
  const [customerEmail, setCustomerEmail] = useState('aarav@example.com');
  const [customerPhone, setCustomerPhone] = useState('+91 98230 11223');
  const [note, setNote] = useState('E-Commerce Order Purchase');
  const [orderId, setOrderId] = useState(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [createdPayment, setCreatedPayment] = useState<Order | null>(null);
  const [createError, setCreateError] = useState('');
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState('');

  // Settings form states
  const [editBusinessName, setEditBusinessName] = useState(profile?.businessName || '');
  const [editVpa, setEditVpa] = useState(profile?.vpa || '');
  const [editWebhookUrl, setEditWebhookUrl] = useState(profile?.webhookUrl || '');
  const [editAutoApprove, setEditAutoApprove] = useState(profile?.autoApproveUtr ?? true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Computations
  const safeOrders = orders || [];
  const safeBanks = bankAccounts || [];
  const paidOrders = safeOrders.filter((o) => o?.status === 'PAID');
  const pendingOrders = safeOrders.filter((o) => o?.status === 'PENDING');
  const expiredOrders = safeOrders.filter((o) => o?.status === 'EXPIRED');
  const totalVolume = paidOrders.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const todayVolume = paidOrders.slice(0, 4).reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const successRate = safeOrders.length ? Math.round((paidOrders.length / safeOrders.length) * 100) : 100;
  const avgTicketSize = paidOrders.length ? Math.round(totalVolume / paidOrders.length) : 0;
  const activeBanksCount = safeBanks.filter((b) => b?.isActive).length;

  const filteredOrders = safeOrders.filter((o) => {
    if (!o) return false;
    if (orderFilter === 'ALL') return true;
    return o.status === orderFilter;
  });

  // Chart data
  const volumeTrendData = [
    { day: 'Mon', volume: 1850, txs: 3 },
    { day: 'Tue', volume: 3200, txs: 5 },
    { day: 'Wed', volume: 2450, txs: 4 },
    { day: 'Thu', volume: 4800, txs: 7 },
    { day: 'Fri', volume: 3900, txs: 6 },
    { day: 'Sat', volume: 6200, txs: 9 },
    { day: 'Sun (Today)', volume: totalVolume > 0 ? totalVolume : 4848, txs: orders.length },
  ];

  const upiAppShareData = [
    { name: 'Google Pay', value: 42, color: '#3b82f6' },
    { name: 'PhonePe', value: 35, color: '#8b5cf6' },
    { name: 'Paytm UPI', value: 13, color: '#06b6d4' },
    { name: 'BHIM NPCI', value: 6, color: '#10b981' },
    { name: 'CRED / Navi', value: 4, color: '#f59e0b' },
  ];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const created = await onCreateOrder({
        amount: Number(amount),
        orderId,
        customerName,
        customerEmail,
        customerPhone,
        note,
        bankAccountId: selectedBankId || undefined,
      });
      setShowCreateModal(false);
      setCreatedPayment(created);
      setOrderId(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err) {
      console.error(err);
      setCreateError(err instanceof Error ? err.message : 'Unable to create payment link. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateProfile({
        businessName: editBusinessName,
        vpa: editVpa,
        webhookUrl: editWebhookUrl,
        autoApproveUtr: editAutoApprove,
      });
      setSaveSuccessMsg('Merchant profile & settlement VPA updated successfully.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelOrder = async (orderIdToCancel: string) => {
    try {
      await fetch(`/api/orders/${orderIdToCancel}/cancel`, { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const copyText = async (text: string, setter: (val: boolean) => void) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch {
      // ignore
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const copyOrderLink = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch {
      // ignore
    }
    setCopiedLinkIndex(id);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Settled Volume */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Volume Settled</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalVolume)}
          </div>
          <div className="text-[11px] text-blue-600 mt-1 flex items-center gap-1 font-medium font-mono">
            <span>Direct to VPA: {typeof profile?.vpa === "string" ? profile.vpa : "Not configured"}</span>
          </div>
        </div>

        {/* Today's Transactions */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Today's Inflow</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(todayVolume)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            <span>{paidOrders.length} Paid &bull; Avg ₹{avgTicketSize}</span>
          </div>
        </div>

        {/* Bank VPAs & Fleet */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Bank VPAs &amp; QRs</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <span>{activeBanksCount} Active</span>
            <span className="text-xs text-slate-400 font-normal">/ {bankAccounts.length}</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Load Balancing: {routingStrategy === 'smart_round_robin' ? 'Round-Robin' : 'Capacity'}</span>
          </div>
        </div>

        {/* Active VPA / Quick Action */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">
              Primary Settlement VPA
            </div>
            <div className="text-xs font-mono text-slate-800 font-bold truncate mt-1">
              {typeof profile?.vpa === "string" ? profile.vpa : "Not configured"}
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Payment Link</span>
          </button>
        </div>
      </div>

      {/* Pending UTR Review Banner */}
      {(() => {
        const pendingReview = orders.filter((o) => o.status === 'PENDING' && o.utrNumber);
        if (pendingReview.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 animate-pulse" />
                <span>Action Required: {pendingReview.length} Pending UTR Submission{pendingReview.length > 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                View in Transactions &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingReview.map((o) => (
                <div key={o.id} className="bg-white/90 backdrop-blur-xs border border-amber-200 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900">{typeof o.orderNumber === "string" ? o.orderNumber : typeof o.id === "string" ? o.id : "ORD"}</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(o.amount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Customer: <span className="font-semibold text-slate-900">{typeof o.customerName === "string" ? o.customerName : "Unknown"}</span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-1.5 border border-amber-200/60 inline-block font-semibold">
                      UTR: {typeof o.utrNumber === "string" ? o.utrNumber : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-100">
                    <button
                      disabled={approvingOrderId === o.id}
                      onClick={async () => {
                        setApprovingOrderId(o.id);
                        setApprovalError('');
                        try {
                          await onApproveOrder?.(o.id);
                        } catch (error: any) {
                          setApprovalError(error?.message || 'Unable to approve this transaction. Please try again.');
                        } finally {
                          setApprovingOrderId(null);
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      {approvingOrderId === o.id ? <span>Approving...</span> : <><Check className="w-3.5 h-3.5" /><span>Approve</span></>}
                    </button>
                    <button
                      onClick={() => onRejectOrder?.(o.id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {approvalError && (
              <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {approvalError}
              </div>
            )}
          </div>
        );
      })()}

      {/* Subnavigation Menu */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Transactions &amp; UTR Approval ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Customers</span>
          </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'subscriptions'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'routing'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Routing Rules</span>
            </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Orders Ledger
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'banks'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank Accounts &amp; QRs ({bankAccounts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; Anti-Fraud</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics &amp; Trends</span>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'webhooks'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks ({webhookLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>VPA Settings</span>
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm shadow-blue-600/20"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Payment</span>
        </button>
      </div>

      {/* TAB 1: Transactions & UTR Approval */}
      {activeTab === 'transactions' && (
        <TransactionsManager
          orders={orders}
          onApproveOrder={onApproveOrder}
          onRejectOrder={onRejectOrder}
          onOpenCheckout={onOpenCheckout}
        />
      )}

      {/* TAB 1B: Customer Directory */}
      {activeTab === 'customers' && (
        <CustomersManager orders={orders} />
      )}
        {activeTab === 'invoices' && (
          <InvoicesManager />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsManager />
        )}
        {activeTab === 'routing' && (
          <SplitPaymentsManager />
        )}

      {/* TAB 2: Multiple Bank Accounts & QR Fleet */}
      {activeTab === 'banks' && (
        <BankAccountsManager
          bankAccounts={bankAccounts}
          onAddBank={onAddBank}
          onUpdateBank={onUpdateBank}
          onDeleteBank={onDeleteBank}
          onSetPrimary={onSetPrimary}
          onToggleActive={onToggleActive}
          routingStrategy={routingStrategy}
          onUpdateRoutingStrategy={onUpdateRoutingStrategy}
          requireStrictUtr={profile.requireStrictUtrFormat}
          preventDuplicateUtr={profile.preventDuplicateUtr}
        />
      )}

      {/* TAB 3: Security & Anti-Fraud Center */}
      {activeTab === 'security' && (
        <SecurityCenterPanel
          securityEvents={securityEvents}
          onTriggerSecurityProbe={onTriggerSecurityProbe}
          apiKey={profile.apiKey}
          apiSecret={profile.apiSecret}
          webhookSecret={profile.webhookSecret}
        />
      )}

      {/* TAB 1: Orders Ledger */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Payment Intent Ledger</h3>
              <p className="text-xs text-slate-500">
                Generated orders, intent links, and settlement verification statuses
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setOrderFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  orderFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => setOrderFilter('PAID')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  orderFilter === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid ({paidOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  orderFilter === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('EXPIRED')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  orderFilter === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expired ({expiredOrders.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-2.5 px-3">Order ID / Ref</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Bank UTR</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No orders found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 font-mono">{order.orderNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{order.id}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{order.note || '-'}</div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900 font-mono">
                        {formatCurrency(order.amount)}
                      </td>

                      <td className="py-3 px-3">
                        {order.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        )}
                        {order.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                        {order.status === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Expired</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {order.utrNumber ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                            {order.utrNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenCheckout(order)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Checkout</span>
                        </button>

                        <button
                          onClick={() => copyOrderLink(order.id, `${window.location.origin}/checkout/${order.id}`)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[11px] transition-colors cursor-pointer border border-slate-200 inline-flex items-center gap-1 shadow-xs"
                          title="Copy Checkout Link"
                        >
                          {copiedLinkIndex === order.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>

                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] transition-colors cursor-pointer border border-rose-200"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Analytics & Trends */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue & Volume 7-Day Trend Chart */}
          <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>7-Day Volume &amp; Transaction Trend</span>
              </h3>
              <p className="text-xs text-slate-500">
                Daily settled volume processed directly to your merchant UPI VPA
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeTrendData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Settled Volume']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* UPI App Split */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-blue-600" />
                <span>UPI App Inflow Share</span>
              </h3>
              <p className="text-xs text-slate-500">
                Customer intent distribution across apps
              </p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={upiAppShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {upiAppShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs">
              {upiAppShareData.map((app) => (
                <div key={app.name} className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: app.color }} />
                    <span>{app.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{app.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: API Credentials */}
      {activeTab === 'api' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Merchant REST API Credentials</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Authenticate programmatic order creation and intent generation via <code className="text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded">X-API-Key</code>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Live Public API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={showApiCredentials ? profile.apiKey : '••••••••••••••••••••'}
                  className="flex-1 bg-slate-50 border border-slate-200 text-blue-700 font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
                <button
                  onClick={() => copyText(profile.apiKey, setCopiedKey)}
                  disabled={!showApiCredentials}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Live API Secret (Keep Private)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={showApiCredentials ? profile.apiSecret : '••••••••••••••••••••'}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
                <button
                  onClick={() => copyText(profile.apiSecret, setCopiedSecret)}
                  disabled={!showApiCredentials}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Credentials are hidden by default. Reveal only when working on a trusted device.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiCredentials((visible) => !visible)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {showApiCredentials ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showApiCredentials ? 'Hide' : 'Reveal'}</span>
                </button>
                <button
                  onClick={onRegenerateKeys}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Roll Keys</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Webhook className="w-4 h-4 text-blue-600" />
                <span>Real-Time Webhook Dispatch Center</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Receive instant HTTP POST callbacks signed with HMAC-SHA256 when payments succeed
              </p>
            </div>

            <button
              onClick={onTriggerTestWebhook}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test Webhook Dispatch</span>
            </button>
          </div>

          {/* Webhook Secret */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-slate-800">Webhook Secret Key</div>
              <div className="text-emerald-700 text-[11px] mt-0.5 font-semibold">Stored securely on the server</div>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Header: X-Signature-SHA256</span>
          </div>

          {/* Webhook Delivery Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Recent Webhook Dispatches
            </h4>

            {webhookLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                No webhook calls logged yet. Complete a payment to trigger a callback.
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.statusCode} OK
                        </span>
                        <span className="font-mono text-slate-800 text-[11px] truncate max-w-xs">{log.url}</span>
                      </div>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="p-2 bg-slate-900 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: VPA Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>UPI Receiver VPA &amp; Settlement Profile</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure receiver UPI identifiers for direct P2P customer payments
            </p>
          </div>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business / Display Name
                </label>
                <input
                  type="text"
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Settlement UPI VPA
                </label>
                <input
                  type="text"
                  value={editVpa}
                  onChange={(e) => setEditVpa(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-blue-700 font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Webhook Callback Endpoint URL
              </label>
              <input
                type="url"
                value={editWebhookUrl}
                onChange={(e) => setEditWebhookUrl(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="autoApprove"
                checked={editAutoApprove}
                onChange={(e) => setEditAutoApprove(e.target.checked)}
                className="rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoApprove" className="text-xs text-slate-700 cursor-pointer">
                Auto-approve submitted 12-digit UTR references instantly (Demo Testing Mode)
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Payment Intent */}
      {createdPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Payment link created</h3>
                <p className="text-xs text-slate-500 mt-1">Share this link or QR code with your customer.</p>
              </div>
              <button type="button" onClick={() => setCreatedPayment(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close payment link dialog">✕</button>
            </div>
            <div className="flex justify-center">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <QRCodeSVG value={`${window.location.origin}/checkout/${createdPayment.id}`} size={190} level="M" includeMargin />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer checkout link</label>
              <div className="flex gap-2">
                <input readOnly value={`${window.location.origin}/checkout/${createdPayment.id}`} className="min-w-0 flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2" />
                <button type="button" onClick={() => copyOrderLink(createdPayment.id, `${window.location.origin}/checkout/${createdPayment.id}`)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer">
                  {copiedLinkIndex === createdPayment.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.open(`/checkout/${createdPayment.id}`, '_blank', 'noopener,noreferrer')} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">Open checkout</button>
              <button type="button" onClick={() => setCreatedPayment(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>Create Instant UPI Payment Link</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount in INR (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 text-slate-900 text-base font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Note / Item
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Route to Bank Account / QR
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">⚡ Auto Multi-Bank Engine ({routingStrategy === 'smart_round_robin' ? 'Smart Round-Robin' : routingStrategy === 'limit_aware' ? 'Limit-Aware Balance' : 'Primary Bank Only'})</option>
                  {bankAccounts.filter(b => b.isActive).map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName} - {bank.accountHolder} ({bank.vpa}) {bank.isPrimary ? '★ Primary' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Select a specific bank or let the smart routing engine distribute transaction volume across your active bank accounts automatically.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-mono">
                Settlement UPI VPA: {selectedBankId ? (bankAccounts.find(b => b.id === selectedBankId)?.vpa || profile.vpa) : profile.vpa}
              </div>

              {createError && (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" role="alert">
                  {createError}
                </div>
              )}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isCreating ? 'Generating Link...' : 'Create Payment Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
