import React, { useState } from 'react';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  Webhook,
  CreditCard,
  QrCode,
  Sparkles,
  Edit3,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { User, MerchantProfile, BankAccountQR } from '../types';

interface ProfileSectionProps {
  currentUser: User;
  profile: MerchantProfile;
  bankAccounts: BankAccountQR[];
  onGoToSettings: () => void;
  onGoToBankAccounts: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  profile,
  bankAccounts,
  onGoToSettings,
  onGoToBankAccounts,
}) => {
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showAccountNo, setShowAccountNo] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // ignore
    }
  };

  const primaryBank = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white border border-blue-600 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 p-1 shrink-0 shadow-sm backdrop-blur-xs">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-blue-700 font-black text-2xl sm:text-3xl shadow-xs">
                {(currentUser?.name || currentUser?.businessName || currentUser?.email || 'M').charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {typeof currentUser?.name === "string" ? currentUser.name : typeof currentUser?.businessName === "string" ? currentUser.businessName : "Merchant"}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-500/30 text-purple-100 border border-purple-400/30'
                      : 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/30'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'Super Administrator' : 'Merchant'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-blue-100 border border-white/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  KYC Verified
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-sans mt-1">
                {typeof currentUser?.businessName === "string" ? currentUser.businessName : typeof profile?.businessName === "string" ? profile.businessName : "9tepay Merchant"} &bull; Direct Receiver VPA:{' '}
                <span className="font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">
                  {String(currentUser.vpa || profile.vpa)}
                </span>
              </p>
              <div className="flex items-center gap-4 text-[11px] text-blue-100 font-sans mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-200" />
                  {String(currentUser.email)}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-200" />
                  {String(currentUser.phone || profile.phone || "N/A")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToSettings}
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Personal Details & Business Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                <p className="text-xs text-slate-500">Your account ownership & authentication details</p>
              </div>
            </div>
            <button
              onClick={onGoToSettings}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Edit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Owner / Full Name</span>
              <p className="font-bold text-slate-900 text-sm">{typeof currentUser.name === "string" ? currentUser.name : "User"}</p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Registered Email</span>
              <p className="font-bold text-slate-900 text-sm truncate">{String(currentUser.email)}</p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Mobile Number</span>
              <p className="font-bold text-slate-900 text-sm">{String(currentUser.phone || profile.phone || "N/A")}</p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Account Role</span>
              <p className="font-bold text-slate-900 text-sm capitalize">{String(currentUser.role)}</p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Merchant User ID</span>
              <p className="font-mono font-bold text-slate-800 text-xs truncate">{String(currentUser.id)}</p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Member Since</span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(currentUser.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-blue-900">Security Verification Active</p>
              <p className="text-blue-700/90 text-[11px] leading-relaxed">
                Your account credentials are protected by 256-bit encryption. Password and security updates require current credential validation.
              </p>
            </div>
          </div>
        </div>

        {/* Business Details Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Business & Settlement Profile</h3>
                <p className="text-xs text-slate-500">Merchant configuration and direct receiver VPA</p>
              </div>
            </div>
            <button
              onClick={onGoToSettings}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Edit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl">
              <div>
                <span className="text-[11px] font-medium text-slate-500">Business / Store Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{typeof profile.businessName === "string" ? profile.businessName : typeof currentUser.businessName === "string" ? currentUser.businessName : "Merchant"}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg uppercase">
                0% Fee Settlement
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-[11px] font-medium text-slate-500">Direct Receiver UPI VPA</span>
                <p className="font-mono font-bold text-emerald-700 text-sm">{String(profile.vpa || currentUser.vpa)}</p>
              </div>
              <button
                onClick={() => handleCopy(profile.vpa || currentUser.vpa || '', 'vpa')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                {copiedField === 'vpa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'vpa' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {primaryBank && (
              <div className="bg-slate-50/70 border border-slate-200/60 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Primary Settlement Bank</span>
                  <button
                    onClick={onGoToBankAccounts}
                    className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Manage Banks &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                  <div>
                    <span className="text-[10px] text-slate-400">Bank Name</span>
                    <p className="font-bold text-slate-900">{primaryBank.bankName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">IFSC Code</span>
                    <p className="font-mono font-bold text-slate-800">{primaryBank.ifsc}</p>
                  </div>
                  <div className="col-span-2 pt-1 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400">Account Number</span>
                      <p className="font-mono font-bold text-slate-900">
                        {primaryBank.accountNumber ? (showAccountNo ? primaryBank.accountNumber : `••••••••${primaryBank.accountNumber.slice(-4)}`) : '••••••••'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAccountNo(!showAccountNo)}
                      className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      title={showAccountNo ? 'Hide account number' : 'Show account number'}
                    >
                      {showAccountNo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Developer API & Webhook Credentials Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">API Credentials &amp; Webhook Integration</h3>
              <p className="text-xs text-slate-500">Secrets for integrating payment creation and HMAC notification signature verification</p>
            </div>
          </div>
          <button
            onClick={onGoToSettings}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Update Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* API Key & Secret */}
          <div className="space-y-3 bg-slate-50/70 border border-slate-200/60 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-600" />
                API Public Key
              </span>
              <button
                onClick={() => handleCopy(profile.apiKey, 'apiKey')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'apiKey' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'apiKey' ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] break-all border border-slate-800 select-all">
              {profile.apiKey}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-600" />
                API Secret Key
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="px-2 py-1 hover:bg-slate-200/60 text-slate-600 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  {showApiSecret ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleCopy(profile.apiSecret, 'apiSecret')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'apiSecret' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'apiSecret' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] break-all border border-slate-800 select-all">
              {showApiSecret ? profile.apiSecret : '••••••••••••••••••••••••••••••••'}
            </div>
          </div>

          {/* Webhook Endpoint & Secret */}
          <div className="space-y-3 bg-slate-50/70 border border-slate-200/60 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Webhook className="w-4 h-4 text-emerald-600" />
                Webhook Notification URL
              </span>
              <button
                onClick={() => handleCopy(profile.webhookUrl, 'webhookUrl')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'webhookUrl' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'webhookUrl' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] break-all border border-slate-800">
              {profile.webhookUrl || 'https://your-domain.com/api/webhooks/9tepay'}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-600" />
                HMAC Webhook Signing Secret
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="px-2 py-1 hover:bg-slate-200/60 text-slate-600 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  {showWebhookSecret ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleCopy(profile.webhookSecret, 'webhookSecret')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'webhookSecret' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'webhookSecret' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] break-all border border-slate-800">
              {showWebhookSecret ? profile.webhookSecret : '••••••••••••••••••••••••••••••••'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
