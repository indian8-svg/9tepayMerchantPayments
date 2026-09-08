import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Copy, Check, Terminal } from 'lucide-react';
import { SecurityCheckItem, TargetAnalysisData } from '../types';

interface SecurityAuditPanelProps {
  securityChecks: SecurityCheckItem[];
  headers: Record<string, string>;
  cookieAnalysis: TargetAnalysisData['cookieAnalysis'];
}

export const SecurityAuditPanel: React.FC<SecurityAuditPanelProps> = ({
  securityChecks,
  headers,
  cookieAnalysis,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRawHeaders, setShowRawHeaders] = useState(false);

  const handleCopyHeaders = () => {
    const text = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Security Headers &amp; Posture Audit</h3>
            <p className="text-xs text-slate-500">
              Evaluated HTTP response headers, SSL enforcement, and defensive browser policies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawHeaders(!showRawHeaders)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>{showRawHeaders ? 'Show Audit Grid' : 'Raw Headers'}</span>
          </button>
          <button
            onClick={handleCopyHeaders}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {showRawHeaders ? (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto">
          <pre className="space-y-1">
            {Object.entries(headers).map(([k, v]) => (
              <div key={k} className="flex">
                <span className="text-emerald-700 font-bold w-48 shrink-0">{k}:</span>
                <span className="text-slate-800 break-all">{v}</span>
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityChecks.map((check, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <span className="text-xs font-bold text-slate-900">{check.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    check.status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : check.status === 'warn'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {check.status}
                </span>
              </div>

              <div className="bg-white rounded-md px-2.5 py-1.5 font-mono text-[11px] text-slate-800 border border-slate-200 truncate">
                {check.value}
              </div>

              <p className="text-[11px] text-slate-600 leading-normal">
                {check.description}
              </p>

              <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-200">
                <span className="text-emerald-700 font-bold">Remedy: </span>
                {check.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Cookie Audit Sub-card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Session Cookie Security Inspection</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
              {cookieAnalysis.cookieName}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Duration: {cookieAnalysis.lifetime}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Secure Flag</div>
            <div className="text-emerald-700 font-bold mt-0.5">{cookieAnalysis.secure ? 'ENABLED (HTTPS)' : 'DISABLED'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">HttpOnly Flag</div>
            <div className="text-emerald-700 font-bold mt-0.5">{cookieAnalysis.httpOnly ? 'ENABLED (Anti-XSS)' : 'DISABLED'}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">SameSite Attribute</div>
            <div className="text-emerald-700 font-bold mt-0.5">{cookieAnalysis.sameSite}</div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {cookieAnalysis.evaluation}
        </p>
      </div>
    </div>
  );
};
