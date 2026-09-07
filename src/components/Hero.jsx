import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, ShieldCheck, Car, CheckCircle2, Wrench, MapPin } from 'lucide-react';

export default function Hero({ onStartChat, onScrollToVin, onSelectPrompt }) {
  const [vinInput, setVinInput] = useState('1FA6P8CF0H5100001');

  return (
    <section className="relative min-h-screen pt-28 pb-16 flex items-center justify-center bg-gradient-to-b from-[#EEF6FF] via-[#F7FAFC] to-white overflow-hidden">
      
      {/* Background Soft Blue Radial Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-[#C4DCF5]/30 to-transparent blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Top Header Tagline */}
        <div className="max-w-3xl space-y-4 text-left mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>YOUR AI POWERED VEHICLE COMPANION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl xl:text-7xl font-display font-extrabold tracking-tight leading-[1.08] text-[#10233F]">
            Car Care <span className="bg-gradient-to-r from-[#0B5ED7] to-[#2563EB] bg-clip-text text-transparent">Agent</span>
            <br />
            <span className="text-3xl sm:text-5xl font-bold text-slate-700">Smarter care. Smoother drives.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
            Your AI assistant for everything car — from vehicle information and maintenance tips to finding trusted workshops near you.
          </p>
        </div>

        {/* Hero Visual Showcase Area */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#DCE8F5] mb-12 bg-white">
          
          {/* Main Hero Scenic Car Image */}
          <div className="relative h-[420px] sm:h-[500px] lg:h-[550px] w-full">
            <img 
              src="/assets/vayra_light_hero_car.jpg" 
              alt="Toyota Sedan Driving Scenic Mountain Road" 
              className="w-full h-full object-cover object-center filter brightness-[1.02] contrast-[1.02]"
            />

            {/* Gradient Overlays for Sunlight Integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-transparent to-transparent"></div>

            {/* Floating Top Right Spec Card */}
            <div className="absolute top-6 right-6 hidden md:block max-w-xs p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#DCE8F5] shadow-xl text-left space-y-3">
              <div className="flex items-center space-x-2 text-[#0B5ED7]">
                <Car className="w-5 h-5" />
                <h4 className="font-display font-bold text-sm text-[#10233F]">Your Vehicle Information</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Make & Model Decoding</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Model Year & Engine Specs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Fuel Type & Body Class</span>
                </li>
              </ul>
            </div>

            {/* Embedded Live Quick Action Card over Hero Image */}
            <div className="absolute bottom-6 left-6 right-6 md:left-8 md:right-auto md:max-w-xl p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#DCE8F5] shadow-2xl space-y-4 text-left">
              
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500 border-b border-slate-100 pb-3">
                <button onClick={onScrollToVin} className="flex items-center space-x-1.5 text-[#0B5ED7] font-bold">
                  <Car className="w-4 h-4 text-[#0B5ED7]" />
                  <span>Decode VIN</span>
                </button>
                <button onClick={onStartChat} className="flex items-center space-x-1.5 hover:text-[#0B5ED7]">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <span>Maintenance Advice</span>
                </button>
                <button onClick={() => onSelectPrompt("Find certified workshops near me")} className="flex items-center space-x-1.5 hover:text-[#0B5ED7]">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Nearby Workshops</span>
                </button>
              </div>

              {/* VIN Search Form */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={vinInput}
                    onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                    placeholder="Enter your VIN (17 characters)"
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-[#DCE8F5] focus:border-[#0B5ED7] text-[#10233F] font-mono text-sm uppercase focus:outline-none focus:bg-white transition-all"
                  />
                </div>
                <button
                  onClick={onScrollToVin}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0"
                >
                  <span>DECODE VIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] font-mono text-slate-400">
                No API key required | Powered by official NHTSA vPIC
              </p>
            </div>

          </div>

        </div>

        {/* Action CTAs & Key Value Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={onStartChat}
              className="px-8 py-4 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-sm tracking-wider uppercase shadow-[0_6px_20px_rgba(11,94,215,0.35)] hover:shadow-[0_8px_25px_rgba(11,94,215,0.5)] transition-all flex items-center space-x-2"
            >
              <span>TALK TO VAYRA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onScrollToVin}
              className="px-8 py-4 rounded-xl bg-white hover:bg-slate-50 border border-[#DCE8F5] text-[#10233F] font-bold text-sm tracking-wider uppercase shadow-sm hover:shadow transition-all"
            >
              DECODE MY VIN
            </button>
          </div>

          <div className="flex items-center space-x-6 text-xs font-semibold text-slate-500 font-sans">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0B5ED7]" />
              <span>AI Powered</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Free to Use</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Car className="w-4 h-4 text-[#0B5ED7]" />
              <span>Real NHTSA Data</span>
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
