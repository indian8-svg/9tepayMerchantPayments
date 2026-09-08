import React, { useState } from 'react';
import { Search, UserCheck } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../utils/upi';

interface CustomersManagerProps {
  orders: Order[];
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group orders by customer name / email
  const customersMap = new Map<string, {
    name: string;
    phone: string;
    totalOrders: number;
    successfulOrders: number;
    totalPaid: number;
    lastActivity: string;
  }>();

  (orders || []).forEach((o) => {
    if (!o) return;
    const rawName = o.customerName || 'Guest Customer';
    const name = String(rawName).replace(/&#039;/g, "'").replace(/&amp;/g, "&");
    const existing = customersMap.get(name);
    const isPaid = o.status === 'PAID';

    if (existing) {
      existing.totalOrders += 1;
      if (isPaid) {
        existing.successfulOrders += 1;
        existing.totalPaid += o.amount || 0;
      }
      try {
        if (new Date(o.createdAt).getTime() > new Date(existing.lastActivity).getTime()) {
          existing.lastActivity = o.createdAt;
        }
      } catch {}
    } else {
      customersMap.set(name, {
        name,
        phone: o.customerPhone || 'Not provided',
        totalOrders: 1,
        successfulOrders: isPaid ? 1 : 0,
        totalPaid: isPaid ? (o.amount || 0) : 0,
        lastActivity: o.createdAt || new Date().toISOString(),
      });
    }
  });

  const customersList = Array.from(customersMap.values()).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        ', ' +
        d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatically grouped from your payment history.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name or mobile"
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
          <button
            onClick={() => {}}
            className="bg-[#064e3b] hover:bg-[#022c22] text-white text-xs font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Successful</th>
                <th className="py-3 px-4">Total Paid</th>
                <th className="py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {customersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                customersList.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {customer.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {customer.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">
                      {customer.totalOrders}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold ${
                          customer.successfulOrders > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {customer.successfulOrders}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(customer.totalPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(customer.lastActivity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
