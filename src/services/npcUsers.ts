// NPC (Non-Player Character) Kullanıcılar
// Kanallara hayat katmak için otomatik sohbet eden sahte kullanıcılar
import {
  db,
  isFirebaseConfigured,
  ref,
  push,
  set,
  serverTimestamp,
  onDisconnect,
} from "../firebase";
import type { Message, OnlineUser } from "../types";
import { getAvatarColor } from "../data/rooms";

// ============= NPC TANIMLARI =============
export interface NPC {
  uid: string;
  username: string;
  personality: "friendly" | "tech" | "music" | "gamer" | "joker" | "thinker" | "curious" | "sporty";
}

export const NPCS: NPC[] = [
  { uid: "npc_seda", username: "SedaNur", personality: "friendly" },
  { uid: "npc_emre", username: "EmreKaplan", personality: "tech" },
  { uid: "npc_zeynep", username: "ZeynepX", personality: "music" },
  { uid: "npc_kaan", username: "KaanGamer", personality: "gamer" },
  { uid: "npc_ali", username: "AliReis", personality: "joker" },
  { uid: "npc_elif", username: "ElifGece", personality: "thinker" },
  { uid: "npc_burak", username: "BurakFB", personality: "sporty" },
  { uid: "npc_ayse", username: "AyseBlm", personality: "curious" },
  { uid: "npc_can", username: "CanYildiz", personality: "music" },
  { uid: "npc_deniz", username: "DenizMavi", personality: "thinker" },
  { uid: "npc_mert", username: "MertcanT", personality: "tech" },
  { uid: "npc_pinar", username: "PinarG", personality: "friendly" },
];

export const NPC_UIDS = new Set(NPCS.map((n) => n.uid));

export function isNpc(uid: string): boolean {
  return NPC_UIDS.has(uid);
}

// ============= ODAYA GÖRE NPC SEÇİMİ =============
// Her odada hangi NPC'lerin aktif olacağını belirler (kişiliklerine göre)
const ROOM_NPCS: Record<string, string[]> = {
  genel: ["npc_seda", "npc_emre", "npc_zeynep", "npc_kaan", "npc_ali", "npc_elif", "npc_burak", "npc_ayse"],
  teknoloji: ["npc_emre", "npc_mert", "npc_ayse", "npc_deniz", "npc_kaan"],
  oyun: ["npc_kaan", "npc_emre", "npc_ali", "npc_mert", "npc_burak"],
  muzik: ["npc_zeynep", "npc_can", "npc_seda", "npc_pinar", "npc_elif"],
  film: ["npc_elif", "npc_seda", "npc_deniz", "npc_zeynep", "npc_pinar"],
  spor: ["npc_burak", "npc_kaan", "npc_ali", "npc_emre", "npc_mert"],
  yemek: ["npc_seda", "npc_pinar", "npc_ayse", "npc_zeynep", "npc_elif"],
  seyahat: ["npc_deniz", "npc_pinar", "npc_seda", "npc_can", "npc_ayse"],
  kitap: ["npc_elif", "npc_ayse", "npc_deniz", "npc_pinar", "npc_seda"],
};

export function getRoomNpcs(roomId: string): NPC[] {
  const ids = ROOM_NPCS[roomId] || ROOM_NPCS.genel;
  return NPCS.filter((n) => ids.includes(n.uid));
}

// ============= ODAYA ÖZEL MESAJ ÖRNEKLERİ =============
// Her oda için her kişiliğe uygun mesajlar
const ROOM_MESSAGES: Record<string, Record<string, string[]>> = {
  genel: {
    friendly: [
      "selam herkese 👋",
      "naber arkadaşlar?",
      "günaydın sohbetgo ailesi 🌅",
      "bugün hava süpermiş",
      "kim nerden bağlandı?",
      "sohbet çok hareketli bugün",
      "merhaba yeni gelenler 🎉",
      "iyi akşamlar millet",
    ],
    tech: [
      "yeni telefonum geldi sonunda",
      "wifi yine yavaşlamış valla",
      "linux kullanan var mı aranızda?",
      "vscode mu sublime mi sizce?",
      "github copilot süper bi araç",
    ],
    music: [
      "şu an tarkan dinliyorum",
      "spotify wrapped çıkmış mı bakan?",
      "bana iyi bir şarkı önerin 🎵",
      "konser sezonu açıldı 🎤",
      "sezen aksu efsane",
    ],
    gamer: [
      "biri valorant oynuyor mu?",
      "yeni gta çıksın artık",
      "minecraft'a geri dönmek istiyorum",
      "lol queue uzun bugün",
      "fps düştü yine 😩",
    ],
    joker: [
      "ahaha çok komik 😂",
      "bunu gördünüz mü 🤣",
      "ben bunu beceremem hiç",
      "ya boşver yaaa 😄",
      "önce kahvemi içeyim",
    ],
    thinker: [
      "bazen düşünüyorum da hayat ne garip",
      "kitaplarımı yenilemem lazım",
      "bugün enerjim biraz düşük",
      "müzik ruhun gıdası bence",
      "sessizlik bazen en güzeli",
    ],
    curious: [
      "burada ankaralı var mı?",
      "kaç kişiyiz şu an?",
      "en sevdiğin film hangisi?",
      "haftasonu planın ne?",
      "yeni biri var galiba aramızda",
    ],
    sporty: [
      "akşam maç var unutmayın ⚽",
      "bugün koşuya çıktım sabah",
      "fenerbahçeli kim var?",
      "galatasaray-besiktas heyecanlı olacak",
      "spor salonu kapanmış 🤦",
    ],
  },
  teknoloji: {
    tech: [
      "react 19 deneyen var mı?",
      "next.js 15 çıkmış",
      "typescript kullanıyor musunuz?",
      "tailwind 4 süper ya",
      "yapay zeka her yerde artık",
      "chatgpt kodlama için harika",
      "rust öğrenmeye başladım",
      "macbook m4 fiyat performans uçuyor",
      "vps almayı düşünüyorum öneri?",
      "cloudflare pages bedava ve hızlı",
    ],
    gamer: [
      "rtx 5090 fiyatı uçtu",
      "ssd dolmaya başladı",
      "yeni klavye aldım mavi switch",
    ],
    curious: [
      "yapay zeka iş aldı mı sizce?",
      "kim hangi dilde kod yazıyor?",
      "junior dev olarak nereden başlamalı?",
    ],
    thinker: [
      "teknoloji çok hızlı ilerliyor",
      "bilgi paylaşmak güzel şey",
    ],
  },
  oyun: {
    gamer: [
      "valorant rank atlama zor ya",
      "csgo 2 nasıl?",
      "yeni cod fragmanını gördünüz mü",
      "elden ring dlc müthişti",
      "minecraft çok rahatlatıcı",
      "lol pre-season başladı",
      "hangi konsol daha iyi ps5 mi xbox mu?",
      "battlefield çıkacak mı bilen?",
      "indie oyunlar daha eğlenceli bence",
      "gta 6 ne zaman çıkacak ya",
      "ranked oynayan var mı dia 2yim",
      "co-op oynayalım mı?",
    ],
    tech: [
      "fps düşüyor optimizasyon kötü",
      "rtx 4070 yeterli mi acaba",
    ],
    joker: [
      "bana noob diyenler 😂",
      "feed atan team mate'ler 🤡",
    ],
  },
  muzik: {
    music: [
      "tarkan yeni albüm çıkardı dinleyin",
      "müzik dinliyorum size de tavsiye 🎧",
      "manuş baba efsane",
      "rock dinleyenler buraya",
      "sezen aksu altın klasik",
      "pinhani konseri vardı muhteşemdi",
      "şu an radyo açık tam keyif",
      "ezhel yeni şarkı sallandı",
      "kara sevda dizisi şarkıları nostaljik",
      "spotify mı apple music mi?",
      "vinyl koleksiyonum büyüyor 🎶",
      "duman'ın akustik versiyonları çok iyi",
    ],
    friendly: [
      "şu radyoyu çok beğendim 📻",
      "müzik olunca ortam başka",
    ],
    thinker: [
      "müzik insanı iyileştiriyor",
      "şarkılar zamanı durduruyor",
    ],
  },
  film: {
    thinker: [
      "inception'ı yine izledim çok iyi",
      "nolan'ın yeni filmi merakla bekleniyor",
      "kore yapımları son zamanlarda harika",
      "wednesday 2 nasıl olacak acaba",
      "blade runner 2049 görsel şölen",
    ],
    friendly: [
      "yeni dizi önerin var mı?",
      "netflix'te bir şey kalmadı izlenecek",
      "blutv aboneliği aldım",
    ],
    curious: [
      "kim ne izliyor şu sıralar?",
      "en sevdiğin türk filmi hangisi?",
      "stranger things bitti mi?",
    ],
    music: [
      "film müzikleri genelde harika",
      "interstellar soundtrack ❤️",
    ],
  },
  spor: {
    sporty: [
      "fenerbahçe maçı saat kaçta?",
      "milli takım çok iyi oynadı",
      "premier league heyecanlı bu sezon",
      "real madrid tekrar şampiyon olur",
      "vaov ne pas ya 🤩",
      "hakem yine yedi kazığı",
      "şampiyonlar ligi kuralar çekildi",
      "icardi efsane 9 numara",
      "transferler nasıl gidiyor?",
      "yarın da basketbol var",
      "messi mi ronaldo mu? klasik soru 😄",
    ],
    gamer: [
      "fifa 26 daha çıkmadı mı?",
      "pes geri gelse keşke",
    ],
    joker: [
      "ben tribün taraftarıyım 📣",
    ],
  },
  yemek: {
    friendly: [
      "bugün ne yedinizz?",
      "mantı yapacam akşama",
      "tarif paylaşan var mı?",
      "kahve nasıl içersiniz?",
    ],
    curious: [
      "vejetaryen yemek tarifi var mı?",
      "iyi bir ekmek arası önerin",
      "evde pizza nasıl yapılır?",
    ],
    thinker: [
      "yemek pişirmek terapi gibi",
      "ev yemeği gibisi yok",
    ],
    music: [
      "yemek yaparken müzik şart",
    ],
  },
  seyahat: {
    thinker: [
      "kapadokya muhteşemdi",
      "tek başına seyahat etmek çok özel",
      "Lisbon listemde tepeden",
      "yurtdışı vize işleri yorucu",
      "bali'ye gitmek istiyorum bir gün",
    ],
    friendly: [
      "yurtdışı seyahat planı yapıyorum",
      "antalya öneri kabul ediyorum",
      "kim nereye gitti son tatilde?",
    ],
    curious: [
      "hangi ülke favoriniz?",
      "bütçe dostu rota önerisi?",
    ],
    music: [
      "seyahatte playlist şart 🎵",
    ],
  },
  kitap: {
    thinker: [
      "şu an dostoyevski okuyorum",
      "sabahattin ali her zaman favori",
      "yeni çıkan kitaplar pahalı oldu",
      "hugo'nun sefiller'i muazzam",
      "kafka'nın dönüşüm kısa ama derin",
    ],
    curious: [
      "ne öneriyorsunuz okumak için?",
      "polisiye seven var mı?",
      "kindle mi kağıt kitap mı?",
    ],
    friendly: [
      "kitap kulübü kurabiliriz 📚",
      "kütüphanede çalışmak en iyisi",
    ],
    music: [
      "kitap okurken müzik dinler misiniz?",
    ],
  },
};

function getMessagesForNpc(roomId: string, personality: string): string[] {
  const roomMsgs = ROOM_MESSAGES[roomId] || ROOM_MESSAGES.genel;
  const direct = roomMsgs[personality];
  if (direct && direct.length > 0) return direct;
  // Fallback: genel odadan kişiliğe göre
  return ROOM_MESSAGES.genel[personality] || ROOM_MESSAGES.genel.friendly;
}

// Diğer kullanıcılara cevap mesajları
const REACTIONS = [
  "haklısın aslında",
  "evet katılıyorum",
  "bence de öyle",
  "hmm ilginç",
  "valla bilmem ki",
  "olabilir 🤔",
  "aynen öyle",
  "ben de aynı fikirdeyim",
  "doğru söylüyorsun",
  "katılmıyorum açıkçası",
  "ne demek istedin?",
  "anladım anladım",
  "çok güzel ifade ettin",
  "hahaha 😄",
  "süper 👍",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============= NPC ONLINE PRESENCE =============
// NPC'leri kanala "katılmış" gibi göster (presence sistemine ekle)
const npcPresenceTimers = new Map<string, number>();
const npcMessageTimers = new Map<string, number>();

const DEMO_NPC_USERS_KEY = (roomId: string) =>
  `chatverse_demo_users_${roomId}`;

const DEMO_NPC_MSGS_KEY = (roomId: string) =>
  `chatverse_demo_msgs_${roomId}`;

function pushDemoMessage(roomId: string, msg: Message) {
  const key = DEMO_NPC_MSGS_KEY(roomId);
  let msgs: Message[] = [];
  try {
    msgs = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {}
  msgs.push(msg);
  msgs = msgs.slice(-100);
  localStorage.setItem(key, JSON.stringify(msgs));
  // BroadcastChannel ile diğer sekmelere bildir
  try {
    const ch = new BroadcastChannel(`msgs_${roomId}`);
    ch.postMessage(msg);
    ch.close();
  } catch {}
}

function pushDemoPresence(roomId: string, user: OnlineUser) {
  const key = DEMO_NPC_USERS_KEY(roomId);
  let users: OnlineUser[] = [];
  try {
    users = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {}
  users = users.filter((u) => u.uid !== user.uid && Date.now() - u.lastSeen < 60000);
  users.push(user);
  localStorage.setItem(key, JSON.stringify(users));
  try {
    const ch = new BroadcastChannel(`users_${roomId}`);
    ch.postMessage(users);
    ch.close();
  } catch {}
}

function npcSendMessage(roomId: string, npc: NPC, text: string) {
  const avatarColor = getAvatarColor(npc.uid);

  if (isFirebaseConfigured && db) {
    const msgRef = push(ref(db, `rooms/${roomId}/messages`));
    set(msgRef, {
      uid: npc.uid,
      username: npc.username,
      avatarColor,
      text,
      timestamp: serverTimestamp(),
    });
    return;
  }

  // Demo mode
  const msg: Message = {
    id: Date.now() + "_npc_" + Math.random().toString(36).slice(2, 6),
    uid: npc.uid,
    username: npc.username,
    avatarColor,
    text,
    timestamp: Date.now(),
    roomId,
  };
  pushDemoMessage(roomId, msg);
}

function npcUpdatePresence(roomId: string, npc: NPC) {
  const avatarColor = getAvatarColor(npc.uid);
  // NPC'yi 5-30 dakika önce katılmış gibi göster (rastgele eskilik)
  const lastSeen = Date.now();

  if (isFirebaseConfigured && db) {
    const userRef = ref(db, `rooms/${roomId}/online/${npc.uid}`);
    set(userRef, {
      uid: npc.uid,
      username: npc.username,
      avatarColor,
      lastSeen: serverTimestamp(),
    });
    onDisconnect(userRef).remove();
    return;
  }

  // Demo
  const user: OnlineUser = {
    uid: npc.uid,
    username: npc.username,
    avatarColor,
    lastSeen,
  };
  pushDemoPresence(roomId, user);
}

// ============= ANA NPC SİSTEMİ =============
const activeRooms = new Set<string>();

export function startNpcsForRoom(roomId: string) {
  if (activeRooms.has(roomId)) return;
  activeRooms.add(roomId);

  const npcs = getRoomNpcs(roomId);

  // İlk anda hepsini online olarak işaretle (rastgele zamanlarda)
  npcs.forEach((npc, i) => {
    setTimeout(() => {
      npcUpdatePresence(roomId, npc);
    }, i * 200 + Math.random() * 1000);
  });

  // Presence yenileme: her 30sn'de tüm NPC'lerin lastSeen'i güncellesin
  const presenceInterval = window.setInterval(() => {
    npcs.forEach((npc) => npcUpdatePresence(roomId, npc));
  }, 30000);
  npcPresenceTimers.set(roomId, presenceInterval);

  // Mesaj döngüsü: rastgele aralıklarla NPC'ler konuşur
  const scheduleNextMessage = () => {
    // 8 ile 30 saniye arası
    const delay = 8000 + Math.random() * 22000;
    const timer = window.setTimeout(() => {
      if (!activeRooms.has(roomId)) return;

      // Rastgele bir NPC seç
      const npc = pickRandom(npcs);
      // %15 ihtimalle reaksiyon, %85 ihtimalle tema mesajı
      let text: string;
      if (Math.random() < 0.15) {
        text = pickRandom(REACTIONS);
      } else {
        const messages = getMessagesForNpc(roomId, npc.personality);
        text = pickRandom(messages);
      }
      npcSendMessage(roomId, npc, text);
      scheduleNextMessage();
    }, delay);
    npcMessageTimers.set(roomId, timer);
  };

  // İlk mesajı 3-8 saniye sonra başlat
  setTimeout(() => {
    if (activeRooms.has(roomId)) {
      const npc = pickRandom(npcs);
      const messages = getMessagesForNpc(roomId, npc.personality);
      npcSendMessage(roomId, npc, pickRandom(messages));
      scheduleNextMessage();
    }
  }, 3000 + Math.random() * 5000);
}

export function stopNpcsForRoom(roomId: string) {
  activeRooms.delete(roomId);
  const pi = npcPresenceTimers.get(roomId);
  if (pi) {
    clearInterval(pi);
    npcPresenceTimers.delete(roomId);
  }
  const mi = npcMessageTimers.get(roomId);
  if (mi) {
    clearTimeout(mi);
    npcMessageTimers.delete(roomId);
  }
}

// NPC seviyelerini önceden ayarla — varsayılan üyelik tarihleri (eski kullanıcılar)
export function initializeNpcLevels() {
  try {
    const STATS_KEY = "sohbetgo_user_levels";
    const data = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Her NPC için sahte stats — bazı eski, bazı orta düzey kullanıcı
    const npcDefaults: Record<string, { firstSeenDaysAgo: number; messages: number }> = {
      npc_seda: { firstSeenDaysAgo: 45, messages: 380 },
      npc_emre: { firstSeenDaysAgo: 90, messages: 2100 },
      npc_zeynep: { firstSeenDaysAgo: 30, messages: 280 },
      npc_kaan: { firstSeenDaysAgo: 60, messages: 750 },
      npc_ali: { firstSeenDaysAgo: 15, messages: 180 },
      npc_elif: { firstSeenDaysAgo: 120, messages: 3500 },
      npc_burak: { firstSeenDaysAgo: 25, messages: 210 },
      npc_ayse: { firstSeenDaysAgo: 8, messages: 75 },
      npc_can: { firstSeenDaysAgo: 50, messages: 420 },
      npc_deniz: { firstSeenDaysAgo: 75, messages: 980 },
      npc_mert: { firstSeenDaysAgo: 35, messages: 320 },
      npc_pinar: { firstSeenDaysAgo: 5, messages: 28 },
    };

    let changed = false;
    for (const [uid, def] of Object.entries(npcDefaults)) {
      if (!data[uid]) {
        data[uid] = {
          uid,
          firstSeen: now - def.firstSeenDaysAgo * day,
          messageCount: def.messages,
          lastSeen: now,
        };
        changed = true;
      }
    }
    if (changed) localStorage.setItem(STATS_KEY, JSON.stringify(data));
  } catch {}
}
