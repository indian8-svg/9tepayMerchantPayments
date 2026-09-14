import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  Code2,
  Lock,
  LogOut,
  Shield,
  UserCheck,
  Building,
  QrCode,
  Link2,
  XCircle,
  CheckCircle2,
  User as UserIcon,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  Check,
  Info,
  Mail,
  Moon,
  Sun,
} from 'lucide-react';
import { Order, MerchantProfile, WebhookLog, User, BankAccountQR, BankRoutingStrategy, SecurityEvent } from './types';
import { safeFetch, fetchJson, api } from './utils/api';
import { MerchantDashboard } from './components/MerchantDashboard';
import { PaymentLinksManager } from './components/PaymentLinksManager';
import { HostedCheckout } from './components/HostedCheckout';
import { PublicInvoice } from './components/PublicInvoice';
import { DeveloperApiDocs } from './components/DeveloperApiDocs';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthPortal } from './components/AuthPortal';
import { Logo } from './components/Logo';
import { ProfileSection } from './components/ProfileSection';
import { SettingsSection } from './components/SettingsSection';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';

function getOrderIdFromUrl(): string | null {
  try {
    const path = window.location.pathname;
    const match = path.match(/\/checkout\/([^\/\?#]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    const hash = window.location.hash;
    const hashMatch = hash.match(/#\/checkout\/([^\/\?#]+)/);
    if (hashMatch && hashMatch[1]) {
      return decodeURIComponent(hashMatch[1]);
    }

    const searchParams = new URLSearchParams(window.location.search);
    const qOrderId = searchParams.get('orderId') || searchParams.get('id');
    if (qOrderId) {
      return qOrderId;
    }
  } catch {
    // ignore
  }
  return null;
}

// Initial Seed Defaults (Used when localStorage is empty on first launch)
const SEED_ORDERS: Order[] = [];

const SEED_BANK_ACCOUNTS: BankAccountQR[] = [];

const DEFAULT_PROFILE: MerchantProfile = {
  businessName: '',
  vpa: '',
  phone: '',
  email: '',
  apiKey: '',
  apiSecret: '',
  webhookUrl: '',
  webhookSecret: '',
  autoApproveUtr: true,
  settlementRate: 0.0,
  routingStrategy: 'smart_round_robin',
  requireStrictUtrFormat: true,
  preventDuplicateUtr: true,
};

const DEFAULT_USER: User | null = null;

interface PaymentNotification {
  id: string;
  orderNumber: string;
  amount: number;
  customerName?: string;
  timestamp: string;
}

export function App() {
  const initialUrlOrderId = getOrderIdFromUrl();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('9tepay_session_token') || sessionStorage.getItem('9tepay_session_token');
      if (!token) {
        return null; // Sign out default! Must have active token to resume
      }
      const saved = localStorage.getItem('9tepay_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  // Clear any prefilled or mock cached data in local storage once to ensure a clean slate
  useEffect(() => {
    const isCleaned = localStorage.getItem('9tepay_pristine_clean');
    if (!isCleaned) {
      localStorage.removeItem('9tepay_user');
      localStorage.removeItem('9tepay_orders');
      localStorage.removeItem('9tepay_bank_accounts');
      localStorage.removeItem('9tepay_profile');
      localStorage.removeItem('9tepay_sec_events');
      localStorage.removeItem('9tepay_webhook_logs');
      
      // Clear user scoped storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('9tepay_profile_') || key.startsWith('9tepay_banks_') || key.startsWith('9tepay_orders_'))) {
          localStorage.removeItem(key);
          i--;
        }
      }
      localStorage.setItem('9tepay_pristine_clean', 'true');
      
      // Force initial empty state
      setCurrentUser(null);
      setOrders([]);
      setBankAccounts([]);
      setProfile(DEFAULT_PROFILE);
      setWebhookLogs([]);
      setSecurityEvents([]);
    }
  }, []);

  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('9tepay_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const navDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('9tepay_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Keep the selected theme for this session when storage is unavailable.
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setIsNavDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [activeView, setActiveView] = useState<
    'dashboard' | 'payment_links' | 'checkout' | 'invoice' | 'admin' | 'auth' | 'docs' | 'profile' | 'settings' | 'about' | 'contact'
  >(() => {
    if (initialUrlOrderId) {
      return 'checkout';
    }
    if (window.location.pathname.startsWith('/pay-invoice/')) {
      return 'invoice';
    }
    try {
      const saved = localStorage.getItem('9tepay_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'admin' ? 'admin' : 'dashboard';
      }
    } catch {}
    return 'about';
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('9tepay_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_ORDERS;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccountQR[]>(() => {
    try {
      const saved = localStorage.getItem('9tepay_bank_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_BANK_ACCOUNTS;
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(() => {
    try {
      const saved = localStorage.getItem('9tepay_sec_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [profile, setProfile] = useState<MerchantProfile>(() => {
    try {
      const saved = localStorage.getItem('9tepay_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    try {
      const saved = localStorage.getItem('9tepay_webhook_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<boolean>(Boolean(initialUrlOrderId));
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);
  const paidOrderIdsRef = React.useRef(new Set<string>());
  const hasLoadedPaidOrdersRef = React.useRef(false);
  const lastNotificationKeyRef = React.useRef('');

  const announcePayment = (order: Order, broadcast = true) => {
    if (order.status !== 'PAID') return;
    const id = order.id || order.orderNumber;
    const notificationKey = `${id}:${order.paidAt || ''}`;
    if (!id || lastNotificationKeyRef.current === notificationKey) return;
    lastNotificationKeyRef.current = notificationKey;
    paidOrderIdsRef.current.add(id);

    const notification: PaymentNotification = {
      id,
      orderNumber: order.orderNumber || order.id,
      amount: Number(order.amount) || 0,
      customerName: order.customerName,
      timestamp: order.paidAt || new Date().toISOString(),
    };
    setPaymentNotification(notification);
    if (broadcast) {
      try {
        localStorage.setItem('9tepay_payment_notification', JSON.stringify(notification));
      } catch {
        // The in-memory notification remains available if storage is unavailable.
      }
    }
    window.setTimeout(() => {
      setPaymentNotification((current) => (current?.id === notification.id ? null : current));
    }, 7000);
  };

  // User-scoped data loader effect: when currentUser changes, load user's isolated profile, bank accounts, and orders
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;

    // Load profile for this user
    try {
      const savedProf = localStorage.getItem(`9tepay_profile_${uid}`);
      if (savedProf) {
        setProfile(JSON.parse(savedProf));
      } else {
        const userProf: MerchantProfile = {
          businessName: currentUser.businessName || 'Merchant Services',
          vpa: currentUser.vpa || 'merchant@icici',
          phone: currentUser.phone || '+91 98765 43210',
          email: currentUser.email || 'merchant@9tepay.com',
          apiKey: '',
          apiSecret: '',
          webhookUrl: 'https://shop.example.com/api/webhook/upi-callback',
          webhookSecret: '',
          autoApproveUtr: true,
          settlementRate: 0.0,
          routingStrategy: 'smart_round_robin',
          requireStrictUtrFormat: true,
          preventDuplicateUtr: true,
        };
        setProfile(userProf);
        localStorage.setItem(`9tepay_profile_${uid}`, JSON.stringify(userProf));
      }
    } catch {}

    // Load bank accounts for this user
    try {
      const savedBanks = localStorage.getItem(`9tepay_banks_${uid}`);
      if (savedBanks) {
        setBankAccounts(JSON.parse(savedBanks));
      } else {
        const userBank: BankAccountQR = {
          id: `bank_${uid}_01`,
          bankName: 'ICICI Bank',
          accountHolder: currentUser.businessName || currentUser.name,
          accountNumber: '919876543210',
          ifsc: 'ICIC0000102',
          vpa: currentUser.vpa || 'merchant@icici',
          qrTitle: `${currentUser.businessName || currentUser.name} Instant QR`,
          qrType: 'dynamic_intent',
          qrColor: '#10b981',
          isPrimary: true,
          isActive: true,
          dailyLimit: 500000,
          dailyVolume: 0,
          totalSettled: 0,
          routingWeight: 5,
          createdAt: currentUser.createdAt || new Date().toISOString(),
        };
        setBankAccounts([userBank]);
        localStorage.setItem(`9tepay_banks_${uid}`, JSON.stringify([userBank]));
      }
    } catch {}

    // Load orders for this user
    try {
      const savedOrders = localStorage.getItem(`9tepay_orders_${uid}`);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch {}
  }, [currentUser?.id]);

  // Sync state to LocalStorage (both per-user and global)
  useEffect(() => {
    if (currentUser) {
      try { localStorage.setItem('9tepay_user', JSON.stringify(currentUser)); } catch {}
    }
  }, [currentUser]);

  useEffect(() => {
    if (orders.length > 0) {
      try {
        localStorage.setItem('9tepay_orders', JSON.stringify(orders));
        if (currentUser?.id) {
          localStorage.setItem(`9tepay_orders_${currentUser.id}`, JSON.stringify(orders));
        }
      } catch {}
    }
  }, [orders, currentUser?.id]);

  useEffect(() => {
    if (bankAccounts.length > 0) {
      try {
        localStorage.setItem('9tepay_bank_accounts', JSON.stringify(bankAccounts));
        if (currentUser?.id) {
          localStorage.setItem(`9tepay_banks_${currentUser.id}`, JSON.stringify(bankAccounts));
        }
      } catch {}
    }
  }, [bankAccounts, currentUser?.id]);

  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem('9tepay_profile', JSON.stringify(profile));
        if (currentUser?.id) {
          localStorage.setItem(`9tepay_profile_${currentUser.id}`, JSON.stringify(profile));
        }
      } catch {}
    }
  }, [profile, currentUser?.id]);

  useEffect(() => {
    try { localStorage.setItem('9tepay_sec_events', JSON.stringify(securityEvents)); } catch {}
  }, [securityEvents]);

  useEffect(() => {
    try { localStorage.setItem('9tepay_webhook_logs', JSON.stringify(webhookLogs)); } catch {}
  }, [webhookLogs]);

  // Fetch initial backend state & smartly merge with local state
  const refreshAll = async () => {
    try {
      const [ordersRes, profileRes, webhookRes, authRes, banksRes, secRes] = await Promise.all([
        safeFetch<Order[]>('/api/orders'),
        safeFetch<MerchantProfile>('/api/merchant/profile'),
        safeFetch<WebhookLog[]>('/api/webhooks/logs'),
        safeFetch<{ success: boolean; user: User }>('/api/auth/me'),
        safeFetch<BankAccountQR[]>('/api/merchant/bank-accounts'),
        safeFetch<SecurityEvent[]>('/api/security/events'),
      ]);

      if (ordersRes.ok && Array.isArray(ordersRes.data)) {
        // The authenticated API is authoritative; never carry orders across accounts.
        const paidOrders = ordersRes.data.filter((order) => order.status === 'PAID');
        if (!hasLoadedPaidOrdersRef.current) {
          paidOrders.forEach((order) => paidOrderIdsRef.current.add(order.id || order.orderNumber));
          hasLoadedPaidOrdersRef.current = true;
        } else {
          const newlyPaid = paidOrders.filter((order) => {
            const id = order.id || order.orderNumber;
            return id && !paidOrderIdsRef.current.has(id);
          });
          newlyPaid.forEach((order) => announcePayment(order));
          paidOrders.forEach((order) => paidOrderIdsRef.current.add(order.id || order.orderNumber));
        }
        setOrders(ordersRes.data);
        try { localStorage.setItem('9tepay_orders', JSON.stringify(ordersRes.data)); } catch {}
      }

      if (banksRes.ok && Array.isArray(banksRes.data)) {
        // Bank accounts are also user-scoped and must be replaced, not merged.
        setBankAccounts(banksRes.data);
        try { localStorage.setItem('9tepay_bank_accounts', JSON.stringify(banksRes.data)); } catch {}
      }

      if (profileRes.ok && profileRes.data) {
        setProfile(profileRes.data);
      }

      if (webhookRes.ok && Array.isArray(webhookRes.data) && webhookRes.data.length > 0) {
        setWebhookLogs(webhookRes.data);
      }

      if (secRes.ok && Array.isArray(secRes.data) && secRes.data.length > 0) {
        setSecurityEvents(secRes.data);
      }

      if (authRes.ok && authRes.data?.user) {
        setCurrentUser(authRes.data.user);
      } else {
        // Never keep a cached session when the server rejects its token.
        setCurrentUser(null);
        try {
          localStorage.removeItem('9tepay_user');
          localStorage.removeItem('9tepay_session_token');
          sessionStorage.removeItem('9tepay_session_token');
        } catch {
          // Ignore storage cleanup failures.
        }
      }
    } catch (err) {
      console.error('Failed to load initial gateway data', err);
    }
  };

  const loadCheckoutOrder = async (orderIdToLoad: string) => {
    setIsLoadingCheckout(true);
    setCheckoutError(null);

    // 1. Memory check
    const localMatch = orders.find(
      (o) => o.id === orderIdToLoad || o.orderNumber === orderIdToLoad
    );
    if (localMatch) {
      setSelectedOrder(localMatch);
      setIsLoadingCheckout(false);
      return;
    }

    // 2. LocalStorage check
    try {
      const savedOrders = localStorage.getItem('9tepay_orders');
      if (savedOrders) {
        const parsed: Order[] = JSON.parse(savedOrders);
        const found = parsed.find(
          (o) => o.id === orderIdToLoad || o.orderNumber === orderIdToLoad
        );
        if (found) {
          setSelectedOrder(found);
          setIsLoadingCheckout(false);
          return;
        }
      }
    } catch {}

    // 3. API server check
    try {
      const res = await safeFetch<Order>(`/api/orders/${orderIdToLoad}`);
      if (res.ok && res.data && res.data.id) {
        setSelectedOrder(res.data);
      } else {
        setCheckoutError(`Payment link "${orderIdToLoad}" not found or has expired.`);
      }
    } catch (err) {
      console.error('Failed to load checkout order from URL:', err);
      setCheckoutError('Unable to load payment link. Please check your network connection.');
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const pollInterval = setInterval(() => {
      refreshAll();
    }, 3000);

    const handleUtrSubmitted = (e: Event) => {
      const customEvent = e as CustomEvent<Order>;
      if (customEvent.detail) {
        const updated = customEvent.detail;
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updated.id || o.orderNumber === updated.orderNumber);
          if (exists) {
            return prev.map((o) =>
              o.id === updated.id || o.orderNumber === updated.orderNumber
                ? { ...o, ...updated, utrNumber: updated.utrNumber || o.utrNumber }
                : o
            );
          }
          return [updated, ...prev];
        });
      }
      refreshAll();
    };

    const handleStorageChange = () => {
      try {
        const notificationPayload = localStorage.getItem('9tepay_payment_notification');
        if (notificationPayload) {
          const notification = JSON.parse(notificationPayload) as PaymentNotification;
          if (notification?.id && notification.id !== lastNotificationKeyRef.current) {
            lastNotificationKeyRef.current = notification.id;
            setPaymentNotification(notification);
            window.setTimeout(() => {
              setPaymentNotification((current) => (current?.id === notification.id ? null : current));
            }, 7000);
          }
        }
        const storedStr = localStorage.getItem('9tepay_orders');
        if (storedStr) {
          const stored: Order[] = JSON.parse(storedStr);
          setOrders((prev) => {
            const map = new Map<string, Order>();
            prev.forEach((o) => map.set(o.id, o));
            stored.forEach((o) => {
              const existingKey = Array.from(map.keys()).find(
                (k) => k === o.id || map.get(k)?.orderNumber === o.orderNumber
              );
              const existing = existingKey ? map.get(existingKey) : undefined;
              if (existing) {
                if (existingKey && existingKey !== o.id) map.delete(existingKey);
                map.set(o.id, { ...existing, ...o, utrNumber: o.utrNumber || existing.utrNumber });
              } else {
                map.set(o.id, o);
              }
            });
            return Array.from(map.values());
          });
        }
      } catch {}
    };

    window.addEventListener('utr_submitted', handleUtrSubmitted);
    window.addEventListener('storage', handleStorageChange);
    const handlePaymentApproved = (event: Event) => {
      const detail = (event as CustomEvent<{ order?: Order }>).detail;
      if (detail?.order) announcePayment(detail.order);
    };
    window.addEventListener('order_approved', handlePaymentApproved);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('utr_submitted', handleUtrSubmitted);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('order_approved', handlePaymentApproved);
    };
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      try {
        localStorage.setItem('9tepay_orders', JSON.stringify(orders));
      } catch {}
    }
  }, [orders]);

  useEffect(() => {
    const urlOrderId = getOrderIdFromUrl();
    if (urlOrderId) {
      setActiveView('checkout');
      loadCheckoutOrder(urlOrderId);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const urlOrderId = getOrderIdFromUrl();
      if (urlOrderId) {
        setActiveView('checkout');
        loadCheckoutOrder(urlOrderId);
      } else {
        const saved = localStorage.getItem('9tepay_user');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            setActiveView(u.role === 'admin' ? 'admin' : 'dashboard');
          } catch {
            setActiveView('auth');
          }
        } else {
          setActiveView('auth');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [orders]);

  const handleOpenCheckout = (order: Order, openInNewTab = false) => {
    if (openInNewTab) {
      window.open(`${window.location.origin}/checkout/${order.id}`, '_blank');
      return;
    }
    setSelectedOrder(order);
    setActiveView('checkout');
    setCheckoutError(null);
    if (window.history && window.history.pushState) {
      window.history.pushState({ orderId: order.id }, '', `/checkout/${order.id}`);
    }
  };

  const handleViewChange = (
    newView: 'dashboard' | 'payment_links' | 'checkout' | 'admin' | 'auth' | 'docs' | 'profile' | 'settings' | 'about' | 'contact' | 'invoice'
  ) => {
    setActiveView(newView as any);
    if (newView !== 'checkout' && window.history && window.history.pushState) {
      if (window.location.pathname.startsWith('/checkout/')) {
        window.history.pushState(null, '', '/#' + newView);
      } else {
        window.history.pushState({ view: newView }, '', '/#' + newView);
      }
    }
  };

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      let view = e.state?.view;
      if (!view) {
        const hash = window.location.hash.replace('#', '');
        view = hash || (currentUser ? 'dashboard' : 'about');
      }
      
      // Prevent going back to the login page if already logged in
      if (currentUser && ['auth', 'about', 'login'].includes(view)) {
        window.history.replaceState({ view: currentUser.role === 'admin' ? 'admin' : 'dashboard' }, '', '/#' + (currentUser.role === 'admin' ? 'admin' : 'dashboard'));
        setActiveView(currentUser.role === 'admin' ? 'admin' : 'dashboard');
      } else if (['dashboard', 'payment_links', 'checkout', 'invoice', 'admin', 'auth', 'docs', 'profile', 'settings', 'about', 'contact'].includes(view)) {
        setActiveView(view as any);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const handleLogoClick = () => {
    setActiveView('about');
    setIsNavDropdownOpen(false);
    if (window.history && window.history.pushState && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  };

  const handlePaymentSuccess = async (updatedOrder: Order) => {
    announcePayment(updatedOrder);
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    setSelectedOrder(updatedOrder);
    
    const [whRes, banksRes] = await Promise.all([
      safeFetch<WebhookLog[]>('/api/webhooks/logs'),
      safeFetch<BankAccountQR[]>('/api/merchant/bank-accounts'),
    ]);
    if (whRes.ok && Array.isArray(whRes.data)) {
      setWebhookLogs(whRes.data);
    }
    if (banksRes.ok && Array.isArray(banksRes.data)) {
      setBankAccounts(banksRes.data);
    }
  };

  const handleCreateOrder = async (orderPayload: any): Promise<Order> => {
    const data = await api.post<{ success: boolean; order: Order; error?: string }>('/api/orders', orderPayload);
    if (!data.success || !data.order) {
      throw new Error(data.error || 'The payment server did not create the order.');
    }
    setOrders((prev) => [data.order, ...prev]);
    return data.order;
  };

  const handleCancelOrder = async (orderIdToCancel: string) => {
    try {
      await api.post(`/api/orders/${orderIdToCancel}/cancel`, {});
      setOrders((prev) =>
        prev.map((o) => (o.id === orderIdToCancel ? { ...o, status: 'EXPIRED' as const } : o))
      );
    } catch (err) {
      console.error('Failed to cancel order', err);
    }
  };

  const handleApproveOrder = async (orderIdToApprove: string) => {
    try {
      const data = await api.post<{ success: boolean; order?: Order; error?: string }>(
        `/api/orders/${orderIdToApprove}/approve`,
        {}
      );
      if (!data.success || !data.order) {
        throw new Error(data.error || 'The server did not approve this transaction.');
      }
      const approvedOrder = data.order;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderIdToApprove || o.orderNumber === orderIdToApprove
            ? { ...o, ...approvedOrder, status: 'PAID', paidAt: new Date().toISOString(), reviewRequired: false }
            : o
        )
      );

      setSelectedOrder((prev) =>
        prev && (prev.id === orderIdToApprove || prev.orderNumber === orderIdToApprove)
          ? { ...prev, ...approvedOrder, status: 'PAID', paidAt: new Date().toISOString(), reviewRequired: false }
          : prev
      );

      // Local storage sync for cross-tab / checkout preview synchronization
      try {
        const storedStr = localStorage.getItem('9tepay_orders');
        const storedOrders: Order[] = storedStr ? JSON.parse(storedStr) : [];
        const idx = storedOrders.findIndex(
          (o) => o.id === orderIdToApprove || o.orderNumber === orderIdToApprove
        );
        if (idx >= 0) {
          storedOrders[idx] = {
            ...storedOrders[idx],
            ...approvedOrder,
            status: 'PAID',
            paidAt: new Date().toISOString(),
            reviewRequired: false,
          };
        } else {
          storedOrders.unshift(approvedOrder);
        }
        localStorage.setItem('9tepay_orders', JSON.stringify(storedOrders));
      } catch {}

      // Broadcast live event
      window.dispatchEvent(
        new CustomEvent('order_approved', {
          detail: { orderId: orderIdToApprove, order: data.order || approvedOrder },
        })
      );
      window.dispatchEvent(new Event('storage'));

      refreshAll();
    } catch (err) {
      console.error('Failed to approve order', err);
      throw err;
    }
  };

  const handleRejectOrder = async (orderIdToReject: string) => {
    try {
      const data = await api.post<{ success: boolean; order?: Order; error?: string }>(
        `/api/orders/${orderIdToReject}/reject`,
        {}
      );
      if (data.success && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderIdToReject || o.orderNumber === orderIdToReject ? data.order! : o))
        );
        setSelectedOrder((prev) =>
          prev && (prev.id === orderIdToReject || prev.orderNumber === orderIdToReject)
            ? data.order!
            : prev
        );
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderIdToReject || o.orderNumber === orderIdToReject
              ? { ...o, status: 'FAILED' as const, reviewRequired: false }
              : o
          )
        );
        setSelectedOrder((prev) =>
          prev && (prev.id === orderIdToReject || prev.orderNumber === orderIdToReject)
            ? { ...prev, status: 'FAILED' as const, reviewRequired: false }
            : prev
        );
      }
      refreshAll();
    } catch (err) {
      console.warn('Reject order fallback to local update', err);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderIdToReject || o.orderNumber === orderIdToReject
            ? { ...o, status: 'FAILED' as const, reviewRequired: false }
            : o
        )
      );
      setSelectedOrder((prev) =>
        prev && (prev.id === orderIdToReject || prev.orderNumber === orderIdToReject)
          ? { ...prev, status: 'FAILED' as const, reviewRequired: false }
          : prev
      );
    }
  };

  const handleUpdateProfile = async (updated: Partial<MerchantProfile>) => {
    try {
      const data = await api.put<{ success: boolean; profile: MerchantProfile; error?: string }>(
        '/api/merchant/profile',
        updated
      );
      if (data.success && data.profile) {
        setProfile(data.profile);
        try {
          localStorage.setItem('9tepay_profile', JSON.stringify(data.profile));
        } catch {
          // ignore
        }
      } else {
        setProfile((prev) => {
          const merged = { ...prev, ...updated };
          try {
            localStorage.setItem('9tepay_profile', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch {
      setProfile((prev) => {
        const merged = { ...prev, ...updated };
        try {
          localStorage.setItem('9tepay_profile', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  };

  // Multi-Bank Handlers
  const handleAddBank = async (bankData: Partial<BankAccountQR>) => {
    try {
      const data = await api.post<{ success: boolean; bankAccount: BankAccountQR; error?: string }>(
        '/api/merchant/bank-accounts',
        bankData
      );
      if (data.success && data.bankAccount) {
        setBankAccounts((prev) => [...prev, data.bankAccount]);
        return;
      }
    } catch (err) {
      console.warn('API bank add fallback to local storage', err);
    }

    // Client-side fallback if server is unreachable
    const fallbackBank: BankAccountQR = {
      id: `bank_${Math.random().toString(36).substring(2, 9)}`,
      bankName: bankData.bankName || 'HDFC Bank',
      accountHolder: bankData.accountHolder || profile.businessName,
      accountNumber: bankData.accountNumber || '',
      ifsc: (bankData.ifsc || 'HDFC0000060').toUpperCase(),
      vpa: (bankData.vpa || profile.vpa).toLowerCase().trim(),
      qrTitle: bankData.qrTitle || `${bankData.bankName || 'Bank'} Instant QR`,
      qrType: bankData.qrType || 'dynamic_intent',
      qrColor: bankData.qrColor || '#10b981',
      customQrImage: bankData.customQrImage,
      isPrimary: bankAccounts.length === 0,
      isActive: true,
      dailyLimit: Number(bankData.dailyLimit) || 500000,
      dailyVolume: 0,
      totalSettled: 0,
      routingWeight: Number(bankData.routingWeight) || 5,
      createdAt: new Date().toISOString(),
    };
    setBankAccounts((prev) => [...prev, fallbackBank]);
  };

  const handleUpdateBank = async (id: string, bankData: Partial<BankAccountQR>) => {
    try {
      const data = await api.put<{ success: boolean; bankAccount: BankAccountQR; error?: string }>(
        `/api/merchant/bank-accounts/${id}`,
        bankData
      );
      if (data.success && data.bankAccount) {
        setBankAccounts((prev) => prev.map((b) => (b.id === id ? data.bankAccount : b)));
        return;
      }
    } catch (err) {
      console.warn('API update bank fallback to local state', err);
    }
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...bankData } : b))
    );
  };

  const handleDeleteBank = async (id: string) => {
    try {
      await api.delete<{ success: boolean; message?: string; error?: string }>(
        `/api/merchant/bank-accounts/${id}`
      );
    } catch (err) {
      console.warn('API delete bank fallback to local state', err);
    }
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSetPrimaryBank = async (id: string) => {
    try {
      const data = await api.post<{ success: boolean; bankAccounts?: BankAccountQR[]; bankAccount?: BankAccountQR; error?: string }>(
        `/api/merchant/bank-accounts/${id}/set-primary`
      );
      if (data.success) {
        if (data.bankAccounts) {
          setBankAccounts(data.bankAccounts);
        } else {
          setBankAccounts((prev) =>
            prev.map((b) => ({ ...b, isPrimary: b.id === id }))
          );
        }
        const primaryBank = data.bankAccounts?.find((b) => b.id === id) || data.bankAccount;
        if (primaryBank) {
          setProfile((prev) => ({ ...prev, vpa: primaryBank.vpa }));
        }
        return;
      }
    } catch (err) {
      console.warn('API set primary fallback to local state', err);
    }

    setBankAccounts((prev) =>
      prev.map((b) => ({ ...b, isPrimary: b.id === id }))
    );
    const selected = bankAccounts.find((b) => b.id === id);
    if (selected) {
      setProfile((prev) => ({ ...prev, vpa: selected.vpa }));
    }
  };

  const handleToggleActiveBank = async (id: string) => {
    const bank = bankAccounts.find((b) => b.id === id);
    if (!bank) return;
    await handleUpdateBank(id, { isActive: !bank.isActive });
  };

  const handleUpdateRoutingStrategy = async (
    strategy: BankRoutingStrategy,
    requireStrictUtr: boolean,
    preventDuplicateUtr: boolean
  ) => {
    const data = await api.put<{ success: boolean; profile?: MerchantProfile; settings?: any; error?: string }>(
      '/api/merchant/routing-rules',
      {
        strategy,
        requireStrictUtrFormat: requireStrictUtr,
        preventDuplicateUtr,
      }
    );
    if (data.success) {
      setProfile((prev) => ({
        ...prev,
        routingStrategy: strategy,
        requireStrictUtrFormat: requireStrictUtr,
        preventDuplicateUtr,
      }));
    } else if (data.error) {
      throw new Error(data.error);
    }
  };

  const handleTriggerSecurityProbe = async (type: string, orderNumber: string, utr: string) => {
    const data = await api.post<{ success: boolean; event: SecurityEvent; error?: string }>(
      '/api/security/probe',
      { type, orderNumber, utr }
    );
    if (data.event) {
      setSecurityEvents((prev) => [data.event, ...prev]);
    }
  };

  const handleRegenerateKeys = async () => {
    const data = await api.post<{ success: boolean; apiKey: string; apiSecret: string; error?: string }>(
      '/api/merchant/keys/regenerate'
    );
    if (data.success) {
      setProfile((prev) => ({
        ...prev,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
      }));
    }
  };

  const handleTriggerTestWebhook = async () => {
    const data = await api.post<{ success: boolean; log: WebhookLog; error?: string }>(
      '/api/webhooks/test-dispatch',
      { webhookUrl: profile.webhookUrl }
    );
    if (data.success && data.log) {
      setWebhookLogs((prev) => [data.log, ...prev]);
    }
  };

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('9tepay_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);

    if (user.role === 'merchant') {
      setProfile((prev) => ({
        ...prev,
        businessName: user.businessName || prev.businessName,
        vpa: user.vpa || prev.vpa,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));

      if (user.vpa) {
        const userVpa = user.vpa;
        setBankAccounts((prev) => {
          const exists = prev.some((b) => b.vpa.toLowerCase() === userVpa.toLowerCase());
          if (exists) return prev;
          const newAccount: BankAccountQR = {
            id: `bank_${Math.random().toString(36).substring(2, 7)}`,
            bankName: 'Direct Settlement Bank',
            accountHolder: user.businessName || 'Merchant Account',
            accountNumber: '919000000000',
            ifsc: 'ICIC0000102',
            vpa: userVpa,
            qrTitle: `${user.businessName} Instant Settlement QR`,
            qrType: 'dynamic_intent',
            qrColor: '#10b981',
            isPrimary: true,
            isActive: true,
            dailyLimit: 500000,
            dailyVolume: 0,
            totalSettled: 0,
            routingWeight: 5,
            createdAt: new Date().toISOString(),
          };
          return [newAccount, ...prev.map((b) => ({ ...b, isPrimary: false }))];
        });
      }
    }

    try {
      localStorage.setItem('9tepay_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    if (user.role === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
    refreshAll();
  };

  const handleLogout = async () => {
    
    try {
      localStorage.removeItem('9tepay_user');
      localStorage.removeItem('9tepay_session_token');
      sessionStorage.removeItem('9tepay_session_token');
      await safeFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setActiveView('about');
  };

  // Safe view resolution based on authentication state
  const isPublicCheckout = activeView === 'checkout' || activeView === 'invoice';
  const publicViews = new Set(['about', 'contact', 'auth']);
  const effectiveView = !currentUser && !isPublicCheckout && !publicViews.has(activeView) ? 'about' : activeView;

  return (
    <div className={`${isDarkMode ? 'dark-mode' : ''} razorpay-shell min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white`}>
      {paymentNotification && (
        <div className="payment-notification" role="status" aria-live="polite">
          <div className="payment-notification__icon">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="payment-notification__title">Payment received</p>
            <p className="payment-notification__details">
              ₹{paymentNotification.amount.toLocaleString('en-IN')} · {paymentNotification.orderNumber}
            </p>
            {paymentNotification.customerName && (
              <p className="payment-notification__customer">{paymentNotification.customerName}</p>
            )}
          </div>
          <button
            type="button"
            className="payment-notification__close"
            aria-label="Dismiss payment notification"
            onClick={() => setPaymentNotification(null)}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Header Navbar - Hidden in Standalone Checkout Mode */}
      {effectiveView !== 'checkout' && effectiveView !== 'invoice' && (
        <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogoClick}
              className="rounded-lg cursor-pointer transition-opacity hover:opacity-80"
              aria-label="Go to 9tepay home page"
            >
              <Logo size="md" showSubtitle={true} />
            </button>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden lg:inline-block ml-1">
              NPCI Deeplink Intent
            </span>
          </div>

          {/* Navigation Bar Dropdown & User Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDarkMode((previous) => !previous)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Header Menu Dropdown */}
                <div className="relative" ref={navDropdownRef}>
                  <button
                    onClick={() => setIsNavDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 border border-slate-200/90 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    aria-expanded={isNavDropdownOpen}
                    aria-label="Toggle navigation dropdown menu"
                  >
                    <Menu className="w-4 h-4 text-slate-600" />
                    <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                      {effectiveView === 'dashboard' && <><LayoutDashboard className="w-3.5 h-3.5 text-blue-600" /> Merchant</>}
                      {effectiveView === 'payment_links' && <><Link2 className="w-3.5 h-3.5 text-blue-600" /> Payment Links</>}
                      {effectiveView === 'docs' && <><Code2 className="w-3.5 h-3.5 text-blue-600" /> API Docs</>}
                      {effectiveView === 'about' && <><Info className="w-3.5 h-3.5 text-blue-600" /> About Us</>}
                      {effectiveView === 'contact' && <><Mail className="w-3.5 h-3.5 text-blue-600" /> Contact Us</>}
                      {effectiveView === 'profile' && <><UserIcon className="w-3.5 h-3.5 text-blue-600" /> Profile</>}
                      {effectiveView === 'settings' && <><Settings className="w-3.5 h-3.5 text-blue-600" /> Settings</>}
                      {effectiveView === 'admin' && <><Shield className="w-3.5 h-3.5 text-indigo-600" /> Admin Panel</>}
                      {effectiveView === 'auth' && <>Menu</>}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isNavDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {isNavDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                          Navigation Menu
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full capitalize">
                          {typeof currentUser?.role === "string" ? currentUser.role : "User"}
                        </span>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        {/* Superadmin Option (If Admin) */}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => {
                              handleViewChange('admin');
                              setIsNavDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                              effectiveView === 'admin'
                                ? 'bg-indigo-50 text-indigo-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${effectiveView === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                <Shield className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Admin Panel</div>
                                <div className="text-[10px] text-slate-500">System overview &amp; logs</div>
                              </div>
                            </div>
                            {effectiveView === 'admin' && <Check className="w-4 h-4 text-indigo-600" />}
                          </button>
                        )}

                        {/* Merchant Dashboard */}
                        <button
                          onClick={() => {
                            handleViewChange('dashboard');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'dashboard'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <LayoutDashboard className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Merchant Dashboard</div>
                              <div className="text-[10px] text-slate-500">Transactions &amp; UTR approvals</div>
                            </div>
                          </div>
                          {effectiveView === 'dashboard' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Payment Links */}
                        <button
                          onClick={() => {
                            handleViewChange('payment_links');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'payment_links'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'payment_links' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <Link2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Payment Links</div>
                              <div className="text-[10px] text-slate-500">Instant UPI URLs &amp; QRs</div>
                            </div>
                          </div>
                          {effectiveView === 'payment_links' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Developer API */}
                        <button
                          onClick={() => {
                            handleViewChange('docs');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'docs'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'docs' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <Code2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Developer API</div>
                              <div className="text-[10px] text-slate-500">API Docs, keys &amp; webhooks</div>
                            </div>
                          </div>
                          {effectiveView === 'docs' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* About Us */}
                        <button
                          onClick={() => {
                            handleViewChange('about');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'about'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'about' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <Info className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">About Us</div>
                              <div className="text-[10px] text-slate-500">0% Fee USPs &amp; Architecture</div>
                            </div>
                          </div>
                          {effectiveView === 'about' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Contact Us */}
                        <button
                          onClick={() => {
                            handleViewChange('contact');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'contact'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'contact' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Contact Us</div>
                              <div className="text-[10px] text-slate-500">Corporate office &amp; support</div>
                            </div>
                          </div>
                          {effectiveView === 'contact' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Profile Section */}
                        <button
                          onClick={() => {
                            handleViewChange('profile');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'profile'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'profile' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <UserIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Merchant Profile</div>
                              <div className="text-[10px] text-slate-500">Business info &amp; primary VPA</div>
                            </div>
                          </div>
                          {effectiveView === 'profile' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Settings Section */}
                        <button
                          onClick={() => {
                            handleViewChange('settings');
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                            effectiveView === 'settings'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${effectiveView === 'settings' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                              <Settings className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Settings</div>
                              <div className="text-[10px] text-slate-500">Routing rules &amp; auto-approve</div>
                            </div>
                          </div>
                          {effectiveView === 'settings' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      </div>

                      {/* Account Footer with Sign Out */}
                      <div className="p-2 bg-slate-50 border-t border-slate-100 space-y-1">
                        <div className="px-2.5 py-1.5 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                            {typeof currentUser.name === "string" ? currentUser.name : "User"}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {currentUser.email}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setIsNavDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200/60 transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Profile Badge */}
                <button
                  onClick={() => handleViewChange('profile')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs cursor-pointer transition-all"
                  title="View Profile Details"
                >
                  <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'} animate-pulse`}></span>
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]">{typeof currentUser.name === "string" ? currentUser.name : "User"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  aria-label="Log out of 9tepay"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-1 text-xs font-semibold">
                <button
                  onClick={() => handleViewChange('about')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeView === 'about'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  About Us
                </button>
                <button
                  onClick={() => handleViewChange('contact')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeView === 'contact'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Contact Us
                </button>
                <button
                  onClick={() => handleViewChange('auth')}
                  className="px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ml-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <main className={effectiveView === 'checkout' ? "w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center" : "max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1"}>
        {!currentUser ? (
          /* When signed out: Render requested public page or AuthPortal */
          activeView === 'about' ? (
            <AboutPage
              onNavigateToContact={() => handleViewChange('contact')}
              onNavigateToDocs={() => handleViewChange('docs')}
              onNavigateToAuth={() => handleViewChange('auth')}
            />
          ) : activeView === 'contact' ? (
            <ContactPage
              onBackToDashboard={() => handleViewChange('auth')}
            />
          ) : activeView === 'invoice' ? (
            <PublicInvoice />
          ) : activeView === 'checkout' ? (
            isLoadingCheckout ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-300 font-sans">Loading Secure Payment Checkout...</p>
              </div>
            ) : selectedOrder ? (
              <HostedCheckout
                order={selectedOrder}
                bankAccounts={bankAccounts}
                currentUser={currentUser}
                onPaymentSuccess={handlePaymentSuccess}
                onBackToDashboard={() => handleViewChange('auth')}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Payment Link Unavailable</h3>
                <p className="text-xs text-slate-500 font-sans">{checkoutError || 'This payment link does not exist or has expired.'}</p>
                <button
                  onClick={() => handleViewChange('auth')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-colors shadow-xs"
                >
                  Go to Merchant Login
                </button>
              </div>
            )
          ) : (
            <AuthPortal
              currentUser={null}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
            />
          )
        ) : (
          /* When logged in: Render selected authenticated view */
          <>
            {/* VIEW: Public Invoice inside authenticated (in case they view their own) */}
            {effectiveView === 'invoice' && (
              <PublicInvoice />
            )}

            {/* VIEW 1: Superadmin Control Panel (Accessible ONLY when role === 'admin') */}
            {effectiveView === 'admin' && currentUser.role === 'admin' && (
              <AdminDashboard
                orders={orders}
                onRefreshOrders={refreshAll}
              />
            )}

            {/* VIEW 2: Merchant Dashboard */}
            {effectiveView === 'dashboard' && (
              <MerchantDashboard
                orders={orders}
                profile={profile}
                webhookLogs={webhookLogs}
                bankAccounts={bankAccounts}
                onApproveOrder={handleApproveOrder}
                onRejectOrder={handleRejectOrder}
                onAddBank={handleAddBank}
                onUpdateBank={handleUpdateBank}
                onDeleteBank={handleDeleteBank}
                onSetPrimary={handleSetPrimaryBank}
                onToggleActive={handleToggleActiveBank}
                routingStrategy={profile.routingStrategy || 'smart_round_robin'}
                onUpdateRoutingStrategy={handleUpdateRoutingStrategy}
                securityEvents={securityEvents}
                onTriggerSecurityProbe={handleTriggerSecurityProbe}
                onOpenCheckout={handleOpenCheckout}
                onCreateOrder={handleCreateOrder}
                onUpdateProfile={handleUpdateProfile}
                onRegenerateKeys={handleRegenerateKeys}
                onTriggerTestWebhook={handleTriggerTestWebhook}
              />
            )}

            {/* VIEW 3: Payment Links Manager */}
            {effectiveView === 'payment_links' && (
              <PaymentLinksManager
                orders={orders}
                bankAccounts={bankAccounts}
                routingStrategy={profile.routingStrategy || 'smart_round_robin'}
                primaryVpa={profile.vpa}
                onCreateLink={handleCreateOrder}
                onOpenCheckout={handleOpenCheckout}
                onCancelOrder={handleCancelOrder}
              />
            )}

            {/* VIEW 4: Hosted Checkout */}
            {effectiveView === 'checkout' && (
              isLoadingCheckout ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-semibold text-slate-300 font-sans">Loading Secure Payment Checkout...</p>
                </div>
              ) : selectedOrder ? (
                <HostedCheckout
                  order={selectedOrder}
                  bankAccounts={bankAccounts}
                  currentUser={currentUser}
                  onPaymentSuccess={handlePaymentSuccess}
                  onUtrSubmitted={(updatedOrder) => {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === updatedOrder.id || o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o
                      )
                    );
                    setSelectedOrder(updatedOrder);
                  }}
                  onBackToDashboard={() => handleViewChange(currentUser.role === 'admin' ? 'admin' : 'dashboard')}
                />
              ) : (
                <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">Payment Link Unavailable</h3>
                  <p className="text-xs text-slate-500 font-sans">{checkoutError || 'This payment link does not exist or has expired.'}</p>
                  <button
                    onClick={() => handleViewChange(currentUser.role === 'admin' ? 'admin' : 'dashboard')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-colors shadow-xs"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )
            )}

            {/* VIEW 5: Login & Account Portal */}
            {effectiveView === 'auth' && (
              <AuthPortal
                currentUser={currentUser}
                onLoginSuccess={handleLoginSuccess}
                onLogout={handleLogout}
              />
            )}

            {/* VIEW 6: Developer API Docs */}
            {effectiveView === 'docs' && (
              <DeveloperApiDocs profile={profile} />
            )}

            {/* VIEW 7: About Page */}
            {effectiveView === 'about' && (
              <AboutPage
                onNavigateToContact={() => handleViewChange('contact')}
                onNavigateToDocs={() => handleViewChange('docs')}
                onNavigateToAuth={() => handleViewChange(currentUser ? 'dashboard' : 'auth')}
              />
            )}

            {/* VIEW 8: Contact Page */}
            {effectiveView === 'contact' && (
              <ContactPage
                onBackToDashboard={() => handleViewChange(currentUser ? 'dashboard' : 'auth')}
              />
            )}

            {/* VIEW 9: Profile Section */}
            {effectiveView === 'profile' && (
              <ProfileSection
                currentUser={currentUser}
                profile={profile}
                bankAccounts={bankAccounts}
                onGoToSettings={() => handleViewChange('settings')}
                onGoToBankAccounts={() => handleViewChange('dashboard')}
              />
            )}

            {/* VIEW 10: Settings Section */}
            {effectiveView === 'settings' && (
              <SettingsSection
                currentUser={currentUser}
                profile={profile}
                bankAccounts={bankAccounts}
                onUpdateUser={handleUpdateUser}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </>
        )}
      </main>

      {/* Product footer - Hidden in Standalone Checkout Mode */}
      {effectiveView !== 'checkout' && (
        <footer className="border-t border-slate-200 bg-white text-slate-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 lg:gap-12">
              <div className="space-y-4 max-w-sm">
                <Logo size="md" showSubtitle={false} />
                <p className="text-sm leading-6">
                  A practical UPI payment workspace for creating payment links, sharing QR codes,
                  tracking settlements, and reviewing payment references securely.
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Secure checkout</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">UPI ready</span>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Payments</h2>
                <div className="flex flex-col items-start gap-2 text-sm">
                  <button onClick={() => handleViewChange('about')} className="hover:text-blue-600 cursor-pointer transition-colors">Payment Links</button>
                  <button onClick={() => handleViewChange('about')} className="hover:text-blue-600 cursor-pointer transition-colors">QR Checkout</button>
                  <button onClick={() => handleViewChange('about')} className="hover:text-blue-600 cursor-pointer transition-colors">UPI Intents</button>
                  <button onClick={() => handleViewChange('about')} className="hover:text-blue-600 cursor-pointer transition-colors">Payment Review</button>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Developers</h2>
                <div className="flex flex-col items-start gap-2 text-sm">
                  <button onClick={() => handleViewChange(currentUser ? 'docs' : 'about')} className="hover:text-blue-600 cursor-pointer transition-colors">API Documentation</button>
                  <button onClick={() => handleViewChange(currentUser ? 'docs' : 'about')} className="hover:text-blue-600 cursor-pointer transition-colors">Webhooks</button>
                  <button onClick={() => handleViewChange('contact')} className="hover:text-blue-600 cursor-pointer transition-colors">Integration Support</button>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Company</h2>
                <div className="flex flex-col items-start gap-2 text-sm">
                  <button onClick={() => handleViewChange('about')} className="hover:text-blue-600 cursor-pointer transition-colors">About 9tepay</button>
                  <button onClick={() => handleViewChange('contact')} className="hover:text-blue-600 cursor-pointer transition-colors">Contact Us</button>
                  <button onClick={() => handleViewChange('auth')} className="hover:text-blue-600 cursor-pointer transition-colors">Merchant Login</button>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <p>© {new Date().getFullYear()} 9tepay. Built for clearer digital payments.</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold">
                <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Security-first review</span>
                <button onClick={() => handleViewChange('contact')} className="hover:text-blue-600 cursor-pointer transition-colors">Support</button>
                <span className="text-slate-400">India</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
