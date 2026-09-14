import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Smartphone,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
  Upload,
  Maximize2,
  ZoomIn,
  Building2,
  QrCode,
  Eye,
  X,
  Zap,
  Share2,
  Loader2,
  Info,
  UserCircle2,
} from 'lucide-react';
import { Order, BankAccountQR, User } from '../types';
import { generateAppDeeplinks, formatCurrency } from '../utils/upi';
import { formatErrorMessage, safeFetch } from '../utils/api';
import { Logo } from './Logo';

interface HostedCheckoutProps {
  order: Order;
  bankAccounts?: BankAccountQR[];
  onPaymentSuccess: (updatedOrder: Order) => void;
  onUtrSubmitted?: (updatedOrder: Order) => void;
  onBackToDashboard?: () => void;
  currentUser?: User | null;
}

export const HostedCheckout: React.FC<HostedCheckoutProps> = ({
  order: initialOrder,
  bankAccounts = [],
  onPaymentSuccess,
  onUtrSubmitted,
  onBackToDashboard,
  currentUser,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [activeIntentNotice, setActiveIntentNotice] = useState<{ app: string; message?: string } | null>(null);
  const [showIntentTroubleshooter, setShowIntentTroubleshooter] = useState(false);
  const [copiedUpiString, setCopiedUpiString] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [verificationError, setVerificationError] = useState('');
  const [showFullscreenQr, setShowFullscreenQr] = useState(false);

  // Match corresponding bank account from bankAccounts fleet
  const matchingBank =
    bankAccounts.find((b) => b.id === order.bankAccountId) ||
    bankAccounts.find((b) => b.vpa.toLowerCase() === order.merchantVpa.toLowerCase()) ||
    bankAccounts.find((b) => b.isPrimary && b.customQrImage) ||
    bankAccounts.find((b) => Boolean(b.customQrImage));

  // Resolved uploaded QR image (prioritizing order.customQrImage, then matchingBank)
  const uploadedQrImage = order.customQrImage || matchingBank?.customQrImage;

  // Active QR Presentation mode
  const [qrViewMode, setQrViewMode] = useState<'uploaded_standee' | 'dynamic_vector'>(
    uploadedQrImage ? 'uploaded_standee' : 'dynamic_vector'
  );

  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [intentGuideApp, setIntentGuideApp] = useState<string | null>(null);
  const [showQrShareModal, setShowQrShareModal] = useState<string | null>(null);
  const [submittedUtr, setSubmittedUtr] = useState<string>(initialOrder.utrNumber || '');
  const [isAwaitingApproval, setIsAwaitingApproval] = useState<boolean>(
    Boolean(initialOrder.utrNumber && initialOrder.status !== 'PAID')
  );

  // --- Magic Checkout (1-Click returning customer) ---
  const [magicPhone, setMagicPhone] = useState('');
  const [magicCustomer, setMagicCustomer] = useState<{
    name: string; email: string; phone: string; totalPayments: number; totalAmount: number;
  } | null>(null);
  const [isMagicLooking, setIsMagicLooking] = useState(false);
  const [magicMode, setMagicMode] = useState<'active' | 'skipped' | 'found' | 'not_found'>(
    // If merchant already filled customer details, skip magic bar
    initialOrder.customerPhone ? 'skipped' : 'active'
  );
  const [magicError, setMagicError] = useState('');

  const handleMagicLookup = async () => {
    const cleanPhone = magicPhone.trim().replace(/[\s\-()]/g, '');
    if (cleanPhone.length < 10) {
      setMagicError('Please enter a valid 10+ digit phone number.');
      return;
    }
    setIsMagicLooking(true);
    setMagicError('');
    try {
      const res = await safeFetch<{
        found: boolean;
        customer?: { name: string; email: string; phone: string; totalPayments: number; totalAmount: number };
        error?: string;
      }>('/api/checkout/magic-lookup', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (res.data?.found && res.data.customer) {
        setMagicCustomer(res.data.customer);
        setMagicMode('found');
      } else {
        setMagicMode('not_found');
      }
    } catch {
      setMagicError('Unable to look up. Please proceed normally.');
      setMagicMode('not_found');
    } finally {
      setIsMagicLooking(false);
    }
  };

  // Background status polling (checks every 1s for instant merchant approval)
  useEffect(() => {
    if (order.status === 'PAID') return;

    const checkOrderStatus = async () => {
      // 1. Instantaneous local storage check (for same-window / multi-tab approval)
      try {
        const storedStr = localStorage.getItem('9tepay_orders');
        if (storedStr) {
          const storedOrders: Order[] = JSON.parse(storedStr);
          const found = storedOrders.find(
            (o) =>
              (order.id && o.id === order.id) ||
              (order.orderNumber && o.orderNumber === order.orderNumber) ||
              (order.id && o.id?.toLowerCase() === order.id?.toLowerCase()) ||
              (order.orderNumber && o.orderNumber?.toLowerCase() === order.orderNumber?.toLowerCase())
          );
          if (found && found.status === 'PAID') {
            setOrder(found);
            setIsAwaitingApproval(false);
            onPaymentSuccess(found);
            return;
          }
        }
      } catch {}

      // 2. Poll server endpoint
      try {
        const orderIdentifier = order.id || order.orderNumber;
        if (!orderIdentifier) return;
        const res = await safeFetch<Order>(`/api/orders/${orderIdentifier}`);
        if (res.ok && res.data) {
          const fetchedOrder = (res.data as any).order || res.data;
          if (fetchedOrder.status === 'PAID') {
            setOrder(fetchedOrder);
            setIsAwaitingApproval(false);
            onPaymentSuccess(fetchedOrder);
          } else if (fetchedOrder.utrNumber || (fetchedOrder as any).reviewRequired) {
            setIsAwaitingApproval(true);
            if (fetchedOrder.utrNumber && !submittedUtr) {
              setSubmittedUtr(fetchedOrder.utrNumber);
              setUtrInput(fetchedOrder.utrNumber);
            }
          }
        }
      } catch {}
    };

    // Run check immediately, then poll every 1000ms
    checkOrderStatus();
    const pollInterval = setInterval(checkOrderStatus, 1000);

    // Instant cross-component event listener
    const handleOrderApproved = (e: any) => {
      const approvedOrder = e.detail?.order || e.detail;
      if (
        approvedOrder &&
        (approvedOrder.id === order.id ||
          approvedOrder.orderNumber === order.orderNumber ||
          e.detail?.orderId === order.id ||
          e.detail?.orderId === order.orderNumber)
      ) {
        const fullApproved: Order = {
          ...order,
          ...approvedOrder,
          status: 'PAID',
          paidAt: approvedOrder.paidAt || new Date().toISOString(),
          reviewRequired: false,
        };
        setOrder(fullApproved);
        setIsAwaitingApproval(false);
        onPaymentSuccess(fullApproved);
      } else {
        checkOrderStatus();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkOrderStatus();
      }
    };

    window.addEventListener('order_approved', handleOrderApproved);
    window.addEventListener('storage', checkOrderStatus);
    window.addEventListener('focus', checkOrderStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('order_approved', handleOrderApproved);
      window.removeEventListener('storage', checkOrderStatus);
      window.removeEventListener('focus', checkOrderStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [order.id, order.orderNumber, order.status, submittedUtr, onPaymentSuccess]);

  const handleCopyAmount = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(order.amount.toFixed(2)).catch(() => {});
    }
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleAppIntentClick = (appName: string, targetUrl: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!/^(upi|tez|phonepe|paytmmp|in\.org\.npci\.upiapp|cred):\/\//i.test(targetUrl)) {
      setVerificationError('This payment app link is unavailable. Please use the QR code or copy the UPI ID.');
      return;
    }

    // 1. Copy VPA to clipboard automatically so user can paste if app requires manual entry
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(order.merchantVpa).catch(() => {});
      }
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 3000);
    } catch {}

    // Show helpful active toast
    setActiveIntentNotice({
      app: appName,
      message: `Opening ${appName}... Complete your payment of ₹${order.amount.toFixed(2)} and submit the 12-digit UTR below.`,
    });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Launching an intent only opens the payment app; it never confirms settlement.
    try {
      window.location.href = targetUrl;
    } catch {
      window.location.href = targetUrl;
    }

    // On desktop or non-mobile, show modal helper
    if (!isMobile) {
      setIntentGuideApp(appName);
    }
  };
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    if (uploadedQrImage) {
      setQrViewMode('uploaded_standee');
    }
  }, [uploadedQrImage]);

  // Countdown timer
  useEffect(() => {
    if (order.status === 'PAID') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [order.status]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const deeplinks = generateAppDeeplinks({
    merchantVpa: order.merchantVpa,
    merchantName: order.merchantName,
    amount: order.amount,
    orderNumber: order.orderNumber,
    note: order.note || `Order ${order.orderNumber}`,
  });

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(order.merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyUpiString = () => {
    navigator.clipboard.writeText(order.upiString);
    setCopiedUpiString(true);
    setTimeout(() => setCopiedUpiString(false), 2000);
  };

  const handleDownloadQr = () => {
    if (uploadedQrImage && qrViewMode === 'uploaded_standee') {
      const link = document.createElement('a');
      link.href = uploadedQrImage;
      link.download = `QR_${order.orderNumber || 'payment'}_${(order.merchantName || 'merchant').replace(/\s+/g, '_')}.png`;
      link.click();
    } else {
      // Trigger SVG canvas export if dynamic QR
      try {
        const svgElement =
          qrContainerRef.current?.querySelector('svg') ||
          (document.getElementById('main-checkout-qr-svg') as unknown as SVGElement) ||
          (document.querySelector('.qr-code-svg-container svg') as unknown as SVGElement);
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, 512, 512);
              ctx.drawImage(img, 32, 32, 448, 448);
            }
            const a = document.createElement('a');
            a.download = `UPI_QR_${order.orderNumber || 'payment'}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
            URL.revokeObjectURL(url);
          };
          img.src = url;
        }
      } catch (err) {
        console.warn('QR canvas download fallback:', err);
      }
    }
  };

  const getQrFile = async (): Promise<File | null> => {
    try {
      if (uploadedQrImage && qrViewMode === 'uploaded_standee') {
        try {
          if (uploadedQrImage.startsWith('data:')) {
            const arr = uploadedQrImage.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], `UPI_QR_${order.orderNumber || 'payment'}.png`, { type: mime });
          }
          const response = await fetch(uploadedQrImage);
          const blob = await response.blob();
          return new File([blob], `UPI_QR_${order.orderNumber || 'payment'}.png`, { type: 'image/png' });
        } catch {
          // fallback if fetch fails
        }
      }

      const svgElement =
        qrContainerRef.current?.querySelector('svg') ||
        (document.getElementById('main-checkout-qr-svg') as unknown as SVGElement) ||
        (document.querySelector('.qr-code-svg-container svg') as unknown as SVGElement);
      if (!svgElement) return null;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise<File | null>((resolve) => {
        img.onload = () => {
          canvas.width = 512;
          canvas.height = 512;
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 512, 512);
            ctx.drawImage(img, 32, 32, 448, 448);
          }
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(new File([blob], `UPI_QR_${order.orderNumber || 'payment'}.png`, { type: 'image/png' }));
            } else {
              resolve(null);
            }
          }, 'image/png');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (err) {
      console.warn('Error generating QR file:', err);
      return null;
    }
  };

  const handleShareQr = async (appName: string = 'Google Pay') => {
    // 1. Copy VPA for clipboard convenience
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(order.merchantVpa).catch(() => {});
      }
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 3000);
    } catch {}

    // 2. Generate actual high-resolution QR image File
    const qrFile = await getQrFile();

    // 3. Web Share API invocation with File object (shares actual QR image file into native apps)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        if (qrFile && navigator.canShare && navigator.canShare({ files: [qrFile] })) {
          await navigator.share({
            title: `UPI QR Code - ₹${order.amount.toFixed(2)}`,
            text: `Scan QR in ${appName} or any UPI app to pay ₹${order.amount.toFixed(2)}. UPI VPA: ${order.merchantVpa}`,
            files: [qrFile],
          });
          return;
        } else {
          // If files cannot be shared directly via navigator.share, download the image and share text
          handleDownloadQr();
          try {
            await navigator.share({
              title: `Pay ₹${order.amount.toFixed(2)} - ${order.merchantName}`,
              text: `Scan QR code in ${appName} / PhonePe / Paytm to pay ₹${order.amount.toFixed(2)}. UPI VPA: ${order.merchantVpa}`,
            });
            return;
          } catch {}
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Native share canceled or unsupported:', err);
      }
    }

    // 4. Fallback for desktop / unsupported browsers: download QR PNG & open modal with scanner guide
    handleDownloadQr();
    setShowQrShareModal(appName);
  };

  const handleVerifyUtr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUtr = utrInput.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanUtr)) {
      setVerificationError('Enter the exact 12-digit UTR shown in your UPI or bank app.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      const res = await safeFetch<{
        success: boolean;
        order?: Order;
        error?: string;
        message?: string;
        isAwaitingApproval?: boolean;
      }>(`/api/orders/${order.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          utr: cleanUtr,
          orderId: order.id,
          amount: order.amount,
          customerName: magicCustomer?.name || order.customerName,
        }),
      });

      if (res.ok && res.data?.success && res.data.order) {
        const updatedOrder: Order = res.data?.order || {
          ...order,
          utrNumber: cleanUtr,
          status: 'PENDING',
          reviewRequired: true,
        };
        setOrder(updatedOrder);
        setSubmittedUtr(cleanUtr);

        // Sync to localStorage & emit window event so merchant dashboard updates immediately
        try {
          const storedStr = localStorage.getItem('9tepay_orders');
          const storedOrders: Order[] = storedStr ? JSON.parse(storedStr) : [];
          const idx = storedOrders.findIndex(
            (o) => o.id === updatedOrder.id || o.orderNumber === updatedOrder.orderNumber
          );
          if (idx >= 0) {
            storedOrders[idx] = { ...storedOrders[idx], ...updatedOrder, utrNumber: cleanUtr };
          } else {
            storedOrders.unshift(updatedOrder);
          }
          localStorage.setItem('9tepay_orders', JSON.stringify(storedOrders));
        } catch {}

        window.dispatchEvent(new CustomEvent('utr_submitted', { detail: updatedOrder }));
        window.dispatchEvent(new Event('storage'));
        onUtrSubmitted?.(updatedOrder);

        if (updatedOrder.status === 'PAID') {
          setIsAwaitingApproval(false);
          onPaymentSuccess(updatedOrder);
        } else {
          // UTR submitted - pending merchant approval
          setIsAwaitingApproval(true);
        }
      } else {
        let rawErr = String((res.data?.error as any)?.message || res.data?.error || res.data?.message || res.error || "Could not verify transaction.");
        if (typeof rawErr === 'string' && (rawErr.startsWith('{') || rawErr.startsWith('['))) {
          try {
            const parsed = JSON.parse(rawErr);
            rawErr = parsed.error || parsed.message || rawErr;
          } catch {}
        }
        const cleanErr = typeof rawErr === 'string' ? rawErr : JSON.stringify(rawErr);

        setVerificationError(cleanErr);
      }
    } catch (err: any) {
      setVerificationError(formatErrorMessage(err, 'Unable to submit UTR. Please check your connection and try again.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateInstantPay = async () => {
    const randomUtr = `4230${Math.floor(10000000 + Math.random() * 90000000)}`;
    setUtrInput(randomUtr);
    setIsVerifying(true);
    try {
      const res = await safeFetch<{ success: boolean; order?: Order; error?: string }>(
        `/api/orders/${order.id}/verify`,
        {
          method: 'POST',
          body: JSON.stringify({ utr: randomUtr }),
        }
      );
      if (res.ok && res.data?.success && res.data.order) {
        setOrder(res.data.order);
        onPaymentSuccess(res.data.order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      {order.status === 'PAID' ? (
        /* Payment Success Receipt View */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              Payment Successful & Verified
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {formatCurrency(order.amount)}
            </h2>
            <p className="text-xs text-slate-500">
              Paid to <span className="text-slate-900 font-semibold">{order.merchantName}</span>
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3 font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600 font-sans">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Payment Summary
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                SETTLED
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Order Reference:</span>
              <span className="text-slate-900 font-semibold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bank UTR / Ref No:</span>
              <span className="text-emerald-700 font-bold">{order.utrNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer Name:</span>
              <span className="text-slate-900">{magicCustomer?.name || order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Merchant VPA:</span>
              <span className="text-slate-700">{order.merchantVpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Timestamp:</span>
              <span className="text-slate-700">
                {order.paidAt ? new Date(order.paidAt).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {currentUser && onBackToDashboard ? (
              <button
                onClick={onBackToDashboard}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>Return to Merchant Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-xs text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 font-medium">
                Transaction Completed. You can safely close this window.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Checkout Interface */
        <div className="space-y-4">
          {/* Official 9tepay Header Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center justify-between shadow-xs">
            <Logo variant="light" size="sm" showSubtitle={true} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Secure Payment Gateway
              </span>
            </div>
          </div>

          {/* ⚡ Magic Checkout: 1-Click Returning Customer */}
          {magicMode === 'active' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>⚡ 1-Click Magic Checkout</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Free
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Paid via any 9tepay merchant before? Enter your phone to auto-fill your details instantly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={magicPhone}
                        onChange={(e) => setMagicPhone(e.target.value.replace(/[^\d+\s\-()]/g, '').slice(0, 15))}
                        onKeyDown={(e) => e.key === 'Enter' && handleMagicLookup()}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white border border-blue-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleMagicLookup}
                      disabled={isMagicLooking || magicPhone.trim().length < 10}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                    >
                      {isMagicLooking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{isMagicLooking ? 'Looking up...' : 'Quick Fill'}</span>
                      <span className="sm:hidden">{isMagicLooking ? '...' : 'Fill'}</span>
                    </button>
                  </div>
                  {magicError && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {magicError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setMagicMode('skipped')}
                    className="text-[11px] text-slate-500 hover:text-blue-600 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    I'm a new customer — skip this
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Magic Checkout: Welcome Back Banner */}
          {magicMode === 'found' && magicCustomer && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">
                      Welcome back, {magicCustomer.name}! 👋
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {magicCustomer.totalPayments === 1
                        ? '2nd payment on 9tepay'
                        : `${magicCustomer.totalPayments + 1}${['st','nd','rd'][magicCustomer.totalPayments] || 'th'} payment on 9tepay`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {magicCustomer.email || magicCustomer.phone} — Your details have been auto-filled below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMagicMode('active'); setMagicCustomer(null); }}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
                  title="Use a different account"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Magic Checkout: Not Found Message */}
          {magicMode === 'not_found' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>No saved profile found for that phone. Continue as a new customer — your details will be saved after payment!</span>
              </div>
              <button
                type="button"
                onClick={() => setMagicMode('skipped')}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer shrink-0 ml-2"
              >
                Got it
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: QR Code & Intent Deeplink Actions */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
            {/* Header with Merchant & Amount */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> NPCI Verified Gateway
                  </span>
                  {(order.bankAccountName || matchingBank?.qrTitle) && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-mono flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {order.bankAccountName || matchingBank?.qrTitle}
                    </span>
                  )}
                  {uploadedQrImage && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Upload className="w-3 h-3 text-emerald-600" />
                      Standee Attached
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{order.merchantName}</h3>
                <p className="text-xs text-slate-500 font-mono">Ref: {order.orderNumber}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(order.amount)}
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 font-mono justify-end mt-0.5 font-semibold">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>Expires in {formatTimer(timeLeft)}</span>
                </div>
              </div>
            </div>

            {/* QR Code Presentation Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 relative">
              {/* Mode Toggle Tabs (if custom uploaded QR exists) */}
              {uploadedQrImage && (
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 text-xs w-full max-w-xs justify-center mb-1">
                  <button
                    type="button"
                    onClick={() => setQrViewMode('uploaded_standee')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                      qrViewMode === 'uploaded_standee'
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Merchant Standee QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrViewMode('dynamic_vector')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                      qrViewMode === 'dynamic_vector'
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Dynamic Vector QR</span>
                  </button>
                </div>
              )}

              {/* QR Image Display Canvas */}
              <div className="relative group">
                <div
                  ref={qrContainerRef}
                  className="qr-code-svg-container bg-white p-3.5 rounded-2xl shadow-md relative flex items-center justify-center min-w-[220px] min-h-[220px] max-w-[260px] overflow-hidden border-2 border-slate-200"
                >
                  {uploadedQrImage && qrViewMode === 'uploaded_standee' ? (
                    <div className="relative flex items-center justify-center">
                      <img
                        src={uploadedQrImage}
                        alt="Merchant Uploaded QR Standee"
                        className="w-[210px] h-[210px] object-contain rounded-xl cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                        onClick={() => setShowFullscreenQr(true)}
                      />
                    </div>
                  ) : (
                    <QRCodeSVG
                      id="main-checkout-qr-svg"
                      value={order.upiString}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                {/* Quick Action Overlay Buttons for Uploaded QR */}
                {uploadedQrImage && qrViewMode === 'uploaded_standee' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setShowFullscreenQr(true)}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg backdrop-blur-xs border border-slate-200 shadow-sm transition-colors cursor-pointer"
                      title="Expand / Fullscreen QR"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg backdrop-blur-xs border border-slate-200 shadow-sm transition-colors cursor-pointer"
                      title="Download QR Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* QR Subtitle & Instructions */}
              <div className="text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5">
                  <span>Scan with any UPI App (GPay, PhonePe, Paytm, BHIM, Cred)</span>
                </p>

                {uploadedQrImage && qrViewMode === 'uploaded_standee' ? (
                  <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Merchant Verified Standee Active • Amount: {formatCurrency(order.amount)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-[11px] text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold">
                    <QrCode className="w-3 h-3 text-blue-600" />
                    <span>Dynamic Auto-Embedded Amount Intent</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-600 pt-0.5">
                  <span>VPA: <strong className="text-slate-900">{order.merchantVpa}</strong></span>
                  <button
                    onClick={handleCopyVpa}
                    className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Share QR to UPI Apps */}
                <div className="pt-2 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShareQr('Google Pay')}
                      className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Google Pay (Share QR)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareQr('PhonePe')}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>PhonePe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareQr('Paytm')}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Paytm</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 italic font-medium">
                    (Scan this QR using PhonePe, GPay, Paytm, or BHIM App to pay)
                  </p>
                </div>
              </div>
            </div>

            {/* 1-Click Mobile UPI Deeplink Intent Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  Option A: 1-Click Mobile App Intents
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Opens installed UPI app</span>
              </div>

              {/* Primary Universal Intent */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={deeplinks.generic}
                  onClick={(e) => handleAppIntentClick('UPI Universal Intent', deeplinks.generic, e)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay ₹{order.amount.toFixed(2)} with Any UPI App</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                </a>

                <a
                  href={deeplinks.cleanP2p}
                  onClick={(e) => handleAppIntentClick('Pure P2P Intent', deeplinks.cleanP2p, e)}
                  className="px-3.5 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                  title="Direct P2P Link (Bypasses Merchant Intent Block)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pure P2P Link</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyUpiString}
                  className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Copy raw upi:// URI string for mobile app testing"
                >
                  {copiedUpiString ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied Intent</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Intent</span>
                    </>
                  )}
                </button>
              </div>

              {/* App-Specific Intent Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                {/* Google Pay */}
                <a
                  href={deeplinks.gpay}
                  onClick={(e) => handleAppIntentClick('Google Pay', deeplinks.gpay, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[10px]">
                    G
                  </div>
                  <span>GPay</span>
                </a>

                {/* PhonePe */}
                <a
                  href={deeplinks.phonepe}
                  onClick={(e) => handleAppIntentClick('PhonePe', deeplinks.phonepe, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-purple-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-purple-900 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[10px]">
                    Pe
                  </div>
                  <span>PhonePe</span>
                </a>

                {/* Paytm */}
                <a
                  href={deeplinks.paytm}
                  onClick={(e) => handleAppIntentClick('Paytm', deeplinks.paytm, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-cyan-300 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-cyan-900 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-black text-[10px]">
                    Py
                  </div>
                  <span>Paytm</span>
                </a>

                {/* BHIM UPI */}
                <a
                  href={deeplinks.bhim}
                  onClick={(e) => handleAppIntentClick('BHIM UPI', deeplinks.bhim, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[10px]">
                    BH
                  </div>
                  <span>BHIM</span>
                </a>

                {/* CRED */}
                <a
                  href={deeplinks.cred}
                  onClick={(e) => handleAppIntentClick('CRED', deeplinks.cred, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                    CR
                  </div>
                  <span>CRED</span>
                </a>

                {/* WhatsApp Pay */}
                <a
                  href={deeplinks.whatsapp}
                  onClick={(e) => handleAppIntentClick('WhatsApp Pay', deeplinks.whatsapp, e)}
                  className="bg-slate-50 hover:bg-slate-100 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 transition-all cursor-pointer group shadow-2xs active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                    WA
                  </div>
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Active Intent Live Notice / Floating Banner */}
              {activeIntentNotice && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2 animate-fade-in text-xs text-blue-900">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Opening {activeIntentNotice.app}...</span>
                    </div>
                    <button
                      onClick={() => setActiveIntentNotice(null)}
                      className="text-blue-500 hover:text-blue-800 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    {activeIntentNotice.message}
                  </p>
                </div>
              )}

              {/* Comprehensive Resolution Panel for "Unverified Merchant" Intent Blocks */}
              <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 space-y-3 mt-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5 text-amber-950">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs">
                        GPay / Paytm "Unverified Merchant" Solution
                      </h5>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                        If Paytm or Google Pay says <em>"Don't worry, money has not been deducted. This unverified merchant can't accept intent payments"</em>, use one of these 100% working methods:
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Hub */}
                <div className="space-y-2 pt-1">
                  {/* Method 1: Copy UPI ID & Launch Direct Transfer */}
                  <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">1</span>
                        Pay via UPI ID (100% Success):
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Zero Intent Blocks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">UPI ID:</span>
                        <div className="font-mono text-xs text-slate-900 font-bold truncate max-w-[150px]">
                          {order.merchantVpa}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer ml-1"
                        >
                          {copiedVpa ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">Amount:</span>
                        <div className="font-mono text-xs text-slate-900 font-bold">
                          ₹{order.amount.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAmount}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer ml-1"
                        >
                          {copiedAmount ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600">
                      👉 In Paytm / GPay / PhonePe: Tap <strong>"Pay to UPI ID"</strong> → Paste <strong>{order.merchantVpa}</strong> → Enter <strong>₹{order.amount.toFixed(2)}</strong> → Pay!
                    </p>
                  </div>

                  {/* Method 2: Scan QR Code image */}
                  <div className="bg-white border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="space-y-0.5 text-left w-full">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">2</span>
                        Scan QR from Gallery:
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        QR scanning is authorized by NPCI and bypasses all mobile intent firewalls.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQrShareModal('Google Pay / Paytm')}
                        className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all border border-slate-200 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Guide</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Educational info toggle */}
                <button
                  type="button"
                  onClick={() => setShowIntentTroubleshooter(!showIntentTroubleshooter)}
                  className="text-[11px] text-amber-900 hover:text-amber-950 font-semibold flex items-center gap-1 pt-0.5 cursor-pointer underline underline-offset-2"
                >
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showIntentTroubleshooter ? 'Hide details' : 'Why does GPay / Paytm show "unverified merchant"?'}</span>
                </button>

                {showIntentTroubleshooter && (
                  <div className="bg-amber-100/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 space-y-1.5 leading-relaxed animate-fade-in">
                    <p className="font-bold text-slate-900">
                      Why does Google Pay or Paytm show this warning?
                    </p>
                    <p>
                      NPCI and UPI apps (Google Pay & Paytm) restrict <strong>web deep-link intents</strong> for personal savings account UPI IDs unless they are registered enterprise merchant aggregators with signed APK certificates.
                    </p>
                    <p>
                      <strong>How to solve it instantly:</strong>
                      <br />• <strong>Option 1:</strong> Tap "Pay to UPI ID" inside GPay/Paytm and send money directly to the copied UPI ID.
                      <br />• <strong>Option 2:</strong> Scan the Standee QR image using your app scanner (QR scans are 100% permitted by NPCI).
                      <br />• <strong>Option 3:</strong> Merchants can upload a verified Business QR Standee in their 9tepay dashboard for seamless customer experience.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: UTR Confirmation & Fast Simulator */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Step 2: UTR Reference Submission */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Paid already? Submit UTR
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Enter the UPI transaction/reference number after completing payment.
              </p>

              <form onSubmit={handleVerifyUtr} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    12-Digit UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    disabled={isAwaitingApproval || Boolean(submittedUtr)}
                    value={submittedUtr || utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="e.g. 423019827361"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                  {(isAwaitingApproval || Boolean(submittedUtr)) && (
                    <p className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Submitted — waiting for merchant approval.</span>
                    </p>
                  )}
                </div>

                {verificationError && (
                  <div className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !utrInput || isAwaitingApproval || Boolean(submittedUtr)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl border border-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {isAwaitingApproval || Boolean(submittedUtr)
                      ? 'UTR Submitted — Awaiting Merchant Approval'
                      : 'Submit UTR'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Floating Bottom Notification Badge: UTR submitted — awaiting merchant approval... */}
      {(isAwaitingApproval || (submittedUtr && order.status !== 'PAID') || (order.utrNumber && order.status !== 'PAID')) && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-white font-semibold text-xs px-5 py-3 rounded-full shadow-2xl border border-amber-400/60 flex items-center gap-2.5 animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-200 animate-ping" />
          <span>🟡 UTR submitted — awaiting merchant approval...</span>
        </div>
      )}

      {/* Dedicated QR Share Guidance Modal */}
      {showQrShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowQrShareModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-left">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Share QR to {showQrShareModal}</h4>
                  <p className="text-xs text-slate-500">Scan QR image directly in your UPI app</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrShareModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Preview in Modal */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center">
              {uploadedQrImage && qrViewMode === 'uploaded_standee' ? (
                <img src={uploadedQrImage} alt="QR Code" className="w-44 h-44 object-contain rounded-xl shadow-xs" />
              ) : (
                <div className="bg-white p-3 rounded-xl shadow-xs">
                  <QRCodeSVG value={order.upiString} size={160} level="M" />
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-left text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>How to Pay via QR Image in {showQrShareModal}:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-amber-900 text-[11px] font-medium pl-1">
                <li>QR image downloaded &amp; UPI ID copied: <strong>{order.merchantVpa}</strong></li>
                <li>Open <strong>{showQrShareModal}</strong> app on your mobile phone.</li>
                <li>Tap <strong>"Scan QR Code"</strong> → select <strong>"Upload from Gallery/Photos"</strong>.</li>
                <li>Select the QR image, complete payment of <strong>₹{order.amount.toFixed(2)}</strong>, and submit the 12-digit UTR!</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <a
                href={
                  showQrShareModal?.toLowerCase().includes('google') || showQrShareModal?.toLowerCase().includes('gpay')
                    ? deeplinks.gpay
                    : showQrShareModal?.toLowerCase().includes('phonepe')
                    ? deeplinks.phonepe
                    : showQrShareModal?.toLowerCase().includes('paytm')
                    ? deeplinks.paytm
                    : deeplinks.generic
                }
                target="_top"
                onClick={(e) => {
                  const targetUrl =
                    showQrShareModal?.toLowerCase().includes('google') || showQrShareModal?.toLowerCase().includes('gpay')
                      ? deeplinks.gpay
                      : showQrShareModal?.toLowerCase().includes('phonepe')
                      ? deeplinks.phonepe
                      : showQrShareModal?.toLowerCase().includes('paytm')
                      ? deeplinks.paytm
                      : deeplinks.generic;
                  handleAppIntentClick(showQrShareModal || 'UPI App', targetUrl, e);
                }}
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4" />
                <span>Open {showQrShareModal || 'UPI'} App</span>
              </a>
              <button
                onClick={handleDownloadQr}
                className="w-full sm:flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download QR PNG</span>
              </button>
            </div>
            <div>
              <button
                onClick={() => setShowQrShareModal(null)}
                className="w-full text-slate-500 hover:text-slate-800 font-semibold text-xs py-1.5 transition-colors cursor-pointer"
              >
                Close &amp; Enter UTR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intent Guidance Modal */}
      {intentGuideApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setIntentGuideApp(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">VPA Copied to Clipboard!</h4>
                  <p className="text-xs text-emerald-700 font-mono font-bold mt-0.5">{order.merchantVpa}</p>
                </div>
              </div>
              <button
                onClick={() => setIntentGuideApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="text-amber-800 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice for Paytm / PhonePe Intent Payments</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                If {intentGuideApp} displays <em>"Unverified merchant can't accept intent payments"</em>:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] font-medium pl-1">
                <li>In {intentGuideApp}, tap <strong>"To UPI ID"</strong> or <strong>"Pay to Mobile/UPI"</strong></li>
                <li>Paste <strong>{order.merchantVpa}</strong></li>
                <li>Pay <strong>₹{order.amount.toFixed(2)}</strong> &amp; copy the 12-digit UTR</li>
                <li>Enter the UTR on this screen to confirm your order!</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyVpa}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedVpa ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedVpa ? 'Copied VPA Again' : 'Re-Copy VPA'}</span>
              </button>
              <button
                onClick={() => setIntentGuideApp(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2.5 rounded-xl transition-all border border-slate-200 cursor-pointer"
              >
                Got It, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen QR Modal */}
      {showFullscreenQr && uploadedQrImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowFullscreenQr(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Merchant Standee QR Code</span>
                </h4>
                <p className="text-xs text-slate-500">{order.merchantName} • {order.merchantVpa}</p>
              </div>
              <button
                onClick={() => setShowFullscreenQr(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl inline-block border border-slate-200">
              <img
                src={uploadedQrImage}
                alt="Enlarged Merchant Standee QR"
                className="max-h-[360px] w-auto object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="text-xs text-slate-600 font-mono">
              Amount to Transfer: <strong className="text-emerald-700 text-sm font-bold">{formatCurrency(order.amount)}</strong>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Save / Download QR</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFullscreenQr(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
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
