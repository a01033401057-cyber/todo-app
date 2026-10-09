// 오늘의 할 일 — 서비스 워커 (오프라인 지원)

// 캐시 버전: 앱 파일을 수정할 때마다 숫자를 올린다
const CACHE_VERSION = 8;
const CACHE_NAME = `daily-todo-cache-v${CACHE_VERSION}`;

// 설치 시 미리 저장할 앱 파일 (모두 상대 경로)
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './js/core.js',
  './js/parts.js',
  './js/editor.js',
  './js/settings.js',
  './js/cinema.js',
  './js/goals.js',
  './js/day.js',
  './js/week.js',
  './js/month.js',
  './js/year.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// 설치: 앱 파일 전체를 캐시에 저장하고 바로 대기 상태를 건너뛴다
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

// 활성화: 이전 버전 캐시를 삭제하고 열린 페이지를 바로 제어한다
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('daily-todo-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

// 요청 처리: 캐시 우선, 없으면 네트워크 (같은 출처의 GET 요청만)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        // 오프라인에서 페이지 이동 요청이면 앱 첫 화면을 돌려준다
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    }),
  );
});
