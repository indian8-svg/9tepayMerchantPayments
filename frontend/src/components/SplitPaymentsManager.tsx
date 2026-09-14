import React, { useState, useEffect } from 'react';
import { Loader2, Save, Route, ShieldAlert, Zap, Server } from 'lucide-react';
import { safeFetch } from '../utils/api';

export const SplitPaymentsManager: React.FC = () => {
  const [strategy, setStrategy] = useState('smart_round_robin');
  const [requireStrictUtr, setRequireStrictUtr] = useState(true);
  const [preventDup, setPreventDup] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');

  useEffect(() => {
    const fetchRouting = async () => {
      try {
        const res = await safeFetch<{ strategy: string, requireStrictUtrFormat: boolean, preventDuplicateUtr: boolean }>('/api/merchant/routing', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setStrategy(res.data.strategy || 'smart_round_robin');
          if (res.data.requireStrictUtrFormat !== undefined) setRequireStrictUtr(res.data.requireStrictUtrFormat);
          if (res.data.preventDuplicateUtr !== undefined) setPreventDup(res.data.preventDuplicateUtr);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRouting();
  }, [token]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await safeFetch<{ success: boolean, message: string }>('/api/merchant/routing-rules', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          strategy,
          requireStrictUtrFormat: requireStrictUtr,
          preventDuplicateUtr: preventDup
        })
      });
      if (res.data?.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      alert("Error saving rules");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Split Payments & Routing</h2>
        <p className="text-slate-600">Configure how incoming payments are routed across your bank accounts.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Route size={18} className="text-blue-600" />
          Payment Routing Strategy
        </h3>
        <div className="space-y-4">
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input type="radio" name="strategy" value="smart_round_robin" checked={strategy === 'smart_round_robin'} onChange={e => setStrategy(e.target.value)} className="mt-1" />
            <div className="ml-3">
              <span className="block font-medium text-slate-900">Smart Round Robin (Razorpay Route equivalent)</span>
              <span className="block text-sm text-slate-500">Automatically distributes incoming payments evenly across all your active bank accounts to prevent volume limits.</span>
            </div>
          </label>
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input type="radio" name="strategy" value="limit_aware" checked={strategy === 'limit_aware'} onChange={e => setStrategy(e.target.value)} className="mt-1" />
            <div className="ml-3">
              <span className="block font-medium text-slate-900">Limit-Aware Routing</span>
              <span className="block text-sm text-slate-500">Prioritizes bank accounts with the most remaining daily limit to avoid transaction failures.</span>
            </div>
          </label>
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input type="radio" name="strategy" value="primary_only" checked={strategy === 'primary_only'} onChange={e => setStrategy(e.target.value)} className="mt-1" />
            <div className="ml-3">
              <span className="block font-medium text-slate-900">Primary Account Only</span>
              <span className="block text-sm text-slate-500">Sends 100% of volume to your Primary bank account. Fallbacks only occur if primary is disabled.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <ShieldAlert size={18} className="text-red-500" />
          Anti-Fraud & Validation Rules
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
            <div>
              <span className="block font-medium text-slate-900">Require Strict UTR Format</span>
              <span className="block text-sm text-slate-500">Rejects 12-digit UTRs that don't match the standard NPCI checksum/format logic.</span>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" checked={requireStrictUtr} onChange={e => setRequireStrictUtr(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out" style={{ transform: requireStrictUtr ? 'translateX(100%)' : 'translateX(0)', borderColor: requireStrictUtr ? '#3b82f6' : '#cbd5e1' }} />
              <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${requireStrictUtr ? 'bg-blue-500' : 'bg-slate-300'}`}></label>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
            <div>
              <span className="block font-medium text-slate-900">Prevent Duplicate UTR Use</span>
              <span className="block text-sm text-slate-500">Automatically blocks customers from submitting a UTR number that has already been verified for another order.</span>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" checked={preventDup} onChange={e => setPreventDup(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out" style={{ transform: preventDup ? 'translateX(100%)' : 'translateX(0)', borderColor: preventDup ? '#3b82f6' : '#cbd5e1' }} />
              <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${preventDup ? 'bg-blue-500' : 'bg-slate-300'}`}></label>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={isSaving} className="flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400">
          {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
          Save Routing Rules
        </button>
        {message && <span className="text-green-600 font-medium">{message}</span>}
      </div>
    </div>
  );
};
