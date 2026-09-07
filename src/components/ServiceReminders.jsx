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
    <section id="reminders" className="py-24 relative bg-[#F7FAFC] overflow-hidden border-t border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>LIFECYCLE MILESTONE TRACKER</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            NEVER MISS THE NEXT SERVICE.
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Set intelligent maintenance thresholds and receive proactive alerts before service windows expire.
          </p>
        </div>

        {/* Add Reminder CTA Bar */}
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <p className="text-xs font-mono text-slate-500 font-bold uppercase">ACTIVE SERVICE MILESTONES ({reminders.length})</p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-[#EEF6FF] border border-[#C4DCF5] text-[#0B5ED7] text-xs font-mono font-bold hover:bg-[#0B5ED7] hover:text-white transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'CANCEL' : 'ADD NEW SERVICE REMINDER'}</span>
          </button>
        </div>

        {/* Add Reminder Modal / Form */}
        {showAddForm && (
          <div className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-2xl border border-[#C4DCF5] shadow-xl animate-fade-in">
            <form onSubmit={handleAddReminder} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1">SERVICE TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spark Plug Change"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#DCE8F5] text-[#10233F] text-xs font-sans focus:outline-none focus:border-[#0B5ED7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1">TARGET DISTANCE INTERVAL</label>
                <select
                  value={newTargetKm}
                  onChange={(e) => setNewTargetKm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#DCE8F5] text-[#10233F] text-xs font-mono focus:outline-none focus:border-[#0B5ED7] focus:bg-white"
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
                  className="w-full py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
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
              className="bg-white p-5 rounded-2xl border border-[#DCE8F5] shadow-lg hover:border-[#C4DCF5] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-[#EEF6FF] border border-[#C4DCF5] flex items-center justify-center text-[#0B5ED7] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#EEF6FF] text-[#0B5ED7] text-[10px] font-mono font-bold border border-[#C4DCF5]">
                      {rem.category}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-medium">Target: {rem.targetKm}</span>
                  </div>

                  <h3 className="text-lg font-display font-extrabold text-[#10233F] mt-1">
                    {rem.title}
                  </h3>

                  <p className="text-xs font-mono text-emerald-600 font-bold mt-0.5">
                    REMAINING: <span className="font-bold">{rem.remainingKm}</span> ({rem.dueDate})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => onAskReminderQuestion(`How do I prepare for my upcoming ${rem.title}?`)}
                  className="px-3 py-2 rounded-xl bg-[#EEF6FF] hover:bg-[#0B5ED7] border border-[#C4DCF5] text-xs font-mono font-bold text-[#0B5ED7] hover:text-white transition-all flex items-center space-x-1 shadow-sm"
                >
                  <span>ASK VAYRA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer Notice */}
        <div className="max-w-3xl mx-auto mt-12 p-4 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] text-center text-xs font-mono text-slate-600">
          *Disclaimer: Actual service intervals depend on vehicle manufacturer specifications, driving style, environment, and physical mechanic inspection.*
        </div>

      </div>
    </section>
  );
}
