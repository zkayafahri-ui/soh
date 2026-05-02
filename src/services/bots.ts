// SohbetGo Bot Sistemi
import type { Message } from "../types";
import {
  getUserLevel,
  getNextLevelProgress,
  getUserStats,
  formatMembership,
  LEVELS,
} from "./levels";

// IRC statü hiyerarşisi:
// ~ = Founder (Sistem koruma)
// & = Admin (Kanal yöneticisi)
// @ = Operator (Botlar + kanal opları)
// + = Voice (eski/aktif kullanıcılar)
//   = Normal user

export const SYSTEM_BOT = {
  uid: "bot_sistem",
  username: "Sistem",
  avatarColor: "bg-violet-600",
  prefix: "~" as const,
  isBot: true as const,
};

export const ADMIN_BOT = {
  uid: "bot_admin",
  username: "Admin",
  avatarColor: "bg-amber-600",
  prefix: "&" as const,
  isBot: true as const,
};

export const NOMERCY_BOT = {
  uid: "bot_nomercy",
  username: "NoMercy",
  avatarColor: "bg-red-600",
  prefix: "@" as const,
  isBot: true as const,
};

export const GAME_BOT = {
  uid: "bot_oyunbot",
  username: "OyunBot",
  avatarColor: "bg-emerald-600",
  prefix: "@" as const,
  isBot: true as const,
};

export const ALL_BOTS = [SYSTEM_BOT, ADMIN_BOT, NOMERCY_BOT, GAME_BOT];

export const BOT_UIDS = new Set([
  SYSTEM_BOT.uid,
  ADMIN_BOT.uid,
  NOMERCY_BOT.uid,
  GAME_BOT.uid,
]);

// =============================================================
// @NoMercy KORUMA BOTU
// =============================================================

// Yasaklı kelimeler (örnek liste, sansürlü)
const BANNED_WORDS = [
  "amk", "aq", "oç", "oc", "piç", "siktir", "sikim", "sikiyim",
  "orospu", "yarrak", "göt", "gerizekalı", "aptal", "salak",
  "ibne", "ananı", "anan", "babanı", "baban", "kahpe", "şerefsiz",
  "puşt", "pezevenk", "kaltak", "sürtük", "fahişe",
];

// URL regex
const URL_REGEX = /(https?:\/\/|www\.|\.(com|net|org|io|co|tv|me|tk|ml|ga|cf|gg|xyz|info)(\b|\/))/i;

// Caps lock kontrolü (60%+ büyük harf ve 8+ karakter)
function isCapsAbuse(text: string): boolean {
  if (text.length < 8) return false;
  const letters = text.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, "");
  if (letters.length < 6) return false;
  const upper = letters.replace(/[^A-ZÇĞİÖŞÜ]/g, "");
  return upper.length / letters.length >= 0.7;
}

// Tekrarlı karakter (spam) kontrolü: aaaaaaaa veya hahahahaha
function isRepeatSpam(text: string): boolean {
  return /(.)\1{6,}/.test(text) || /(.{2,5})\1{4,}/.test(text);
}

// Yasaklı kelime kontrolü
function hasBannedWord(text: string): { found: boolean; word?: string } {
  const normalized = text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/\s+/g, "");

  for (const word of BANNED_WORDS) {
    const w = word.toLowerCase().replace(/\s+/g, "");
    if (normalized.includes(w)) {
      return { found: true, word };
    }
  }
  return { found: false };
}

// Flood/spam: aynı kullanıcıdan kısa sürede çok mesaj
const userMessageHistory = new Map<string, number[]>();

function isFlooding(uid: string): boolean {
  const now = Date.now();
  const history = userMessageHistory.get(uid) || [];
  const recent = history.filter((t) => now - t < 10000); // son 10 sn
  recent.push(now);
  userMessageHistory.set(uid, recent);
  return recent.length > 5; // 10 sn'de 5'ten fazla mesaj
}

// Aynı mesajı tekrar gönderme
const lastUserMessage = new Map<string, { text: string; count: number }>();

function isRepeatingMessage(uid: string, text: string): boolean {
  const last = lastUserMessage.get(uid);
  const normalized = text.toLowerCase().trim();
  if (last && last.text === normalized) {
    last.count++;
    if (last.count >= 3) {
      lastUserMessage.set(uid, { text: normalized, count: 0 });
      return true;
    }
  } else {
    lastUserMessage.set(uid, { text: normalized, count: 1 });
  }
  return false;
}

export type ModerationResult = {
  allow: boolean;
  reason?: string;
  warning?: string;
  kick?: boolean;
};

// Uyarı sayacı (3 uyarı = kick)
const userWarnings = new Map<string, number>();

export function moderateMessage(
  uid: string,
  username: string,
  text: string
): ModerationResult {
  // Botların kendi mesajlarını engelleme
  if (BOT_UIDS.has(uid)) return { allow: true };

  // Flood
  if (isFlooding(uid)) {
    incrementWarning(uid);
    return {
      allow: false,
      warning: `⚠️ @${username} çok hızlı mesaj atıyorsun! Lütfen yavaşla. (Flood koruması)`,
      reason: "flood",
      kick: getWarnings(uid) >= 3,
    };
  }

  // Tekrar
  if (isRepeatingMessage(uid, text)) {
    incrementWarning(uid);
    return {
      allow: false,
      warning: `⚠️ @${username} aynı mesajı tekrarlama! (Spam koruması)`,
      reason: "repeat",
      kick: getWarnings(uid) >= 3,
    };
  }

  // Yasaklı kelime
  const banned = hasBannedWord(text);
  if (banned.found) {
    incrementWarning(uid);
    return {
      allow: false,
      warning: `🚫 @${username} bu odada küfür yasak! Uyarı: ${getWarnings(uid)}/3`,
      reason: "banned_word",
      kick: getWarnings(uid) >= 3,
    };
  }

  // URL
  if (URL_REGEX.test(text)) {
    incrementWarning(uid);
    return {
      allow: false,
      warning: `🔗 @${username} link paylaşımı yasak! Uyarı: ${getWarnings(uid)}/3`,
      reason: "url",
      kick: getWarnings(uid) >= 3,
    };
  }

  // Caps abuse
  if (isCapsAbuse(text)) {
    return {
      allow: false,
      warning: `📢 @${username} BÜYÜK HARFLE BAĞIRMA! Lütfen normal yaz.`,
      reason: "caps",
    };
  }

  // Repeat spam
  if (isRepeatSpam(text)) {
    incrementWarning(uid);
    return {
      allow: false,
      warning: `🔁 @${username} karakter spamı yapma!`,
      reason: "repeat_chars",
      kick: getWarnings(uid) >= 3,
    };
  }

  return { allow: true };
}

function incrementWarning(uid: string) {
  const current = userWarnings.get(uid) || 0;
  userWarnings.set(uid, current + 1);
}

function getWarnings(uid: string): number {
  return userWarnings.get(uid) || 0;
}

export function resetWarnings(uid: string) {
  userWarnings.set(uid, 0);
}

// Kick'lenen kullanıcılar (geçici - localStorage)
const KICK_KEY = "sohbetgo_kicked_users";

export function kickUser(uid: string, roomId: string, durationMs = 5 * 60 * 1000) {
  const data = loadKicks();
  data[`${roomId}:${uid}`] = Date.now() + durationMs;
  localStorage.setItem(KICK_KEY, JSON.stringify(data));
  resetWarnings(uid);
}

export function isKicked(uid: string, roomId: string): { kicked: boolean; until?: number } {
  const data = loadKicks();
  const expiry = data[`${roomId}:${uid}`];
  if (expiry && Date.now() < expiry) {
    return { kicked: true, until: expiry };
  }
  if (expiry) {
    delete data[`${roomId}:${uid}`];
    localStorage.setItem(KICK_KEY, JSON.stringify(data));
  }
  return { kicked: false };
}

function loadKicks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KICK_KEY) || "{}");
  } catch {
    return {};
  }
}

// =============================================================
// 🎮 OYUN BOTU
// =============================================================

interface GameSession {
  type: "number" | "word" | "trivia" | "rps";
  data: any;
  startedAt: number;
  roomId: string;
}

const activeGames = new Map<string, GameSession>();

const TRIVIA_QUESTIONS = [
  { q: "Türkiye'nin başkenti neresidir?", a: "ankara" },
  { q: "Bir günde kaç saniye vardır? (sayı)", a: "86400" },
  { q: "Güneş sisteminin en büyük gezegeni hangisidir?", a: "jüpiter" },
  { q: "İstanbul'u fetheden padişah kimdir? (sadece isim)", a: "fatih" },
  { q: "Mona Lisa'yı kim yapmıştır? (sadece soyad)", a: "vinci" },
  { q: "H2O hangi bileşenin formülüdür?", a: "su" },
  { q: "Bir futbol takımında kaç oyuncu sahaya çıkar?", a: "11" },
  { q: "Türkiye'nin en uzun nehri hangisidir?", a: "kızılırmak" },
  { q: "Dünyanın en yüksek dağı hangisidir?", a: "everest" },
  { q: "Pi sayısının ilk üç basamağı? (3.xx şeklinde)", a: "3.14" },
  { q: "Ay'a ilk ayak basan astronot kimdir? (sadece soyad)", a: "armstrong" },
  { q: "Bir yılda kaç ay vardır?", a: "12" },
  { q: "Türk bayrağında hangi şekiller vardır? (yıldız ve ...)", a: "ay" },
  { q: "World Cup en çok hangi ülke kazanmıştır?", a: "brezilya" },
  { q: "Bilgisayarın beyni olarak adlandırılan parça?", a: "cpu" },
];

const WORD_LIST = [
  "kelime", "sohbet", "arkadaş", "müzik", "kitap", "yıldız",
  "deniz", "çiçek", "rüzgar", "güneş", "bulut", "okyanus",
  "orman", "şehir", "köprü", "bilgisayar", "telefon", "sandalye",
  "pencere", "kapı", "merdiven", "anahtar", "saat", "gözlük",
];

const RPS_CHOICES = ["taş", "kağıt", "makas"];

export type BotResponse = {
  text: string;
  delay?: number;
};

export function processGameCommand(
  roomId: string,
  uid: string,
  username: string,
  text: string
): BotResponse[] | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // !yardim / !komutlar
  if (lower === "!yardim" || lower === "!komutlar" || lower === "!help") {
    return [
      {
        text:
          `🎮 **OyunBot Komutları** 🎮\n\n` +
          `🎲 \`!sayi\` — Sayı tahmin oyunu (1-100)\n` +
          `📝 \`!kelime\` — Kelime tahmin oyunu\n` +
          `🧠 \`!soru\` — Bilgi yarışması\n` +
          `✊ \`!tas\` / \`!kagit\` / \`!makas\` — Taş Kağıt Makas\n` +
          `🎰 \`!zar\` — Zar at (1-6)\n` +
          `🪙 \`!yazi\` veya \`!tura\` — Yazı tura\n` +
          `💡 \`!soyle <şey>\` — Bot sana 8-top cevabı verir\n` +
          `🛑 \`!dur\` — Aktif oyunu durdur\n\n` +
          `📊 **Seviye Komutları**\n` +
          `🏆 \`!seviye\` — Seviyeni göster\n` +
          `📈 \`!seviyeler\` — Tüm seviyeleri listele\n\n` +
          `Cevap vermek için sadece tahmininizi yazın!`,
      },
    ];
  }

  // !seviye - Kendi seviyeni göster
  if (lower === "!seviye" || lower === "!level") {
    const level = getUserLevel(uid);
    const progress = getNextLevelProgress(uid);
    const stats = getUserStats(uid);
    const membership = formatMembership(uid);

    let progressBar = "";
    if (progress.next) {
      const filled = Math.floor(progress.messagePercent / 10);
      progressBar =
        "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${progress.messagePercent}%`;
    }

    let nextInfo = "";
    if (progress.next) {
      nextInfo =
        `\n📈 Sonraki: **${progress.next.icon} ${progress.next.title}**\n` +
        `   📝 ${progress.messagesNeeded} mesaj · ⏰ ${Math.ceil(progress.daysNeeded)} gün kaldı\n` +
        `   ${progressBar}`;
    } else {
      nextInfo = `\n🏆 Maksimum seviyeye ulaştın!`;
    }

    return [
      {
        text:
          `📊 **@${username} — Seviye Bilgisi**\n\n` +
          `${level.icon} **${level.title}** (Level ${level.level})\n` +
          `💬 Mesaj: **${stats.messageCount}**\n` +
          `⏱️ Üyelik: **${membership}**` +
          nextInfo,
      },
    ];
  }

  // !seviyeler - Tüm seviye listesi
  if (lower === "!seviyeler" || lower === "!levels") {
    const currentLevel = getUserLevel(uid);
    const list = LEVELS.map((l) => {
      const isCurrent = l.level === currentLevel.level;
      const marker = isCurrent ? "👉" : "  ";
      return `${marker} ${l.icon} **${l.title}** (Lv${l.level}) — ${l.minMessages} msg, ${l.minDays} gün`;
    }).join("\n");
    return [
      {
        text: `📈 **Seviye Sistemi** 📈\n\n${list}\n\n💡 Sohbet ettikçe seviye atlarsın!`,
      },
    ];
  }

  // !zar
  if (lower === "!zar") {
    const num = Math.floor(Math.random() * 6) + 1;
    const dice = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    return [
      { text: `🎲 @${username} zar attı: **${dice[num - 1]} ${num}**` },
    ];
  }

  // !yazi / !tura
  if (lower === "!yazi" || lower === "!tura") {
    const result = Math.random() < 0.5 ? "Yazı 💵" : "Tura 🪙";
    return [{ text: `🪙 @${username} parayı havaya attı: **${result}**` }];
  }

  // !soyle (Magic 8-Ball)
  if (lower.startsWith("!soyle ") || lower.startsWith("!soyle?")) {
    const responses = [
      "Kesinlikle evet! ✅",
      "Hayır olmaz 🚫",
      "Belki 🤔",
      "Şüphesiz öyle 💯",
      "Hiç sanmam 🙄",
      "Odaklan ve tekrar sor 🔮",
      "İşaretler evet diyor ✨",
      "Şu an cevap veremem 🌫️",
      "Görünüşe göre evet 👍",
      "Pek iyi görünmüyor 👎",
    ];
    const r = responses[Math.floor(Math.random() * responses.length)];
    return [{ text: `🎱 @${username} sordu... Cevap: **${r}**` }];
  }

  // !dur
  if (lower === "!dur" || lower === "!stop") {
    if (activeGames.has(roomId)) {
      activeGames.delete(roomId);
      return [{ text: `🛑 Aktif oyun durduruldu (@${username} tarafından).` }];
    }
    return [{ text: `ℹ️ Şu an aktif bir oyun yok.` }];
  }

  // !sayi - sayı tahmin
  if (lower === "!sayi" || lower === "!sayı") {
    const target = Math.floor(Math.random() * 100) + 1;
    activeGames.set(roomId, {
      type: "number",
      data: { target, attempts: 0, startedBy: username },
      startedAt: Date.now(),
      roomId,
    });
    return [
      {
        text:
          `🎲 **Sayı Tahmin Oyunu Başladı!** (@${username} tarafından)\n\n` +
          `1 ile 100 arasında bir sayı tuttum. Tahmin etmek için sadece sayıyı yazın!\n` +
          `🛑 Durdurmak için: \`!dur\``,
      },
    ];
  }

  // !kelime - kelime tahmin (hangman benzeri)
  if (lower === "!kelime") {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const masked = word.replace(/./g, "_ ");
    activeGames.set(roomId, {
      type: "word",
      data: { word, attempts: 0, guessed: new Set<string>(), startedBy: username },
      startedAt: Date.now(),
      roomId,
    });
    return [
      {
        text:
          `📝 **Kelime Tahmin Oyunu Başladı!** (@${username})\n\n` +
          `Kelime: \`${masked.trim()}\` (${word.length} harf)\n` +
          `Tek harf veya tüm kelimeyi tahmin etmek için yazın!\n` +
          `🛑 Durdurmak için: \`!dur\``,
      },
    ];
  }

  // !soru - trivia
  if (lower === "!soru") {
    const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    activeGames.set(roomId, {
      type: "trivia",
      data: { question: q.q, answer: q.a, startedBy: username },
      startedAt: Date.now(),
      roomId,
    });
    return [
      {
        text:
          `🧠 **Bilgi Yarışması!** (@${username} başlattı)\n\n` +
          `❓ ${q.q}\n\n` +
          `Cevabı yazın! 🛑 \`!dur\` ile durdurabilirsiniz.`,
      },
    ];
  }

  // !tas / !kagit / !makas
  if (lower === "!tas" || lower === "!taş" || lower === "!kagit" || lower === "!kağıt" || lower === "!makas") {
    const userChoice = lower
      .replace("!", "")
      .replace("ş", "s")
      .replace("ğ", "g")
      .replace("ı", "i");
    const botChoice = RPS_CHOICES[Math.floor(Math.random() * 3)];
    const emojis: Record<string, string> = { taş: "✊", kağıt: "✋", makas: "✌️" };
    const userEmoji = emojis[userChoice] || "❓";
    const botEmoji = emojis[botChoice] || "❓";

    let result = "";
    if (userChoice === botChoice) {
      result = "🤝 Berabere!";
    } else if (
      (userChoice === "taş" && botChoice === "makas") ||
      (userChoice === "kağıt" && botChoice === "taş") ||
      (userChoice === "makas" && botChoice === "kağıt")
    ) {
      result = `🏆 @${username} kazandı!`;
    } else {
      result = `🤖 OyunBot kazandı!`;
    }
    return [
      {
        text: `✊✋✌️ **Taş Kağıt Makas**\n\n@${username}: ${userEmoji} ${userChoice}\nOyunBot: ${botEmoji} ${botChoice}\n\n${result}`,
      },
    ];
  }

  // Aktif oyun varsa, mesajı tahmin olarak değerlendir
  const game = activeGames.get(roomId);
  if (!game) return null;

  // Oyun süresi 5 dakikayı geçtiyse temizle
  if (Date.now() - game.startedAt > 5 * 60 * 1000) {
    activeGames.delete(roomId);
    return null;
  }

  // SAYI OYUNU
  if (game.type === "number") {
    const guess = parseInt(trimmed, 10);
    if (isNaN(guess) || guess < 1 || guess > 100) return null;
    game.data.attempts++;
    if (guess === game.data.target) {
      activeGames.delete(roomId);
      return [
        {
          text:
            `🎉 **TEBRİKLER @${username}!** 🎉\n\n` +
            `Doğru sayı: **${game.data.target}** ✅\n` +
            `Toplam deneme: ${game.data.attempts}\n` +
            `Yeni oyun için: \`!sayi\``,
        },
      ];
    }
    if (game.data.attempts >= 10) {
      const target = game.data.target;
      activeGames.delete(roomId);
      return [
        {
          text: `❌ Oyun bitti! 10 deneme dolduruldu. Sayı: **${target}** idi. Yeni oyun: \`!sayi\``,
        },
      ];
    }
    const hint = guess < game.data.target ? "📈 Daha büyük!" : "📉 Daha küçük!";
    return [{ text: `${hint} (Tahmin: ${guess}, kalan deneme: ${10 - game.data.attempts})` }];
  }

  // KELİME OYUNU
  if (game.type === "word") {
    const guess = trimmed.toLowerCase();
    if (guess.length === 0) return null;

    // Tüm kelime tahmini
    if (guess === game.data.word) {
      activeGames.delete(roomId);
      return [
        {
          text:
            `🎉 **DOĞRU! @${username} kazandı!** 🎉\n\n` +
            `Kelime: **${game.data.word}** ✅\n` +
            `Yeni oyun: \`!kelime\``,
        },
      ];
    }

    // Tek harf tahmini
    if (guess.length === 1) {
      const guessed: Set<string> = game.data.guessed;
      if (guessed.has(guess)) return [{ text: `⚠️ '${guess}' harfi zaten denendi!` }];
      guessed.add(guess);
      game.data.attempts++;

      const word = game.data.word as string;
      if (word.includes(guess)) {
        // Maskeyi güncelle
        const masked = word
          .split("")
          .map((c) => (guessed.has(c) ? c : "_"))
          .join(" ");
        if (!masked.includes("_")) {
          activeGames.delete(roomId);
          return [
            {
              text: `🎉 **Kelimeyi tamamladınız: ${word}** 🎉\nYeni oyun: \`!kelime\``,
            },
          ];
        }
        return [{ text: `✅ Doğru harf! \`${masked}\` (denenen: ${[...guessed].join(", ")})` }];
      } else {
        if (game.data.attempts >= 8) {
          activeGames.delete(roomId);
          return [{ text: `❌ Oyun bitti! Kelime: **${word}** idi. Yeni oyun: \`!kelime\`` }];
        }
        const masked = word
          .split("")
          .map((c) => (guessed.has(c) ? c : "_"))
          .join(" ");
        return [
          {
            text: `❌ '${guess}' yok! \`${masked}\` (kalan hak: ${8 - game.data.attempts})`,
          },
        ];
      }
    }

    return null; // başka mesaj olabilir
  }

  // TRIVIA
  if (game.type === "trivia") {
    const guess = trimmed.toLowerCase().trim();
    const answer = (game.data.answer as string).toLowerCase();
    if (guess === answer || guess.includes(answer) || answer.includes(guess)) {
      activeGames.delete(roomId);
      return [
        {
          text:
            `🎉 **DOĞRU! @${username} bildi!** 🎉\n\n` +
            `Cevap: **${game.data.answer}** ✅\n` +
            `Yeni soru: \`!soru\``,
        },
      ];
    }
    return null;
  }

  return null;
}

export function isBotMessage(msg: Message): boolean {
  return BOT_UIDS.has(msg.uid);
}

export function getBotInfo(uid: string) {
  if (uid === SYSTEM_BOT.uid) return SYSTEM_BOT;
  if (uid === ADMIN_BOT.uid) return ADMIN_BOT;
  if (uid === NOMERCY_BOT.uid) return NOMERCY_BOT;
  if (uid === GAME_BOT.uid) return GAME_BOT;
  return null;
}

// Kullanıcı statüsü hesabı (IRC tarzı)
// Botlar kendi sabit prefix'lerini kullanır
export function getUserPrefix(
  uid: string,
  currentUid?: string,
  lastSeen?: number
): "~" | "&" | "@" | "+" | " " {
  if (uid === SYSTEM_BOT.uid) return "~";
  if (uid === ADMIN_BOT.uid) return "&";
  if (uid === NOMERCY_BOT.uid || uid === GAME_BOT.uid) return "@";
  if (uid === currentUid) return "@"; // siz oda oprusunuz
  if (lastSeen && Date.now() - lastSeen > 2 * 60 * 1000) return "+";
  return " ";
}
