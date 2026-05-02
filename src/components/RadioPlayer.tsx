import { useEffect, useRef, useState } from "react";
import {
  FALLBACK_STATIONS,
  fetchTurkishStations,
  reportClick,
  type RadioStation,
} from "../data/radioStations";

const STORAGE_KEY = "sohbetgo_radio_state";
const STATIONS_CACHE_KEY = "sohbetgo_radio_stations_v2";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 saat

interface SavedState {
  stationId: string;
  volume: number;
}

function loadState(): SavedState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (s) return s;
  } catch {}
  return { stationId: FALLBACK_STATIONS[0].id, volume: 0.6 };
}

function saveState(s: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function loadStationsCache(): RadioStation[] | null {
  try {
    const raw = localStorage.getItem(STATIONS_CACHE_KEY);
    if (!raw) return null;
    const { stations, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    if (!Array.isArray(stations) || stations.length === 0) return null;
    return stations;
  } catch {
    return null;
  }
}

function saveStationsCache(stations: RadioStation[]) {
  try {
    localStorage.setItem(
      STATIONS_CACHE_KEY,
      JSON.stringify({ stations, ts: Date.now() })
    );
  } catch {}
}

export default function RadioPlayer() {
  const [stations, setStations] = useState<RadioStation[]>(() => {
    const cached = loadStationsCache();
    return cached || FALLBACK_STATIONS;
  });
  const [saved] = useState<SavedState>(loadState());
  const [station, setStation] = useState<RadioStation>(() => {
    const cached = loadStationsCache() || FALLBACK_STATIONS;
    return cached.find((s) => s.id === saved.stationId) || cached[0];
  });
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(saved.volume);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [showStationList, setShowStationList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio elementi oluştur — crossOrigin YOK (radyo stream'leri CORS başlığı göndermez)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volume;
    audioRef.current = audio;

    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
      setError(null);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      setError(`"${station.name}" oynatılamadı. Başka istasyon deneyin (⏭).`);
    };
    const onStalled = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("canplay", onCanPlay);
      audio.src = "";
      audio.removeAttribute("src");
      audio.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // İlk yüklemede API'dan istasyonları çek
  useEffect(() => {
    const cached = loadStationsCache();
    if (!cached) {
      setRefreshing(true);
      fetchTurkishStations()
        .then((list) => {
          if (list.length > 0) {
            setStations(list);
            saveStationsCache(list);
            // Eğer kaydedilen istasyon yeni listede yoksa ilkini seç
            if (!list.find((s) => s.id === saved.stationId)) {
              setStation(list[0]);
            }
          }
        })
        .catch(() => {})
        .finally(() => setRefreshing(false));
    }
  }, [saved.stationId]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
    saveState({ stationId: station.id, volume });
  }, [volume, muted, station.id]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    setError(null);
    if (playing) {
      audioRef.current.pause();
    } else {
      try {
        setLoading(true);
        // Stream URL'i her oynatmada yeniden ata (cache temizle)
        audioRef.current.pause();
        audioRef.current.src = station.url;
        audioRef.current.load();
        await audioRef.current.play();
        // API'ya tıklama bildir
        reportClick(station.id);
      } catch (e: any) {
        setLoading(false);
        const msg = e?.message || "";
        if (msg.includes("user") || msg.includes("interact")) {
          setError("Tarayıcı izni gerekli — butona tekrar tıklayın");
        } else if (msg.includes("supported") || msg.includes("source")) {
          setError(`"${station.name}" formatı desteklenmiyor. Farklı istasyon deneyin (⏭).`);
        } else {
          setError(`Bağlantı kurulamadı. Sonraki istasyonu deneyin (⏭).`);
        }
      }
    }
  };

  const changeStation = async (s: RadioStation, autoPlay = playing) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setStation(s);
    setShowStationList(false);
    setError(null);
    setPlaying(false);

    if (autoPlay) {
      try {
        setLoading(true);
        audioRef.current.src = s.url;
        audioRef.current.load();
        await audioRef.current.play();
        reportClick(s.id);
      } catch (e: any) {
        setLoading(false);
        setError(`"${s.name}" oynatılamadı. Sonrakini deneyin (⏭).`);
      }
    }
  };

  const nextStation = () => {
    const idx = stations.findIndex((s) => s.id === station.id);
    const next = stations[(idx + 1) % stations.length];
    changeStation(next);
  };

  const prevStation = () => {
    const idx = stations.findIndex((s) => s.id === station.id);
    const prev = stations[(idx - 1 + stations.length) % stations.length];
    changeStation(prev);
  };

  const refreshStations = async () => {
    setRefreshing(true);
    try {
      localStorage.removeItem(STATIONS_CACHE_KEY);
      const list = await fetchTurkishStations();
      if (list.length > 0) {
        setStations(list);
        saveStationsCache(list);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-3 py-2 bg-gradient-to-r from-pink-600/30 to-rose-600/30 border-b border-pink-500/30 text-pink-200 text-[12px] font-mono flex items-center justify-center gap-2 hover:from-pink-600/40 hover:to-rose-600/40 transition"
      >
        <span className="text-base">📻</span>
        <span>Radyo Player'ı Aç</span>
        {playing && <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />}
      </button>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-pink-950/60 via-rose-950/40 to-pink-950/60 border-b border-pink-500/30 backdrop-blur-xl">
      {/* Animated equalizer */}
      {playing && (
        <div className="absolute inset-0 overflow-hidden opacity-15 pointer-events-none">
          <div className="flex items-end h-full gap-0.5 px-2">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-pink-500 to-rose-400 rounded-t"
                style={{
                  height: `${30 + Math.random() * 50}%`,
                  animation: `equalizer ${0.5 + Math.random()}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative px-3 py-2.5 flex items-center gap-3 font-mono">
        {/* PLAY/PAUSE */}
        <button
          onClick={togglePlay}
          disabled={loading}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition shadow-lg ${
            playing
              ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-pink-500/40 hover:scale-105"
              : "bg-white/10 text-pink-200 hover:bg-white/20 border border-pink-500/30"
          } ${loading ? "animate-pulse" : ""}`}
          aria-label={playing ? "Durdur" : "Oynat"}
        >
          {loading ? "⏳" : playing ? "⏸" : "▶"}
        </button>

        {/* STATION INFO */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl flex-shrink-0">{station.emoji}</span>
            <button
              onClick={() => setShowStationList((v) => !v)}
              className="text-left min-w-0 group flex-1"
            >
              <div className="text-pink-100 font-bold text-[13px] truncate flex items-center gap-1.5 group-hover:text-white transition">
                {station.name}
                <span className="text-[9px] opacity-60">▾</span>
              </div>
              <div className="text-[10px] text-pink-300/70 truncate flex items-center gap-1.5">
                {playing ? (
                  <>
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-2.5 bg-pink-400 rounded-full animate-pulse" />
                      <span className="w-1 h-1.5 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="w-1 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </span>
                    <span>● CANLI</span>
                  </>
                ) : loading ? (
                  <span>Bağlanıyor...</span>
                ) : (
                  <span className="truncate">{station.genre}</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* PREV / NEXT */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={prevStation}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-pink-200 flex items-center justify-center text-sm transition"
            title="Önceki istasyon"
          >
            ⏮
          </button>
          <button
            onClick={nextStation}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-pink-200 flex items-center justify-center text-sm transition"
            title="Sonraki istasyon"
          >
            ⏭
          </button>
        </div>

        {/* VOLUME */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setMuted(!muted)}
            className="w-7 h-7 rounded hover:bg-white/10 text-pink-200 flex items-center justify-center text-sm transition"
            title={muted ? "Sesi aç" : "Sesi kapat"}
          >
            {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setMuted(false);
              setVolume(parseFloat(e.target.value));
            }}
            className="w-20 accent-pink-500 cursor-pointer"
            aria-label="Ses"
          />
        </div>

        {/* CLOSE */}
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded hover:bg-white/10 text-pink-200/70 flex items-center justify-center text-xs transition flex-shrink-0"
          title="Player'ı gizle"
        >
          ✕
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="px-3 pb-2 text-[11px] text-rose-200 bg-rose-900/40 border-t border-rose-500/30 py-1.5 font-mono flex items-center justify-between gap-2">
          <span className="flex-1 truncate">⚠️ {error}</span>
          <button
            onClick={nextStation}
            className="text-[10px] px-2 py-1 rounded bg-pink-500/20 text-pink-200 hover:bg-pink-500/30 flex-shrink-0 font-bold"
          >
            Sonraki ⏭
          </button>
        </div>
      )}

      {/* STATION LIST DROPDOWN */}
      {showStationList && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowStationList(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 mx-3 bg-slate-900/98 backdrop-blur-xl border border-pink-500/30 rounded-xl shadow-2xl shadow-black/50 z-50 max-h-96 overflow-y-auto">
            <div className="px-3 py-2 border-b border-white/5 sticky top-0 bg-slate-900/98 flex items-center justify-between">
              <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">
                📻 Radyo İstasyonları ({stations.length})
              </span>
              <button
                onClick={refreshStations}
                disabled={refreshing}
                className="text-[10px] text-pink-400 hover:text-pink-200 transition disabled:opacity-50 flex items-center gap-1"
                title="Listeyi yenile"
              >
                <span className={refreshing ? "animate-spin inline-block" : ""}>🔄</span>
                {refreshing ? "Yükleniyor..." : "Yenile"}
              </button>
            </div>
            {stations.map((s) => {
              const isActive = s.id === station.id;
              return (
                <button
                  key={s.id}
                  onClick={() => changeStation(s, true)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 transition ${
                    isActive
                      ? "bg-pink-500/20 border-l-2 border-pink-400"
                      : "hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-[13px] truncate flex items-center gap-2 ${isActive ? "text-pink-200" : "text-slate-200"}`}>
                      {s.name}
                      {isActive && playing && (
                        <span className="text-[9px] text-pink-400 flex-shrink-0">● ÇALIYOR</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {s.genre}
                      {s.description && ` · ${s.description}`}
                    </div>
                  </div>
                </button>
              );
            })}
            {stations.length === 0 && (
              <div className="px-3 py-6 text-center text-slate-500 text-[11px]">
                İstasyon listesi boş
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes equalizer {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
