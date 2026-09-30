import { useEffect, useState } from "react";
import { ARTICLES } from "../data/articles";
import { ROOMS } from "../data/rooms";
import { subscribeRoomStats } from "../services/chatService";

interface Props {
  onNavigate: (page: string) => void;
  onOpenArticle: (slug: string) => void;
  onSelectRoom: (roomId: string) => void;
}

const FEATURES = [
  {
    icon: "✳",
    title: "İlgine göre odalar",
    description:
      "Genel sohbetten müziğe, oyunlardan teknolojiye kadar sana uyan bir konu seç.",
  },
  {
    icon: "◉",
    title: "Kendi nickinle katıl",
    description:
      "Sohbete bir kullanıcı adıyla başlayabilir, istersen nickini ayrıca kaydedebilirsin.",
  },
  {
    icon: "↗",
    title: "Her ekranda sohbet",
    description:
      "Telefonunda, tabletinde ya da bilgisayarında; sohbet alanı sana uyum sağlar.",
  },
];

export default function Home({
  onNavigate,
  onOpenArticle,
  onSelectRoom,
}: Props) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [totalOnline, setTotalOnline] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeRoomStats((roomStats) => {
      setStats(roomStats);
      setTotalOnline(
        Object.values(roomStats).reduce((total, count) => total + count, 0),
      );
    });
    return unsubscribe;
  }, []);

  const featuredArticles = ARTICLES.slice(0, 3);

  return (
    <main className="landing" id="ust">
      <section className="landing-hero">
        <div className="landing-hero-glow landing-hero-glow-left" />
        <div className="landing-hero-glow landing-hero-glow-right" />
        <div className="landing-container landing-hero-layout">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-mark" aria-hidden="true">
                ✦
              </span>
              SohbetGo’ya hoş geldin
            </div>
            <h1>
              Güzel bir sohbet,
              <br />
              <span>bir selamla başlar.</span>
            </h1>
            <p className="landing-hero-description">
              İlgi alanına uygun bir oda seç, nickini belirle ve sohbete katıl.
              Yeni tanışmalar için yerin hazır.
            </p>
            <div className="landing-actions">
              <button
                className="landing-button landing-button-primary"
                onClick={() => onNavigate("chat")}
              >
                Sohbete başla <span aria-hidden="true">↗</span>
              </button>
              <a className="landing-button landing-button-secondary" href="#odalar">
                Odaları keşfet <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="landing-hero-note">
              <span aria-hidden="true">☼</span>
              Sohbet etmek için kendin gibi olman yeterli.
            </div>
          </div>

          <div className="landing-hero-art">
            <div className="landing-art-orbit landing-art-orbit-one" />
            <div className="landing-art-orbit landing-art-orbit-two" />
            <img
              className="landing-banner"
              src="/images/sohbetgo-banner.png"
              alt="SohbetGo sohbet balonları görseli"
              fetchPriority="high"
            />
            <div className="landing-art-card landing-art-card-top">
              <span className="landing-art-card-icon" aria-hidden="true">
                ☺
              </span>
              <span>
                <strong>Ortak bir konu</strong>
                <small>Yeni bir sohbete açılan kapı</small>
              </span>
            </div>
            <div className="landing-art-card landing-art-card-bottom">
              <span className="landing-online-indicator" aria-hidden="true" />
              <span>
                <strong>
                  {totalOnline > 0
                    ? `Odalarda ${totalOnline} çevrimiçi`
                    : "Sohbet odaları"}
                </strong>
                <small>
                  {totalOnline > 0
                    ? "Odaların toplam çevrimiçi sayısı"
                    : "Sana uyan bir konu seç"}
                </small>
              </span>
            </div>
          </div>
        </div>
        <div className="landing-container landing-hero-footer">
          <span>İlgi alanını bul</span>
          <span className="landing-hero-footer-line" />
          <span>Selam ver</span>
          <span className="landing-hero-footer-line" />
          <span>Sohbete katıl</span>
        </div>
      </section>

      <section className="landing-section landing-rooms" id="odalar">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">Buluşma noktaların</p>
              <h2>Bugün ne konuşalım?</h2>
              <p className="landing-section-intro">
                Merak ettiğin konuya göre bir oda seç; sohbet orada başlasın.
              </p>
            </div>
            <button
              className="landing-text-link"
              onClick={() => onNavigate("chat")}
            >
              Tüm odaları gör <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="landing-room-grid">
            {ROOMS.slice(0, 6).map((room) => {
              const count = stats[room.id] || 0;
              return (
                <button
                  className="landing-room-card"
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                >
                  <span className="landing-room-icon" aria-hidden="true">
                    {room.icon}
                  </span>
                  <span className="landing-room-content">
                    <span className="landing-room-title">{room.name}</span>
                    <span className="landing-room-description">
                      {room.description}
                    </span>
                  </span>
                  <span className="landing-room-end">
                    {count > 0 && (
                      <span className="landing-room-count">
                        <span aria-hidden="true" />
                        {count}
                      </span>
                    )}
                    <span className="landing-room-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="landing-room-footnote">
            {totalOnline > 0
              ? `Odalar toplamında şu an ${totalOnline} çevrimiçi katılım var.`
              : "Bir oda seç ve sohbete katıl."}
          </p>
        </div>
      </section>

      <section className="landing-section landing-how">
        <div className="landing-container landing-how-layout">
          <div className="landing-how-intro">
            <p className="landing-kicker">Kolayca katıl</p>
            <h2>İlk mesajına<br />üç adım var.</h2>
            <p>
              İster yeni insanlarla tanış, ister sevdiğin konular üzerine
              konuş. Sohbetin ritmini sen belirle.
            </p>
            <button
              className="landing-text-link"
              onClick={() => onNavigate("chat")}
            >
              Hemen sohbete geç <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="landing-steps">
            {[
              {
                number: "01",
                title: "Bir oda seç",
                description:
                  "Genel sohbeti veya ilgini çeken başlıklardan birini aç.",
              },
              {
                number: "02",
                title: "Nickini belirle",
                description:
                  "Kullanıcı adını yaz; istersen nickini daha sonra kaydedebilirsin.",
              },
              {
                number: "03",
                title: "Sohbete katıl",
                description:
                  "Mesajını gönder, konuşmaya katıl ve yeni bağlantılar kur.",
              },
            ].map((step) => (
              <div className="landing-step" key={step.number}>
                <span className="landing-step-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <span className="landing-step-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-features">
        <div className="landing-container">
          <div className="landing-section-heading landing-section-heading-center">
            <div>
              <p className="landing-kicker">Sohbetin güzel hali</p>
              <h2>Senin için tasarlandı</h2>
              <p className="landing-section-intro">
                Tanışmayı ve sohbete katılmayı kolaylaştıran küçük detaylar.
              </p>
            </div>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature, index) => (
              <article className="landing-feature-card" key={feature.title}>
                <span className="landing-feature-number">
                  0{index + 1}
                </span>
                <span className="landing-feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-community">
        <div className="landing-container landing-community-inner">
          <div className="landing-community-mark" aria-hidden="true">
            <span>✳</span>
            <span>☼</span>
            <span>✦</span>
          </div>
          <div className="landing-community-copy">
            <p className="landing-kicker">Birlikte daha güzel</p>
            <h2>İyi sohbet, iyi niyetle başlar.</h2>
            <p>
              Herkesin kendini rahatça ifade edebildiği bir ortam için nazik
              ol, kişisel bilgilerini paylaşırken dikkatli davran ve oda
              kurallarına göz at.
            </p>
          </div>
          <button
            className="landing-community-link"
            onClick={() => onNavigate("chat")}
          >
            Topluluğa katıl <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      {featuredArticles.length > 0 && (
        <section className="landing-section landing-journal">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-kicker">SohbetGo’dan notlar</p>
                <h2>Biraz da okuyalım</h2>
                <p className="landing-section-intro">
                  Sohbet kültürü ve çevrimiçi iletişim üzerine yazılar.
                </p>
              </div>
              <button
                className="landing-text-link"
                onClick={() => onNavigate("blog")}
              >
                Bloga göz at <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="landing-article-grid">
              {featuredArticles.map((article) => (
                <button
                  className="landing-article-card"
                  key={article.slug}
                  onClick={() => onOpenArticle(article.slug)}
                >
                  <span className="landing-article-icon" aria-hidden="true">
                    {article.icon}
                  </span>
                  <span className="landing-article-meta">
                    {article.category} <span aria-hidden="true">·</span>{" "}
                    {article.readTime} dk okuma
                  </span>
                  <span className="landing-article-title">{article.title}</span>
                  <span className="landing-article-description">
                    {article.description}
                  </span>
                  <span className="landing-article-read">
                    Yazıyı oku <span aria-hidden="true">↗</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="landing-final-cta">
        <div className="landing-container">
          <div className="landing-final-cta-card">
            <div className="landing-final-cta-orb" />
            <div className="landing-final-cta-copy">
              <p className="landing-kicker">Söz sende</p>
              <h2>Bir selamla başlayalım mı?</h2>
              <p>
                Sana uyan odayı seç, sohbete kendi tarzınla katıl.
              </p>
            </div>
            <button
              className="landing-button landing-button-light"
              onClick={() => onNavigate("chat")}
            >
              Sohbete katıl <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <button
                className="landing-brand"
                onClick={() => onNavigate("home")}
                aria-label="SohbetGo ana sayfa"
              >
                <img src="/images/sohbetgo-icon.png" alt="" />
                <span>SohbetGo</span>
              </button>
              <p>
                Yeni tanışmalar ve güzel sohbetler için dijital buluşma
                noktan.
              </p>
            </div>
            <div className="landing-footer-column">
              <h3>Keşfet</h3>
              <button onClick={() => onNavigate("chat")}>Sohbet odaları</button>
              <button onClick={() => onNavigate("irc")}>IRC bağlantısı</button>
              <button onClick={() => onNavigate("blog")}>Blog</button>
            </div>
            <div className="landing-footer-column">
              <h3>Popüler odalar</h3>
              {ROOMS.slice(0, 3).map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} SohbetGo</span>
            <button onClick={() => onNavigate("home")}>
              Türkiye’den, herkese bir merhaba.
            </button>
            <a
              href="#ust"
              onClick={(event) => {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Başa dön ↑
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
