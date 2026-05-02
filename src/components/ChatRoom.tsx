import { useEffect, useRef, useState } from "react";
import {
  sendMessage,
  subscribeMessages,
  joinRoom,
  subscribeOnlineUsers,
  sendWelcomeMessage,
  sendOyunWelcome,
} from "../services/chatService";
  isBotMessage,
  NOMERCY_BOT,
  GAME_BOT,
  SYSTEM_BOT,
  ADMIN_BOT,
} from "../services/bots";
import { getUserLevel } from "../services/levels";
import { startNpcsForRoom, stopNpcsForRoom, initializeNpcLevels } from "../services/npcUsers";
import RadioPlayer from "./RadioPlayer";
import type { Message, OnlineUser, Room } from "../types";

// NPC seviye verilerini bir kez initialize et
initializeNpcLevels();

// Kullanıcı seviyesine göre IRC prefix
function userPrefix(uid: string): { sym: string; color: string } {
  const lvl = getUserLevel(uid).level;
  if (lvl >= 7) return { sym: "@", color: "text-emerald-400" };
  if (lvl >= 5) return { sym: "%", color: "text-purple-400" };
  if (lvl >= 3) return { sym: "+", color: "text-cyan-400" };
  return { sym: "·", color: "text-slate-500" };
}

// Markdown-lite renderer (bold, code, satır sonu)
function renderRich(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|@\w+)/g;
    let last = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(<span key={`t${li}-${key++}`}>{line.slice(last, match.index)}</span>);
      const m = match[0];
      if (m.startsWith("**") && m.endsWith("**")) {
        parts.push(<strong key={`b${li}-${key++}`} className="font-bold">{m.slice(2, -2)}</strong>);
      } else if (m.startsWith("`") && m.endsWith("`")) {
        parts.push(
          <code key={`c${li}-${key++}`} className="px-1.5 py-0.5 rounded bg-black/30 text-amber-300 text-[12px] font-mono">
            {m.slice(1, -1)}
          </code>
        );
      } else if (m.startsWith("@")) {
        parts.push(<span key={`m${li}-${key++}`} className="text-indigo-300 font-semibold">{m}</span>);
      }
      last = match.index + m.length;
    }
    if (last < line.length) parts.push(<span key={`e${li}-${key++}`}>{line.slice(last)}</span>);
    return (
      <span key={li}>
        {parts.length > 0 ? parts : line}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

interface Props {
  room: Room;
  uid: string;
  username: string;
  onOpenSidebar: () => void;
  onOpenUsers: () => void;
  onLogout: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return time;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) + " " + time;
}

// IRC tarzı nick rengi — UID'den deterministik
const IRC_NICK_COLORS = [
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
  return IRC_NICK_COLORS[Math.abs(hash) % IRC_NICK_COLORS.length];
}

function ircTime(ts: number): string {
  const d = new Date(ts);
  return (
    d.getHours().toString().padStart(2, "0") +
    ":" +
    d.getMinutes().toString().padStart(2, "0")
  );
}

export default function ChatRoom({
  room,
  uid,
  username,
  onOpenSidebar,
  onOpenUsers,
  onLogout,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsubMsg = subscribeMessages(room.id, setMessages);
    const leave = joinRoom(room.id, uid, username);
    const unsubUsers = subscribeOnlineUsers(room.id, (users: OnlineUser[]) =>
      setOnlineCount(users.length)
    );
    // NPC kullanıcıları başlat — kanalda hayat olsun
    startNpcsForRoom(room.id);

    // Hoşgeldin mesajı (sadece ilk girişte)
       // Hoşgeldin mesajı (sadece ilk girişte — site bazlı)
    const welcomeKey = `welcomed_${room.id}_${uid}`;
    if (!sessionStorage.getItem(welcomeKey)) {
      sessionStorage.setItem(welcomeKey, "1");
      sendWelcomeMessage(room.id, username, uid);
    }

    // 🎮 #oyun kanalına HER GEÇİŞTE OyunBot bilgi mesajı atar (5 dk arayla)
    if (room.id === "oyun") {
      const lastOyun = parseInt(sessionStorage.getItem(`oyun_last_${uid}`) || "0", 10);
      if (Date.now() - lastOyun > 5 * 60 * 1000) {
        sessionStorage.setItem(`oyun_last_${uid}`, Date.now().toString());
        sendOyunWelcome(username);
      }
    }

    // Sol bardan nick mention event'i
    const onMention = (e: Event) => {
      const nick = (e as CustomEvent).detail as string;
      if (nick && nick !== username) {
        setText((t) => (t.trim() ? t + " " : "") + nick + ": ");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("sohbetgo:mention", onMention);
    return () => {
      unsubMsg();
      leave();
      unsubUsers();
      stopNpcsForRoom(room.id);
      window.removeEventListener("sohbetgo:mention", onMention);
    };
  }, [room.id, uid, username]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    sendMessage(room.id, uid, username, text);
    setText("");
    setIsTyping(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header — IRC topic bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl font-mono">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-8 h-8 rounded hover:bg-white/5 flex items-center justify-center text-slate-300"
          aria-label="Menü"
        >
          ☰
        </button>

        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${room.color} flex items-center justify-center text-lg shadow-lg flex-shrink-0`}
        >
          {room.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-emerald-300 font-bold text-[14px] truncate">
            #{room.id} <span className="text-slate-500 font-normal text-[11px]">— {room.name}</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="text-slate-600">Topic:</span>
            <span className="truncate">{room.description}</span>
            <span className="text-emerald-400 ml-1 flex-shrink-0">[{onlineCount + 2} users]</span>
          </div>
        </div>

        <button
          onClick={onOpenUsers}
          className="md:hidden w-8 h-8 rounded hover:bg-white/5 flex items-center justify-center text-slate-300 relative"
          aria-label="Nickler"
          title="Nick listesi"
        >
          👥
          {onlineCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center tabular-nums">
              {onlineCount + 2}
            </span>
          )}
        </button>

        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-lg hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center text-slate-300 transition"
          aria-label="Çıkış"
          title="Çıkış"
        >
          🚪
        </button>
      </div>

      {/* 📻 RADYO PLAYER — sadece müzik kanalında */}
      {room.id === "muzik" && <RadioPlayer />}

      {/* Messages — IRC stili */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 font-mono text-[13px] leading-[1.55] bg-slate-950"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 font-sans">
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${room.color} flex items-center justify-center text-4xl mb-4 shadow-2xl`}
            >
              {room.icon}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {room.name}
            </h2>
            <p className="text-slate-400 max-w-sm">{room.description}</p>
            <p className="text-slate-600 text-sm mt-4">
              * Sunucuya bağlandınız. İlk mesajı sen gönder! ✨
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.uid === uid;
          const isBot = isBotMessage(msg);
          const isSystem = msg.uid === SYSTEM_BOT.uid;
          const isAdmin = msg.uid === ADMIN_BOT.uid;
          const isNoMercy = msg.uid === NOMERCY_BOT.uid;
          const isGameBot = msg.uid === GAME_BOT.uid;

          // Bot renk teması
          const nickColor = isSystem
            ? "text-violet-400"
            : isAdmin
            ? "text-amber-400"
            : isNoMercy
            ? "text-red-400"
            : isGameBot
            ? "text-emerald-400"
            : getNickColor(msg.uid);

          const botPrefix = isSystem
            ? "~"
            : isAdmin
            ? "&"
            : isBot
            ? "@"
            : null;

          const botIcon = isSystem
            ? "🛡️"
            : isAdmin
            ? "⚙️"
            : isNoMercy
            ? "🚨"
            : isGameBot
            ? "🎮"
            : null;

          const displayNick = isSystem
            ? "Sistem"
            : isAdmin
            ? "Admin"
            : isNoMercy
            ? "NoMercy"
            : isGameBot
            ? "OyunBot"
            : msg.username;

          // Mesaj arka planı
          const bgClass = isSystem
            ? "bg-violet-500/[0.04]"
            : isAdmin
            ? "bg-amber-500/[0.04]"
            : isNoMercy
            ? "bg-red-500/[0.03]"
            : isGameBot
            ? "bg-emerald-500/[0.03]"
            : isOwn
            ? "bg-indigo-500/[0.04]"
            : "";

          // Mesaj metin rengi
          const msgTextColor = isSystem
            ? "text-violet-100"
            : isAdmin
            ? "text-amber-100"
            : isNoMercy
            ? "text-red-200"
            : isGameBot
            ? "text-emerald-100"
            : "text-slate-200";

          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-2 px-2 py-0.5 hover:bg-white/[0.03] rounded transition-colors ${bgClass}`}
            >
              {/* Timestamp */}
              <span className="text-slate-600 text-[11px] tabular-nums select-none flex-shrink-0 pt-[1px]">
                [{ircTime(msg.timestamp)}]
              </span>

              {/* Nick */}
              <span className="flex items-center gap-1 flex-shrink-0">
                <span className="text-slate-500 select-none">&lt;</span>
                {botPrefix && (
                  <span
                    className={`select-none font-bold ${
                      isSystem
                        ? "text-violet-400"
                        : isAdmin
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                    title={
                      isSystem
                        ? "Founder"
                        : isAdmin
                        ? "Admin"
                        : "Operator"
                    }
                  >
                    {botPrefix}
                  </span>
                )}
                {botIcon && (
                  <span className="text-[11px] select-none" title="Bot">
                    {botIcon}
                  </span>
                )}
                {!isBot && msg.username && (() => {
                  const p = userPrefix(msg.uid);
                  return (
                    <span
                      className={`select-none ${p.color} opacity-80 font-bold`}
                      title={isOwn ? `Sen — ${getUserLevel(msg.uid).title}` : getUserLevel(msg.uid).title}
                    >
                      {p.sym}
                    </span>
                  );
                })()}
                <span
                  className={`font-bold ${nickColor} ${
                    isBot ? "" : "cursor-pointer hover:underline"
                  }`}
                  onClick={(e) => {
                    if (isBot) return;
                    // Çift tık → PM aç
                    if (e.detail === 2 && msg.uid !== uid) {
                      window.dispatchEvent(
                        new CustomEvent("sohbetgo:pm-open", {
                          detail: { uid: msg.uid, username: msg.username },
                        })
                      );
                      return;
                    }
                    // Tek tık → mention
                    setText((t) => (t ? t + " " : "") + msg.username + ": ");
                    inputRef.current?.focus();
                  }}
                  title={isBot ? undefined : "Tek tık: mention · Çift tık: PM"}
                >
                  {displayNick}
                </span>
                <span className="text-slate-500 select-none">&gt;</span>
              </span>

              {/* Mesaj */}
              <span
                className={`flex-1 min-w-0 break-words whitespace-pre-wrap ${msgTextColor}`}
              >
                {renderRich(msg.text)}
              </span>

              {/* Tam tarih (hover) */}
              <span className="hidden sm:block text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 transition flex-shrink-0 pt-[2px]">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input — IRC stili */}
      <form
        onSubmit={handleSend}
        className="border-t border-white/5 bg-slate-900/80 backdrop-blur-xl"
      >
        <div className="flex items-stretch font-mono text-[13px]">
          {/* Nick prefix */}
          <div className="flex items-center px-3 bg-slate-900 border-r border-white/5 select-none flex-shrink-0">
            <span className="text-slate-500">[</span>
            <span className="text-emerald-400 font-bold mx-0.5">{username}</span>
            <span className="text-slate-500">]</span>
          </div>

          <div className="flex-1 relative flex items-stretch">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setIsTyping(e.target.value.length > 0);
              }}
              onKeyDown={handleKey}
              placeholder={`#${room.id} kanalına mesaj yaz... (!yardim için botu çağır)`}
              rows={1}
              maxLength={500}
              className="w-full px-3 py-3 pr-14 bg-transparent text-white placeholder-slate-600 outline-none resize-none max-h-32 font-mono"
              style={{ minHeight: "48px" }}
            />
            <span className="absolute right-3 bottom-2.5 text-[10px] text-slate-700 tabular-nums select-none">
              {text.length}/500
            </span>
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            className={`px-4 flex items-center justify-center transition flex-shrink-0 border-l border-white/5 ${
              text.trim()
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                : "text-slate-700 cursor-not-allowed"
            }`}
            aria-label="Gönder"
          >
            <span className="font-bold">SEND ↵</span>
          </button>
        </div>
        {isTyping && (
          <div className="text-[10px] text-slate-600 px-3 py-1 font-mono border-t border-white/5 select-none">
            * ENTER: gönder · SHIFT+ENTER: yeni satır · nick'e tıkla: mention
          </div>
        )}
      </form>
    </div>
  );
}
