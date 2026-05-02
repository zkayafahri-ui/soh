import { useEffect, useRef } from "react";
import { openPm } from "../services/privateChat";
import { getUserLevel } from "../services/levels";

interface Props {
  uid: string;
  username: string;
  x: number;
  y: number;
  onClose: () => void;
  isMe?: boolean;
}

export default function NickContextMenu({
  uid,
  username,
  x,
  y,
  onClose,
  isMe,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    setTimeout(() => {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onEsc);
    }, 0);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const level = getUserLevel(uid);

  // Ekran sınırlarını aşmasın
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 220);

  const handleMention = () => {
    window.dispatchEvent(
      new CustomEvent("sohbetgo:mention", { detail: username })
    );
    onClose();
  };

  const handlePm = () => {
    openPm(uid, username);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-slate-900 border border-white/10 rounded-lg shadow-2xl shadow-black/70 backdrop-blur-xl py-1 font-mono text-[12px] min-w-[180px] overflow-hidden"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 to-purple-950/40">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px]">{level.icon}</span>
          <span className="font-bold text-white truncate">{username}</span>
          {isMe && (
            <span className="text-[8px] px-1 rounded bg-indigo-500/30 text-indigo-300 ml-auto">
              SİZ
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {level.title} · Lv {level.level}
        </div>
      </div>

      {!isMe && (
        <>
          <button
            onClick={handlePm}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-pink-500/15 transition group"
          >
            <span className="text-base">💌</span>
            <span className="text-pink-300 group-hover:text-pink-200 font-medium">
              Özel Mesaj Gönder
            </span>
          </button>
          <button
            onClick={handleMention}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-indigo-500/15 transition group"
          >
            <span className="text-base">@</span>
            <span className="text-indigo-300 group-hover:text-indigo-200 font-medium">
              Mention Yap
            </span>
          </button>
          <div className="border-t border-white/5 my-1" />
          <div className="px-3 py-1.5 text-[10px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>Statü:</span>
              <span className="text-slate-400">{level.title}</span>
            </div>
          </div>
        </>
      )}
      {isMe && (
        <div className="px-3 py-2 text-[11px] text-slate-500 italic">
          Bu siz olduğunuzdan PM açılamaz
        </div>
      )}
    </div>
  );
}
