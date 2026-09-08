import React from 'react';
import { Network, Lock, Unlock } from 'lucide-react';
import { EndpointInfo } from '../types';

interface EndpointsMapPanelProps {
  endpoints: EndpointInfo[];
  domain: string;
}

export const EndpointsMapPanel: React.FC<EndpointsMapPanelProps> = ({ endpoints, domain }) => {
  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">GET</span>;
      case 'POST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">POST</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">{method}</span>;
    }
  };

  const getStatusBadge = (status: number) => {
    if (status === 200) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">200 OK</span>;
    }
    if (status === 302) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">302 Redirect</span>;
    }
    if (status === 401) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">401 Auth Req</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 rounded-lg text-teal-600 border border-teal-200">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Discovered Route &amp; Endpoint Map</h3>
            <p className="text-xs text-slate-500">
              Structural layout of public, administrative, checkout, and API routes on {domain}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {endpoints.length} Routes Cataloged
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Method</th>
              <th className="py-2.5 px-3">Path</th>
              <th className="py-2.5 px-3">HTTP Status</th>
              <th className="py-2.5 px-3">Auth Lock</th>
              <th className="py-2.5 px-3">Purpose &amp; Target Function</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {endpoints.map((ep, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3">{getMethodBadge(ep.method || 'UNKNOWN')}</td>
                <td className="py-3 px-3 font-mono text-emerald-700 font-bold">
                  {ep.path}
                </td>
                <td className="py-3 px-3">{getStatusBadge(ep.status)}</td>
                <td className="py-3 px-3">
                  {ep.authRequired ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <Lock className="w-3 h-3 text-amber-600" /> Session Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Unlock className="w-3 h-3 text-slate-400" /> Public
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-700">
                  <div className="font-semibold text-slate-900">{ep.purpose}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">{ep.details}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
