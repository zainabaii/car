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
    <section id="maintenance" className="py-24 relative bg-[#F7FAFC] overflow-hidden border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>INTELLIGENT SERVICE PLANNING</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            SMART MAINTENANCE
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Know what deserves attention before small wear items turn into costly repairs.
          </p>
        </div>

        {/* Filter Categories Bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#DCE8F5] shadow-sm space-x-2">
            {['all', 'engine', 'braking', 'drivetrain'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-5 py-2 rounded-xl text-xs font-mono uppercase transition-all ${
                  filterCategory === cat
                    ? 'bg-[#EEF6FF] text-[#0B5ED7] border border-[#C4DCF5] font-bold shadow-sm'
                    : 'text-slate-600 hover:text-[#10233F] hover:bg-slate-50'
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
              className="bg-white p-6 rounded-2xl border border-[#DCE8F5] shadow-xl hover:border-[#C4DCF5] transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-[#F8FAFC] text-slate-700 text-[10px] font-mono uppercase font-bold border border-[#E2E8F0]">
                    {item.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    item.urgency === 'high' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {item.status} ({item.dueInKm.toLocaleString()} KM)
                  </span>
                </div>

                <h3 className="text-xl font-display font-extrabold text-[#10233F]">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {item.description}
                </p>

                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">CHECKLIST ITEMS:</p>
                  {item.tasks.map((task, tIdx) => (
                    <div key={tIdx} className="flex items-center space-x-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5ED7] shrink-0" />
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-medium">INTERVAL: {item.interval}</span>
                <button
                  onClick={() => onAskMaintenanceQuestion(`What is involved in ${item.title} for my car?`)}
                  className="text-xs font-bold text-[#0B5ED7] hover:text-[#2563EB] hover:underline flex items-center space-x-1"
                >
                  <span>ASK VAYRA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Universal Disclaimer Box */}
        <div className="max-w-3xl mx-auto mt-12 p-4 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] text-center text-xs font-mono text-slate-600">
          *Note: Maintenance intervals presented are general guidelines. Actual service timing depends on specific manufacturer guidelines, vehicle condition, mileage, and driving environment.*
        </div>

      </div>
    </section>
  );
}
