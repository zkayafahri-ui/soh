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
  const [activeRoom, setActiveRoom] = useState<Room>(() => {
    return ROOMS.find((r) => r.id === initialRoomId) || ROOMS[0];
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (initialRoomId) {
      const r = ROOMS.find((rr) => rr.id === initialRoomId);
      if (r) setActiveRoom(r);
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
    setActiveRoom(room);
    setSidebarOpen(false);
  };

  const handleSelectNick = (nick: string) => {
    window.dispatchEvent(new CustomEvent("sohbetgo:mention", { detail: nick }));
    setUsersOpen(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] h-[calc(100dvh-4rem)] w-full overflow-hidden bg-slate-950 text-white flex">
      {/* SOL BAR — Kanallar (Desktop) */}
      <aside className="hidden lg:flex w-60 flex-shrink-0">
        <RoomList activeRoom={activeRoom.id} onSelectRoom={handleSelectRoom} />
      </aside>

      {/* SOL BAR — Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 animate-in slide-in-from-left">
            <RoomList
              activeRoom={activeRoom.id}
              onSelectRoom={handleSelectRoom}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ORTA — Sohbet */}
      <main className="flex-1 min-w-0 h-full">
        <ChatRoom
          room={activeRoom}
          uid={user.uid}
          username={user.username}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenUsers={() => setUsersOpen(true)}
          onLogout={handleLogout}
        />
      </main>

      {/* SAĞ BAR — Desktop tam görünüm (xl ve üzeri) */}
      <aside className="hidden xl:flex w-64 2xl:w-72 flex-shrink-0">
        <UserList
          room={activeRoom}
          currentUid={user.uid}
          onSelectNick={handleSelectNick}
        />
      </aside>

      {/* SAĞ BAR — Tablet kompakt (md - xl arası) */}
      <aside className="hidden md:flex xl:hidden w-[110px] flex-shrink-0">
        <UserListCompact
          room={activeRoom}
          currentUid={user.uid}
          onSelectNick={handleSelectNick}
          onExpand={() => setUsersOpen(true)}
        />
      </aside>

      {/* SAĞ BAR — Mobile drawer (md altında, sadece butonla açılır) */}
      {usersOpen && (
        <>
          <div
            className="xl:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setUsersOpen(false)}
          />
          <aside className="xl:hidden fixed right-0 top-0 bottom-0 w-72 max-w-[80vw] z-50 animate-in slide-in-from-right shadow-2xl shadow-black/50">
            <UserList
              room={activeRoom}
              currentUid={user.uid}
              onClose={() => setUsersOpen(false)}
              onSelectNick={handleSelectNick}
            />
          </aside>
        </>
      )}

      {/* 💌 ÖZEL MESAJ PENCERELERİ */}
      <PrivateChatManager myUid={user.uid} myUsername={user.username} />
    </div>
  );
}
