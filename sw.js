// 채쌤보드 — 앱 설치용 서비스 워커
// 항상 인터넷에서 최신 파일을 먼저 받고, 학교 와이파이가 잠깐 끊겼을 때만 저장해 둔 화면을 보여 줘요.
const CACHE = 'chaessaem-board-v1';
const SHELL = ['./index.html', './remote.html', './common.js', './icons/board-192.png', './icons/remote-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // 같은 사이트의 화면 파일만 (컴시간·급식 중계와 파이어베이스는 그대로 통과)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
