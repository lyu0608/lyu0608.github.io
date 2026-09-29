/* 單字王 2000 離線快取（Service Worker）
   更新網頁後，把下面的版本號 +1（例如 v2），手機上的 App 就會抓新版 */
const CACHE = "wb2000-v1";

const CORE = [
  "./",
  "./index.html",
  "./2000words.html",
  "./vocab.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u))))   // 某個檔案不存在也不影響安裝
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSupabaseLib = url.href.startsWith("https://cdn.jsdelivr.net/npm/@supabase/");
  if (!sameOrigin && !isSupabaseLib) return;   // Supabase 資料庫、Google 圖示等一律走網路

  // 網頁本身：先抓網路上的新版，沒網路才用快取
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match("./2000words.html")))
    );
    return;
  }

  // 其他檔案（圖示、程式庫）：有快取就用快取
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
