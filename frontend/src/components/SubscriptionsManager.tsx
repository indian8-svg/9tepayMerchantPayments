import React, { useState, useEffect } from 'react';
import { Plus, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import { safeFetch } from '../utils/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
  createdAt: string;
}

interface Subscription {
  id: string;
  planId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  nextBillingDate: string;
  createdAt: string;
  plan: SubscriptionPlan;
}

export const SubscriptionsManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateSub, setShowCreateSub] = useState(false);

  // New Plan State
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planInterval, setPlanInterval] = useState('monthly');

  // New Sub State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subCustomerName, setSubCustomerName] = useState('');
  const [subCustomerEmail, setSubCustomerEmail] = useState('');
  
  const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        safeFetch<{ plans: SubscriptionPlan[] }>('/api/subscriptions/plans', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetch<{ subscriptions: Subscription[] }>('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (plansRes.data?.plans) setPlans(plansRes.data.plans);
      if (subsRes.data?.subscriptions) setSubscriptions(subsRes.data.subscriptions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await safeFetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: planName,
          amount: Number(planAmount),
          interval: planInterval
        })
      });
      setShowCreatePlan(false);
      setPlanName('');
      setPlanAmount('');
      fetchData();
    } catch (e) {
      alert("Error creating plan");
    }
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await safeFetch('/api/subscriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planId: selectedPlanId,
          customerName: subCustomerName,
          customerEmail: subCustomerEmail
        })
      });
      setShowCreateSub(false);
      setSubCustomerName('');
      setSubCustomerEmail('');
      fetchData();
    } catch (e) {
      alert("Error creating subscription");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscriptions & AutoPay</h2>
          <p className="text-slate-600">Manage recurring payments and subscription plans.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowCreatePlan(true)} className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            <Plus size={18} className="mr-2" /> New Plan
          </button>
          <button onClick={() => setShowCreateSub(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <RefreshCw size={18} className="mr-2" /> Subscribe Customer
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Your Plans</h3>
            {plans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No plans created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map(p => (
                  <div key={p.id} className="p-4 border rounded-xl bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-slate-900">{p.name}</h4>
                      <p className="text-sm text-slate-500">{p.interval} billing</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹{p.amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Active Subscriptions</h3>
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No active subscriptions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(s => (
                  <div key={s.id} className="p-4 border rounded-xl bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-slate-900">{s.customerName}</h4>
                        <p className="text-sm text-slate-500">{s.customerEmail}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                        {s.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                      <span className="text-slate-600">Plan: <span className="font-medium">{s.plan.name}</span></span>
                      <span className="text-slate-600">Next billing: {new Date(s.nextBillingDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showCreatePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create Subscription Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                <input required type="text" value={planName} onChange={e => setPlanName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="e.g. Premium Monthly" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input required type="number" min="1" value={planAmount} onChange={e => setPlanAmount(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="999" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Interval</label>
                <select value={planInterval} onChange={e => setPlanInterval(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowCreatePlan(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub Modal */}
      {showCreateSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Subscribe Customer</h3>
            <form onSubmit={handleCreateSub} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Plan</label>
                <select required value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                  <option value="">-- Choose a plan --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.amount}/{p.interval})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input required type="text" value={subCustomerName} onChange={e => setSubCustomerName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Email</label>
                <input required type="email" value={subCustomerEmail} onChange={e => setSubCustomerEmail(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="john@example.com" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowCreateSub(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg" disabled={!selectedPlanId || !subCustomerName || !subCustomerEmail}>Subscribe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
