import { useState, useMemo } from "react";
import { ARTICLES, ARTICLE_CATEGORIES } from "../data/articles";

interface Props {
  onOpenArticle: (slug: string) => void;
}

export default function Blog({ onOpenArticle }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Tümü");

  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "Tümü" || a.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative py-12 sm:py-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-500/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
            📰 SohbetGo Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Sohbet Dünyasının Nabzı
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Online sohbet, dijital iletişim, topluluk yönetimi ve teknoloji
            üzerine derinlemesine yazılar
          </p>

          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Yazı ara..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-slate-700 focus:border-indigo-500 rounded-2xl text-white placeholder-slate-500 outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                🔍
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {["Tümü", ...ARTICLE_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                category === c
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-slate-900/60 text-slate-400 border border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            Aradığınız kriterde yazı bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((a) => (
              <article
                key={a.slug}
                onClick={() => onOpenArticle(a.slug)}
                className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/40 hover:-translate-y-1 transition-all overflow-hidden"
              >
                <div className="aspect-video bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center text-6xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                  </div>
                  <span className="relative">{a.icon}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                      {a.category}
                    </span>
                    <span className="text-slate-500">{a.readTime} dk</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">
                      {new Date(a.date).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2 leading-tight group-hover:text-indigo-300 transition">
                    {a.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3">
                    {a.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:gap-2 transition-all">
                    Devamını oku <span>→</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 text-center text-sm text-slate-500">
          {filtered.length} / {ARTICLES.length} yazı gösteriliyor
        </div>
      </section>
    </div>
  );
}
