import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Car } from 'lucide-react';

export default function FinalCtaSection({ onStartChat }) {
  return (
    <section className="relative py-20 sm:py-28 bg-gradient-to-b from-[#F7FAFC] via-[#EEF6FF] to-white overflow-hidden border-t border-[#DCE8F5]">
      
      {/* Background Soft Atmospheric Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0B75D1]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#16B8C4]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Subtle Decorative Top Accent Line */}
        <div className="w-20 h-1 bg-gradient-to-r from-[#0B75D1] to-[#16B8C4] rounded-full mx-auto mb-14 opacity-80"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Side: Content & CTA */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Small Brand Label */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B75D1] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#0B75D1]" />
              <span>VAYRA AI CAR CARE</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl sm:text-6xl xl:text-6xl font-display font-extrabold text-[#10233F] tracking-tight leading-[1.08]">
              YOUR CAR DESERVES<br />
              <span className="bg-gradient-to-r from-[#0B75D1] to-[#16B8C4] bg-clip-text text-transparent">
                THE BEST CARE.
              </span>
            </h2>

            {/* Supporting Description */}
            <p className="text-lg sm:text-xl text-[#607089] font-normal leading-relaxed max-w-xl">
              "Let VAYRA handle the details, so you can enjoy the journey."
            </p>

            {/* Primary Action CTA Button */}
            <div className="pt-2">
              <button
                onClick={onStartChat}
                className="px-9 py-4 rounded-xl bg-[#0B75D1] hover:bg-[#095EA9] text-white font-bold text-sm tracking-wider uppercase shadow-[0_6px_25px_rgba(11,117,209,0.35)] hover:shadow-[0_8px_30px_rgba(11,117,209,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-3 group"
              >
                <span>START WITH VAYRA</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Secondary Small Badges / Value Prop Items */}
            <div className="pt-6 border-t border-[#DCE8F5] grid grid-cols-3 gap-3 text-xs font-semibold text-[#607089]">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#0B75D1] shrink-0" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#16B8C4] shrink-0" />
                <span>Safe & Reliable</span>
              </div>
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-[#0B75D1] shrink-0" />
                <span>Smart Vehicle Care</span>
              </div>
            </div>

          </div>

          {/* Right Side: Seamless Integrated Premium Automotive Commercial Photography */}
          <div className="lg:col-span-6 relative">
            
            {/* Natural Blend Glow behind car image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#EEF6FF]/80 via-white/50 to-transparent rounded-3xl -z-10 blur-xl"></div>

            {/* Image Container with Natural Edge Blending */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#DCE8F5] bg-white group">
              
              <img 
                src="/assets/vayra_final_cta_car.jpg" 
                alt="Luxury Sedan driving into sunset - VAYRA Automotive" 
                className="w-full h-[340px] sm:h-[440px] lg:h-[460px] object-cover object-right filter brightness-[1.02] contrast-[1.02] group-hover:scale-105 transition-transform duration-700"
              />

              {/* Seamless Vignette and Gradient Overlay Blending */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-transparent pointer-events-none"></div>

              {/* Floating Badge overlay on image */}
              <div className="absolute bottom-6 left-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#C4DCF5] shadow-lg max-w-xs text-left hidden sm:block">
                <p className="text-[10px] font-mono text-[#0B75D1] uppercase font-bold tracking-wider">INTELLIGENT DRIVING COMPANION</p>
                <p className="text-xs font-bold text-[#10233F] mt-0.5">Smarter diagnostics. Smoother journeys.</p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
