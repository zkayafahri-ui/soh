import { useEffect, useState } from "react";
import Header from "./components/Header";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import ArticleView from "./pages/ArticleView";
import ChatPage from "./pages/ChatPage";
import CustomIrc from "./pages/CustomIrc";
import { getCurrentUser } from "./services/chatService";
import { registerServiceWorker, initPwaInstall } from "./services/notifications";

type Page = "home" | "chat" | "blog" | "article" | "irc";

interface RouteState {
  page: Page;
  param?: string;
}

function parseHash(): RouteState {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return { page: "home" };
  const [page, param] = hash.split("/");
  if (page === "chat") return { page: "chat", param };
  if (page === "blog") return { page: "blog" };
  if (page === "irc") return { page: "irc" };
  if (page === "article" && param) return { page: "article", param };
  return { page: "home" };
}

function setHash(page: Page, param?: string) {
  const url = "#/" + page + (param ? "/" + param : "");
  if (window.location.hash !== url) {
    window.location.hash = url;
  }
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseHash());
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    // Sayfa yüklenir yüklenmez PWA başlat
    initPwaInstall();
    if (typeof window !== "undefined") {
      registerServiceWorker();
    }

    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (page: string, param?: string) => {
    setHash(page as Page, param);
  };

  const refreshUser = () => setUser(getCurrentUser());

  const isChatPage = route.page === "chat";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!isChatPage && (
        <Header
          current={route.page === "article" ? "blog" : route.page}
          onNavigate={navigate}
          username={user?.username}
        />
      )}

      {isChatPage && (
        <Header
          current="chat"
          onNavigate={navigate}
          username={user?.username}
        />
      )}

      {route.page === "home" && (
        <Home
          onNavigate={navigate}
          onOpenArticle={(slug) => navigate("article", slug)}
          onSelectRoom={(roomId) => navigate("chat", roomId)}
        />
      )}

      {route.page === "blog" && (
        <Blog onOpenArticle={(slug) => navigate("article", slug)} />
      )}

      {route.page === "article" && route.param && (
        <ArticleView
          slug={route.param}
          onBack={() => navigate("blog")}
          onOpenArticle={(slug) => navigate("article", slug)}
          onNavigate={navigate}
        />
      )}

      {route.page === "chat" && (
        <ChatPage
          initialRoomId={route.param}
          onUserChange={refreshUser}
        />
      )}

      {route.page === "irc" && (
        <CustomIrc onNavigate={navigate} />
      )}
    </div>
  );
}
