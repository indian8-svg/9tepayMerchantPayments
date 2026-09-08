import React, { useState, useRef } from 'react';
import {
  Building2,
  QrCode,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sliders,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Star,
  ExternalLink,
  Download,
  AlertTriangle,
  RotateCw,
  Sparkles,
  ArrowRight,
  Printer,
  Smartphone,
  Layers,
  Check,
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  X,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { BankAccountQR, BankRoutingStrategy } from '../types';
import {
  ALL_INDIAN_BANKS,
  BANK_CATEGORIES,
  IndianBankInfo,
  searchBanks,
} from '../data/allBanks';

interface BankAccountsManagerProps {
  bankAccounts: BankAccountQR[];
  onAddBank: (bank: Partial<BankAccountQR>) => Promise<void>;
  onUpdateBank: (id: string, bank: Partial<BankAccountQR>) => Promise<void>;
  onDeleteBank: (id: string) => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
  onToggleActive: (id: string) => Promise<void>;
  routingStrategy: BankRoutingStrategy;
  onUpdateRoutingStrategy: (
    strategy: BankRoutingStrategy,
    strictUtr: boolean,
    preventDup: boolean
  ) => Promise<void>;
  requireStrictUtr?: boolean;
  preventDuplicateUtr?: boolean;
}

export const BankAccountsManager: React.FC<BankAccountsManagerProps> = ({
  bankAccounts,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onSetPrimary,
  onToggleActive,
  routingStrategy,
  onUpdateRoutingStrategy,
  requireStrictUtr = true,
  preventDuplicateUtr = true,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<BankAccountQR | null>(null);
  const [testAmount, setTestAmount] = useState<number>(500);
  const [revealedAccounts, setRevealedAccounts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Bank Directory Search & Category Filters
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [selectedBankCategory, setSelectedBankCategory] = useState<string>('POPULAR');
  const [showAllBanksPicker, setShowAllBanksPicker] = useState(false);

  // Form State
  const [bankName, setBankName] = useState('ICICI Bank');
  const [accountHolder, setAccountHolder] = useState('Lolapay Merchant Services');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('ICIC0000102');
  const [vpa, setVpa] = useState('merchant.settle@icici');
  const [qrTitle, setQrTitle] = useState('Retail Counter QR');
  const [qrType, setQrType] = useState<'dynamic_intent' | 'static_soundbox' | 'custom_branding' | 'custom_upload'>('dynamic_intent');
  const [qrColor, setQrColor] = useState('#10b981');
  const [customQrImage, setCustomQrImage] = useState<string>('');
  const [customQrFileName, setCustomQrFileName] = useState<string>('');
  const [qrUploadMode, setQrUploadMode] = useState<'generate' | 'upload'>('generate');
  const [dailyLimit, setDailyLimit] = useState(500000);
  const [routingWeight, setRoutingWeight] = useState(5);
  const [formError, setFormError] = useState('');

  // Drag and Drop ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Routing Strategy Local State
  const [selectedStrategy, setSelectedStrategy] = useState<BankRoutingStrategy>(routingStrategy);
  const [strictUtrSetting, setStrictUtrSetting] = useState(requireStrictUtr);
  const [preventDupSetting, setPreventDupSetting] = useState(preventDuplicateUtr);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${text} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevealAccount = (id: string) => {
    setRevealedAccounts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectBankPreset = (bank: IndianBankInfo) => {
    setBankName(bank.name);
    setIfsc(`${bank.ifscPrefix}102`);
    setQrColor(bank.color);
    if (!vpa || vpa.includes('@')) {
      const prefix = vpa.split('@')[0] || 'merchant.settle';
      setVpa(`${prefix}${bank.defaultVpaDomain}`);
    }
    setShowAllBanksPicker(false);
  };

  // Image Upload Handlers
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      setCustomQrImage(base64Data);
      setCustomQrFileName(file.name);
      setQrType('custom_upload');
      setQrUploadMode('upload');
      setFormError('');
      showToast(`Uploaded QR image: ${file.name}`);
    };
    reader.onerror = () => {
      setFormError('Failed to read uploaded image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleImageFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveUploadedQr = () => {
    setCustomQrImage('');
    setCustomQrFileName('');
    setQrUploadMode('generate');
    setQrType('dynamic_intent');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenEditBank = (bank: BankAccountQR) => {
    setEditingBankId(bank.id);
    setBankName(bank.bankName);
    setAccountHolder(bank.accountHolder);
    setAccountNumber(bank.accountNumber);
    setConfirmAccountNumber(bank.accountNumber);
    setIfsc(bank.ifsc);
    setVpa(bank.vpa);
    setQrTitle(bank.qrTitle);
    setQrType(bank.qrType || 'dynamic_intent');
    setQrColor(bank.qrColor || '#10b981');
    setCustomQrImage(bank.customQrImage || '');
    setCustomQrFileName(bank.customQrImage ? 'Custom QR Code' : '');
    setQrUploadMode(bank.customQrImage ? 'upload' : 'generate');
    setDailyLimit(bank.dailyLimit || 500000);
    setRoutingWeight(bank.routingWeight || 5);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenNewBankModal = () => {
    setEditingBankId(null);
    setBankName('HDFC Bank');
    setAccountHolder('Lolapay Merchant Services');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfsc('HDFC0000060');
    setVpa('merchant.settle@hdfcbank');
    setQrTitle('Retail Counter QR');
    setQrType('dynamic_intent');
    setQrColor('#1e3a8a');
    setCustomQrImage('');
    setCustomQrFileName('');
    setQrUploadMode('generate');
    setDailyLimit(500000);
    setRoutingWeight(5);
    setFormError('');
    setShowAddModal(true);
  };

  const handleCreateOrUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!accountNumber || accountNumber.length < 8) {
      setFormError('Please enter a valid bank account number (min 8 digits).');
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setFormError('Account numbers do not match.');
      return;
    }
    if (!ifsc || ifsc.length < 11) {
      setFormError('Please enter a valid 11-character Indian IFSC code (e.g. SBIN0000456).');
      return;
    }
    if (!vpa || !vpa.includes('@')) {
      setFormError('Please provide a valid UPI Virtual Payment Address (e.g. name@bank).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<BankAccountQR> = {
        bankName,
        accountHolder,
        accountNumber,
        ifsc: ifsc.toUpperCase(),
        vpa: vpa.toLowerCase().trim(),
        qrTitle,
        qrType: qrUploadMode === 'upload' && customQrImage ? 'custom_upload' : qrType,
        qrColor,
        customQrImage: qrUploadMode === 'upload' && customQrImage ? customQrImage : undefined,
        dailyLimit: Number(dailyLimit),
        routingWeight: Number(routingWeight),
      };

      if (editingBankId) {
        await onUpdateBank(editingBankId, payload);
        showToast(`Updated ${bankName} (${vpa}) successfully!`);
      } else {
        await onAddBank(payload);
        showToast(`Added ${bankName} (${vpa}) with instant UPI routing!`);
      }
      setShowAddModal(false);
      setEditingBankId(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save bank account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRoutingSettings = async () => {
    try {
      await onUpdateRoutingStrategy(selectedStrategy, strictUtrSetting, preventDupSetting);
      showToast('Smart routing & anti-fraud configuration saved.');
    } catch (err: any) {
      showToast('Failed to update routing settings.');
    }
  };

  const activeCount = bankAccounts.filter((b) => b.isActive).length;
  const totalDailyVolume = bankAccounts.reduce((acc, b) => acc + (b.dailyVolume || 0), 0);
  const totalSettledOverall = bankAccounts.reduce((acc, b) => acc + (b.totalSettled || 0), 0);

  // Filtered banks for selector
  const filteredBanksList = searchBanks(bankSearchQuery, selectedBankCategory);

  return (
    <div id="bank-accounts-manager" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl animate-fade-in text-sm font-medium border border-emerald-400/30">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner & KPI bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Bank Accounts &amp; QR Standee Fleet
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Multi-VPA Active ({activeCount}/{bankAccounts.length})
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Connect any Indian bank (Public, Private, Payments &amp; SFB), upload custom QR soundboxes or standees, and distribute payment traffic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-bank-modal"
            onClick={handleOpenNewBankModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank &amp; QR</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Bank VPAs</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeCount} / {bankAccounts.length}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Ready for dynamic instant checkout
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Custom Uploaded QRs</span>
            <QrCode className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {bankAccounts.filter((b) => b.customQrImage).length} / {bankAccounts.length}
          </div>
          <p className="text-[11px] text-cyan-700 mt-1 font-medium">
            Soundbox &amp; standee image stickers
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Lifetime Settled</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{totalSettledOverall.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            Direct to merchant bank accounts
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Traffic Routing Engine</span>
            <Sliders className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-semibold text-slate-900 capitalize">
            {routingStrategy === 'smart_round_robin'
              ? 'Smart Round-Robin'
              : routingStrategy === 'limit_aware'
              ? 'Capacity-Aware'
              : 'Primary Only'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Anti-Fraud Shield: <span className="text-emerald-600 font-bold">Active</span>
          </p>
        </div>
      </div>

      {/* Smart Routing & Anti-Fraud Config Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Multi-Bank Traffic Routing &amp; Security Rules
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Control how customer checkouts are distributed across your multiple bank accounts and enable automated protections.
            </p>
          </div>
          <button
            onClick={handleSaveRoutingSettings}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Save Rules</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Strategy selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Routing Algorithm</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as BankRoutingStrategy)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="smart_round_robin">Smart Weighted Round-Robin (Balanced)</option>
              <option value="primary_only">Primary Account Only (Direct)</option>
              <option value="limit_aware">Daily Capacity-Aware (Avoid Limit Breaches)</option>
              <option value="manual">Manual Selection Per Order / Checkout</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Distributes payment traffic proportionally to assigned bank weights.
            </p>
          </div>

          {/* Duplicate UTR Guard */}
          <div className="flex items-start gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="chk-prevent-dup"
              checked={preventDupSetting}
              onChange={(e) => setPreventDupSetting(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white"
            />
            <div>
              <label
                htmlFor="chk-prevent-dup"
                className="text-xs font-semibold text-slate-900 cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Anti-Fraud Duplicate UTR Shield
              </label>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Automatically blocks recycled 12-digit UTR references across all orders.
              </p>
            </div>
          </div>

          {/* Strict 12-digit NPCI format */}
          <div className="flex items-start gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="chk-strict-utr"
              checked={strictUtrSetting}
              onChange={(e) => setStrictUtrSetting(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white"
            />
            <div>
              <label
                htmlFor="chk-strict-utr"
                className="text-xs font-semibold text-slate-900 cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                Strict NPCI 12-Digit Validator
              </label>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Rejects fake or truncated UTR strings before triggering merchant webhooks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Configured Bank Accounts &amp; QR Profiles ({bankAccounts.length})
          </h3>
          <span className="text-xs text-slate-500">Click any card to preview standee QR</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bankAccounts.map((bank) => {
            const isRevealed = Boolean(revealedAccounts[bank.id]);
            const maskedAccount = isRevealed
              ? bank.accountNumber
              : bank.accountNumber ? `•••• •••• ${bank.accountNumber.slice(-4)}` : '•••• •••• ----';
            const usagePercent = Math.min(
              100,
              Math.round(((bank.dailyVolume || 0) / (bank.dailyLimit || 500000)) * 100)
            );

            return (
              <div
                key={bank.id}
                id={`bank-card-${bank.id}`}
                className={`relative bg-white border transition-all rounded-2xl p-5 shadow-sm ${
                  bank.isPrimary
                    ? 'border-emerald-500/60 ring-1 ring-emerald-500/20 bg-emerald-50/20'
                    : bank.isActive
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm relative overflow-hidden shrink-0"
                      style={{ backgroundColor: bank.qrColor || '#10b981' }}
                    >
                      {bank.customQrImage ? (
                        <img
                          src={bank.customQrImage}
                          alt="Custom QR"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (bank.bankName || 'BA').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base">{bank.bankName}</h4>
                        {bank.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Primary
                          </span>
                        )}
                        {bank.customQrImage && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <Upload className="w-3 h-3" /> Custom QR
                          </span>
                        )}
                        {!bank.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{bank.qrTitle}</p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditBank(bank)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors text-xs font-medium cursor-pointer"
                      title="Edit Bank & Upload Custom QR"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowQrModal(bank)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 transition-colors group flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="View & Test Standee QR"
                    >
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">Standee</span>
                    </button>
                  </div>
                </div>

                {/* VPA & Account details */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">UPI VPA:</span>
                    <div className="flex items-center gap-1.5 font-mono text-emerald-700 font-bold">
                      <span>{bank.vpa}</span>
                      <button
                        onClick={() => handleCopy(bank.vpa, `vpa-${bank.id}`)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Copy VPA"
                      >
                        {copiedId === `vpa-${bank.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Account No:</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                      <span>{maskedAccount}</span>
                      <button
                        onClick={() => toggleRevealAccount(bank.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title={isRevealed ? 'Hide account number' : 'Show account number'}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">IFSC &amp; Beneficiary:</span>
                    <span className="font-mono text-slate-700">
                      {bank.ifsc} • {bank.accountHolder}
                    </span>
                  </div>

                  {/* Daily volume progress bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Daily Capacity Utilization:</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        ₹{(bank.dailyVolume || 0).toLocaleString('en-IN')} / ₹
                        {(bank.dailyLimit || 500000).toLocaleString('en-IN')} ({usagePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          usagePercent > 85
                            ? 'bg-rose-500'
                            : usagePercent > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {!bank.isPrimary && (
                      <button
                        onClick={() => onSetPrimary(bank.id)}
                        className="text-slate-600 hover:text-emerald-700 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                        <span>Make Primary</span>
                      </button>
                    )}
                    <button
                      onClick={() => onToggleActive(bank.id)}
                      className={`text-[11px] font-semibold transition-colors cursor-pointer ${
                        bank.isActive
                          ? 'text-slate-500 hover:text-amber-600'
                          : 'text-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      {bank.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQrModal(bank)}
                      className="text-slate-500 hover:text-slate-800 transition-colors p-1 cursor-pointer"
                      title="Download Standee QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {bankAccounts.length > 1 && (
                      <button
                        onClick={() => onDeleteBank(bank.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Bank Account & Upload QR Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {editingBankId ? 'Edit Bank Account & QR' : 'Add Bank Account & UPI QR Code'}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select from any Indian bank, enter settlement details, and upload or generate QR codes.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBankId(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateOrUpdateBank}
              className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* All Banks Selector Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    Indian Bank Directory ({ALL_INDIAN_BANKS.length} Banks)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllBanksPicker(!showAllBanksPicker)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>{showAllBanksPicker ? 'Hide Bank Directory' : 'Browse All Banks'}</span>
                  </button>
                </div>

                {/* Popular Quick Bank Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_INDIAN_BANKS.filter((b) => b.popular).slice(0, 8).map((b) => (
                    <button
                      type="button"
                      key={b.name}
                      onClick={() => handleSelectBankPreset(b)}
                      className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        bankName === b.name
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>

                {/* Expanded Full Bank Browser & Search Dropdown */}
                {showAllBanksPicker && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={bankSearchQuery}
                          onChange={(e) => setBankSearchQuery(e.target.value)}
                          placeholder="Search bank name, shortcode, or IFSC (e.g. SBI, HDFC, Canara, AU)..."
                          className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      {BANK_CATEGORIES.map((cat) => (
                        <button
                          type="button"
                          key={cat.key}
                          onClick={() => setSelectedBankCategory(cat.key)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                            selectedBankCategory === cat.key
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Filtered Banks List Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredBanksList.map((b) => (
                        <button
                          type="button"
                          key={b.name}
                          onClick={() => handleSelectBankPreset(b)}
                          className={`p-2 rounded-lg border text-left text-xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                            bankName === b.name
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: b.color }}
                            />
                            <span className="font-semibold truncate text-slate-900">{b.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>{b.ifscPrefix}***</span>
                            <span className="text-emerald-700">{b.defaultVpaDomain}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. ICICI Bank"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. Lolapay Merchant Services"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Account Number</label>
                  <input
                    type="password"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm Account Number</label>
                  <input
                    type="text"
                    required
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter account number"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. ICIC0000102"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    UPI VPA (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    required
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value.toLowerCase())}
                    placeholder="e.g. lolapay.retail@icici"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-emerald-700 font-bold focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* QR Code Configuration & Upload Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    QR Standee &amp; Image Configuration
                  </h4>

                  {/* Mode switch pills */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setQrUploadMode('generate')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        qrUploadMode === 'generate'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dynamic Vector QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrUploadMode('upload')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                        qrUploadMode === 'upload'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Custom QR</span>
                    </button>
                  </div>
                </div>

                {qrUploadMode === 'upload' ? (
                  /* Custom QR Upload Zone */
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {customQrImage ? (
                      <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={customQrImage}
                            alt="Uploaded QR Preview"
                            className="w-16 h-16 object-contain bg-white rounded-lg p-1 border border-slate-200"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Custom QR Code Attached</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {customQrFileName || 'Custom merchant QR image'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveUploadedQr}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove QR Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-300 hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          Click to upload or drag &amp; drop QR Code image
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Upload your Soundbox QR, counter standee sticker, or BharatPe / Paytm merchant QR (PNG, JPG, WEBP)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Auto-generates compliant NPCI UPI Intent vector QR codes on the fly with custom colors and amounts.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">QR Label / Title</label>
                    <input
                      type="text"
                      value={qrTitle}
                      onChange={(e) => setQrTitle(e.target.value)}
                      placeholder="e.g. VIP Counter QR"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Daily Limit (₹)</label>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      placeholder="500000"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Routing Weight (1-10)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={routingWeight}
                      onChange={(e) => setRoutingWeight(Number(e.target.value))}
                      placeholder="5"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBankId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{editingBankId ? 'Update Bank Account' : 'Save Bank & QR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Standee & QR Tester Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: showQrModal.qrColor || '#10b981' }}
                >
                  {(showQrModal.bankName || 'BA').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {showQrModal.bankName} - Official UPI Standee
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {showQrModal.qrTitle} • {showQrModal.vpa}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Standee Frame Container */}
              <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-xl border-2 border-slate-200 text-center relative overflow-hidden">
                {/* Header branding */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="text-left">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Beneficiary Merchant
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {showQrModal.accountHolder}
                    </h4>
                  </div>
                  <div className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 text-[11px] font-bold text-slate-700">
                    {showQrModal.bankName}
                  </div>
                </div>

                {/* QR Image Presentation */}
                <div className="relative inline-block p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-xs my-2">
                  {showQrModal.customQrImage ? (
                    <img
                      src={showQrModal.customQrImage}
                      alt="Custom Merchant QR"
                      className="w-48 h-48 mx-auto object-contain rounded-lg"
                    />
                  ) : (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                          `upi://pay?pa=${showQrModal.vpa}&pn=${encodeURIComponent(
                            showQrModal.accountHolder
                          )}&am=${testAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                            `Payment to ${showQrModal.bankName}`
                          )}`
                        )}`}
                        alt="UPI QR Standee"
                        className="w-48 h-48 mx-auto"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 bg-white border-2 border-slate-900 rounded-lg p-1 shadow-md flex items-center justify-center font-bold text-slate-900 text-xs">
                          UPI
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Amount & VPA */}
                <div className="mt-3 space-y-1">
                  <div className="text-lg font-extrabold text-emerald-600">
                    ₹{testAmount.toFixed(2)}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 py-1 px-3 rounded-full inline-block">
                    {showQrModal.vpa}
                  </div>
                </div>

                {/* Supported Apps footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-3">
                  <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> •{' '}
                  <span>BHIM</span>
                </div>
              </div>

              {/* Dynamic Amount Tester */}
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Test Amount:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  {[100, 500, 1500, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTestAmount(amt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        testAmount === amt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                    className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono text-right"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Standee</span>
                </button>
                <a
                  href={
                    showQrModal.customQrImage ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                      `upi://pay?pa=${showQrModal.vpa}&pn=${encodeURIComponent(
                        showQrModal.accountHolder
                      )}&am=${testAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                        `Payment to ${showQrModal.bankName}`
                      )}`
                    )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  download={`upi-qr-${showQrModal.bankName}.png`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Standee</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
