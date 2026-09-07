import React from 'react';
import { Cpu, Wrench, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

export default function FeatureGrid({ onNavigate }) {
  const features = [
    {
      id: 'vehicle',
      icon: Cpu,
      title: 'VEHICLE INTELLIGENCE',
      tagline: 'Understand your vehicle.',
      description: 'Decode 17-character VINs directly via official NHTSA database to unlock factory displacement, cylinders, drive type, and country of origin.',
      actionText: 'DECODE VIN NOW'
    },
    {
      id: 'maintenance',
      icon: Wrench,
      title: 'SMART MAINTENANCE',
      tagline: 'Know what deserves attention.',
      description: 'Proactively calculate synthetic oil, brake lining, filter, and fluid intervals customized to your mileage and driving environment.',
      actionText: 'VIEW INTERVALS'
    },
    {
      id: 'ai-care',
      icon: ShieldCheck,
      title: 'AI CAR CARE',
      tagline: 'Ask questions naturally.',
      description: 'Interact with 5 specialized AI agents trained on diagnostic symptom triage, safety protocols, and mechanical guidance.',
      actionText: 'START AI CHAT'
    },
    {
      id: 'workshops',
      icon: MapPin,
      title: 'WORKSHOP DISCOVERY',
      tagline: 'Find care when you need it.',
      description: 'Discover top-rated certified mechanics, EV diagnostic hubs, and specialized alignment centers near your location.',
      actionText: 'EXPLORE SHOPS'
    }
  ];

  return (
    <section className="py-24 relative bg-white border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#0B5ED7] font-bold">CORE PRODUCT ARCHITECTURE</p>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            ENGINEERED FOR MODERN CAR OWNERS
          </h2>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat) => {
            const IconComp = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => onNavigate(feat.id)}
                className="group cursor-pointer bg-[#F8FAFC] p-8 rounded-3xl border border-[#DCE8F5] hover:border-[#C4DCF5] hover:bg-white shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Subtle Hover Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#0B5ED7]/5 rounded-full blur-2xl group-hover:bg-[#0B5ED7]/10 transition-all"></div>

                <div className="space-y-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF6FF] border border-[#C4DCF5] flex items-center justify-center text-[#0B5ED7] group-hover:scale-110 transition-transform shadow-sm">
                    <IconComp className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">{feat.title}</span>
                    <h3 className="text-2xl font-display font-extrabold text-[#10233F] mt-1 group-hover:text-[#0B5ED7] transition-colors">
                      "{feat.tagline}"
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed font-sans">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-200 mt-6 flex items-center justify-between text-xs font-mono font-bold text-[#0B5ED7] relative z-10">
                  <span>{feat.actionText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
