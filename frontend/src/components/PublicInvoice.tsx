import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
async function apiFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  return await res.json();
}

export function PublicInvoice() {
  const id = window.location.pathname.split('/').pop();
  const [invoice, setInvoice] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await apiFetch(`/api/invoices/${id}`);
      if (res.success) {
        setInvoice(res.invoice);
        setMerchant(res.merchant);
      } else {
        setError(res.error || 'Invoice not found');
      }
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    // Generate a checkout link by creating an order on the backend for this invoice
    // We could do this securely via a new endpoint, or we can just redirect to /pay/:vpa
    // For now, let's redirect to standard checkout
    alert('This would redirect to the secure 9tepay Hosted Checkout page for ₹' + invoice.totalAmount);
    // navigate(`/pay/${merchant.vpa}?amount=${invoice.totalAmount}&email=${invoice.customerEmail}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>;
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Unavailable</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 px-8 py-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{merchant?.business_name || merchant?.name}</h1>
            <p className="text-emerald-100 mt-1 opacity-90">Invoice #{invoice.id.split('_')[1].toUpperCase()}</p>
          </div>
          <FileText className="w-10 h-10 opacity-80" />
        </div>
        
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Billed To</h3>
              <p className="text-lg font-medium text-slate-900">{invoice.customerName}</p>
              <p className="text-slate-500">{invoice.customerEmail}</p>
              {invoice.customerPhone && <p className="text-slate-500">{invoice.customerPhone}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
              {invoice.status === 'PAID' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" /> Paid
                </span>
              ) : invoice.status === 'CANCELLED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                  Cancelled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800">
                  Pending Payment
                </span>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Price</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.description}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-600">₹{Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">₹{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-slate-50 p-6 border-t border-slate-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  {invoice.taxRate > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({invoice.taxRate}%)</span>
                      <span>₹{(invoice.totalAmount - invoice.subtotal).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span>₹{invoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <div className="pt-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={handlePayNow}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                Pay ₹{invoice.totalAmount.toFixed(2)} Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
