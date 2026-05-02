import { useEffect, useState } from "react";
import { subscribeOnlineUsers } from "../services/chatService";
import { SYSTEM_BOT, ADMIN_BOT, NOMERCY_BOT, GAME_BOT } from "../services/bots";
import { getUserLevel } from "../services/levels";
import type { OnlineUser, Room } from "../types";

interface Props {
  room: Room;
  currentUid: string;
  onSelectNick?: (nick: string) => void;
  onExpand?: () => void;
}

const NICK_COLORS = [
  "text-red-400", "text-orange-400", "text-amber-400", "text-yellow-400",
  "text-lime-400", "text-green-400", "text-emerald-400", "text-teal-400",
  "text-cyan-400", "text-sky-400", "text-blue-400", "text-indigo-400",
  "text-violet-400", "text-purple-400", "text-fuchsia-400", "text-pink-400",
  "text-rose-400",
];

function getNickColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  return NICK_COLORS[Math.abs(hash) % NICK_COLORS.length];
}

// Statü = seviyeden hesaplanır
function getStatus(user: OnlineUser): "@" | "%" | "+" | " " {
  const lvl = getUserLevel(user.uid).level;
  if (lvl >= 7) return "@";
  if (lvl >= 5) return "%";
  if (lvl >= 3) return "+";
  return " ";
}

const SYSTEM_BOTS_C = [
  { uid: SYSTEM_BOT.uid, username: SYSTEM_BOT.username, icon: "🛡️", color: "text-violet-400", prefix: "~", prefixColor: "text-violet-400" },
];
const ADMIN_BOTS_C = [
  { uid: ADMIN_BOT.uid, username: ADMIN_BOT.username, icon: "⚙️", color: "text-amber-400", prefix: "&", prefixColor: "text-amber-400" },
];
const NOMERCY_C = { uid: NOMERCY_BOT.uid, username: NOMERCY_BOT.username, icon: "🚨", color: "text-red-400", prefix: "@", prefixColor: "text-emerald-400" };
const OYUNBOT_C = { uid: GAME_BOT.uid, username: GAME_BOT.username, icon: "🎮", color: "text-emerald-400", prefix: "@", prefixColor: "text-emerald-400" };

// OyunBot SADECE #oyun kanalında
function getOpBotsC(roomId: string) {
  return roomId === "oyun" ? [NOMERCY_C, OYUNBOT_C] : [NOMERCY_C];
}

export default function UserListCompact({
  room,
  currentUid,
  onSelectNick,
  onExpand,
}: Props) {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const unsub = subscribeOnlineUsers(room.id, setUsers);
    return unsub;
  }, [room.id]);

  const ops: OnlineUser[] = [];
  const halfOps: OnlineUser[] = [];
  const voiced: OnlineUser[] = [];
  const normals: OnlineUser[] = [];
  users.forEach((u) => {
    const s = getStatus(u);
    if (s === "@") ops.push(u);
    else if (s === "%") halfOps.push(u);
    else if (s === "+") voiced.push(u);
    else normals.push(u);
  });
  ops.sort((a, b) => a.username.localeCompare(b.username));
  halfOps.sort((a, b) => a.username.localeCompare(b.username));
  voiced.sort((a, b) => a.username.localeCompare(b.username));
  normals.sort((a, b) => a.username.localeCompare(b.username));

  const totalBots = SYSTEM_BOTS_C.length + ADMIN_BOTS_C.length + OP_BOTS_C.length;
  const totalCount = totalBots + users.length;

  const handleClick = (nick: string) => {
    if (onSelectNick) onSelectNick(nick);
    else
      window.dispatchEvent(
        new CustomEvent("sohbetgo:mention", { detail: nick })
      );
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-indigo-950/30 via-slate-950 to-purple-950/30 border-l border-indigo-500/20 font-mono text-[11.5px] overflow-hidden">
      <button
        onClick={onExpand}
        className="px-2 py-2 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 via-slate-900/60 to-purple-900/40 flex flex-col items-center gap-0.5 hover:from-indigo-800/50 hover:via-slate-800/70 hover:to-purple-800/50 transition flex-shrink-0"
        title="Tam liste"
      >
        <span className="text-emerald-300 font-bold text-[10px] flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          {totalCount}
        </span>
        <span className="text-[8px] text-slate-500 tabular-nums">online</span>
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-0.5">
        {/* ~ FOUNDER */}
        <div className="text-[8px] font-bold text-violet-400/70 px-1.5 py-0.5 select-none text-center bg-violet-500/5">
          ~
        </div>
        {SYSTEM_BOTS_C.map((b) => (
          <div
            key={b.uid}
            className="px-1 py-0.5 cursor-default flex items-center gap-0.5 hover:bg-violet-500/5"
            title={b.username + " (founder)"}
          >
            <span className={`${b.prefixColor} text-[10px] select-none flex-shrink-0 font-bold`}>~</span>
            <span className="text-[9px] flex-shrink-0">{b.icon}</span>
            <span className={`font-bold ${b.color} truncate text-[10.5px] flex-1 min-w-0`}>
              {b.username}
            </span>
          </div>
        ))}

        {/* & ADMIN */}
        <div className="text-[8px] font-bold text-amber-400/70 px-1.5 py-0.5 select-none text-center mt-0.5 bg-amber-500/5">
          &amp;
        </div>
        {ADMIN_BOTS_C.map((b) => (
          <div
            key={b.uid}
            className="px-1 py-0.5 cursor-default flex items-center gap-0.5 hover:bg-amber-500/5"
            title={b.username + " (admin)"}
          >
            <span className={`${b.prefixColor} text-[10px] select-none flex-shrink-0 font-bold`}>&amp;</span>
            <span className="text-[9px] flex-shrink-0">{b.icon}</span>
            <span className={`font-bold ${b.color} truncate text-[10.5px] flex-1 min-w-0`}>
              {b.username}
            </span>
          </div>
        ))}

        {/* @ OPS */}
        <div className="text-[8px] font-bold text-emerald-500/70 px-1.5 py-0.5 select-none text-center mt-0.5 bg-emerald-500/5">
          @
        </div>
        {OP_BOTS_C.map((b) => (
          <div
            key={b.uid}
            className="px-1 py-0.5 cursor-default flex items-center gap-0.5 hover:bg-emerald-500/5"
            title={b.username + " (bot)"}
          >
            <span className={`${b.prefixColor} text-[10px] select-none flex-shrink-0`}>@</span>
            <span className="text-[9px] flex-shrink-0">{b.icon}</span>
            <span className={`font-bold ${b.color} truncate text-[10.5px] flex-1 min-w-0`}>
              {b.username}
            </span>
          </div>
        ))}
        {ops.map((u) => {
          const isMe = u.uid === currentUid;
          const color = getNickColor(u.uid);
          const lvl = getUserLevel(u.uid);
          return (
            <button
              key={u.uid}
              onClick={() => handleClick(u.username)}
              className={`w-full text-left px-1 py-0.5 flex items-center gap-0.5 ${
                isMe ? "bg-indigo-500/10" : "hover:bg-white/5"
              }`}
              title={`${u.username}${isMe ? " (siz)" : ""} · ${lvl.title}`}
            >
              <span className="text-emerald-400 text-[10px] select-none flex-shrink-0 font-bold">@</span>
              <span className="text-[9px] flex-shrink-0">{lvl.icon}</span>
              <span className={`font-bold ${color} truncate text-[10.5px] flex-1 min-w-0`}>
                {u.username}
              </span>
            </button>
          );
        })}

        {/* % HALF-OP */}
        {halfOps.length > 0 && (
          <>
            <div className="text-[8px] font-bold text-purple-400/70 px-1.5 py-0.5 select-none text-center mt-0.5 bg-purple-500/5">
              %
            </div>
            {halfOps.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const lvl = getUserLevel(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => handleClick(u.username)}
                  className={`w-full text-left px-1 py-0.5 flex items-center gap-0.5 ${
                    isMe ? "bg-indigo-500/10" : "hover:bg-white/5"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${lvl.title}`}
                >
                  <span className="text-purple-400 text-[10px] select-none flex-shrink-0 font-bold">%</span>
                  <span className="text-[9px] flex-shrink-0">{lvl.icon}</span>
                  <span className={`font-bold ${color} truncate text-[10.5px] flex-1 min-w-0`}>
                    {u.username}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* + VOICE */}
        {voiced.length > 0 && (
          <>
            <div className="text-[8px] font-bold text-cyan-500/70 px-1.5 py-0.5 select-none text-center mt-0.5 bg-cyan-500/5">
              +
            </div>
            {voiced.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const lvl = getUserLevel(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => handleClick(u.username)}
                  className={`w-full text-left px-1 py-0.5 flex items-center gap-0.5 ${
                    isMe ? "bg-indigo-500/10" : "hover:bg-white/5"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${lvl.title}`}
                >
                  <span className="text-cyan-400 text-[10px] select-none flex-shrink-0 font-bold">+</span>
                  <span className="text-[9px] flex-shrink-0">{lvl.icon}</span>
                  <span className={`font-bold ${color} truncate text-[10.5px] flex-1 min-w-0`}>
                    {u.username}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* USERS — yeni gelenler */}
        {normals.length > 0 && (
          <>
            <div className="text-[8px] font-bold text-slate-500 px-1.5 py-0.5 select-none text-center mt-0.5 bg-slate-500/5">
              ·
            </div>
            {normals.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const lvl = getUserLevel(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => handleClick(u.username)}
                  className={`w-full text-left px-1 py-0.5 flex items-center gap-0.5 ${
                    isMe ? "bg-indigo-500/10" : "hover:bg-white/5"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${lvl.title}`}
                >
                  <span className="text-slate-600 text-[10px] select-none flex-shrink-0">·</span>
                  <span className="text-[9px] flex-shrink-0">{lvl.icon}</span>
                  <span className={`${color} truncate text-[10.5px] flex-1 min-w-0`}>
                    {u.username}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <button
        onClick={onExpand}
        className="px-1 py-1.5 border-t border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 via-slate-900/60 to-purple-900/40 text-[9px] text-emerald-400/80 hover:text-emerald-300 hover:from-indigo-800/50 hover:to-purple-800/50 transition select-none flex-shrink-0 font-bold"
        title="Detaylı görünüm"
      >
        ⇱ tam liste
      </button>
    </div>
  );
}
