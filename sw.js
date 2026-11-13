// Offline: Netz zuerst, sonst Cache. / 오프라인 지원: 네트워크 우선, 실패하면 캐시.
// App-Dateien werden immer beim Server nachgefragt (cache: 'no-cache'): GitHub Pages erlaubt sonst 10 Minuten
// alte Kopien, und die installierte App zeigt nach dem Neustart noch die alte Version.
// 앱 파일은 매번 서버에 "바뀌었나요?"를 물어봄. GitHub Pages의 10분 저장 표시 때문에 홈 화면 앱이
// 껐다 켜도 예전 화면을 보여 주는 일을 막음. 안 바뀌었으면 서버가 짧게 "그대로"라고만 답함.
const CACHE = 'shopping-list-v2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'firebase-config.js'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  // Alte Versionen aufräumen / 예전 버전 정리
  for (const k of await caches.keys()) if (k.startsWith('shopping-list-v') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  // Nur die App selbst und die Firebase-Bibliothek; Datenverbindungen (Firestore, Anmeldung) bleiben unberührt.
  // 앱 파일과 Firebase 라이브러리만 처리. 데이터 연결(Firestore, 로그인)은 건드리지 않음.
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && u.origin !== 'https://www.gstatic.com')) return;
  const own = u.origin === location.origin;
  e.respondWith(
    (own ? fetch(u.href, { cache: 'no-cache' }) : fetch(e.request)).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: own }))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs[0] ? cs[0].focus() : self.clients.openWindow('./')));
});
