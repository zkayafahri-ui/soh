import { useEffect, useState } from "react";
import Login from "../components/Login";
import RoomList from "../components/RoomList";
import ChatRoom from "../components/ChatRoom";
import UserList from "../components/UserList";
import UserListCompact from "../components/UserListCompact";
import PrivateChatManager from "../components/PrivateChatManager";
import { ROOMS } from "../data/rooms";
import { getCurrentUser, logout } from "../services/chatService";
import type { Room } from "../types";

interface Props {
  initialRoomId?: string;
  onUserChange: () => void;
}

export default function ChatPage({ initialRoomId, onUserChange }: Props) {
  const [user, setUser] = useState(getCurrentUser());
  
  // Açık odaların listesi
  const [openRoomIds, setOpenRoomIds] = useState<string[]>(() => {
    const initial = initialRoomId || ROOMS[0].id;
    return [initial];
  });
  
  // Aktif odanın ID'si
  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoomId || ROOMS[0].id);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (initialRoomId && !openRoomIds.includes(initialRoomId)) {
      setOpenRoomIds(prev => [...prev, initialRoomId]);
      setActiveRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  if (!user) {
    return (
      <Login
        onLogin={() => {
          setUser(getCurrentUser());
          onUserChange();
        }}
      />
    );
  }

  const handleLogout = () => {
    if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      logout();
      setUser(null);
      onUserChange();
    }
  };

  const handleSelectRoom = (room: Room) => {
    if (!openRoomIds.includes(room.id)) {
      setOpenRoomIds(prev => [...prev, room.id]);
    }
    setActiveRoomId(room.id);
    setSidebarOpen(false);
  };

  const handleCloseTab = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (openRoomIds.length <= 1) return;
    
    const newOpenRooms = openRoomIds.filter(id => id !== roomId);
    setOpenRoomIds(newOpenRooms);
    
    if (activeRoomId === roomId) {
      setActiveRoomId(newOpenRooms[newOpenRooms.length - 1]);
    }
  };

  const handleSelectNick = (nick: string) => {
    window.dispatchEvent(new CustomEvent("sohbetgo:mention", { detail: nick }));
    setUsersOpen(false);
  };

  const activeRoom = ROOMS.find(r => r.id === activeRoomId) || ROOMS[0];

  return (
    <div className="h-[calc(100vh-4rem)] h-[calc(100dvh-4rem)] w-full overflow-hidden bg-slate-950 text-white flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* SOL BAR — Kanallar (Desktop) */}
        <aside className="hidden lg:flex w-60 flex-shrink-0">
          <RoomList activeRoom={activeRoomId} onSelectRoom={handleSelectRoom} />
        </aside>

        {/* SOL BAR — Mobile Drawer */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 animate-in slide-in-from-left shadow-2xl">
              <RoomList
                activeRoom={activeRoomId}
                onSelectRoom={handleSelectRoom}
                onClose={() => setSidebarOpen(false)}
              />
            </aside>
          </>
        )}

        {/* ORTA — Sohbet ve Sekmeler */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-white/5">
          {/* SEKME BARI */}
          <div className="flex items-center bg-slate-900/50 border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
            {openRoomIds.map(id => {
              const r = ROOMS.find(room => room.id === id);
              if (!r) return null;
              const isActive = activeRoomId === id;
              return (
                <div
                  key={id}
                  onClick={() => setActiveRoomId(id)}
                  className={`group relative flex items-center h-10 px-4 gap-2 cursor-pointer transition-all border-r border-white/5 min-w-[120px] max-w-[180px] shrink-0 ${
                    isActive 
                      ? "bg-slate-950 text-emerald-400 font-bold" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/80"
                  }`}
                >
                  <span className="text-xs truncate font-mono">#{id}</span>
                  {openRoomIds.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(e, id)}
                      className={`ml-auto w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                        isActive ? "hover:bg-emerald-500/20" : "hover:bg-white/10 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      ✕
                    </button>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  )}
                </div>
              );
            })}
          </div>

          <main className="flex-1 min-w-0 h-full overflow-hidden">
            <ChatRoom
              room={activeRoom}
              uid={user.uid}
              username={user.username}
              onOpenSidebar={() => setSidebarOpen(true)}
              onOpenUsers={() => setUsersOpen(true)}
              onLogout={handleLogout}
            />
          </main>
        </div>

        {/* SAĞ BAR — Desktop Tam Görünüm (xl+) */}
        <aside className="hidden xl:flex w-64 2xl:w-72 flex-shrink-0">
          <UserList
            room={activeRoom}
            currentUid={user.uid}
            onSelectNick={handleSelectNick}
          />
        </aside>

        {/* SAĞ BAR — Tablet Kompakt (md - xl) */}
        <aside className="hidden md:flex xl:hidden w-[110px] flex-shrink-0">
          <UserListCompact
            room={activeRoom}
            currentUid={user.uid}
            onSelectNick={handleSelectNick}
            onExpand={() => setUsersOpen(true)}
          />
        </aside>

        {/* SAĞ BAR — Mobile Drawer (md altı) */}
        {usersOpen && (
          <>
            <div
              className="xl:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setUsersOpen(false)}
            />
            <aside className="xl:hidden fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 animate-in slide-in-from-right shadow-2xl shadow-black/50">
              <UserList
                room={activeRoom}
                currentUid={user.uid}
                onClose={() => setUsersOpen(false)}
                onSelectNick={handleSelectNick}
              />
            </aside>
          </>
        )}
      </div>
      
      {/* 💌 ÖZEL MESAJ PENCERELERİ */}
      <PrivateChatManager myUid={user.uid} myUsername={user.username} />
    </div>
  );
}
