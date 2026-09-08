import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, AlertTriangle, ShieldCheck, Cpu, Car, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AiChatSection({ activeVehicle, initialPrompt }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'vayra',
      badge: 'VAYRA AI',
      text: `Hello! I am VAYRA — your AI Car Care Agent. ${
        activeVehicle ? `I have connected your ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.engine}) to our session.` : 'Ask me anything about maintenance, repairs, fuel efficiency, or nearby workshops.'
      }`,
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgentBadge, setActiveAgentBadge] = useState('ORCHESTRATOR');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickSymptoms = [
    "My car is shaking when I accelerate",
    "Why is my engine overheating?",
    "When should I service my car?",
    "Find a workshop near me"
  ];

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          vehicle: activeVehicle,
          conversation: messages.slice(-4)
        })
      });

      const data = await response.json();

      if (data.success) {
        setActiveAgentBadge(data.agent?.badge || 'CARE AGENT');
        const vayraMsg = {
          id: `vayra-${Date.now()}`,
          sender: 'vayra',
          badge: data.agent?.badge || 'VAYRA AI',
          agentName: data.agent?.name || 'VAYRA Co-Pilot',
          text: data.reply,
          provider: data.provider,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, vayraMsg]);
      } else {
        throw new Error(data.message || 'Error processing response');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'vayra',
        badge: 'SYSTEM NOTICE',
        text: "Operating in offline expert mode. " + (err.message || "Please try again."),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section id="ai-care" className="py-24 relative bg-gradient-to-b from-white via-[#EEF6FF]/60 to-[#F7FAFC] overflow-hidden border-y border-[#DCE8F5]">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C4DCF5] shadow-sm text-[#0B5ED7] text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>INTELLIGENT AI CAR CARE ASSISTANT</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#10233F] tracking-tight">
            MEET YOUR <span className="text-[#0B5ED7]">AI Car Care Agent</span>
          </h2>
          <p className="text-lg text-slate-600 font-normal">
            Ask anything about your vehicle — maintenance, repairs, fuel efficiency, or nearby workshops. Your AI assistant is always here, 24/7.
          </p>
        </div>

        {/* AI Showcase Grid: Avatar Visual on Left + Chat Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          
          {/* Left Column: AI Robot Avatar Visual Showcase (As seen in Reference Image 1) */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="glass-panel-blue p-6 rounded-3xl border border-[#C4DCF5] shadow-xl text-center space-y-5">
              
              {/* Friendly AI Avatar Image */}
              <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-tr from-[#EEF6FF] to-white p-2 border border-[#C4DCF5] shadow-inner overflow-hidden">
                <img 
                  src="/assets/vayra_light_ai_bot.jpg" 
                  alt="VAYRA Friendly 3D AI Robot Assistant Avatar" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase text-[#0B5ED7] tracking-wider">VAYRA ASSISTANT</span>
                <h3 className="text-2xl font-display font-extrabold text-[#10233F] mt-0.5">Always On 24/7</h3>
              </div>

              {/* Feature Pills */}
              <div className="space-y-2 text-xs font-medium text-slate-600 text-left">
                <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-[#DCE8F5]">
                  <Sparkles className="w-4 h-4 text-[#0B5ED7]" />
                  <span>Powered by Gemini & Groq AI</span>
                </div>
                <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-[#DCE8F5]">
                  <Car className="w-4 h-4 text-[#0B5ED7]" />
                  <span>Real-time NHTSA vehicle data</span>
                </div>
                <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-[#DCE8F5]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Smart & safe automotive advice</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Premium White Chat Interface Box */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl border border-[#C4DCF5] shadow-2xl overflow-hidden flex flex-col h-[650px]">
              
              {/* Header Bar */}
              <div className="p-5 bg-gradient-to-r from-[#EEF6FF] to-white border-b border-[#DCE8F5] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B5ED7] flex items-center justify-center text-white font-bold shadow-md">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-display font-bold text-base text-[#10233F]">VAYRA AI</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-mono font-bold border border-emerald-200 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>ONLINE</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">Specialized Agent: <span className="text-[#0B5ED7] font-bold">{activeAgentBadge}</span></p>
                  </div>
                </div>

                {activeVehicle && (
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-[#DCE8F5] text-xs font-mono text-[#10233F] shadow-sm">
                    <Car className="w-4 h-4 text-[#0B5ED7]" />
                    <span>{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-[#F8FAFC] to-white">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'vayra' && (
                      <div className="w-9 h-9 rounded-xl bg-[#0B5ED7] text-white flex items-center justify-center font-bold shrink-0 mt-1 shadow-sm">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-5 space-y-2 ${
                      msg.sender === 'user' 
                        ? 'bg-[#0B5ED7] text-white font-medium shadow-md' 
                        : 'bg-white border border-[#DCE8F5] text-[#10233F] shadow-sm'
                    }`}>
                      {msg.sender === 'vayra' && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded bg-[#EEF6FF] text-[#0B5ED7] text-[10px] font-mono uppercase font-bold border border-[#C4DCF5]">
                            {msg.badge || 'VAYRA AI'}
                          </span>
                          {msg.provider && (
                            <span className="text-[10px] font-mono text-slate-400">{msg.provider}</span>
                          )}
                        </div>
                      )}

                      <div className="text-sm leading-relaxed whitespace-pre-line font-sans">
                        {msg.text}
                      </div>

                      <div className={`text-[10px] font-mono text-right ${msg.sender === 'user' ? 'text-white/80' : 'text-slate-400'}`}>
                        {msg.time}
                      </div>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-start space-x-3 justify-start">
                    <div className="w-9 h-9 rounded-xl bg-[#0B5ED7] text-white flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#DCE8F5] text-xs font-mono text-[#0B5ED7] flex items-center space-x-2 shadow-sm">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0B5ED7]" />
                      <span>VAYRA IS THINKING & ROUTING QUERY...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Trigger Chips */}
              <div className="px-4 py-2 bg-slate-50 border-t border-[#DCE8F5] flex items-center space-x-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Quick Triggers:</span>
                {quickSymptoms.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1 rounded-full bg-white hover:bg-[#EEF6FF] border border-[#DCE8F5] text-slate-700 hover:text-[#0B5ED7] text-xs font-medium whitespace-nowrap transition-all shadow-2xs"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-4 bg-white border-t border-[#DCE8F5] flex items-center space-x-3"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-5 py-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE8F5] focus:border-[#0B5ED7] text-[#10233F] text-sm focus:outline-none focus:bg-white transition-all placeholder:text-slate-400 font-sans"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="px-6 py-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-40 transition-all flex items-center space-x-2 shrink-0"
                >
                  <span>SEND</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>

        </div>

        {/* Safety Disclaimer Banner */}
        <div className="max-w-4xl mx-auto mt-6 p-3.5 rounded-2xl bg-[#EEF6FF] border border-[#C4DCF5] text-slate-600 text-xs font-mono text-center flex items-center justify-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>VAYRA provides general automotive guidance and does not replace a qualified mechanic or physical inspection.</span>
        </div>

      </div>
    </section>
  );
}
