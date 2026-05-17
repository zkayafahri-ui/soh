// Browser Push Notification Sistemi
const PERM_KEY = "sohbetgo_notif_permission";
const ENABLED_KEY = "sohbetgo_notif_enabled";
const SOUND_KEY = "sohbetgo_notif_sound";

export type NotificationPermission = "default" | "granted" | "denied";

// İzin durumu
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission as NotificationPermission;
}

// Kullanıcı bildirim aktif mi?
export function isNotificationEnabled(): boolean {
  if (getNotificationPermission() !== "granted") return false;
  const enabled = localStorage.getItem(ENABLED_KEY);
  return enabled !== "false"; // varsayılan: aktif
}

export function setNotificationEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

// Ses çalma açık mı?
export function isSoundEnabled(): boolean {
  const enabled = localStorage.getItem(SOUND_KEY);
  return enabled !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? "true" : "false");
}

// İzin iste
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("[SohbetGo] Bu tarayıcı bildirim desteklemiyor");
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  localStorage.setItem(PERM_KEY, result);
  return result as NotificationPermission;
}

// Yerel bildirim göster
export function showNotification(title: string, options?: NotificationOptions & { url?: string }) {
  if (!isNotificationEnabled()) return;
  if (document.hasFocus()) return; // Sayfa açıksa bildirim verme

  try {
    const opts: NotificationOptions = {
      icon: "/images/sohbetgo-icon.png",
      badge: "/images/sohbetgo-icon.png",
      tag: options?.tag || "sohbetgo",
      ...options,
    };

    // Service worker varsa onu kullan (daha güçlü)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, opts);
      });
    } else {
      new Notification(title, opts);
    }

    // Ses çal
    if (isSoundEnabled()) {
      playNotificationSound();
    }
  } catch (e) {
    console.warn("[SohbetGo] Notification error:", e);
  }
}

// Bildirim sesi (basit beep)
let audioCtx: AudioContext | null = null;
function playNotificationSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880; // A5
    osc.type = "sine";

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ses çalınamadı, sessizce devam et
  }
}

// Service Worker kaydı
export async function registerServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[SohbetGo] Service Worker desteklenmiyor");
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("[SohbetGo] Service Worker kayıtlı:", reg.scope);
    return true;
  } catch (e) {
    console.warn("[SohbetGo] Service Worker kayıt hatası:", e);
    return false;
  }
}

// PWA install prompt
let deferredPrompt: any = null;

export function initPwaInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent("sohbetgo:pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    console.log("[SohbetGo] PWA kuruldu! 🎉");
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("sohbetgo:pwa-installed"));
  });
}

export function canInstallPwa(): boolean {
  return !!deferredPrompt;
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome === "accepted";
}

export function isPwaInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}
