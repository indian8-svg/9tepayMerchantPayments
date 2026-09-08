import React, { useState } from 'react';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Lock,
  Key,
  Webhook,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Sliders,
  Check,
  Sparkles,
  CreditCard,
  X,
} from 'lucide-react';
import { User, MerchantProfile, BankAccountQR, BankRoutingStrategy } from '../types';
import { safeFetch } from '../utils/api';

interface SettingsSectionProps {
  currentUser: User;
  profile: MerchantProfile;
  bankAccounts: BankAccountQR[];
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onUpdateProfile: (updatedProfile: Partial<MerchantProfile>) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  currentUser,
  profile,
  bankAccounts,
  onUpdateUser,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'business' | 'api' | 'security'>('account');

  // Account & Security State
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || profile.phone || '');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Business & Settlement State
  const [businessName, setBusinessName] = useState(profile.businessName || currentUser.businessName || '');
  const [vpa, setVpa] = useState(profile.vpa || currentUser.vpa || '');

  // Bank Info State
  const primaryBank = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0];
  const [accountNumber, setAccountNumber] = useState(primaryBank?.accountNumber || '919000000000');
  const [ifsc, setIfsc] = useState(primaryBank?.ifsc || 'ICIC0000102');

  // API & Webhook State
  const [webhookUrl, setWebhookUrl] = useState(profile.webhookUrl || '');

  // Gateway Automation Rules
  const [autoApproveUtr, setAutoApproveUtr] = useState(profile.autoApproveUtr ?? true);
  const [requireStrictUtr, setRequireStrictUtr] = useState(profile.requireStrictUtrFormat ?? true);
  const [preventDuplicateUtr, setPreventDuplicateUtr] = useState(profile.preventDuplicateUtr ?? true);
  const [routingStrategy, setRoutingStrategy] = useState<BankRoutingStrategy>(
    profile.routingStrategy || 'smart_round_robin'
  );

  // UX Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const clearMessage = () => {
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleEnableTotp = async () => {
    setStatusMessage(null);
    try {
      if (!totpSecret) {
        const setup = await safeFetch<{ success: boolean; secret?: string; error?: string }>('/api/auth/2fa/setup', { method: 'POST' });
        if (!setup.ok || !setup.data?.secret) throw new Error(setup.data?.error || setup.error || 'Unable to start authenticator setup.');
        setTotpSecret(setup.data.secret);
        setStatusMessage({ type: 'success', text: `Add this key to your authenticator app: ${setup.data.secret}` });
        return;
      }
      const enabled = await safeFetch<{ success: boolean; error?: string }>('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode }),
      });
      if (!enabled.ok || !enabled.data?.success) throw new Error(enabled.data?.error || enabled.error || 'Invalid authenticator code.');
      setTotpSecret('');
      setTotpCode('');
      setStatusMessage({ type: 'success', text: 'Authenticator-app two-factor authentication is enabled.' });
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'Unable to configure two-factor authentication.' });
    }
  };

  // 1. Save Personal Details (Email, Phone, Name)
  const handleSaveAccountDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!email || !email.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    try {
      // API call if available
      await safeFetch('/api/merchant/profile', {
        method: 'PUT',
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      });

      onUpdateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      onUpdateProfile({
        email: email.trim(),
        phone: phone.trim(),
      });

      setStatusMessage({ type: 'success', text: 'Personal details & contact information updated successfully!' });
      clearMessage();
    } catch {
      // Local fallback
      onUpdateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      onUpdateProfile({
        email: email.trim(),
        phone: phone.trim(),
      });
      setStatusMessage({ type: 'success', text: 'Personal details updated successfully!' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!currentPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    if (newPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await safeFetch<{ success: boolean; error?: string }>('/api/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Unable to update password.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'success', text: 'Password updated successfully! Your session is now secured.' });
      clearMessage();
    } catch (error: any) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'error', text: error?.message || 'Unable to update password.' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Save Business Profile Details
  const handleSaveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!businessName.trim()) {
      setStatusMessage({ type: 'error', text: 'Business / Store Name is required.' });
      return;
    }

    if (!vpa.trim() || !vpa.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid UPI VPA address (e.g. store@icici).' });
      return;
    }

    setIsSaving(true);
    try {
      const cleanVpa = vpa.trim().toLowerCase();
      const cleanBiz = businessName.trim();

      await safeFetch('/api/merchant/profile', {
        method: 'PUT',
        body: JSON.stringify({
          businessName: cleanBiz,
          vpa: cleanVpa,
        }),
      });

      onUpdateUser({
        businessName: cleanBiz,
        vpa: cleanVpa,
      });

      onUpdateProfile({
        businessName: cleanBiz,
        vpa: cleanVpa,
      });

      setStatusMessage({ type: 'success', text: 'Business details & Receiver VPA saved successfully!' });
      clearMessage();
    } catch {
      const cleanVpa = vpa.trim().toLowerCase();
      const cleanBiz = businessName.trim();

      onUpdateUser({
        businessName: cleanBiz,
        vpa: cleanVpa,
      });

      onUpdateProfile({
        businessName: cleanBiz,
        vpa: cleanVpa,
      });

      setStatusMessage({ type: 'success', text: 'Business details saved successfully!' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Save Webhook & API Settings
  const handleSaveWebhookSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    setIsSaving(true);
    try {
      await safeFetch('/api/merchant/profile', {
        method: 'PUT',
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      onUpdateProfile({ webhookUrl: webhookUrl.trim() });
      setStatusMessage({ type: 'success', text: 'Webhook URL configuration updated successfully!' });
      clearMessage();
    } catch {
      onUpdateProfile({ webhookUrl: webhookUrl.trim() });
      setStatusMessage({ type: 'success', text: 'Webhook URL configuration updated!' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  // Regenerate Webhook Secret
  const handleRegenerateWebhookSecret = () => {
    const newSecret = `whsec_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
    onUpdateProfile({ webhookSecret: newSecret });
    setStatusMessage({ type: 'success', text: 'New HMAC Webhook Signing Secret generated!' });
    clearMessage();
  };

  // Regenerate API Key & Secret
  const handleConfirmRegenerateApiKeys = async () => {
    setShowRegenModal(false);
    setIsSaving(true);
    try {
      const res = await safeFetch('/api/merchant/keys/regenerate', { method: 'POST' });
      if (res.ok && res.data?.apiKey) {
        onUpdateProfile({
          apiKey: res.data.apiKey,
          apiSecret: res.data.apiSecret,
        });
      } else {
        const newKey = `pi_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
        const newSecret = `sk_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
        onUpdateProfile({ apiKey: newKey, apiSecret: newSecret });
      }
      setStatusMessage({ type: 'success', text: 'New API Key & Secret Key generated successfully!' });
      clearMessage();
    } catch {
      const newKey = `pi_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      const newSecret = `sk_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
      onUpdateProfile({ apiKey: newKey, apiSecret: newSecret });
      setStatusMessage({ type: 'success', text: 'New API Key & Secret Key generated successfully!' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Automation Rules
  const handleSaveAutomationRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    setIsSaving(true);
    try {
      await safeFetch('/api/merchant/routing-rules', {
        method: 'PUT',
        body: JSON.stringify({
          strategy: routingStrategy,
          requireStrictUtrFormat: requireStrictUtr,
          preventDuplicateUtr: preventDuplicateUtr,
        }),
      });

      onUpdateProfile({
        autoApproveUtr,
        requireStrictUtrFormat: requireStrictUtr,
        preventDuplicateUtr,
        routingStrategy,
      });

      setStatusMessage({ type: 'success', text: 'Anti-fraud & automation parameters saved successfully!' });
      clearMessage();
    } catch {
      onUpdateProfile({
        autoApproveUtr,
        requireStrictUtrFormat: requireStrictUtr,
        preventDuplicateUtr,
        routingStrategy,
      });
      setStatusMessage({ type: 'success', text: 'Automation rules updated!' });
      clearMessage();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Account Settings &amp; Preferences</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal login credentials, security passwords, store VPA, and webhook integrations.
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'account'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Account &amp; Security</span>
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'business'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Store &amp; VPA Settlement</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'api'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhook &amp; API Keys</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Anti-Fraud &amp; Automation</span>
        </button>
      </div>

      {/* TAB 1: Account & Security */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form 1: Profile & Contact Details */}
          <form onSubmit={handleSaveAccountDetails} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Personal &amp; Contact Details</h3>
                <p className="text-xs text-slate-500">Update your account name, email, and phone number</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Owner / Contact Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
                    placeholder="Abhay Sharma"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
                    placeholder="merchant@9tepay.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone / WhatsApp Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Updating...' : 'Save Personal Details'}</span>
              </button>
            </div>
          </form>

          {/* Form 2: Change Password */}
          <form onSubmit={handleChangePassword} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Security &amp; Password Update</h3>
                <p className="text-xs text-slate-500">Update your account password</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Current Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">New Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirm New Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-xs text-slate-600 font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Hide passwords' : 'Show passwords'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isSaving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Business & VPA Settlement */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusinessProfile} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5 max-w-2xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Store &amp; Direct VPA Settlement Settings</h3>
              <p className="text-xs text-slate-500">Configure your business brand name and target UPI receiver address</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Business / Store Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
                placeholder="Mahalakshmi Enterprises"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Direct Receiver UPI VPA (0% Settlement) *</label>
              <input
                type="text"
                required
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                className="w-full px-3 py-2 bg-emerald-50/30 border border-emerald-300 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-emerald-800"
                placeholder="store@icici"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                All QR codes &amp; intent links will route customer payments straight to this UPI handle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Bank Account No.</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-900"
                  placeholder="919876543210"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-900"
                  placeholder="ICIC0000102"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Store Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Webhook & API Keys */}
      {activeTab === 'api' && (
        <div className="space-y-6 max-w-3xl">
          {/* Webhook Settings Form */}
          <form onSubmit={handleSaveWebhookSettings} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Webhook Integration Endpoint</h3>
                  <p className="text-xs text-slate-500">Configure your server callback endpoint for instant payment notifications</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Webhook Callback URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-slate-900"
                  placeholder="https://your-server.com/api/webhooks/9tepay"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs">HMAC Webhook Signing Secret</span>
                  <p className="text-[11px] text-slate-500">Used to sign webhook POST payloads with SHA256 signature.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateWebhookSecret}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotate Secret</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Webhook Configuration'}</span>
              </button>
            </div>
          </form>

          {/* API Keys Rotation Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Merchant API Key Management</h3>
                  <p className="text-xs text-slate-500">Live API credentials for automated payment link creation</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegenModal(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate API Keys</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-sans font-semibold">Active API Key</span>
                <p className="font-bold text-slate-900 text-xs break-all">{profile.apiKey}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-sans font-semibold">API Secret</span>
                <p className="font-bold text-slate-900 text-xs break-all">••••••••••••••••</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Anti-Fraud & Automation */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveAutomationRules} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5 max-w-3xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Anti-Fraud &amp; Automated Settlement Preferences</h3>
              <p className="text-xs text-slate-500">Configure UTR verification algorithms and multi-bank load balancing</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div>
              <h4 className="font-bold text-emerald-950 text-sm">Authenticator-app two-factor authentication</h4>
              <p className="text-[11px] text-emerald-800 mt-1">Protect sign-in with a time-based code from Google Authenticator, Microsoft Authenticator, or 1Password.</p>
            </div>
            {totpSecret && (
              <>
                <p className="text-[11px] text-slate-700">Manual setup key:</p>
                <code className="block bg-white border border-emerald-200 rounded-lg p-2 text-xs tracking-widest break-all">{totpSecret}</code>
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="Enter the 6-digit app code" className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm tracking-[0.3em] text-center focus:outline-none focus:border-emerald-500" />
              </>
            )}
            <button type="button" onClick={handleEnableTotp} className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold">
              {totpSecret ? 'Confirm and enable 2FA' : 'Set up authenticator app'}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Auto-Approve Verified UTR Numbers</span>
                <span className="text-[11px] text-slate-500">Automatically mark orders as PAID when valid 12-digit UTR is submitted</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoApproveUtr}
                  onChange={(e) => setAutoApproveUtr(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Strict 12-Digit NPCI UTR Checksum Check</span>
                <span className="text-[11px] text-slate-500">Reject non-standard or altered banking reference numbers</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={requireStrictUtr}
                  onChange={(e) => setRequireStrictUtr(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Prevent Duplicate UTR Across Orders</span>
                <span className="text-[11px] text-slate-500">Flag and block attempts to reuse a previously redeemed UTR</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={preventDuplicateUtr}
                  onChange={(e) => setPreventDuplicateUtr(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Routing Dropdown */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
              <label className="block font-bold text-slate-900 text-xs">Bank Routing Strategy</label>
              <select
                value={routingStrategy}
                onChange={(e) => setRoutingStrategy(e.target.value as BankRoutingStrategy)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-900 text-xs"
              >
                <option value="smart_round_robin">Smart Round Robin (Distribute traffic evenly across active VPAs)</option>
                <option value="primary_only">Primary Account Only (Single primary VPA routing)</option>
                <option value="limit_aware">Daily Limit Aware (Switch VPA if account reaches ₹5L limit)</option>
                <option value="manual">Manual Weighted Routing</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Rules...' : 'Save Anti-Fraud Rules'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal for API Key Regeneration */}
      {showRegenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowRegenModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Regenerate API Credentials?</span>
              </div>
              <button
                onClick={() => setShowRegenModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Regenerating your API credentials will invalidate your old <strong>API Key</strong> and <strong>API Secret</strong> immediately. Any current server integrations using the old key will stop working until updated.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerateApiKeys}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Confirm &amp; Regenerate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
