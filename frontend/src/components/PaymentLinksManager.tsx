import React, { useState } from 'react';
import {
  Link2,
  PlusCircle,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Smartphone,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Calendar,
  Building2,
  X,
} from 'lucide-react';
import { Order, BankAccountQR, BankRoutingStrategy } from '../types';
import { formatCurrency } from '../utils/upi';

interface PaymentLinksManagerProps {
  orders: Order[];
  bankAccounts: BankAccountQR[];
  routingStrategy: BankRoutingStrategy;
  primaryVpa: string;
  onCreateLink: (payload: {
    amount: number;
    orderId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    note?: string;
    bankAccountId?: string;
  }) => Promise<Order>;
  onOpenCheckout: (order: Order, openInNewTab?: boolean) => void;
  onCancelOrder: (orderId: string) => void;
}

export const PaymentLinksManager: React.FC<PaymentLinksManagerProps> = ({
  orders,
  bankAccounts,
  routingStrategy,
  primaryVpa,
  onCreateLink,
  onOpenCheckout,
  onCancelOrder,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [orderNumber, setOrderNumber] = useState(`PL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [justCreatedOrder, setJustCreatedOrder] = useState<Order | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setIsCreating(true);
    try {
      const created = await onCreateLink({
        amount: Number(amount),
        orderId: orderNumber || undefined,
        customerName: customerName.trim() || 'Guest Customer',
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        note: note.trim() || 'Payment Link Request',
        bankAccountId: selectedBankId || undefined,
      });

      setJustCreatedOrder(created);
      setShowCreateModal(false);
      setAmount('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setNote('');
      setOrderNumber(`PL-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err) {
      console.error('Failed to create payment link', err);
    } finally {
      setIsCreating(false);
    }
  };

  const getCheckoutUrl = (id: string) => {
    return `${window.location.origin}/checkout/${id}`;
  };

  const handleCopyLink = async (id: string) => {
    const url = getCheckoutUrl(id);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const filteredLinks = orders.filter((order) => {
    const matchesFilter = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      (order.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.note ? order.note.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (order.utrNumber ? order.utrNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    return matchesFilter && matchesSearch;
  });

  const paidCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const expiredCount = orders.filter((o) => o.status === 'EXPIRED').length;
  const totalAmountPaid = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Creation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payment Links</h2>
              <p className="text-xs text-slate-500">
                Shareable instant UPI payment links with real-time status tracking and copyable URLs
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setJustCreatedOrder(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Payment Link</span>
        </button>
      </div>

      {/* Just Created Success Notification Banner with Direct Copy Link */}
      {justCreatedOrder && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Payment Link Created
              </span>
              <span className="text-xs font-mono text-slate-800 font-bold">
                {justCreatedOrder.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-700">
              Generated link for <strong className="text-slate-900">{justCreatedOrder.customerName}</strong> of amount <strong className="text-emerald-700 font-mono">{formatCurrency(justCreatedOrder.amount)}</strong>
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={getCheckoutUrl(justCreatedOrder.id)}
                className="bg-white border border-slate-200 text-slate-700 font-mono text-xs rounded-lg px-3 py-1.5 w-full max-w-md focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyLink(justCreatedOrder.id)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              {copiedId === justCreatedOrder.id ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={() => onOpenCheckout(justCreatedOrder, true)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer border border-slate-200 inline-flex items-center gap-1.5 shadow-xs"
              title="Open Payment Link in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Link</span>
            </button>
            <button
              onClick={() => setJustCreatedOrder(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Links</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Link2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{orders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total links generated</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Paid Links</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{paidCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-mono font-medium">
            Collected: {formatCurrency(totalAmountPaid)}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Pending Links</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Awaiting customer payment</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Expired Links</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{expiredCount}</div>
          <div className="text-[11px] text-rose-600 mt-1">Past validity window</div>
        </div>
      </div>

      {/* Payment Links Table List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by link ref, customer, note, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paid ({paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('EXPIRED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-3 px-3">Payment Link / Ref</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Bank Settlement</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    <Link2 className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                    <p className="text-sm font-semibold text-slate-700">No payment links found</p>
                    <p className="text-xs text-slate-400 mt-1">Create a new link to start accepting payments</p>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((order) => {
                  const linkUrl = getCheckoutUrl(order.id);
                  const isCopied = copiedId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Link & URL Column */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <Link2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                              <span>{order.orderNumber}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                              {linkUrl}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-3">
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

                      {/* Amount Column */}
                      <td className="py-3.5 px-3 font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(order.amount)}
                      </td>

                      {/* Customer Column */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        {order.customerEmail && (
                          <div className="text-[10px] text-slate-500">{order.customerEmail}</div>
                        )}
                        {order.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</div>
                        )}
                        {order.note && (
                          <div className="text-[10px] text-blue-600 truncate max-w-[160px] italic">
                            "{order.note}"
                          </div>
                        )}
                      </td>

                      {/* Bank Settlement Column */}
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        <div className="text-slate-800 truncate max-w-[150px]">
                          {order.merchantVpa}
                        </div>
                        {order.utrNumber && (
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            UTR: {order.utrNumber}
                          </div>
                        )}
                      </td>

                      {/* Date Column */}
                      <td className="py-3.5 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions: Copy Link, Preview/Open, Cancel */}
                      <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                        {/* Copy Link Button */}
                        <button
                          onClick={() => handleCopyLink(order.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border shadow-xs ${
                            isCopied
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title="Copy Shareable Payment Link"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        {/* Open Checkout Button */}
                        <button
                          onClick={() => onOpenCheckout(order, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          title="Open Payment Link in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Link</span>
                        </button>

                        {/* Cancel Button */}
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => onCancelOrder(order.id)}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition-colors cursor-pointer border border-rose-200"
                            title="Cancel Payment Link"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Payment Link */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Payment Link</h3>
                  <p className="text-xs text-slate-500">
                    Generate a shareable payment link with instant QR & UPI intent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in INR (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 text-slate-900 text-base font-bold rounded-xl pl-8 pr-3.5 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Link Reference / Order No.
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Purpose / Item Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Consulting Invoice #104"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Bank Account / QR Fleet
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">⚡ Auto Multi-Bank Engine ({routingStrategy === 'smart_round_robin' ? 'Smart Round-Robin' : 'Primary Bank Only'})</option>
                  {bankAccounts
                    .filter((b) => b.isActive)
                    .map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountHolder} ({bank.vpa}) {bank.isPrimary ? '★ Primary' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Directs incoming UPI payments to this specific bank VPA, or dynamically load-balances across your active accounts.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-mono">
                Settlement UPI VPA: {selectedBankId ? (bankAccounts.find((b) => b.id === selectedBankId)?.vpa || primaryVpa) : primaryVpa}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
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
                  <span>{isCreating ? 'Creating Link...' : 'Create Payment Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
