import React, { useState, useEffect, useRef } from 'react';
import { db, ref, push, set, onValue, onChildAdded, off, get } from './firebase';

// Interfaces for our state and data
interface Message {
  id: string;
  sender: string;
  recipient?: string; 
  text: string;
  time: string;
  roomId?: string; 
  isMe?: boolean;
  avatar?: string;
  isDm?: boolean;
}

interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  keywords: string;
  date: string;
}

const INITIAL_ROOMS: Room[] = [
  { id: 'genel', name: 'Genel Sohbet', description: 'Yeni insanlarla tanışın ve hemen sohbet etmeye başlayın.', icon: '💬', category: 'Sohbet' },
  { id: 'oyun', name: 'Oyun & Botlar', description: 'Oyun botu ve @NoMercy koruma botunun aktif olduğu eğlence odası.', icon: '🎮', category: 'Eğlence' },
  { id: 'müzik', name: 'Müzik & Radyo', description: 'Canlı radyomuzu dinleyin ve müzik eşliğinde sohbet edin.', icon: '🎵', category: 'Eğlence' },
  { id: 'mobil', name: 'Mobil Chat', description: 'Cep telefonları ile hızlı ve kesintisiz mobil sohbet.', icon: '📱', category: 'Mobil' },
  { id: 'seviyeli', name: 'Seviyeli Sohbet', description: 'Saygı ve seviye çerçevesinde elit sohbet odası.', icon: '🤝', category: 'Sohbet' },
  { id: 'ask', name: 'Aşk & Arkadaşlık', description: 'Yeni dostluklar ve romantik ilişkiler kurun.', icon: '❤️', category: 'Arkadaşlık' },
  { id: 'teknoloji', name: 'Teknoloji Odası', description: 'Web, yazılım, Firebase ve Cloudflare konuşun.', icon: '💻', category: 'Bilgi' }
];

const AVATARS = ['😎', '🤖', '🦊', '🐱', '🐼', '🦄', '🦁', '🐸', '🐨', '🦖'];

const ARTICLES_DATA: Article[] = [
  {
    id: 1,
    title: "Mobil Sohbet Odaları ile 7/24 Kesintisiz Eğlence",
    slug: "mobil-sohbet-odalari-7-24",
    excerpt: "SohbetGo.net üzerinden akıllı telefonlarınızla dilediğiniz her an mobil sohbet odalarına katılabilir ve yeni arkadaşlıklar kurabilirsiniz.",
    content: "Teknolojinin gelişmesiyle birlikte chat kültürü de büyük bir evrim geçirdi. Eskiden sadece masaüstü bilgisayarlar aracılığıyla girilebilen sohbet siteleri, günümüzde mobil sohbet sayesinde her an cebimize kadar girdi. SohbetGo.net, en yeni mobil uyumlu alt yapısıyla kullanıcılarına kesintisiz, hızlı ve donma problemi yaşamadan sohbet etme imkanı sunmaktadır.",
    keywords: "mobil sohbet, mobil chat, canlı chat, sohbetgo.net mobil",
    date: "2026-03-24"
  }
];

const RADIO_STATIONS = [
  { id: 'kralfm', name: 'Kral FM', url: 'https://dygedis.smcdn.net/8011/api/v1/stream/live' },
  { id: 'powerturk', name: 'Power Türk', url: 'https://powerapp.listenpowerapp.com/powerturk/mpeg/icecast.audio' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'sohbet' | 'makaleler' | 'hakkimizda'>('sohbet');
  const [username, setUsername] = useState<string>(() => localStorage.getItem('chat_username') || '');
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem('chat_avatar') || '😎');
  const [isRegistered, setIsRegistered] = useState<boolean>(() => !!localStorage.getItem('chat_username'));
  const [customUsername, setCustomUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('😎');

  const [openRoomIds, setOpenRoomIds] = useState<string[]>(['genel']);
  const [activeChatId, setActiveChatId] = useState<string>('genel');

  const [userLevel, setUserLevel] = useState<number>(() => Number(localStorage.getItem('chat_user_level')) || 1);
  const [userXp, setUserXp] = useState<number>(() => Number(localStorage.getItem('chat_user_xp')) || 0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [activeRadioId, setActiveRadioId] = useState('kralfm');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isRegistered || !username) return;

    const msgsRef = ref(db, 'messages');
    onChildAdded(msgsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(prev => [...prev, { id: snapshot.key || Date.now().toString(), ...data }]);
      }
    });

    const presenceRef = ref(db, `presence/${username.replace(/[.#$\[\]]/g, '_')}`);
    set(presenceRef, { nick: username, lastSeen: Date.now() });
    const presenceInterval = setInterval(() => set(presenceRef, { nick: username, lastSeen: Date.now() }), 10000);

    const allPresenceRef = ref(db, 'presence');
    onValue(allPresenceRef, (snapshot) => {
      const activeUsers: string[] = [];
      const now = Date.now();
      snapshot.forEach(child => {
        const data = child.val();
        if (data && now - data.lastSeen < 40000) activeUsers.push(data.nick);
      });
      const baseBots = ['~Sistem', '&Admin', '@NoMercy', 'Canan_Dev', 'Ecem_X', 'Mehmet88'];
      setOnlineUsers(Array.from(new Set([...baseBots, ...activeUsers])).sort());
    });

    return () => {
      clearInterval(presenceInterval);
      off(msgsRef);
      off(allPresenceRef);
    };
  }, [isRegistered, username]);

  useEffect(() => {
    localStorage.setItem('chat_user_level', userLevel.toString());
    localStorage.setItem('chat_user_xp', userXp.toString());
  }, [userLevel, userXp]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatId]);

  const handleRegisterOrIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedUsername = customUsername.trim();
    if (!typedUsername || !passwordInput) return;
    const pathSafeUsername = typedUsername.replace(/[.#$\[\]]/g, '_');
    try {
      const accountRef = ref(db, `accounts/${pathSafeUsername}`);
      const snapshot = await get(accountRef);
      if (snapshot.exists() && snapshot.val() !== passwordInput) {
        setLoginError('Hatalı şifre!');
        return;
      }
      if (!snapshot.exists()) await set(accountRef, passwordInput);
      setUsername(typedUsername);
      setAvatar(selectedAvatar);
      setIsRegistered(true);
      localStorage.setItem('chat_username', typedUsername);
      localStorage.setItem('chat_avatar', selectedAvatar);
    } catch (err) { setLoginError('Bağlantı hatası!'); }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const isDm = activeChatId.startsWith('dm:');
    const recipient = isDm ? activeChatId.substring(3) : undefined;
    push(ref(db, 'messages'), {
      sender: username,
      recipient: recipient || '',
      text: newMessage,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      roomId: isDm ? '' : activeChatId,
      avatar,
      isDm,
      timestamp: Date.now()
    });
    setNewMessage('');
    const currentXp = userXp + 25;
    if (currentXp >= userLevel * 100) {
      setUserLevel(l => l + 1);
      setUserXp(0);
    } else setUserXp(currentXp);
  };

  const switchChat = (id: string) => {
    if (!id.startsWith('dm:') && !openRoomIds.includes(id)) {
      setOpenRoomIds(prev => [...prev, id]);
    }
    setActiveChatId(id);
    setIsLeftSidebarOpen(false);
  };

  const closeRoom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (openRoomIds.length > 1) {
      const remaining = openRoomIds.filter(rid => rid !== id);
      setOpenRoomIds(remaining);
      if (activeChatId === id) setActiveChatId(remaining[remaining.length - 1]);
    }
  };

  const handleRadioToggle = () => {
    if (!audioRef.current) return;
    if (isRadioPlaying) {
      audioRef.current.pause();
      setIsRadioPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsRadioPlaying(true);
    }
  };

  const isDm = activeChatId.startsWith('dm:');
  const dmUser = isDm ? activeChatId.substring(3) : '';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <header className="bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          <h1 className="font-bold text-blue-400">SohbetGo.net</h1>
        </div>
        <nav className="flex gap-4 text-sm font-bold">
          <button onClick={() => setActiveTab('sohbet')} className={activeTab === 'sohbet' ? 'text-blue-400' : ''}>Sohbet</button>
          <button onClick={() => setActiveTab('makaleler')} className={activeTab === 'makaleler' ? 'text-blue-400' : ''}>SEO</button>
          <button onClick={() => setActiveTab('hakkimizda')} className={activeTab === 'hakkimizda' ? 'text-blue-400' : ''}>Hakkımızda</button>
        </nav>
      </header>

      {activeTab === 'sohbet' && (
        <main className="flex-1 flex overflow-hidden">
          {!isRegistered ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950">
              <form onSubmit={handleRegisterOrIdentify} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-sm space-y-4">
                <h2 className="text-xl font-bold text-center">Giriş Yap</h2>
                {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                
                <div className="flex justify-center gap-2 py-2">
                   {AVATARS.slice(0, 5).map(av => (
                     <button type="button" key={av} onClick={() => setSelectedAvatar(av)} className={`text-2xl p-1 rounded ${selectedAvatar === av ? 'bg-blue-600' : ''}`}>{av}</button>
                   ))}
                </div>

                <input type="text" required placeholder="Nick" value={customUsername} onChange={e => setCustomUsername(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700 outline-none" />
                <input type="password" required placeholder="Şifre" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700 outline-none" />
                <button type="submit" className="w-full py-2 bg-blue-600 rounded font-bold">Bağlan</button>
              </form>
            </div>
          ) : (
            <>
              <aside className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-all lg:static absolute inset-y-0 z-50 ${isLeftSidebarOpen ? 'left-0' : '-left-full'}`}>
                <div className="p-4 font-bold border-b border-slate-800 text-slate-400 text-xs uppercase">Odalar</div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {INITIAL_ROOMS.map(room => (
                    <button key={room.id} onClick={() => switchChat(room.id)} className={`w-full text-left p-2 rounded flex items-center gap-2 hover:bg-slate-800 ${activeChatId === room.id ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                      <span>{room.icon}</span> {room.name}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="flex-1 flex flex-col bg-slate-950">
                <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto no-scrollbar">
                  {openRoomIds.map(id => (
                    <div key={id} onClick={() => setActiveChatId(id)} className={`px-4 py-2 flex items-center gap-2 cursor-pointer border-r border-slate-800 min-w-[120px] transition ${activeChatId === id ? 'bg-slate-800 border-b-2 border-b-blue-500' : 'opacity-60'}`}>
                      <span className="text-xs truncate font-bold">#{INITIAL_ROOMS.find(r=>r.id===id)?.name}</span>
                      <span onClick={(e) => closeRoom(e, id)} className="hover:text-red-500 text-xs">×</span>
                    </div>
                  ))}
                </div>

                {activeChatId === 'müzik' && (
                  <div className="p-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <audio ref={audioRef} src={RADIO_STATIONS.find(s => s.id === activeRadioId)?.url} />
                    <select value={activeRadioId} onChange={e => setActiveRadioId(e.target.value)} className="bg-slate-800 text-xs p-1 rounded">
                      {RADIO_STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={handleRadioToggle} className="text-xs bg-blue-600 px-3 py-1 rounded font-bold">
                      {isRadioPlaying ? 'Durdur' : 'Radyo Dinle'}
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.filter(m => isDm ? (m.isDm && ((m.sender === username && m.recipient === dmUser) || (m.sender === dmUser && m.recipient === username))) : (!m.isDm && m.roomId === activeChatId)).map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.sender === username ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-slate-500 uppercase">
                        <span>{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <div className={`p-2 rounded-lg max-w-[80%] break-words text-sm ${m.sender === username ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Mesaj yaz..." className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                  <button type="submit" className="bg-blue-600 px-6 py-2 rounded-lg font-bold">Gönder</button>
                </form>
              </div>

            <aside className="w-64 bg-slate-900 border-l border-slate-800 overflow-y-auto block h-full">
              <div className="p-4 font-bold border-b border-slate-800 text-slate-400 text-xs uppercase">Kullanıcılar ({onlineUsers.length})</div>
              <div className="p-2 space-y-1">
                {onlineUsers.map(u => (
                  <div key={u} onClick={() => switchChat(`dm:${u}`)} className="p-2 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center group">
                    <span className="text-sm font-mono tracking-wide">{u}</span>
                    <span className="text-[10px] bg-blue-600/10 text-blue-400 px-1 rounded opacity-0 group-hover:opacity-100 uppercase font-bold">Özel</span>
                  </div>
                ))}
              </div>
            </aside>
            </>
          )}
        </main>
      )}

      {activeTab === 'makaleler' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto">
          {ARTICLES_DATA.map(a => (
            <article key={a.id} className="mb-8">
              <h2 className="text-2xl font-bold text-blue-400 mb-2">{a.title}</h2>
              <p className="text-slate-400 text-sm mb-4 italic">{a.date} - {a.keywords}</p>
              <div className="text-slate-300 leading-relaxed">{a.content}</div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'hakkimizda' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold">SohbetGo.net</h2>
          <p className="text-slate-400">Firebase ve Cloudflare destekli, modern webchat platformu.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">⚡ Hızlı</div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">🛡️ Güvenli</div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">📱 Mobil Uyumlu</div>
          </div>
        </div>
      )}
    </div>
  );
}
