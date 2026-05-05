import { useEffect, useState } from "react";
import { ROOMS } from "../data/rooms";
import { subscribeRoomStats } from "../services/chatService";
import type { Room } from "../types";

interface Props {
  activeRoom: string;
  onSelectRoom: (room: Room) => void;
  onClose?: () => void;
}

export default function RoomList({ activeRoom, onSelectRoom, onClose }: Props) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeRoomStats(setStats);
    return unsub;
  }, []);

  const filtered = ROOMS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Room[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col theme-bg-secondary border-r border-[rgb(var(--border)/0.2)] font-mono">
      <div className="px-3 py-3 border-b border-[rgb(var(--border)/0.2)] bg-[rgb(var(--bg-primary)/0.6)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg theme-accent-gradient flex items-center justify-center text-base shadow-lg shadow-[rgb(var(--accent-from)/0.3)]">
              💬
            </div>
            <div>
              <h2 className="theme-text-primary font-bold text-[13px] leading-tight">
                SohbetGo
              </h2>
              <p className="text-[10px] text-emerald-400 leading-tight">
                irc.sohbetgo.net
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden w-7 h-7 rounded hover:bg-[rgb(var(--text-primary)/0.05)] flex items-center justify-center theme-text-secondary"
              aria-label="Kapat"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 text-[11px] select-none">
            /list
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder=""
            className="w-full pl-12 pr-2 py-1.5 theme-bg-secondary border border-[rgb(var(--border)/0.2)] focus:border-emerald-500 rounded text-[12px] theme-text-primary placeholder-slate-600 outline-none font-mono"
          />
        </div>
      </div>

      <div className="px-3 py-1.5 text-[9px] theme-text-secondary opacity-50 uppercase tracking-widest select-none border-b border-[rgb(var(--border)/0.1)]">
        # KANALLAR
      </div>

      <div className="flex-1 overflow-y-auto py-1 text-[12.5px]">
        {Object.entries(grouped).map(([category, rooms]) => (
          <div key={category} className="mb-2">
            <h3 className="text-[9px] font-bold theme-text-secondary uppercase tracking-widest px-3 py-1 select-none">
              ── {category} ──
            </h3>
            <div>
              {rooms.map((room) => {
                const isActive = activeRoom === room.id;
                const count = stats[room.id] || 0;
                return (
                  <button
                    key={room.id}
                    onClick={() => onSelectRoom(room)}
                    title={room.description}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition group ${
                      isActive
                        ? "bg-[rgb(var(--accent-from)/0.1)] border-l-2 border-[rgb(var(--accent-from))]"
                        : "hover:bg-[rgb(var(--text-primary)/0.05)] border-l-2 border-transparent"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{room.icon}</span>
                    <span
                      className={`font-bold truncate flex-1 ${
                        isActive
                          ? "theme-text-primary"
                          : "theme-text-secondary group-hover:theme-text-primary"
                      }`}
                    >
                      #{room.id}
                    </span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] tabular-nums px-1.5 rounded ${
                          isActive
                            ? "bg-[rgb(var(--accent-from)/0.2)] theme-text-primary"
                            : "bg-[rgb(var(--text-secondary)/0.1)] theme-text-secondary group-hover:theme-text-primary"
                        }`}
                      >
                        [{count}]
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-600 text-[11px] py-6">
            * Kanal bulunamadı
          </div>
        )}
      </div>
    </div>
  );
}
