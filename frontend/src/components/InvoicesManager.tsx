import React, { useState, useEffect } from 'react';
import { FileText, PlusCircle, Send, CheckCircle2, Clock, XCircle, Download } from 'lucide-react';

async function apiFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  return await res.json();
}

export function InvoicesManager() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New invoice state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/invoices');
      if (res.success) {
        setInvoices(res.invoices);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedItems = items.map(i => ({ ...i, amount: i.quantity * i.price }));
      const res = await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerName, customerEmail, items: formattedItems, taxRate
        })
      });
      if (res.success) {
        setShowCreateModal(false);
        fetchInvoices();
        setCustomerName(''); setCustomerEmail(''); setItems([{ description: '', quantity: 1, price: 0 }]); setTaxRate(0);
      }
    } catch (err) {
      alert('Failed to create invoice');
    }
  };

  const handleSendInvoice = async (id: string) => {
    if (!window.confirm("Send this invoice to the customer via email?")) return;
    try {
      const res = await apiFetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (res.success) {
        alert('Invoice sent successfully!');
        fetchInvoices();
      } else {
        alert(res.error || 'Failed to send invoice');
      }
    } catch (err) {
      alert('Failed to send invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>;
      case 'SENT': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Send className="w-3.5 h-3.5" /> Sent</span>;
      case 'DRAFT': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"><FileText className="w-3.5 h-3.5" /> Draft</span>;
      case 'CANCELLED': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Smart Invoicing
          </h2>
          <p className="text-sm text-slate-500 mt-1">Create, send, and track beautiful invoices with embedded UPI payment links.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900">No invoices yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Create your first professional invoice.</p>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">
            Create Invoice
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-4 font-medium text-slate-900">{inv.id}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{inv.customerName}</div>
                    <div className="text-xs text-slate-500">{inv.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">₹{inv.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-4">{getStatusBadge(inv.status)}</td>
                  <td className="px-4 py-4 text-right">
                    {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                      <button onClick={() => handleSendInvoice(inv.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors mr-2">
                        <Send className="w-3.5 h-3.5" /> Send Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-900">Create New Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="invoiceForm" onSubmit={handleCreateInvoice} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Customer Name</label>
                    <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Customer Email</label>
                    <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="billing@acme.com" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Invoice Items</label>
                    <button type="button" onClick={() => setItems([...items, { description: '', quantity: 1, price: 0 }])} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <input type="text" required value={item.description} onChange={(e) => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Item description" />
                        <input type="number" min="1" required value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[idx].quantity = Number(e.target.value); setItems(newItems); }} className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Qty" />
                        <input type="number" min="0" step="0.01" required value={item.price} onChange={(e) => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Price (₹)" />
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-600">
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tax Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="18" />
                  </div>
                  <div className="flex flex-col justify-center items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Total Amount</span>
                    <span className="text-xl font-bold text-slate-900">
                      ₹{(items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * (1 + taxRate/100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" form="invoiceForm" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
