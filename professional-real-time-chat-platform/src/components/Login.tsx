import { useEffect, useState } from "react";
import { loginAnonymously } from "../services/chatService";
import { isFirebaseConfigured } from "../firebase";
import {
  isNickRegistered,
  identifyNick,
  registerNick,
} from "../services/nickServ";

interface Props {
  onLogin: () => void;
}

const SUGGESTED_AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🦋", "🐳"];

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nickStatus, setNickStatus] = useState<"new" | "registered" | "empty">("empty");
  const [wantRegister, setWantRegister] = useState(false);

  // Nick yazıldığında kayıtlı mı kontrol et
  useEffect(() => {
    const t = setTimeout(() => {
      const name = username.trim();
      if (name.length < 2) {
        setNickStatus("empty");
        return;
      }
      setNickStatus(isNickRegistered(name) ? "registered" : "new");
    }, 200);
    return () => clearTimeout(t);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 2) {
      setError("Kullanıcı adı en az 2 karakter olmalı");
      return;
    }
    if (name.length > 20) {
      setError("Kullanıcı adı en fazla 20 karakter olabilir");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Önce anonim Firebase auth ile giriş yap (uid lazım)
      const uid = await loginAnonymously(name);

      // Kayıtlı nick ise → identify et
      if (nickStatus === "registered") {
        if (!password) {
          setError("Bu nick kayıtlı! Şifre girmelisin");
          setLoading(false);
          return;
        }
        const result = await identifyNick(name, password, uid);
        if (!result.success) {
          setError(result.message.replace(/\*\*/g, ""));
          setLoading(false);
          return;
        }
      }

      // Yeni nick + kayıt etmek istiyor → register
      if (nickStatus === "new" && wantRegister) {
        if (password.length < 4) {
          setError("Şifre en az 4 karakter olmalı");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Şifreler uyuşmuyor");
          setLoading(false);
          return;
        }
        const result = await registerNick(name, password, uid);
        if (!result.success) {
          setError(result.message.replace(/\*\*/g, ""));
          setLoading(false);
          return;
        }
      }

      onLogin();
    } catch (err: any) {
      setError("Giriş başarısız: " + (err?.message || "Bilinmeyen hata"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 theme-bg-secondary relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="theme-bg-primary backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl theme-accent-gradient mb-5 shadow-lg shadow-[rgb(var(--accent-from)/0.4)]">
              <span className="text-4xl">💬</span>
            </div>
            <h1 className="text-3xl font-bold theme-accent-text mb-2 tracking-tight">
              SohbetGo
            </h1>
            <p className="theme-text-secondary text-sm">
              Ücretsiz online sohbet odalarına hoş geldin
            </p>
            <p className="theme-text-primary/30 text-[10px] mt-2 font-mono tracking-[0.2em] uppercase">EST. 2026</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nick
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: SerdarKaplan"
                className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl text-white placeholder-slate-500 outline-none transition"
                maxLength={20}
                autoFocus
                autoComplete="username"
              />
              {/* Nick durumu */}
              {nickStatus === "registered" && (
                <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span>🔐</span>
                  <span>Bu nick <strong>kayıtlı</strong> — şifre gerekli</span>
                </div>
              )}
              {nickStatus === "new" && username.length >= 2 && (
                <div className="mt-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span>✨</span>
                  <span>Yeni nick — kayıt etmeden de katılabilirsin</span>
                </div>
              )}
            </div>

            {/* Şifre alanı: kayıtlı nick veya register seçenekte */}
            {(nickStatus === "registered" || (nickStatus === "new" && wantRegister)) && (
              <div className="space-y-3 animate-in">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    🔐 Şifre
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={nickStatus === "registered" ? "Mevcut şifreniz" : "En az 4 karakter"}
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl text-white placeholder-slate-500 outline-none transition"
                    maxLength={50}
                    autoComplete={nickStatus === "registered" ? "current-password" : "new-password"}
                  />
                </div>

                {/* Yeni kayıt için şifre tekrarı */}
                {nickStatus === "new" && wantRegister && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      🔐 Şifre Tekrar
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Aynı şifre"
                      className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl text-white placeholder-slate-500 outline-none transition"
                      maxLength={50}
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Yeni nick → kayıt etmek ister misin? */}
            {nickStatus === "new" && username.length >= 2 && (
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition">
                <input
                  type="checkbox"
                  checked={wantRegister}
                  onChange={(e) => setWantRegister(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span>🔐 Bu nicki <strong>kayıt et</strong> (başkası alamasın)</span>
              </label>
            )}

            {/* Avatar quick pick — sadece nick boşsa */}
            {nickStatus === "empty" && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Hızlı seçenek:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_AVATARS.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setUsername(`Misafir${Math.floor(Math.random() * 9999)}`)}
                      className="w-10 h-10 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-xl transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Giriş yapılıyor..."
                : nickStatus === "registered"
                ? "🔓 Giriş Yap (Identify)"
                : nickStatus === "new" && wantRegister
                ? "🔐 Kayıt Ol & Sohbete Katıl"
                : "Sohbete Katıl 🚀"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
              <span>
                {isFirebaseConfigured
                  ? "Firebase Realtime bağlantısı aktif"
                  : "Demo modu (Firebase yapılandırılmadı)"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          © {new Date().getFullYear()} SohbetGo • Tüm hakları saklıdır
        </p>
      </div>
    </div>
  );
}
