// Offline: Netz zuerst, sonst Cache. / 오프라인 지원: 네트워크 우선, 실패하면 캐시.
const CACHE = 'shopping-list-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'firebase-config.js'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  // Nur die App selbst und die Firebase-Bibliothek; Datenverbindungen (Firestore, Anmeldung) bleiben unberührt.
  // 앱 파일과 Firebase 라이브러리만 처리. 데이터 연결(Firestore, 로그인)은 건드리지 않음.
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && u.origin !== 'https://www.gstatic.com')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs[0] ? cs[0].focus() : self.clients.openWindow('./')));
});
