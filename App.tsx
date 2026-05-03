import React, { useState, useEffect, useRef } from 'react';
import { db, ref, push, set, onValue, onChildAdded, off, get } from './firebase';

interface Message {
  id: string;
  sender: string;
  recipient?: string; 
  text: string;
  time: string;
  roomId?: string; 
  isDm?: boolean;
}

const INITIAL_ROOMS = [
  { id: 'genel', name: 'Genel Sohbet', icon: '💬' },
  { id: 'oyun', name: 'Oyun & Botlar', icon: '🎮' },
  { id: 'müzik', name: 'Müzik & Radyo', icon: '🎵' },
  { id: 'teknoloji', name: 'Teknoloji Odası', icon: '💻' }
];

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('chat_username') || '');
  const [isRegistered, setIsRegistered] = useState(() => !!localStorage.getItem('chat_username'));
  const [customUsername, setCustomUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [openRoomIds, setOpenRoomIds] = useState<string[]>(['genel']);
  const [activeChatId, setActiveChatId] = useState<string>('genel');
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isRegistered || !username) return;
    const msgsRef = ref(db, 'messages');
    onChildAdded(msgsRef, (snap) => {
      if (snap.exists()) setMessages(prev => [...prev, { id: snap.key!, ...snap.val() }]);
    });
    const presenceRef = ref(db, `presence/${username.replace(/[.#$\[\]]/g, '_')}`);
    set(presenceRef, { nick: username, lastSeen: Date.now() });
    const presenceInterval = setInterval(() => set(presenceRef, { nick: username, lastSeen: Date.now() }), 10000);
    const allPresenceRef = ref(db, 'presence');
    onValue(allPresenceRef, (snap) => {
      const active: string[] = [];
      snap.forEach(c => { if (Date.now() - c.val().lastSeen < 40000) active.push(c.val().nick); });
      setOnlineUsers(Array.from(new Set(['~Sistem', '&Admin', '@NoMercy', ...active])).sort());
    });
    return () => { off(msgsRef); off(allPresenceRef); clearInterval(presenceInterval); };
  }, [isRegistered, username]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChatId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const typed = customUsername.trim();
    if (!typed || !passwordInput) return;
    try {
      const snap = await get(ref(db, `accounts/${typed.replace(/[.#$\[\]]/g, '_')}`));
      if (snap.exists() && snap.val() !== passwordInput) { setLoginError('Hatalı şifre!'); return; }
      if (!snap.exists()) await set(ref(db, `accounts/${typed.replace(/[.#$\[\]]/g, '_')}`), passwordInput);
      setUsername(typed);
      setIsRegistered(true);
      localStorage.setItem('chat_username', typed);
    } catch (err) { setLoginError('Bağlantı hatası!'); }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const isDmChat = activeChatId.startsWith('dm:');
    push(ref(db, 'messages'), {
      sender: username,
      recipient: isDmChat ? activeChatId.substring(3) : '',
      text: newMessage,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      roomId: isDmChat ? '' : activeChatId,
      isDm: isDmChat,
      timestamp: Date.now()
    });
    setNewMessage('');
  };

  const switchChat = (id: string) => {
    if (!id.startsWith('dm:') && !openRoomIds.includes(id)) setOpenRoomIds(prev => [...prev, id]);
    setActiveChatId(id);
  };

  const closeRoom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (openRoomIds.length > 1) {
      const rem = openRoomIds.filter(rid => rid !== id);
      setOpenRoomIds(rem);
      if (activeChatId === id) setActiveChatId(rem[rem.length - 1]);
    }
  };

  const isDm = activeChatId.startsWith('dm:');
  const dmUser = isDm ? activeChatId.substring(3) : '';

  if (!isRegistered) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-sm space-y-4 shadow-2xl">
        <h2 className="text-blue-400 text-2xl font-black text-center tracking-tighter italic uppercase">SohbetGo.net</h2>
        {loginError && <p className="text-red-500 text-xs text-center font-bold bg-red-500/10 p-2 rounded">{loginError}</p>}
        <input type="text" required placeholder="Nick" value={customUsername} onChange={e => setCustomUsername(e.target.value)} className="w-full p-3 bg-slate-800 text-white rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all" />
        <input type="password" required placeholder="Şifre" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-3 bg-slate-800 text-white rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all" />
        <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg active:scale-95 transition-all">Giriş Yap</button>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4 shrink-0 shadow-md">
        <div className="font-black text-blue-400 text-xl tracking-tighter italic">SohbetGo</div>
        <div className="text-[10px] font-black bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/30 uppercase tracking-widest">{username}</div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-52 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 hidden md:flex">
          <div className="p-4 text-[10px] font-black text-slate-500 uppercase border-b border-slate-800 tracking-widest">Kanallar</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {INITIAL_ROOMS.map(r => (
              <button key={r.id} onClick={() => switchChat(r.id)} className={`w-full text-left p-2.5 rounded-xl text-sm transition-all duration-200 ${activeChatId === r.id ? 'bg-blue-600 text-white font-bold shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                <span className="mr-2">{r.icon}</span> {r.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0 no-scrollbar">
            {openRoomIds.map(id => (
              <div key={id} onClick={() => setActiveChatId(id)} className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-r border-slate-800 min-w-[140px] transition-all duration-300 ${activeChatId === id ? 'bg-slate-800 border-b-2 border-b-blue-500 text-blue-400' : 'opacity-40 hover:opacity-100'}`}>
                <span className="text-xs truncate font-black uppercase">#{INITIAL_ROOMS.find(r=>r.id===id)?.name}</span>
                <span onClick={(e) => closeRoom(e, id)} className="hover:text-red-500 text-base font-bold ml-auto leading-none">×</span>
              </div>
            ))}
            {isDm && (
               <div className="px-4 py-3 flex items-center gap-3 cursor-pointer border-r border-slate-800 bg-slate-800 border-b-2 border-b-blue-500 min-w-[140px] text-blue-400">
                 <span className="text-xs truncate font-black uppercase">@{dmUser}</span>
               </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.filter(m => isDm ? (m.isDm && ((m.sender === username && m.recipient === dmUser) || (m.sender === dmUser && m.recipient === username))) : (!m.isDm && m.roomId === activeChatId)).map((m, i) => (
              <div key={i} className={`flex flex-col ${m.sender === username ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] font-black text-slate-500 mb-1 uppercase font-mono tracking-tighter opacity-70">{m.sender} • {m.time}</span>
                <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${m.sender === username ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={isDm ? `@${dmUser} kişisine mesaj yaz...` : 'Bir şeyler yazın...'} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 outline-none focus:border-blue-500 text-sm shadow-inner transition-all" />
            <button type="submit" className="bg-blue-600 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 shadow-xl active:scale-95 transition-all">GÖNDER</button>
          </form>
        </main>

        <aside className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 hidden lg:flex">
          <div className="p-4 text-[10px] font-black text-slate-500 uppercase border-b border-slate-800 tracking-widest">Online ({onlineUsers.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {onlineUsers.map(u => (
              <div key={u} onClick={() => switchChat(`dm:${u}`)} className="p-2.5 rounded-xl hover:bg-slate-800 cursor-pointer flex justify-between items-center group transition-all duration-200">
                <span className={`text-xs font-mono font-bold truncate ${u.startsWith('~') ? 'text-yellow-500' : u.startsWith('&') ? 'text-purple-500' : u.startsWith('@') ? 'text-red-500' : 'text-slate-300'}`}>{u}</span>
                <span className="text-[8px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 uppercase font-black tracking-widest shadow-sm">DM</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
