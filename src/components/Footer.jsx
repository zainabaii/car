import React from 'react';
import { Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#F7FAFC] border-t border-[#DCE8F5] text-slate-600 py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-[#DCE8F5]">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#0B5ED7] flex items-center justify-center text-white shadow-md">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-2xl tracking-wider text-[#10233F]">VAYRA</span>
            </div>

            <p className="text-xs font-mono uppercase text-[#0B5ED7] font-bold tracking-widest">
              AI CAR CARE — KNOW YOUR CAR. CARE SMARTER.
            </p>

            <p className="text-sm text-slate-600 max-w-sm leading-relaxed font-sans">
              Your intelligent digital co-pilot for vehicle identity decoding, symptom analysis, service intervals, and certified workshop discovery.
            </p>

            <div className="pt-2 flex items-center space-x-3 text-xs font-mono text-slate-500">
              <span className="px-2.5 py-1 rounded-full bg-white border border-[#DCE8F5] text-slate-600 text-xs font-medium shadow-2xs">Netlify Functions</span>
              <span className="px-2.5 py-1 rounded-full bg-white border border-[#DCE8F5] text-slate-600 text-xs font-medium shadow-2xs">NHTSA API</span>
              <span className="px-2.5 py-1 rounded-full bg-white border border-[#DCE8F5] text-slate-600 text-xs font-medium shadow-2xs">Gemini + Groq</span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase text-[#10233F] tracking-wider font-bold">NAVIGATION</h4>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <button onClick={() => onNavigate('vehicle')} className="hover:text-[#0B5ED7] transition-colors">
                  Meet Your Vehicle (VIN Decoder)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ai-care')} className="hover:text-[#0B5ED7] transition-colors">
                  AI Car Care Co-Pilot
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orchestrator')} className="hover:text-[#0B5ED7] transition-colors">
                  Agentic AI Architecture
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('maintenance')} className="hover:text-[#0B5ED7] transition-colors">
                  Smart Maintenance Engine
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('workshops')} className="hover:text-[#0B5ED7] transition-colors">
                  Workshop Discovery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('garage')} className="hover:text-[#0B5ED7] transition-colors">
                  Digital Garage OS
                </button>
              </li>
            </ul>
          </div>

          {/* Safety & Compliance */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase text-[#10233F] tracking-wider font-bold">AUTOMOTIVE SAFETY</h4>
            <div className="p-4 rounded-2xl bg-white border border-[#DCE8F5] shadow-sm space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-amber-600 font-mono font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>GENERAL ADVISORY</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                VAYRA provides general vehicle guidance based on reported symptoms and specs. It does not replace a qualified mechanic or physical inspection.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} VAYRA AI CAR CARE. All rights reserved.</p>
          <p className="text-slate-500">Intelligent vehicle data • Built for smarter car care</p>
        </div>

      </div>
    </footer>
  );
}
