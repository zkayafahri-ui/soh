import { useState } from "react";
import SettingsModal from "./SettingsModal";

interface Props {
  current: string;
  onNavigate: (page: string) => void;
  username?: string | null;
}

const NAV = [
  { id: "home", label: "Anasayfa", icon: "🏠" },
  { id: "chat", label: "Sohbet", icon: "💬" },
  { id: "irc", label: "IRC", icon: "🌐" },
  { id: "blog", label: "Blog", icon: "📰" },
];

export default function Header({ current, onNavigate, username }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-[rgb(var(--bg-secondary)/0.8)] backdrop-blur-xl border-b border-[rgb(var(--border)/0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl theme-accent-gradient flex items-center justify-center text-xl shadow-lg shadow-[rgb(var(--accent-from)/0.3)] group-hover:scale-110 transition">
            💬
          </div>
          <div className="text-left hidden sm:block">
            <div className="font-bold text-base leading-tight theme-accent-text">
              SohbetGo
            </div>
            <div className="text-[10px] theme-text-secondary leading-tight font-mono">
              sohbetgo.net
            </div>
          </div>
        </button>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                current === n.id
                  ? "bg-[rgb(var(--accent-from)/0.1)] theme-text-primary border border-[rgb(var(--accent-from)/0.2)]"
                  : "theme-text-secondary hover:theme-text-primary hover:bg-[rgb(var(--text-primary)/0.05)]"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
          {username && (
            <div className="hidden md:flex items-center gap-2 ml-3 px-3 py-1.5 rounded-xl theme-bg-tertiary border border-[rgb(var(--border)/0.1)]">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs theme-text-primary">{username}</span>
            </div>
          )}

          {/* Settings butonu */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="ml-1 w-9 h-9 rounded-xl theme-text-secondary hover:theme-text-primary hover:bg-[rgb(var(--text-primary)/0.05)] flex items-center justify-center transition group"
            title="Ayarlar"
            aria-label="Ayarlar"
          >
            <span className="text-lg group-hover:rotate-90 transition-transform duration-300">⚙️</span>
          </button>
        </nav>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
