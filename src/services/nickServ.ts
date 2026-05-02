// IRC NickServ Sistemi — Nick Register & Identify
// Kayıtlı nickleri korur, başkası tarafından kullanılamaz.

interface RegisteredNick {
  nick: string;          // lowercase
  displayNick: string;   // orijinal yazım
  passwordHash: string;
  uid: string;           // ilk kayıt eden uid
  registeredAt: number;
  lastIdentified: number;
}

const NICKSERV_KEY = "sohbetgo_nickserv";
const IDENTIFIED_KEY = "sohbetgo_identified"; // bu sessionda doğrulanmış nickler

// =============================================================
// Şifre Hash (SubtleCrypto SHA-256)
// =============================================================
async function hashPassword(password: string, salt: string = "sohbetgo_v1"): Promise<string> {
  const data = new TextEncoder().encode(password + ":" + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =============================================================
// Storage helpers
// =============================================================
function loadRegistry(): Record<string, RegisteredNick> {
  try {
    return JSON.parse(localStorage.getItem(NICKSERV_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRegistry(reg: Record<string, RegisteredNick>) {
  localStorage.setItem(NICKSERV_KEY, JSON.stringify(reg));
}

function loadIdentified(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(IDENTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveIdentified(data: Record<string, number>) {
  sessionStorage.setItem(IDENTIFIED_KEY, JSON.stringify(data));
}

// =============================================================
// PUBLIC API
// =============================================================

export interface NickServResult {
  success: boolean;
  message: string;
  level?: "info" | "warning" | "error" | "success";
}

// Nick kayıtlı mı?
export function isNickRegistered(nick: string): boolean {
  const reg = loadRegistry();
  return !!reg[nick.toLowerCase()];
}

// Nick bilgisi
export function getNickInfo(nick: string): RegisteredNick | null {
  const reg = loadRegistry();
  return reg[nick.toLowerCase()] || null;
}

// Bu kullanıcı bu nicki identify etmiş mi?
export function isIdentified(nick: string, uid: string): boolean {
  const identified = loadIdentified();
  const key = `${nick.toLowerCase()}:${uid}`;
  const ts = identified[key];
  // 24 saat geçerli
  return !!ts && Date.now() - ts < 24 * 60 * 60 * 1000;
}

// Nick sahibi başka biri mi? (kullanıcı bu nicki kullanabilir mi?)
export function canUseNick(nick: string, uid: string): boolean {
  const info = getNickInfo(nick);
  if (!info) return true; // kayıtlı değil, herkes kullanabilir
  if (info.uid === uid) return true; // ilk sahip
  if (isIdentified(nick, uid)) return true; // identify olmuş
  return false;
}

// REGISTER - Yeni nick kaydet
export async function registerNick(
  nick: string,
  password: string,
  uid: string
): Promise<NickServResult> {
  const cleanNick = nick.trim();
  if (cleanNick.length < 2 || cleanNick.length > 20) {
    return {
      success: false,
      message: "Nick 2-20 karakter arasında olmalı",
      level: "error",
    };
  }
  if (password.length < 4) {
    return {
      success: false,
      message: "Şifre en az 4 karakter olmalı",
      level: "error",
    };
  }
  if (password.length > 50) {
    return {
      success: false,
      message: "Şifre çok uzun (max 50 karakter)",
      level: "error",
    };
  }

  const reg = loadRegistry();
  const key = cleanNick.toLowerCase();

  if (reg[key]) {
    return {
      success: false,
      message: `❌ "${cleanNick}" nicki zaten kayıtlı! Sahibi siz değilseniz farklı bir nick seçin.`,
      level: "error",
    };
  }

  const passwordHash = await hashPassword(password);
  reg[key] = {
    nick: key,
    displayNick: cleanNick,
    passwordHash,
    uid,
    registeredAt: Date.now(),
    lastIdentified: Date.now(),
  };
  saveRegistry(reg);

  // Kayıt eden kişi otomatik identify olur
  const identified = loadIdentified();
  identified[`${key}:${uid}`] = Date.now();
  saveIdentified(identified);

  return {
    success: true,
    message: `✅ Nick **${cleanNick}** başarıyla kayıt edildi! 🔐\n💡 Bir dahaki sefere giriş yaparken: \`/identify ${password}\``,
    level: "success",
  };
}

// IDENTIFY - Kayıtlı nick'e giriş yap
export async function identifyNick(
  nick: string,
  password: string,
  uid: string
): Promise<NickServResult> {
  const reg = loadRegistry();
  const key = nick.toLowerCase();
  const info = reg[key];

  if (!info) {
    return {
      success: false,
      message: `❌ "${nick}" nicki kayıtlı değil. Kayıt için: \`/register <şifre>\``,
      level: "error",
    };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== info.passwordHash) {
    return {
      success: false,
      message: `🚫 Yanlış şifre! Tekrar deneyin: \`/identify <şifre>\``,
      level: "error",
    };
  }

  // Identified olarak işaretle
  const identified = loadIdentified();
  identified[`${key}:${uid}`] = Date.now();
  saveIdentified(identified);

  // Registry'de lastIdentified güncelle
  info.lastIdentified = Date.now();
  reg[key] = info;
  saveRegistry(reg);

  const ageDays = Math.floor((Date.now() - info.registeredAt) / (1000 * 60 * 60 * 24));
  return {
    success: true,
    message: `🔓 **${info.displayNick}** olarak başarıyla giriş yaptın! ✅\n📅 Kayıt: ${ageDays} gün önce`,
    level: "success",
  };
}

// SHIFRE DEĞİŞTİR
export async function changePassword(
  nick: string,
  oldPassword: string,
  newPassword: string,
  uid: string
): Promise<NickServResult> {
  const reg = loadRegistry();
  const key = nick.toLowerCase();
  const info = reg[key];

  if (!info) {
    return { success: false, message: "Nick kayıtlı değil", level: "error" };
  }

  if (!isIdentified(nick, uid)) {
    return {
      success: false,
      message: "❌ Önce identify olmalısın: `/identify <eski şifre>`",
      level: "error",
    };
  }

  const oldHash = await hashPassword(oldPassword);
  if (oldHash !== info.passwordHash) {
    return { success: false, message: "🚫 Eski şifre yanlış", level: "error" };
  }

  if (newPassword.length < 4) {
    return {
      success: false,
      message: "Yeni şifre en az 4 karakter olmalı",
      level: "error",
    };
  }

  info.passwordHash = await hashPassword(newPassword);
  reg[key] = info;
  saveRegistry(reg);

  return {
    success: true,
    message: "🔐 Şifreniz başarıyla değiştirildi!",
    level: "success",
  };
}

// LOGOUT - Bu sessiondan identify durumunu kaldır
export function unidentify(nick: string, uid: string): NickServResult {
  const identified = loadIdentified();
  const key = `${nick.toLowerCase()}:${uid}`;
  delete identified[key];
  saveIdentified(identified);
  return {
    success: true,
    message: `👋 ${nick} oturumunuz kapatıldı`,
    level: "info",
  };
}

// INFO - Nick hakkında bilgi
export function nickInfo(nick: string): NickServResult {
  const info = getNickInfo(nick);
  if (!info) {
    return {
      success: false,
      message: `❌ "${nick}" nicki kayıtlı değil`,
      level: "info",
    };
  }
  const days = Math.floor((Date.now() - info.registeredAt) / (1000 * 60 * 60 * 24));
  const lastIdDays = Math.floor((Date.now() - info.lastIdentified) / (1000 * 60 * 60 * 24));
  return {
    success: true,
    message:
      `📋 **${info.displayNick}** Nick Bilgisi\n\n` +
      `🔐 Durum: **Kayıtlı** ✅\n` +
      `📅 Kayıt tarihi: ${days} gün önce\n` +
      `🕐 Son giriş: ${lastIdDays === 0 ? "Bugün" : lastIdDays + " gün önce"}`,
    level: "info",
  };
}

// LİSTE - tüm kayıtlı nickler (debug için)
export function listRegisteredNicks(): string[] {
  const reg = loadRegistry();
  return Object.values(reg).map((r) => r.displayNick);
}

// KOMUT İŞLEYİCİ
export async function processNickServCommand(
  text: string,
  uid: string,
  currentNick: string
): Promise<NickServResult | null> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  // /register <şifre>
  if (cmd === "/register" || cmd === "/reg") {
    if (parts.length < 2) {
      return {
        success: false,
        message:
          "❓ Kullanım: `/register <şifre>`\nÖrn: `/register benim123`\nMevcut nickini kayıt eder.",
        level: "info",
      };
    }
    const password = parts.slice(1).join(" ");
    return await registerNick(currentNick, password, uid);
  }

  // /identify <şifre> [nick]
  if (cmd === "/identify" || cmd === "/id") {
    if (parts.length < 2) {
      return {
        success: false,
        message:
          "❓ Kullanım: `/identify <şifre>`\nÖrn: `/identify benim123`\nKayıtlı nickine giriş yapar.",
        level: "info",
      };
    }
    const password = parts[1];
    const targetNick = parts[2] || currentNick;
    return await identifyNick(targetNick, password, uid);
  }

  // /password <eski> <yeni>
  if (cmd === "/password" || cmd === "/passwd") {
    if (parts.length < 3) {
      return {
        success: false,
        message: "❓ Kullanım: `/password <eski şifre> <yeni şifre>`",
        level: "info",
      };
    }
    return await changePassword(currentNick, parts[1], parts[2], uid);
  }

  // /logout
  if (cmd === "/logout") {
    return unidentify(currentNick, uid);
  }

  // /info [nick]
  if (cmd === "/info" || cmd === "/whois") {
    const targetNick = parts[1] || currentNick;
    return nickInfo(targetNick);
  }

  // /help
  if (cmd === "/help" || cmd === "/yardim") {
    return {
      success: true,
      message:
        `📖 **NickServ Komutları**\n\n` +
        `🔐 \`/register <şifre>\` — Mevcut nicki kayıt et\n` +
        `🔓 \`/identify <şifre>\` — Kayıtlı nicke giriş yap\n` +
        `🔑 \`/password <eski> <yeni>\` — Şifre değiştir\n` +
        `👋 \`/logout\` — Oturumu kapat\n` +
        `ℹ️ \`/info [nick]\` — Nick bilgisi (whois)\n` +
        `❓ \`/help\` — Bu menüyü göster\n\n` +
        `💡 Kayıtlı nickleri sadece sahipleri kullanabilir!`,
      level: "info",
    };
  }

  // Tanınmayan / komut
  return {
    success: false,
    message: `❓ Bilinmeyen komut: \`${cmd}\` — \`/help\` yazarak komutları gör`,
    level: "warning",
  };
}
