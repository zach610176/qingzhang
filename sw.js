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
const VERSION = 'v1.5.0';
const CACHE = 'qingzhang-' + VERSION;

/**
 * 少了这些文件，App **一定**打不开（白屏）。
 * 安装时必须逐个确认它们真的存进缓存了，缺一个就放弃这次安装。
 * 这几个都是启动链路上的第一环：html → app.js → store/home 模块。
 */
const CRITICAL = ['./index.html', './src/ui/app.js', './src/ui/store.js', './src/ui/screen-home.js'];
/**
 * 合并后的单文件（由 tools/build-bundle.mjs 生成）。
 * 页面优先用它 —— 33 个模块合成 1 个请求，冷启动快很多。
 * 它是「有就用、没有就算了」：本地开发没跑合并脚本时页面会退回按模块加载。
 */
const BUNDLE = './src/bundle.js';

/**
 * 把任意形式的资源地址归一化成 './xxx' 这种相对形式。
 *
 * ⚠️ 这里踩过两个坑，都值得记下来：
 *  1. 不能把部署路径写死（曾经写成 replace(/^.*\/qingzhang\//, '')）。
 *     那样一旦换部署位置（本地测试服务根目录、换个仓库名）就全部失配，
 *     完整性校验会永远认为「缓存不完整」，于是**永远不删旧缓存**。
 *     改成用 self.location 推导，部署到哪都对。
 *  2. Cache API 存的是**完整 URL**（相对路径会被解析掉），
 *     而 CRITICAL 里写的是 './xxx'。两边必须先归一化再比。
 */
function normalizeAsset(u) {
  const raw = typeof u === 'string' ? u : (u && u.url) || String(u);
  let pathname;
  try {
    pathname = new URL(raw, self.location.href).pathname;
  } catch (e) {
    pathname = raw;
  }
  // 去掉 Service Worker 所在的目录前缀，得到仓库内的相对路径
  const base = new URL('./', self.location.href).pathname;   // 例如 '/qingzhang/'
  if (pathname.startsWith(base)) pathname = pathname.slice(base.length);
  return './' + pathname.replace(/^\/+/, '');
}

// 相对路径，部署到子目录也能用
// 注意：这份清单要和 src/ 下真实存在的文件保持一致。
// 核对命令：node tools/verify-offline.mjs（它会照着 index.html 和 import 关系反推所需文件）
const ASSETS = [
  // 入口文件必须显式列出。
  // 注意不要只写 './'：那样离线时 cache.match('./index.html') 能否命中
  // 取决于 Cache API 把 './' 和 './index.html' 视为同一资源的实现细节，
  // 显式列出来最稳妥（tools/check-sw-assets.mjs 会强制要求这一项）。
  './index.html',
  // 合并后的单文件排在最前：页面优先用它，一个请求拿到全部代码。
  // 下面的模块文件也照常缓存 —— 它们是 bundle 缺失时的退路
  // （本地开发没跑合并脚本时，页面会按模块加载）。
  './src/bundle.js',
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

/**
 * 安装：把资源存进新缓存。
 *
 * ⚠️ 这里以前犯过一个严重错误，是「App 反复打不开（纯白屏）」的直接原因：
 *
 *   await Promise.all(ASSETS.map(async (url) => {
 *     try { ...cache.put(url, res) } catch (e) {  // 忽略单个失败
 *     }
 *   }));
 *   self.skipWaiting();
 *
 * 问题在于「忽略单个失败」+「无条件 skipWaiting」这两个凑在一起：
 *   1. 某个文件下载失败（网络抖动、校园网 400-800ms 延迟、GitHub 抽风）
 *      → 缓存里**缺文件**
 *   2. 但安装照样「成功」，照样立刻接管
 *   3. activate 把**旧的、完好的**缓存删掉
 *   → 于是残缺的新缓存顶掉了好用的旧缓存，App 白屏
 *   → 下一次安装碰巧成功，又好了 —— 这就是「时好时坏」的来源
 *
 * 现在的做法：
 *   · 先全部下载到内存（失败就重试一次）
 *   · 再检查关键文件一个都不少
 *   · 全部齐了才写入缓存 + 接管
 *   · 只要有一个关键文件没拿到，就**放弃这次安装**，
 *     旧版本继续用 —— 用户宁可看到旧版，也不要白屏。
 */
const INSTALL_RETRY = 2;
/** 每批下载的文件数。见下面 cacheAsset 的注释：不能一次开太多。 */
const INSTALL_BATCH = 4;

/**
 * 下载一个文件并**立刻读完它的内容**，然后写进缓存。
 *
 * ⚠️ 这里有两个必须遵守的约束，都是实测踩出来的：
 *
 *  1. **不能同时持有大量「没读过 body」的 response。**
 *     之前的写法是「先把 38 个文件全 fetch 下来存进 Map，再统一 cache.put」。
 *     结果在真实浏览器里 **只有前 3 个 fetch 返回，其余 35 个永远挂着** ——
 *     安装永久停在 installing、缓存是空的、App 白屏。
 *     同样的代码在页面里跑只要 18ms，所以这是 Service Worker 特有的限制：
 *     它对「未消费的响应体」有并发上限，持有太多会互相堵死。
 *     改成取到一个就立刻 arrayBuffer() 读完，读完的 response 不再占额度。
 *
 *  2. **要控制并发数。** 38 个并发在手机上太激进，按 INSTALL_BATCH 分批，
 *     稳一点；总耗时依然很短（本地实测几十毫秒）。
 */
async function cacheAsset(cache, url, critical, missing) {
  let lastErr = null;
  for (let i = 0; i < INSTALL_RETRY; i++) {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res || !res.ok) {
        lastErr = new Error('HTTP ' + (res ? res.status : '?'));
      } else {
        // 立刻读干净，避免占用「未消费响应体」的并发额度
        const buf = await res.arrayBuffer();
        const type = res.headers.get('Content-Type') || 'application/octet-stream';
        await cache.put(url, new Response(buf, {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': type },
        }));
        return true;
      }
    } catch (e) {
      lastErr = e;
    }
    // 失败后等一下再重试，给网络一点恢复时间
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  if (critical) missing.push(url + '（' + (lastErr && lastErr.message) + '）');
  return false;
}

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const missing = [];
    const cache = await caches.open(CACHE);

    // 分批下载 + 写入。关键文件失败记进 missing，非关键文件失败就跳过。
    for (let i = 0; i < ASSETS.length; i += INSTALL_BATCH) {
      const batch = ASSETS.slice(i, i + INSTALL_BATCH);
      await Promise.all(batch.map((url) =>
        cacheAsset(cache, url, CRITICAL.indexOf(url) >= 0, missing)));
    }

    // 关键文件缺任何一个 → 这次安装作废。
    // 抛错会让 install 失败，新的 Service Worker 不会激活、也就走不到
    // activate 去删旧缓存 —— 旧的（可用的）版本继续服务用户。
    // 用户宁可看到旧版，也不要白屏。
    if (missing.length) {
      throw new Error('关键文件没拿到，放弃本次更新：' + missing.join('; '));
    }

    self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    // 删旧缓存之前先确认自己这份是完整的。
    // 正常情况 install 已经把关了（缺关键文件就不会走到这里），
    // 但这里再查一次 —— 删掉别人的完好缓存是不可逆的操作，值得多一道保险。
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const have = new Set(keys.map((k) => normalizeAsset(k)));
    const missingCritical = CRITICAL.filter((c) => !have.has(normalizeAsset(c)));

    if (missingCritical.length) {
      // 自己都不完整，就别动别人的缓存了
      console.warn('[轻账] 新缓存不完整，保留旧缓存不删：' + missingCritical.join(', '));
      await self.clients.claim();
      return;
    }

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

    // 网址里带 r=... 的请求 → 强制走网络并刷新缓存。
    //
    // 用途：用户点了「重新加载」，目的是把可能坏掉的本地缓存刷掉。
    // 如果这里还走「缓存优先」，就会把同一个坏文件再给一遍，重试等于没用。
    //
    // ⚠️ 注意：Service Worker **访问不到页面的 sessionStorage**，
    // 所以不能靠「读页面标记」来判断，只能看请求网址本身带没带 r= 参数。
    // 页面侧「把静态文件缓存整体刷新一遍」的逻辑在
    // src/ui/app.js 的 refreshAssetsFromNetwork()，它会给每个请求都带上这个参数。
    if (url.searchParams.has('r')) {
      try {
        const fresh = await fetch(new Request(req.url, { cache: 'reload' }));
        if (fresh && fresh.ok && fresh.type === 'basic') {
          cache.put(new Request(url.origin + url.pathname), fresh.clone());
        }
        return fresh;
      } catch (e) {
        // 网络不行就退回缓存，总比什么都没有强
        const fallback = await cache.match(new Request(url.origin + url.pathname));
        if (fallback) return fallback;
      }
    }

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
