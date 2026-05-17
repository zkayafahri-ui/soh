// Kullanıcı seviye sistemi
// Her kullanıcının her odadaki aktivitesi takip edilir.
// Seviye = mesaj sayısı + toplam süre + ilk katılım zamanına göre hesaplanır.

export interface UserLevel {
  level: number;
  title: string;
  prefix: string; // IRC tarzı prefix
  prefixColor: string;
  badgeColor: string;
  icon: string;
  minMessages: number;
  minDays: number;
}

// Seviye tanımları (en düşükten en yükseğe)
export const LEVELS: UserLevel[] = [
  {
    level: 0,
    title: "Yeni",
    prefix: "·",
    prefixColor: "text-slate-500",
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: "🌱",
    minMessages: 0,
    minDays: 0,
  },
  {
    level: 1,
    title: "Çaylak",
    prefix: "·",
    prefixColor: "text-zinc-400",
    badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    icon: "🐣",
    minMessages: 5,
    minDays: 0,
  },
  {
    level: 2,
    title: "Üye",
    prefix: "·",
    prefixColor: "text-cyan-400",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: "💬",
    minMessages: 25,
    minDays: 1,
  },
  {
    level: 3,
    title: "Vatandaş",
    prefix: "+",
    prefixColor: "text-cyan-400",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    icon: "🎖️",
    minMessages: 100,
    minDays: 3,
  },
  {
    level: 4,
    title: "Aktif",
    prefix: "+",
    prefixColor: "text-blue-400",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "⚡",
    minMessages: 250,
    minDays: 7,
  },
  {
    level: 5,
    title: "Veteran",
    prefix: "%",
    prefixColor: "text-indigo-400",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    icon: "🏅",
    minMessages: 500,
    minDays: 14,
  },
  {
    level: 6,
    title: "Yarı Op",
    prefix: "%",
    prefixColor: "text-purple-400",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "⭐",
    minMessages: 1000,
    minDays: 21,
  },
  {
    level: 7,
    title: "Operatör",
    prefix: "@",
    prefixColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: "👑",
    minMessages: 2500,
    minDays: 30,
  },
  {
    level: 8,
    title: "Süper Op",
    prefix: "@",
    prefixColor: "text-yellow-400",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    icon: "🌟",
    minMessages: 5000,
    minDays: 60,
  },
  {
    level: 9,
    title: "Efsane",
    prefix: "@",
    prefixColor: "text-pink-400",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    icon: "💎",
    minMessages: 10000,
    minDays: 90,
  },
];

interface UserStats {
  uid: string;
  firstSeen: number; // ilk kanala katılış (epoch ms)
  messageCount: number;
  lastSeen: number;
}

const STATS_KEY = "sohbetgo_user_levels";

function loadStats(): Record<string, UserStats> {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStats(stats: Record<string, UserStats>) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

// Kullanıcının ilk girişini kaydet
export function registerUser(uid: string) {
  const stats = loadStats();
  if (!stats[uid]) {
    stats[uid] = {
      uid,
      firstSeen: Date.now(),
      messageCount: 0,
      lastSeen: Date.now(),
    };
    saveStats(stats);
  } else {
    stats[uid].lastSeen = Date.now();
    saveStats(stats);
  }
}

// Mesaj sayacı arttır
export function incrementMessageCount(uid: string) {
  const stats = loadStats();
  if (!stats[uid]) {
    stats[uid] = {
      uid,
      firstSeen: Date.now(),
      messageCount: 1,
      lastSeen: Date.now(),
    };
  } else {
    stats[uid].messageCount++;
    stats[uid].lastSeen = Date.now();
  }
  saveStats(stats);
}

// Kullanıcı statü bilgisi
export function getUserStats(uid: string): UserStats {
  const stats = loadStats();
  return (
    stats[uid] || {
      uid,
      firstSeen: Date.now(),
      messageCount: 0,
      lastSeen: Date.now(),
    }
  );
}

// Kullanıcı seviyesi
export function getUserLevel(uid: string): UserLevel {
  const stats = getUserStats(uid);
  const days = (Date.now() - stats.firstSeen) / (1000 * 60 * 60 * 24);

  // En yüksek karşılayan seviyeyi bul
  let userLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (stats.messageCount >= lvl.minMessages && days >= lvl.minDays) {
      userLevel = lvl;
    }
  }
  return userLevel;
}

// Sonraki seviye için ne kadar kaldı
export function getNextLevelProgress(uid: string): {
  current: UserLevel;
  next: UserLevel | null;
  messagesNeeded: number;
  daysNeeded: number;
  messagePercent: number;
  dayPercent: number;
} {
  const stats = getUserStats(uid);
  const current = getUserLevel(uid);
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] || null;
  const days = (Date.now() - stats.firstSeen) / (1000 * 60 * 60 * 24);

  if (!next) {
    return {
      current,
      next: null,
      messagesNeeded: 0,
      daysNeeded: 0,
      messagePercent: 100,
      dayPercent: 100,
    };
  }

  const messagesNeeded = Math.max(0, next.minMessages - stats.messageCount);
  const daysNeeded = Math.max(0, next.minDays - days);
  const messagePercent = Math.min(
    100,
    Math.round(((stats.messageCount - current.minMessages) /
      Math.max(1, next.minMessages - current.minMessages)) * 100)
  );
  const dayPercent = Math.min(
    100,
    Math.round(((days - current.minDays) /
      Math.max(0.01, next.minDays - current.minDays)) * 100)
  );

  return {
    current,
    next,
    messagesNeeded,
    daysNeeded,
    messagePercent,
    dayPercent,
  };
}

// Yeni kullanıcı mı? (son 1 saat içinde ilk kez kayıtlı)
export function isNewUser(uid: string): boolean {
  const stats = loadStats();
  if (!stats[uid]) return true;
  return Date.now() - stats[uid].firstSeen < 60 * 60 * 1000; // 1 saat
}

// Kanala yeni giriş — toplam süre kaç dakika
export function getMembershipMinutes(uid: string): number {
  const stats = getUserStats(uid);
  return Math.floor((Date.now() - stats.firstSeen) / (1000 * 60));
}

// Görsel formatlanmış süre
export function formatMembership(uid: string): string {
  const mins = getMembershipMinutes(uid);
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g`;
  const months = Math.floor(days / 30);
  return `${months}ay`;
}
