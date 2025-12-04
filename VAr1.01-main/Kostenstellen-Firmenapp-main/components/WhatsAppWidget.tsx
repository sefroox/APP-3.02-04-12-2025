
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon, Paperclip, Mic, AlertTriangle, CheckCircle } from 'lucide-react';
import { AgentMessage } from '../types';

interface WhatsAppWidgetProps {
  messages: AgentMessage[];
  onSendMessage: (text: string) => void;
  isTyping?: boolean;
  isConnected?: boolean; // NEW: Prop to show real connection status
}

const WhatsAppWidget: React.FC<WhatsAppWidgetProps> = ({ messages, onSendMessage, isTyping, isConnected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-[#efeae2] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-up origin-bottom-right">
          {/* Header */}
          <div className="bg-[#075e54] p-3 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center relative">
                  {isConnected ? (
                      <div className="bg-green-100 w-full h-full rounded-full flex items-center justify-center">
                         <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                  ) : (
                      <Bot className="w-6 h-6 text-[#075e54]" />
                  )}
                  {isConnected && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#075e54] rounded-full"></span>}
               </div>
               <div>
                 <h3 className="font-bold text-sm">{isConnected ? 'NexGen Bot (WhatsApp)' : 'NexGen AI Assistant'}</h3>
                 <p className="text-[10px] text-white/80 flex items-center">
                    {isConnected ? 'Gekoppelt mit +43 664...' : 'Online • Web Simulation'}
                 </p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-10">
             {!isConnected && (
                <div className="text-center text-xs text-slate-500 my-2 bg-[#e1f3fb] inline-block px-2 py-1 rounded mx-auto w-full shadow-sm">
                    Simulationsmodus. Verbinden Sie WhatsApp im System-Menü für echte Nachrichten.
                </div>
             )}
             <div className="text-center text-xs text-slate-500 my-2 bg-[#e1f3fb] inline-block px-2 py-1 rounded mx-auto w-full shadow-sm">
                🔒 Nachrichten sind Ende-zu-Ende verschlüsselt.
             </div>
             
             {messages.map((msg) => {
               const isError = msg.text.includes('Error') || msg.text.includes('Fehler');
               return (
               <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm relative ${
                      msg.sender === 'user' ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 
                      isError ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none' : 
                      'bg-white text-slate-800 rounded-tl-none'
                  }`}>
                     {isError && <AlertTriangle className="w-4 h-4 inline mr-1 mb-0.5" />}
                     {msg.text}
                     <span className="text-[9px] opacity-60 block text-right mt-1">
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                  </div>
               </div>
             )})}

             {isTyping && (
               <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1">
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-[#f0f0f0] p-2 flex items-center space-x-2">
             <button className="text-slate-500 p-2 hover:bg-slate-200 rounded-full"><Paperclip size={20} /></button>
             <form onSubmit={handleSend} className="flex-1 flex items-center bg-white rounded-full px-4 py-2 border border-slate-300">
                <input 
                  type="text" 
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="Nachricht schreiben..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                />
             </form>
             {input.trim() ? (
                 <button onClick={() => handleSend()} className="bg-[#075e54] text-white p-2 rounded-full hover:bg-[#128c7e] transition-colors">
                    <Send size={18} className="ml-0.5" />
                 </button>
             ) : (
                 <button className="text-slate-500 p-2 hover:bg-slate-200 rounded-full">
                    <Mic size={20} />
                 </button>
             )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 group ${isConnected ? 'bg-[#25D366] hover:bg-[#20ba5a]' : 'bg-[#25D366] hover:bg-[#20ba5a]'}`}
      >
         {isOpen ? <X size={28} /> : <MessageCircle size={32} className="group-hover:rotate-12 transition-transform" />}
         
         {/* Notification Badge */}
         {!isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
         )}
      </button>
    </div>
  );
};

export default WhatsAppWidget;
