// SohbetGo Service Worker — PWA + Bildirim
const CACHE_NAME = "sohbetgo-v1";
const OFFLINE_URL = "/index.html";

// Install — sadece kritik dosyaları cache'le
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/images/sohbetgo-icon.png",
        "/manifest.json",
      ]).catch(() => {
        // Bazı dosyalar yoksa da devam et
      });
    })
  );
  self.skipWaiting();
});

// Activate — eski cache'leri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first stratejisi (yeni içerik öncelikli)
self.addEventListener("fetch", (event) => {
  // Sadece GET istekleri
  if (event.request.method !== "GET") return;

  // Firebase ve API istekleri cache'lenmesin
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("radio-browser") ||
    url.hostname.includes("streamtheworld") ||
    url.hostname.includes("kiwiirc")
  ) {
    return; // Browser kendi yapsın
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı response'u cache'le
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline ise cache'den ver
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Push notification — Firebase'den gelen bildirim
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SohbetGo", body: event.data ? event.data.text() : "Yeni mesaj" };
  }

  const title = data.title || "SohbetGo";
  const options = {
    body: data.body || "Yeni bir mesajın var",
    icon: "/images/sohbetgo-icon.png",
    badge: "/images/sohbetgo-icon.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/#/chat",
      timestamp: Date.now(),
    },
    actions: [
      { action: "open", title: "💬 Aç" },
      { action: "close", title: "✕ Kapat" },
    ],
    tag: data.tag || "sohbetgo-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanma
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url || "/#/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Açık tab varsa odakla
      for (const client of clientList) {
        if (client.url.includes("sohbetgo") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Yoksa yeni tab aç
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
