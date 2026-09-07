import React, { useState } from 'react';
import { Bell, Plus, Calendar, CheckCircle2, Clock, ShieldCheck, Trash2, ArrowRight } from 'lucide-react';

export default function ServiceReminders({ onAskReminderQuestion }) {
  const [reminders, setReminders] = useState([
    {
      id: 'rem-1',
      title: 'Next Oil Service',
      targetKm: '15,000 KM',
      remainingKm: '2,550 KM',
      status: 'UPCOMING',
      category: 'Engine',
      dueDate: 'Oct 24, 2026'
    },
    {
      id: 'rem-2',
      title: 'Brake Inspection',
      targetKm: '20,000 KM',
      remainingKm: '7,550 KM',
      status: 'SCHEDULED',
      category: 'Safety',
      dueDate: 'Dec 15, 2026'
    },
    {
      id: 'rem-3',
      title: 'General Inspection',
      targetKm: '25,000 KM',
      remainingKm: '12,550 KM',
      status: 'PLANNED',
      category: 'Inspection',
      dueDate: 'Feb 10, 2027'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetKm, setNewTargetKm] = useState('5,000 KM');
  const [newCategory, setNewCategory] = useState('General Care');

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRem = {
      id: `rem-${Date.now()}`,
      title: newTitle,
      targetKm: newTargetKm,
      remainingKm: newTargetKm,
      status: 'UPCOMING',
      category: newCategory,
      dueDate: 'Next Service Period'
    };

    setReminders([newRem, ...reminders]);
    setNewTitle('');
    setShowAddForm(false);
  };

  const handleDeleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <section id="reminders" className="py-24 relative bg-[#05070A] overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full glass-pill text-[#00F0FF] text-xs font-mono tracking-widest uppercase">
            <Bell className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>LIFECYCLE MILESTONE TRACKER</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
            NEVER MISS THE NEXT SERVICE.
          </h2>
          <p className="text-lg text-slate-400 font-normal">
            Set intelligent maintenance thresholds and receive proactive alerts before service windows expire.
          </p>
        </div>

        {/* Add Reminder CTA Bar */}
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <p className="text-xs font-mono text-slate-400 uppercase">ACTIVE SERVICE MILESTONES ({reminders.length})</p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono font-bold hover:bg-[#00F0FF]/25 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'CANCEL' : 'ADD NEW SERVICE REMINDER'}</span>
          </button>
        </div>

        {/* Add Reminder Modal / Form */}
        {showAddForm && (
          <div className="max-w-4xl mx-auto mb-8 glass-panel-cyan p-6 rounded-2xl border border-[#00F0FF]/40 animate-fade-in">
            <form onSubmit={handleAddReminder} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">SERVICE TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spark Plug Change"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-sans focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">TARGET DISTANCE INTERVAL</label>
                <select
                  value={newTargetKm}
                  onChange={(e) => setNewTargetKm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
                >
                  <option value="5,000 KM">5,000 KM</option>
                  <option value="10,000 KM">10,000 KM</option>
                  <option value="15,000 KM">15,000 KM</option>
                  <option value="30,000 KM">30,000 KM</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#00F0FF] to-blue-600 text-black font-bold text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
                >
                  CREATE REMINDER
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reminders List Cards */}
        <div className="max-w-4xl mx-auto space-y-4">
          {reminders.map(rem => (
            <div
              key={rem.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-[#00F0FF]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-[#00F0FF] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] text-[10px] font-mono font-bold border border-[#00F0FF]/30">
                      {rem.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Target: {rem.targetKm}</span>
                  </div>

                  <h3 className="text-lg font-display font-extrabold text-white mt-1">
                    {rem.title}
                  </h3>

                  <p className="text-xs font-mono text-emerald-400 mt-0.5">
                    REMAINING: <span className="font-bold">{rem.remainingKm}</span> ({rem.dueDate})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => onAskReminderQuestion(`How do I prepare for my upcoming ${rem.title}?`)}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-[#00F0FF]/15 border border-slate-700 text-xs font-mono text-[#00F0FF] transition-all flex items-center space-x-1"
                >
                  <span>ASK VAYRA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-red-950/50 text-slate-500 hover:text-red-400 border border-slate-800 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer Notice */}
        <div className="max-w-3xl mx-auto mt-12 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs font-mono text-slate-400">
          *Disclaimer: Actual service intervals depend on vehicle manufacturer specifications, driving style, environment, and physical mechanic inspection.*
        </div>

      </div>
    </section>
  );
}
