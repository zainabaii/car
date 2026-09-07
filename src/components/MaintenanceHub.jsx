import React, { useState } from 'react';
import { Wrench, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, Filter } from 'lucide-react';

export default function MaintenanceHub({ activeVehicle, onAskMaintenanceQuestion }) {
  const [filterCategory, setFilterCategory] = useState('all');

  const maintenanceItems = [
    {
      id: 'm1',
      title: 'Full Synthetic Engine Oil & Filter Change',
      category: 'Engine Care',
      interval: '10,000 KM / 12 Months',
      dueInKm: 2550,
      status: 'DUE SOON',
      urgency: 'high',
      description: 'Protects internal engine components against friction, sludge build-up, and high heat breakdown.',
      tasks: ['Replace 0W-20/5W-30 synthetic oil', 'Install OEM oil filter element', 'Reset maintenance interval lamp']
    },
    {
      id: 'm2',
      title: 'Brake Pad Measurement & Rotor Clearance',
      category: 'Braking',
      interval: '15,000 KM',
      dueInKm: 2550,
      status: 'SCHEDULED',
      urgency: 'medium',
      description: 'Inspect front and rear brake lining thickness, caliper slider pins, and rotor surface runout.',
      tasks: ['Measure front/rear pad mm', 'Check brake fluid moisture %', 'Inspect hydraulic line hoses']
    },
    {
      id: 'm3',
      title: 'Cabin & Engine Intake Air Filter Replacement',
      category: 'Air Systems',
      interval: '20,000 KM',
      dueInKm: 7550,
      status: 'UPCOMING',
      urgency: 'low',
      description: 'Ensures optimal HVAC climate control airflow and prevents particulate intake into mass air flow sensor.',
      tasks: ['Replace cabin HEPA filter', 'Clean intake air filter box', 'Inspect intake duct seals']
    },
    {
      id: 'm4',
      title: 'Transmission Fluid & Differential Fluid Service',
      category: 'Drivetrain',
      interval: '50,000 KM',
      dueInKm: 37550,
      status: 'PLANNED',
      urgency: 'low',
      description: 'Prevents gear chatter and maintains crisp clutch pack engagement across internal valve body.',
      tasks: ['Fluid drain & refill', 'Check pan magnet debris', 'Inspect axle seal leaks']
    }
  ];

  const filteredList = filterCategory === 'all' 
    ? maintenanceItems 
    : maintenanceItems.filter(item => item.category.toLowerCase().includes(filterCategory));

  return (
    <section id="maintenance" className="py-24 relative bg-[#05070A] overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full glass-pill text-[#00F0FF] text-xs font-mono tracking-widest uppercase">
            <Wrench className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>INTELLIGENT SERVICE PLANNING</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
            SMART MAINTENANCE
          </h2>
          <p className="text-lg text-slate-400 font-normal">
            Know what deserves attention before small wear items turn into costly repairs.
          </p>
        </div>

        {/* Filter Categories Bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-xl glass-panel border border-slate-800 space-x-2">
            {['all', 'engine', 'braking', 'drivetrain'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-5 py-2 rounded-lg text-xs font-mono uppercase transition-all ${
                  filterCategory === cat
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Maintenance Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {filteredList.map((item) => (
            <div 
              key={item.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-[#00F0FF]/40 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono uppercase border border-slate-700">
                    {item.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    item.urgency === 'high' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {item.status} ({item.dueInKm.toLocaleString()} KM)
                  </span>
                </div>

                <h3 className="text-xl font-display font-extrabold text-white">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {item.description}
                </p>

                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">CHECKLIST ITEMS:</p>
                  {item.tasks.map((task, tIdx) => (
                    <div key={tIdx} className="flex items-center space-x-2 text-xs text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">INTERVAL: {item.interval}</span>
                <button
                  onClick={() => onAskMaintenanceQuestion(`What is involved in ${item.title} for my car?`)}
                  className="text-xs font-semibold text-[#00F0FF] hover:underline flex items-center space-x-1"
                >
                  <span>ASK VAYRA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Universal Disclaimer Box */}
        <div className="max-w-3xl mx-auto mt-12 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs font-mono text-slate-400">
          *Note: Maintenance intervals presented are general guidelines. Actual service timing depends on specific manufacturer guidelines, vehicle condition, mileage, and driving environment.*
        </div>

      </div>
    </section>
  );
}
