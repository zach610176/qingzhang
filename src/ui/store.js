/**
 * 轻账 · 前端状态管理
 *
 * 数据量不大（一年几千笔），所以策略很简单：
 * 启动时一次性把交易读进内存，之后所有统计都在内存里算，速度是毫秒级。
 * 写入时同时更新内存和数据库。
 */

import * as db from '../core/db.js';
import { ym, shiftMonth, prevMonth } from '../core/model.js';
import { generateRecurring } from '../core/recurring.js';
import { defaultBudget } from '../core/budget.js';
import { availableMonths } from '../core/stats.js';

export const state = {
  ready: false,

  txs: [],
  rules: [],
  budgets: {},          // { [monthKey]: Budget }；defaultBudget 存在 key '__default'
  recurring: [],
  batches: [],
  settings: {},

  month: ym(new Date()),
  tab: 'home',
  statsRange: 'month',  // 'month' | 'quarter' | 'year' | 'all'

  detail: {
    query: '',
    type: 'all',
    category: 'all',
    source: 'all',
  },

  storage: { persisted: false, supported: false, usage: 0, quota: 0 },
  /** Service Worker 是否注册成功，决定能不能离线用 */
  offlineAvailable: null,
  showDuplicates: false,
};

/* ------------------------------------------------------------------ *
 * 订阅机制：状态变了通知界面重绘
 * ------------------------------------------------------------------ */

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let pending = null;
export function notify(force = false) {
  if (pending && !force) return;
  pending = requestAnimationFrame(() => {
    pending = null;
    for (const fn of listeners) {
      try { fn(); } catch (e) { console.error('[轻账] 渲染出错', e); }
    }
  });
}

/* ------------------------------------------------------------------ *
 * 初始化
 * ------------------------------------------------------------------ */

export async function init() {
  await reloadAll();

  // 首次使用：写入一些默认设置
  if (state.settings.installed === undefined) {
    state.settings.installed = true;
    await db.setSetting('installed', true);
    await db.setSetting('installedAt', Date.now());
  }

  // 申请持久化存储（降低 iOS 清理数据的概率）
  const p = await db.requestPersistence();
  state.storage.persisted = p.persisted;
  state.storage.supported = p.supported;

  // 补齐周期账单
  await runRecurring();

  state.ready = true;
  notify(true);
}

export async function reloadAll() {
  const [txs, rules, settings, batches, recurring] = await Promise.all([
    db.allTx(),
    db.allRules(),
    db.allSettings(),
    db.allBatches(),
    db.allRecurring(),
  ]);

  state.txs = txs;
  state.rules = rules;
  state.settings = settings || {};
  state.batches = batches;
  state.recurring = recurring;

  // 预算存在设置里，形如 budgets: { '2026-01': {...} }
  state.budgets = state.settings.budgets && typeof state.settings.budgets === 'object'
    ? state.settings.budgets
    : {};

  // 如果当前月份没有任何数据，自动跳到有数据的最近一个月
  const months = availableMonths(state.txs);
  if (months.length && !months.includes(state.month)) {
    const hasCurrent = state.txs.some((t) => ym(t.ts) === state.month);
    if (!hasCurrent) state.month = months[0];
  }

  await refreshStorageEstimate();
}

export async function refreshStorageEstimate() {
  const est = await db.storageEstimate();
  if (est) {
    state.storage.usage = est.usage;
    state.storage.quota = est.quota;
  }
}

/* ------------------------------------------------------------------ *
 * 周期账单
 * ------------------------------------------------------------------ */

export async function runRecurring() {
  if (!state.recurring.length) return 0;
  const upTo = ym(new Date());
  const generated = generateRecurring(state.recurring, upTo, state.txs);
  if (!generated.length) return 0;

  await db.putTxMany(generated);
  state.txs = state.txs.concat(generated);

  // 更新每条规则「生成到哪个月了」
  const touched = new Set(generated.map((t) => t.recurringId));
  for (const rule of state.recurring) {
    if (!touched.has(rule.id)) continue;
    rule.lastGeneratedMonth = upTo;
    rule.updatedAt = Date.now();
    await db.putRecurring(rule);
  }
  return generated.length;
}

/* ------------------------------------------------------------------ *
 * 交易读写
 * ------------------------------------------------------------------ */

export async function addTx(tx) {
  await db.putTx(tx);
  state.txs.push(tx);
  afterDataChange();
  return tx;
}

export async function addTxMany(txs) {
  await db.putTxMany(txs);
  state.txs = state.txs.concat(txs);
  afterDataChange();
  return txs.length;
}

export async function updateTx(patch) {
  const idx = state.txs.findIndex((t) => t.id === patch.id);
  if (idx < 0) throw new Error('找不到这笔交易');
  const merged = { ...state.txs[idx], ...patch, updatedAt: Date.now() };
  await db.putTx(merged);
  state.txs[idx] = merged;
  afterDataChange();
  return merged;
}

export async function removeTx(id) {
  await db.deleteTx(id);
  state.txs = state.txs.filter((t) => t.id !== id);
  afterDataChange();
}

export async function removeTxMany(ids) {
  await db.deleteTxMany(ids);
  const set = new Set(ids);
  state.txs = state.txs.filter((t) => !set.has(t.id));
  afterDataChange();
}

function afterDataChange() {
  state.txs.sort((a, b) => b.ts - a.ts);
  notify();
}

/* ------------------------------------------------------------------ *
 * 规则（商户记忆）
 * ------------------------------------------------------------------ */

export async function setRule(rule) {
  await db.putRule(rule);
  const i = state.rules.findIndex((r) => r.key === rule.key);
  if (i >= 0) state.rules[i] = rule;
  else state.rules.push(rule);
  notify();
}

export async function removeRule(key) {
  await db.deleteRule(key);
  state.rules = state.rules.filter((r) => r.key !== key);
  notify();
}

export async function clearRules() {
  await db.clearRules();
  state.rules = [];
  notify();
}

export function ruleMap() {
  const m = new Map();
  for (const r of state.rules) if (r && r.key) m.set(r.key, r.category);
  return m;
}

/* ------------------------------------------------------------------ *
 * 设置
 * ------------------------------------------------------------------ */

export async function setSetting(key, value) {
  await db.setSetting(key, value);
  state.settings[key] = value;
  notify();
}

/* ------------------------------------------------------------------ *
 * 预算
 * ------------------------------------------------------------------ */

export function budgetFor(monthKey) {
  const isDefault = !monthKey || monthKey === '__default';
  const key = isDefault ? '__default' : monthKey;
  const raw = state.budgets[key] || {};
  return { ...defaultBudget(), ...raw };
}

/** 取该月预算；该月没单独设置就用默认预算 */
export function effectiveBudget(monthKey) {
  if (state.budgets[monthKey]) return { ...defaultBudget(), ...state.budgets[monthKey] };
  return budgetFor('__default');
}

export async function saveBudget(monthKey, budget) {
  const key = monthKey || '__default';
  state.budgets[key] = { ...budget, updatedAt: Date.now() };
  await db.setSetting('budgets', state.budgets);
  notify();
}

export async function clearBudget(monthKey) {
  delete state.budgets[monthKey];
  await db.setSetting('budgets', state.budgets);
  notify();
}

/* ------------------------------------------------------------------ *
 * 周期账单模板
 * ------------------------------------------------------------------ */

export async function saveRecurring(rule) {
  await db.putRecurring(rule);
  const i = state.recurring.findIndex((r) => r.id === rule.id);
  if (i >= 0) state.recurring[i] = rule;
  else state.recurring.push(rule);
  notify();
}

export async function removeRecurring(id) {
  await db.deleteRecurring(id);
  state.recurring = state.recurring.filter((r) => r.id !== id);
  notify();
}

/* ------------------------------------------------------------------ *
 * 批次
 * ------------------------------------------------------------------ */

export async function removeBatch(id) {
  const ids = state.txs.filter((t) => t.batchId === id).map((t) => t.id);
  await db.deleteTxMany(ids);
  const set = new Set(ids);
  state.txs = state.txs.filter((t) => !set.has(t.id));
  await db.deleteBatch(id);
  state.batches = state.batches.filter((b) => b.id !== id);
  notify();
  return ids.length;
}

/* ------------------------------------------------------------------ *
 * 月份导航
 * ------------------------------------------------------------------ */

export function monthList(count = 24) {
  const months = availableMonths(state.txs);
  const base = ym(new Date());
  const out = [];
  // 从当前月往前推 count 个月
  let m = base;
  for (let i = 0; i < count; i++) {
    out.push(m);
    m = prevMonth(m);
  }
  // 把有数据的月份也并进来（可能比 count 更早）
  for (const mm of months) {
    if (!out.includes(mm)) out.push(mm);
  }
  return out.sort().reverse();
}

export function setMonth(monthKey) {
  state.month = monthKey;
  notify(true);
}

export function stepMonth(delta) {
  state.month = shiftMonth(state.month, delta);
  notify(true);
}

export function setTab(tab) {
  state.tab = tab;
  const screens = document.querySelectorAll('.screen');
  for (const el of screens) {
    el.hidden = el.dataset.tab !== tab;
  }
  const tabs = document.querySelectorAll('.tabbar .tab');
  for (const el of tabs) {
    el.classList.toggle('active', el.dataset.tab === tab);
  }
  const scroller = document.getElementById('screens');
  if (scroller) scroller.scrollTop = 0;
  notify(true);
}
