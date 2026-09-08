import React, { useState } from 'react';
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Send,
  Check,
  Copy,
  Building2,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { safeFetch, formatErrorMessage } from '../utils/api';

interface ContactPageProps {
  onBackToDashboard?: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBackToDashboard }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    volume: 'Below 10 Lakhs/month',
    subject: 'Enterprise UPI Gateway Inquiry',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const officialEmail = 'info@9tepay.online';

  const handleCopy = (text: string, type: 'email' | 'address') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await safeFetch<{ success: boolean; message?: string; error?: string }>('/api/contact/inquiries', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (!response.ok || !response.data?.success) {
        throw new Error(response.data?.error || response.error || 'Unable to send your inquiry.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(formatErrorMessage(error, 'Unable to send your inquiry. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8 sm:space-y-10 font-sans">
      {/* Top Banner */}
      <section className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-12 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>24/7 Enterprise Support</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Contact 9tepay Team
          </h1>
          <p className="text-sm sm:text-lg text-slate-300 font-medium leading-relaxed">
            Have questions regarding our flat zero-fee UPI gateway, merchant sandbox API testing, or custom multi-bank auto-routing? Get in touch with our team today.
          </p>
        </div>
      </section>

      {/* Main Info & Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Info Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Email Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Official Email
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">General &amp; Sales Inquiries</h3>
              <a
                href={`mailto:${officialEmail}`}
                className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors block mt-1 font-mono"
              >
                {officialEmail}
              </a>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Typical response time: &lt; 2 hours</span>
              <button
                onClick={() => handleCopy(officialEmail, 'email')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Headquarters
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corporate Headquarters</h3>
              <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                Sector 16, Noida, Gautam Buddha Nagar
                <br />
                Uttar Pradesh, Pin Code: 201301
                <br />
                India
              </p>
            </div>
          </div>

          {/* Support Hours Card */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Technical &amp; Merchant Support SLA</span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span>Monday – Saturday</span>
                <strong className="text-white">9:00 AM – 8:00 PM IST</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span>Critical Incident Monitoring</span>
                <strong className="text-emerald-400 font-mono">24/7/365 Automated</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>API Sandbox Uptime</span>
                <strong className="text-emerald-400 font-mono">99.9% SLA</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Contact Form Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Delivered Successfully</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Thank you for reaching out to 9tepay Enterprise Support. An integration specialist will reply to{' '}
                <strong className="text-slate-900 font-mono">{formData.email || 'your email'}</strong> within 2 business hours.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      businessName: '',
                      volume: 'Below 10 Lakhs/month',
                      subject: 'Enterprise UPI Gateway Inquiry',
                      message: '',
                    });
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  Send Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Send an Enterprise Query</h2>
                <p className="text-xs text-slate-500">Fill out your business details below to get direct onboarding support.</p>
                <p className="text-[11px] text-slate-500">Your details are sent securely to 9tepay Support. We do not sell inquiry data.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Aarav Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="aarav@business.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {submitError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-700">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    placeholder="Apex Retail Solutions"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly UPI Volume</label>
                  <select
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="Below 10 Lakhs/month">Below ₹10 Lakhs / month</option>
                    <option value="10 Lakhs - 50 Lakhs/month">₹10 Lakhs – ₹50 Lakhs / month</option>
                    <option value="50 Lakhs - 2 Crores/month">₹50 Lakhs – ₹2 Crores / month</option>
                    <option value="Above 2 Crores/month">Above ₹2 Crores / month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message / Requirements *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your current payment setup, bank settlement requirements, or API sandbox questions..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Sending Request...' : 'Submit Enterprise Inquiry'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
