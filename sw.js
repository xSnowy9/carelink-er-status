/* Service Worker بسيط: يحفظ ملفات الموقع ليعمل بسرعة وبدون إنترنت بعد أول زيارة.
   يجلب النسخة الأحدث من الشبكة أولاً، فلا تبقى نسخة قديمة عند تحديث الموقع. */
var CACHE = 'carelink-er-v3';
var FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/png.js', 'js/report.js', 'js/app.js',
  'assets/fonts/clsans-regular.woff', 'assets/fonts/clsans-bold.woff', 'assets/icons/favicon.svg',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});
