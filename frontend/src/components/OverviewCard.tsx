import React from 'react';
import {
  AlertTriangle,
  Server,
  Shield,
  ArrowRight,
  Lock,
  Code2,
} from 'lucide-react';
import { TargetAnalysisData } from '../types';

interface OverviewCardProps {
  data: TargetAnalysisData;
}

export const OverviewCard: React.FC<OverviewCardProps> = ({ data }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      
      {/* Top Tag & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {data.riskRating}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
            HTTP 302 Redirect
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" /> HTTPS Enforced
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Risk Assessment:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                style={{ width: `${data.riskScore}%` }}
              />
            </div>
            <span className="text-xs font-bold text-amber-700">{data.riskScore}/100</span>
          </div>
        </div>
      </div>

      {/* Target Details & Direct Answer */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 shrink-0 text-slate-700">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {data.title}
              </h2>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs text-slate-500 break-all">
                <span className="text-slate-400">Requested:</span>
                <span className="text-slate-800 font-medium">{data.url}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-700 font-bold">{data.canonicalUrl}</span>
              </div>
            </div>
          </div>

          <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {data.summary}
          </p>

          {/* Quick classification pill boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Classification</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">UPI Gateway Clone</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Host Infrastructure</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">Hostinger hCDN</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Session Security</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5">Protected &amp; expiring</div>
            </div>
          </div>
        </div>

        {/* Server & Environment snapshot box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                Runtime &amp; Hosting
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-medium">Hostinger Edge</span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Backend Engine:</span>
                <span className="font-mono text-emerald-700 font-bold">{data.hosting.phpVersion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Control Panel:</span>
                <span className="text-slate-800 font-medium">{data.hosting.panel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Server Edge:</span>
                <span className="text-slate-800 font-medium">{data.hosting.server}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Primary Domain:</span>
                <span className="font-mono text-slate-800 font-semibold">{data.domain}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Auth Gatekeeper:</span>
                <span className="text-amber-800 font-bold">CSRF &amp; Session Lock</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600 leading-normal flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Unauthenticated access is halted at the gate. Accessing the dashboard requires valid merchant credentials.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
