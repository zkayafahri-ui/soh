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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header sticky top-0 z-30">
      <div className="site-header-inner">
        <button
          onClick={() => navigate("home")}
          className="site-brand"
          aria-label="SohbetGo ana sayfa"
        >
          <img src="/images/sohbetgo-icon.png" alt="" />
          <span>
            <strong>SohbetGo</strong>
            <small>sohbetgo.net</small>
          </span>
        </button>

        <nav
          className={`site-navigation${mobileMenuOpen ? " is-open" : ""}`}
          id="site-navigation"
          aria-label="Ana menü"
        >
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={`site-navigation-link ${
                current === n.id
                  ? "is-current"
                  : ""
              }`}
              aria-current={current === n.id ? "page" : undefined}
            >
              <span className="site-navigation-icon" aria-hidden="true">
                {n.icon}
              </span>
              <span>{n.label}</span>
            </button>
          ))}
          {username && (
            <div className="site-user-pill">
              <span aria-hidden="true" />
              {username}
            </div>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setSettingsOpen(true);
            }}
            className="site-settings-button"
            title="Ayarlar"
            aria-label="Ayarlar"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </nav>

        <button
          type="button"
          className="site-menu-button"
          aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={mobileMenuOpen}
          aria-controls="site-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
