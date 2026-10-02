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
import { openSheet, toastOk, toastErr, toastWarn, pickMonth, esc, fmtMoney, fmtDate } from './dom.js';

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

  initFilePicker();
  initBackupPicker();
  wireNav();

  try {
    await store.init();
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

  appEl.hidden = false;
  bootEl.hidden = true;

  registerServiceWorker();

  // 主屏幕快捷方式：?action=quick / ?action=import
  const action = new URLSearchParams(location.search).get('action');
  if (action === 'quick') {
    setTimeout(() => openQuickEntry(), 350);
  } else if (action === 'import') {
    setTimeout(() => openImportSheet(), 350);
  } else if (!store.state.txs.length && !store.state.settings.demoAsked) {
    // 数据为空时，问一句要不要先看演示数据
    store.setSetting('demoAsked', true).catch(() => {});
    setTimeout(askDemo, 600);
  }
}

/**
 * 注册离线缓存。
 *
 * ⚠️ 两个坑：
 *  1. 浏览器只在「安全上下文」下允许 Service Worker，即 https:// 或 localhost。
 *     用 http://192.168.x.x 打开时 SW 不会生效，离线能力也就没有。
 *  2. 注册必须尽早。如果只写 window.addEventListener('load', ...)，
 *     而启动流程（读数据库、动态 import）耗时超过了 load 事件，
 *     这个监听器就永远不会被触发 —— SW 静悄悄地不注册。
 *     所以要先判断 document.readyState。
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const secure = location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
  if (!secure) {
    console.warn('[轻账] 当前不是安全上下文（需要 https 或 localhost），离线缓存不会生效：' + location.origin);
    store.state.offlineAvailable = false;
    return;
  }

  const doRegister = () => {
    navigator.serviceWorker.register('./sw.js').then(
      (reg) => {
        store.state.offlineAvailable = true;
        console.log('[轻账] 离线缓存已就绪，作用域 ' + reg.scope);
        reg.update().catch(() => {});
      },
      (err) => {
        store.state.offlineAvailable = false;
        console.warn('[轻账] 离线缓存注册失败：', err && err.message);
      },
    );
  };

  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
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
    case 'selfnames': openSelfNamesSheet(); break;
    case 'recurring': openRecurringSheet(); break;
    case 'dedupe': cleanDuplicates(); break;
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
