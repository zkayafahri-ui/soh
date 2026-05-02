import { useEffect, useRef, useState } from "react";
import {
  sendPrivateMessage,
  subscribePrivateMessages,
  markPmAsRead,
  getConversationId,
} from "../services/privateChat";
import { getUserLevel } from "../services/levels";
import type { Message } from "../types";

interface Props {
  myUid: string;
  myUsername: string;
  peerUid: string;
  peerUsername: string;
  onClose: () => void;
  onMinimize?: () => void;
  minimized?: boolean;
  unreadCount?: number;
  onFocus?: () => void;
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

function ircTime(ts: number): string {
  const d = new Date(ts);
  return (
    d.getHours().toString().padStart(2, "0") +
    ":" +
    d.getMinutes().toString().padStart(2, "0")
  );
}

export default function PrivateChatWindow({
  myUid,
  myUsername,
  peerUid,
  peerUsername,
  onClose,
  onMinimize,
  minimized = false,
  unreadCount = 0,
  onFocus,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const convId = getConversationId(myUid, peerUid);

  useEffect(() => {
    const unsub = subscribePrivateMessages(myUid, peerUid, setMessages);
    return unsub;
  }, [myUid, peerUid]);

  // Pencere açıkken bildirimleri okundu işaretle
  useEffect(() => {
    if (!minimized) {
      markPmAsRead(myUid, convId);
    }
  }, [messages, minimized, myUid, convId]);

  useEffect(() => {
    if (!minimized) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, minimized]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    sendPrivateMessage(myUid, myUsername, peerUid, peerUsername, text);
    setText("");
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const peerColor = getNickColor(peerUid);
  const peerLevel = getUserLevel(peerUid);

  // Minimized mod
  if (minimized) {
    return (
      <button
        onClick={onFocus}
        className="relative bg-gradient-to-r from-pink-600/90 to-rose-600/90 text-white px-3 py-2 rounded-t-lg shadow-lg border border-pink-500/40 border-b-0 hover:from-pink-500 hover:to-rose-500 transition flex items-center gap-2 max-w-[180px] font-mono text-[12px]"
      >
        <span className="text-base">💌</span>
        <span className="truncate font-bold">{peerUsername}</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center animate-pulse flex-shrink-0">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border border-pink-500/40 rounded-t-xl shadow-2xl shadow-black/50 flex flex-col w-[calc(100vw-1rem)] sm:w-[320px] h-[60vh] sm:h-[440px] max-h-[500px] font-mono overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600/90 to-rose-600/90 px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">💌</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-pink-100/80 select-none">PM:</span>
            <span className="text-[9px]">{peerLevel.icon}</span>
            <span className={`font-bold text-[13px] truncate ${peerColor} brightness-150`}>
              {peerUsername}
            </span>
          </div>
          <div className="text-[9px] text-pink-200/70 truncate">
            🔒 Özel sohbet · {peerLevel.title}
          </div>
        </div>
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded hover:bg-white/20 text-white/90 flex items-center justify-center transition"
            title="Küçült"
          >
            ─
          </button>
        )}
        <button
          onClick={onClose}
          className="w-6 h-6 rounded hover:bg-red-500/40 text-white/90 flex items-center justify-center transition"
          title="Kapat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 bg-slate-950 text-[12px] leading-[1.5]"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-600 text-[11px] py-12 px-4">
            <div className="text-4xl mb-2">💬</div>
            <p>
              <span className={peerColor}>{peerUsername}</span> ile özel
              sohbete başla
            </p>
            <p className="text-[10px] text-slate-700 mt-2 italic">
              * Bu sohbet sadece ikiniz arasında
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.uid === myUid;
          const color = isOwn ? "text-emerald-400" : peerColor;
          const displayNick = isOwn ? "Sen" : peerUsername;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-1.5 px-1 py-0.5 hover:bg-white/[0.03] rounded ${
                isOwn ? "bg-emerald-500/[0.04]" : "bg-pink-500/[0.04]"
              }`}
            >
              <span className="text-slate-600 text-[10px] tabular-nums select-none flex-shrink-0 pt-[1px]">
                [{ircTime(msg.timestamp)}]
              </span>
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <span className="text-slate-500 select-none text-[11px]">&lt;</span>
                <span className={`font-bold ${color} text-[12px]`}>{displayNick}</span>
                <span className="text-slate-500 select-none text-[11px]">&gt;</span>
              </span>
              <span className="flex-1 min-w-0 break-words whitespace-pre-wrap text-slate-200 text-[12px]">
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-white/10 bg-slate-900 flex items-stretch flex-shrink-0">
        <div className="flex items-center px-2 bg-slate-950 border-r border-white/10 select-none flex-shrink-0">
          <span className="text-[10px] text-pink-400">→</span>
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`@${peerUsername}'a yaz...`}
          rows={1}
          maxLength={500}
          className="flex-1 px-2 py-2 bg-transparent text-white placeholder-slate-600 outline-none resize-none max-h-20 text-[12px] font-mono min-h-[36px]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className={`px-3 flex items-center justify-center transition flex-shrink-0 border-l border-white/10 text-[11px] font-bold ${
            text.trim()
              ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-300"
              : "text-slate-700 cursor-not-allowed"
          }`}
        >
          ↵
        </button>
      </form>
    </div>
  );
}
