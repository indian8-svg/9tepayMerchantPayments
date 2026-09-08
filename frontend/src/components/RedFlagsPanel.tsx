import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldX } from 'lucide-react';
import { RedFlagItem } from '../types';

interface RedFlagsPanelProps {
  redFlags: RedFlagItem[];
}

export const RedFlagsPanel: React.FC<RedFlagsPanelProps> = ({ redFlags }) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-600" /> Critical Threat
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> High Risk
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-600" /> Medium Risk
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Info
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600 border border-rose-200">
            <ShieldX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Threat Matrix &amp; Red Flag Intelligence</h3>
            <p className="text-xs text-slate-500">
              Audit of business legitimacy, script origin, compliance gaps, and infrastructural liabilities
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {redFlags.length} Identified Issues
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {redFlags.map((flag) => (
          <div
            key={flag.id}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  {flag.category}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{flag.title}</h4>
              </div>
              {getSeverityBadge(flag.severity)}
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {flag.description}
            </p>

            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs flex items-start gap-2">
              <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] shrink-0 mt-0.5">
                Impact / Hazard:
              </span>
              <span className="text-slate-700">{flag.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
