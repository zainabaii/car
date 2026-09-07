import React, { useState } from 'react';
import { Search, Car, Shield, Cpu, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Fuel, Wrench } from 'lucide-react';

export default function VinDecoder({ onVehicleDecoded, onAskVayraAboutCar }) {
  const [vinInput, setVinInput] = useState('1HGCM82633A004352');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [decodedVehicle, setDecodedVehicle] = useState({
    vin: '1HGCM82633A004352',
    make: 'TOYOTA',
    model: 'COROLLA',
    year: '2021',
    engine: '2.0L 4-Cylinder DOHC',
    fuelType: 'GASOLINE',
    bodyClass: 'SEDAN',
    transmission: 'CVT AUTOMATIC',
    driveType: 'FRONT-WHEEL DRIVE (FWD)'
  });

  const sampleVins = [
    { label: 'Toyota Corolla 2021', vin: '1HGCM82633A004352' },
    { label: 'Ford Mustang', vin: '1FA6P8CF0H5100001' },
    { label: 'BMW M3', vin: 'WBS33AY050FP12345' }
  ];

  const handleDecode = async (e) => {
    if (e) e.preventDefault();
    const cleanVin = vinInput.trim().toUpperCase();

    if (cleanVin.length !== 17) {
      setError('VIN must be exactly 17 characters long.');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStep(1);

    const timer1 = setTimeout(() => setLoadingStep(2), 500);
    const timer2 = setTimeout(() => setLoadingStep(3), 1000);

    try {
      const response = await fetch('/api/decode-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: cleanVin })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to decode VIN from NHTSA.');
      }

      const vehicle = data.vehicle;
      setDecodedVehicle(vehicle);
      if (onVehicleDecoded) onVehicleDecoded(vehicle);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with VIN Decoder service.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
    }
  };

  return (
    <section id="vehicle" className="py-24 relative bg-[#F7FAFC] overflow-hidden border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Car className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>REAL NHTSA vPIC DECODER</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            MEET YOUR VEHICLE
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Every car has a story. Start with its VIN.
          </p>
        </div>

        {/* Decoder Input Card */}
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-[#DCE8F5] shadow-xl space-y-6">
          
          <form onSubmit={handleDecode} className="space-y-4">
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 tracking-wider">
              ENTER YOUR 17-CHARACTER VIN
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <input
                  type="text"
                  maxLength={17}
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 1HGCM82633A004352"
                  className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-[#DCE8F5] focus:border-[#0B5ED7] text-[#10233F] font-mono text-base uppercase tracking-widest focus:outline-none focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  {vinInput.length}/17
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>DECODING...</span>
                  </>
                ) : (
                  <>
                    <span>DECODE VIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Sample VINs */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
            <span className="uppercase text-[11px]">Quick Samples:</span>
            <div className="flex flex-wrap gap-2">
              {sampleVins.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setVinInput(s.vin);
                    setError(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#EEF6FF] hover:bg-[#DCE8F5] text-[#0B5ED7] font-semibold text-[11px] transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="p-6 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] space-y-3 font-mono text-xs text-[#0B5ED7]">
              <div className="flex items-center space-x-3">
                <Cpu className="w-4 h-4 animate-spin" />
                <span className="uppercase tracking-widest font-bold">
                  {loadingStep === 1 && 'SCANNING VEHICLE VIN...'}
                  {loadingStep === 2 && 'IDENTIFYING VEHICLE SPECS...'}
                  {loadingStep === 3 && 'BUILDING VEHICLE PROFILE...'}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0B5ED7] transition-all duration-500"
                  style={{ width: `${(loadingStep / 3) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

        </div>

        {/* Decoded Result Card with Prominent Car Visual */}
        {decodedVehicle && (
          <div className="max-w-5xl mx-auto mt-12">
            <div className="bg-white p-8 rounded-3xl border border-[#DCE8F5] shadow-2xl space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Car Image Visual */}
                <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-[#DCE8F5] shadow-md h-64 bg-[#F8FAFC]">
                  <img 
                    src="/assets/vayra_light_hero_car.jpg" 
                    alt="Decoded Vehicle Showcase" 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Specs Column */}
                <div className="lg:col-span-7 space-y-6 text-left">
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-mono font-bold flex items-center space-x-1.5 w-max">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>VEHICLE IDENTIFIED</span>
                      </span>
                      <h3 className="text-3xl font-display font-extrabold text-[#10233F] mt-2">
                        {decodedVehicle.year} {decodedVehicle.make} {decodedVehicle.model}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 uppercase mt-0.5">VIN: {decodedVehicle.vin}</p>
                    </div>

                    <button
                      onClick={() => onAskVayraAboutCar(decodedVehicle)}
                      className="px-6 py-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center space-x-2 shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>ASK VAYRA ABOUT THIS CAR →</span>
                    </button>
                  </div>

                  {/* Spec Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">ENGINE</p>
                      <p className="text-sm font-bold text-[#10233F] mt-1">{decodedVehicle.engine || '2.0L 4-Cyl'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">FUEL TYPE</p>
                      <p className="text-sm font-bold text-[#0B5ED7] mt-1">{decodedVehicle.fuelType || 'GASOLINE'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">BODY CLASS</p>
                      <p className="text-sm font-bold text-[#10233F] mt-1">{decodedVehicle.bodyClass || 'SEDAN'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">DRIVE TYPE</p>
                      <p className="text-sm font-bold text-[#10233F] mt-1">{decodedVehicle.driveType || 'FWD'}</p>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
