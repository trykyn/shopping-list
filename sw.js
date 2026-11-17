// Offline: Netz zuerst, sonst Cache. / 오프라인 지원: 네트워크 우선, 실패하면 캐시.
// App-Dateien werden immer beim Server nachgefragt (cache: 'no-cache'): GitHub Pages erlaubt sonst 10 Minuten
// alte Kopien, und die installierte App zeigt nach dem Neustart noch die alte Version.
// 앱 파일은 매번 서버에 "바뀌었나요?"를 물어봄. GitHub Pages의 10분 저장 표시 때문에 홈 화면 앱이
// 껐다 켜도 예전 화면을 보여 주는 일을 막음. 안 바뀌었으면 서버가 짧게 "그대로"라고만 답함.
const CACHE = 'shopping-list-v2';
// Bibliothek und Schrift: die Version steht in der Adresse, eine gespeicherte Kopie veraltet also nie.
// 라이브러리와 글꼴: 주소에 버전이 들어 있어서 저장해 둔 것이 낡지 않음.
const FIXED = ['https://www.gstatic.com', 'https://cdn.jsdelivr.net'];
// So lange wird bei schwachem Empfang auf den Server gewartet, bevor die gespeicherte Kopie kommt.
// 신호가 약할 때 서버를 이만큼만 기다리고, 그 뒤에는 저장해 둔 것을 보여 줌.
const WAIT_MS = 3000;

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
  // Nur die App selbst, die Firebase-Bibliothek und die Schrift; Datenverbindungen (Firestore, Anmeldung) bleiben unberührt.
  // 앱 파일, Firebase 라이브러리, 글꼴만 처리. 데이터 연결(Firestore, 로그인)은 건드리지 않음.
  const u = new URL(e.request.url), own = u.origin === location.origin;
  if (e.request.method !== 'GET' || (!own && !FIXED.includes(u.origin))) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), cached = await cache.match(e.request, { ignoreSearch: own });
    if (cached && !own) return cached;
    const net = (own ? fetch(u.href, { cache: 'no-cache' }) : fetch(e.request)).then(r => {
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    });
    if (!cached) return net;
    // Eigene Dateien: Netz zuerst; ohne Netz oder nach WAIT_MS die gespeicherte Kopie (das Laden läuft weiter
    // und frischt sie für das nächste Mal auf). / 앱 파일: 네트워크 우선. 안 되거나 WAIT_MS가 지나면 저장본
    // (받던 것은 계속 받아서 다음번을 위해 저장).
    e.waitUntil(net.catch(() => {}));
    return Promise.race([net.catch(() => cached), new Promise(done => setTimeout(() => done(cached), WAIT_MS))]);
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs[0] ? cs[0].focus() : self.clients.openWindow('./')));
});
