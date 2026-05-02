import {
  db,
  auth,
  isFirebaseConfigured,
  ref,
  push,
  set,
  onValue,
  serverTimestamp,
  query,
  limitToLast,
  onDisconnect,
  remove,
  signInAnonymously,
  off,
} from "../firebase";
import type { Message, OnlineUser } from "../types";
import { getAvatarColor } from "../data/rooms";
import {
  moderateMessage,
  processGameCommand,
  kickUser,
  isKicked,
  NOMERCY_BOT,
  GAME_BOT,
  SYSTEM_BOT,
  ADMIN_BOT,
} from "./bots";
import {
  registerUser,
  incrementMessageCount,
  getUserLevel,
  isNewUser,
  getNextLevelProgress,
} from "./levels";
import {
  processNickServCommand,
  canUseNick,
  isNickRegistered,
  isIdentified,
} from "./nickServ";

// ============= DEMO MOD (Firebase yapılandırılmamışsa) =============
// LocalStorage + BroadcastChannel ile aynı tarayıcıda çalışan demo
type Listener<T> = (data: T) => void;

class DemoChannel {
  private channels = new Map<string, BroadcastChannel>();
  private listeners = new Map<string, Set<Listener<any>>>();

  getChannel(name: string) {
    if (!this.channels.has(name)) {
      const ch = new BroadcastChannel(name);
      ch.onmessage = (ev) => {
        this.listeners.get(name)?.forEach((l) => l(ev.data));
      };
      this.channels.set(name, ch);
    }
    return this.channels.get(name)!;
  }

  subscribe(name: string, fn: Listener<any>) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
    this.getChannel(name);
    return () => this.listeners.get(name)?.delete(fn);
  }

  publish(name: string, data: any) {
    this.getChannel(name).postMessage(data);
    this.listeners.get(name)?.forEach((l) => l(data));
  }
}

const demoChannel = new DemoChannel();

function demoMessagesKey(roomId: string) {
  return `chatverse_demo_msgs_${roomId}`;
}
function demoUsersKey(roomId: string) {
  return `chatverse_demo_users_${roomId}`;
}

function loadDemoMessages(roomId: string): Message[] {
  try {
    return JSON.parse(localStorage.getItem(demoMessagesKey(roomId)) || "[]");
  } catch {
    return [];
  }
}

function saveDemoMessages(roomId: string, msgs: Message[]) {
  localStorage.setItem(demoMessagesKey(roomId), JSON.stringify(msgs.slice(-100)));
}

// ============= AUTH =============
export async function loginAnonymously(username: string): Promise<string> {
  const cleanName = username.trim().slice(0, 20);
  localStorage.setItem("chatverse_username", cleanName);

  let uid: string;
  if (isFirebaseConfigured && auth) {
    const cred = await signInAnonymously(auth);
    uid = cred.user.uid;
    localStorage.setItem("chatverse_uid", uid);
  } else {
    // Demo modu
    let existing = localStorage.getItem("chatverse_uid");
    if (!existing) {
      existing = "demo_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("chatverse_uid", existing);
    }
    uid = existing;
  }

  // Seviye sistemine kaydet
  registerUser(uid);
  return uid;
}

export function getCurrentUser() {
  const uid = localStorage.getItem("chatverse_uid");
  const username = localStorage.getItem("chatverse_username");
  if (!uid || !username) return null;
  return { uid, username, avatarColor: getAvatarColor(uid) };
}

export function logout() {
  localStorage.removeItem("chatverse_uid");
  localStorage.removeItem("chatverse_username");
}

// ============= MESAJLAR =============

export type SendResult = { ok: boolean; reason?: string; kicked?: boolean };

// Bot mesajı yazma (moderasyondan geçmez)
function sendBotMessage(
  roomId: string,
  bot: { uid: string; username: string; avatarColor: string },
  text: string,
  delayMs = 400
) {
  setTimeout(() => {
    rawSendMessage(roomId, bot.uid, bot.username, bot.avatarColor, text);
  }, delayMs);
}

function rawSendMessage(
  roomId: string,
  uid: string,
  username: string,
  avatarColor: string,
  text: string
) {
  const cleanText = text.slice(0, 1000);
  if (isFirebaseConfigured && db) {
    const msgRef = push(ref(db, `rooms/${roomId}/messages`));
    set(msgRef, {
      uid,
      username,
      avatarColor,
      text: cleanText,
      timestamp: serverTimestamp(),
    });
    return;
  }
  const msg: Message = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    uid,
    username,
    avatarColor,
    text: cleanText,
    timestamp: Date.now(),
    roomId,
  };
  const msgs = loadDemoMessages(roomId);
  msgs.push(msg);
  saveDemoMessages(roomId, msgs);
  demoChannel.publish(`msgs_${roomId}`, msg);
}

export function sendMessage(
  roomId: string,
  uid: string,
  username: string,
  text: string
): SendResult {
  const avatarColor = getAvatarColor(uid);
  const cleanText = text.trim().slice(0, 500);
  if (!cleanText) return { ok: false, reason: "empty" };

  // 🔐 NickServ slash komutları (/register, /identify, /info, /help, vb.)
  if (cleanText.startsWith("/")) {
    processNickServCommand(cleanText, uid, username).then((result) => {
      if (result) {
        sendBotMessage(
          roomId,
          SYSTEM_BOT,
          `🔐 **NickServ** → @${username}\n\n${result.message}`,
          100
        );
      }
    });
    return { ok: true, reason: "command" };
  }

  // 🔒 Kayıtlı nick kontrolü — başkasının nicki ile yazmaya çalışıyorsa engelle
  if (isNickRegistered(username) && !canUseNick(username, uid)) {
    sendBotMessage(
      roomId,
      SYSTEM_BOT,
      `🚫 **NickServ** → @${username}\n\nBu nick **kayıtlı** ve sahibi siz değilsiniz!\n💡 Kendi nickiniz ise: \`/identify <şifre>\`\n💡 Değilse: farklı bir nick seçin (Çıkış → giriş)`,
      100
    );
    return { ok: false, reason: "nick_protected" };
  }

  // Kick kontrolü
  const kickStatus = isKicked(uid, roomId);
  if (kickStatus.kicked) {
    const remaining = Math.ceil((kickStatus.until! - Date.now()) / 1000);
    sendBotMessage(
      roomId,
      NOMERCY_BOT,
      `🚷 @${username} odadan atıldı! ${remaining} saniye sonra tekrar deneyebilirsin.`,
      100
    );
    return { ok: false, reason: "kicked", kicked: true };
  }

  // @NoMercy Moderasyon
  const mod = moderateMessage(uid, username, cleanText);
  if (!mod.allow) {
    if (mod.warning) {
      sendBotMessage(roomId, NOMERCY_BOT, mod.warning, 200);
    }
    if (mod.kick) {
      kickUser(uid, roomId, 5 * 60 * 1000);
      sendBotMessage(
        roomId,
        NOMERCY_BOT,
        `⛔ @${username} 3 uyarıyı aştı! 5 dakika boyunca odadan uzaklaştırıldı. 👋`,
        600
      );
    }
    return { ok: false, reason: mod.reason, kicked: mod.kick };
  }

  // Seviye: önceki seviye + mesaj artırma
  const beforeLevel = getUserLevel(uid);
  incrementMessageCount(uid);
  const afterLevel = getUserLevel(uid);

  // Mesajı gönder
  rawSendMessage(roomId, uid, username, avatarColor, cleanText);

  // 🎉 LEVEL UP bildirimi
  if (afterLevel.level > beforeLevel.level) {
    sendBotMessage(
      roomId,
      ADMIN_BOT,
      `🎉 **TEBRİKLER!** @${username} seviye atladı: ${beforeLevel.icon} ${beforeLevel.title} → **${afterLevel.icon} ${afterLevel.title}** (Level ${afterLevel.level})`,
      800
    );
  }

  // 🎮 OyunBot komut işleme
  const gameResponses = processGameCommand(roomId, uid, username, cleanText);
  if (gameResponses) {
    gameResponses.forEach((r, i) => {
      sendBotMessage(roomId, GAME_BOT, r.text, (r.delay ?? 600) + i * 300);
    });
  }

  return { ok: true };
}

// Hoş geldin mesajı (oda ilk açıldığında) — seviye sistemli
export function sendWelcomeMessage(
  roomId: string,
  username: string,
  uid: string
) {
  registerUser(uid);
  const newUser = isNewUser(uid);
  const level = getUserLevel(uid);
  const progress = getNextLevelProgress(uid);

  if (newUser) {
    // Sistem botu — yeni gelen için karşılama
    sendBotMessage(
      roomId,
      SYSTEM_BOT,
      `🎊 Aramıza hoş geldin @${username}! Seviyen: **${level.icon} ${level.title}** (Level ${level.level})\n💡 Sohbet ettikçe seviye atlarsın. Kanal kurallarına uy, keyifli sohbetler! 🚀`,
      1000
    );

    // NickServ bilgilendirmesi
    setTimeout(() => {
      const nickStatus = isNickRegistered(username);
      const msg = nickStatus
        ? `🔐 **NickServ** — \`${username}\` nicki **kayıtlı**!\n💡 Sahibi sen isen: \`/identify <şifre>\` yaz`
        : `🔐 **NickServ** — Nickini koruma altına almak için:\n\`/register <şifre>\` yaz (örn: \`/register benim123\`)\n💡 Tüm komutlar: \`/help\``;
      sendBotMessage(roomId, SYSTEM_BOT, msg, 200);
    }, 2400);

    // Admin botu — bilgilendirme
    setTimeout(() => {
      sendBotMessage(
        roomId,
        ADMIN_BOT,
        `📋 @${username} kanala katıldı. Sohbet için: \`!yardim\` · Seviye: \`!seviye\``,
        300
      );
    }, 3500);
  } else {
    // Tekrar gelen kullanıcı için kısa karşılama
    let progressText = "";
    if (progress.next) {
      progressText = ` · Sonraki: ${progress.next.icon} ${progress.next.title} (${progress.messagesNeeded} mesaj kaldı)`;
    } else {
      progressText = " · Maksimum seviyeye ulaştın! 🎉";
    }
    sendBotMessage(
      roomId,
      SYSTEM_BOT,
      `👋 Tekrar hoş geldin @${username}! Seviyen: **${level.icon} ${level.title}**${progressText}`,
      1000
    );
  }

  // 🎮 #oyun kanalına özel: OyunBot komut tanıtımı
  if (roomId === "oyun") {
    setTimeout(() => {
      sendBotMessage(
        roomId,
        GAME_BOT,
        `🎮 **OYUN KANALINA HOŞ GELDİN @${username}!** 🎮\n\n` +
          `Burada minik oyunlar oynayabilirsin! Komutlar:\n\n` +
          `🎲 \`!sayi\` — Sayı tahmin oyunu (1-100, 10 hak)\n` +
          `📝 \`!kelime\` — Kelime tahmin oyunu (8 hak)\n` +
          `🧠 \`!soru\` — Bilgi yarışması (15+ soru havuzu)\n` +
          `✊ \`!tas\` ✋ \`!kagit\` ✌️ \`!makas\` — Bota karşı oyna\n` +
          `🎰 \`!zar\` — Şanslı zar at (1-6)\n` +
          `🪙 \`!yazi\` veya \`!tura\` — Klasik yazı tura\n` +
          `🎱 \`!soyle <soru>\` — Magic 8-Ball cevap\n` +
          `🛑 \`!dur\` — Aktif oyunu sonlandır\n\n` +
          `📊 Seviye: \`!seviye\` · Tüm liste: \`!seviyeler\`\n` +
          `❓ Tüm komutlar: \`!yardim\`\n\n` +
          `💡 İpucu: Bir oyun başlattıktan sonra tahminini direkt yaz!`,
        2500
      );
    }, 0);
  }
}

export function subscribeMessages(
  roomId: string,
  callback: (messages: Message[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const msgsRef = query(
      ref(db, `rooms/${roomId}/messages`),
      limitToLast(100)
    );
    const handler = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const msgs: Message[] = Object.entries(data).map(
        ([id, val]: [string, any]) => ({
          id,
          uid: val.uid,
          username: val.username,
          avatarColor: val.avatarColor || getAvatarColor(val.uid),
          text: val.text,
          timestamp: val.timestamp || Date.now(),
          roomId,
        })
      );
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    });
    return () => off(msgsRef, "value", handler);
  }

  // Demo
  callback(loadDemoMessages(roomId));
  const unsub = demoChannel.subscribe(`msgs_${roomId}`, () => {
    callback(loadDemoMessages(roomId));
  });
  return unsub;
}

// ============= ONLINE KULLANICILAR =============
export function joinRoom(
  roomId: string,
  uid: string,
  username: string
): () => void {
  const avatarColor = getAvatarColor(uid);

  if (isFirebaseConfigured && db) {
    const userRef = ref(db, `rooms/${roomId}/online/${uid}`);
    set(userRef, { uid, username, avatarColor, lastSeen: serverTimestamp() });
    onDisconnect(userRef).remove();

    const interval = setInterval(() => {
      set(userRef, { uid, username, avatarColor, lastSeen: serverTimestamp() });
    }, 30000);

    return () => {
      clearInterval(interval);
      remove(userRef);
    };
  }

  // Demo
  const updatePresence = () => {
    const users = loadDemoUsers(roomId);
    const filtered = users.filter(
      (u) => u.uid !== uid && Date.now() - u.lastSeen < 60000
    );
    filtered.push({ uid, username, avatarColor, lastSeen: Date.now() });
    localStorage.setItem(demoUsersKey(roomId), JSON.stringify(filtered));
    demoChannel.publish(`users_${roomId}`, filtered);
  };
  updatePresence();
  const interval = setInterval(updatePresence, 15000);

  return () => {
    clearInterval(interval);
    const users = loadDemoUsers(roomId).filter((u) => u.uid !== uid);
    localStorage.setItem(demoUsersKey(roomId), JSON.stringify(users));
    demoChannel.publish(`users_${roomId}`, users);
  };
}

function loadDemoUsers(roomId: string): OnlineUser[] {
  try {
    const arr: OnlineUser[] = JSON.parse(
      localStorage.getItem(demoUsersKey(roomId)) || "[]"
    );
    return arr.filter((u) => Date.now() - u.lastSeen < 60000);
  } catch {
    return [];
  }
}

export function subscribeOnlineUsers(
  roomId: string,
  callback: (users: OnlineUser[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const onlineRef = ref(db, `rooms/${roomId}/online`);
    const handler = onValue(onlineRef, (snap) => {
      const data = snap.val() || {};
      const users: OnlineUser[] = Object.values(data);
      callback(users.sort((a, b) => a.username.localeCompare(b.username)));
    });
    return () => off(onlineRef, "value", handler);
  }

  // Demo
  callback(loadDemoUsers(roomId));
  return demoChannel.subscribe(`users_${roomId}`, (users: OnlineUser[]) => {
    callback(users);
  });
}

// ============= ODA İSTATİSTİKLERİ =============
export function subscribeRoomStats(
  callback: (stats: Record<string, number>) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const handler = onValue(ref(db, `rooms`), (snap) => {
      const data = snap.val() || {};
      const stats: Record<string, number> = {};
      Object.entries(data).forEach(([roomId, val]: [string, any]) => {
        stats[roomId] = val.online ? Object.keys(val.online).length : 0;
      });
      callback(stats);
    });
    return () => off(ref(db!, `rooms`), "value", handler);
  }

  // Demo - tüm odalardaki demo kullanıcıları say
  const update = () => {
    const stats: Record<string, number> = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith("chatverse_demo_users_"))
      .forEach((k) => {
        const roomId = k.replace("chatverse_demo_users_", "");
        try {
          const users: OnlineUser[] = JSON.parse(
            localStorage.getItem(k) || "[]"
          );
          stats[roomId] = users.filter(
            (u) => Date.now() - u.lastSeen < 60000
          ).length;
        } catch {}
      });
    callback(stats);
  };
  update();
  const interval = setInterval(update, 5000);
  return () => clearInterval(interval);
}
