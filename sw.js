// 회의록 메모장 서비스워커 — 오프라인 동작 + 빠른 실행
// 앱 파일을 바꿔서 배포할 때는 아래 버전 숫자를 올려주세요 (예: mn-v1 -> mn-v2)
const CACHE = 'mn-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // 데이터 전송(API 등)은 그대로 통과

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // 페이지 이동(앱 실행): 네트워크 우선, 실패 시 캐시로 오프라인 동작
    if (req.mode === 'navigate') {
      try {
        const net = await fetch(req);
        cache.put(req, net.clone());
        return net;
      } catch (_) {
        return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./'));
      }
    }

    // 그 외 정적 리소스(아이콘·폰트 등): 캐시 우선, 없으면 네트워크에서 받아 캐시
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && (net.ok || net.type === 'opaque')) cache.put(req, net.clone());
      return net;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
