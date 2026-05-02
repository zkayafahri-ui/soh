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
    <div className="h-full flex flex-col bg-slate-950 border-r border-white/5 font-mono">
      <div className="px-3 py-2.5 border-b border-white/5 bg-slate-900/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base shadow-lg shadow-indigo-500/30">
              💬
            </div>
            <div>
              <h2 className="text-white font-bold text-[13px] leading-tight">
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
              className="lg:hidden w-7 h-7 rounded hover:bg-white/5 flex items-center justify-center text-slate-400"
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
            className="w-full pl-12 pr-2 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded text-[12px] text-white placeholder-slate-600 outline-none font-mono"
          />
        </div>
      </div>

      <div className="px-3 py-1 text-[9px] text-slate-600 uppercase tracking-wider select-none border-b border-white/5">
        # KANALLAR
      </div>

      <div className="flex-1 overflow-y-auto py-1 text-[12.5px]">
        {Object.entries(grouped).map(([category, rooms]) => (
          <div key={category} className="mb-2">
            <h3 className="text-[9px] font-bold text-slate-600 uppercase tracking-wider px-2 py-1 select-none">
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
                    className={`w-full text-left px-2 py-1 flex items-center gap-1.5 transition group ${
                      isActive
                        ? "bg-emerald-500/10 border-l-2 border-emerald-400"
                        : "hover:bg-white/5 border-l-2 border-transparent"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{room.icon}</span>
                    <span
                      className={`font-bold truncate flex-1 ${
                        isActive
                          ? "text-emerald-300"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      #{room.id}
                    </span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] tabular-nums px-1.5 rounded ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "text-slate-500 group-hover:text-emerald-400"
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
