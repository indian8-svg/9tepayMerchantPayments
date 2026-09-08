import React, { useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Check,
  X,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../utils/upi';

interface TransactionsManagerProps {
  orders: Order[];
  onApproveOrder: (orderId: string) => Promise<void>;
  onRejectOrder: (orderId: string) => Promise<void>;
  onOpenCheckout: (order: Order) => void;
}

export const TransactionsManager: React.FC<TransactionsManagerProps> = ({
  orders,
  onApproveOrder,
  onRejectOrder,
  onOpenCheckout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'FAILED' | 'AWAITING_VERIFICATION'>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'UPI'>('ALL');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Keep modal order details synchronized when orders prop updates
  React.useEffect(() => {
    if (selectedOrderDetails) {
      const updated = orders.find(
        (o) => o.id === selectedOrderDetails.id || o.orderNumber === selectedOrderDetails.orderNumber
      );
      if (updated) {
        setSelectedOrderDetails(updated);
      }
    }
  }, [orders]);

  // Filter orders
  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = safeOrders.filter((o) => {
    if (!o) return false;
    // Status filter
    if (statusFilter === 'PENDING' && o.status !== 'PENDING') return false;
    if (statusFilter === 'AWAITING_VERIFICATION' && (o.status !== 'PENDING' || !o.utrNumber)) return false;
    if (statusFilter === 'PAID' && o.status !== 'PAID') return false;
    if (statusFilter === 'FAILED' && o.status !== 'EXPIRED' && o.status !== 'FAILED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (o.id || '').toLowerCase().includes(q) || (o.orderNumber || '').toLowerCase().includes(q);
      const matchCustomer = (o.customerName || '').toLowerCase().includes(q) || (o.customerPhone ? o.customerPhone.includes(q) : false);
      const matchUtr = o.utrNumber ? (o.utrNumber || '').toLowerCase().includes(q) : false;
      return matchId || matchCustomer || matchUtr;
    }

    return true;
  });

  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await onApproveOrder(orderId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await onRejectOrder(orderId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Decode potential HTML entities like &#039; in customer names safely
  const sanitizeName = (nameStr?: string | null) => {
    if (!nameStr) return 'Customer';
    return String(nameStr).replace(/&#039;/g, "'").replace(/&amp;/g, "&");
  };

  return (
    <div className="space-y-5">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transactions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor and reconcile all orders and customer payments.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Customer, UTR..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 transition-all font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verification (With UTR)</option>
              <option value="PENDING">Pending (All)</option>
              <option value="PAID">Success (Paid)</option>
              <option value="FAILED">Failed / Expired</option>
            </select>
          </div>

          {/* Method Dropdown */}
          <div className="md:col-span-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 transition-all font-medium cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI Intent</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={() => {}}
              className="flex-1 bg-[#064e3b] hover:bg-[#022c22] text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button
              onClick={resetFilters}
              title="Reset Filters"
              className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">UTR Reference</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.status === 'PENDING';
                  const isPaid = order.status === 'PAID';
                  const isFailed = order.status === 'EXPIRED' || order.status === 'FAILED';
                  const hasReviewRequired = order.reviewRequired || (isPending && Boolean(order.utrNumber));
                  const isProc = processingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Customer */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {sanitizeName(order.customerName)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(order.amount)}
                      </td>

                      {/* UTR Reference */}
                      <td className="py-3.5 px-4">
                        {order.utrNumber ? (
                          <div>
                            <span className="font-mono text-slate-800 tracking-wide">
                              {order.utrNumber}
                            </span>
                            {hasReviewRequired && (
                              <div className="mt-0.5">
                                <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200/60">
                                  Review required
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Not submitted</span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                          <span>UPI</span>
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Success
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Eye details button */}
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            title="View Transaction Details"
                            className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approve & Reject buttons for PENDING orders with UTR */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(order.id)}
                                disabled={isProc}
                                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReject(order.id)}
                                disabled={isProc}
                                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Failed</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 text-center mb-5">
              Transaction Details
            </h3>

            <div className="space-y-3 text-xs divide-y divide-slate-100 font-medium">
              <div className="flex items-center justify-between pb-2">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900 select-all">
                  {selectedOrderDetails.orderNumber || selectedOrderDetails.id}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold text-slate-900">
                  {sanitizeName(selectedOrderDetails.customerName)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(selectedOrderDetails.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">UTR Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedOrderDetails.utrNumber || 'Not submitted'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Provider:</span>
                <span className="font-semibold text-slate-800">
                  {selectedOrderDetails.provider || 'MANUAL_UPI'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Payment App / Handle:</span>
                <span className="font-semibold text-blue-600">
                  {selectedOrderDetails.paymentApp || 'UPI'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Status:</span>
                {selectedOrderDetails.status === 'PAID' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                    SUCCESS
                  </span>
                )}
                {selectedOrderDetails.status === 'PENDING' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-[10px]">
                    PENDING
                  </span>
                )}
                {(selectedOrderDetails.status === 'EXPIRED' || selectedOrderDetails.status === 'FAILED') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold uppercase text-[10px]">
                    FAILED
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Created At:</span>
                <span className="text-slate-700">
                  {formatDate(selectedOrderDetails.createdAt)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col gap-2">
              {selectedOrderDetails.status === 'PENDING' && selectedOrderDetails.utrNumber && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await handleApprove(selectedOrderDetails.id);
                      setSelectedOrderDetails((prev) => prev ? { ...prev, status: 'PAID', reviewRequired: false } : null);
                    }}
                    disabled={processingId === selectedOrderDetails.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Payment</span>
                  </button>

                  <button
                    onClick={async () => {
                      await handleReject(selectedOrderDetails.id);
                      setSelectedOrderDetails((prev) => prev ? { ...prev, status: 'FAILED', reviewRequired: false } : null);
                    }}
                    disabled={processingId === selectedOrderDetails.id}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject UTR</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-full bg-[#84cc16] hover:bg-[#65a30d] text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
