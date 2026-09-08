import React from 'react';
import { Layers, Globe2 } from 'lucide-react';
import { TechStackItem } from '../types';

interface TechnicalStackPanelProps {
  techStack: TechStackItem[];
  hosting: {
    provider: string;
    server: string;
    cdn: string;
    phpVersion: string;
    panel: string;
    ipAddresses: string[];
  };
}

export const TechnicalStackPanel: React.FC<TechnicalStackPanelProps> = ({ techStack, hosting }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Infrastructural &amp; Technology Fingerprint</h3>
            <p className="text-xs text-slate-500">
              Deconstructed software layers, runtime engines, CDN edge, and library footprints
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          6 Detected Technologies
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {techStack.map((tech, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {tech.category}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {tech.confidence} Confidence
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span>{tech.name}</span>
                {tech.version && (
                  <span className="text-xs font-mono font-normal text-slate-500">({tech.version})</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded p-2 text-[11px] font-mono text-slate-700 border border-slate-200 break-words">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Evidence:</span>
              {tech.evidence}
            </div>
          </div>
        ))}
      </div>

      {/* Network & Routing Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
          Resolved IP &amp; Edge Routing Nodes
        </h4>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {hosting.ipAddresses.map((ip, i) => (
            <span key={i} className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700">
              IPv6: {ip}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-indigo-700 font-medium">
            CDN: Hostinger nme-edge
          </span>
        </div>
      </div>
    </div>
  );
};
