import { useEffect, useState } from "react";
import { ROOMS } from "../data/rooms";
import { ARTICLES } from "../data/articles";
import { subscribeRoomStats } from "../services/chatService";

interface Props {
  onNavigate: (page: string) => void;
  onOpenArticle: (slug: string) => void;
  onSelectRoom: (roomId: string) => void;
}

export default function Home({ onNavigate, onOpenArticle, onSelectRoom }: Props) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [totalOnline, setTotalOnline] = useState(0);

  useEffect(() => {
    const unsub = subscribeRoomStats((s) => {
      setStats(s);
      setTotalOnline(Object.values(s).reduce((a, b) => a + b, 0));
    });
    return unsub;
  }, []);

  const featuredArticles = ARTICLES.slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {totalOnline > 0
                ? `Şu an ${totalOnline} kişi çevrimiçi`
                : "Türkiye'nin yeni nesil sohbet platformu"}
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
              Türkiye'nin{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                en hızlı
              </span>
              <br />
              sohbet platformu
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              SohbetGo ile <strong className="text-white">ücretsiz</strong>,{" "}
              <strong className="text-white">kayıtsız</strong> ve{" "}
              <strong className="text-white">anlık</strong> sohbet odalarına
              katıl. Yeni insanlarla tanış, ortak ilgi alanlarını keşfet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => onNavigate("chat")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-xl shadow-indigo-500/30 transition-all hover:scale-105"
              >
                🚀 Hemen Sohbete Başla
              </button>
              <button
                onClick={() => onNavigate("blog")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition"
              >
                📚 Blog'u Keşfet
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[
                { v: ROOMS.length + "+", l: "Sohbet Odası" },
                { v: "100%", l: "Ücretsiz" },
                { v: "0sn", l: "Kayıt Süresi" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {s.v}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROOMS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Aktif Sohbet Odaları
            </h2>
            <p className="text-slate-400">
              İlgi alanına göre odanı seç ve hemen katıl
            </p>
          </div>
          <button
            onClick={() => onNavigate("chat")}
            className="hidden sm:block text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Tümünü görüntüle →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROOMS.map((room) => {
            const count = stats[room.id] || 0;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className="group relative overflow-hidden rounded-2xl p-5 text-left bg-slate-900/50 border border-white/5 hover:border-white/20 hover:bg-slate-900/80 transition-all"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${room.color} opacity-0 group-hover:opacity-10 transition-opacity`}
                />
                <div className="relative flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${room.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg group-hover:scale-110 transition`}
                  >
                    {room.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg">
                        {room.name}
                      </h3>
                      {count > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                      {room.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:gap-2 transition-all">
                      Odaya Katıl <span>→</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Neden SohbetGo?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Modern teknoloji altyapısıyla geliştirilen profesyonel sohbet
            deneyimi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: "⚡",
              title: "Anlık Mesajlaşma",
              desc: "Firebase Realtime altyapısı ile mesajlar milisaniyeler içinde iletilir.",
              color: "from-yellow-500 to-orange-500",
            },
            {
              icon: "🔒",
              title: "Güvenli & Anonim",
              desc: "Kişisel bilgilerini paylaşmadan, sadece nick ile sohbet edebilirsin.",
              color: "from-green-500 to-emerald-500",
            },
            {
              icon: "📱",
              title: "Mobil Uyumlu",
              desc: "Telefon, tablet ve bilgisayardan sorunsuz responsive deneyim.",
              color: "from-blue-500 to-cyan-500",
            },
            {
              icon: "🎨",
              title: "Modern Tasarım",
              desc: "Göz yormayan, profesyonel ve kullanışlı arayüz tasarımı.",
              color: "from-purple-500 to-pink-500",
            },
            {
              icon: "🌍",
              title: "7/24 Aktif",
              desc: "Türkiye'nin her yerinden, dünyanın dört bir köşesinden kullanıcılar.",
              color: "from-indigo-500 to-blue-500",
            },
            {
              icon: "💯",
              title: "Tamamen Ücretsiz",
              desc: "Hiçbir gizli ücret yok. Tüm özellikler her kullanıcı için açık.",
              color: "from-rose-500 to-red-500",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/20 transition"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Sohbet Blog'u
            </h2>
            <p className="text-slate-400">
              Online sohbet hakkında ipuçları, rehberler ve haberler
            </p>
          </div>
          <button
            onClick={() => onNavigate("blog")}
            className="hidden sm:block text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Tüm yazılar →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredArticles.map((a) => (
            <article
              key={a.slug}
              onClick={() => onOpenArticle(a.slug)}
              className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/40 hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="aspect-video bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center text-6xl">
                {a.icon}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                    {a.category}
                  </span>
                  <span className="text-slate-500">{a.readTime} dk okuma</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2 leading-tight group-hover:text-indigo-300 transition">
                  {a.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2">
                  {a.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 sm:p-12 text-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Sohbete katılmaya hazır mısın?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Sadece bir nick adı seç, saniyeler içinde Türkiye'nin en aktif
              sohbet topluluğuna katıl.
            </p>
            <button
              onClick={() => onNavigate("chat")}
              className="px-10 py-4 rounded-2xl bg-white text-indigo-600 font-bold text-lg shadow-xl hover:scale-105 transition"
            >
              Şimdi Başla 🚀
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base">
              💬
            </div>
            <span className="font-bold text-white">SohbetGo</span>
          </div>
          <p className="text-sm text-slate-500 mb-2">
            © {new Date().getFullYear()} SohbetGo. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-slate-600">
            www.sohbetgo.net • Ücretsiz online sohbet odaları
          </p>
        </div>
      </footer>
    </div>
  );
}
