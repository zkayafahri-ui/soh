export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  emoji: string;
  url: string;
  description?: string;
  homepage?: string;
}

// Fallback liste — API çalışmazsa kullanılır.
// Bu URL'ler doğrudan tarayıcıdan oynatılabilen, CORS-friendly,
// MP3/AAC stream'leridir. Radio-browser.info üzerinden test edilmiştir.
export const FALLBACK_STATIONS: RadioStation[] = [
  {
    id: "kralfm",
    name: "Kral FM",
    genre: "Türkçe Pop",
    emoji: "👑",
    url: "https://radyokralfm.radyotvonline.net/kralfm",
    description: "Türk müziğinin kralı",
  },
  {
    id: "kralpop",
    name: "Kral Pop",
    genre: "Türkçe Pop",
    emoji: "🌟",
    url: "https://radyokralpop.radyotvonline.net/kralpop",
    description: "Popun kralı",
  },
  {
    id: "powerturk",
    name: "PowerTürk",
    genre: "Türkçe Pop",
    emoji: "🎤",
    url: "https://17733.live.streamtheworld.com/POWERTURK_SC",
    description: "Önce müzik",
  },
  {
    id: "powerfm",
    name: "Power FM",
    genre: "Yabancı Hits",
    emoji: "⚡",
    url: "https://17733.live.streamtheworld.com/POWERFM_SC",
    description: "Yabancı müzik radyosu",
  },
  {
    id: "metro",
    name: "Metro FM",
    genre: "Yabancı Hits",
    emoji: "🎧",
    url: "https://17733.live.streamtheworld.com/METRO_FM_SC",
    description: "Limitsiz hit müzik",
  },
  {
    id: "virgin",
    name: "Virgin Radio",
    genre: "Pop / Rock",
    emoji: "💋",
    url: "https://17733.live.streamtheworld.com/VIRGIN_RADIO_SC",
    description: "Pop ve rock klasikleri",
  },
  {
    id: "joyturk",
    name: "Joy Türk",
    genre: "Türk Akustik",
    emoji: "💜",
    url: "https://17733.live.streamtheworld.com/JOY_TURK_SC",
    description: "Türkçe akustik / pop",
  },
  {
    id: "joyfm",
    name: "Joy FM",
    genre: "Yabancı Pop",
    emoji: "💚",
    url: "https://17733.live.streamtheworld.com/JOY_FM_SC",
    description: "Yabancı pop müzik",
  },
  {
    id: "slowturk",
    name: "Slow Türk",
    genre: "Slow / Romantik",
    emoji: "🌙",
    url: "https://17733.live.streamtheworld.com/SLOW_TURK_SC",
    description: "Slow şarkılar",
  },
  {
    id: "lounge-fm",
    name: "Radyo Lounge",
    genre: "Lounge / Chill",
    emoji: "🍷",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    description: "Chillout & lounge",
  },
  {
    id: "smoothjazz",
    name: "Smooth Jazz",
    genre: "Jazz",
    emoji: "🎷",
    url: "https://smoothjazz.cdnstream1.com/2585_128.mp3",
    description: "Smooth jazz radio",
  },
  {
    id: "ibiza",
    name: "Ibiza Global",
    genre: "Electronic / Dance",
    emoji: "🎛️",
    url: "https://streaming.ibizaglobalradio.com:8024/;",
    description: "Electronic & dance hits",
  },
];

// Radio Browser API endpoint
// Birden fazla mirror var, biri çalışmazsa diğerine geçilir
const API_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
];

interface RBStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  url: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  clickcount: number;
  lastcheckok: number;
}

const GENRE_EMOJI: Record<string, string> = {
  pop: "🎤",
  rock: "🎸",
  jazz: "🎷",
  classical: "🎻",
  electronic: "🎛️",
  dance: "💃",
  hits: "⭐",
  news: "📰",
  talk: "🗣️",
  folk: "🪕",
  arabesk: "🎺",
  slow: "🌙",
  turkish: "🇹🇷",
  default: "📻",
};

function pickEmoji(tags: string, name: string): string {
  const lower = (tags + " " + name).toLowerCase();
  for (const [k, e] of Object.entries(GENRE_EMOJI)) {
    if (lower.includes(k)) return e;
  }
  return GENRE_EMOJI.default;
}

// Radio Browser API'dan Türk radyolarını çek
export async function fetchTurkishStations(): Promise<RadioStation[]> {
  for (const base of API_MIRRORS) {
    try {
      const res = await fetch(
        `${base}/json/stations/search?countrycode=TR&hidebroken=true&order=clickcount&reverse=true&limit=40&codec=MP3`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) continue;
      const data: RBStation[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const stations: RadioStation[] = data
        .filter((s) => s.url_resolved && s.lastcheckok === 1)
        .slice(0, 25)
        .map((s) => ({
          id: s.stationuuid,
          name: s.name.trim().slice(0, 30),
          genre: (s.tags || s.codec || "Müzik").split(",")[0].trim().slice(0, 25) || "Müzik",
          emoji: pickEmoji(s.tags || "", s.name),
          url: s.url_resolved,
          description: `${s.bitrate || 128}kbps · ${s.clickcount || 0} dinleyici`,
          homepage: s.homepage,
        }));

      if (stations.length > 0) return stations;
    } catch (e) {
      console.warn(`Radio API mirror ${base} failed:`, e);
    }
  }
  return FALLBACK_STATIONS;
}

// Tıklama bildirimi (popülarite için)
export async function reportClick(stationUuid: string) {
  if (!stationUuid || stationUuid.length < 10) return; // sadece UUID'ler
  for (const base of API_MIRRORS) {
    try {
      await fetch(`${base}/json/url/${stationUuid}`, { method: "GET" });
      return;
    } catch {}
  }
}
