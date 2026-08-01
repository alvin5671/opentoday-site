/* OpenToday Service Worker
   策略：HTML/页面 = 网络优先（永远拿最新，保证后台改动实时可见），断网才用缓存；
        静态资源(css/js/img) = 缓存优先 + 后台静默更新；
        跨域请求(Supabase / Google 等) = 完全不拦截。 */
const CACHE = 'ot-cache-v1';
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // 只处理同源；跨域(Supabase 数据、Google 地图等)一律放行，不缓存不拦截
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // 网络优先，永远最新
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || (await caches.match(OFFLINE_FALLBACK)) || Response.error();
      }
    })());
    return;
  }

  // 静态资源：缓存优先 + 后台更新（stale-while-revalidate）
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        caches.open(CACHE).then((c) => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
