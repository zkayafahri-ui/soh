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
    <div className="min-h-screen theme-bg-secondary">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[rgb(var(--accent-from)/0.15)] rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-[rgb(var(--accent-to)/0.15)] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgb(var(--accent-from)/0.1)] border border-[rgb(var(--accent-from)/0.2)] theme-text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {totalOnline > 0
                ? `Şu an ${totalOnline} kişi çevrimiçi`
                : "Türkiye'nin yeni nesil sohbet platformu"}
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight theme-text-primary leading-[1.05] mb-6">
              Türkiye'nin{" "}
              <span className="theme-accent-text">
                en hızlı
              </span>
              <br />
              sohbet platformu
            </h1>

            <p className="text-lg sm:text-xl theme-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
              SohbetGo ile <strong className="theme-text-primary">ücretsiz</strong>,{" "}
              <strong className="theme-text-primary">kayıtsız</strong> ve{" "}
              <strong className="theme-text-primary">anlık</strong> sohbet odalarına
              katıl. Yeni insanlarla tanış, ortak ilgi alanlarını keşfet.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => onNavigate("chat")}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl theme-accent-gradient text-white font-bold shadow-xl shadow-[rgb(var(--accent-from)/0.3)] transition-all hover:scale-105 active:scale-95"
              >
                🚀 Hemen Sohbete Başla
              </button>
              <button
                onClick={() => onNavigate("blog")}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl theme-bg-primary hover:theme-bg-tertiary border border-[rgb(var(--border)/0.2)] theme-text-primary font-bold transition shadow-lg"
              >
                📚 Blog'u Keşfet
              </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[
                { v: ROOMS.length + "+", l: "Sohbet Odası" },
                { v: "100%", l: "Ücretsiz" },
                { v: "0sn", l: "Kayıt Süresi" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl theme-bg-primary border border-[rgb(var(--border)/0.1)]"
                >
                  <div className="text-xl sm:text-2xl font-bold theme-text-primary">
                    {s.v}
                  </div>
                  <div className="text-[10px] sm:text-xs theme-text-secondary uppercase tracking-wider font-semibold">
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
            <h2 className="text-3xl sm:text-4xl font-bold theme-text-primary mb-2">
              Aktif Sohbet Odaları
            </h2>
            <p className="theme-text-secondary">
              İlgi alanına göre odanı seç ve hemen katıl
            </p>
          </div>
          <button
            onClick={() => onNavigate("chat")}
            className="hidden sm:block text-sm text-indigo-500 hover:text-indigo-400 font-bold"
          >
            Tümünü görüntüle →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROOMS.map((room) => {
            const count = stats[room.id] || 0;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className="group relative overflow-hidden rounded-3xl p-6 text-left theme-bg-primary border border-[rgb(var(--border)/0.1)] hover:border-[rgb(var(--accent-from)/0.4)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${room.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                />
                <div className="relative flex items-start gap-5">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${room.color} flex items-center justify-center text-3xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {room.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold theme-text-primary text-xl">
                        {room.name}
                      </h3>
                      {count > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm theme-text-secondary mb-4 line-clamp-2">
                      {room.description}
                    </p>
                    <span className="inline-flex items-center gap-2 text-xs font-bold theme-accent-text group-hover:gap-3 transition-all">
                      ODAYA KATIL <span>→</span>
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

      {/* SEO-POWERED FOOTER */}
      <footer className="border-t border-white/5 mt-16 bg-slate-950/50 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl theme-accent-gradient flex items-center justify-center text-xl shadow-lg">
                  💬
                </div>
                <span className="font-bold text-2xl text-white">SohbetGo</span>
              </div>
              <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
                SohbetGo, Türkiye'nin her yerinden ve dünyadan binlerce kullanıcıyı bir araya getiren modern, güvenli ve ücretsiz bir sohbet platformudur. Üyeliksiz chat ve mobil uyumlu odalarımızla anlık iletişimin keyfini çıkarın.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-xs">Hızlı Erişim</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><button onClick={() => onNavigate("chat")} className="hover:text-indigo-400 transition">Sohbet Odaları</button></li>
                <li><button onClick={() => onNavigate("irc")} className="hover:text-indigo-400 transition">IRC Bağlantısı</button></li>
                <li><button onClick={() => onNavigate("blog")} className="hover:text-indigo-400 transition">Sohbet Blog</button></li>
                <li><button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="hover:text-indigo-400 transition">Anasayfa</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-xs">Popüler Odalar</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><button onClick={() => onSelectRoom("genel")} className="hover:text-emerald-400 transition">#Genel</button></li>
                <li><button onClick={() => onSelectRoom("teknoloji")} className="hover:text-emerald-400 transition">#Teknoloji</button></li>
                <li><button onClick={() => onSelectRoom("muzik")} className="hover:text-emerald-400 transition">#Müzik</button></li>
                <li><button onClick={() => onSelectRoom("oyun")} className="hover:text-emerald-400 transition">#Oyun</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {["sohbet", "chat", "sohbet odaları", "mobil chat", "canlı sohbet", "bedava sohbet", "sohbet siteleri", "türkçe chat", "üyeliksiz sohbet", "irc sohbet"].map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-600 uppercase font-mono">#{tag.replace(/\s+/g, '')}</span>
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">
                © {new Date().getFullYear()} SohbetGo.Net — Türkiye'nin Lider Chat Platformu
              </p>
              <p className="text-[10px] text-slate-700 mt-1 uppercase tracking-tighter">
                Bedava Sohbet • Mobil Sohbet • Kaliteli Chat • Güvenilir Sohbet Odaları
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
