import { useState } from "react";

export default function CustomIrc({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [connected, setConnected] = useState(false);
  const [nick, setNick] = useState("SohbetGo_" + Math.floor(Math.random() * 999));

  // Kendi sunucun: irc.sohbetgo.net
  // Kanal: #genel
  const kiwiUrl = `https://kiwiirc.com/nextclient/irc.sohbetgo.net/?nick=${nick}&channels=%23genel`;

  if (connected) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-slate-950">
        <div className="p-2 bg-slate-900 border-b border-white/5 flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-400">irc.sohbetgo.net</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConnected(false)} className="text-xs text-slate-400 hover:text-white">← Bağlantıyı Kes</button>
            <button onClick={() => onNavigate("chat")} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">Web Sohbet'e Dön</button>
          </div>
        </div>
        <iframe 
          src={kiwiUrl} 
          className="w-full flex-1 border-0" 
          allow="clipboard-write; autoplay"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">🌐</div>
        <h1 className="text-2xl font-bold text-white mb-2">Resmi IRC Sunucusu</h1>
        <p className="text-slate-400 text-sm mb-8">irc.sohbetgo.net adresine anında bağlanın.</p>
        
        <input 
          value={nick} 
          onChange={e => setNick(e.target.value.replace(/\s/g, ""))} 
          className="w-full p-4 bg-slate-800 rounded-xl mb-4 border border-white/5 text-white font-mono" 
          placeholder="Nick" 
        />
        
        <button 
          onClick={() => setConnected(true)} 
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/20"
        >
          Sunucuya Bağlan 🚀
        </button>
        
        <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-slate-500 uppercase tracking-widest">
          Classic IRC Protocol · SSL 6697
        </div>
      </div>
    </div>
  );
}
