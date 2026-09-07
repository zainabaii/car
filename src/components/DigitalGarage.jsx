import React, { useState } from 'react';
import { Car, Activity, ShieldCheck, Clock, Gauge, Fuel, CheckCircle, Wrench } from 'lucide-react';

export default function DigitalGarage({ activeVehicle, onOpenChat }) {
  const [currentMileage, setCurrentMileage] = useState(12450);

  const vehicle = activeVehicle || {
    make: 'TOYOTA',
    model: 'COROLLA',
    year: 2021,
    vin: '1HGCM82633A004352',
    engine: '2.0L 4-CYLINDER',
    fuelType: 'GASOLINE',
    bodyClass: 'SEDAN'
  };

  const healthScore = 94;
  const nextServiceKm = 2550;

  return (
    <section id="garage" className="py-24 relative bg-[#F7FAFC] overflow-hidden border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Gauge className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>AUTOMOTIVE OS TELEMETRY</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            YOUR DIGITAL GARAGE
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Real-time digital vehicle profile, health telemetry, and service countdowns.
          </p>
        </div>

        {/* Garage Main Card */}
        <div className="max-w-5xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-[#DCE8F5] shadow-2xl space-y-8">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-0.5 rounded-full bg-[#EEF6FF] text-[#0B5ED7] text-xs font-mono font-bold border border-[#C4DCF5]">
                  VAYRA GARAGE OS
                </span>
                <span className="text-xs font-mono text-slate-500">VIN: {vehicle.vin}</span>
              </div>
              <h3 className="text-3xl font-display font-extrabold text-[#10233F] mt-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
            </div>

            {/* Mileage Control */}
            <div className="flex items-center space-x-3 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
              <Gauge className="w-5 h-5 text-[#0B5ED7]" />
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">CURRENT MILEAGE</p>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold font-mono text-[#10233F]">{currentMileage.toLocaleString()} KM</span>
                  <button
                    onClick={() => setCurrentMileage(prev => prev + 500)}
                    className="px-2.5 py-0.5 rounded bg-white hover:bg-[#EEF6FF] text-[10px] font-mono font-bold text-[#0B5ED7] border border-[#DCE8F5] transition-all"
                  >
                    +500 KM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase font-bold">HEALTH STATUS</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-display text-emerald-600">{healthScore}% GOOD</p>
              <p className="text-[11px] text-slate-500 font-mono">Sensors operational</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#0B5ED7] uppercase font-bold">NEXT SERVICE IN</span>
                <Clock className="w-4 h-4 text-[#0B5ED7]" />
              </div>
              <p className="text-2xl font-bold font-display text-[#0B5ED7]">{nextServiceKm.toLocaleString()} KM</p>
              <p className="text-[11px] text-slate-600 font-mono">Oil & Filter service due</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase font-bold">FUEL / POWER</span>
                <Fuel className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-display text-[#10233F]">{vehicle.fuelType || 'GASOLINE'}</p>
              <p className="text-[11px] text-slate-500 font-mono">{vehicle.engine || '2.0L Engine'}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase font-bold">ECU DTC FAULTS</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-display text-emerald-600">0 FAULTS</p>
              <p className="text-[11px] text-slate-500 font-mono">Clean ECU Diagnostic Scan</p>
            </div>

          </div>

          {/* Component Health Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono text-slate-500 uppercase font-bold tracking-widest">COMPONENT HEALTH MATRIX</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-xl bg-white border border-[#DCE8F5] flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">ENGINE OIL</p>
                  <p className="text-xs font-bold text-emerald-600">OPTIMAL (82%)</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DCE8F5] flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">BRAKE FLUID</p>
                  <p className="text-xs font-bold text-emerald-600">OK (GOOD)</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DCE8F5] flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">TIRE TREAD</p>
                  <p className="text-xs font-bold text-[#0B5ED7]">7.5 MM CLEARANCE</p>
                </div>
                <CheckCircle className="w-4 h-4 text-[#0B5ED7]" />
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DCE8F5] flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">BATTERY</p>
                  <p className="text-xs font-bold text-emerald-600">12.6V STABLE</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>

            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-4">
            <p className="text-xs font-mono text-slate-500">
              Need personalized advice for this vehicle?
            </p>
            <button
              onClick={() => onOpenChat(`Give me a full diagnostic check for my ${vehicle.year} ${vehicle.make} ${vehicle.model}`)}
              className="px-6 py-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center space-x-2"
            >
              <Wrench className="w-4 h-4" />
              <span>RUN FULL VAYRA DIAGNOSTIC CHECK</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
