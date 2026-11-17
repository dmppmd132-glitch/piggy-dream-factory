/* 豬豬夢工場 Service Worker：讓遊戲可離線開啟、可安裝到主畫面 */
const CACHE = 'piggy-dream-factory-v13';
const ASSETS = [
  './',
  './index.html',
  './game-core.js',
  './personalities.js',
  './config.js',
  './manifest.webmanifest',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// 安裝：預先快取遊戲所需檔案。不要在這裡 skipWaiting，讓頁面可以提示玩家更新。
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// 收到頁面上的「立即更新」後才切換到新版。
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// 啟用：清掉舊版本快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 請求：同網域 GET 採「先給快取、背景更新」；Gemini API 等跨網域請求完全不攔截
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || fetched;
    })
  );
});
