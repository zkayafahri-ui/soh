interface Props {
  current: string;
  onNavigate: (page: string) => void;
  username?: string | null;
}

const NAV = [
  { id: "home", label: "Anasayfa", icon: "🏠" },
  { id: "chat", label: "Sohbet", icon: "💬" },
  { id: "blog", label: "Blog", icon: "📰" },
];

export default function Header({ current, onNavigate, username }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition">
            💬
          </div>
          <div className="text-left hidden sm:block">
            <div className="font-bold text-white text-base leading-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              SohbetGo
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
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
                  ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
          {username && (
            <div className="hidden md:flex items-center gap-2 ml-3 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-300">{username}</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
