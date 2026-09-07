import React, { useState } from 'react';
import { Cpu, ShieldCheck, Wrench, Car, MapPin, Bell, User, ArrowRight } from 'lucide-react';

export default function AgentOrchestratorVisual({ onSelectAgentPrompt }) {
  const [activeAgentId, setActiveAgentId] = useState('car-care');

  const agents = [
    {
      id: 'vehicle-info',
      name: 'Vehicle Information Agent',
      shortName: 'Vehicle Agent',
      icon: Car,
      role: 'Vehicle Identity & Spec Specialist',
      description: 'Decodes VIN data, structural specs, factory engine options, and country of manufacture.',
      samplePrompt: 'What engine and drive configuration does my decoded VIN have?'
    },
    {
      id: 'car-care',
      name: 'Car Care Agent',
      shortName: 'Care Agent',
      icon: ShieldCheck,
      role: 'Automotive Symptom & Safety Triage',
      description: 'Analyzes user-reported noises, vibrations, leaks, overheating, and check engine triggers with safety disclaimers.',
      samplePrompt: 'My car is shaking when I accelerate past 80 km/h. What are possible causes?'
    },
    {
      id: 'maintenance',
      name: 'Maintenance Agent',
      shortName: 'Maintenance Agent',
      icon: Wrench,
      role: 'Service Interval Calculator',
      description: 'Provides customized maintenance schedules based on vehicle mileage, year, and driving severity.',
      samplePrompt: 'When should I change my synthetic engine oil and brake fluid?'
    },
    {
      id: 'workshop',
      name: 'Workshop Finder Agent',
      shortName: 'Workshop Agent',
      icon: MapPin,
      role: 'Certified Service Locator',
      description: 'Filters nearby certified workshops, specialized EV/Euro mechanics, ratings, and contact info.',
      samplePrompt: 'Find top-rated workshops specializing in brake diagnostics near me.'
    },
    {
      id: 'reminder',
      name: 'Service Reminder Agent',
      shortName: 'Reminder Agent',
      icon: Bell,
      role: 'Lifecycle Milestone Tracker',
      description: 'Schedules upcoming service reminders and alerts before interval countdowns elapse.',
      samplePrompt: 'Remind me to inspect brake pads when my vehicle hits 20,000 KM.'
    }
  ];

  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[1];

  return (
    <section id="orchestrator" className="py-24 relative bg-[#F7FAFC] overflow-hidden border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>AGENTIC AI ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            ONE AI. MULTIPLE SPECIALISTS.
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            The VAYRA Orchestrator analyzes user intent in real-time and routes requests to 5 specialized AI agents.
          </p>
        </div>

        {/* Architecture Flow Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* Left Flow Chart */}
          <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-[#DCE8F5] shadow-xl space-y-6 flex flex-col justify-between">
            
            {/* Step 1: User Prompt Input */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF6FF] border border-[#C4DCF5] flex items-center justify-center text-[#0B5ED7]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-500 uppercase font-bold">Input Layer</p>
                  <p className="text-sm font-bold text-[#10233F]">USER PROMPT & VEHICLE CONTEXT</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#EEF6FF] text-[#0B5ED7] text-[10px] font-mono font-bold border border-[#C4DCF5]">
                STEP 01
              </span>
            </div>

            {/* Down Arrow */}
            <div className="flex justify-center -my-3">
              <div className="w-0.5 h-6 bg-[#0B5ED7]"></div>
            </div>

            {/* Step 2: Orchestrator Core */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EEF6FF] to-white border border-[#C4DCF5] text-center space-y-1.5 shadow-sm">
              <span className="px-3 py-0.5 rounded-full bg-[#0B5ED7] text-white font-mono font-bold text-[10px] uppercase">
                VAYRA ORCHESTRATOR
              </span>
              <p className="text-sm font-bold text-[#10233F] font-display">INTENT CLASSIFICATION & AGENT ROUTING</p>
            </div>

            {/* Down Arrow */}
            <div className="flex justify-center -my-3">
              <div className="w-0.5 h-6 bg-[#0B5ED7]"></div>
            </div>

            {/* Step 3: 5 Specialized Agent Nodes */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-slate-500 uppercase font-bold text-center">SELECT SPECIALIZED AGENT</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {agents.map((ag) => {
                  const IconComp = ag.icon;
                  const isSelected = ag.id === activeAgentId;
                  return (
                    <button
                      key={ag.id}
                      onClick={() => setActiveAgentId(ag.id)}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                        isSelected 
                          ? 'bg-[#0B5ED7] text-white border-[#0B5ED7] shadow-md scale-105' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-700 hover:bg-[#EEF6FF]'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                      <span className="text-[10px] font-mono font-bold uppercase leading-tight">{ag.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Inspector Column */}
          <div className="lg:col-span-5">
            <div className="glass-panel-blue p-8 rounded-3xl border border-[#C4DCF5] shadow-xl h-full flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B5ED7] flex items-center justify-center text-white shadow-md">
                    <activeAgent.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded bg-white text-[#0B5ED7] text-[10px] font-mono uppercase font-bold border border-[#C4DCF5]">
                      SPECIALIZED AGENT
                    </span>
                    <h3 className="text-xl font-display font-extrabold text-[#10233F] mt-1">
                      {activeAgent.name}
                    </h3>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#DCE8F5] space-y-2 shadow-sm">
                  <p className="text-xs font-mono text-slate-500 uppercase font-bold">PRIMARY ROLE</p>
                  <p className="text-sm font-bold text-[#10233F]">{activeAgent.role}</p>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{activeAgent.description}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] space-y-1 font-mono text-xs">
                  <p className="text-[10px] text-[#0B5ED7] uppercase font-bold">EXAMPLE QUERY</p>
                  <p className="text-slate-700 italic">"{activeAgent.samplePrompt}"</p>
                </div>
              </div>

              <button
                onClick={() => onSelectAgentPrompt(activeAgent.samplePrompt)}
                className="w-full py-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>TEST THIS AGENT WITH PROMPT</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
