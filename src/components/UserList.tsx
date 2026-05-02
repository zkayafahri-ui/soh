import { useEffect, useState } from "react";
import { subscribeOnlineUsers } from "../services/chatService";
import { SYSTEM_BOT, ADMIN_BOT, NOMERCY_BOT, GAME_BOT } from "../services/bots";
import { getUserLevel } from "../services/levels";
import { openPm, subscribePmNotifications, type PmNotification } from "../services/privateChat";
import { isNickRegistered } from "../services/nickServ";
import NickContextMenu from "./NickContextMenu";
import type { OnlineUser, Room } from "../types";

interface Props {
  room: Room;
  currentUid: string;
  onClose?: () => void;
  onSelectNick?: (nick: string) => void;
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

// Statü = seviyeden hesaplanır, kim olduğundan değil
// Lv 0-2 (Yeni/Çaylak/Üye)  → düz user (·)
// Lv 3-4 (Vatandaş/Aktif)   → + voice
// Lv 5-6 (Veteran/Yarı Op)  → % half-op
// Lv 7-9 (Operatör+)         → @ op
function getStatus(user: OnlineUser): "@" | "%" | "+" | " " {
  const level = getUserLevel(user.uid);
  if (level.level >= 7) return "@";
  if (level.level >= 5) return "%";
  if (level.level >= 3) return "+";
  return " ";
}

// Bot tanımları (statü hiyerarşisi sırasıyla)
const SYSTEM_BOTS = [
  {
    uid: SYSTEM_BOT.uid,
    username: SYSTEM_BOT.username,
    icon: "🛡️",
    color: "text-violet-400",
    glow: "shadow-violet-500/30",
    role: "Founder · Sistem koruma",
    prefix: "~",
    prefixColor: "text-violet-400",
  },
];

const ADMIN_BOTS = [
  {
    uid: ADMIN_BOT.uid,
    username: ADMIN_BOT.username,
    icon: "⚙️",
    color: "text-amber-400",
    glow: "shadow-amber-500/30",
    role: "Admin · Kanal yöneticisi",
    prefix: "&",
    prefixColor: "text-amber-400",
  },
];

const NOMERCY_OP = {
  uid: NOMERCY_BOT.uid,
  username: NOMERCY_BOT.username,
  icon: "🚨",
  color: "text-red-400",
  glow: "shadow-red-500/30",
  role: "Moderasyon",
  prefix: "@",
  prefixColor: "text-emerald-400",
};

const OYUNBOT_OP = {
  uid: GAME_BOT.uid,
  username: GAME_BOT.username,
  icon: "🎮",
  color: "text-emerald-400",
  glow: "shadow-emerald-500/30",
  role: "Oyun · !yardim",
  prefix: "@",
  prefixColor: "text-emerald-400",
};

// OyunBot SADECE #oyun kanalında görünür
function getOpBots(roomId: string) {
  if (roomId === "oyun") {
    return [NOMERCY_OP, OYUNBOT_OP];
  }
  return [NOMERCY_OP];
}

export default function UserList({
  room,
  currentUid,
  onClose,
  onSelectNick,
}: Props) {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [notifs, setNotifs] = useState<PmNotification[]>([]);
  const [menu, setMenu] = useState<{ uid: string; username: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const unsub = subscribeOnlineUsers(room.id, setUsers);
    return unsub;
  }, [room.id]);

  useEffect(() => {
    const unsub = subscribePmNotifications(currentUid, setNotifs);
    return unsub;
  }, [currentUid]);

  const hasUnreadFrom = (uid: string) => notifs.some((n) => n.fromUid === uid && n.unread);

  const handleContextMenu = (e: React.MouseEvent, uid: string, username: string) => {
    e.preventDefault();
    setMenu({ uid, username, x: e.clientX, y: e.clientY });
  };

  const handleNickClick = (uid: string, username: string, e: React.MouseEvent) => {
    // Çift tık → PM aç (kendiniz değilse)
    if (e.detail === 2 && uid !== currentUid) {
      openPm(uid, username);
      return;
    }
    // Tek tık → mention (kendiniz değilse)
    if (uid === currentUid) return;
    if (onSelectNick) onSelectNick(username);
    else
      window.dispatchEvent(
        new CustomEvent("sohbetgo:mention", { detail: username })
      );
  };

  // Menü render (en üstte)
  const renderMenu = () =>
    menu && (
      <NickContextMenu
        uid={menu.uid}
        username={menu.username}
        x={menu.x}
        y={menu.y}
        isMe={menu.uid === currentUid}
        onClose={() => setMenu(null)}
      />
    );

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

  const totalBots = SYSTEM_BOTS.length + ADMIN_BOTS.length + OP_BOTS.length;
  const totalCount = totalBots + users.length;

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-indigo-950/30 via-slate-950 to-purple-950/30 border-l border-indigo-500/20 font-mono text-[12.5px] overflow-hidden">
      {/* HEADER — temaya uygun */}
      <div className="px-3 py-3 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 via-slate-900/60 to-purple-900/40 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-emerald-300 font-bold text-[14px]">
              #{room.id}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="xl:hidden w-7 h-7 rounded hover:bg-white/5 flex items-center justify-center text-slate-400"
              aria-label="Kapat"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-[10px] text-slate-500 tabular-nums flex items-center gap-2">
          <span className="text-amber-400 font-bold">[{totalCount}]</span>
          <span>kullanıcı çevrimiçi</span>
          <span className="ml-auto text-slate-600">+ntr</span>
        </div>
      </div>

      <div className="px-3 py-1.5 text-[9px] text-slate-600 uppercase tracking-wider select-none border-b border-indigo-500/10 bg-slate-900/60 flex items-center justify-between flex-shrink-0">
        <span>NICK LİSTESİ</span>
        <span className="text-slate-700 text-[8px]">
          ~{SYSTEM_BOTS.length} &{ADMIN_BOTS.length} @{OP_BOTS.length + ops.length} %{halfOps.length} +{voiced.length} ·{normals.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {/* ~ FOUNDER (Sistem koruma) */}
        <div className="mb-2">
          <h4 className="text-[9px] font-bold text-violet-400/80 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            ~ founder ({SYSTEM_BOTS.length})
          </h4>
          {SYSTEM_BOTS.map((b) => (
            <div
              key={b.uid}
              className="px-2.5 py-1 cursor-default flex items-center gap-1.5 hover:bg-violet-500/5 group border-l-2 border-violet-500/30"
              title={`${b.username} (${b.role})`}
            >
              <span className={`${b.prefixColor} w-3 text-center font-bold select-none text-[14px]`}>
                {b.prefix}
              </span>
              <span className={`text-[12px] flex-shrink-0 drop-shadow-lg ${b.glow}`}>{b.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold ${b.color} truncate text-[12.5px] leading-tight`}>
                  {b.username}
                </div>
                <div className="text-[9px] text-slate-500 truncate leading-tight">
                  {b.role}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* & ADMIN */}
        <div className="mb-2">
          <h4 className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            &amp; admin ({ADMIN_BOTS.length})
          </h4>
          {ADMIN_BOTS.map((b) => (
            <div
              key={b.uid}
              className="px-2.5 py-1 cursor-default flex items-center gap-1.5 hover:bg-amber-500/5 group border-l-2 border-amber-500/30"
              title={`${b.username} (${b.role})`}
            >
              <span className={`${b.prefixColor} w-3 text-center font-bold select-none text-[14px]`}>
                {b.prefix}
              </span>
              <span className="text-[12px] flex-shrink-0">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold ${b.color} truncate text-[12.5px] leading-tight`}>
                  {b.username}
                </div>
                <div className="text-[9px] text-slate-500 truncate leading-tight">
                  {b.role}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* @ OPS (Bot ops + sen + diğer ops) */}
        <div className="mb-2">
          <h4 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            @ ops ({OP_BOTS.length + ops.length})
          </h4>

          {/* Bot ops */}
          {OP_BOTS.map((b) => (
            <div
              key={b.uid}
              className="px-2.5 py-1 cursor-default flex items-center gap-1.5 hover:bg-emerald-500/5 group border-l-2 border-transparent"
              title={`${b.username} (${b.role})`}
            >
              <span className={`${b.prefixColor} w-3 text-center font-bold select-none text-[14px]`}>
                {b.prefix}
              </span>
              <span className="text-[12px] flex-shrink-0">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold ${b.color} truncate text-[12.5px] leading-tight`}>
                  {b.username}
                </div>
                <div className="text-[9px] text-slate-500 truncate leading-tight">
                  {b.role}
                </div>
              </div>
              <span className="text-[8px] text-amber-500/60 select-none flex-shrink-0">
                BOT
              </span>
            </div>
          ))}

          {/* Op kullanıcılar (Lv 7+) */}
          {ops.map((u) => {
            const isMe = u.uid === currentUid;
            const color = getNickColor(u.uid);
            const level = getUserLevel(u.uid);
            const unread = hasUnreadFrom(u.uid);
            return (
              <button
                key={u.uid}
                onClick={(e) => handleNickClick(u.uid, u.username, e)}
                onContextMenu={(e) => handleContextMenu(e, u.uid, u.username)}
                className={`w-full text-left px-2.5 py-1 flex items-center gap-1.5 group border-l-2 relative ${
                  isMe ? "bg-indigo-500/10 border-indigo-500/50" : "hover:bg-white/5 border-transparent"
                }`}
                title={`${u.username}${isMe ? " (siz)" : ""} · ${level.icon} ${level.title} (Lv${level.level}) · Sağ tık menü, çift tık PM`}
              >
                <span className="text-emerald-400 w-3 text-center font-bold select-none text-[14px]">@</span>
                <span className="text-[10px] flex-shrink-0">{level.icon}</span>
                <span className={`font-bold ${color} truncate flex-1 text-[12.5px]`}>{u.username}</span>
                {unread && (
                  <span className="text-[9px] bg-pink-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse flex-shrink-0">💌</span>
                )}
                {isMe && (
                  <span className="text-[9px] text-indigo-300 select-none flex-shrink-0 px-1.5 rounded bg-indigo-500/20">siz</span>
                )}
              </button>
            );
          })}
        </div>

        {/* % HALF-OP (Lv 5-6) */}
        {halfOps.length > 0 && (
          <div className="mb-2">
            <h4 className="text-[9px] font-bold text-purple-400/80 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-purple-400" />
              % half-op ({halfOps.length})
            </h4>
            {halfOps.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const level = getUserLevel(u.uid);
              const unread = hasUnreadFrom(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={(e) => handleNickClick(u.uid, u.username, e)}
                  onContextMenu={(e) => handleContextMenu(e, u.uid, u.username)}
                  className={`w-full text-left px-2.5 py-1 flex items-center gap-1.5 border-l-2 ${
                    isMe ? "bg-indigo-500/10 border-indigo-500/50" : "hover:bg-white/5 border-transparent"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${level.icon} ${level.title} (Lv${level.level}) · Sağ tık menü, çift tık PM`}
                >
                  <span className="text-purple-400 w-3 text-center font-bold select-none text-[14px]">%</span>
                  <span className="text-[10px] flex-shrink-0">{level.icon}</span>
                  <span className={`font-bold ${color} truncate flex-1 text-[12.5px]`}>{u.username}</span>
                  {unread && (
                    <span className="text-[9px] bg-pink-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse flex-shrink-0">💌</span>
                  )}
                  {isMe && (
                    <span className="text-[9px] text-indigo-300 select-none flex-shrink-0 px-1.5 rounded bg-indigo-500/20">siz</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* + VOICE (Lv 3-4) */}
        {voiced.length > 0 && (
          <div className="mb-2">
            <h4 className="text-[9px] font-bold text-cyan-400/70 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-cyan-400" />
              + voice ({voiced.length})
            </h4>
            {voiced.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const level = getUserLevel(u.uid);
              const unread = hasUnreadFrom(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={(e) => handleNickClick(u.uid, u.username, e)}
                  onContextMenu={(e) => handleContextMenu(e, u.uid, u.username)}
                  className={`w-full text-left px-2.5 py-1 flex items-center gap-1.5 border-l-2 ${
                    isMe ? "bg-indigo-500/10 border-indigo-500/50" : "hover:bg-white/5 border-transparent"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${level.icon} ${level.title} (Lv${level.level}) · Sağ tık menü, çift tık PM`}
                >
                  <span className="text-cyan-400 w-3 text-center font-bold select-none text-[14px]">+</span>
                  <span className="text-[10px] flex-shrink-0">{level.icon}</span>
                  <span className={`font-bold ${color} truncate flex-1 text-[12.5px]`}>{u.username}</span>
                  {unread && (
                    <span className="text-[9px] bg-pink-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse flex-shrink-0">💌</span>
                  )}
                  {isMe && (
                    <span className="text-[9px] text-indigo-300 select-none flex-shrink-0 px-1.5 rounded bg-indigo-500/20">siz</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* USERS (Lv 0-2) — yeni gelenler */}
        {normals.length > 0 && (
          <div className="mb-2">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase tracking-wider px-3 py-1 select-none flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              users ({normals.length})
            </h4>
            {normals.map((u) => {
              const isMe = u.uid === currentUid;
              const color = getNickColor(u.uid);
              const level = getUserLevel(u.uid);
              const unread = hasUnreadFrom(u.uid);
              const registered = isNickRegistered(u.username);
              return (
                <button
                  key={u.uid}
                  onClick={(e) => handleNickClick(u.uid, u.username, e)}
                  onContextMenu={(e) => handleContextMenu(e, u.uid, u.username)}
                  className={`w-full text-left px-2.5 py-1 flex items-center gap-1.5 border-l-2 ${
                    isMe ? "bg-indigo-500/10 border-indigo-500/50" : "hover:bg-white/5 border-transparent"
                  }`}
                  title={`${u.username}${isMe ? " (siz)" : ""} · ${level.icon} ${level.title} (Lv${level.level})${registered ? " · 🔐 Kayıtlı" : ""}`}
                >
                  <span className="text-slate-600 w-3 text-center select-none text-[14px]">·</span>
                  <span className="text-[10px] flex-shrink-0">{level.icon}</span>
                  <span className={`${color} truncate flex-1 text-[12.5px]`}>{u.username}</span>
                  {registered && (
                    <span className="text-[9px] text-amber-400 select-none flex-shrink-0" title="Kayıtlı nick">🔐</span>
                  )}
                  {unread && (
                    <span className="text-[9px] bg-pink-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse flex-shrink-0">💌</span>
                  )}
                  {isMe && (
                    <span className="text-[9px] text-indigo-300 select-none flex-shrink-0 px-1.5 rounded bg-indigo-500/20">siz</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {users.length === 0 && (
          <div className="text-center text-slate-600 text-[11px] py-4 px-3 italic">
            * Kanalda sadece sen ve sistem botları var
          </div>
        )}
      </div>

      {/* FOOTER — temaya uygun gradient */}
      <div className="px-3 py-2 border-t border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 via-slate-900/60 to-purple-900/40 flex-shrink-0">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-slate-500">
            <span className="text-emerald-400">●</span> {totalCount} online
          </span>
          <span className="text-slate-600 italic">tıkla → mention</span>
        </div>
        <div className="mt-1 pt-1 border-t border-white/5 text-[8px] text-slate-700 flex items-center gap-1.5 select-none flex-wrap">
          <span title="Founder"><span className="text-violet-400">~</span>own</span>
          <span title="Admin"><span className="text-amber-400">&amp;</span>adm</span>
          <span title="Op"><span className="text-emerald-400">@</span>op</span>
          <span title="Half-Op"><span className="text-purple-400">%</span>hop</span>
          <span title="Voice"><span className="text-cyan-400">+</span>voice</span>
          <span title="User"><span className="text-slate-500">·</span>user</span>
        </div>
        <div className="mt-1 pt-1 border-t border-white/5 text-[8px] text-slate-600 italic select-none">
          💌 çift tık · sağ tık menü
        </div>
      </div>
      {renderMenu()}
    </div>
  );
}
