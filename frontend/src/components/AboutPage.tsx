import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Building2,
  TrendingUp,
  Cpu,
  Smartphone,
  Webhook,
  DollarSign,
  HelpCircle,
  Copy,
  Check,
  Percent,
  Lock,
} from 'lucide-react';

interface AboutPageProps {
  onNavigateToContact?: () => void;
  onNavigateToDocs?: () => void;
  onNavigateToAuth?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onNavigateToContact,
  onNavigateToDocs,
  onNavigateToAuth,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const usps = [
    {
      title: '0% Commission on Transactions',
      description: 'Retain 100% of your customer payments. No 2% aggregator cuts, no per-transaction charges.',
      icon: Percent,
      highlight: 'Zero Fee',
    },
    {
      title: 'Zero Upfront / Prepayment Required',
      description: 'Start testing, plugging in webhooks, and accepting live payments immediately without initial risk.',
      icon: DollarSign,
      highlight: 'Pay After Trust',
    },
    {
      title: '100% Direct-to-Bank Instant Settlements',
      description: 'Funds settle directly from customer UPI apps (Google Pay, PhonePe, Paytm, CRED) into your merchant bank account.',
      icon: Zap,
      highlight: 'Instant T+0',
    },
    {
      title: 'Smart Multi-Bank Account Auto-Routing',
      description: 'Distribute incoming payments across multiple ICICI, HDFC, SBI, Axis, or custom VPA handles using round-robin logic.',
      icon: Building2,
      highlight: 'High Uptime',
    },
    {
      title: 'AI/ML Fake UTR & Fraud Detection Engine',
      description: 'Real-time validation against duplicate UTRs, pattern analysis, and automated risk scoring before crediting.',
      icon: ShieldCheck,
      highlight: 'Fraud Guard',
    },
    {
      title: '1-Click Mobile Deeplinks & Dynamic Vector QRs',
      description: 'Native UPI intent invocation across Android & iOS devices for friction-free 1-click checkout.',
      icon: Smartphone,
      highlight: 'Vector QRs',
    },
    {
      title: 'Developer-Friendly APIs & Real-Time Webhooks',
      description: 'REST APIs, HMCS SHA-256 signed webhooks, sandbox testing, and instant payment notification callbacks.',
      icon: Webhook,
      highlight: '10-Min Integration',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'TEST',
      subtitle: 'Sandbox Environment',
      desc: 'Access our full-featured sandbox environment to test simulated UPI payment flows, verify webhook signatures, and integrate REST API routes.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      step: '02',
      title: 'PLUG',
      subtitle: '10-Minute Setup',
      desc: 'Plug in your merchant bank VPAs, configure auto-routing thresholds, set up real-time webhook endpoints, and generate API keys.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      step: '03',
      title: 'PLAY',
      subtitle: 'Instant Live Processing',
      desc: 'Launch live checkout links, generate dynamic vector QR codes, and start receiving direct-to-bank settlements with zero transaction fees.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      step: '04',
      title: 'TRUST',
      subtitle: 'Verify Before Paying',
      desc: 'Experience zero-fee instant settlements and 99.9% uptime firsthand with free access from day one.',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const copySamplePayload = () => {
    navigator.clipboard.writeText(`// 9tepay Direct Bank Gateway Initialization
const gateway = new NineTePayGateway({
  apiKey: process.env.NINEPAY_API_KEY,
  merchantVpa: "merchant.settle@hdfcbank"
});`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-12">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Enterprise Gateway Solution</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
            9tepay Enterprise UPI &amp; Bank Gateway
          </h1>

          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-200 via-indigo-100 to-emerald-300 bg-clip-text text-transparent">
            Zero % Transaction Fees. Unlimited Volume. 100% Direct Bank Settlement.
          </p>

          <div className="pt-2">
            <div className="inline-block bg-slate-800/90 border border-slate-700/80 rounded-2xl px-5 py-3 shadow-inner">
              <p className="text-sm sm:text-base font-semibold text-emerald-300 font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>[ Test, Plug, Play, Trust — Start Without Upfront Payment ]</span>
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToContact}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-2"
            >
              <span>Contact Sales &amp; Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToDocs}
              className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Explore Developer APIs</span>
            </button>
          </div>
        </div>
      </section>

      {/* Simple Pricing Section */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
            Free Merchant Access
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple Pricing. Completely Free.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-medium">
            Start accepting payments without subscription fees, setup charges, or hidden costs.
          </p>
        </div>

        {/* Pricing Card Highlight */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl border border-slate-800 relative">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800 px-3 py-1 rounded-full inline-block">
                Free Forever Plan
              </span>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ₹0 <span className="text-lg font-normal text-slate-400">/ Forever</span>
                </div>
                <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                  No Subscription Fee | No Setup Charge
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                Get started today with the complete merchant toolkit and keep 100% of your customer payments.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={onNavigateToAuth}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md text-center"
              >
                Start Free
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span>What Is Included for Free?</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>0% Commission</strong> on all incoming transaction volumes</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Zero Prepayment</strong> — Test sandbox &amp; live flows first</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>100% Direct-to-Bank</strong> instant bank account credits</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Multi-Bank Auto-Routing</strong> with round-robin load distribution</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>AI/ML Fraud Engine</strong> with fake UTR detection</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>REST APIs &amp; Webhooks</strong> with automated retry dispatch</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold">Comparing to Legacy Aggregators?</span>
                <p className="text-[11px] text-blue-700">No annual license, subscription, or setup fee. Create your merchant account and start using 9tepay for free.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USPs Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Key Unique Selling Propositions (USPs)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Architected specifically for high-volume enterprise merchants seeking zero gateway overhead and direct bank settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {usps.map((usp, idx) => {
            const Icon = usp.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {usp.highlight}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{usp.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{usp.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-8 shadow-xl border border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            Seamless Onboarding Methodology
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How It Works: Test, Plug, Play, Trust
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Four clear steps from initial API integration to direct-to-bank execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-slate-500">{s.step}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r ${s.color} text-white`}>
                    {s.title}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{s.subtitle}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Ready for Integration?</h4>
              <p className="text-[11px] text-slate-400">Check our interactive REST documentation and sample webhooks.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onNavigateToDocs}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              View API Documentation
            </button>
            <button
              onClick={onNavigateToContact}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Contact Support
            </button>
          </div>
        </div>
      </section>

      {/* Code Snippet Preview */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Rapid 10-Minute Integration</h3>
            <p className="text-xs text-slate-500">Simple payload initialization for web checkout &amp; mobile SDKs.</p>
          </div>
          <button
            onClick={copySamplePayload}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copiedCode ? 'Copied Payload' : 'Copy Sample SDK Code'}</span>
          </button>
        </div>

        <pre className="bg-slate-950 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800">
{`// Initialize 9tepay Direct Bank Gateway
import { NineTePay } from '@9tepay/sdk';

const sdk = new NineTePay({
  apiKey: process.env.NINEPAY_API_KEY,
  merchantVpa: 'merchant.settle@hdfcbank',
  routingStrategy: 'smart_round_robin'
});

// Create Direct Instant Payment Intent
const order = await sdk.createOrder({
  amount: 1499.00,
  orderId: 'ORD-9021',
  customerName: 'Aarav Sharma',
  callbackUrl: 'https://yourbusiness.com/api/webhooks/9tepay'
});`}
        </pre>
      </section>
    </div>
  );
};
