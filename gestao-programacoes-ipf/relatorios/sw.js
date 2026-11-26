/* Service worker: o app abre mesmo sem internet. Sempre tenta a rede primeiro,
 * para que as atualizações cheguem na hora; o cache é só reserva. */
const CACHE = 'ipb-relatorios-v14';
const BASE = ['./', './index.html', './app.js', './folha.js', './reunioes.js', './acervo.js', './tesouraria.js', './graficos.js', './img/logo-ipb.png', './img/logo-ipb-branco.png', './img/favicon.png', './modelos.js', './regras-atas.js', './base-legal.js', './servidor-local.js', './config.js', './concilios-ipb.js', './manifest.webmanifest', './icones/icone-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\/dados\/anexos\//.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
