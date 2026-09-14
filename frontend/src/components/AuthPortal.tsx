import React, { useState } from 'react';
import {
  Lock,
  UserCheck,
  Building,
  Mail,
  KeyRound,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  Zap,
  CreditCard,
  Check,
  Globe,
} from 'lucide-react';
import { User } from '../types';
import { safeFetch, formatErrorMessage } from '../utils/api';
import { Logo } from './Logo';

interface AuthPortalProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin'>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorChallenge, setTwoFactorChallenge] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

  // Register fields
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVpa, setRegVpa] = useState('');
  const [regBankAccount, setRegBankAccount] = useState('');
  const [regIfsc, setRegIfsc] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Remember me and Admin credentials
  const [rememberMe, setRememberMe] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@9tepay.com');
  const [adminPasscode, setAdminPasscode] = useState('');

  // Helper to load/save user registry in localStorage
  const getRegisteredUsersMap = (): Record<string, User> => {
    try {
      const saved = localStorage.getItem('9tepay_registered_users');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const saveRegisteredUserToLocalMap = (user: User) => {
    try {
      const map = getRegisteredUsersMap();
      if (user.email) {
        map[user.email.toLowerCase().trim()] = user;
      }
      if (user.phone) {
        map[user.phone.trim()] = user;
      }
      localStorage.setItem('9tepay_registered_users', JSON.stringify(map));
    } catch {}
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await safeFetch<{ success: boolean; message?: string; error?: string; developmentResetToken?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email: emailOrPhone.trim() }) }
      );
      if (!res.ok || !res.data?.success) throw new Error(res.data?.error || res.error || 'Unable to send reset instructions.');
      const token = res.data.developmentResetToken || resetToken;
      if (res.data.developmentResetToken) setResetToken(res.data.developmentResetToken);
      setSuccessMsg(
        token
          ? `Development reset token generated. Enter a new password below.`
          : 'If an account exists for this email, reset instructions have been sent. Check your inbox and follow the secure link.'
      );
    } catch (error: any) {
      setErrorMsg(formatErrorMessage(error, 'Unable to send password reset instructions.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword.length < 8 || resetPassword !== resetPasswordConfirm) {
      setErrorMsg(resetPassword.length < 8 ? 'New password must be at least 8 characters long.' : 'Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await safeFetch<{ success: boolean; message?: string; error?: string }>(
        '/api/auth/reset-password',
        { method: 'POST', body: JSON.stringify({ token: resetToken, newPassword: resetPassword }) }
      );
      if (!res.ok || !res.data?.success) throw new Error(res.data?.error || res.error || 'Unable to reset password.');
      setResetToken('');
      setResetPassword('');
      setResetPasswordConfirm('');
      setShowForgotPassword(false);
      setSuccessMsg('Password reset successfully. Sign in with your new password.');
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      setErrorMsg(formatErrorMessage(error, 'Unable to reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent, customCredentials?: { email: string; passcode?: string; role?: 'merchant' | 'admin' }) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = customCredentials
        ? { emailOrPhone: customCredentials.email, password: customCredentials.passcode || '', role: customCredentials.role }
        : { emailOrPhone, password, role: authMode === 'admin' ? 'admin' : 'merchant' };

      const res = await safeFetch<{ success: boolean; user?: User; token?: string; error?: string; message?: string; email?: string; emailVerificationRequired?: boolean; developmentVerificationCode?: string; requiresTwoFactor?: boolean; challengeToken?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (res.ok && res.data?.success && res.data.user) {
        if (res.data.token) {
          if (rememberMe || payload.role === 'admin') { localStorage.setItem('9tepay_session_token', res.data.token); sessionStorage.removeItem('9tepay_session_token'); } else { sessionStorage.setItem('9tepay_session_token', res.data.token); localStorage.removeItem('9tepay_session_token'); }
        }
        saveRegisteredUserToLocalMap(res.data.user);
        setSuccessMsg(`Welcome back, ${res.data.user.name}!`);
        onLoginSuccess(res.data.user);
        return;
      }

      if (res.data?.emailVerificationRequired) {
        setVerificationEmail(res.data.email || emailOrPhone);
        setSuccessMsg(
          res.data.developmentVerificationCode
            ? `Development verification code: ${res.data.developmentVerificationCode}`
            : res.data.message || 'Check your email for a verification code.'
        );
        return;
      }
      if (res.data?.requiresTwoFactor && res.data.challengeToken) {
        setTwoFactorChallenge(res.data.challengeToken);
        setSuccessMsg('Enter the 6-digit code from your authenticator app.');
        return;
      }

      const rawErr = res.data?.error || res.error;
      const errorText = formatErrorMessage(rawErr, "Invalid email/phone or passcode. Please verify your credentials.");
      setErrorMsg(errorText);
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Unable to reach the 9tepay server. Start the app server and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regBusinessName || !regEmail || !regVpa || !regPassword) {
      setErrorMsg('Please fill in business name, email, password, and UPI VPA.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Please review and agree to the Terms and Conditions before registering.');
      return;
    }

    if (!regVpa.includes('@')) {
      setErrorMsg('Invalid UPI VPA format. Must be like name@bank (e.g. store@icici)');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await safeFetch<{ success: boolean; user?: User; token?: string; error?: string; message?: string; email?: string; emailVerificationRequired?: boolean; developmentVerificationCode?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            businessName: regBusinessName,
            ownerName: regOwnerName || regBusinessName,
            email: regEmail,
            phone: regPhone,
            vpa: regVpa,
            password: regPassword,
            bankAccount: regBankAccount,
            ifsc: regIfsc,
            termsAccepted,
          }),
        }
      );

      if (res.ok && res.data?.success && res.data.user) {
        if (res.data.token) {
          if (rememberMe) { localStorage.setItem('9tepay_session_token', res.data.token); sessionStorage.removeItem('9tepay_session_token'); } else { sessionStorage.setItem('9tepay_session_token', res.data.token); localStorage.removeItem('9tepay_session_token'); }
        }
        saveRegisteredUserToLocalMap(res.data.user);
        setSuccessMsg('Account registered successfully! Direct UPI settlement activated.');
        onLoginSuccess(res.data.user);
        return;
      }

      if (res.data?.emailVerificationRequired) {
        setVerificationEmail(res.data.email || regEmail);
        setSuccessMsg(
          res.data.developmentVerificationCode
            ? `Development verification code: ${res.data.developmentVerificationCode}`
            : res.data.message || 'Check your email for a verification code.'
        );
        return;
      }

      const rawRegErr = res.data?.error || res.error;
      const regErrorText = formatErrorMessage(rawRegErr, "Registration failed. Please verify the submitted details.");
      setErrorMsg(regErrorText);
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Registration error. Please check your connection and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await safeFetch<{ success: boolean; user: User; token?: string; error?: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail, code: verificationCode }),
      });
      if (res.ok && res.data?.success && res.data.user && res.data.token) {
        sessionStorage.setItem('9tepay_session_token', res.data.token); localStorage.removeItem('9tepay_session_token');(res.data.user);
        onLoginSuccess(res.data.user);
      } else {
        setErrorMsg(formatErrorMessage(res.data?.error || res.error, 'Verification failed.'));
      }
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Verification failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await safeFetch<{ success: boolean; user: User; token?: string; error?: string }>('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeToken: twoFactorChallenge, code: twoFactorCode }),
      });
      if (res.ok && res.data?.success && res.data.user && res.data.token) {
        sessionStorage.setItem('9tepay_session_token', res.data.token); localStorage.removeItem('9tepay_session_token');(res.data.user);
        onLoginSuccess(res.data.user);
      } else {
        setErrorMsg(formatErrorMessage(res.data?.error || res.error, 'Two-factor verification failed.'));
      }
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Two-factor verification failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Banner */}
      <div className={`${authMode === 'admin' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'} border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden`}>
        {authMode === 'admin' && <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl" />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative">
            <div className="mb-2">
              <Logo size="lg" showSubtitle={false} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-sans ${authMode === 'admin' ? 'bg-blue-500/15 text-blue-200 border-blue-400/30' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {authMode === 'admin' ? 'Privileged Operations Access' : 'Enterprise Merchant Portal'}
              </span>
              <span className={`text-xs font-sans ${authMode === 'admin' ? 'text-slate-400' : 'text-slate-500'}`}>
                {authMode === 'admin' ? 'Protected command center' : 'Direct Settlement &amp; API Controls'}
              </span>
            </div>
            <h2 className={`text-lg font-bold mt-2 flex items-center gap-2 ${authMode === 'admin' ? 'text-white' : 'text-slate-900'}`}>
              {authMode === 'admin' ? <Shield className="w-5 h-5 text-blue-300" /> : <Lock className="w-5 h-5 text-blue-600" />}
              <span>{authMode === 'admin' ? 'Enter the 9tepay Command Center' : 'Merchant &amp; Admin Sign In'}</span>
            </h2>
            <p className={`text-xs mt-1 max-w-2xl ${authMode === 'admin' ? 'text-slate-400' : 'text-slate-500'}`}>
              {authMode === 'admin' ? 'A single control room for merchant governance, payment approvals, reconciliation, and platform health.' : 'Manage payments, settlements, and API integrations from one place.'}
            </p>
          </div>

          {currentUser && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-right shrink-0">
              <div className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Role: <span className="text-blue-700 uppercase font-bold">{currentUser.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="mt-2.5 px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
              >
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Authentication Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Form Card */}
        <div className={`${authMode === 'admin' ? 'border-blue-200 shadow-blue-100/40' : 'border-slate-200'} md:col-span-7 bg-white border rounded-2xl p-5 sm:p-7 shadow-sm`}>
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-2 border-b border-slate-100 pb-4 mb-6">
            <button
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Merchant Sign In</span>
            </button>

            <button
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Register</span>
            </button>

            <button
              onClick={() => { setAuthMode('admin'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              title="Administrator Login"
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {verificationEmail && (
            <form onSubmit={handleEmailVerification} className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="font-semibold text-blue-900 text-sm">Verify your email address</div>
                <div className="text-xs text-blue-700 mt-1">We sent a 6-digit code to {verificationEmail}.</div>
              </div>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required placeholder="Enter verification code" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 tracking-[0.35em] text-center focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50">Verify email</button>
              <button type="button" onClick={() => { setVerificationEmail(''); setVerificationCode(''); setSuccessMsg(''); }} className="w-full text-xs text-slate-500 hover:text-blue-600">Back to sign in</button>
            </form>
          )}

          {twoFactorChallenge && !verificationEmail && (
            <form onSubmit={handleTwoFactorVerification} className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="font-semibold text-emerald-900 text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Authenticator verification</div>
                <div className="text-xs text-emerald-700 mt-1">Open your authenticator app and enter the current 6-digit code.</div>
              </div>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} required placeholder="000000" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-lg rounded-xl px-4 py-3 tracking-[0.5em] text-center focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50">Verify and sign in</button>
              <button type="button" onClick={() => { setTwoFactorChallenge(''); setTwoFactorCode(''); setSuccessMsg(''); }} className="w-full text-xs text-slate-500 hover:text-blue-600">Back to sign in</button>
            </form>
          )}

          {showForgotPassword && !verificationEmail && !twoFactorChallenge && !resetToken && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset your password</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your account email. We’ll send instructions to create a new password.</p>
              </div>
              <input type="email" value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} required placeholder="you@example.com" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50">Send reset instructions</button>
              <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full text-xs text-slate-500 hover:text-blue-600">Back to sign in</button>
            </form>
          )}

          {resetToken && !verificationEmail && !twoFactorChallenge && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Choose a new password</h3>
                <p className="text-xs text-slate-500 mt-1">Use at least 8 characters. This reset link can only be used once.</p>
              </div>
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={8} placeholder="New password" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              <input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} required minLength={8} placeholder="Confirm new password" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50">Update password</button>
            </form>
          )}

          {/* Form: Merchant Login */}
          {authMode === 'login' && !showForgotPassword && !resetToken && !verificationEmail && !twoFactorChallenge && (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address or Mobile Number
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">Use the email address or mobile number registered for this account, not the owner name.</p>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                    placeholder="merchant@9tepay.com or +91 98765 43210"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button type="button" onClick={() => { setShowForgotPassword(true); setErrorMsg(''); setSuccessMsg(''); }} className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember Session (7 Days)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  256-bit Encrypted
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>Sign In to Merchant Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Form: Merchant Registration */}
          {authMode === 'register' && !verificationEmail && !twoFactorChallenge && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    required
                    placeholder="e.g. Apex Digital Store"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Owner / Contact Name
                  </label>
                  <input
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Abhay Sharma"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    placeholder="owner@store.com"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  placeholder="Create a strong account password"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Settlement UPI VPA */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center justify-between">
                    <span>Receiver UPI VPA (Direct Settlement) *</span>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded">0% Fee</span>
                  </label>
                  <input
                    type="text"
                    value={regVpa}
                    onChange={(e) => setRegVpa(e.target.value)}
                    required
                    placeholder="yourname@okaxis or business@icici"
                    className="w-full bg-white border border-blue-200 text-blue-900 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  All customer payments generated through this gateway will route directly to this UPI address.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bank Account (Optional)
                  </label>
                  <input
                    type="text"
                    value={regBankAccount}
                    onChange={(e) => setRegBankAccount(e.target.value)}
                    placeholder="919876543210"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    IFSC Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={regIfsc}
                    onChange={(e) => setRegIfsc(e.target.value)}
                    placeholder="ICIC0000102"
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="leading-relaxed">
                  I agree to the <strong>Terms and Conditions</strong>, including payment processing, account security, acceptable use, and data responsibilities.
                </span>
              </label>
              <details className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-slate-600">
                <summary className="cursor-pointer font-semibold text-blue-700">Review Terms and Conditions</summary>
                <div className="mt-2 space-y-1 leading-relaxed">
                  <p>Use accurate business and settlement information and keep your credentials private.</p>
                  <p>Only submit legitimate payment requests and comply with applicable laws and payment-network rules.</p>
                  <p>You are responsible for reviewing transactions, protecting customer data, and reporting suspicious activity.</p>
                </div>
              </details>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Create Merchant Account &amp; Get API Keys</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Form: Admin Login */}
          {authMode === 'admin' && !verificationEmail && !twoFactorChallenge && (
            <form onSubmit={(e) => handleLogin(e, { email: adminEmail, passcode: adminPasscode, role: 'admin' })} className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl text-xs text-slate-300 border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Restricted administrator workspace</div>
                    <div className="mt-1 leading-relaxed">Full visibility into merchants, payment approvals, settlement routing, security events, and reconciliation controls.</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Superadmin Email
                </label>
                <input
                  type="text"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="administrator@example.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Passcode
                </label>
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  required
                  placeholder="Enter administrator passcode"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Use your configured administrator credential. Sessions are protected and automatically expire.</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span>Unlock Command Center</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Feature Overview Card (Replaces trial accounts) */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4" />
              <span>Gateway Features</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Next-Generation Direct UPI
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Eliminate third-party aggregator delays and high transaction fees with direct P2P/P2M settlement.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Direct Bank Settlement</h4>
                  <p className="text-[11px] text-slate-500">Customer payments hit your bank account directly via UPI VPA.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Multi-App Deeplinking</h4>
                  <p className="text-[11px] text-slate-500">One-tap checkout launches Google Pay, PhonePe, Paytm, and BHIM.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Real-Time Webhooks</h4>
                  <p className="text-[11px] text-slate-500">Instant HMAC SHA-256 signed payment confirmation to your server.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold mb-1">
              <Shield className="w-4 h-4" />
              <span>Production Ready</span>
            </div>
            <h4 className="text-sm font-bold">Standard UPI &amp; Intent Compliance</h4>
            <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">
              Standardized NPCI URI schema with dynamic checksum validation and multi-bank load balancing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
