// 오늘의 할 일 — 서비스 워커 (오프라인 지원)

// 캐시 버전: 앱 파일을 수정할 때마다 숫자를 올린다
const CACHE_VERSION = 12;
const CACHE_NAME = `daily-todo-cache-v${CACHE_VERSION}`;

// 설치 시 미리 저장할 앱 파일 (모두 상대 경로)
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './js/core.js',
  './js/icons.js',
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

// 요청 처리: 네트워크 우선 (온라인이면 항상 새 파일, 받은 파일은 캐시에 갱신)
// 오프라인일 때만 캐시를 쓴다. 같은 출처의 GET 요청만 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    // 브라우저 HTTP 캐시(최대 10분)도 건너뛰고 서버에 새 버전이 있는지 확인한다
    fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        // 오프라인에서 페이지 이동 요청이면 앱 첫 화면을 돌려준다
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })),
  );
});
