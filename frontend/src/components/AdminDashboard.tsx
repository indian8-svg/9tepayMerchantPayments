import React, { useState, useEffect } from 'react';
import {
  Shield,
  Server,
  Users,
  Activity,
  DollarSign,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Radio,
  TrendingUp,
  Clock3,
  ServerCog,
  ArrowUpRight,
  WalletCards,
  UserPlus,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { AdminStats, MerchantListItem, Order } from '../types';
import { formatCurrency } from '../utils/upi';
import { safeFetch } from '../utils/api';

interface AdminDashboardProps {
  orders: Order[];
  onRefreshOrders?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, onRefreshOrders }) => {
  const [stats, setStats] = useState<AdminStats>({
    totalMerchants: 4,
    totalGmv: 54448.0,
    totalTransactions: 33,
    webhookSuccessRate: 99.4,
    activeVpas: 3,
    serverUptime: '99.98% (Hostinger hCDN Edge)',
    phpVersion: 'PHP/8.3.31 (FPM/FastCGI)',
    hostingerNode: 'hcdn-nme-edge-2a02',
    reconciliationQueue: 0,
  });

  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reconciliationMsg, setReconciliationMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended' | 'pending_kyc'>('ALL');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, merchRes] = await Promise.all([
        safeFetch<AdminStats>('/api/admin/stats'),
        safeFetch<MerchantListItem[]>('/api/admin/merchants'),
      ]);

      if (statsRes.ok && statsRes.data) {
        setStats(statsRes.data);
      }
      if (merchRes.ok && merchRes.data) {
        setMerchants(merchRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (merchant: MerchantListItem) => {
    const nextStatus = merchant.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await safeFetch<{ success: boolean }>(
        `/api/admin/merchants/${merchant.id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (res.ok) {
        setMerchants((prev) =>
          prev.map((m) => (m.id === merchant.id ? { ...m, status: nextStatus } : m))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveKyc = async (merchantId: string) => {
    try {
      const res = await safeFetch<{ success: boolean }>(
        `/api/admin/merchants/${merchantId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'active' }),
        }
      );
      if (res.ok) {
        setMerchants((prev) =>
          prev.map((m) => (m.id === merchantId ? { ...m, status: 'active' } : m))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReconcileAll = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetch<{ success: boolean; message: string }>(
        '/api/admin/reconcile-all',
        { method: 'POST' }
      );
      if (res.ok && res.data?.success) {
        setReconciliationMsg(typeof res.data.message === "string" ? res.data.message : "Reconciliation complete.");
        if (onRefreshOrders) onRefreshOrders();
        fetchAdminData();
        setTimeout(() => setReconciliationMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMerchants = merchants.filter((m) => {
    const matchesSearch =
      (m.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.vpa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pendingApprovals = orders.filter((order) => order.status === 'PENDING' && Boolean(order.utrNumber));
  const paidOrders = orders.filter((order) => order.status === 'PAID');
  const paidToday = paidOrders.filter((order) => {
    const timestamp = order.paidAt || order.createdAt;
    return timestamp && new Date(timestamp).toDateString() === new Date().toDateString();
  });
  const todayVolume = paidToday.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                demotry.shop/admin/dashboard.php
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Master Superadmin Console
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <span>Platform Administration &amp; Merchant Governance</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Global oversight across all registered merchant VPAs, automated banking SMS reconciliation engine, and Hostinger server runtime.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReconcileAll}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-4 h-4 text-emerald-100 animate-pulse" />
              <span>Trigger SMS Reconciliation</span>
            </button>

            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {reconciliationMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reconciliationMsg}</span>
          </div>
        )}
      </div>

      {/* Operations command strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-slate-950 text-white p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-blue-300 text-[11px] font-bold uppercase tracking-[0.18em]">
                <Activity className="w-3.5 h-3.5" />
                Live operations center
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-2">Everything important, one view.</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xl">
                Monitor money movement, approve payment proofs, govern merchant access, and keep the gateway healthy.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Systems operational
            </div>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
            {[
              { label: 'Approvals', value: pendingApprovals.length, icon: Clock3, tone: 'text-amber-300' },
              { label: 'Paid today', value: paidToday.length, icon: CheckCircle2, tone: 'text-emerald-300' },
              { label: 'Live VPAs', value: stats.activeVpas, icon: WalletCards, tone: 'text-blue-300' },
              { label: 'Webhook SLA', value: `${stats.webhookSuccessRate}%`, icon: ShieldCheck, tone: 'text-violet-300' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
                <Icon className={`w-4 h-4 ${tone} mb-2`} />
                <div className="text-lg font-black">{value}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Today at a glance
            </div>
            <span className="text-[10px] font-mono text-slate-400">IST</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-4">{formatCurrency(todayVolume)}</div>
          <p className="text-xs text-slate-500 mt-1">Settled volume across {paidToday.length} successful payments.</p>
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total orders</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{orders.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pending review</div>
              <div className="text-sm font-bold text-amber-700 mt-1">{pendingApprovals.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Platform GMV</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(stats.totalGmv)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            All Onboarded Merchants
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Active Merchants</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.totalMerchants} Accounts
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-mono font-semibold">
            <span>{stats.activeVpas} Active VPAs Routing</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Webhook Reliability</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.webhookSuccessRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Avg Latency: 142ms
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Hostinger Server Runtime</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 mt-2 truncate font-mono">
            {stats.phpVersion}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Edge: {stats.hostingerNode}
          </div>
        </div>
      </div>

      {/* Merchant Registry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Registered Merchant Accounts &amp; Settlements</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage merchant statuses, custom fee rates, and receiver UPI virtual payment addresses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search merchant or VPA..."
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_kyc">Pending KYC</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Merchant / Business</th>
                <th className="py-3 px-4">Receiver UPI VPA</th>
                <th className="py-3 px-4">Settled Volume</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredMerchants.map((merchant) => (
                <tr key={merchant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{merchant.businessName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {typeof merchant.ownerName === "string" ? merchant.ownerName : "Unknown"} &bull; {typeof merchant.email === "string" ? merchant.email : ""}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                      {typeof merchant.vpa === "string" ? merchant.vpa : ""}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                    {formatCurrency(merchant.totalVolume)}
                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                      ({merchant.totalOrders} txs)
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {merchant.commissionRate.toFixed(1)}%
                  </td>

                  <td className="py-3.5 px-4">
                    {merchant.status === 'active' && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Active</span>
                      </span>
                    )}
                    {merchant.status === 'pending_kyc' && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Pending KYC</span>
                      </span>
                    )}
                    {merchant.status === 'suspended' && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        <X className="w-3 h-3 text-rose-600" />
                        <span>Suspended</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-2">
                    {merchant.status === 'pending_kyc' && (
                      <button
                        onClick={() => handleApproveKyc(merchant.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Approve KYC
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleStatus(merchant)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        merchant.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {merchant.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent payment activity</h3>
              <p className="text-[11px] text-slate-500 mt-1">Latest gateway events across your platform.</p>
            </div>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No payment activity yet.</div>
            ) : recentOrders.map((order) => (
              <div key={order.id} className="py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${order.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : order.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {order.status === 'PAID' ? <CheckCircle2 className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{order.orderNumber || order.id}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{order.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{order.customerName || 'Guest customer'} · {order.merchantVpa}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">{formatCurrency(order.amount)}</div>
                  <div className="text-[10px] text-slate-400">{new Date(order.paidAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Admin toolkit</h3>
              <p className="text-[11px] text-slate-500 mt-1">Shortcuts for daily operations.</p>
            </div>
            <ServerCog className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-2">
            {[
              { label: 'Review payment approvals', detail: `${pendingApprovals.length} waiting for action`, icon: Clock3, color: 'text-amber-600 bg-amber-50' },
              { label: 'Manage merchant access', detail: `${merchants.length} registered accounts`, icon: UserPlus, color: 'text-blue-600 bg-blue-50' },
              { label: 'Check webhook delivery', detail: `${stats.webhookSuccessRate}% success rate`, icon: Bell, color: 'text-violet-600 bg-violet-50' },
            ].map(({ label, detail, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">{label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{detail}</div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Server & SMS Scraping Reconciliation Engine Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>SMS Scraping &amp; UTR Reconciliation Engine</span>
          </h4>
          <p className="text-xs text-slate-500">
            How turnkey scripts like Lolapay/PayIndia verify UPI settlements without formal banking API access:
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
              <span className="text-emerald-700 font-bold">1.</span>
              <span className="text-slate-700">Android app or GSM SMS scraper parses incoming bank credit SMS (ICICI, HDFC, SBI).</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
              <span className="text-emerald-700 font-bold">2.</span>
              <span className="text-slate-700">Matches 12-digit UTR and INR amount against pending order token.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
              <span className="text-emerald-700 font-bold">3.</span>
              <span className="text-slate-700">Fires signed webhook (HMAC-SHA256) to merchant backend.</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <Server className="w-4 h-4 text-amber-600" />
            <span>Hostinger Environment Specifications</span>
          </h4>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
              <span className="text-slate-500">Web Engine</span>
              <span className="text-slate-900">Hostinger hCDN Edge / Apache / LiteSpeed</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
              <span className="text-slate-500">PHP Version</span>
              <span className="text-emerald-700 font-bold">PHP 8.3.31 FPM</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
              <span className="text-slate-500">Database Engine</span>
              <span className="text-slate-900">MySQL 8.0.35 (InnoDB Engine)</span>
            </div>
            <div className="flex justify-between py-1 font-mono">
              <span className="text-slate-500">QR Generator API</span>
              <span className="text-slate-900">api.qrserver.com v1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
