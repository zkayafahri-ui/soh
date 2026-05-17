import { useEffect, useState } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  isSoundEnabled,
  setSoundEnabled,
  showNotification,
  canInstallPwa,
  promptPwaInstall,
  isPwaInstalled,
} from "../services/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());
  const [notifEnabled, setNotifEnabledState] = useState(isNotificationEnabled());
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [pwaInstalled, setPwaInstalled] = useState(isPwaInstalled());
  const [canInstall, setCanInstall] = useState(canInstallPwa());

  useEffect(() => {
    const updateInstall = () => setCanInstall(canInstallPwa());
    window.addEventListener("sohbetgo:pwa-installable", updateInstall);
    window.addEventListener("sohbetgo:pwa-installed", () => setPwaInstalled(true));
    return () => {
      window.removeEventListener("sohbetgo:pwa-installable", updateInstall);
    };
  }, []);

  // ESC ile kapat
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
    if (result === "granted") {
      setNotificationEnabled(true);
      setNotifEnabledState(true);
      // Test bildirimi
      setTimeout(() => {
        showNotification("🎉 Bildirimler aktif!", {
          body: "Yeni mesajların geldiğinde sana haber vereceğim.",
        });
      }, 500);
    }
  };

  const handleToggleNotif = (enabled: boolean) => {
    setNotificationEnabled(enabled);
    setNotifEnabledState(enabled);
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  };

  const handleInstallPwa = async () => {
    const ok = await promptPwaInstall();
    if (ok) {
      setPwaInstalled(true);
      setCanInstall(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] animate-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto animate-in">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-pink-900/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              Ayarlar
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* PWA INSTALL */}
            <section>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>📱</span>
                Mobil Uygulama
              </h3>
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4">
                {pwaInstalled ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
                      ✅
                    </div>
                    <div>
                      <div className="font-semibold text-emerald-300">SohbetGo kurulu!</div>
                      <div className="text-xs text-slate-400">
                        Ana ekranından açabilirsin
                      </div>
                    </div>
                  </div>
                ) : canInstall ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
                        📲
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">Uygulama olarak yükle</div>
                        <div className="text-xs text-slate-400">
                          Tarayıcı sekmesi olmadan, mobil app gibi
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleInstallPwa}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:scale-105 transition"
                    >
                      Yükle
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    💡 Tarayıcının "Ana ekrana ekle" özelliğiyle uygulama gibi yükleyebilirsin
                    <br />
                    <span className="text-xs text-slate-500">
                      iOS Safari: Paylaş → "Ana Ekrana Ekle"
                      <br />
                      Android Chrome: Menü → "Uygulamayı yükle"
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* BİLDİRİMLER */}
            <section>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>🔔</span>
                Bildirimler
              </h3>
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 space-y-3">
                {notifPerm === "default" && (
                  <button
                    onClick={handleEnableNotifications}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                    🔔 Bildirimleri Etkinleştir
                  </button>
                )}

                {notifPerm === "denied" && (
                  <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    🚫 Bildirimler engellenmiş. Tarayıcı ayarlarından izin vermeniz gerek.
                  </div>
                )}

                {notifPerm === "granted" && (
                  <>
                    {/* Bildirim toggle */}
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💬</span>
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            PM Bildirimleri
                          </div>
                          <div className="text-xs text-slate-500">
                            Yeni özel mesajda bildirim al
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifEnabled}
                        onChange={(e) => handleToggleNotif(e.target.checked)}
                        className="w-5 h-5 accent-indigo-500"
                      />
                    </label>

                    {/* Ses toggle */}
                    <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔊</span>
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            Bildirim Sesi
                          </div>
                          <div className="text-xs text-slate-500">
                            Yeni mesajda küçük bir ses çal
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => handleToggleSound(e.target.checked)}
                        className="w-5 h-5 accent-indigo-500"
                      />
                    </label>

                    <button
                      onClick={() =>
                        showNotification("🧪 Test Bildirimi", {
                          body: "Bildirimler düzgün çalışıyor!",
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium transition mt-2"
                    >
                      🧪 Test Bildirimi Gönder
                    </button>
                  </>
                )}
              </div>
            </section>



            {/* BİLGİ */}
            <section className="pt-4 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500">
                SohbetGo v1.0 · sohbetgo.net
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                Ayarlar localStorage'da saklanır
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
