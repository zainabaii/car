import React, { useState } from 'react';
import { MapPin, Star, Phone, ShieldCheck, Search, Wrench, Zap, Car, ArrowUpRight } from 'lucide-react';

export default function WorkshopFinder({ onAskWorkshopQuestion }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const workshops = [
    {
      id: 'ws-1',
      name: 'Apex Precision Automotive Tech',
      rating: 4.9,
      reviewsCount: 184,
      distance: '2.4 km away',
      address: '840 Silicon Drive, Tech District',
      status: 'OPEN NOW',
      services: ['OBD-II Diagnostic Scan', 'Engine Tuning', 'Brake Systems', 'EV/Hybrid Diagnostics'],
      phone: '+1 (555) 019-2831',
      isCertified: true,
      category: 'performance'
    },
    {
      id: 'ws-2',
      name: 'Vanguard Euro Motors & Service',
      rating: 4.8,
      reviewsCount: 240,
      distance: '4.1 km away',
      address: '102 Industrial Parkway',
      status: 'OPEN NOW',
      services: ['European Specialist', 'Transmission Repair', 'Synthetic Lubrication', 'AC Service'],
      phone: '+1 (555) 019-9482',
      isCertified: true,
      category: 'mechanics'
    },
    {
      id: 'ws-3',
      name: 'HyperDrive EV & Hybrid Care Hub',
      rating: 4.9,
      reviewsCount: 96,
      distance: '5.8 km away',
      address: '305 CleanTech Blvd',
      status: 'OPEN NOW',
      services: ['High Voltage Battery Health', 'Inverter Cooling', 'Brake Energy Recov', 'Tires'],
      phone: '+1 (555) 019-3311',
      isCertified: true,
      category: 'ev'
    },
    {
      id: 'ws-4',
      name: 'Velocity Auto Alignment & Tires',
      rating: 4.7,
      reviewsCount: 310,
      distance: '1.2 km away',
      address: '505 Expressway Blvd',
      status: 'CLOSING SOON',
      services: ['3D Laser Alignment', 'Performance Wheel Balance', 'Tire Replacement', 'Suspension'],
      phone: '+1 (555) 019-7721',
      isCertified: false,
      category: 'tires'
    }
  ];

  const filtered = workshops.filter(w => {
    const matchesCat = activeCategory === 'all' || w.category === activeCategory;
    const matchesQuery = !searchQuery.trim() || 
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <section id="workshops" className="py-24 relative bg-[#07090E] overflow-hidden border-t border-slate-800">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full glass-pill text-[#00F0FF] text-xs font-mono tracking-widest uppercase">
            <MapPin className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>WORKSHOP DISCOVERY ENGINE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
            FIND THE RIGHT CARE
          </h2>
          <p className="text-lg text-slate-400 font-normal">
            Locate certified service specialists, EV experts, and performance mechanics near you.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="max-w-4xl mx-auto mb-12 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Search Input */}
            <div className="relative w-full flex-1">
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workshops by name or service (e.g. Brake, EV, Alignment)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#00F0FF] text-white text-sm focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            {/* Category Selector */}
            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Shops' },
                { id: 'mechanics', label: 'Mechanics' },
                { id: 'ev', label: 'EV / Hybrid' },
                { id: 'performance', label: 'Performance' },
                { id: 'tires', label: 'Tires' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-3 rounded-xl text-xs font-mono uppercase whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Workshop Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {filtered.map(shop => (
            <div
              key={shop.id}
              className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 hover:border-[#00F0FF]/40 transition-all space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    {shop.isCertified && (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase font-bold border border-emerald-500/30 flex items-center space-x-1 w-max mb-2">
                        <ShieldCheck className="w-3 h-3" />
                        <span>VAYRA VERIFIED CERTIFIED</span>
                      </span>
                    )}
                    <h3 className="text-xl font-display font-extrabold text-white">
                      {shop.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 flex items-center space-x-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>{shop.address} ({shop.distance})</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{shop.rating}</span>
                    <span className="text-slate-400 text-[10px]">({shop.reviewsCount})</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {shop.services.map((svc, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{shop.status}</span>
                </span>

                <button
                  onClick={() => onAskWorkshopQuestion(`Can you help me contact ${shop.name} for service?`)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-[#00F0FF]/15 border border-slate-700 hover:border-[#00F0FF]/40 text-xs font-mono text-[#00F0FF] transition-all flex items-center space-x-1.5"
                >
                  <span>ASK VAYRA TO CONTACT</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Maps Integration Demo Note */}
        <div className="max-w-4xl mx-auto mt-12 p-4 rounded-xl glass-panel border border-slate-800 text-center text-xs font-mono text-slate-400 flex items-center justify-center space-x-2">
          <MapPin className="w-4 h-4 text-[#00F0FF]" />
          <span>Interactive Maps API framework active. Certified network data dynamically fetched.</span>
        </div>

      </div>
    </section>
  );
}
