import React, { useState, useEffect } from 'react';
import { Cpu, ChevronRight, Menu, X, Car } from 'lucide-react';

export default function Navbar({ onNavigate, activeSection, activeVehicle }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'ai-care', label: 'AI Care' },
    { id: 'orchestrator', label: 'Architecture' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'workshops', label: 'Workshops' },
    { id: 'garage', label: 'Digital Garage' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-[#DCE8F5] py-3.5 shadow-md' : 'bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <div 
            onClick={() => onNavigate('hero')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B5ED7] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(11,94,215,0.3)] group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-xl tracking-tight text-[#10233F]">VAYRA</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#EEF6FF] text-[#0B5ED7] font-bold border border-[#C4DCF5]">AI CAR CARE</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase hidden sm:block">Intelligent Vehicle Co-Pilot</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2 px-3 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeSection === item.id 
                    ? 'bg-white text-[#0B5ED7] shadow-sm border border-[#DCE8F5]'
                    : 'text-slate-600 hover:text-[#10233F] hover:bg-white/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {activeVehicle && (
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EEF6FF] border border-[#C4DCF5] text-[#0B5ED7] text-xs font-mono font-medium">
                <Car className="w-3.5 h-3.5 text-[#0B5ED7]" />
                <span>{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span>
              </div>
            )}

            <button
              onClick={() => onNavigate('ai-care')}
              className="px-5 py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(11,94,215,0.35)] hover:shadow-[0_6px_22px_rgba(11,94,215,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2 group"
            >
              <span>TALK TO VAYRA</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-2 mt-2 shadow-xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-[#0B5ED7] hover:bg-[#EEF6FF]"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              onNavigate('ai-care');
              setMobileMenuOpen(false);
            }}
            className="w-full mt-4 py-3 rounded-xl bg-[#0B5ED7] text-white font-bold text-xs uppercase tracking-wider text-center shadow-md"
          >
            TALK TO VAYRA AI
          </button>
        </div>
      )}
    </nav>
  );
}
