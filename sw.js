/**
 * 轻账 · 离线缓存
 *
 * 目标：装到主屏幕后，飞行模式下也能打开、能记账。
 *
 * 策略：
 *   - 应用文件（HTML/CSS/JS/图标）：先给缓存，后台顺便更新（stale-while-revalidate）
 *   - 其他请求：一律不出网。轻账没有任何服务器，出现预期外的请求直接失败。
 */

/**
 * 缓存版本号。
 *
 * ⚠️ 每次改动 src/ 下的代码或 styles.css 之后，**必须把这个号加一**。
 * 否则已经装到手机主屏幕的旧版本会继续用旧缓存，
 * 用户看到的还是老界面，会以为「没更新」。
 * 改版本号会让 activate 阶段删掉旧缓存、重新拉一遍文件。
 *
 *   补丁级：v1.1.0 → v1.1.1   改 bug、改文案
 *   次版本：v1.1.0 → v1.2.0   加功能
 *   主版本：v1.1.0 → v2.0.0   改数据结构
 */
const VERSION = 'v1.2.4';
const CACHE = 'qingzhang-' + VERSION;

// 相对路径，部署到子目录也能用
// 注意：这份清单要和 src/ 下真实存在的文件保持一致。
// 核对命令：node tools/verify-offline.mjs（它会照着 index.html 和 import 关系反推所需文件）
const ASSETS = [
  // 入口文件必须显式列出。
  // 注意不要只写 './'：那样离线时 cache.match('./index.html') 能否命中
  // 取决于 Cache API 把 './' 和 './index.html' 视为同一资源的实现细节，
  // 显式列出来最稳妥（tools/check-sw-assets.mjs 会强制要求这一项）。
  './index.html',
  './styles.css',
  './sw.js',
  './manifest.webmanifest',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './src/core/model.js',
  './src/core/util.js',
  './src/core/db.js',
  './src/core/csv.js',
  './src/core/classify.js',
  './src/core/parser.js',
  './src/core/zip.js',
  './src/core/dedupe.js',
  './src/core/stats.js',
  './src/core/budget.js',
  './src/core/crypto.js',
  './src/core/recurring.js',
  './src/core/import.js',
  './src/core/rules.js',
  './src/core/categories.js',
  './src/core/savings.js',
  './src/ui/app.js',
  './src/ui/store.js',
  './src/ui/dom.js',
  './src/ui/sheets.js',
  './src/ui/charts.js',
  './src/ui/demo.js',
  './src/ui/import-screen.js',
  './src/ui/screen-home.js',
  './src/ui/screen-detail.js',
  './src/ui/screen-stats.js',
  './src/ui/screen-budget.js',
  './src/ui/screen-settings.js',
  './src/ui/screen-year.js',
  './src/ui/screen-savings.js',
  './src/ui/category-sheets.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个添加，单个失败不影响整体（不同版本可能多/少文件）
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {
        // 忽略单个文件失败
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => (n === CACHE ? null : caches.delete(n))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;

  // 只处理 GET；其他（理论上不会有）直接放过
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 跨域请求：轻账不需要任何外部资源，直接失败，绝不外传
  if (url.origin !== self.location.origin) {
    ev.respondWith(Response.error());
    return;
  }

  // 页面导航：先尝试网络，失败回退缓存（保证能拿到最新版，离线也能开）
  if (req.mode === 'navigate') {
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          // 用绝对 URL 归一化，保证 '/', '/index.html', './' 命中同一个缓存项
          cache.put(new Request(new URL('./index.html', self.location.href)), fresh.clone());
        }
        return fresh;
      } catch (e) {
        const cached =
          await cache.match(new URL('./index.html', self.location.href)) ||
          await cache.match('./index.html') ||
          await cache.match('./') ||
          await cache.match(new URL('./', self.location.href));
        if (cached) return cached;
        return new Response('离线，且本地缓存里没有页面。请联网打开一次完成缓存。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // 静态资源：**先给缓存**（打开就是瞬间的），同时后台去拿最新的存起来。
  //
  // 这里在两种策略之间摇摆过，最终选了「缓存优先 + 后台更新 + 自动刷新」：
  //
  //   1. 纯缓存优先（最早的做法）
  //      问题：打开时永远是上一次的版本，第二次打开才更新。
  //      结果我加了「攒钱」功能、部署成功、线上代码也没错，
  //      但用户手机上根本看不到，以为功能没做。
  //
  //   2. 纯网络优先
  //      问题：每次打开、每个文件都要等网络往返，**App 感觉变慢了、按键不跟手**。
  //      用户反馈「没那么顺畅了」。
  //
  //   3. 现在的做法：先给缓存 → 立刻显示；同时后台请求最新版写进缓存。
  //      如果后台发现 sw.js 有变化，浏览器会装新的 Service Worker，
  //      activate 时清掉旧缓存，页面的 controllerchange 会**自动刷新一次**，
  //      于是用户既拿到了秒开，也拿到了最新版。
  //
  // 关键点：更新靠的是「sw.js 版本号变了」，不是靠每个文件都走网络。
  // 所以改代码后记得升 VERSION（tools/check-sw-assets.mjs 会提醒清单，版本号靠自觉）。
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: false });

    // 后台更新，不阻塞返回
    const networkPromise = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) return cached;

    // 缓存里没有（首次安装、或新增的文件）→ 必须等网络
    const fresh = await networkPromise;
    if (fresh) return fresh;

    if (req.destination === 'image') {
      return new Response('', { status: 404 });
    }
    return new Response('// 离线且未缓存：' + url.pathname, {
      status: 504,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  })());
});

// 允许页面主动触发更新
self.addEventListener('message', (ev) => {
  if (ev.data === 'skip-waiting') self.skipWaiting();
});
