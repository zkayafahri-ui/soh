import { useEffect } from "react";
import { ARTICLES } from "../data/articles";

interface Props {
  slug: string;
  onBack: () => void;
  onOpenArticle: (slug: string) => void;
  onNavigate: (page: string) => void;
}

export default function ArticleView({ slug, onBack, onOpenArticle, onNavigate }: Props) {
  const article = ARTICLES.find((a) => a.slug === slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (article) {
      document.title = `${article.title} | SohbetGo Blog`;
    }
    return () => {
      document.title = "SohbetGo — Ücretsiz Online Sohbet Odaları | sohbetgo.net";
    };
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Yazı bulunamadı.</p>
          <button
            onClick={onBack}
            className="text-indigo-400 hover:text-indigo-300"
          >
            ← Blog'a dön
          </button>
        </div>
      </div>
    );
  }

  const related = ARTICLES.filter(
    (a) => a.slug !== slug && a.category === article.category
  ).slice(0, 3);

  const paragraphs = article.content.split("\n\n");

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/15 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1 mb-6"
          >
            ← Blog'a dön
          </button>

          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
              {article.category}
            </span>
            <span className="text-slate-500">{article.readTime} dk okuma</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">
              {new Date(article.date).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            {article.description}
          </p>

          <div className="aspect-[2/1] rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center text-8xl border border-white/5 mb-8">
            {article.icon}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="prose prose-invert max-w-none">
          {paragraphs.map((p, i) => {
            // **bold** parse
            const parts = p.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p
                key={i}
                className="text-slate-300 text-base sm:text-lg leading-relaxed mb-5"
              >
                {parts.map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j} className="text-white font-semibold">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </p>
            );
          })}
        </div>

        {/* TAGS */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((k) => (
              <span
                key={k}
                className="px-3 py-1 rounded-full text-xs bg-slate-800/60 text-slate-400 border border-white/5"
              >
                #{k.replace(/\s+/g, "")}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            Sohbete katılmak ister misin?
          </h3>
          <p className="text-white/80 mb-5">
            SohbetGo'da hemen ücretsiz sohbete başla
          </p>
          <button
            onClick={() => onNavigate("chat")}
            className="px-8 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:scale-105 transition"
          >
            Sohbete Git 💬
          </button>
        </div>
      </article>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-2xl font-bold text-white mb-6">
            İlgili Yazılar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((a) => (
              <article
                key={a.slug}
                onClick={() => onOpenArticle(a.slug)}
                className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/40 transition-all p-5"
              >
                <div className="text-3xl mb-3">{a.icon}</div>
                <h3 className="font-bold text-white text-base mb-2 group-hover:text-indigo-300 transition leading-tight">
                  {a.title}
                </h3>
                <p className="text-xs text-slate-500">{a.readTime} dk okuma</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
