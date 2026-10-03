/**
 * 轻账 · 主控制器
 * 负责：启动、导航、标签切换、事件分发、界面重绘。
 */

import * as store from './store.js';
import { renderHome } from './screen-home.js';
import { renderDetail, openTxSheet } from './screen-detail.js';
import { renderStats } from './screen-stats.js';
import { renderBudget, openBudgetEdit, openWarnRatioEdit } from './screen-budget.js';
import {
  renderSettings, openBackupSheet, openRestoreSheet, exportCSV,
  openRulesSheet, openSelfNamesSheet, openRecurringSheet,
  cleanDuplicates, clearAllData, initBackupPicker,
} from './screen-settings.js';
import { openImportSheet, openBatchListSheet, initFilePicker } from './import-screen.js';
import { openQuickEntry } from './sheets.js';
import { openCategoryManager } from './category-sheets.js';
import {
  renderSavings, openSavingsEntry, openSavingsGoal, openMonthlyTarget,
  openSavingsAccount, openSavingsScan,
} from './screen-savings.js';
import { loadSettings as loadSavings } from '../core/savings.js';
import { openSheet, toastOk, toastErr, toastWarn, pickMonth, esc, fmtMoney, fmtDate } from './dom.js';
import { CATEGORIES, INCOME_CATEGORIES } from '../core/model.js';

/* ------------------------------------------------------------------ *
 * 自救：把本地缓存整体刷新一遍
 * ------------------------------------------------------------------ */

/**
 * 把 Service Worker 缓存里的所有文件用网络重取一遍。
 *
 * 什么时候需要它：用户点了「重新加载」（看门狗给的按钮），
 * 但静态资源平时是「缓存优先」—— 如果缓存里存了**坏文件**，
 * 光刷新页面只会拿到同一个坏文件，重试等于没用。
 *
 * 原理：给每个请求都带上 `?r=<时间戳>`。
 * Service Worker 看到网址里有 r= 参数就走网络（见 sw.js），
 * 并且把新拿到的内容重新写进缓存。全部刷完再刷新页面。
 *
 * 这个函数**不抛错**：任何一个文件失败都不能挡住后面 ——
 * 它本来就是给「已经出问题」的场景用的。
 */
async function refreshAssetsFromNetwork(onProgress) {
  const stamp = Date.now();
  const urls = await readSwAssetList();
  let done = 0;
  let ok = 0;
  const CONCURRENCY = 4;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (u) => {
      try {
        const res = await fetch(u + '?r=' + stamp, { cache: 'reload' });
        if (res && res.ok) ok++;
      } catch (e) { /* 单个失败不影响整体 */ }
      done++;
      if (onProgress) onProgress(done, urls.length, ok);
    }));
  }
  return { done, ok, total: urls.length };
}

/**
 * 读出 sw.js 里的缓存清单。
 *
 * ⚠️ 一开始我在这里**手工抄了一份**文件清单（const SW_ASSETS = [...]）。
 * 那是错的：清单在 sw.js 里，每次加/删模块都要改两处，
 * 而漏改不会有任何报错 —— 只会让「重新加载」少刷一两个文件，
 * 于是坏文件还在、按钮看起来没用。手工镜像两份清单迟早走偏。
 *
 * 所以改成运行时去读 sw.js 里的那一份（唯一来源）。
 * 代价是多一次请求，但这段代码本来就是给「网络可能有问题」的场景用的，
 * 请求失败时下面会退回用「当前页面已经加载过的模块」，
 * 至少能把主入口刷掉，不会什么都不做。
 */
async function readSwAssetList() {
  try {
    // 带 ?r= 是为了绕开缓存，确保读到的是最新的 sw.js 本身
    const res = await fetch('./sw.js?r=' + Date.now(), { cache: 'reload' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const m = text.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\];/);
    if (!m) throw new Error('sw.js 里找不到 ASSETS');
    const urls = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
      .filter((u) => u.startsWith('./'));
    if (!urls.length) throw new Error('ASSETS 解析出来是空的');
    return urls;
  } catch (e) {
    console.warn('[轻账] 读不到 sw.js 的缓存清单，退回只刷主入口：', e && e.message);
    return ['./index.html', './styles.css', './src/ui/app.js'];
  }
}

/* ------------------------------------------------------------------ *
 * 启动
 * ------------------------------------------------------------------ */

export async function boot() {
  const bootEl = document.getElementById('boot');
  const appEl = document.getElementById('app');

  // 主题：用户手动设置过就用设置里的
  try {
    const raw = localStorage.getItem('qz-theme');
    if (raw === 'dark' || raw === 'light') document.documentElement.dataset.theme = raw;
  } catch (e) { /* 隐私模式下 localStorage 可能不可用 */ }

  // 用户之前点过「重新加载」→ 先把坏缓存整体刷一遍，再继续启动。
  // 这一步放在最前面：如果缓存里有坏文件，后面加载模块时就会用到它们。
  try {
    if (sessionStorage.getItem('qz-force-network') === '1') {
      sessionStorage.removeItem('qz-force-network');
      if (bootEl) {
        bootEl.hidden = false;
        bootEl.innerHTML = '<div class="boot-logo">轻账</div>'
          + '<div class="boot-sub">正在重新获取文件…</div>'
          + '<div class="boot-bar"><i></i></div>';
      }
      const r = await refreshAssetsFromNetwork();
      console.log(`[轻账] 强制刷新完成：${r.ok}/${r.total} 个文件`);
    }
  } catch (e) {
    console.warn('[轻账] 强制刷新失败，继续启动：', e && e.message);
  }

  initFilePicker();
  initBackupPicker();
  wireNav();

  try {
    await store.init();
    // 攒钱设置也在这里载入。
    // 放在 app.js 而不是 store.reloadAll()，是为了避免 store ↔ savings 的循环导入
    // （savings 依赖 stats，store 也依赖 stats）。
    store.state.savingsSettings = await loadSavings();
  } catch (e) {
    bootEl.hidden = true;
    appEl.hidden = true;
    const fatal = document.getElementById('fatal');
    fatal.hidden = false;
    fatal.textContent = '轻账无法启动：' + (e && e.message ? e.message : String(e)) +
      '\n\n常见原因：浏览器禁用了本地存储（无痕模式），或者存储空间已满。';
    return;
  }

  store.subscribe(renderAll);
  renderAll();

  // 先把界面放出来，再做联网的事。
  //
  // ⚠️ 顺序很重要：以前 registerServiceWorker() 和 loadAppVersion()
  // 写在前面，而 loadAppVersion 内部要 fetch('./sw.js')。
  // 那次网络请求会把整个启动流程卡住 —— 用户感觉就是
  // 「App 打开慢、按键不跟手」。启动流程里不该有网络请求。
  appEl.hidden = false;
  bootEl.hidden = true;
  // 打个时间标记：自动化检查用它量启动耗时，防止「启动流程里塞网络请求」这类退化
  try { performance.mark('boot-hidden'); } catch (e) { /* 老浏览器忽略 */ }

  // 这些都放到独立的一帧之后，确保界面已经能交互
  requestAnimationFrame(() => {
    registerServiceWorker();
    loadAppVersion().catch(() => {});
  });

  // 网址参数（主屏幕快捷方式 / iPhone 快捷指令用）
  const launch = parseLaunchParams();
  if (launch.action === 'quick') {
    setTimeout(() => openQuickEntry(launch.entry), 350);
  } else if (launch.action === 'import') {
    setTimeout(() => openImportSheet(), 350);
  } else if (launch.action === 'annual') {
    store.state.statsRange = 'annual';
    store.setTab('stats');
  } else if (!store.state.txs.length && !store.state.settings.demoAsked) {
    // 数据为空时，问一句要不要先看演示数据
    store.setSetting('demoAsked', true).catch(() => {});
    setTimeout(askDemo, 600);
  }
}

/**
 * 解析网址参数，支持「一键记账」。
 *
 * 用途：把一条长网址存成 iPhone 快捷指令，点一下就直接打开填好的记账面板。
 * 例如：
 *   ?action=quick&amount=18&merchant=瑞幸&category=food
 *   ?action=quick&merchant=食堂&type=expense
 *   ?action=annual                  直接跳到年度报告
 *
 * 全部参数都是可选的；给了就预填，没给就照常手输。
 * 参数名和取值都做了白名单校验 —— 网址是可以被随便构造的，
 * 不能让它塞进奇怪的东西（比如把一个不存在的分类 id 塞进来）。
 */
export function parseLaunchParams(search) {
  const q = new URLSearchParams(search != null ? search : (typeof location !== 'undefined' ? location.search : ''));

  const actionRaw = (q.get('action') || '').toLowerCase();
  const action = ['quick', 'import', 'annual'].includes(actionRaw) ? actionRaw : '';

  if (action !== 'quick') return { action };

  const entry = {};

  // 金额：只接受正数，转成「分」
  //
  // ⚠️ 这里不能简单地把非数字字符全删掉再转数字。
  // 曾经写成 String(amount).replace(/[^\d.]/g,'')，于是 "-5" 会被清洗成 "5"，
  // 一个负数金额就变成了正数被接受。必须只在「去掉货币符号和千分位」之后，
  // 再检查整体是不是一个合法的正数。
  const amount = q.get('amount');
  if (amount != null && amount !== '') {
    const cleaned = String(amount).trim()
      .replace(/^[¥￥$]/, '')        // 去掉开头的货币符号
      .replace(/[,，]/g, '');        // 去掉千分位
    // 只允许「数字.数字」这种形态，负号、字母、多个小数点一律拒绝
    if (/^\d+(\.\d+)?$/.test(cleaned)) {
      const n = Number(cleaned);
      if (Number.isFinite(n) && n > 0 && n < 1e9) {
        entry.amountCents = Math.round(n * 100);
      }
    }
  }

  // 商户 / 说明
  const merchant = (q.get('merchant') || '').trim().slice(0, 40);
  if (merchant) entry.merchant = merchant;

  // 交易类型：必须在支持的手动类型里
  const typeRaw = (q.get('type') || '').toLowerCase();
  const validTypes = ['expense', 'income', 'redpacket', 'transfer', 'repay'];
  if (validTypes.includes(typeRaw)) entry.type = typeRaw;

  // 分类：必须是当前真实存在的分类（含自定义），否则忽略
  const catRaw = (q.get('category') || '').trim();
  if (catRaw) {
    const lane = (entry.type === 'income' || entry.type === 'redpacket') ? INCOME_CATEGORIES : CATEGORIES;
    if (lane.some((c) => c.id === catRaw)) entry.category = catRaw;
  }

  // 账户 / 备注
  const account = (q.get('account') || '').trim().slice(0, 30);
  if (account) entry.account = account;
  const note = (q.get('note') || '').trim().slice(0, 60);
  if (note) entry.note = note;

  // 日期：只接受 YYYY-MM-DD
  const date = (q.get('date') || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) entry.date = date;

  return { action, entry };
}

/**
 * 注册离线缓存。
 *
 * ⚠️ 三个坑：
 *  1. 浏览器只在「安全上下文」下允许 Service Worker，即 https:// 或 localhost。
 *     用 http://192.168.x.x 打开时 SW 不会生效，离线能力也就没有。
 *  2. 注册必须尽早。如果只写 window.addEventListener('load', ...)，
 *     而启动流程（读数据库、动态 import）耗时超过了 load 事件，
 *     这个监听器就永远不会被触发 —— SW 静悄悄地不注册。
 *     所以要先判断 document.readyState。
 *  3. 新版本装好了，**当前这个页面仍然是旧代码在跑**。
 *     必须重新加载才能用上新代码。用户不会自己去刷新，
 *     所以这里监听 controllerchange 自动刷新一次。
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    store.state.offlineCheck = 'unsupported';
    return;
  }

  const secure = location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
  if (!secure) {
    console.warn('[轻账] 当前不是安全上下文（需要 https 或 localhost），离线缓存不会生效：' + location.origin);
    store.state.offlineCheck = 'insecure';
    store.notify(true);
    return;
  }

  // 新 SW 接管后自动刷新一次，让页面用上新代码。
  // 用一个标记防止无限刷新：一次会话里只刷一次。
  let reloadingForUpdate = false;
  let lastController = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    store.state.offlineCheck = 'ok';
    store.notify(true);
    if (!lastController) {
      // 首次安装：现在才有 controller，不需要刷新（页面本来就用的是最新代码）
      lastController = navigator.serviceWorker.controller;
      return;
    }
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    console.log('[轻账] 检测到新版本，正在刷新…');
    location.reload();
  });

  const doRegister = () => {
    // 超时兜底：正常情况下注册几秒内就完成。
    // 如果卡住不动（网络问题、浏览器限制、隐私模式等），
    // 必须给用户一个明确的结论，不能永远停在「检查中」——
    // 这正是用户实际遇到的问题：界面一直显示「正在检查」，什么都做不了。
    const timeout = setTimeout(() => {
      if (store.state.offlineCheck === 'pending') {
        store.state.offlineCheck = 'failed';
        store.state.offlineError = '注册超时（超过 10 秒没有响应）';
        console.warn('[轻账] Service Worker 注册超时');
        store.notify(true);
      }
    }, 10000);

    navigator.serviceWorker.register('./sw.js').then(
      (reg) => {
        clearTimeout(timeout);
        store.state.offlineCheck = 'ok';
        // 存起来，「检查更新」按钮要用
        store.state.swRegistration = reg;
        console.log('[轻账] 离线缓存已就绪，作用域 ' + reg.scope);
        // 主动检查更新：手机上 App 常常长期不关，光靠浏览器自己轮询可能等很久
        reg.update().catch(() => {});
        // 状态变了要通知界面重绘，否则「正在检查…」会一直停在那里
        store.notify(true);
      },
      (err) => {
        clearTimeout(timeout);
        store.state.offlineCheck = 'failed';
        store.state.offlineError = err && err.message ? err.message : String(err);
        console.warn('[轻账] 离线缓存注册失败：', store.state.offlineError);
        store.notify(true);
      },
    );
  };

  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
  }
}

/**
 * 读出当前运行的版本号。
 *
 * 版本号保存在 sw.js 里（单一来源）——它决定缓存名，改它才会触发更新。
 * 这里直接 fetch 那个文件把版本号读出来，避免在两个地方各写一份、
 * 时间一长就对不上。读不到就显示「未知」，不影响使用。
 *
 * ⚠️ 必须 notify()！
 * 这两件事（注册 SW、读版本号）都是**异步**完成的，而界面在它们完成之前
 * 就已经画好了。如果只改 state 不通知重绘，界面上的文字会永远停在
 * 「正在检查…」「读取中…」—— 用户看到的就是「一直在检查，检查不了版本」。
 */
async function loadAppVersion() {
  try {
    const res = await fetch('./sw.js', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
    store.state.appVersion = m ? m[1] : '未知';
  } catch (e) {
    store.state.appVersion = '未知';
  }
  store.notify(true);
}

/**
 * 手动检查更新。
 *
 * 手机上 App 常常长期不关（切后台不算关），服务端发了新版本也不会自动生效。
 * 这里让用户主动触发一次：问服务端要最新的 sw.js，
 * 如果确实有变化，浏览器会装一个新的 Service Worker，
 * 它接管后 controllerchange 会触发一次自动刷新，新版本就生效了。
 */
async function checkForUpdate() {
  toast('正在检查更新…');

  let reg = store.state.swRegistration;

  // 还没注册成功过（或之前失败了）→ 现在就重试一次。
  // 用户点这个按钮时往往正是因为「离线可用」显示失败/检查中，
  // 只报一句「还没准备好」等于什么都没做。
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register('./sw.js');
      store.state.swRegistration = reg;
      store.state.offlineCheck = 'ok';
      store.state.offlineError = '';
      store.notify(true);
      toastOk('离线缓存已就绪');
      return;
    } catch (e) {
      store.state.offlineCheck = 'failed';
      store.state.offlineError = e && e.message ? e.message : String(e);
      store.notify(true);
      toastErr('离线缓存还是注册不上：' + store.state.offlineError, 4000);
      return;
    }
  }

  try {
    await reg.update();
    // 给浏览器一点时间完成安装
    await new Promise((r) => setTimeout(r, 1200));
    if (reg.installing || reg.waiting) {
      toastOk('发现新版本，正在刷新…');
      if (reg.waiting) reg.waiting.postMessage('skip-waiting');
      // controllerchange 会触发刷新；万一没触发，这里兜底
      setTimeout(() => location.reload(), 1500);
    } else {
      await loadAppVersion();
      const v = store.state.appVersion || '当前版本';
      toastOk(`已是最新版本（${v}）`);
    }
  } catch (e) {
    toastErr('检查更新失败：' + (e && e.message ? e.message : e));
  }
}

/* ------------------------------------------------------------------ *
 * 事件分发（事件委托，只绑一次）
 * ------------------------------------------------------------------ */

function wireNav() {
  // 底部标签
  document.getElementById('tabbar').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tab]');
    if (b) { store.setTab(b.dataset.tab); return; }
    if (ev.target.closest('#tab-add')) { openQuickEntry(); }
  });

  // 顶部月份导航
  document.getElementById('nav-left').addEventListener('click', () => store.stepMonth(-1));
  document.getElementById('nav-right').addEventListener('click', () => store.stepMonth(1));
  document.getElementById('nav-title').addEventListener('click', () => {
    pickMonth(store.monthList(36), store.state.month, (m) => store.setMonth(m));
  });

  // 屏幕内的通用动作
  document.getElementById('screens').addEventListener('click', onScreenClick);

  // 明细页筛选与搜索
  const screens = document.getElementById('screens');
  screens.addEventListener('click', onFilterClick);
  screens.addEventListener('input', onFilterInput);
}

async function onScreenClick(ev) {
  // 攒钱页的操作（存/取/设目标/扫描账单）
  const svEl = ev.target.closest('[data-sv]');
  if (svEl) {
    switch (svEl.dataset.sv) {
      case 'in': openSavingsEntry('in'); break;
      case 'out': openSavingsEntry('out'); break;
      case 'goal': openSavingsGoal(); break;
      case 'monthly': openMonthlyTarget(); break;
      case 'account': openSavingsAccount(); break;
      case 'scan': openSavingsScan(); break;
    }
    return;
  }
  // 攒钱明细里点某一笔 → 打开普通的交易详情
  const svTx = ev.target.closest('[data-sv-tx]');
  if (svTx) { openTxSheet(svTx.dataset.svTx); return; }

  // 交易行
  const txRow = ev.target.closest('[data-tx]');
  if (txRow) { openTxSheet(txRow.dataset.tx); return; }

  const actEl = ev.target.closest('[data-act]');
  if (!actEl) return;
  const act = actEl.dataset.act;

  switch (act) {
    case 'quick': openQuickEntry(); break;
    case 'import': openImportSheet(); break;
    case 'batches': openBatchListSheet(); break;
    case 'stats': store.setTab('stats'); break;
    case 'budget': store.setTab('budget'); break;
    case 'tab-detail': store.setTab('detail'); break;
    case 'edit-total':
    case 'edit-cats': openBudgetEdit(); break;
    case 'edit-warn': openWarnRatioEdit(); break;
    case 'reset-month': {
      const { confirmSheet } = await import('./dom.js');
      const ok = await confirmSheet({
        title: '恢复默认预算？',
        message: '这个月将改用默认预算设置。',
        confirmLabel: '恢复',
      });
      if (ok) { await store.clearBudget(store.state.month); toastOk('已恢复'); }
      break;
    }
    case 'backup': openBackupSheet(); break;
    case 'restore': openRestoreSheet(); break;
    case 'csv': exportCSV(); break;
    case 'rules': openRulesSheet(); break;
    case 'categories': openCategoryManager(); break;
    case 'savings': store.setTab('savings'); break;
    case 'savings-in': openSavingsEntry('in'); break;
    case 'savings-out': openSavingsEntry('out'); break;
    case 'savings-goal': openSavingsGoal(); break;
    case 'savings-monthly': openMonthlyTarget(); break;
    case 'savings-account': openSavingsAccount(); break;
    case 'savings-scan': openSavingsScan(); break;
    case 'selfnames': openSelfNamesSheet(); break;
    case 'recurring': openRecurringSheet(); break;
    case 'annual': store.state.statsRange = 'annual'; store.setTab('stats'); break;
    case 'dedupe': cleanDuplicates(); break;
    case 'check-update': checkForUpdate(); break;
    case 'clear': clearAllData(); break;
    case 'toggle-basis': break;
    default: break;
  }
}

function onFilterClick(ev) {
  // 分类 / 来源 chip
  const chipEl = ev.target.closest('[data-fval]');
  if (chipEl) {
    const wrap = chipEl.closest('[data-fkey]');
    if (wrap) {
      store.state.detail[wrap.dataset.fkey] = chipEl.dataset.fval;
      store.notify(true);
      return;
    }
  }
  const typeEl = ev.target.closest('[data-ftype]');
  if (typeEl) {
    store.state.detail.type = typeEl.dataset.ftype;
    store.notify(true);
    return;
  }
  // 统计页范围切换
  const rangeEl = ev.target.closest('[data-range]');
  if (rangeEl) {
    store.state.statsRange = rangeEl.dataset.range;
    store.notify(true);
  }
}

function onFilterInput(ev) {
  const q = ev.target.closest('#det-q');
  if (!q) return;
  store.state.detail.query = q.value;
  // 只重画列表部分会让光标跳，所以这里做防抖整体重绘但保留焦点
  debouncedSearch();
}

let searchTimer = null;
function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const active = document.activeElement;
    const isSearch = active && active.id === 'det-q';
    const pos = isSearch ? active.selectionStart : null;
    store.notify(true);
    if (isSearch) {
      const el = document.getElementById('det-q');
      if (el) {
        el.focus();
        try { el.setSelectionRange(pos, pos); } catch (e) { /* 某些浏览器 search 类型不支持 */ }
      }
    }
  }, 260);
}

/* ------------------------------------------------------------------ *
 * 重绘
 * ------------------------------------------------------------------ */

function renderAll() {
  const tab = store.state.tab;

  // 顶部标题跟着月份走
  const titleEl = document.getElementById('nav-title-text');
  if (titleEl) {
    const [y, m] = store.state.month.split('-');
    const isThisYear = Number(y) === new Date().getFullYear();
    titleEl.textContent = isThisYear ? `${Number(m)}月` : `${y}年${Number(m)}月`;
  }

  // 未来月份禁用「下一个月」按钮
  const cur = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const rightBtn = document.getElementById('nav-right');
  if (rightBtn) rightBtn.disabled = store.state.month >= cur;

  try {
    if (tab === 'home') renderHome(document.getElementById('home-body'));
    else if (tab === 'detail') renderDetail(document.getElementById('detail-body'));
    else if (tab === 'stats') renderStats(document.getElementById('stats-body'));
    else if (tab === 'budget') renderBudget(document.getElementById('budget-body'));
    else if (tab === 'savings') renderSavings(document.getElementById('savings-body'));
    else if (tab === 'settings') renderSettings(document.getElementById('settings-body'));
  } catch (e) {
    console.error('[轻账] 渲染失败', e);
    const box = document.getElementById('screen-' + tab);
    if (box) {
      box.innerHTML = `<div class="alert danger"><span class="ico">⚠️</span>
        <div><div class="t">界面渲染出错</div><div class="d pre">${esc(String(e && e.stack || e))}</div></div></div>`;
    }
  }
}

/* ------------------------------------------------------------------ *
 * 首次使用的演示数据
 * ------------------------------------------------------------------ */

async function askDemo() {
  openSheet({
    title: '先用演示数据看看？',
    leftLabel: '直接开始',
    rightLabel: '载入演示数据',
    lockBackdrop: true,
    onLeft: (api) => api.close(),
    onRight: async (api) => {
      api.close();
      try {
        const { demoTxs } = await import('./demo.js');
        const txs = demoTxs();
        await store.addTxMany(txs);
        await store.reloadAll();
        toastOk(`已载入 ${txs.length} 笔演示交易`, 3000);
      } catch (e) {
        toastErr('载入演示数据失败：' + (e && e.message ? e.message : e));
      }
    },
    render: (body) => {
      body.innerHTML = `
        <div class="px16 mb16 small muted pre">演示数据是伪造的消费记录（餐饮、交通、购物等），
用来看界面和图表长什么样。

它和真实账单完全隔开，你随时可以在「我的 → 清空所有数据」里一键删掉。</div>
        <div class="card" style="margin:0 16px 16px">
          <div class="row"><span class="row-icon">📊</span><span class="row-main">
            <span class="row-title">约 120 笔交易</span>
            <span class="row-sub">覆盖最近 3 个月，含退款和红包</span></span></div>
        </div>`;
    },
  });
}
