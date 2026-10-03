/**
 * 轻账 · 合并后的单文件版本（自动生成，请勿手改）
 *
 * 由 tools/build-bundle.mjs 从 src/ 下的模块生成。
 * 目的是把冷启动时的 33 个请求合并成 1 个 —— 实测线上第一次打开
 * 要 4 秒，光「等待服务器」每个文件就要约 890ms。
 *
 * 每个模块被包进一个函数，各自保留作用域，因此同名函数（esc、clamp…）
 * 不会互相覆盖。想改进源码请改 src/ 下的文件，然后重新运行合并。
 */
(function () {
  'use strict';
  var __mods = {};
  var __cache = {};
  function __rmod(id) {
    if (__cache[id]) return __cache[id];
    var f = __mods[id];
    if (!f) throw new Error('模块不存在：' + id);
    var m = f(__rmod);
    __cache[id] = m;
    return m;
  }

  /* ---------- src/core/model.js ---------- */
  __mods["src/core/model.js"] = function (__rmod) {



















const BUILTIN_CATEGORIES = [
{ id: 'food',      name: '餐饮',   icon: '🍜', color: '#FF9F0A' },
{ id: 'transport', name: '交通',   icon: '🚇', color: '#0A84FF' },
{ id: 'shopping',  name: '购物',   icon: '🛍️', color: '#FF375F' },
{ id: 'housing',   name: '住房',   icon: '🏠', color: '#8E8E93' },
{ id: 'fun',       name: '娱乐',   icon: '🎮', color: '#BF5AF2' },
{ id: 'medical',   name: '医疗',   icon: '💊', color: '#30D158' },
{ id: 'education', name: '教育',   icon: '📚', color: '#5E5CE6' },
{ id: 'gift',      name: '人情',   icon: '🎁', color: '#FF6482' },
{ id: 'subs',      name: '订阅',   icon: '🔁', color: '#64D2FF' },
{ id: 'other',     name: '其他',   icon: '📦', color: '#98989D' },
];


const CATEGORIES = BUILTIN_CATEGORIES.map((c) => ({ ...c, builtin: true }));


const BUILTIN_IDS = new Set(BUILTIN_CATEGORIES.map((c) => c.id));

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);






function setCustomCategories(list) {
const custom = (Array.isArray(list) ? list : [])
.filter((c) => c && typeof c.id === 'string' && c.id && typeof c.name === 'string' && c.name.trim())
.map((c) => ({
id: c.id,
name: String(c.name).trim().slice(0, 12),
icon: c.icon || '🏷️',
color: c.color || '#8E8E93',
builtin: false,
createdAt: c.createdAt || Date.now(),
}));




const builtinNoOther = BUILTIN_CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({ ...c, builtin: true }));
const otherCat = BUILTIN_CATEGORIES.find((c) => c.id === 'other');
const next = [...builtinNoOther, ...custom, { ...otherCat, builtin: true }];

CATEGORIES.length = 0;
CATEGORIES.push(...next);
return CATEGORIES;
}


function builtinCategoryIds() {
return new Set(BUILTIN_IDS);
}


function isCustomCategory(id) {
return !!id && !BUILTIN_IDS.has(id) && CATEGORIES.some((c) => c.id === id);
}


function isKnownCategory(id) {
return CATEGORIES.some((c) => c.id === id) || INCOME_CATEGORIES.some((c) => c.id === id);
}


function newCategoryId(name) {
const base = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
return base;
}





function category(id) {
for (const c of CATEGORIES) if (c.id === id) return c;
for (const c of INCOME_CATEGORIES) if (c.id === id) return c;
return CATEGORIES.find((c) => c.id === 'other') || BUILTIN_CATEGORIES[9];
}

function categoryName(id) {
return category(id).name;
}






function txIcon(tx) {
if (!tx) return '📦';
if (tx.type === 'redpacket') return '🧧';
if (tx.type === 'refund') return '↩️';
if (tx.type === 'transfer') return '🔄';
if (tx.type === 'repay') return '💳';

const custom = CATEGORIES.find((c) => c.id === tx.category);
if (custom && !custom.builtin) return custom.icon;
if (tx.type === 'income') {
return category(tx.category).icon || '➕';
}
return category(tx.category).icon;
}


function txCategoryLabel(tx) {
if (!tx) return '其他';
if (tx.type === 'refund') return '退款';
if (tx.type === 'redpacket') return '红包';
if (tx.type === 'transfer') return '内部转账';
if (tx.type === 'repay') return '信用卡还款';

const custom = CATEGORIES.find((c) => c.id === tx.category);
if (custom && !custom.builtin) return custom.name;
if (tx.type === 'income') {
return category(tx.category).name || '其他收入';
}
return category(tx.category).name;
}


const INCOME_CATEGORIES = [
{ id: 'salary',   name: '工资',   icon: '💼' },
{ id: 'bonus',    name: '奖金',   icon: '🏆' },
{ id: 'refund',   name: '退款',   icon: '↩️' },
{ id: 'redpacket',name: '红包',   icon: '🧧' },
{ id: 'other_in', name: '其他收入', icon: '➕' },
];


const BUILTIN_INCOME_CATEGORIES = INCOME_CATEGORIES.map((c) => ({ ...c }));





function setCustomIncomeCategories(list) {
const custom = (Array.isArray(list) ? list : [])
.filter((c) => c && typeof c.id === 'string' && c.id && typeof c.name === 'string' && c.name.trim())
.map((c) => ({
id: c.id,
name: String(c.name).trim().slice(0, 12),
icon: c.icon || '🏷️',
builtin: false,
createdAt: c.createdAt || Date.now(),
}));


const builtinNoOther = BUILTIN_INCOME_CATEGORIES.filter((c) => c.id !== 'other_in').map((c) => ({ ...c, builtin: true }));
const otherCat = BUILTIN_INCOME_CATEGORIES.find((c) => c.id === 'other_in');
const next = [...builtinNoOther, ...custom, { ...otherCat, builtin: true }];

INCOME_CATEGORIES.length = 0;
INCOME_CATEGORIES.push(...next);
return INCOME_CATEGORIES;
}


const CATEGORY_ICON_CHOICES = [
'🍜', '🍔', '☕', '🧋', '🚇', '🚕', '⛽', '✈️', '🛍️', '👕', '👟', '💄',
'🏠', '💡', '📱', '🧹', '🎮', '🎬', '🎵', '🏀', '💊', '🏥', '📚', '✏️',
'🎁', '🧧', '🔁', '📦', '🐱', '🐶', '🌱', '🔬', '🎨', '🧪', '💻', '🎧',
];

const CATEGORY_COLOR_CHOICES = [
'#FF9F0A', '#FF375F', '#FF6482', '#BF5AF2', '#5E5CE6', '#0A84FF',
'#64D2FF', '#30D158', '#A2845E', '#8E8E93', '#98989D', '#FF3B30',
];














const TX_TYPES = {
expense:  { id: 'expense',  name: '消费',     direction: 'out', countsAsSpend: true,  color: '#FF3B30' },
income:   { id: 'income',   name: '收入',     direction: 'in',  countsAsSpend: false, color: '#34C759' },
refund:   { id: 'refund',   name: '退款',     direction: 'in',  countsAsSpend: false, color: '#30D158' },
redpacket:{ id: 'redpacket',name: '红包',     direction: 'in',  countsAsSpend: false, color: '#FF6482' },
transfer: { id: 'transfer', name: '内部转账', direction: 'out', countsAsSpend: false, color: '#8E8E93' },
repay:    { id: 'repay',    name: '信用卡还款',direction: 'out', countsAsSpend: false, color: '#8E8E93' },
};

const TX_TYPE_IDS = Object.keys(TX_TYPES);

function txType(id) {
return TX_TYPES[id] || TX_TYPES.expense;
}


const MANUAL_TYPES = ['expense', 'income', 'redpacket', 'transfer', 'repay'];





const SOURCES = {
wechat:  { id: 'wechat',  name: '微信',   short: '微', color: '#07C160' },
alipay:  { id: 'alipay',  name: '支付宝', short: '支', color: '#1677FF' },
manual:  { id: 'manual',  name: '手动',   short: '手动', color: '#8E8E93' },
recurring:{ id: 'recurring', name: '周期', short: '周期', color: '#BF5AF2' },
import:  { id: 'import',  name: '导入',   short: '导入', color: '#5E5CE6' },
};

function source(id) {
return SOURCES[id] || SOURCES.manual;
}





let _seq = 0;

function newId(prefix = 't') {
_seq = (_seq + 1) % 100000;
const rand = Math.random().toString(36).slice(2, 8);
return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}_${rand}`;
}


function toCents(yuan) {
const n = typeof yuan === 'number' ? yuan : parseFloat(String(yuan).replace(/[^\d.\-]/g, ''));
if (!Number.isFinite(n)) return 0;
return Math.round(n * 100);
}


function toYuan(cents) {
return Math.round(cents) / 100;
}


function money(cents, opts = {}) {
const { sign = false, symbol = '¥', compact = false } = opts;
const v = toYuan(cents);
const abs = Math.abs(v);
let body;
if (compact && abs >= 10000) {
body = (abs / 10000).toFixed(abs >= 100000 ? 0 : 1) + '万';
} else {
body = abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const neg = v < 0;
let head = symbol;
if (sign) head = neg ? '-' + symbol : '+' + symbol;
else if (neg) head = '-' + symbol;
return head + body;
}


function ymd(date) {
const d = date instanceof Date ? date : new Date(date);
const p = (n) => String(n).padStart(2, '0');
return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}


function ym(date) {
const d = date instanceof Date ? date : new Date(date);
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthKey) {
const [y, m] = monthKey.split('-');
return `${Number(m)}月`;
}

function monthLabelFull(monthKey) {
const [y, m] = monthKey.split('-');
return `${y}年${Number(m)}月`;
}


function shiftMonth(monthKey, delta) {
const [y, m] = monthKey.split('-').map(Number);
const d = new Date(y, m - 1 + delta, 1);
return ym(d);
}


function prevMonth(monthKey) {
return shiftMonth(monthKey, -1);
}


function monthRange(monthKey) {
const [y, m] = monthKey.split('-').map(Number);
return {
start: new Date(y, m - 1, 1, 0, 0, 0, 0).getTime(),
end: new Date(y, m, 1, 0, 0, 0, 0).getTime(),
};
}


function daysInMonth(monthKey) {
const [y, m] = monthKey.split('-').map(Number);
return new Date(y, m, 0).getDate();
}









function makeTx(patch = {}) {
const amount = Number.isFinite(patch.amountCents)
? Math.trunc(patch.amountCents)
: toCents(patch.amount || 0);

return {
id: patch.id || newId(),

ts: patch.ts || Date.now(),

amountCents: Math.abs(amount),

type: TX_TYPES[patch.type] ? patch.type : 'expense',

category: patch.category || (patch.type === 'income' ? 'other_in' : 'other'),

merchant: (patch.merchant || '').trim(),

description: (patch.description || '').trim(),

rawType: (patch.rawType || '').trim(),

source: SOURCES[patch.source] ? patch.source : 'manual',

account: patch.account || '',

userCategory: !!patch.userCategory,

note: patch.note || '',

batchId: patch.batchId || '',

fp: patch.fp || '',

duplicateOf: patch.duplicateOf || null,

excluded: !!patch.excluded,










...(patch.savings ? { savings: true } : {}),
...(patch.savingsDirection ? { savingsDirection: patch.savingsDirection } : {}),
createdAt: patch.createdAt || Date.now(),
updatedAt: patch.updatedAt || Date.now(),
};
}


function countsAsSpend(tx) {
if (tx.excluded || tx.duplicateOf) return false;
if (tx.type === 'expense') return true;

return false;
}


function refundAmount(tx) {
if (tx.excluded || tx.duplicateOf) return 0;
if (tx.type === 'refund') return tx.amountCents;
return 0;
}


function cashFlow(tx) {
if (tx.excluded || tx.duplicateOf) return 0;
if (tx.type === 'transfer' || tx.type === 'repay') return 0;
const t = txType(tx.type);
return t.direction === 'in' ? tx.amountCents : -tx.amountCents;
}
    return { BUILTIN_CATEGORIES, CATEGORIES, CATEGORY_IDS, setCustomCategories, builtinCategoryIds, isCustomCategory, isKnownCategory, newCategoryId, category, categoryName, txIcon, txCategoryLabel, INCOME_CATEGORIES, BUILTIN_INCOME_CATEGORIES, setCustomIncomeCategories, CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES, TX_TYPES, TX_TYPE_IDS, txType, MANUAL_TYPES, SOURCES, source, newId, toCents, toYuan, money, ymd, ym, monthLabel, monthLabelFull, shiftMonth, prevMonth, monthRange, daysInMonth, makeTx, countsAsSpend, refundAmount, cashFlow };
  };

  /* ---------- src/core/util.js ---------- */
  __mods["src/core/util.js"] = function (__rmod) {










function fnv1a(str) {
let h = 0x811c9dc5;
for (let i = 0; i < str.length; i++) {
h ^= str.charCodeAt(i);
h = Math.imul(h, 0x01000193);
}
return (h >>> 0).toString(36);
}


function hash64(str) {
let h1 = 0xdeadbeef ^ str.length;
let h2 = 0x41c6ce57 ^ str.length;
for (let i = 0; i < str.length; i++) {
const ch = str.charCodeAt(i);
h1 = Math.imul(h1 ^ ch, 2654435761);
h2 = Math.imul(h2 ^ ch, 1597334677);
}
h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
return (h2 >>> 0).toString(36) + '-' + (h1 >>> 0).toString(36);
}






function cleanText(s) {
if (s == null) return '';
return String(s)
.replace(/^\uFEFF/, '')
.replace(/[\u200B-\u200D\uFEFF]/g, '')
.replace(/[\s\u3000]+/g, ' ')
.trim();
}


function normalizeMerchant(name) {
let s = cleanText(name);
if (!s) return '';

s = s.replace(/[（(][^）)]{0,20}[）)]\s*$/, '');

s = s.replace(/(有限公司|有限责任公司|股份有限公司|分公司|集团)$/,'');

s = s.replace(/[·・.。,\-_*#]+/g, ' ');
return cleanText(s).toLowerCase();
}


function containsAny(text, keywords) {
if (!text) return false;
const t = text.toLowerCase();
for (const k of keywords) {
if (t.includes(k.toLowerCase())) return true;
}
return false;
}





function sum(arr, pick = (x) => x) {
let s = 0;
for (const x of arr) s += pick(x);
return s;
}

function groupBy(arr, keyFn) {
const map = new Map();
for (const item of arr) {
const k = keyFn(item);
let bucket = map.get(k);
if (!bucket) { bucket = []; map.set(k, bucket); }
bucket.push(item);
}
return map;
}

function sortByDesc(arr, pick) {
return arr.slice().sort((a, b) => pick(b) - pick(a));
}

function clamp(n, lo, hi) {
return Math.min(hi, Math.max(lo, n));
}

function percent(part, whole) {
if (!whole) return 0;
return (part / whole) * 100;
}





function bufToBase64(buf) {
const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
let bin = '';
const CHUNK = 0x8000;
for (let i = 0; i < bytes.length; i += CHUNK) {
bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
}
return btoa(bin);
}

function base64ToBuf(b64) {
const bin = atob(b64);
const out = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
return out;
}










function parseDateTime(input, fallbackTime) {
if (input instanceof Date) return input.getTime();
if (typeof input === 'number' && input > 1e12) return input;

let s = cleanText(input);
if (!s) return null;


let hh = 0, mm = 0, ss = 0;
const tm = s.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
if (tm) {
hh = +tm[1]; mm = +tm[2]; ss = +(tm[3] || 0);
s = s.replace(tm[0], ' ');
}
if (fallbackTime && !tm) {
const ft = cleanText(fallbackTime).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
if (ft) { hh = +ft[1]; mm = +ft[2]; ss = +(ft[3] || 0); }
}

s = s.trim();

let y, mo, d;

let m = s.match(/^(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/);
if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
else if ((m = s.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/))) {

mo = +m[1]; d = +m[2]; y = +m[3];
}
else if ((m = s.match(/^(\d{1,2})\s*[-/月]\s*(\d{1,2})日?/))) {
// 没有年份，默认今年
y = new Date().getFullYear(); mo = +m[1]; d = +m[2];
}
else {
// 交给原生解析兜底（例如 ISO 字符串）
const t = Date.parse(s);
return Number.isFinite(t) ? t : null;
}

if (!y || !mo || !d) return null;
if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

const dt = new Date(y, mo - 1, d, hh, mm, ss, 0);
// 校验没有溢出（例如 2月30日会被自动进位到3月）
if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
return dt.getTime();
}

/**
* 解析金额。处理：¥1,234.56 / -12.30 / 12.30元 / 1,234
* 返回 { cents, negative }，解析不了返回 null。
*/
function parseAmount(input) {
if (typeof input === 'number') {
if (!Number.isFinite(input)) return null;
return { cents: Math.round(Math.abs(input) * 100), negative: input < 0 };
}
let s = cleanText(input);
if (!s) return null;
const negative = /^\s*-/.test(s) || /^\(.*\)$/.test(s);
s = s.replace(/[¥￥,，\s()]/g, '').replace(/元$/, '').replace(/^\+/, '');
if (s.startsWith('-')) { s = s.slice(1); }
if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null;
const val = parseFloat(s);
if (!Number.isFinite(val)) return null;
return { cents: Math.round(val * 100), negative };
}
    return { fnv1a, hash64, cleanText, normalizeMerchant, containsAny, sum, groupBy, sortByDesc, clamp, percent, bufToBase64, base64ToBuf, parseDateTime, parseAmount };
  };

  /* ---------- src/core/stats.js ---------- */
  __mods["src/core/stats.js"] = function (__rmod) {
    var { CATEGORIES, INCOME_CATEGORIES, category, txType, countsAsSpend, refundAmount, cashFlow, ymd, ym, monthRange, prevMonth, daysInMonth } = __rmod("src/core/model.js");
    var { groupBy, sum, percent, normalizeMerchant } = __rmod("src/core/util.js");





















function isActive(tx) {
return !tx.excluded && !tx.duplicateOf;
}


function activeTxs(txs) {
return txs.filter(isActive);
}


function totalExpense(txs) {
return sum(txs, (t) => (isActive(t) && t.type === 'expense' ? t.amountCents : 0));
}


function totalRefund(txs) {
return sum(txs, (t) => refundAmount(t));
}


function netSpend(txs) {
return Math.max(0, totalExpense(txs) - totalRefund(txs));
}









function totalIncome(txs) {
return sum(txs, (t) => (
isActive(t)
&& !t.savings
&& (t.type === 'income' || t.type === 'redpacket')
? t.amountCents
: 0
));
}


function totalMoved(txs) {
return sum(txs, (t) => (
isActive(t)
&& !t.savings
&& (t.type === 'transfer' || t.type === 'repay')
? t.amountCents
: 0
));
}









function categoryBreakdown(txs, opts = {}) {
const includeEmpty = !!opts.includeEmpty;
const active = activeTxs(txs);


const refundByCategory = new Map();
for (const t of active) {
if (t.type !== 'refund') continue;
const cat = matchRefundCategory(t, active);
refundByCategory.set(cat, (refundByCategory.get(cat) || 0) + t.amountCents);
}

const spendByCategory = new Map();
const countByCategory = new Map();
for (const t of active) {
if (t.type !== 'expense') continue;
const c = normalizeCategoryId(t.category);
spendByCategory.set(c, (spendByCategory.get(c) || 0) + t.amountCents);
countByCategory.set(c, (countByCategory.get(c) || 0) + 1);
}






const fallbackId = CATEGORIES.some((c) => c.id === 'other') ? 'other' : (CATEGORIES[CATEGORIES.length - 1] || {}).id;
const rows = CATEGORIES.map((c) => {
const cents = spendByCategory.get(c.id) || 0;
const refundCents = refundByCategory.get(c.id) || 0;
return {
id: c.id,
name: c.name,
icon: c.icon,
color: c.color,
cents,
refundCents,

netCents: cents - refundCents,
count: countByCategory.get(c.id) || 0,
percent: 0,
};
});



const knownIds = new Set(CATEGORIES.map((c) => c.id));
let orphanCents = 0;
let orphanRefund = 0;
let orphanCount = 0;
for (const [id, cents] of spendByCategory) {
if (!knownIds.has(id)) { orphanCents += cents; orphanCount += countByCategory.get(id) || 0; }
}
for (const [id, cents] of refundByCategory) {
if (!knownIds.has(id)) orphanRefund += cents;
}
if (orphanCents || orphanRefund) {
const target = rows.find((r) => r.id === fallbackId) || rows[rows.length - 1];
if (target) {
target.cents += orphanCents;
target.refundCents += orphanRefund;
target.netCents = target.cents - target.refundCents;
target.count += orphanCount;
target.orphan = true;
}
}






const expenseAll = rows.reduce((s, r) => s + r.cents, 0);
const refundAll = rows.reduce((s, r) => s + r.refundCents, 0);
const grandNet = Math.max(0, expenseAll - refundAll);
for (const r of rows) if (r.netCents < 0) r.netCents = 0;

const positiveSum = rows.reduce((s, r) => s + r.netCents, 0);
const surplus = positiveSum - grandNet;
if (surplus > 0 && positiveSum > 0) {
const pos = rows.filter((r) => r.netCents > 0).sort((a, b) => b.netCents - a.netCents);
let taken = 0;
pos.forEach((r, i) => {

const cut = i === pos.length - 1 ? surplus - taken : Math.floor((surplus * r.netCents) / positiveSum);
const c = Math.max(0, Math.min(r.netCents, cut));
r.netCents -= c;
taken += c;
});

let rest = surplus - taken;
while (rest > 0) {
let moved = false;
for (const r of pos) {
if (rest <= 0) break;
if (r.netCents > 0) { r.netCents--; rest--; moved = true; }
}
if (!moved) break;
}
}

for (const r of rows) {
r.percent = grandNet > 0 ? percent(r.netCents, grandNet) : 0;
}

rows.sort((a, b) => b.netCents - a.netCents);

if (includeEmpty) return { rows, total: grandNet };
return { rows: rows.filter((r) => r.cents > 0 || r.refundCents > 0), total: grandNet };
}















function matchRefundCategory(refundTx, activeTxsList) {

const PLACEHOLDER = new Set(['refund', 'other', '', 'redpacket', 'other_in']);

const own = refundTx.category;
if (own && !PLACEHOLDER.has(own)) {
const known = CATEGORIES.some((c) => c.id === own);
if (known) return own;
}








const norm = normalizeMerchant(refundTx.merchant);
if (norm) {
let best = null;
for (const t of activeTxsList) {
if (t.type !== 'expense') continue;
if (normalizeMerchant(t.merchant) !== norm) continue;
const gap = Math.abs(t.amountCents - refundTx.amountCents);
if (!best || gap < best.gap) best = { t, gap };
}
if (best) {
const known = CATEGORIES.some((c) => c.id === best.t.category);
if (known) return best.t.category;
}
}

return 'other';
}

function normalizeCategoryId(id) {



const known = CATEGORIES.some((c) => c.id === id) || INCOME_CATEGORIES.some((c) => c.id === id);
return known ? id : 'other';
}





function overview(txs, monthKey) {
let list = txs;
if (monthKey) {
const { start, end } = monthRange(monthKey);
list = txs.filter((t) => t.ts >= start && t.ts < end);
}
const active = activeTxs(list);

const expense = totalExpense(active);
const refund = totalRefund(active);
const net = Math.max(0, expense - refund);
const income = totalIncome(active);
const moved = totalMoved(active);

const days = monthKey ? daysInMonth(monthKey) : countDays(active);

return {
expense,
refund,
net,
income,
moved,
balance: income - net,
count: active.length,
expenseCount: active.filter((t) => t.type === 'expense').length,
avgPerDay: days > 0 ? Math.round(net / days) : 0,
days,
largest: active
.filter((t) => t.type === 'expense')
.reduce((m, t) => (t.amountCents > (m ? m.amountCents : 0) ? t : m), null),
};
}

function countDays(txs) {
if (!txs.length) return 0;
const set = new Set(txs.map((t) => ymd(t.ts)));
return set.size;
}









function trend(txs, endMonth, n = 6) {
const months = [];
let m = endMonth;
for (let i = 0; i < n; i++) {
months.unshift(m);
m = prevMonth(m);
}
const active = activeTxs(txs);
const rows = months.map((month) => {
const { start, end } = monthRange(month);
const list = active.filter((t) => t.ts >= start && t.ts < end);
const expense = totalExpense(list);
const refund = totalRefund(list);
const net = Math.max(0, expense - refund);
const income = totalIncome(list);
return {
month,
label: `${Number(month.split('-')[1])}月`,
expense,
refund,
net,
income,
balance: income - net,
percent: 0,
};
});
const max = Math.max(1, ...rows.map((r) => Math.max(r.net, r.income)));
for (const r of rows) r.percent = (r.net / max) * 100;
return rows;
}




function comparison(txs, monthKey) {
const cur = overview(txs, monthKey);
const prevKey = prevMonth(monthKey);
const prev = overview(txs, prevKey);
const yoyKey = shiftYear(monthKey, -1);
const yoy = overview(txs, yoyKey);

const momDiff = cur.net - prev.net;
const momPct = prev.net > 0 ? (momDiff / prev.net) * 100 : null;

const yoyDiff = cur.net - yoy.net;
const yoyPct = yoy.net > 0 ? (yoyDiff / yoy.net) * 100 : null;

return {
current: cur,
prev,
prevKey,
yoy,
yoyKey,
momDiff,
momPct,
yoyDiff,
yoyPct,
};
}

function shiftYear(monthKey, delta) {
const [y, m] = monthKey.split('-');
return `${Number(y) + delta}-${m}`;
}




function categoryComparison(txs, monthKey) {
const cur = categoryBreakdown(filterMonth(txs, monthKey)).rows;
const prevKey = prevMonth(monthKey);
const prev = categoryBreakdown(filterMonth(txs, prevKey)).rows;

const prevMap = new Map(prev.map((r) => [r.id, r]));
const ids = new Set([...cur.map((r) => r.id), ...prev.map((r) => r.id)]);

const rows = [];
for (const id of ids) {
const c = category(id);
const a = cur.find((r) => r.id === id) || { netCents: 0, percent: 0, count: 0 };
const b = prevMap.get(id) || { netCents: 0, percent: 0, count: 0 };
const diff = a.netCents - b.netCents;
rows.push({
id,
name: c.name,
icon: c.icon,
color: c.color,
current: a.netCents,
prev: b.netCents,
diff,
pctChange: b.netCents > 0 ? (diff / b.netCents) * 100 : null,
currentPercent: a.percent,
prevPercent: b.percent,
percentDiff: a.percent - b.percent,
count: a.count,
});
}
rows.sort((x, y) => y.current - x.current);
return { rows, prevKey };
}

function filterMonth(txs, monthKey) {
const { start, end } = monthRange(monthKey);
return txs.filter((t) => t.ts >= start && t.ts < end);
}





function merchantRanking(txs, limit = 20) {
const active = activeTxs(txs).filter((t) => t.type === 'expense');
const map = new Map();

for (const t of active) {
const key = t.merchant || '未知商户';
let row = map.get(key);
if (!row) {
row = { name: key, cents: 0, count: 0, category: t.category, lastTs: 0, firstTs: Infinity, txIds: [] };
map.set(key, row);
}
row.cents += t.amountCents;
row.count++;
row.lastTs = Math.max(row.lastTs, t.ts);
row.firstTs = Math.min(row.firstTs, t.ts);
row.txIds.push(t.id);
}

const rows = [...map.values()].sort((a, b) => b.cents - a.cents).slice(0, limit);
const total = rows.reduce((s, r) => s + r.cents, 0);
for (const r of rows) {
r.percent = total > 0 ? percent(r.cents, total) : 0;
r.avg = Math.round(r.cents / r.count);
}
return rows;
}





function dailySeries(txs, monthKey) {
const { start } = monthRange(monthKey);
const n = daysInMonth(monthKey);
const days = [];
for (let d = 1; d <= n; d++) {
const dayStart = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), d).getTime();
days.push({ day: d, date: ymd(dayStart), start: dayStart, expense: 0, income: 0, count: 0, txs: [] });
}

const active = filterMonth(activeTxs(txs), monthKey);
for (const t of active) {
const idx = new Date(t.ts).getDate() - 1;
if (idx < 0 || idx >= days.length) continue;
const d = days[idx];
d.txs.push(t);
d.count++;
if (t.type === 'expense') d.expense += t.amountCents;
else if (t.type === 'refund') d.expense -= t.amountCents;
else if (t.type === 'income' || t.type === 'redpacket') d.income += t.amountCents;
}
for (const d of days) d.expense = Math.max(0, d.expense);
const max = Math.max(1, ...days.map((d) => d.expense));
for (const d of days) d.percent = (d.expense / max) * 100;
return days;
}





function hourDistribution(txs) {
const buckets = new Array(24).fill(0);
for (const t of activeTxs(txs)) {
if (t.type !== 'expense') continue;
buckets[new Date(t.ts).getHours()] += t.amountCents;
}
const max = Math.max(1, ...buckets);
return buckets.map((cents, hour) => ({ hour, cents, percent: (cents / max) * 100 }));
}


function weekdayDistribution(txs) {
const buckets = new Array(7).fill(0);
const counts = new Array(7).fill(0);
for (const t of activeTxs(txs)) {
if (t.type !== 'expense') continue;
const d = new Date(t.ts).getDay();
buckets[d] += t.amountCents;
counts[d]++;
}
const max = Math.max(1, ...buckets);
const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
return buckets.map((cents, i) => ({ day: i, name: names[i], cents, count: counts[i], percent: (cents / max) * 100 }));
}





function incomeBreakdown(txs) {
const active = activeTxs(txs);
const map = new Map();
for (const t of active) {
if (t.type !== 'income' && t.type !== 'redpacket') continue;
const key = t.type === 'redpacket' ? 'redpacket' : (t.category || 'other_in');
map.set(key, (map.get(key) || 0) + t.amountCents);
}
const total = sum([...map.values()], (x) => x);
return [...map.entries()]
.map(([id, cents]) => ({ id, name: INCOME_LABEL[id] || id, cents, percent: percent(cents, total) }))
.sort((a, b) => b.cents - a.cents);
}

const INCOME_LABEL = {
salary: '工资',
bonus: '奖金',
refund: '退款',
redpacket: '红包',
other_in: '其他收入',
};





function breakdownBy(txs, field) {
const map = new Map();
for (const t of activeTxs(txs)) {
if (t.type !== 'expense') continue;
const key = t[field] || '未标注';
map.set(key, (map.get(key) || 0) + t.amountCents);
}
const total = sum([...map.values()], (x) => x);
return [...map.entries()]
.map(([name, cents]) => ({ name, cents, percent: percent(cents, total) }))
.sort((a, b) => b.cents - a.cents);
}





function availableMonths(txs) {
const set = new Set();
for (const t of txs) set.add(ym(t.ts));
return [...set].sort().reverse();
}
    return { isActive, activeTxs, totalExpense, totalRefund, netSpend, totalIncome, totalMoved, categoryBreakdown, overview, trend, comparison, categoryComparison, filterMonth, merchantRanking, dailySeries, hourDistribution, weekdayDistribution, incomeBreakdown, breakdownBy, availableMonths };
  };

  /* ---------- src/core/budget.js ---------- */
  __mods["src/core/budget.js"] = function (__rmod) {
    var { monthRange, category: getCategory } = __rmod("src/core/model.js");
    var { sum } = __rmod("src/core/util.js");
    var { activeTxs } = __rmod("src/core/stats.js");














const DEFAULT_WARN_RATIO = 0.8;

function defaultBudget() {
return {

totalCents: 0,

byCategory: {},

warnRatio: DEFAULT_WARN_RATIO,

carryOver: false,
updatedAt: 0,
};
}




function spentInMonth(txs, monthKey, categoryId) {
const { start, end } = monthRange(monthKey);
let spent = 0;
for (const t of activeTxs(txs)) {
if (t.ts < start || t.ts >= end) continue;
if (categoryId && t.category !== categoryId) continue;
if (t.type === 'expense') spent += t.amountCents;
else if (t.type === 'refund') spent -= t.amountCents;
}
return Math.max(0, spent);
}




function budgetStatus(txs, monthKey, budget) {
const b = { ...defaultBudget(), ...(budget || {}) };
const { start, end } = monthRange(monthKey);
const dayOfMonth = daysElapsed(monthKey);
const totalDays = daysInMonthOf(monthKey);

let spent = 0, income = 0;
for (const t of activeTxs(txs)) {
if (t.ts < start || t.ts >= end) continue;
if (t.type === 'expense') spent += t.amountCents;
else if (t.type === 'refund') spent -= t.amountCents;
else if (t.type === 'income' || t.type === 'redpacket') income += t.amountCents;
}
spent = Math.max(0, spent);

const hasTotal = b.totalCents > 0;
const ratio = hasTotal ? spent / b.totalCents : 0;
const remaining = hasTotal ? b.totalCents - spent : 0;
const dailyAllowance = hasTotal && dayOfMonth < totalDays
? Math.max(0, Math.round(remaining / (totalDays - dayOfMonth)))
: 0;


const pace = dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * totalDays) : 0;
const willExceed = hasTotal && pace > b.totalCents;

return {
hasTotal,
totalCents: b.totalCents,
spent,
remaining,
ratio,
percentUsed: ratio * 100,
dayOfMonth,
totalDays,
dailyAllowance,
pace,
willExceed,
balance: income - spent,
level: levelOf(ratio, hasTotal, b.warnRatio),
};
}





function categoryBudgetStatus(txs, monthKey, budget) {
const b = { ...defaultBudget(), ...(budget || {}) };
const byCat = b.byCategory || {};
const { start, end } = monthRange(monthKey);

const spentMap = new Map();
const countMap = new Map();
for (const t of activeTxs(txs)) {
if (t.ts < start || t.ts >= end) continue;
if (t.type === 'expense') {
spentMap.set(t.category, (spentMap.get(t.category) || 0) + t.amountCents);
countMap.set(t.category, (countMap.get(t.category) || 0) + 1);
} else if (t.type === 'refund') {
spentMap.set(t.category, (spentMap.get(t.category) || 0) - t.amountCents);
}
}

const rows = [];
for (const [id, budgetCents] of Object.entries(byCat)) {
if (!budgetCents || budgetCents <= 0) continue;
const c = getCategory(id);
const spent = Math.max(0, spentMap.get(id) || 0);
const ratio = spent / budgetCents;
rows.push({
id,
name: c.name,
icon: c.icon,
color: c.color,
budgetCents,
spent,
remaining: budgetCents - spent,
ratio,
percentUsed: ratio * 100,
level: levelOf(ratio, true, b.warnRatio),
count: countMap.get(id) || 0,
});
}

rows.sort((a, b2) => b2.ratio - a.ratio);
return rows;
}




function budgetAlerts(txs, monthKey, budget) {
const alerts = [];
const status = budgetStatus(txs, monthKey, budget);

if (status.hasTotal) {
if (status.ratio >= 1) {
alerts.push({
level: 'danger',
title: '总预算已超支',
detail: `本月已花 ¥${(status.spent / 100).toFixed(2)}，超出预算 ¥${(Math.abs(status.remaining) / 100).toFixed(2)}。`,
});
} else if (status.ratio >= (budget?.warnRatio ?? DEFAULT_WARN_RATIO)) {
alerts.push({
level: 'warn',
title: `总预算已用 ${status.percentUsed.toFixed(0)}%`,
detail: `还剩 ¥${(status.remaining / 100).toFixed(2)}，本月还有 ${status.totalDays - status.dayOfMonth} 天，平均每天可花 ¥${(status.dailyAllowance / 100).toFixed(2)}。`,
});
}
if (status.willExceed && status.ratio < 1) {
alerts.push({
level: 'warn',
title: '按现在的速度会超支',
detail: `目前日均 ¥${(Math.round(status.spent / Math.max(1, status.dayOfMonth)) / 100).toFixed(2)}，照这个速度月底会花到 ¥${(status.pace / 100).toFixed(2)}。`,
});
}
}

for (const row of categoryBudgetStatus(txs, monthKey, budget)) {
if (row.ratio >= 1) {
alerts.push({
level: 'danger',
title: `${row.name} 超支`,
detail: `预算 ¥${(row.budgetCents / 100).toFixed(2)}，已花 ¥${(row.spent / 100).toFixed(2)}，超 ¥${(Math.abs(row.remaining) / 100).toFixed(2)}。`,
});
} else if (row.ratio >= (budget?.warnRatio ?? DEFAULT_WARN_RATIO)) {
alerts.push({
level: 'warn',
title: `${row.name} 已用 ${row.percentUsed.toFixed(0)}%`,
detail: `预算 ¥${(row.budgetCents / 100).toFixed(2)}，还剩 ¥${(row.remaining / 100).toFixed(2)}。`,
});
}
}


alerts.sort((a, b) => (a.level === 'danger' ? -1 : 1) - (b.level === 'danger' ? -1 : 1));
return alerts;
}

function levelOf(ratio, enabled, warnRatio) {
if (!enabled) return 'none';
if (ratio >= 1) return 'danger';
if (ratio >= (warnRatio ?? DEFAULT_WARN_RATIO)) return 'warn';
return 'ok';
}

function daysElapsed(monthKey) {
const now = new Date();
const [y, m] = monthKey.split('-').map(Number);
if (now.getFullYear() === y && now.getMonth() + 1 === m) return now.getDate();

const total = daysInMonthOf(monthKey);
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
return monthKey < thisMonth ? total : 1;
}

function daysInMonthOf(monthKey) {
const [y, m] = monthKey.split('-').map(Number);
return new Date(y, m, 0).getDate();
}
    return { DEFAULT_WARN_RATIO, defaultBudget, spentInMonth, budgetStatus, categoryBudgetStatus, budgetAlerts };
  };

  /* ---------- src/core/db.js ---------- */
  __mods["src/core/db.js"] = function (__rmod) {







const DB_NAME = 'qingzhang';
const DB_VERSION = 1;

const STORE = {
TX: 'tx',
RULES: 'rules',
SETTINGS: 'settings',
BATCHES: 'batches',
RECURRING: 'recurring',
META: 'meta',
};

let _dbPromise = null;










function isNodeEnv() {
return typeof process !== 'undefined' && !!(process.versions && process.versions.node);
}








function createMemoryIDB() {

const data = {
[STORE.TX]: new Map(),
[STORE.RULES]: new Map(),
[STORE.SETTINGS]: new Map(),
[STORE.BATCHES]: new Map(),
[STORE.RECURRING]: new Map(),
[STORE.META]: new Map(),
};
const keyPathOf = {
[STORE.TX]: 'id',
[STORE.RULES]: 'key',
[STORE.SETTINGS]: 'key',
[STORE.BATCHES]: 'id',
[STORE.RECURRING]: 'id',
[STORE.META]: 'key',
};

const later = (fn) => setTimeout(fn, 0);
const req = () => ({ result: undefined, onsuccess: null, onerror: null });

function makeStore(name) {
const map = () => {
if (!data[name]) throw new Error('内存后端里没有这个 store：' + name);
return data[name];
};
const kp = keyPathOf[name];

return {
put(value) {
const r = req();
map().set(value[kp], value);
r.result = value[kp];
later(() => r.onsuccess && r.onsuccess());
return r;
},
get(key) {
const r = req();
r.result = map().get(key);
later(() => r.onsuccess && r.onsuccess());
return r;
},
getAll() {
const r = req();
r.result = [...map().values()];
later(() => r.onsuccess && r.onsuccess());
return r;
},
delete(key) {
const r = req();
map().delete(key);
later(() => r.onsuccess && r.onsuccess());
return r;
},
clear() {
const r = req();
map().clear();
later(() => r.onsuccess && r.onsuccess());
return r;
},
count() {
const r = req();
r.result = map().size;
later(() => r.onsuccess && r.onsuccess());
return r;
},

index() {
return {
openCursor(range) {
const r = req();
let list = [...map().values()];
if (range && typeof range.lower === 'number') {
const lo = range.lowerOpen ? (v) => v > range.lower : (v) => v >= range.lower;
const hi = range.upper === undefined
? () => true
: (range.upperOpen ? (v) => v < range.upper : (v) => v <= range.upper);
list = list.filter((v) => lo(v.ts) && hi(v.ts));
}
list.sort((a, b) => a.ts - b.ts);
let i = 0;
const step = () => {
if (i >= list.length) { r.result = null; r.onsuccess && r.onsuccess(); return; }
r.result = { value: list[i], continue: () => { i++; later(step); } };
r.onsuccess && r.onsuccess();
};
later(step);
return r;
},
getAll() {
const r = req();
r.result = [...map().values()];
later(() => r.onsuccess && r.onsuccess());
return r;
},
};
},
};
}

return {
transaction(names) {
const list = Array.isArray(names) ? names : [names];
const stores = {};
for (const n of list) stores[n] = makeStore(n);
const tx = {
objectStore: (n) => {
if (!stores[n]) stores[n] = makeStore(n);
return stores[n];
},
error: null,
oncomplete: null,
onerror: null,
onabort: null,
};

later(() => later(() => tx.oncomplete && tx.oncomplete()));
return tx;
},
};
}

function openDB() {
if (_dbPromise) return _dbPromise;

_dbPromise = new Promise((resolve, reject) => {

if (isNodeEnv() && typeof indexedDB === 'undefined') {
resolve(createMemoryIDB());
return;
}
if (typeof indexedDB === 'undefined') {
reject(new Error('这个浏览器不支持本地数据库（IndexedDB），无法保存数据'));
return;
}
const req = indexedDB.open(DB_NAME, DB_VERSION);

req.onupgradeneeded = (ev) => {
const db = req.result;
const oldVersion = ev.oldVersion;

if (oldVersion < 1) {
const tx = db.createObjectStore(STORE.TX, { keyPath: 'id' });
tx.createIndex('ts', 'ts');
tx.createIndex('fp', 'fp');
tx.createIndex('type', 'type');
tx.createIndex('category', 'category');
tx.createIndex('batchId', 'batchId');
tx.createIndex('source', 'source');

const rules = db.createObjectStore(STORE.RULES, { keyPath: 'key' });
rules.createIndex('category', 'category');

db.createObjectStore(STORE.SETTINGS, { keyPath: 'key' });
db.createObjectStore(STORE.BATCHES, { keyPath: 'id' });
db.createObjectStore(STORE.RECURRING, { keyPath: 'id' });
db.createObjectStore(STORE.META, { keyPath: 'key' });
}
};

req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error || new Error('打开本地数据库失败'));
req.onblocked = () => reject(new Error('数据库被其他标签页占用，请关闭轻账的其他页面后重试'));
});

return _dbPromise;
}


async function withStore(storeName, mode, fn) {
const db = await openDB();
return new Promise((resolve, reject) => {
let result;
let tx;
try {
tx = db.transaction(storeName, mode);
} catch (e) {
reject(e);
return;
}
const store = tx.objectStore(storeName);
try {
result = fn(store);
} catch (e) {
reject(e);
return;
}
tx.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
tx.onerror = () => reject(tx.error);
tx.onabort = () => reject(tx.error || new Error('数据库事务被中断'));
});
}

function wrap(request) {
const box = { __req: request };
return box;
}





async function putTxMany(txs) {
if (!txs.length) return 0;
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE.TX, 'readwrite');
const store = tx.objectStore(STORE.TX);
for (const t of txs) store.put(t);
tx.oncomplete = () => resolve(txs.length);
tx.onerror = () => reject(tx.error);
tx.onabort = () => reject(tx.error || new Error('写入交易失败'));
});
}

async function putTx(t) {
await putTxMany([t]);
return t;
}

async function getTx(id) {
return withStore(STORE.TX, 'readonly', (s) => wrap(s.get(id)));
}

async function deleteTx(id) {
return withStore(STORE.TX, 'readwrite', (s) => wrap(s.delete(id)));
}

async function deleteTxMany(ids) {
if (!ids.length) return 0;
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE.TX, 'readwrite');
const store = tx.objectStore(STORE.TX);
for (const id of ids) store.delete(id);
tx.oncomplete = () => resolve(ids.length);
tx.onerror = () => reject(tx.error);
});
}

async function allTx() {
return withStore(STORE.TX, 'readonly', (s) => wrap(s.getAll()));
}


async function txInRange(start, end) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(STORE.TX, 'readonly');
const idx = tx.objectStore(STORE.TX).index('ts');
const out = [];



const range = { lower: start, upper: end, lowerOpen: false, upperOpen: true };
const req = idx.openCursor(range);
req.onsuccess = () => {
const cur = req.result;
if (cur) { out.push(cur.value); cur.continue(); }
};
tx.oncomplete = () => resolve(out);
tx.onerror = () => reject(tx.error);
});
}

async function countTx() {
return withStore(STORE.TX, 'readonly', (s) => wrap(s.count()));
}





async function allRules() {
return withStore(STORE.RULES, 'readonly', (s) => wrap(s.getAll()));
}

async function putRule(rule) {
return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.put(rule)));
}

async function deleteRule(key) {
return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.delete(key)));
}

async function clearRules() {
return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.clear()));
}





async function getSetting(key, fallback = null) {
const row = await withStore(STORE.SETTINGS, 'readonly', (s) => wrap(s.get(key)));
return row ? row.value : fallback;
}

async function setSetting(key, value) {
return withStore(STORE.SETTINGS, 'readwrite', (s) => wrap(s.put({ key, value })));
}

async function allSettings() {
const rows = await withStore(STORE.SETTINGS, 'readonly', (s) => wrap(s.getAll()));
const out = {};
for (const r of rows) out[r.key] = r.value;
return out;
}





async function putBatch(batch) {
return withStore(STORE.BATCHES, 'readwrite', (s) => wrap(s.put(batch)));
}

async function allBatches() {
const rows = await withStore(STORE.BATCHES, 'readonly', (s) => wrap(s.getAll()));
return rows.sort((a, b) => b.createdAt - a.createdAt);
}

async function deleteBatch(id) {
return withStore(STORE.BATCHES, 'readwrite', (s) => wrap(s.delete(id)));
}





async function allRecurring() {
return withStore(STORE.RECURRING, 'readonly', (s) => wrap(s.getAll()));
}

async function putRecurring(r) {
return withStore(STORE.RECURRING, 'readwrite', (s) => wrap(s.put(r)));
}

async function deleteRecurring(id) {
return withStore(STORE.RECURRING, 'readwrite', (s) => wrap(s.delete(id)));
}





async function exportAll() {
const [txs, rules, settings, batches, recurring] = await Promise.all([
allTx(), allRules(), allSettings(), allBatches(), allRecurring(),
]);
return {
app: 'qingzhang',
formatVersion: 1,
exportedAt: Date.now(),
counts: { tx: txs.length, rules: rules.length, batches: batches.length, recurring: recurring.length },
data: { tx: txs, rules, settings, batches, recurring },
};
}


async function importAll(payload, mode = 'merge') {
const d = payload && payload.data ? payload.data : payload;
if (!d || !Array.isArray(d.tx)) throw new Error('备份文件格式不正确');

if (mode === 'replace') {
await clearAllData();
}

const existing = mode === 'merge'
? new Set((await allTx()).map((t) => t.id))
: new Set();

const fresh = d.tx.filter((t) => t && t.id && !existing.has(t.id));
await putTxMany(fresh);


if (Array.isArray(d.rules)) {
for (const r of d.rules) {
if (r && r.key) await putRule(r);
}
}
if (d.settings && typeof d.settings === 'object') {
for (const [k, v] of Object.entries(d.settings)) await setSetting(k, v);
}
if (Array.isArray(d.recurring)) {
for (const r of d.recurring) { if (r && r.id) await putRecurring(r); }
}
if (Array.isArray(d.batches)) {
for (const b of d.batches) { if (b && b.id) await putBatch(b); }
}

return { importedTx: fresh.length, skipped: d.tx.length - fresh.length };
}

async function clearAllData() {
const db = await openDB();
return new Promise((resolve, reject) => {
const names = Object.values(STORE);
const tx = db.transaction(names, 'readwrite');
for (const n of names) tx.objectStore(n).clear();
tx.oncomplete = () => resolve(true);
tx.onerror = () => reject(tx.error);
});
}










async function requestPersistence() {
try {
if (!navigator.storage || !navigator.storage.persist) {
return { supported: false, persisted: false };
}
const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
if (already) return { supported: true, persisted: true };
const granted = await navigator.storage.persist();
return { supported: true, persisted: !!granted };
} catch (e) {
return { supported: false, persisted: false, error: String(e) };
}
}

async function storageEstimate() {
try {
if (!navigator.storage || !navigator.storage.estimate) return null;
const est = await navigator.storage.estimate();
return { usage: est.usage || 0, quota: est.quota || 0 };
} catch (e) {
return null;
}
}






async function __resetDb() {
if (!isNodeEnv()) return false;
await clearAllData();
return true;
}


async function __seedDb(txs) {
if (!isNodeEnv()) return 0;
await putTxMany(txs);
return txs.length;
}


function __isMemoryBackend() {
return isNodeEnv() && typeof indexedDB === 'undefined';
}
    return { STORE, putTxMany, putTx, getTx, deleteTx, deleteTxMany, allTx, txInRange, countTx, allRules, putRule, deleteRule, clearRules, getSetting, setSetting, allSettings, putBatch, allBatches, deleteBatch, allRecurring, putRecurring, deleteRecurring, exportAll, importAll, clearAllData, requestPersistence, storageEstimate, __resetDb, __seedDb, __isMemoryBackend };
  };

  /* ---------- src/core/savings.js ---------- */
  __mods["src/core/savings.js"] = function (__rmod) {
    var { makeTx, newId, ym, monthRange, shiftMonth, category: getCategory, ymd } = __rmod("src/core/model.js");
    var { activeTxs, totalIncome, netSpend } = __rmod("src/core/stats.js");
    var { normalizeMerchant, cleanText, groupBy, sum } = __rmod("src/core/util.js");
    var db = __rmod("src/core/db.js");






























const KEY = 'savings';





function defaultSavings() {
return {

account: '储蓄账户',

goalCents: 0,

goalLabel: '',

goalByMonth: '',

monthlyTargetCents: 0,

aliases: [],
updatedAt: 0,
};
}

async function loadSettings() {
const raw = await db.getSetting(KEY, null);
return { ...defaultSavings(), ...(raw || {}) };
}

async function saveSettings(patch) {
const cur = await loadSettings();
const next = { ...cur, ...patch, updatedAt: Date.now() };
await db.setSetting(KEY, next);
return next;
}






function isSavings(tx) {
return !!(tx && tx.savings && !tx.duplicateOf && !tx.excluded);
}


function isMoveType(type) {
return type === 'transfer' || type === 'repay';
}


function savingsNames(settings) {
const s = settings || defaultSavings();
const names = [s.account, ...(s.aliases || [])]
.map((x) => cleanText(x))
.filter(Boolean);
return [...new Set(names)];
}


function looksLikeSavings(name, names) {
const n = normalizeMerchant(name);
if (!n) return false;
return names.some((want) => {
const w = normalizeMerchant(want);
return w && (n === w || n.includes(w) || w.includes(n));
});
}























function computeSavings(txs, settings) {
const s = { ...defaultSavings(), ...(settings || {}) };
const names = savingsNames(s);
const active = activeTxs(txs);


const ledger = active.filter((t) => t.savings === true);
ledger.sort((a, b) => a.ts - b.ts);
















const directionOf = (t) => {
if (t.savingsDirection === 'in') return 'in';
if (t.savingsDirection === 'out') return 'out';
return t.type === 'income' ? 'out' : 'in';
};




let firstDepositIdx = -1;
for (let i = 0; i < ledger.length; i++) {
if (directionOf(ledger[i]) === 'in') { firstDepositIdx = i; break; }
}

let baselineCents = 0;
const counted = [];
if (firstDepositIdx > 0) {

for (const t of ledger.slice(0, firstDepositIdx)) {
baselineCents += directionOf(t) === 'in' ? t.amountCents : -t.amountCents;
}
counted.push(...ledger.slice(firstDepositIdx));
} else {
counted.push(...ledger);
}

let balance = baselineCents;
let totalIn = Math.max(0, baselineCents);
let totalOut = Math.max(0, -baselineCents);
let firstDepositMarked = false;

const events = counted.map((t) => {
const dir = directionOf(t);
const delta = dir === 'in' ? t.amountCents : -t.amountCents;
balance += delta;
if (delta >= 0) totalIn += delta;
else totalOut += -delta;


const isFirst = !firstDepositMarked;
if (isFirst) firstDepositMarked = true;

return {
tx: t,
ts: t.ts,
month: ym(t.ts),
day: ymd(t.ts),
delta,
direction: dir,
inflow: dir === 'in',
amountCents: t.amountCents,
merchant: t.merchant,
note: t.note || t.description || '',
balanceAfter: balance,
baselineBefore: isFirst ? baselineCents : 0,
};
});


const byMonth = new Map();
for (const e of events) {
const row = byMonth.get(e.month) || { month: e.month, inCents: 0, outCents: 0, netCents: 0, count: 0 };
if (e.delta >= 0) row.inCents += e.delta;
else row.outCents += -e.delta;
row.netCents += e.delta;
row.count++;
byMonth.set(e.month, row);
}


const months = [...byMonth.keys()].sort().reverse();
const surplusRows = months.map((m) => {
const { start, end } = monthRange(m);
const list = active.filter((t) => t.ts >= start && t.ts < end);
const income = totalIncome(list);
const spent = netSpend(list);
const surplus = income - spent;
const saved = (byMonth.get(m) || {}).netCents || 0;





const hasFlow = income > 0 || spent > 0;

return {
month: m,
income,
spent,
surplusCents: surplus,
savedCents: saved,
hasFlow,

pendingCents: hasFlow ? Math.max(0, surplus - saved) : 0,

overspent: hasFlow && surplus < 0,
overspendCents: hasFlow && surplus < 0 ? -surplus : 0,
oversaved: hasFlow && surplus > 0 && saved > surplus,
count: (byMonth.get(m) || {}).count || 0,
};
});


const goal = s.goalCents > 0
? {
target: s.goalCents,
label: s.goalLabel || '',
byMonth: s.goalByMonth || '',
saved: Math.max(0, balance),
remaining: Math.max(0, s.goalCents - Math.max(0, balance)),
percent: Math.min(100, (Math.max(0, balance) / s.goalCents) * 100),
done: balance >= s.goalCents,
}
: null;


const nowMonth = ym(new Date());
const thisMonthSaved = (byMonth.get(nowMonth) || {}).netCents || 0;
const monthlyTarget = s.monthlyTargetCents > 0
? {
target: s.monthlyTargetCents,
saved: thisMonthSaved,
remaining: Math.max(0, s.monthlyTargetCents - thisMonthSaved),
percent: Math.min(100, (Math.max(0, thisMonthSaved) / s.monthlyTargetCents) * 100),
}
: null;


const pendingTotal = sum(surplusRows, (r) => r.pendingCents);



const recent = surplusRows.slice(0, 3).filter((r) => r.savedCents > 0);
const avgMonthlySaved = recent.length
? Math.round(sum(recent, (r) => r.savedCents) / recent.length)
: 0;
let forecast = null;
if (goal && avgMonthlySaved > 0 && !goal.done) {
const monthsNeeded = Math.ceil(goal.remaining / avgMonthlySaved);
forecast = {
avgMonthlySaved,
monthsNeeded,

etaMonth: shiftMonth(nowMonth, monthsNeeded),
};
}

return {
settings: s,
names,
balance,
baselineCents,
totalIn,
totalOut,
events,
months,
surplusRows,
goal,
monthlyTarget,
pendingTotal,
avgMonthlySaved,
forecast,
eventCount: events.length,
};
}















async function recordSavings(input) {
const s = { ...defaultSavings(), ...(input.settings || await loadSettings()) };




const amount = Number(input.amountCents);
if (!Number.isFinite(amount) || amount <= 0) {
throw new Error('请先输入一个大于 0 的金额');
}

const dir = input.direction === 'out' ? 'out' : 'in';

const tx = makeTx({
ts: input.ts || Date.now(),
amountCents: Math.trunc(amount),



type: dir === 'in' ? 'transfer' : 'income',
category: dir === 'in' ? 'other' : 'other_in',
merchant: cleanText(input.merchant || s.account),
description: input.note ? cleanText(input.note) : (dir === 'in' ? '攒钱' : '从储蓄取出'),
note: cleanText(input.note || ''),
source: 'manual',
account: '',

savings: true,
savingsDirection: dir,
});

await db.putTx(tx);
return tx;
}









function findSavingsCandidates(txs, settings) {
const s = { ...defaultSavings(), ...(settings || {}) };
const names = savingsNames(s);
const active = activeTxs(txs).filter((t) => !t.savings);


const map = new Map();
for (const t of active) {
if (!isMoveType(t.type)) continue;
const key = t.merchant || '（未记录商户）';
const row = map.get(key) || { merchant: key, count: 0, cents: 0, firstTs: t.ts, lastTs: t.ts, matchesName: false };
row.count++;
row.cents += t.amountCents;
row.firstTs = Math.min(row.firstTs, t.ts);
row.lastTs = Math.max(row.lastTs, t.ts);
if (looksLikeSavings(key, names)) row.matchesName = true;
map.set(key, row);
}

return [...map.values()]
.filter((r) => r.count >= 1)
.sort((a, b) => {

if (a.matchesName !== b.matchesName) return a.matchesName ? -1 : 1;
return b.count - a.count;
});
}


async function markAsSavings(ids) {
const all = await db.allTx();
const set = new Set(ids);
const touched = all.filter((t) => set.has(t.id));
for (const t of touched) {
t.savings = true;

t.savingsDirection = t.type === 'income' ? 'out' : 'in';
t.updatedAt = Date.now();
}
if (touched.length) await db.putTxMany(touched);
return touched.length;
}


async function unmarkAsSavings(ids) {
const all = await db.allTx();
const set = new Set(ids);
const touched = all.filter((t) => set.has(t.id));
for (const t of touched) {
delete t.savings;
delete t.savingsDirection;
t.updatedAt = Date.now();
}
if (touched.length) await db.putTxMany(touched);
return touched.length;
}


async function markMerchantAsSavings(merchant, txs) {
const ids = txs
.filter((t) => t.merchant === merchant && isMoveType(t.type) && !t.savings)
.map((t) => t.id);
return markAsSavings(ids);
}
    return { defaultSavings, loadSettings, saveSettings, isSavings, isMoveType, savingsNames, computeSavings, recordSavings, findSavingsCandidates, markAsSavings, unmarkAsSavings, markMerchantAsSavings };
  };

  /* ---------- src/ui/dom.js ---------- */
  __mods["src/ui/dom.js"] = function (__rmod) {









function $(sel, root = document) {
return root.querySelector(sel);
}

function $$(sel, root = document) {
return Array.from(root.querySelectorAll(sel));
}


function esc(s) {
if (s == null) return '';
return String(s)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

function el(tag, attrs = {}, html = '') {
const node = document.createElement(tag);
for (const [k, v] of Object.entries(attrs)) {
if (v == null || v === false) continue;
if (k === 'class') node.className = v;
else if (k === 'dataset') Object.assign(node.dataset, v);
else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
else node.setAttribute(k, v === true ? '' : v);
}
if (html) node.innerHTML = html;
return node;
}


function delegate(root, selector, handler) {
root.addEventListener('click', (ev) => {
const target = ev.target.closest(selector);
if (!target || !root.contains(target)) return;
handler(ev, target);
});
}





const toastRoot = () => document.getElementById('toast-root');

function toast(msg, kind = '', ms = 2400) {
const root = toastRoot();
if (!root) return;
const node = document.createElement('div');
node.className = 'toast' + (kind ? ' ' + kind : '');
node.textContent = msg;
root.appendChild(node);
setTimeout(() => {
node.style.transition = 'opacity .2s';
node.style.opacity = '0';
setTimeout(() => node.remove(), 220);
}, ms);
}

const toastOk = (m, ms) => toast(m, 'ok', ms);
const toastErr = (m, ms) => toast(m, 'err', ms ?? 3200);
const toastWarn = (m, ms) => toast(m, 'warn', ms ?? 3000);





let openSheets = 0;

















function openSheet(opts = {}) {
const {
title = '',
leftLabel = '取消',
rightLabel = '',
rightDisabled = false,
onLeft,
onRight,
onClose,
grip = true,
lockBackdrop = false,
height,
render,
} = opts;

const root = document.getElementById('sheet-root');
const backdrop = document.createElement('div');
backdrop.className = 'sheet-backdrop';

const sheet = document.createElement('div');
sheet.className = 'sheet';

const head = document.createElement('div');
head.className = 'sheet-head';

const left = document.createElement('button');
left.type = 'button';
left.textContent = leftLabel;

const titleEl = document.createElement('span');
titleEl.className = 't';
titleEl.textContent = title;

const right = document.createElement('button');
right.type = 'button';
right.className = 'strong';
right.textContent = rightLabel || '';
right.disabled = rightDisabled;
if (!rightLabel) right.style.visibility = 'hidden';

head.append(left, titleEl, right);

const body = document.createElement('div');
body.className = 'sheet-body';

if (grip) {
const g = document.createElement('div');
g.className = 'sheet-grip';
sheet.appendChild(g);
}
sheet.appendChild(head);
sheet.appendChild(body);
if (height) body.style.maxHeight = height;

root.append(backdrop, sheet);
document.body.style.overflow = 'hidden';
openSheets++;

let closed = false;
let rightHandler = onRight;
right.addEventListener('click', () => {
if (right.disabled || !rightHandler) return;
rightHandler(api);
});

const api = {
body,
close,
setRightDisabled(v) { right.disabled = !!v; },
setTitle(t) { titleEl.textContent = t; },
setRightLabel(t) { right.textContent = t; right.style.visibility = t ? 'visible' : 'hidden'; },

setRightHandler(fn) { rightHandler = fn; },
root: sheet,
};

function close(result) {
if (closed) return;
closed = true;
sheet.classList.remove('show');
backdrop.classList.remove('show');
openSheets = Math.max(0, openSheets - 1);
if (openSheets === 0) document.body.style.overflow = '';
setTimeout(() => { backdrop.remove(); sheet.remove(); }, 320);
if (onClose) onClose(result);
}

left.addEventListener('click', () => {
if (onLeft) onLeft(api);
else close();
});
if (!lockBackdrop) {
backdrop.addEventListener('click', () => {
if (onLeft) onLeft(api);
else close();
});
}

if (render) render(body, api);


requestAnimationFrame(() => {
backdrop.classList.add('show');
sheet.classList.add('show');
});

return api;
}


function confirmSheet({ title, message, confirmLabel = '确定', cancelLabel = '取消', danger = false }) {
return new Promise((resolve) => {
let answered = false;
openSheet({
title,
leftLabel: cancelLabel,
rightLabel: confirmLabel,
onLeft: (api) => { answered = true; api.close(); resolve(false); },
onRight: (api) => { answered = true; api.close(); resolve(true); },
onClose: () => { if (!answered) resolve(false); },
render: (body) => {
body.innerHTML = `<div class="card" style="margin:0 16px 16px"><div class="card-pad pre" style="font-size:15px;color:var(--label-2)">${esc(message)}</div></div>`;
const row = document.createElement('div');
row.className = 'btn-row';
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'btn ' + (danger ? 'danger' : 'primary');
btn.textContent = confirmLabel;
btn.addEventListener('click', () => {
answered = true;
document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
resolve(true);
});
row.appendChild(btn);
body.appendChild(row);
},
});
});
}


function promptSheet({ title, message, value = '', placeholder = '', confirmLabel = '确定', inputType = 'text', hint = '' }) {
return new Promise((resolve) => {
let answered = false;
openSheet({
title,
rightLabel: confirmLabel,
onLeft: (api) => { answered = true; api.close(); resolve(null); },
onRight: (api) => {
const v = body.querySelector('input')?.value ?? '';
answered = true;
api.close();
resolve(v);
},
onClose: () => { if (!answered) resolve(null); },
render: (body) => {
body.innerHTML = `
${message ? `<div class="px16 mb16 small muted pre">${esc(message)}</div>` : ''}
<div class="card" style="margin:0 16px 16px">
<div class="field">
<input type="${esc(inputType)}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false">
${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
</div>
</div>`;
const input = body.querySelector('input');
setTimeout(() => input && input.focus(), 320);
input.addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
answered = true;
const v = input.value;
resolve(v);
document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
}
});
},
});
});
}





function monthLabelShort(monthKey) {
const [y, m] = monthKey.split('-');
const now = new Date();
if (Number(y) === now.getFullYear()) return `${Number(m)}月`;
return `${y}年${Number(m)}月`;
}

function pickMonth(months, current, onPick) {
let year = Number((current || months[0] || '2026-01').split('-')[0]);

openSheet({
title: '选择月份',
leftLabel: '关闭',
render: (body, api) => {
function draw() {
const years = [...new Set(months.map((m) => Number(m.split('-')[0])))].sort((a, b) => b - a);
if (!years.includes(year)) year = years[0];

const ofYear = months.filter((m) => Number(m.split('-')[0]) === year);

body.innerHTML = `
<div class="seg" style="margin:8px 16px 12px">
${years.map((y) => `<button type="button" data-year="${y}" class="${y === year ? 'active' : ''}">${y}</button>`).join('')}
</div>
<div class="month-grid">
${ofYear.map((m) => {
const mm = Number(m.split('-')[1]);
const has = true;
return `<button type="button" data-month="${esc(m)}" class="${m === current ? 'active' : ''}">${mm}月</button>`;
}).join('')}
</div>
`;
}

draw();

body.addEventListener('click', (ev) => {
const yBtn = ev.target.closest('[data-year]');
if (yBtn) { year = Number(yBtn.dataset.year); draw(); return; }
const mBtn = ev.target.closest('[data-month]');
if (mBtn) {
api.close();
onPick(mBtn.dataset.month);
}
});
},
});
}

/* ------------------------------------------------------------------ *
* 金额格式化（界面统一入口）
* ------------------------------------------------------------------ */

function fmtMoney(cents, opts) {
const { sign = false, compact = false, decimals = 2 } = opts || {};
const v = Math.round(cents) / 100;
const abs = Math.abs(v);
let body;
if (compact && abs >= 1000000) body = (abs / 10000).toFixed(0) + '万';
else if (compact && abs >= 10000) body = (abs / 10000).toFixed(abs >= 100000 ? 0 : 1) + '万';
else body = abs.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const neg = v < 0;
const head = sign ? (neg ? '-¥' : '+¥') : (neg ? '-¥' : '¥');
return head + body;
}

function fmtSigned(cents) {
return fmtMoney(cents, { sign: true });
}


function fmtDayLabel(ts) {
const d = new Date(ts);
const now = new Date();
const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
if (diff === 0) return '今天';
if (diff === 1) return '昨天';
if (diff === 2) return '前天';
if (diff > 2 && diff < 7) return `${diff}天前`;
const p = (n) => String(n).padStart(2, '0');
const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
return `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
}

function fmtTime(ts) {
const d = new Date(ts);
return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(ts) {
const d = new Date(ts);
const p = (n) => String(n).padStart(2, '0');
return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtFileSize(bytes) {
if (!bytes) return '0 B';
const units = ['B', 'KB', 'MB', 'GB'];
let i = 0;
let v = bytes;
while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
    return { $, $$, esc, el, delegate, toast, toastOk, toastErr, toastWarn, openSheet, confirmSheet, promptSheet, monthLabelShort, pickMonth, fmtMoney, fmtSigned, fmtDayLabel, fmtTime, fmtDate, fmtFileSize };
  };

  /* ---------- src/core/recurring.js ---------- */
  __mods["src/core/recurring.js"] = function (__rmod) {
    var { makeTx, newId, monthRange, ym, daysInMonth } = __rmod("src/core/model.js");









const FREQUENCIES = [
{ id: 'monthly', name: '每月' },
{ id: 'quarterly', name: '每季' },
{ id: 'yearly', name: '每年' },
{ id: 'weekly', name: '每周' },
];

function makeRecurring(patch = {}) {
return {
id: patch.id || newId('r'),
name: patch.name || '',
amountCents: Math.abs(patch.amountCents || 0),
category: patch.category || 'subs',
type: patch.type || 'expense',
source: patch.source || 'recurring',
note: patch.note || '',
frequency: patch.frequency || 'monthly',

dayOfMonth: patch.dayOfMonth || 1,

weekday: patch.weekday ?? null,
monthOfYear: patch.monthOfYear ?? null,

startMonth: patch.startMonth || ym(new Date()),

endMonth: patch.endMonth || '',

lastGeneratedMonth: patch.lastGeneratedMonth || '',
enabled: patch.enabled !== false,
createdAt: patch.createdAt || Date.now(),
updatedAt: patch.updatedAt || Date.now(),
};
}





function occurrenceInMonth(rule, monthKey) {
const [y, m] = monthKey.split('-').map(Number);
const totalDays = daysInMonth(monthKey);

if (rule.frequency === 'yearly') {
const mo = rule.monthOfYear || Number((rule.startMonth || monthKey).split('-')[1]);
if (mo !== m) return null;
const d = Math.min(rule.dayOfMonth || 1, totalDays);
return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

if (rule.frequency === 'quarterly') {
const startMo = Number((rule.startMonth || monthKey).split('-')[1]);
const diff = (m - startMo + 12) % 12;
if (diff % 3 !== 0) return null;
const d = Math.min(rule.dayOfMonth || 1, totalDays);
return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

if (rule.frequency === 'weekly') {
const day = Math.min(rule.dayOfMonth || 1, totalDays);
return new Date(y, m - 1, day, 12, 0, 0).getTime();
}


const day = Math.min(rule.dayOfMonth || 1, totalDays);
return new Date(y, m - 1, day, 12, 0, 0).getTime();
}









function generateRecurring(rules, upToMonth, existingTxs = []) {
const out = [];
const existingKeys = new Set();

for (const t of existingTxs) {
existingKeys.add(`${t.recurringId || ''}|${ym(t.ts)}|${t.amountCents}`);
existingKeys.add(`fp|${t.source}|${ym(t.ts)}|${t.amountCents}|${t.merchant}`);
}

for (const rule of rules) {
if (!rule || rule.enabled === false) continue;

const start = rule.lastGeneratedMonth
? nextMonthKey(rule.lastGeneratedMonth)
: (rule.startMonth || upToMonth);

if (start > upToMonth) continue;
if (rule.endMonth && start > rule.endMonth) continue;

let cursor = start;
let guard = 0;
while (cursor <= upToMonth && guard++ < 240) {
if (rule.endMonth && cursor > rule.endMonth) break;
const ts = occurrenceInMonth(rule, cursor);
if (ts) {
const key = `${rule.id}|${cursor}|${rule.amountCents}`;
const fpKey = `fp|recurring|${cursor}|${rule.amountCents}|${rule.name}`;
if (!existingKeys.has(key) && !existingKeys.has(fpKey)) {
const tx = makeTx({
ts,
amountCents: rule.amountCents,
type: rule.type,
category: rule.category,
merchant: rule.name,
description: rule.note || `周期账单（${frequencyName(rule.frequency)}）`,
source: 'recurring',
});
tx.recurringId = rule.id;
out.push(tx);
}
}
cursor = nextMonthKey(cursor);
}
}

return out;
}

function frequencyName(f) {
const hit = FREQUENCIES.find((x) => x.id === f);
return hit ? hit.name : f;
}

function nextMonthKey(monthKey) {
const [y, m] = monthKey.split('-').map(Number);
const d = new Date(y, m, 1);
return ym(d);
}


function yearlyRecurringTotal(rules) {
let total = 0;
for (const r of rules) {
if (r.enabled === false) continue;
const mult = r.frequency === 'yearly' ? 1 : r.frequency === 'quarterly' ? 4 : r.frequency === 'weekly' ? 52 : 12;
total += r.amountCents * mult;
}
return total;
}
    return { FREQUENCIES, makeRecurring, occurrenceInMonth, generateRecurring, yearlyRecurringTotal };
  };

  /* ---------- src/core/categories.js ---------- */
  __mods["src/core/categories.js"] = function (__rmod) {
    var { setCustomCategories, setCustomIncomeCategories, BUILTIN_CATEGORIES, BUILTIN_INCOME_CATEGORIES, CATEGORIES, INCOME_CATEGORIES, newCategoryId, isCustomCategory, CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES } = __rmod("src/core/model.js");
    var { cleanText } = __rmod("src/core/util.js");
    var db = __rmod("src/core/db.js");














const KEY_EXPENSE = 'customCategories';
const KEY_INCOME = 'customIncomeCategories';





async function loadCustomCategories() {
const [expense, income] = await Promise.all([
db.getSetting(KEY_EXPENSE, []),
db.getSetting(KEY_INCOME, []),
]);
setCustomCategories(expense || []);
setCustomIncomeCategories(income || []);
return {
expense: CATEGORIES.filter((c) => !c.builtin).length,
income: INCOME_CATEGORIES.filter((c) => !c.builtin).length,
};
}


function listCustom(lane = 'expense') {
const arr = lane === 'income' ? INCOME_CATEGORIES : CATEGORIES;
return arr.filter((c) => !c.builtin).map((c) => ({ ...c }));
}


function listAll(lane = 'expense') {
const arr = lane === 'income' ? INCOME_CATEGORIES : CATEGORIES;
return arr.map((c) => ({ ...c }));
}










async function addCategory(input) {
const lane = input.lane === 'income' ? 'income' : 'expense';
const name = cleanText(input.name);

if (!name) throw new Error('请填分类名称');
if (name.length > 12) throw new Error('分类名称最多 12 个字');

const all = listAll(lane);
if (all.some((c) => c.name === name)) {
throw new Error(`已经有叫「${name}」的分类了`);
}

const cat = {
id: newCategoryId(name),
name,
icon: input.icon || '🏷️',
color: input.color || '#8E8E93',
createdAt: Date.now(),
builtin: false,
};

const next = [...listCustom(lane), cat];
await persist(lane, next);
return cat;
}




async function updateCategory(id, patch, lane = 'expense') {
if (!isCustomCategory(id) && !listCustom(lane).some((c) => c.id === id)) {
throw new Error('内置分类不能修改');
}
const list = listCustom(lane);
const idx = list.findIndex((c) => c.id === id);
if (idx < 0) throw new Error('找不到这个分类');

const name = patch.name != null ? cleanText(patch.name) : list[idx].name;
if (!name) throw new Error('请填分类名称');
if (name.length > 12) throw new Error('分类名称最多 12 个字');

const all = listAll(lane);
if (all.some((c) => c.id !== id && c.name === name)) {
throw new Error(`已经有叫「${name}」的分类了`);
}

list[idx] = {
...list[idx],
name,
icon: patch.icon != null ? patch.icon : list[idx].icon,
color: patch.color != null ? patch.color : list[idx].color,
};
await persist(lane, list);
return list[idx];
}










async function deleteCategory(id, lane = 'expense') {
if (!listCustom(lane).some((c) => c.id === id)) {
throw new Error('内置分类不能删除');
}

const fallback = lane === 'income' ? 'other_in' : 'other';


const all = await db.allTx();
const affected = all.filter((t) => t.category === id);
for (const t of affected) {
t.category = fallback;
t.updatedAt = Date.now();
}
if (affected.length) await db.putTxMany(affected);


const rules = await db.allRules();
const deadRules = rules.filter((r) => r.category === id);
for (const r of deadRules) await db.deleteRule(r.key);

const next = listCustom(lane).filter((c) => c.id !== id);
await persist(lane, next);

return { movedTx: affected.length, removedRules: deadRules.length };
}


async function resetCategories(lane = 'expense') {
const custom = listCustom(lane);
if (!custom.length) return { movedTx: 0, removed: 0 };

const fallback = lane === 'income' ? 'other_in' : 'other';
const ids = new Set(custom.map((c) => c.id));

const all = await db.allTx();
const affected = all.filter((t) => ids.has(t.category));
for (const t of affected) {
t.category = fallback;
t.updatedAt = Date.now();
}
if (affected.length) await db.putTxMany(affected);

const rules = await db.allRules();
const deadRules = rules.filter((r) => ids.has(r.category));
for (const r of deadRules) await db.deleteRule(r.key);

await persist(lane, []);
return { movedTx: affected.length, removed: custom.length, removedRules: deadRules.length };
}





async function persist(lane, customList) {
const key = lane === 'income' ? KEY_INCOME : KEY_EXPENSE;
const clean = customList.map((c) => ({
id: c.id,
name: c.name,
icon: c.icon,
color: c.color,
createdAt: c.createdAt || Date.now(),
}));
await db.setSetting(key, clean);


if (lane === 'income') setCustomIncomeCategories(clean);
else setCustomCategories(clean);

return clean;
}


async function countTxInCategory(id) {
const all = await db.allTx();
return all.filter((t) => t.category === id && !t.duplicateOf).length;
}
    return { CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES, BUILTIN_CATEGORIES, BUILTIN_INCOME_CATEGORIES, loadCustomCategories, listCustom, listAll, addCategory, updateCategory, deleteCategory, resetCategories, countTxInCategory };
  };

  /* ---------- src/ui/store.js ---------- */
  __mods["src/ui/store.js"] = function (__rmod) {
    var { ym, shiftMonth, prevMonth } = __rmod("src/core/model.js");
    var { generateRecurring } = __rmod("src/core/recurring.js");
    var { defaultBudget } = __rmod("src/core/budget.js");
    var { availableMonths } = __rmod("src/core/stats.js");
    var { loadCustomCategories } = __rmod("src/core/categories.js");
    var db = __rmod("src/core/db.js");















const state = {
ready: false,

txs: [],
rules: [],
budgets: {},
recurring: [],
batches: [],
settings: {},

savingsSettings: null,

month: ym(new Date()),
tab: 'home',
statsRange: 'month',

reportYear: '',

detail: {
query: '',
type: 'all',
category: 'all',
source: 'all',
},

storage: { persisted: false, supported: false, usage: 0, quota: 0 },









offlineCheck: 'pending',
offlineError: '',

appVersion: '',

swRegistration: null,
showDuplicates: false,
};





const listeners = new Set();

function subscribe(fn) {
listeners.add(fn);
return () => listeners.delete(fn);
}

let pending = null;
function notify(force = false) {
if (pending && !force) return;
pending = requestAnimationFrame(() => {
pending = null;
for (const fn of listeners) {
try { fn(); } catch (e) { console.error('[轻账] 渲染出错', e); }
}
});
}





async function init() {
await reloadAll();


if (state.settings.installed === undefined) {
state.settings.installed = true;
await db.setSetting('installed', true);
await db.setSetting('installedAt', Date.now());
}


const p = await db.requestPersistence();
state.storage.persisted = p.persisted;
state.storage.supported = p.supported;


await runRecurring();

state.ready = true;
notify(true);
}

async function reloadAll() {


await loadCustomCategories();

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


state.budgets = state.settings.budgets && typeof state.settings.budgets === 'object'
? state.settings.budgets
: {};


const months = availableMonths(state.txs);
if (months.length && !months.includes(state.month)) {
const hasCurrent = state.txs.some((t) => ym(t.ts) === state.month);
if (!hasCurrent) state.month = months[0];
}

await refreshStorageEstimate();
}

async function refreshStorageEstimate() {
const est = await db.storageEstimate();
if (est) {
state.storage.usage = est.usage;
state.storage.quota = est.quota;
}
}





async function runRecurring() {
if (!state.recurring.length) return 0;
const upTo = ym(new Date());
const generated = generateRecurring(state.recurring, upTo, state.txs);
if (!generated.length) return 0;

await db.putTxMany(generated);
state.txs = state.txs.concat(generated);


const touched = new Set(generated.map((t) => t.recurringId));
for (const rule of state.recurring) {
if (!touched.has(rule.id)) continue;
rule.lastGeneratedMonth = upTo;
rule.updatedAt = Date.now();
await db.putRecurring(rule);
}
return generated.length;
}





async function addTx(tx) {
await db.putTx(tx);
state.txs.push(tx);
afterDataChange();
return tx;
}

async function addTxMany(txs) {
await db.putTxMany(txs);
state.txs = state.txs.concat(txs);
afterDataChange();
return txs.length;
}

async function updateTx(patch) {
const idx = state.txs.findIndex((t) => t.id === patch.id);
if (idx < 0) throw new Error('找不到这笔交易');
const merged = { ...state.txs[idx], ...patch, updatedAt: Date.now() };
await db.putTx(merged);
state.txs[idx] = merged;
afterDataChange();
return merged;
}

async function removeTx(id) {
await db.deleteTx(id);
state.txs = state.txs.filter((t) => t.id !== id);
afterDataChange();
}

async function removeTxMany(ids) {
await db.deleteTxMany(ids);
const set = new Set(ids);
state.txs = state.txs.filter((t) => !set.has(t.id));
afterDataChange();
}

function afterDataChange() {
state.txs.sort((a, b) => b.ts - a.ts);
notify();
}





async function setRule(rule) {
await db.putRule(rule);
const i = state.rules.findIndex((r) => r.key === rule.key);
if (i >= 0) state.rules[i] = rule;
else state.rules.push(rule);
notify();
}

async function removeRule(key) {
await db.deleteRule(key);
state.rules = state.rules.filter((r) => r.key !== key);
notify();
}

async function clearRules() {
await db.clearRules();
state.rules = [];
notify();
}

function ruleMap() {
const m = new Map();
for (const r of state.rules) if (r && r.key) m.set(r.key, r.category);
return m;
}





async function setSetting(key, value) {
await db.setSetting(key, value);
state.settings[key] = value;
notify();
}





function budgetFor(monthKey) {
const isDefault = !monthKey || monthKey === '__default';
const key = isDefault ? '__default' : monthKey;
const raw = state.budgets[key] || {};
return { ...defaultBudget(), ...raw };
}


function effectiveBudget(monthKey) {
if (state.budgets[monthKey]) return { ...defaultBudget(), ...state.budgets[monthKey] };
return budgetFor('__default');
}

async function saveBudget(monthKey, budget) {
const key = monthKey || '__default';
state.budgets[key] = { ...budget, updatedAt: Date.now() };
await db.setSetting('budgets', state.budgets);
notify();
}

async function clearBudget(monthKey) {
delete state.budgets[monthKey];
await db.setSetting('budgets', state.budgets);
notify();
}





async function saveRecurring(rule) {
await db.putRecurring(rule);
const i = state.recurring.findIndex((r) => r.id === rule.id);
if (i >= 0) state.recurring[i] = rule;
else state.recurring.push(rule);
notify();
}

async function removeRecurring(id) {
await db.deleteRecurring(id);
state.recurring = state.recurring.filter((r) => r.id !== id);
notify();
}





async function removeBatch(id) {
const ids = state.txs.filter((t) => t.batchId === id).map((t) => t.id);
await db.deleteTxMany(ids);
const set = new Set(ids);
state.txs = state.txs.filter((t) => !set.has(t.id));
await db.deleteBatch(id);
state.batches = state.batches.filter((b) => b.id !== id);
notify();
return ids.length;
}





function monthList(count = 24) {
const months = availableMonths(state.txs);
const base = ym(new Date());
const out = [];

let m = base;
for (let i = 0; i < count; i++) {
out.push(m);
m = prevMonth(m);
}

for (const mm of months) {
if (!out.includes(mm)) out.push(mm);
}
return out.sort().reverse();
}

function setMonth(monthKey) {
state.month = monthKey;
notify(true);
}

function stepMonth(delta) {
state.month = shiftMonth(state.month, delta);
notify(true);
}

function setTab(tab) {
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
    return { state, subscribe, notify, init, reloadAll, refreshStorageEstimate, runRecurring, addTx, addTxMany, updateTx, removeTx, removeTxMany, setRule, removeRule, clearRules, ruleMap, setSetting, budgetFor, effectiveBudget, saveBudget, clearBudget, saveRecurring, removeRecurring, removeBatch, monthList, setMonth, stepMonth, setTab };
  };

  /* ---------- src/ui/screen-home.js ---------- */
  __mods["src/ui/screen-home.js"] = function (__rmod) {
    var { CATEGORIES, category: getCategory, txType, txIcon, txCategoryLabel, money, monthRange, monthLabel, monthLabelFull } = __rmod("src/core/model.js");
    var { overview, categoryBreakdown, comparison, activeTxs, filterMonth } = __rmod("src/core/stats.js");
    var { budgetStatus, budgetAlerts } = __rmod("src/core/budget.js");
    var { computeSavings } = __rmod("src/core/savings.js");
    var { esc, fmtMoney, fmtDate, fmtDayLabel, fmtTime, pickMonth } = __rmod("src/ui/dom.js");
    var store = __rmod("src/ui/store.js");













function renderHome(root) {
const all = store.state.txs;
const month = store.state.month;
const monthTxs = filterMonth(all, month);




const ov = overview(monthTxs, null);
const cmp = comparison(all, month);
const budget = store.effectiveBudget(month);
const bStatus = budgetStatus(all, month, budget);
const alerts = budgetAlerts(all, month, budget);
const { rows: cats, total: catTotal } = categoryBreakdown(monthTxs);


if (!all.length) {
root.innerHTML = `
<div class="empty" style="padding-top:60px">
<div class="big">🪙</div>
<div class="title">欢迎使用轻账</div>
<div class="sub">
数据只存在这台手机上，不联网、不上传。<br>
先用下面的按钮记一笔试试，<br>或者在「我的」里导入微信/支付宝账单。
</div>
</div>
<div class="btn-row" style="padding:0 16px">
<button type="button" class="btn primary" data-act="quick">记一笔</button>
<button type="button" class="btn" data-act="import">导入账单</button>
</div>
<div class="section-title mt16">可以做什么</div>
<div class="card" style="margin:0 16px 16px">
${tipRow('🪙', '开始记账', '先点上面的「记一笔」，输入金额就行', 'quick')}
${tipRow('🏦', '攒钱', '每月把生活费剩下的转进一个账户，攒钱页会帮你盯着', 'savings')}
${tipRow('📄', '导入账单', '微信 / 支付宝的 CSV、ZIP 账单，自动去重', 'import')}
${tipRow('🏷️', '自定义分类', '内置十类之外，可以加「养猫」这种自己的分类', 'categories')}
${tipRow('🎯', '设预算', '定个每月上限，用到 80% 和超支时提醒你', 'budget')}
${tipRow('🔒', '加密备份', '导出的备份带密码，可存到 iCloud Drive', 'backup')}
</div>
<div class="px16 tiny muted" style="padding-bottom:20px">
以上每一项都可以点，会带你到对应的地方。
</div>
`;
return;
}

const monthLabelTxt = monthLabelFull(month);
const deltaHtml = renderDelta(cmp);

root.innerHTML = `
<div class="hero">
<div class="hero-label">${esc(monthLabelTxt)}消费</div>
<div class="hero-value" data-act="toggle-basis" role="button" tabindex="0">${esc(fmtMoney(ov.net))}</div>
${deltaHtml}
</div>

<div class="kpi-grid">
<div class="kpi">
<div class="kpi-label">收入</div>
<div class="kpi-value in">${esc(fmtMoney(ov.income, { decimals: 0, compact: true }))}</div>
</div>
<div class="kpi">
<div class="kpi-label">结余</div>
<div class="kpi-value ${ov.balance >= 0 ? '' : 'red'}">${esc(fmtMoney(ov.balance, { decimals: 0, compact: true }))}</div>
</div>
<div class="kpi">
<div class="kpi-label">日均</div>
<div class="kpi-value">${esc(fmtMoney(ov.avgPerDay, { decimals: 0, compact: true }))}</div>
</div>
</div>

${alerts.length ? alerts.slice(0, 2).map(renderAlert).join('') : ''}

${renderSavingsCard(all, monthTxs)}

${bStatus.hasTotal ? renderBudgetLine(bStatus) : renderBudgetPrompt()}

${cats.length ? renderCategoryCard(cats, catTotal) : ''}

${renderRecent(monthTxs)}

<div class="section-title">其他</div>
<div class="card" style="margin:0 16px 16px">
${quickRow('📄', '导入账单', '微信 / 支付宝', 'import')}
${quickRow('📅', '导入记录', `${store.state.batches.length} 次`, 'batches')}
${quickRow('🎯', '设置预算', bStatus.hasTotal ? '已设置' : '还没设置', 'budget')}
</div>
`;
}





function renderDelta(cmp) {
if (!cmp.prev.net) {
return `<div class="hero-delta flat">${esc(cmp.prevKey.split('-')[1])}月没有数据，无法比较</div>`;
}
const pct = cmp.momPct;
if (pct == null) return '';
const abs = Math.abs(pct);
const up = pct > 0;
const cls = abs < 1 ? 'flat' : (up ? 'up' : 'down');
const arrow = abs < 1 ? '' : (up ? '↑' : '↓');
const word = abs < 1 ? '基本持平' : (up ? '多花了' : '少花了');
return `<div class="hero-delta ${cls}">
${arrow} 比 ${esc(cmp.prevKey.split('-')[1])}月 ${word} ${abs.toFixed(0)}%
<span class="muted">（${esc(fmtMoney(Math.abs(cmp.momDiff), { decimals: 0 }))}）</span>
</div>`;
}

function renderAlert(a) {
const ico = a.level === 'danger' ? '🔴' : '🟡';
return `<div class="alert ${a.level === 'danger' ? 'danger' : 'warn'}">
<span class="ico">${ico}</span>
<div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.detail)}</div></div>
</div>`;
}

function renderBudgetLine(s) {
const pct = Math.min(100, s.percentUsed);
const cls = s.level === 'danger' ? 'danger' : s.level === 'warn' ? 'warn' : '';
return `
<div class="section-title between">
<span>本月预算</span>
<span class="link" data-act="budget">调整</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="budget-line ${cls}" style="padding:0">
<div style="display:flex;justify-content:space-between;align-items:baseline">
<span style="font-size:15px">${esc(fmtMoney(s.spent))} / ${esc(fmtMoney(s.totalCents))}</span>
<span class="small ${s.level === 'danger' ? 'red' : s.level === 'warn' ? 'orange' : 'muted'}">${s.percentUsed.toFixed(0)}%</span>
</div>
<div class="bar"><i style="width:${pct}%"></i></div>
<div class="meta">
<span>${s.remaining >= 0 ? '还剩 ' + fmtMoney(s.remaining) : '已超 ' + fmtMoney(-s.remaining)}</span>
<span>${s.totalDays - s.dayOfMonth > 0 ? '日均可用 ' + fmtMoney(s.dailyAllowance) : '本月已结束'}</span>
</div>
</div>
</div>`;
}


function renderBudgetPrompt() {
return `
<div class="section-title between">
<span>预算</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="row tappable" data-act="budget">
<span class="row-icon">🎯</span>
<span class="row-main">
<span class="row-title">设置预算</span>
<span class="row-sub">定个总数或分类上限，用到 80% 和超支时提醒你</span>
</span>
<span class="row-chev">${chevSvg()}</span>
</div>
</div>`;
}








function renderSavingsCard(all, monthTxs) {
const settings = store.state.savingsSettings;
if (!settings) return '';

let sv;
try {
sv = computeSavings(all, settings);
} catch (e) {
return '';
}

const goal = sv.goal;
const mt = sv.monthlyTarget;


if (!sv.eventCount && !goal && !mt) {
return `
<div class="section-title between">
<span>攒钱</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="row tappable" data-act="savings">
<span class="row-icon">🏦</span>
<span class="row-main">
<span class="row-title">开始攒钱</span>
<span class="row-sub">每月把生活费剩下的转进一个账户，这里会帮你盯着</span>
</span>
<span class="row-chev">${chevSvg()}</span>
</div>
</div>`;
}


let mainLabel = '一共产下';
let mainValue = sv.balance;
let sub = '';

if (goal && !goal.done) {
mainLabel = goal.label ? `离「${goal.label}」还差` : '离攒钱目标还差';
mainValue = goal.remaining;
sub = `已攒 ${fmtMoney(goal.saved)} / 目标 ${fmtMoney(goal.target, { decimals: 0 })}`;
} else if (goal && goal.done) {
mainLabel = goal.label ? `「${goal.label}」已达成 🎉` : '攒钱目标已达成 🎉';
mainValue = sv.balance;
sub = `目标 ${fmtMoney(goal.target, { decimals: 0 })}`;
} else {
sub = sv.eventCount ? `共 ${sv.eventCount} 笔攒钱记录` : '还没有攒钱记录';
}

const pct = goal ? Math.min(100, goal.percent) : 0;

return `
<div class="section-title between">
<span>攒钱</span>
<span class="link" data-act="savings">查看明细</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="row tappable" data-act="savings" style="align-items:flex-start">
<span class="row-icon">🏦</span>
<span class="row-main">
<span class="row-title">${esc(mainLabel)}</span>
<span class="row-sub">${esc(sub)}</span>
</span>
<span class="row-value" style="align-self:flex-start;margin-top:2px;color:var(--green);font-size:19px;font-weight:700">${esc(fmtMoney(mainValue))}</span>
</div>
${goal ? `
<div style="padding:0 16px 14px">
<div class="bar" style="height:8px;border-radius:4px;background:var(--fill);overflow:hidden">
<i style="display:block;height:100%;border-radius:4px;width:${pct}%;background:var(--green)"></i>
</div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--label-2);margin-top:5px">
<span>${pct.toFixed(0)}%</span>
<span>${esc(fmtMoney(sv.balance, { decimals: 0 }))} / ${esc(fmtMoney(goal.target, { decimals: 0 }))}</span>
</div>
</div>` : ''}
${sv.pendingTotal > 0 ? `
<div class="row tappable" data-act="savings" style="border-top:0.5px solid var(--separator)">
<span class="row-icon" style="background:rgba(255,159,10,0.16)">💡</span>
<span class="row-main">
<span class="row-title" style="color:var(--orange)">有 ${esc(fmtMoney(sv.pendingTotal, { decimals: 0 }))} 该攒没转走</span>
<span class="row-sub">结余里没变成实际存款的部分，点进去可以转</span>
</span>
</div>` : ''}
${!goal && !mt ? `
<div class="row tappable" data-act="savings-goal" style="border-top:0.5px solid var(--separator)">
<span class="row-icon">🎯</span>
<span class="row-main">
<span class="row-title">设一个攒钱目标</span>
<span class="row-sub">看着进度条一点点满，比单纯记数字有动力</span>
</span>
</div>` : ''}
</div>`;
}

function renderCategoryCard(cats, total) {
const top = cats.slice(0, 6);
const rest = cats.slice(6);
const restSum = rest.reduce((s, r) => s + r.netCents, 0);

const legend = top.map((c) => `
<div class="legend-item">
<span class="legend-dot" style="background:${c.color}"></span>
<span class="legend-name">${esc(c.name)}</span>
<span class="legend-pct">${c.percent.toFixed(1)}%</span>
<span class="legend-amt">${esc(fmtMoney(c.netCents, { decimals: 0 }))}</span>
</div>`).join('');

const restLegend = restSum > 0 ? `
<div class="legend-item">
<span class="legend-dot" style="background:var(--gray)"></span>
<span class="legend-name">其他 ${rest.length} 类</span>
<span class="legend-pct">${((restSum / (total || 1)) * 100).toFixed(1)}%</span>
<span class="legend-amt">${esc(fmtMoney(restSum, { decimals: 0 }))}</span>
</div>` : '';

return `
<div class="section-title between">
<span>消费比例</span>
<span class="link" data-act="stats">详细统计</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="donut-wrap">
<div class="donut-box">${donutSvg(top, total)}</div>
<div class="legend">${legend}${restLegend}</div>
</div>
</div>`;
}

/**
* 简易环形图（内联 SVG，不依赖外部库）
* 用 stroke-dasharray 画弧，最简单也最稳。
*/
function donutSvg(items, total) {
const size = 150;
const thickness = 20;
const r = (size - thickness) / 2 - 2;
const cx = size / 2;
const cy = size / 2;
const circumference = 2 * Math.PI * r;

if (!total || total <= 0) {
return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--separator)" stroke-width="${thickness}"/>
<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="11" fill="var(--label-2)">本月</text>
<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="15" font-weight="600" fill="var(--label)">暂无支出</text>
</svg>`;
}

const gapDeg = 1.6;
let acc = 0;
let segs = '';
for (const it of items) {
const frac = it.netCents / total;
if (frac <= 0) continue;
const len = Math.max(0, frac * circumference - (circumference * gapDeg) / 360);
const offset = -acc * circumference;
segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
stroke="${it.color}" stroke-width="${thickness}"
stroke-dasharray="${len.toFixed(2)} ${(circumference - len).toFixed(2)}"
stroke-dashoffset="${offset.toFixed(2)}"
transform="rotate(-90 ${cx} ${cy})">
<title>${esc(it.name)} ${it.percent.toFixed(1)}% ${fmtMoney(it.netCents)}</title>
</circle>`;
acc += frac;
}

return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block" role="img" aria-label="消费分类占比">
${segs}
<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="10.5" fill="var(--label-2)">合计</text>
<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--label)">${esc(fmtMoney(total, { decimals: 0, compact: true }).replace('¥', '¥'))}</text>
</svg>`;
}

function renderRecent(monthTxs) {
const recent = activeTxs(monthTxs).slice().sort((a, b) => b.ts - a.ts).slice(0, 6);
if (!recent.length) {
return `<div class="section-title">最近交易</div>
<div class="card" style="margin:0 16px 16px"><div class="empty" style="padding:28px">
<div class="sub">这个月还没有交易</div>
</div></div>`;
}
return `
<div class="section-title between">
<span>最近交易</span>
<span class="link" data-act="tab-detail">全部 ${activeTxs(monthTxs).length} 笔</span>
</div>
<div class="card tx-list" style="margin:0 16px 16px">
${recent.map(txRow).join('')}
</div>`;
}

function txRow(t) {
const icon = txIcon(t);
const catLabel = txCategoryLabel(t);
const tt = txType(t.type);
const isIn = tt.direction === 'in';
const subParts = [fmtTime(t.ts), catLabel];
if (t.source === 'wechat') subParts.push('微信');
else if (t.source === 'alipay') subParts.push('支付宝');
if (t.duplicateOf) subParts.push('重复');

return `<div class="row tappable" data-tx="${esc(t.id)}">
<span class="row-icon">${icon}</span>
<span class="row-main">
<span class="row-title">${esc(t.merchant || '未记录商户')}</span>
<span class="row-sub">${esc(subParts.join(' · '))}${t.description && t.description !== t.merchant ? ' · ' + esc(t.description.slice(0, 16)) : ''}</span>
</span>
<span class="row-value ${isIn ? 'in' : ''}${t.duplicateOf ? ' muted' : ''}">${isIn ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</span>
</div>`;
}

/**
* 空状态里的引导行。
*
* 这些行**必须真的能点**（带 data-act），否则就是一个假按钮 ——
* 用户会以为 App 坏了。早先这里写成了纯展示的 featureRow，
* 结果用户点了一圈都没反应，来问「为什么点了没用」。
*/
function tipRow(icon, title, sub, act) {
return `<div class="row tappable" data-act="${esc(act)}">
<span class="row-icon">${icon}</span>
<span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span>
<span class="row-chev">${chevSvg()}</span>
</div>`;
}

function quickRow(icon, title, sub, act) {
return `<div class="row tappable" data-act="${esc(act)}">
<span class="row-icon">${icon}</span>
<span class="row-main"><span class="row-title">${esc(title)}</span></span>
<span class="row-value muted small">${esc(sub)}</span>
<span class="row-chev">${chevSvg()}</span>
</div>`;
}

function chevSvg() {
return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
    return { renderHome, txRow };
  };

  /* ---------- src/core/classify.js ---------- */
  __mods["src/core/classify.js"] = function (__rmod) {
    var { normalizeMerchant, containsAny, cleanText } = __rmod("src/core/util.js");


















const BUILTIN = [

{ cat: 'medical', kw: ['医院', '药房', '药店', '大药房', '买药', '医药', '诊所', '门诊', '挂号', '体检', '口腔', '牙科', '眼科', '卫生院', '卫生服务', '疾控', '医疗', '健康科技', '京东健康', '阿里健康', '叮当快药', '同仁堂', '国大药房', '益丰', '老百姓大药房', '海王星辰'] },


{ cat: 'education', kw: ['学费', '学杂费', '培训', '教育', '网校', '课程', '驾校', '考试', '报名费', '书店', '图书', '文具', '得到', '樊登', '新东方', '学而思', '猿辅导', '中国大学', '知网', '超星', '校园卡', '宿舍费', '教材'] },


{ cat: 'subs', kw: ['自动续费', '连续包月', '连续包年', '会员服务', '订阅', 'icloud', 'apple.com/bill', 'apple music', 'app store', 'netflix', 'spotify', '爱奇艺', '腾讯视频', '优酷', '芒果tv', '哔哩哔哩大会员', 'b站大会员', '网易云音乐', 'qq音乐', '酷狗', '百度网盘', 'wps会员', 'office365', 'chatgpt', 'openai', 'claude', '夸克会员', '迅雷会员', 'steam 充值', 'google one', 'dropbox'] },


{ cat: 'transport', kw: ['地铁', '轨道交通', '公交', '巴士', '出租', '打车', '滴滴', '高德打车', '曹操出行', 't3出行', '花小猪', '首汽', '享道', '哈啰', '青桔', '美团单车', '共享单车', '单车', '停车', '泊车', '高速', 'etc', '通行费', '加油', '中石化', '中石油', '壳牌', '充电桩', '特来电', '星星充电', '火车票', '12306', '高铁', '动车', '机票', '航空', '航旅', '春秋航空', '东方航空', '南方航空', '机场', '长途汽车', '轮渡', '船票', '违章', '车管所', '年检', '车险', '摩托车', '电动车充电'] },


{ cat: 'food', kw: ['餐饮', '饭店', '餐厅', 'food', '美团外卖', '饿了么', '外卖', '快餐', '汉堡', '麦当劳', 'mcdonald', '肯德基', 'kfc', '必胜客', 'pizza', '星巴克', 'starbucks', '瑞幸', 'luckin', '库迪', '咖啡', '奶茶', '喜茶', '奈雪', '蜜雪冰城', '茶百道', '古茗', '沪上阿姨', '霸王茶姬', '一点点', 'coco', '书亦', '便利店', '罗森', 'lawson', '全家', 'family', '711', '7-11', '便利蜂', '美宜佳', '超市', '生鲜', '菜市场', '菜场', '食堂', '小笼包', '面馆', '拉面', '米线', '火锅', '烧烤', '烤肉', '自助餐', '小吃', '早餐', '豆浆', '煎饼', '沙县', '黄焖鸡', '麻辣烫', '螺蛳粉', '料理', '寿司', '日料', '韩餐', '西餐', '酒馆', '酒吧', '烘焙', '面包', '蛋糕', '水果', '酸奶', '零食', '盒马', '山姆', '永辉', '大润发', '沃尔玛', '家乐福', '叮咚买菜', '每日优鲜', '朴朴', '钱大妈', '美团买菜', '小象超市'] },


{ cat: 'housing', kw: ['房租', '租金', '住房', '物业', '物业管理', '水费', '电费', '燃气', '煤气', '天然气', '供暖', '取暖', '宽带', '电信', '联通', '移动通信', '中国移动', '中国联通', '中国电信', '话费', '充值话费', '家政', '保洁', '搬家', '中介费', '链家', '贝壳', '自如', '蛋壳', '公寓', '宿舍', '床品', '家居', '宜家', 'ikea', '家具', '装修', '建材', '五金', '垃圾处理', '公摊'] },


{ cat: 'fun', kw: ['电影', '影院', '影城', '万达', 'cgv', '横店', 'ktv', '唱歌', '桌游', '剧本杀', '密室', '电玩', '游戏', 'steam', 'epic', 'playstation', 'psn', 'switch', '任天堂', '米哈游', '原神', '网易游戏', '腾讯游戏', '王者荣耀', '充值点券', '点券', '演出', '演唱会', '话剧', 'livehouse', '展览', '美术馆', '博物馆', '景区', '门票', '公园', '游乐园', '迪士尼', '环球影城', '海洋馆', '动物园', '旅游', '携程', '去哪儿', '飞猪', '马蜂窝', 'airbnb', '民宿', '酒店', '宾馆', '旅店', '露营', '滑雪', '游泳', '健身房', '健身', '瑜伽', '球馆', '羽毛球', '篮球', '桌球', '按摩', '足疗', 'spa', '美容', '美发', '理发', '美甲', '宠物', '猫舍', '狗粮', '花店', '鲜花', '彩票', '烟', '酒'] },


{ cat: 'shopping', kw: ['淘宝', '天猫', 'taobao', 'tmall', '京东', 'jd.com', '拼多多', '唯品会', '苏宁', '国美', '当当', '小红书', '抖音商城', '快手小店', '微店', '闲鱼', '转转', '得物', '奥特莱斯', '商场', '百货', '优衣库', 'uniqlo', 'zara', 'h&m', '无印良品', 'muji', '名创优品', 'nike', '耐克', 'adidas', '阿迪', '李宁', '安踏', '服饰', '服装', '鞋', '箱包', '数码', '手机', '电脑', '笔记本', '耳机', '键盘', '鼠标', '显示器', '相机', '苹果', 'apple store', '小米', '华为', 'oppo', 'vivo', '荣耀', '三星', '家电', '电器', '厨具', '日用品', '化妆品', '护肤', '彩妆', '丝芙兰', '屈臣氏', '口红', '香水', '母婴', '奶粉', '纸尿裤', '玩具', '模型', '手办', '谷子', '文具店', '快递', '邮费', '运费', '聚划算', '百亿补贴'] },


{ cat: 'gift', kw: ['红包', '礼金', '随礼', '份子', '压岁钱', '生日礼物', '礼物', '代付', '垫付', '转账给', '亲属卡', '人情'] },
];


const TRANSFER_HINTS = [
'转账', '转入', '转出', '提现', '充值', '零钱通', '余额宝', '余利宝',
'银行转入', '银行转出', '还款', '信用卡还款', '花呗', '借呗', '网商贷',
'备用金', '资金归集', '内部',
];

const REPAY_HINTS = ['还款', '信用卡还款', '花呗', '借呗', '分期', '偿还', '贷款还款', '车贷', '房贷还款'];


const INVALID_HINTS = ['已退款', '退款成功', '已全额退款', '交易关闭', '已关闭', '失败', '已撤销', '取消', '未支付', '已失效', '解冻'];













function classify(input, rules) {
const merchant = cleanText(input.merchant);
const description = cleanText(input.description);
const rawType = cleanText(input.rawType);


const ruleMap = toRuleMap(rules);
if (ruleMap.size) {
const candidates = [merchant];
const norm = normalizeMerchant(merchant);
if (norm) candidates.push(norm);

for (const c of candidates) {
const hit = ruleMap.get(c);
if (hit) return { category: hit, matchedBy: 'rule', matchedKey: c };
}


if (norm) {
for (const [key, cat] of ruleMap) {
if (!key) continue;
if (norm.includes(key) || key.includes(norm)) {
return { category: cat, matchedBy: 'rule-fuzzy', matchedKey: key };
}
}
}
}


const haystacks = [
{ text: merchant, weight: 3 },
{ text: description, weight: 2 },
{ text: rawType, weight: 1 },
].filter((h) => h.text);

let best = null;
for (const rule of BUILTIN) {
for (const h of haystacks) {
if (containsAny(h.text, rule.kw)) {
const score = h.weight;
if (!best || score > best.score) {
best = { category: rule.cat, score, matchedBy: 'builtin', matchedKey: rule.kw.find((k) => h.text.toLowerCase().includes(k.toLowerCase())) };
}
break;
}
}
if (best && best.score === 3) break;
}
if (best) return { category: best.category, matchedBy: best.matchedBy, matchedKey: best.matchedKey };


return { category: 'other', matchedBy: 'default' };
}

function toRuleMap(rules) {
if (!rules) return new Map();
if (rules instanceof Map) return rules;
if (Array.isArray(rules)) {
const m = new Map();
for (const r of rules) if (r && r.key) m.set(r.key, r.category);
return m;
}
return new Map(Object.entries(rules));
}

















function detectType(input, selfNames = []) {
const rawType = cleanText(input.rawType);
const merchant = cleanText(input.merchant);
const description = cleanText(input.description);
const dir = input.direction || 'out';
const all = `${rawType} ${merchant} ${description}`;


if (/退款|退货|退费|返现|冲正|已退/.test(all)) return 'refund';


if (containsAny(all, REPAY_HINTS)) return 'repay';


if (/红包/.test(all)) {
if (dir === 'in') return 'redpacket';

return 'expense';
}


const looksLikeTransfer = containsAny(all, TRANSFER_HINTS);
if (looksLikeTransfer) {
if (isSelfTransfer(merchant, description, selfNames)) return 'transfer';

if (/信用卡|花呗|借呗|贷款/.test(all) && /还款|偿还/.test(all)) return 'repay';

if (/提现|充值|零钱通|余额宝|余利宝|资金归集/.test(all) && dir === 'none') return 'transfer';



if (dir === 'none') return 'transfer';
if (/转账/.test(rawType)) {

return dir === 'in' ? 'income' : 'expense';
}
}



if (dir === 'none') return 'transfer';

if (dir === 'in') return 'income';
return 'expense';
}






function isSelfTransfer(merchant, description, selfNames = []) {
const text = `${merchant} ${description}`.toLowerCase();
if (!text.trim()) return false;

for (const name of selfNames) {
const n = cleanText(name).toLowerCase();
if (!n) continue;
if (n.length >= 2 && text.includes(n)) return true;
}


if (/提现到|转入银行|转出到银行|银行卡充值|还款至|自动还款|零钱通(转入|转出)|余额宝(转入|转出)|余利宝/.test(text)) {
return true;
}

return false;
}




function shouldSkipRow(row, getField) {
const status = cleanText(getField(row, ['当前状态', '状态', '交易状态', '订单状态']) || '');
if (!status) return false;


if (/已退款|退款成功|已全额退款|交易关闭|已关闭|失败|已撤销|交易已取消|未支付|已失效/.test(status)) return true;
return false;
}











function learnRule(merchant, category) {
const clean = cleanText(merchant);
if (!clean || clean.length < 2) return null;

if (/^[\d\s\W]+$/.test(clean)) return null;
return {
key: normalizeMerchant(clean) || clean.toLowerCase(),
category,
merchant: clean,
updatedAt: Date.now(),
};
}


function ruleSummary(rule) {
return {
key: rule.key,
merchant: rule.merchant || rule.key,
category: rule.category,
updatedAt: rule.updatedAt || 0,
};
}
    return { TRANSFER_HINTS, REPAY_HINTS, INVALID_HINTS, classify, detectType, isSelfTransfer, shouldSkipRow, learnRule, ruleSummary };
  };

  /* ---------- src/ui/sheets.js ---------- */
  __mods["src/ui/sheets.js"] = function (__rmod) {
    var { openSheet, toastOk, toastErr, esc, fmtMoney, fmtDate } = __rmod("src/ui/dom.js");
    var { CATEGORIES, INCOME_CATEGORIES, MANUAL_TYPES, txType, newId, toCents, category: getCategory } = __rmod("src/core/model.js");
    var { classify, learnRule } = __rmod("src/core/classify.js");
    var { normalizeMerchant, cleanText } = __rmod("src/core/util.js");
    var store = __rmod("src/ui/store.js");















const TYPES_FOR_PICKER = [
{ id: 'expense', name: '消费' },
{ id: 'income', name: '收入' },
{ id: 'redpacket', name: '红包' },
{ id: 'transfer', name: '转账' },
{ id: 'repay', name: '还款' },
];












function openQuickEntry(opts = {}) {
const editing = opts.tx || null;

const st = {
type: editing ? editing.type : (opts.type || 'expense'),
amountStr: editing ? centsToInput(editing.amountCents) : (opts.amountCents ? centsToInput(opts.amountCents) : ''),
category: editing ? editing.category : (opts.category || ''),
merchant: editing ? editing.merchant : (opts.merchant || ''),
note: editing ? (editing.note || '') : '',
date: editing ? fmtDate(editing.ts) : (opts.date || fmtDate(Date.now())),
source: editing ? editing.source : 'manual',
account: editing ? (editing.account || '') : '',
recurring: false,
};


if (!st.category && st.merchant) {
const r = classify({ merchant: st.merchant }, store.ruleMap());
st.category = r.category;
}
if (!st.category) st.category = 'food';

let api = null;

api = openSheet({
title: editing ? '编辑' : '记一笔',
leftLabel: '取消',
rightLabel: editing ? '保存' : '完成',

onLeft: (a) => a.close(),
onRight: (a) => { save(a); },
render: (body, sheetApi) => {
body.style.display = 'flex';
body.style.flexDirection = 'column';
body.innerHTML = `
<div class="type-tabs" id="qe-types">
${TYPES_FOR_PICKER.map((t) => `<button type="button" class="type-tab" data-type="${t.id}">${t.name}</button>`).join('')}
</div>

<div class="amount-display" id="qe-amount"></div>

<div class="merchant-row" style="position:relative">
<input id="qe-merchant" type="text" placeholder="商户 / 说明（可选）" autocomplete="off"
autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
<div class="suggest" id="qe-suggest" hidden></div>
</div>

<div class="cat-pick" id="qe-cats"></div>
<button type="button" class="cat-manage" id="qe-manage">
<span>＋</span> 新建 / 管理分类
</button>

<div class="card" style="margin:0 16px 10px">
<div class="field inline">
<label for="qe-date">日期</label>
<input id="qe-date" type="date">
</div>
<div class="field inline">
<label for="qe-account">账户</label>
<input id="qe-account" type="text" placeholder="选填" autocomplete="off">
</div>
<div class="field inline">
<label for="qe-note">备注</label>
<input id="qe-note" type="text" placeholder="选填" autocomplete="off">
</div>
${editing ? '' : `
<div class="field inline">
<label for="qe-recurring">每月固定支出</label>
<span class="switch"><input id="qe-recurring" type="checkbox"><i></i></span>
</div>`}
</div>

<div class="keypad" id="qe-keys" style="margin-top:auto">
<button type="button" class="fn" data-k="7">7</button>
<button type="button" class="fn" data-k="8">8</button>
<button type="button" class="fn" data-k="9">9</button>
<button type="button" class="fn" data-k="del">⌫</button>

<button type="button" class="fn" data-k="4">4</button>
<button type="button" class="fn" data-k="5">5</button>
<button type="button" class="fn" data-k="6">6</button>
<button type="button" class="fn" data-k="c">清空</button>

<button type="button" class="fn" data-k="1">1</button>
<button type="button" class="fn" data-k="2">2</button>
<button type="button" class="fn" data-k="3">3</button>
<button type="button" class="fn" data-k="today">今天</button>

<button type="button" class="fn" data-k=".">.</button>
<button type="button" class="fn" data-k="0">0</button>
<button type="button" class="fn" data-k="00">00</button>
<button type="button" class="ok" data-k="ok">完成</button>
</div>
`;

const amountEl = body.querySelector('#qe-amount');
const catsEl = body.querySelector('#qe-cats');
const merchantEl = body.querySelector('#qe-merchant');
const suggestEl = body.querySelector('#qe-suggest');
const dateEl = body.querySelector('#qe-date');
const accountEl = body.querySelector('#qe-account');
const noteEl = body.querySelector('#qe-note');
const recEl = body.querySelector('#qe-recurring');

merchantEl.value = st.merchant;
dateEl.value = st.date;
accountEl.value = st.account;
noteEl.value = st.note;

/* ---------- 渲染 ---------- */

function renderTypes() {
for (const b of body.querySelectorAll('#qe-types .type-tab')) {
b.classList.toggle('active', b.dataset.type === st.type);
}
}

function renderAmount() {
if (!st.amountStr) {
amountEl.innerHTML = '<span class="placeholder">¥0.00</span>';
return;
}
const cents = toCents(st.amountStr);
amountEl.innerHTML = `<span class="cur">¥</span>${esc((cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
}

function renderCats() {
// 自定义分类（builtin === false）两边都要显示：
// 支出侧的自定义分类要出现在「消费」里，收入侧的出现在「收入」里。
// 这里靠 builtin 标志和列表来源区分，不靠 id 前缀猜。
const list = st.type === 'income' || st.type === 'redpacket'
? INCOME_CATEGORIES
: CATEGORIES;
// 兜底：切换收支类型后，原来的分类可能不在当前列表里，
// 这时候自动落到列表第一项，否则界面上会出现「一个都没选中」的尴尬状态。
if (!list.some((c) => c.id === st.category)) {
st.category = list[0].id;
}
catsEl.innerHTML = list.map((c) => `
<button type="button" data-cat="${c.id}" class="${c.id === st.category ? 'active' : ''}"
${c.color ? `style="--cat-color:${esc(c.color)}"` : ''}>
<span class="e">${c.icon || '•'}</span>${esc(c.name)}
</button>`).join('');
}

function renderSuggest() {
const q = cleanText(merchantEl.value);
if (!q || q.length < 1) { suggestEl.hidden = true; return; }

const seen = new Map();
for (const t of store.state.txs) {
if (!t.merchant) continue;
if (t.duplicateOf) continue;
const key = normalizeMerchant(t.merchant);
if (!key || !key.includes(q.toLowerCase())) continue;
const prev = seen.get(key);
if (prev) { prev.count++; if (t.ts > prev.ts) { prev.ts = t.ts; prev.category = t.category; } }
else seen.set(key, { name: t.merchant, category: t.category, count: 1, ts: t.ts });
}

const rows = [...seen.values()].sort((a, b) => b.count - a.count || b.ts - a.ts).slice(0, 6);
if (!rows.length) { suggestEl.hidden = true; return; }

suggestEl.innerHTML = rows.map((r) => `
<button type="button" data-name="${esc(r.name)}" data-cat="${esc(r.category)}">
${esc(r.name)}
<span class="c">${esc(getCategory(r.category).name)} · ${r.count}笔</span>
</button>`).join('');
suggestEl.hidden = false;
}

function renderAll() {
renderTypes();
renderAmount();
renderCats();
}

renderAll();

/* ---------- 交互 ---------- */

body.querySelector('#qe-types').addEventListener('click', (ev) => {
const b = ev.target.closest('[data-type]');
if (!b) return;
st.type = b.dataset.type;
// 切到收支类型时，把分类重置成该类别的合理默认值
if (st.type === 'income') st.category = 'other_in';
else if (st.type === 'redpacket') st.category = 'redpacket';
else if (st.type === 'transfer' || st.type === 'repay') st.category = 'other';
else if (!CATEGORIES.some((c) => c.id === st.category)) st.category = 'food';
renderAll();
});

catsEl.addEventListener('click', (ev) => {
const b = ev.target.closest('[data-cat]');
if (!b) return;
st.category = b.dataset.cat;
renderCats();
});

merchantEl.addEventListener('input', () => {
renderSuggest();
// 商户名一变，如果用户还没手动点过分类，就重新猜
if (!st.userTouchedCategory) {
const r = classify({ merchant: merchantEl.value }, store.ruleMap());
if (r.category) { st.category = r.category; renderCats(); }
}
});
merchantEl.addEventListener('focus', renderSuggest);
merchantEl.addEventListener('blur', () => {
setTimeout(() => { suggestEl.hidden = true; }, 180);
});

suggestEl.addEventListener('mousedown', (ev) => {
const b = ev.target.closest('[data-name]');
if (!b) return;
ev.preventDefault();
st.merchant = b.dataset.name;
st.category = b.dataset.cat;
merchantEl.value = st.merchant;
suggestEl.hidden = true;
renderCats();
});

// 记录用户是否手动点过分类（点过就不再被自动猜测覆盖）
catsEl.addEventListener('click', () => { st.userTouchedCategory = true; });

// 「新建 / 管理分类」——这个查询必须放在 body.innerHTML 赋值之后，
// 否则拿到 null，按钮点了没反应。
const manageBtn = body.querySelector('#qe-manage');
if (manageBtn) {
manageBtn.addEventListener('click', async () => {
const { openCategoryManager } = await __rmod("src/ui/category-sheets.js");
openCategoryManager();
});
}

dateEl.addEventListener('change', () => { st.date = dateEl.value; });
accountEl.addEventListener('input', () => { st.account = accountEl.value; });
noteEl.addEventListener('input', () => { st.note = noteEl.value; });
if (recEl) recEl.addEventListener('change', () => { st.recurring = recEl.checked; });
recEl && (st.recurring = false);

body.querySelector('#qe-keys').addEventListener('click', (ev) => {
const b = ev.target.closest('[data-k]');
if (!b) return;
pressKey(b.dataset.k);
});

// 物理键盘也能用（电脑上调试方便）
sheetApi.root.addEventListener('keydown', (ev) => {
if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
if (/^[0-9.]$/.test(ev.key)) { pressKey(ev.key); ev.preventDefault(); }
else if (ev.key === 'Backspace') { pressKey('del'); ev.preventDefault(); }
else if (ev.key === 'Enter') { save(sheetApi); }
});

setTimeout(() => {
body.style.transform = 'none';
}, 0);
},
});

/* ---------- 键盘逻辑 ---------- */

function pressKey(k) {
if (k === 'ok') { save(api); return; }
if (k === 'del') { st.amountStr = st.amountStr.slice(0, -1); }
else if (k === 'c') { st.amountStr = ''; }
else if (k === 'today') { st.date = fmtDate(Date.now()); const d = api.body.querySelector('#qe-date'); if (d) d.value = st.date; return; }
else if (k === '.') {
if (st.amountStr.includes('.')) return;
st.amountStr = (st.amountStr || '0') + '.';
} else {
// 限制：最多 9 位整数 + 2 位小数
const [intPart, decPart] = st.amountStr.split('.');
if (decPart !== undefined && decPart.length >= 2) return;
if (decPart === undefined && intPart && intPart.replace('-', '').length >= 9) return;
if (st.amountStr === '0' && k !== '.') st.amountStr = k;
else st.amountStr += k;
}
renderAmountOnly();
}

function renderAmountOnly() {
const amountEl = api.body.querySelector('#qe-amount');
if (!amountEl) return;
if (!st.amountStr) { amountEl.innerHTML = '<span class="placeholder">¥0.00</span>'; return; }
const cents = toCents(st.amountStr);
amountEl.innerHTML = `<span class="cur">¥</span>${esc((cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
}

/* ---------- 保存 ---------- */

async function save(sheetApi) {
const cents = toCents(st.amountStr);
if (!cents || cents <= 0) { toastErr('请先输入金额'); return; }

const dt = parseDateInput(st.date);
const merchant = cleanText(st.merchant);

const tx = {
id: editing ? editing.id : newId(),
ts: dt,
amountCents: cents,
type: st.type,
category: st.category,
merchant: merchant || (st.type === 'expense' ? '未记录商户' : txType(st.type).name),
description: cleanText(st.note),
source: editing ? editing.source : 'manual',
account: cleanText(st.account),
note: cleanText(st.note),
userCategory: true,
batchId: editing ? editing.batchId : '',
createdAt: editing ? editing.createdAt : Date.now(),
updatedAt: Date.now(),
};

try {
if (editing) {
await store.updateTx(tx);
} else {
await store.addTx(tx);
}
} catch (e) {
toastErr('保存失败：' + (e && e.message ? e.message : e));
return;
}

// 学习：商户名 → 分类。只在用户真的选了分类时记，避免污染规则库。
if (merchant && catalogHas(st.category)) {
const rule = learnRule(merchant, st.category);
if (rule) await store.setRule(rule);
}

// 周期账单
if (st.recurring && !editing) {
const d = new Date(dt);
await store.saveRecurring({
id: newId('r'),
name: merchant || tx.description || '周期账单',
amountCents: cents,
category: st.category,
type: st.type,
frequency: 'monthly',
dayOfMonth: d.getDate(),
startMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
lastGeneratedMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
enabled: true,
createdAt: Date.now(),
updatedAt: Date.now(),
});
}

toastOk(editing ? '已保存' : `已记 ${fmtMoney(cents)}`);
sheetApi.close();
if (opts.onSaved) opts.onSaved(tx);
}
}

/* ------------------------------------------------------------------ *
* 辅助
* ------------------------------------------------------------------ */

function centsToInput(cents) {
return (Math.round(cents) / 100).toFixed(2);
}

function catalogHas(catId) {
return CATEGORIES.some((c) => c.id === catId) || INCOME_CATEGORIES.some((c) => c.id === catId);
}

function parseDateInput(s) {
const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
const now = new Date();
if (!m) return now.getTime();
const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), now.getHours(), now.getMinutes(), 0, 0);
return d.getTime();
}
    return { openQuickEntry };
  };

  /* ---------- src/ui/screen-detail.js ---------- */
  __mods["src/ui/screen-detail.js"] = function (__rmod) {
    var { CATEGORIES, category: getCategory, txType, txIcon, txCategoryLabel, TX_TYPES, SOURCES, source: getSource, monthRange, ymd } = __rmod("src/core/model.js");
    var { filterMonth, activeTxs } = __rmod("src/core/stats.js");
    var { esc, fmtMoney, fmtDayLabel, fmtTime, openSheet, toastOk, toastErr, confirmSheet } = __rmod("src/ui/dom.js");
    var { openQuickEntry } = __rmod("src/ui/sheets.js");
    var store = __rmod("src/ui/store.js");













function renderDetail(root) {
const D = store.state.detail;
const all = store.state.txs;
let list = filterMonth(all, store.state.month);


list = list.filter((t) => !t.duplicateOf || store.state.showDuplicates);


if (D.type === 'expense') list = list.filter((t) => t.type === 'expense');
else if (D.type === 'income') list = list.filter((t) => t.type === 'income' || t.type === 'redpacket');
else if (D.type === 'refund') list = list.filter((t) => t.type === 'refund');
else if (D.type === 'moved') list = list.filter((t) => t.type === 'transfer' || t.type === 'repay');

if (D.category !== 'all') list = list.filter((t) => t.category === D.category);
if (D.source !== 'all') list = list.filter((t) => t.source === D.source);

if (D.query.trim()) {
const q = D.query.trim().toLowerCase();
list = list.filter((t) =>
(t.merchant || '').toLowerCase().includes(q) ||
(t.description || '').toLowerCase().includes(q) ||
(t.note || '').toLowerCase().includes(q) ||
(t.account || '').toLowerCase().includes(q));
}




const counted = activeTxs(list);
const spendSum = counted.reduce((s, t) => (t.type === 'expense' ? s + t.amountCents : t.type === 'refund' ? s - t.amountCents : s), 0);
const incomeSum = counted.reduce((s, t) => (t.type === 'income' || t.type === 'redpacket' ? s + t.amountCents : s), 0);

root.innerHTML = `
<div class="search-bar">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
<input type="search" id="det-q" placeholder="搜索商户、说明、备注" value="${esc(D.query)}" enterkeyhint="search">
</div>

<div class="chips" id="det-type">
${chip('all', '全部', D.type)}
${chip('expense', '消费', D.type)}
${chip('income', '收入', D.type)}
${chip('refund', '退款', D.type)}
${chip('moved', '转账/还款', D.type)}
</div>

${renderFilterRow('分类', 'category', [
{ id: 'all', name: '不限' },
...CATEGORIES.map((c) => ({ id: c.id, name: c.icon + ' ' + c.name })),
], D.category)}

${renderFilterRow('来源', 'source', [
{ id: 'all', name: '不限' },
{ id: 'wechat', name: '微信' },
{ id: 'alipay', name: '支付宝' },
{ id: 'manual', name: '手动' },
{ id: 'recurring', name: '周期' },
], D.source)}

<div class="px16 mb8 small muted" style="display:flex;justify-content:space-between">
<span>${counted.length} 笔</span>
<span>
${spendSum ? '支出 ' + fmtMoney(spendSum) : ''}
${spendSum && incomeSum ? ' · ' : ''}
${incomeSum ? '收入 ' + fmtMoney(incomeSum) : ''}
</span>
</div>

${renderList(list)}
`;
}

function chip(id, name, cur) {
return `<button type="button" class="chip ${id === cur ? 'active' : ''}" data-ftype="${esc(id)}">${esc(name)}</button>`;
}

function renderFilterRow(label, key, options, current) {
return `
<div class="section-title" style="padding-bottom:6px">${esc(label)}</div>
<div class="chips" data-fkey="${esc(key)}">
${options.map((o) => `<button type="button" class="chip ${o.id === current ? 'active' : ''}" data-fval="${esc(o.id)}">${esc(o.name)}</button>`).join('')}
</div>`;
}

function renderList(list) {
if (!list.length) {
return `<div class="empty">
<div class="big">🔍</div>
<div class="title">没有符合条件的交易</div>
<div class="sub">换个筛选条件，或者清空搜索词试试。</div>
</div>`;
}

// 按天分组
const days = new Map();
for (const t of list) {
const k = ymd(t.ts);
if (!days.has(k)) days.set(k, []);
days.get(k).push(t);
}

const dayKeys = [...days.keys()].sort().reverse();
let html = '';
for (const k of dayKeys) {
const items = days.get(k).sort((a, b) => b.ts - a.ts);
// 每天的小计同样只算「计入统计」的那些，和上面的合计保持一致
const counted = activeTxs(items);
const daySpend = counted.reduce((s, t) => (t.type === 'expense' ? s + t.amountCents : t.type === 'refund' ? s - t.amountCents : s), 0);
const dayIncome = counted.reduce((s, t) => (t.type === 'income' || t.type === 'redpacket' ? s + t.amountCents : s), 0);

html += `<div class="day-head">
<span>${esc(fmtDayLabel(items[0].ts))}</span>
<span class="amt">
${daySpend ? '支出 ' + fmtMoney(daySpend) : ''}
${daySpend && dayIncome ? ' · ' : ''}
${dayIncome ? '<span class="green">收入 ' + fmtMoney(dayIncome) + '</span>' : ''}
</span>
</div>`;

html += `<div class="card tx-list" style="margin:0 16px 12px">${items.map(txRowFull).join('')}</div>`;
}
return html;
}

function txRowFull(t) {
const icon = txIcon(t);
const catLabel = txCategoryLabel(t);
const tt = txType(t.type);
const isIn = tt.direction === 'in';
const srcName = getSource(t.source).name;

const parts = [fmtTime(t.ts), catLabel];
if (t.source !== 'manual') parts.push(srcName);
if (t.account) parts.push(t.account);
if (t.excluded) parts.push('不计入统计'); // 免得用户奇怪「为什么这行没被算进上面的合计」
if (t.duplicateOf) parts.push('已判重');

return `<div class="row tappable" data-tx="${esc(t.id)}">
<span class="row-icon">${icon}</span>
<span class="row-main">
<span class="row-title">${esc(t.merchant || '未记录商户')}</span>
<span class="row-sub">${esc(parts.join(' · '))}${t.description && t.description !== t.merchant ? ' · ' + esc(t.description.slice(0, 20)) : ''}</span>
</span>
<span class="row-value ${isIn ? 'in' : ''}${t.duplicateOf ? ' muted' : ''}">${isIn ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</span>
</div>`;
}

/* ------------------------------------------------------------------ *
* 交易详情弹层
* ------------------------------------------------------------------ */

function openTxSheet(txId) {
const t = store.state.txs.find((x) => x.id === txId);
if (!t) { toastErr('找不到这笔交易'); return; }

const c = getCategory(t.category);
const tt = txType(t.type);

openSheet({
title: '交易详情',
leftLabel: '关闭',
rightLabel: '编辑',
onRight: (api) => {
api.close();
openQuickEntry({ tx: t });
},
render: (body, api) => {
const dt = new Date(t.ts);
const p = (n) => String(n).padStart(2, '0');
const dateStr = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${p(dt.getHours())}:${p(dt.getMinutes())}`;

body.innerHTML = `
<div class="hero" style="padding-top:4px">
<div style="font-size:34px;margin-bottom:4px">${txIcon(t)}</div>
<div class="hero-value" style="font-size:34px">${tt.direction === 'in' ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</div>
<div class="hero-delta">${esc(t.merchant || '未记录商户')}</div>
</div>

<div class="card" style="margin:0 16px 16px">
${infoRow('时间', dateStr)}
${infoRow('类型', tt.name)}
${infoRow('分类', txCategoryLabel(t))}
${t.description ? infoRow('商品说明', t.description) : ''}
${t.account ? infoRow('支付方式', t.account) : ''}
${t.note ? infoRow('备注', t.note) : ''}
${infoRow('来源', getSource(t.source).name)}
${t.rawType ? infoRow('账单原始类型', t.rawType) : ''}
${t.dupReason || t.duplicateOf ? infoRow('状态', '已判为重复，不计入统计') : ''}
</div>

<div class="section-title">改分类（会记住这个商户）</div>
<div class="cat-pick" id="tx-cats">
${CATEGORIES.map((x) => `<button type="button" data-cat="${x.id}" class="${x.id === t.category ? 'active' : ''}">
<span class="e">${x.icon}</span>${esc(x.name)}
</button>`).join('')}
</div>

<div class="card" style="margin:0 16px 16px">
<div class="field inline">
<label>不计入统计</label>
<span class="switch"><input type="checkbox" id="tx-excl" ${t.excluded ? 'checked' : ''}><i></i></span>
</div>
<div class="hint px16" style="padding-bottom:12px;color:var(--label-2);font-size:12px">
打开后这笔钱不会被算进消费和预算，适合「帮别人代付、之后会还你」的情况。
</div>
</div>

<div class="btn-row">
<button type="button" class="btn danger" id="tx-del">删除这笔</button>
</div>
`;

body.querySelector('#tx-cats').addEventListener('click', async (ev) => {
const b = ev.target.closest('[data-cat]');
if (!b) return;
const newCat = b.dataset.cat;
if (newCat === t.category) return;
try {
await store.updateTx({ id: t.id, category: newCat, userCategory: true });
// 记住这个商户
if (t.merchant) {
const { learnRule } = await __rmod("src/core/classify.js");
const rule = learnRule(t.merchant, newCat);
if (rule) await store.setRule(rule);
}
toastOk(`已改为「${getCategory(newCat).name}」，以后这个商户自动分到这里`);
api.close();
} catch (e) {
toastErr('修改失败：' + (e && e.message ? e.message : e));
}
});

body.querySelector('#tx-excl').addEventListener('change', async (ev) => {
try {
await store.updateTx({ id: t.id, excluded: ev.target.checked });
toastOk(ev.target.checked ? '已设为不计入统计' : '已恢复计入统计');
} catch (e) {
toastErr('修改失败');
}
});

body.querySelector('#tx-del').addEventListener('click', async () => {
const ok = await confirmSheet({
title: '删除这笔交易？',
message: '删除后无法恢复，除非你有备份文件。',
confirmLabel: '删除',
danger: true,
});
if (!ok) return;
try {
await store.removeTx(t.id);
toastOk('已删除');
api.close();
} catch (e) {
toastErr('删除失败');
}
});
},
});
}

function infoRow(label, value) {
return `<div class="field"><label>${esc(label)}</label>
<div class="pre" style="font-size:16px">${esc(value)}</div></div>`;
}
    return { renderDetail, openTxSheet };
  };

  /* ---------- src/ui/screen-year.js ---------- */
  __mods["src/ui/screen-year.js"] = function (__rmod) {
    var { CATEGORIES, INCOME_CATEGORIES, category: getCategory, txType, txIcon, txCategoryLabel, ym, monthRange, daysInMonth } = __rmod("src/core/model.js");
    var { activeTxs, totalExpense, totalRefund, netSpend, totalIncome, categoryBreakdown, merchantRanking, breakdownBy } = __rmod("src/core/stats.js");
    var { esc, fmtMoney, fmtDate, toastOk } = __rmod("src/ui/dom.js");
    var store = __rmod("src/ui/store.js");

























function yearStats(txs, year) {
const list = txs.filter((t) => {
const d = new Date(t.ts);
return d.getFullYear() === Number(year);
});
const active = activeTxs(list);

const expense = totalExpense(active);
const refund = totalRefund(active);
const net = netSpend(active);
const income = totalIncome(active);













const months = [];
for (let m = 1; m <= 12; m++) {
const key = `${year}-${String(m).padStart(2, '0')}`;
const { start, end } = monthRange(key);
const ml = active.filter((t) => t.ts >= start && t.ts < end);
const me = totalExpense(ml);
const mr = totalRefund(ml);
const mn = me - mr;
months.push({
month: m,
key,
label: `${m}月`,
expense: me,
refund: mr,
net: mn,
negative: mn < 0,
income: totalIncome(ml),
count: ml.length,
});
}
const maxMonthNet = Math.max(1, ...months.map((m) => Math.max(0, m.net)));
for (const m of months) m.percent = (Math.max(0, m.net) / maxMonthNet) * 100;


const monthsWithData = months.filter((m) => m.count > 0);



const daysWithTx = new Set(active.map((t) => {
const d = new Date(t.ts);
return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
})).size;

const { rows: cats, total: catTotal } = categoryBreakdown(active);
const merchants = merchantRanking(active, 10);


const expenses = active.filter((t) => t.type === 'expense');
const largest = expenses.reduce((m, t) => (!m || t.amountCents > m.amountCents ? t : m), null);


const byDay = new Map();
for (const t of expenses) {
const d = new Date(t.ts);
const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
byDay.set(k, (byDay.get(k) || 0) + t.amountCents);
}
let biggestDay = null;
for (const [k, v] of byDay) {
if (!biggestDay || v > biggestDay.cents) biggestDay = { day: k, cents: v };
}


const byMerchantCount = new Map();
for (const t of expenses) {
const k = t.merchant || '未知商户';
byMerchantCount.set(k, (byMerchantCount.get(k) || 0) + 1);
}
let mostVisited = null;
for (const [k, v] of byMerchantCount) {
if (!mostVisited || v > mostVisited.count) mostVisited = { name: k, count: v };
}


const topMonth = months.reduce((m, x) => (!m || x.net > m.net ? x : m), null);


const topCat = cats[0] || null;


const emptyMonths = months.filter((m) => m.count === 0).map((m) => m.month);

return {
year,
count: active.length,
expense,
refund,
net,
income,
balance: income - net,
months,
monthsWithData: monthsWithData.length,
daysWithTx,

avgPerDay: daysWithTx > 0 ? Math.round(net / daysWithTx) : 0,
avgPerMonth: monthsWithData.length > 0 ? Math.round(net / monthsWithData.length) : 0,
cats,
catTotal,
merchants,
largest,
biggestDay,
mostVisited,
topMonth,
topCat,
emptyMonths,
};
}


function availableYears(txs) {
const set = new Set();
for (const t of txs) set.add(String(new Date(t.ts).getFullYear()));
return [...set].sort().reverse();
}





function renderYearReport(root) {
const all = store.state.txs;
const years = availableYears(all);

if (!all.length) {
root.innerHTML = `<div class="empty" style="padding-top:60px">
<div class="big">📅</div>
<div class="title">还没有数据</div>
<div class="sub">记满一段时间之后，这里会给你一份年度总结。</div>
</div>`;
return;
}

const current = String(new Date().getFullYear());
const year = store.state.reportYear && years.includes(store.state.reportYear)
? store.state.reportYear
: (years.includes(current) ? current : years[0]);

const s = yearStats(all, year);

if (!s.count) {
root.innerHTML = `
<div class="seg" id="yr-years" style="margin:8px 16px 14px">
${years.map((y) => `<button type="button" data-year="${y}" class="${y === year ? 'active' : ''}">${y} 年</button>`).join('')}
</div>
<div class="empty" style="padding-top:40px">
<div class="big">🗓️</div>
<div class="title">${esc(year)} 年还没有记账</div>
<div class="sub">换个年份看看。</div>
</div>`;
wireYears(root, years, year);
return;
}

const partOfYear = Number(year) === new Date().getFullYear();
const monthsElapsed = partOfYear ? new Date().getMonth() + 1 : 12;

root.innerHTML = `
<div class="seg" id="yr-years" style="margin:8px 16px 14px">
${years.map((y) => `<button type="button" data-year="${y}" class="${y === year ? 'active' : ''}">${y} 年</button>`).join('')}
</div>

<div class="year-hero">
<div class="y">${esc(year)}</div>
<div class="sub">这一年，你一共花了</div>
<div class="hero-value" style="margin-top:6px">${esc(fmtMoney(s.net))}</div>
<div class="sub" style="margin-top:8px">
${s.count} 笔记录 · 覆盖 ${s.monthsWithData} 个月 · ${s.daysWithTx} 天有消费
</div>
</div>

<div class="kpi-grid">
<div class="kpi"><div class="kpi-label">收入</div>
<div class="kpi-value in">${esc(fmtMoney(s.income, { decimals: 0, compact: true }))}</div></div>
<div class="kpi"><div class="kpi-label">结余</div>
<div class="kpi-value ${s.balance >= 0 ? '' : 'red'}">${esc(fmtMoney(s.balance, { decimals: 0, compact: true }))}</div></div>
<div class="kpi"><div class="kpi-label">日均</div>
<div class="kpi-value">${esc(fmtMoney(s.avgPerDay, { decimals: 0, compact: true }))}</div></div>
</div>

${s.refund ? `
<div class="card" style="margin:0 16px 16px">
<div class="row"><span class="row-main"><span class="row-title">退款</span>
<span class="row-sub">全年退回来的钱，已经从消费里扣掉了</span></span>
<span class="row-value green">${esc(fmtMoney(s.refund))}</span></div>
<div class="row"><span class="row-main"><span class="row-title">消费毛额</span>
<span class="row-sub">没扣退款之前的支出</span></span>
<span class="row-value muted">${esc(fmtMoney(s.expense))}</span></div>
</div>` : ''}

${s.emptyMonths.length && partOfYear ? `
<div class="alert info">
<span class="ico">📝</span>
<div><div class="t">有 ${s.emptyMonths.length} 个月没有记录</div>
<div class="d">${esc(s.emptyMonths.join('、'))} 月。这些月份不计入月均，所以下面的月均只按有数据的月份算。</div></div>
</div>` : ''}

<!-- 逐月 -->
<div class="section-title between">
<span>每个月的消费</span>
<span class="link" style="color:var(--label-2);font-weight:400">月均 ${esc(fmtMoney(s.avgPerMonth, { decimals: 0 }))}</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="chart-box">${monthBarSvg(s.months)}</div>
<div class="month-bars">
${s.months.map((m) => {

const amt = m.net > 0
? esc(fmtMoney(m.net, { decimals: 0 }))
: m.net < 0
? `<span class="green">多退 ${esc(fmtMoney(-m.net, { decimals: 0 }))}</span>`
: '<span class="muted">—</span>';
const fillColor = m.net < 0 ? 'var(--green)'
: m.net === 0 ? 'var(--fill)'
: (m.month === (s.topMonth ? s.topMonth.month : -1) ? 'var(--red)' : 'var(--blue)');
return `
<div class="mb-row" data-month="${m.month}" data-net="${m.net}">
<span class="mb-label">${m.month}月</span>
<span class="mb-track"><i class="mb-fill" style="width:${m.percent}%;background:${fillColor}"></i></span>
<span class="mb-amt">${amt}</span>
</div>`;
}).join('')}
</div>
</div>

<!-- 亮点 -->
<div class="section-title">这一年之最</div>
<div class="card" style="margin:0 16px 16px">
${s.topCat ? highlight('🏆', '花得最多的类别', s.topCat.name,
`${esc(fmtMoney(s.topCat.netCents))} · 占 ${s.topCat.percent.toFixed(1)}% · ${s.topCat.count} 笔`) : ''}
${s.largest ? highlight('💸', '最大的一笔', s.largest.merchant || '未记录商户',
`${esc(fmtMoney(s.largest.amountCents))} · ${esc(fmtDate(s.largest.ts))}`) : ''}
${s.biggestDay ? highlight('📅', '最贵的一天', fmtDayCn(s.biggestDay.day),
`这天花了 ${esc(fmtMoney(s.biggestDay.cents))}`) : ''}
${s.mostVisited ? highlight('🔁', '去得最勤的地方', s.mostVisited.name,
`去了 ${s.mostVisited.count} 次`) : ''}
${s.topMonth && s.topMonth.net ? highlight('📈', '花得最多的月份', `${s.topMonth.month} 月`,
`${esc(fmtMoney(s.topMonth.net))} · 月均 ${esc(fmtMoney(s.avgPerMonth, { decimals: 0 }))}`) : ''}
</div>

<!-- 分类占比 -->
<div class="section-title">分类占比</div>
<div class="card" style="margin:0 16px 16px">
${s.cats.length ? `<div class="donut-wrap">
<div class="donut-box">${donutSvg(s.cats, s.catTotal)}</div>
<div class="legend">${s.cats.slice(0, 7).map(legendItem).join('')}</div>
</div>` : '<div class="empty" style="padding:24px"><div class="sub">这一年没有消费</div></div>'}
</div>

<!-- 分类明细 -->
<div class="section-title">分类明细</div>
<div class="card" style="margin:0 16px 16px">
${s.cats.map((c) => catRow(c)).join('')}
</div>

<!-- 商户 -->
<div class="section-title">去得最多的商户</div>
<div class="card" style="margin:0 16px 16px">
${s.merchants.length ? s.merchants.map((m, i) => `
<div class="rank-row">
<span class="rank-no ${i < 3 ? 'top' : ''}">${i + 1}</span>
<span class="rank-main">
<span class="rank-name">${esc(m.name)}</span>
<span class="rank-sub">${esc(getCategory(m.category).name)} · ${m.count} 笔 · 笔均 ${esc(fmtMoney(m.avg, { decimals: 0 }))}</span>
</span>
<span class="row-value">${esc(fmtMoney(m.cents))}</span>
</div>`).join('') : '<div class="empty" style="padding:24px"><div class="sub">暂无数据</div></div>'}
</div>

<!-- 收入构成 -->
${renderIncome(s)}

<div class="px16 tiny muted center" style="padding:8px 0 24px">
${esc(year)} 年度报告 · 数据只存在你的手机上
</div>
`;

wireYears(root, years, year);
}





function wireYears(root, years, current) {
const el = root.querySelector('#yr-years');
if (!el) return;
el.addEventListener('click', (ev) => {
const b = ev.target.closest('[data-year]');
if (!b || b.dataset.year === current) return;
store.state.reportYear = b.dataset.year;
store.notify(true);
});
}

function highlight(icon, title, value, detail) {
return `<div class="highlight">
<span class="n">${icon}</span>
<span class="m">
<span class="t">${esc(title)}</span>
<span class="v">${esc(value)}</span>
<span class="d">${detail}</span>
</span>
</div>`;
}

function legendItem(c) {
return `<div class="legend-item">
<span class="legend-dot" style="background:${c.color}"></span>
<span class="legend-name">${esc(c.name)}</span>
<span class="legend-pct">${c.percent.toFixed(1)}%</span>
<span class="legend-amt">${esc(fmtMoney(c.netCents, { decimals: 0 }))}</span>
</div>`;
}

function catRow(c) {
return `<div class="cat-budget">
<div class="head">
<span>${c.icon}</span>
<span>${esc(c.name)}</span>
<span class="amt">${esc(fmtMoney(c.netCents))} <span class="muted tiny">${c.percent.toFixed(1)}%</span></span>
</div>
<div class="bar"><i style="width:${Math.min(100, c.percent)}%;background:${c.color}"></i></div>
<div class="foot">
<span>${c.count} 笔${c.refundCents ? ' · 退款 ' + esc(fmtMoney(c.refundCents, { decimals: 0 })) : ''}</span>
<span>${c.count ? '笔均 ' + esc(fmtMoney(Math.round(c.netCents / c.count), { decimals: 0 })) : ''}</span>
</div>
</div>`;
}

function renderIncome(s) {
const list = store.state.txs.filter((t) => {
const d = new Date(t.ts);
return d.getFullYear() === Number(s.year);
});
const active = activeTxs(list).filter((t) => t.type === 'income' || t.type === 'redpacket');
if (!active.length) return '';

const map = new Map();
for (const t of active) {
const key = t.type === 'redpacket' ? 'redpacket' : (t.category || 'other_in');
const label = t.type === 'redpacket' ? '红包' : (getCategory(key).name || '其他收入');
const row = map.get(key) || { label, cents: 0, count: 0 };
row.cents += t.amountCents;
row.count++;
map.set(key, row);
}
const rows = [...map.values()].sort((a, b) => b.cents - a.cents);
const total = rows.reduce((x, r) => x + r.cents, 0);

return `
<div class="section-title">收入构成</div>
<div class="card" style="margin:0 16px 16px">
${rows.map((r) => `<div class="row">
<span class="row-main"><span class="row-title">${esc(r.label)}</span>
<span class="row-sub">${r.count} 笔 · ${((r.cents / (total || 1)) * 100).toFixed(1)}%</span></span>
<span class="row-value in">${esc(fmtMoney(r.cents))}</span>
</div>`).join('')}
</div>`;
}








function monthBarSvg(months) {
const w = 320, h = 90, padB = 16, padT = 8;
const innerH = h - padT - padB;
const bw = w / 12;
const max = Math.max(1, ...months.map((m) => Math.max(0, m.net)));

let bars = '';
months.forEach((m, i) => {
const positive = m.net > 0;
const negative = m.net < 0;
const bh = positive ? Math.max(2, (m.net / max) * innerH) : 0;
const x = i * bw + bw * 0.18;
const y = padT + innerH - bh;
const isTop = positive && m.net === max;
const label = positive ? fmtMoney(m.net)
: negative ? ('多退 ' + fmtMoney(-m.net))
: '没有消费';
bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(bh, negative ? 2 : 0.5).toFixed(1)}" rx="2.5"
fill="${isTop ? 'var(--red)' : negative ? 'var(--green)' : 'var(--blue)'}" opacity="${positive || negative ? 1 : 0.15}">
<title>${m.month}月 ${label}</title></rect>`;
if (i % 2 === 0 || i === 11) {
bars += `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle" font-size="8.5" fill="var(--label-2)">${m.month}</text>`;
}
});

return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="每月消费">${bars}</svg>`;
}

function donutSvg(items, total) {
const size = 150;
const thickness = 20;
const r = (size - thickness) / 2 - 2;
const cx = size / 2, cy = size / 2;
const circ = 2 * Math.PI * r;

if (!total || total <= 0) {
return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--separator)" stroke-width="${thickness}"/>
<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" fill="var(--label-2)">无消费</text>
</svg>`;
}

let acc = 0;
let segs = '';
for (const it of items) {
const frac = it.netCents / total;
if (frac <= 0) continue;
const len = Math.max(0, frac * circ - (circ * 1.6) / 360);
segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${thickness}"
stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
stroke-dashoffset="${(-acc * circ).toFixed(2)}"
transform="rotate(-90 ${cx} ${cy})">
<title>${esc(it.name)} ${it.percent.toFixed(1)}% ${fmtMoney(it.netCents)}</title>
</circle>`;
acc += frac;
}

return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block" role="img" aria-label="年度分类占比">
${segs}
<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="10.5" fill="var(--label-2)">合计</text>
<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--label)">${esc(fmtMoney(total, { decimals: 0, compact: true }))}</text>
</svg>`;
}


function fmtDayCn(dayKey) {
const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
if (!m) return dayKey;
return `${Number(m[2])}月${Number(m[3])}日`;
}
    return { yearStats, availableYears, renderYearReport };
  };

  /* ---------- src/ui/screen-stats.js ---------- */
  __mods["src/ui/screen-stats.js"] = function (__rmod) {
    var { CATEGORIES, category: getCategory, monthLabel, monthLabelFull, prevMonth } = __rmod("src/core/model.js");
    var { overview, categoryBreakdown, categoryComparison, trend, merchantRanking, dailySeries, weekdayDistribution, hourDistribution, incomeBreakdown, breakdownBy, activeTxs, filterMonth, comparison } = __rmod("src/core/stats.js");
    var { esc, fmtMoney, fmtDate, openSheet, toastOk } = __rmod("src/ui/dom.js");
    var { renderYearReport } = __rmod("src/ui/screen-year.js");
    var store = __rmod("src/ui/store.js");












const RANGES = [
{ id: 'month', name: '本月' },
{ id: 'quarter', name: '近3月' },
{ id: 'year', name: '本年' },
{ id: 'all', name: '全部' },
{ id: 'annual', name: '年度报告' },
];

function renderStats(root) {
const all = store.state.txs;
const range = store.state.statsRange;


if (range === 'annual') {
renderYearReport(root);
return;
}

const { list, label } = resolveRange(all, range);
const active = activeTxs(list);
const ov = overview(list);
const { rows: cats, total: catTotal } = categoryBreakdown(list);
const merchants = merchantRanking(list, 10);
const incomes = incomeBreakdown(list);

if (!active.length) {
root.innerHTML = `<div class="empty" style="padding-top:60px">
<div class="big">📊</div>
<div class="title">还没有数据可以统计</div>
<div class="sub">导入账单或者手动记几笔之后，这里会有图表。</div>
</div>`;
return;
}

root.innerHTML = `
<div class="seg" id="st-range">
${RANGES.map((r) => `<button type="button" data-range="${r.id}" class="${r.id === range ? 'active' : ''}">${r.name}</button>`).join('')}
</div>

<div class="hero" style="padding-top:4px">
<div class="hero-label">${esc(label)}消费</div>
<div class="hero-value">${esc(fmtMoney(ov.net))}</div>
<div class="hero-delta flat">${active.length} 笔 · 日均 ${esc(fmtMoney(ov.avgPerDay))}</div>
</div>

<div class="kpi-grid">
<div class="kpi"><div class="kpi-label">收入</div><div class="kpi-value in">${esc(fmtMoney(ov.income, { decimals: 0, compact: true }))}</div></div>
<div class="kpi"><div class="kpi-label">结余</div><div class="kpi-value ${ov.balance >= 0 ? '' : 'red'}">${esc(fmtMoney(ov.balance, { decimals: 0, compact: true }))}</div></div>
<div class="kpi"><div class="kpi-label">退款</div><div class="kpi-value muted">${esc(fmtMoney(ov.refund, { decimals: 0, compact: true }))}</div></div>
</div>

<!-- 消费比例 -->
<div class="section-title">消费比例</div>
<div class="card" style="margin:0 16px 16px">
${cats.length ? `<div class="donut-wrap">
<div class="donut-box">${donutSvg(cats, catTotal)}</div>
<div class="legend">${cats.slice(0, 7).map(legendItem).join('')}</div>
</div>` : '<div class="empty" style="padding:24px"><div class="sub">这段时间没有消费</div></div>'}
</div>

<!-- 分类明细表 -->
<div class="section-title">分类明细</div>
<div class="card" style="margin:0 16px 16px">
${cats.map((c) => catBar(c, catTotal)).join('') || '<div class="empty" style="padding:24px"><div class="sub">暂无数据</div></div>'}
</div>

<!-- 趋势 -->
<div class="section-title">近 6 个月趋势</div>
<div class="card" style="margin:0 16px 16px">
<div class="chart-box">${trendSvg(all)}</div>
<div class="px16 pb16" id="st-trend-legend"></div>
</div>

<!-- 环比 -->
${renderComparison(all)}

<!-- 商户排行 -->
<div class="section-title">商户排行</div>
<div class="card" style="margin:0 16px 16px">
${merchants.length ? merchants.map((m, i) => merchantRow(m, i)).join('') : '<div class="empty" style="padding:24px"><div class="sub">暂无数据</div></div>'}
</div>

<!-- 时段分布 -->
<div class="section-title">一周里哪天花得多</div>
<div class="card" style="margin:0 16px 16px">
<div class="chart-box">${weekdaySvg(list)}</div>
</div>

<!-- 来源分布 -->
<div class="section-title">按支付来源</div>
<div class="card" style="margin:0 16px 16px">
${sourceRows(list)}
</div>

<!-- 收入构成 -->
${incomes.length ? `
<div class="section-title">收入构成</div>
<div class="card" style="margin:0 16px 16px">
${incomes.map((x) => `<div class="row">
<span class="row-main"><span class="row-title">${esc(x.name)}</span>
<span class="row-sub">${x.percent.toFixed(1)}%</span></span>
<span class="row-value in">${esc(fmtMoney(x.cents))}</span>
</div>`).join('')}
</div>` : ''}
`;
}

/* ------------------------------------------------------------------ *
* 数据范围
* ------------------------------------------------------------------ */

function resolveRange(all, range) {
if (range === 'all') {
return { list: all, label: '全部时间' };
}
if (range === 'month') {
return { list: filterMonth(all, store.state.month), label: monthLabelFull(store.state.month) };
}
if (range === 'quarter') {
const m3 = store.state.month;
const m2 = prevMonth(m3);
const m1 = prevMonth(m2);
const set = new Set([m3, m2, m1]);
return { list: all.filter((t) => set.has(monthKeyOf(t.ts))), label: '近 3 个月' };
}
if (range === 'year') {
const y = store.state.month.split('-')[0];
return { list: all.filter((t) => monthKeyOf(t.ts).startsWith(y + '-')), label: y + ' 年' };
}
return { list: all, label: '全部时间' };
}

function monthKeyOf(ts) {
const d = new Date(ts);
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
* 子区块
* ------------------------------------------------------------------ */

function legendItem(c) {
return `<div class="legend-item">
<span class="legend-dot" style="background:${c.color}"></span>
<span class="legend-name">${esc(c.name)}</span>
<span class="legend-pct">${c.percent.toFixed(1)}%</span>
<span class="legend-amt">${esc(fmtMoney(c.netCents, { decimals: 0 }))}</span>
</div>`;
}

function catBar(c, total) {
const pct = Math.min(100, c.percent);
return `<div class="cat-budget">
<div class="head">
<span>${c.icon}</span>
<span>${esc(c.name)}</span>
<span class="amt">${esc(fmtMoney(c.netCents))} <span class="muted tiny">${c.percent.toFixed(1)}%</span></span>
</div>
<div class="bar"><i style="width:${pct}%;background:${c.color}"></i></div>
<div class="foot">
<span>${c.count} 笔${c.refundCents ? ' · 退款 ' + fmtMoney(c.refundCents) : ''}</span>
<span>${c.count ? '笔均 ' + fmtMoney(Math.round(c.netCents / c.count)) : ''}</span>
</div>
</div>`;
}

function donutSvg(items, total) {
const size = 150;
const thickness = 20;
const r = (size - thickness) / 2 - 2;
const cx = size / 2, cy = size / 2;
const circ = 2 * Math.PI * r;

if (!total || total <= 0) {
return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--separator)" stroke-width="${thickness}"/>
<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" fill="var(--label-2)">无消费</text>
</svg>`;
}

let acc = 0;
let segs = '';
for (const it of items) {
const frac = it.netCents / total;
if (frac <= 0) continue;
const len = Math.max(0, frac * circ - (circ * 1.6) / 360);
segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${thickness}"
stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
stroke-dashoffset="${(-acc * circ).toFixed(2)}"
transform="rotate(-90 ${cx} ${cy})">
<title>${esc(it.name)} ${it.percent.toFixed(1)}% ${fmtMoney(it.netCents)}</title>
</circle>`;
acc += frac;
}

return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:190px;margin:0 auto;display:block" role="img" aria-label="消费分类占比">
${segs}
<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="10.5" fill="var(--label-2)">合计</text>
<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--label)">${esc(fmtMoney(total, { decimals: 0, compact: true }))}</text>
</svg>`;
}

function trendSvg(all) {
const rows = trend(all, store.state.month, 6);
const w = 320, h = 112, padL = 8, padR = 8, padT = 11, padB = 18;
const innerW = w - padL - padR;
const innerH = h - padT - padB;
const max = Math.max(1, ...rows.map((r) => Math.max(r.net, r.income)));

const step = innerW / Math.max(1, rows.length - 1);
const xy = (i, v) => [padL + i * step, padT + innerH - (v / max) * innerH];

const spendPts = rows.map((r, i) => xy(i, r.net));
const incomePts = rows.map((r, i) => xy(i, r.income));

const path = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
const area = `${path(spendPts)} L${spendPts[spendPts.length - 1][0].toFixed(1)} ${(padT + innerH).toFixed(1)} L${spendPts[0][0].toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

let grid = '';
for (let i = 0; i <= 2; i++) {
const y = padT + (innerH / 2) * i;
grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="var(--separator)" stroke-width="1"/>`;
}

const labels = rows.map((r, i) => {
const x = padL + i * step;
return `<text x="${x.toFixed(1)}" y="${h - 6}" text-anchor="middle" font-size="10" fill="var(--label-2)">${esc(r.label)}</text>`;
}).join('');

const dots = spendPts.map((p, i) => {
const last = i === spendPts.length - 1;
return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 4 : 2.6}" fill="${last ? 'var(--blue)' : 'var(--card)'}" stroke="var(--blue)" stroke-width="1.8"/>`;
}).join('');

return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="近6个月消费趋势">
<defs>
<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="var(--blue)" stop-opacity="0.22"/>
<stop offset="100%" stop-color="var(--blue)" stop-opacity="0.02"/>
</linearGradient>
</defs>
${grid}
<path d="${area}" fill="url(#trendFill)"/>
<path d="${path(incomePts)}" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.85"/>
<path d="${path(spendPts)}" fill="none" stroke="var(--blue)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
${dots}
${labels}
</svg>
<div class="px16 tiny muted" style="display:flex;gap:14px;padding-top:2px">
<span><span style="display:inline-block;width:14px;height:2.4px;background:var(--blue);vertical-align:middle;border-radius:2px"></span> 消费</span>
<span><span style="display:inline-block;width:14px;height:0;border-top:2px dashed var(--green);vertical-align:middle"></span> 收入</span>
</div>`;
}

function renderComparison(all) {
const month = store.state.month;
const { rows, prevKey } = categoryComparison(all, month);
const changed = rows.filter((r) => r.current > 0 || r.prev > 0).slice(0, 8);
if (!changed.length) return '';

return `
<div class="section-title">环比 ${esc(monthLabelFull(prevKey))}</div>
<div class="card" style="margin:0 16px 16px">
${changed.map((r) => {
const up = r.diff > 0;
const pctTxt = r.pctChange == null ? (r.current > 0 ? '新增' : '—') : Math.abs(r.pctChange).toFixed(0) + '%';
const cls = r.diff === 0 ? 'muted' : up ? 'red' : 'green';
const arrow = r.diff === 0 ? '' : up ? '↑' : '↓';
return `<div class="row">
<span class="row-icon">${r.icon}</span>
<span class="row-main">
<span class="row-title">${esc(r.name)}</span>
<span class="row-sub">上月 ${esc(fmtMoney(r.prev, { decimals: 0 }))} → 本月 ${esc(fmtMoney(r.current, { decimals: 0 }))}</span>
</span>
<span class="row-value ${cls}">${arrow}${pctTxt}</span>
</div>`;
}).join('')}
</div>`;
}

function merchantRow(m, i) {
const c = getCategory(m.category);
return `<div class="rank-row">
<span class="rank-no ${i < 3 ? 'top' : ''}">${i + 1}</span>
<span class="rank-main">
<span class="rank-name">${esc(m.name)}</span>
<span class="rank-sub">${c.name} · ${m.count} 笔 · 笔均 ${esc(fmtMoney(m.avg, { decimals: 0 }))}</span>
</span>
<span class="row-value">${esc(fmtMoney(m.cents))}</span>
</div>`;
}

function weekdaySvg(list) {
const rows = weekdayDistribution(list);
const w = 320, h = 110, padB = 20, padT = 10;
const innerH = h - padT - padB;
const bw = w / 7;
let bars = '';
rows.forEach((d, i) => {
const bh = Math.max(2, (d.cents / Math.max(1, ...rows.map((x) => x.cents))) * innerH);
const x = i * bw + bw * 0.22;
const y = padT + innerH - bh;
bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.56).toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="var(--blue)" opacity="${d.cents ? 1 : 0.12}">
<title>${esc(d.name)} ${fmtMoney(d.cents)}</title></rect>
<text x="${(i * bw + bw / 2).toFixed(1)}" y="${h - 5}" text-anchor="middle" font-size="10" fill="var(--label-2)">${esc(d.name.replace('周', ''))}</text>`;
});
return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="一周消费分布">${bars}</svg>`;
}

function sourceRows(list) {
const rows = breakdownBy(list, 'source');
if (!rows.length) return '<div class="empty" style="padding:24px"><div class="sub">暂无数据</div></div>';
const map = { wechat: '微信', alipay: '支付宝', manual: '手动记账', recurring: '周期账单', import: '导入' };
return rows.map((r) => `<div class="row">
<span class="row-main"><span class="row-title">${esc(map[r.name] || r.name)}</span>
<span class="row-sub">${r.percent.toFixed(1)}%</span></span>
<span class="row-value">${esc(fmtMoney(r.cents))}</span>
</div>`).join('');
}
    return { renderStats };
  };

  /* ---------- src/ui/screen-budget.js ---------- */
  __mods["src/ui/screen-budget.js"] = function (__rmod) {
    var { CATEGORIES, category: getCategory, monthLabelFull, prevMonth } = __rmod("src/core/model.js");
    var { budgetStatus, categoryBudgetStatus, budgetAlerts, defaultBudget } = __rmod("src/core/budget.js");
    var { esc, fmtMoney, toastOk, toastErr, openSheet, confirmSheet } = __rmod("src/ui/dom.js");
    var store = __rmod("src/ui/store.js");









function renderBudget(root) {
const month = store.state.month;
const all = store.state.txs;
const budget = store.effectiveBudget(month);
const isCustom = !!store.state.budgets[month];
const s = budgetStatus(all, month, budget);
const catRows = categoryBudgetStatus(all, month, budget);
const alerts = budgetAlerts(all, month, budget);
const hasAny = s.hasTotal || catRows.length > 0;

root.innerHTML = `
<div class="hero" style="padding-bottom:4px">
<div class="hero-label">${esc(monthLabelFull(month))}预算</div>
<div class="hero-value">${s.hasTotal ? esc(fmtMoney(s.totalCents)) : '<span class="muted" style="font-size:26px">未设置</span>'}</div>
${isCustom ? '<div class="hero-delta flat">这个月单独设置过</div>' : '<div class="hero-delta flat">使用默认预算</div>'}
</div>

${alerts.length ? alerts.map((a) => `
<div class="alert ${a.level === 'danger' ? 'danger' : 'warn'}">
<span class="ico">${a.level === 'danger' ? '🔴' : '🟡'}</span>
<div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.detail)}</div></div>
</div>`).join('') : ''}

${s.hasTotal ? `
<div class="card" style="margin:0 16px 16px">
<div class="ring-row">
<div class="ring">${ring(s.ratio, s.level, '已用', s.percentUsed.toFixed(0) + '%')}</div>
<div class="ring-info">
<div class="big">${esc(fmtMoney(s.spent))}</div>
<div class="sub">
预算 ${esc(fmtMoney(s.totalCents))}<br>
${s.remaining >= 0 ? '还剩 ' + esc(fmtMoney(s.remaining)) : '<span class="red">已超 ' + esc(fmtMoney(-s.remaining)) + '</span>'}<br>
今天 ${esc(String(s.dayOfMonth))} 号 / 共 ${s.totalDays} 天<br>
${s.totalDays - s.dayOfMonth > 0 ? '每天可花 ' + esc(fmtMoney(s.dailyAllowance)) : '本月已结束'}
</div>
</div>
</div>
${s.willExceed && s.ratio < 1 ? `<div class="px16 pb16 small orange">按当前速度，月底预计花到 ${esc(fmtMoney(s.pace))}，会超预算。</div>` : ''}
</div>` : ''}

<div class="section-title between">
<span>总预算</span>
<span class="link" data-act="edit-total">${s.hasTotal ? '修改' : '设置'}</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="row tappable" data-act="edit-total">
<span class="row-main"><span class="row-title">每月总预算</span>
<span class="row-sub">所有分类加起来的上限</span></span>
<span class="row-value ${s.hasTotal ? '' : 'muted'}">${s.hasTotal ? esc(fmtMoney(s.totalCents)) : '未设置'}</span>
</div>
<div class="row tappable" data-act="edit-warn">
<span class="row-main"><span class="row-title">提醒阈值</span>
<span class="row-sub">用到多少比例时给黄色提醒</span></span>
<span class="row-value">${Math.round((budget.warnRatio ?? 0.8) * 100)}%</span>
</div>
</div>

<div class="section-title between">
<span>分类预算</span>
<span class="link" data-act="edit-cats">${catRows.length ? '修改' : '设置'}</span>
</div>
<div class="card" style="margin:0 16px 16px">
${catRows.length ? catRows.map(catRow).join('') : `
<div class="empty" style="padding:24px">
<div class="sub">还没有设置分类预算。<br>设置后可以看到「餐饮还剩多少」这类提示。</div>
</div>`}
</div>

<div class="section-title">这个月的收支</div>
<div class="card" style="margin:0 16px 16px">
<div class="row"><span class="row-main"><span class="row-title">消费净额</span></span>
<span class="row-value">${esc(fmtMoney(s.spent))}</span></div>
<div class="row"><span class="row-main"><span class="row-title">收入</span></span>
<span class="row-value in">${esc(fmtMoney(s.balance + s.spent))}</span></div>
<div class="row"><span class="row-main"><span class="row-title">结余</span></span>
<span class="row-value ${s.balance >= 0 ? '' : 'red'}">${esc(fmtMoney(s.balance))}</span></div>
</div>

${isCustom ? `<div class="btn-row"><button type="button" class="btn" data-act="reset-month">恢复为默认预算</button></div>` : ''}
`;
}

function catRow(c) {
const pct = Math.min(100, c.percentUsed);
const cls = c.level === 'danger' ? 'var(--red)' : c.level === 'warn' ? 'var(--orange)' : c.color;
return `<div class="cat-budget">
<div class="head">
<span>${c.icon}</span>
<span>${esc(c.name)}</span>
<span class="amt">${esc(fmtMoney(c.spent))} <span class="muted tiny">/ ${esc(fmtMoney(c.budgetCents, { decimals: 0 }))}</span></span>
</div>
<div class="bar"><i style="width:${pct}%;background:${cls}"></i></div>
<div class="foot">
<span>${c.count} 笔 · ${c.percentUsed.toFixed(0)}%</span>
<span>${c.remaining >= 0 ? '还剩 ' + esc(fmtMoney(c.remaining)) : '<span class="red">超 ' + esc(fmtMoney(-c.remaining)) + '</span>'}</span>
</div>
</div>`;
}

function ring(ratio, level, label, value) {
const size = 120, thickness = 12;
const r = (size - thickness) / 2 - 2;
const cx = size / 2, cy = size / 2;
const circ = 2 * Math.PI * r;
const clamped = Math.max(0, Math.min(1, ratio));
const len = clamped * circ;
const color = level === 'danger' ? 'var(--red)' : level === 'warn' ? 'var(--orange)' : level === 'ok' ? 'var(--green)' : 'var(--gray)';

return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:120px;margin:0 auto;display:block" role="img" aria-label="${esc(label)} ${esc(value)}">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${thickness}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${thickness}"
stroke-linecap="round"
stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
transform="rotate(-90 ${cx} ${cy})"/>
<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--label)">${esc(value)}</text>
<text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="var(--label-2)">${esc(label)}</text>
</svg>`;
}

/* ------------------------------------------------------------------ *
* 编辑弹层
* ------------------------------------------------------------------ */

function openBudgetEdit() {
const month = store.state.month;
const budget = store.effectiveBudget(month);
const draft = JSON.parse(JSON.stringify({ ...defaultBudget(), ...budget }));

openSheet({
title: '设置预算',
leftLabel: '取消',
rightLabel: '保存',
height: '76vh',
onRight: async (api) => {
await store.saveBudget(month, draft);
toastOk('预算已保存');
api.close();
},
render: (body, api) => {
body.innerHTML = `
<div class="px16 mb16 small muted">这里的设置会应用到这个月。不单独设置的话，就用下面「默认预算」里的值。</div>

<div class="section-title">总预算</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>每月总预算（元）</label>
<input type="number" inputmode="decimal" id="bd-total" min="0" step="100" placeholder="例如 3000，留空或 0 表示不限制" value="${draft.totalCents ? (draft.totalCents / 100).toFixed(0) : ''}">
</div>
<div class="field">
<label>提醒阈值（%）</label>
<input type="number" inputmode="numeric" id="bd-warn" min="1" max="100" step="5" value="${Math.round((draft.warnRatio ?? 0.8) * 100)}">
<div class="hint">花到这个比例时提醒你，默认 80%。</div>
</div>
</div>

<div class="section-title between">
<span>分类预算</span>
<button type="button" class="link" id="bd-clear">全部清空</button>
</div>
<div class="card" style="margin:0 16px 16px">
${CATEGORIES.map((c) => `
<div class="field inline">
<label>${c.icon} ${esc(c.name)}</label>
<input type="number" inputmode="decimal" min="0" step="50" data-cat="${c.id}"
placeholder="不限" value="${draft.byCategory[c.id] ? (draft.byCategory[c.id] / 100).toFixed(0) : ''}"
style="max-width:46%">
</div>`).join('')}
</div>

<div class="card" style="margin:0 16px 16px">
<div class="field inline">
<label>把它设为默认预算</label>
<span class="switch"><input type="checkbox" id="bd-default" checked><i></i></span>
</div>
<div class="hint px16" style="padding-bottom:12px;color:var(--label-2);font-size:12px">
打开后，以后每个月都用这套预算（当月可再单独调整）。
</div>
</div>
`;

const totalEl = body.querySelector('#bd-total');
const warnEl = body.querySelector('#bd-warn');
const defEl = body.querySelector('#bd-default');

const sync = () => {
const t = parseFloat(totalEl.value);
draft.totalCents = Number.isFinite(t) && t > 0 ? Math.round(t * 100) : 0;
const w = parseFloat(warnEl.value);
draft.warnRatio = Number.isFinite(w) && w > 0 && w <= 100 ? w / 100 : 0.8;

draft.byCategory = {};
for (const inp of body.querySelectorAll('[data-cat]')) {
const v = parseFloat(inp.value);
if (Number.isFinite(v) && v > 0) draft.byCategory[inp.dataset.cat] = Math.round(v * 100);
}
};

body.addEventListener('input', sync);

body.querySelector('#bd-clear').addEventListener('click', () => {
for (const inp of body.querySelectorAll('[data-cat]')) inp.value = '';
sync();
});


api.setRightHandler(async (a) => {
sync();
await store.saveBudget(month, draft);
if (defEl.checked) {
await store.saveBudget('__default', { ...draft, byCategory: { ...draft.byCategory } });
}
toastOk('预算已保存');
a.close();
});
},
});
}

function openWarnRatioEdit() {
const month = store.state.month;
const budget = store.effectiveBudget(month);
const cur = Math.round((budget.warnRatio ?? 0.8) * 100);

openSheet({
title: '提醒阈值',
rightLabel: '保存',
onRight: async (api) => {
const input = api.body.querySelector('#wr');
const v = parseFloat(input && input.value);
if (!Number.isFinite(v) || v < 1 || v > 100) { toastErr('请输入 1 到 100 之间的数字'); return; }
const b = store.effectiveBudget(month);
await store.saveBudget(month, { ...b, warnRatio: v / 100 });
toastOk(`已设为 ${Math.round(v)}%`);
api.close();
},
render: (body) => {
body.innerHTML = `
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>用到百分之多少时提醒（1-100）</label>
<input type="number" id="wr" inputmode="numeric" min="1" max="100" value="${cur}">
<div class="hint">例如填 80，就是花掉预算的 80% 时显示黄色提醒。</div>
</div>
</div>`;
},
});
}
    return { renderBudget, openBudgetEdit, openWarnRatioEdit };
  };

  /* ---------- src/core/crypto.js ---------- */
  __mods["src/core/crypto.js"] = function (__rmod) {












const MAGIC = 'QZBAK1';
const PBKDF2_ITERATIONS = 310000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBytes(x) {
return x instanceof Uint8Array ? x : new Uint8Array(x);
}

function bytesToBase64(bytes) {
const b = toBytes(bytes);
let bin = '';
const CHUNK = 0x8000;
for (let i = 0; i < b.length; i += CHUNK) {
bin += String.fromCharCode.apply(null, b.subarray(i, i + CHUNK));
}
return btoa(bin);
}

function base64ToBytes(b64) {
const bin = atob(b64);
const out = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
return out;
}

async function deriveKey(password, salt, iterations) {
const enc = new TextEncoder();
const baseKey = await crypto.subtle.importKey(
'raw',
enc.encode(password),
{ name: 'PBKDF2' },
false,
['deriveKey'],
);
return crypto.subtle.deriveKey(
{
name: 'PBKDF2',
salt,
iterations,
hash: 'SHA-256',
},
baseKey,
{ name: 'AES-GCM', length: 256 },
false,
['encrypt', 'decrypt'],
);
}







async function encryptBackup(data, password) {
if (!password || password.length < 4) {
throw new Error('备份密码至少要 4 位');
}
if (!globalThis.crypto || !crypto.subtle) {
throw new Error('当前环境不支持加密（需要 HTTPS 或 localhost 打开本应用）');
}

const json = JSON.stringify(data);
const plaintext = new TextEncoder().encode(json);

const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

const header = {
v: 1,
alg: 'AES-256-GCM',
kdf: 'PBKDF2-SHA256',
iter: PBKDF2_ITERATIONS,
salt: bytesToBase64(salt),
iv: bytesToBase64(iv),
createdAt: Date.now(),
plainBytes: plaintext.length,
};

const envelope = {
magic: MAGIC,
header,
payload: bytesToBase64(cipher),
};


const packed = await maybeGzip(JSON.stringify(envelope));
return MAGIC + '\n' + bytesToBase64(packed);
}




async function decryptBackup(text, password) {
if (!text || typeof text !== 'string') throw new Error('备份内容为空');
const trimmed = text.trim();
if (!trimmed.startsWith(MAGIC)) {
throw new Error('这不是轻账的备份文件');
}
const body = trimmed.slice(MAGIC.length).trim();
const packed = base64ToBytes(body);
const raw = await maybeGunzip(packed);

let envelope;
try {
envelope = JSON.parse(new TextDecoder().decode(raw));
} catch (e) {
throw new Error('备份文件内容损坏，无法解析');
}
if (!envelope || envelope.magic !== MAGIC) throw new Error('这不是轻账的备份文件');

const { header, payload } = envelope;
if (!header || !payload) throw new Error('备份文件缺少必要字段');

const salt = base64ToBytes(header.salt);
const iv = base64ToBytes(header.iv);
const key = await deriveKey(password, salt, header.iter || PBKDF2_ITERATIONS);

let plain;
try {
plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(payload));
} catch (e) {
throw new Error('密码不正确，或者备份文件已损坏');
}

try {
return JSON.parse(new TextDecoder().decode(plain));
} catch (e) {
throw new Error('解密成功但内容不是有效数据');
}
}





async function maybeGzip(str) {
const bytes = new TextEncoder().encode(str);
if (typeof CompressionStream === 'undefined') return bytes;
try {
const cs = new CompressionStream('gzip');
const writer = cs.writable.getWriter();
writer.write(bytes);
writer.close();
const buf = await new Response(cs.readable).arrayBuffer();
return new Uint8Array(buf);
} catch (e) {
return bytes;
}
}

async function maybeGunzip(bytes) {
const b = toBytes(bytes);

if (!(b.length > 2 && b[0] === 0x1f && b[1] === 0x8b)) return b;
if (typeof DecompressionStream === 'undefined') {
throw new Error('这个浏览器不支持解压备份文件，请升级 iOS 后重试');
}
try {
const ds = new DecompressionStream('gzip');
const writer = ds.writable.getWriter();
writer.write(b);
writer.close();
const buf = await new Response(ds.readable).arrayBuffer();
return new Uint8Array(buf);
} catch (e) {
throw new Error('备份文件解压失败：' + String(e && e.message || e));
}
}





const BACKUP_EXT = '.qzbak';

function backupFileName(date = new Date()) {
const p = (n) => String(n).padStart(2, '0');
const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
return `轻账备份-${stamp}${BACKUP_EXT}`;
}


async function saveTextFile(filename, text, mime = 'text/plain') {
const blob = new Blob([text], { type: mime + ';charset=utf-8' });


const file = new File([blob], filename, { type: mime });
if (navigator.canShare && navigator.canShare({ files: [file] })) {
try {
await navigator.share({ files: [file], title: filename });
return 'shared';
} catch (e) {
if (e && e.name === 'AbortError') return 'cancelled';

}
}

const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
setTimeout(() => {
URL.revokeObjectURL(url);
a.remove();
}, 1000);
return 'downloaded';
}

async function readTextFile(file) {
const buf = await file.arrayBuffer();
const { decodeText } = await __rmod("src/core/csv.js");
return decodeText(buf).text;
}
    return { encryptBackup, decryptBackup, BACKUP_EXT, backupFileName, saveTextFile, readTextFile };
  };

  /* ---------- src/core/csv.js ---------- */
  __mods["src/core/csv.js"] = function (__rmod) {
    var { cleanText } = __rmod("src/core/util.js");



















function parseCSV(text, delimiter) {
if (typeof text !== 'string') text = String(text ?? '');
const rows = [];
if (!text.length) return { rows, delimiter: delimiter || ',' };

const delim = delimiter || detectDelimiter(text);
const DELIMS = new Set([delim]);

let row = [];
let field = '';
let inQuotes = false;
let i = 0;
const n = text.length;

let rowHasDelimiter = false;

const pushField = () => { row.push(field); field = ''; };
const pushRow = () => {
pushField();









const isBlank = row.every((c) => c.trim() === '');
if (!isBlank || rowHasDelimiter) rows.push(row);
row = [];
rowHasDelimiter = false;
};

while (i < n) {
const ch = text[i];

if (inQuotes) {
if (ch === '"') {
if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
inQuotes = false; i++; continue;
}
field += ch; i++; continue;
}

if (ch === '"') {

if (field === '') { inQuotes = true; i++; continue; }
field += ch; i++; continue;
}

if (DELIMS.has(ch)) { pushField(); rowHasDelimiter = true; i++; continue; }

if (ch === '\r') {
if (text[i + 1] === '\n') i++;
pushRow(); i++; continue;
}
if (ch === '\n') { pushRow(); i++; continue; }

field += ch;
i++;
}



if (field !== '' || rowHasDelimiter) pushRow();




while (rows.length) {
const last = rows[rows.length - 1];
if (last.every((c) => c.trim() === '')) rows.pop();
else break;
}

return { rows, delimiter: delim };
}


function detectDelimiter(text) {
const sample = text.slice(0, 8000);
const candidates = [
{ d: ',', n: 0 },
{ d: '\t', n: 0 },
{ d: ';', n: 0 },
];
let inQuotes = false;
for (let i = 0; i < sample.length; i++) {
const ch = sample[i];
if (ch === '"') { inQuotes = !inQuotes; continue; }
if (inQuotes) continue;
for (const c of candidates) if (ch === c.d) c.n++;
}
candidates.sort((a, b) => b.n - a.n);
return candidates[0].n > 0 ? candidates[0].d : ',';
}








function findHeaderRow(rows, mustContain, maxScan = 60) {
const limit = Math.min(rows.length, maxScan);
let best = -1;
let bestScore = 0;

for (let i = 0; i < limit; i++) {
const cells = rows[i].map((c) => cleanText(c));
if (cells.length < 2) continue;
let score = 0;
for (const cell of cells) {
for (const kw of mustContain) {
if (cell.includes(kw)) score++;
}
}

if (score > bestScore) { bestScore = score; best = i; }
}
return bestScore >= 2 ? best : -1;
}





function rowsToObjects(rows, headerIndex) {
const header = rows[headerIndex].map((h, i) => {
const name = cleanText(h).replace(/[\s\u3000]/g, '');
return name || `col${i}`;
});

const out = [];
for (let i = headerIndex + 1; i < rows.length; i++) {
const r = rows[i];
if (!r.length) continue;

if (r.every((c) => cleanText(c) === '')) continue;
const obj = {};
for (let j = 0; j < header.length; j++) {
obj[header[j]] = cleanText(r[j] ?? '');
}

for (let j = header.length; j < r.length; j++) {
obj[`col${j}`] = cleanText(r[j]);
}
obj.__rowIndex = i;
out.push(obj);
}
return out;
}








function pickField(row, candidates, opts = {}) {
const keys = Object.keys(row).filter((k) => !k.startsWith('__'));
const exclude = opts.exclude || [];


for (const cand of candidates) {
const target = cand.toLowerCase();
for (const k of keys) {
if (exclude.some((e) => k.includes(e))) continue;
if (k.toLowerCase() === target) return { key: k, value: row[k] };
}
}

for (const cand of candidates) {
const target = cand.toLowerCase();
for (const k of keys) {
if (exclude.some((e) => k.includes(e))) continue;
if (k.toLowerCase().includes(target)) return { key: k, value: row[k] };
}
}
return null;
}









function decodeText(buffer, preferredEncoding) {
const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

if (preferredEncoding) {
try {
return { text: new TextDecoder(preferredEncoding).decode(bytes), encoding: preferredEncoding };
} catch (e) {  }
}


if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8' };
}


let utf8 = '';
try {
utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
return { text: utf8, encoding: 'utf-8' };
} catch (e) {  }


for (const enc of ['gbk', 'gb18030', 'big5']) {
try {
const t = new TextDecoder(enc).decode(bytes);

const bad = (t.match(/\uFFFD/g) || []).length;
if (bad / Math.max(1, t.length) < 0.01) return { text: t, encoding: enc };
} catch (e) {  }
}


return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8-lossy' };
}


function looksLikeStatement(text) {
if (!text) return false;
const s = text.slice(0, 4000);
const hits = ['交易时间', '交易创建时间', '交易对方', '金额', '收/支', '收支', '商品', '交易类型', '付款时间', '账单明细'];
let n = 0;
for (const h of hits) if (s.includes(h)) n++;
return n >= 2;
}
    return { parseCSV, findHeaderRow, rowsToObjects, pickField, decodeText, looksLikeStatement };
  };

  /* ---------- src/core/parser.js ---------- */
  __mods["src/core/parser.js"] = function (__rmod) {
    var { parseCSV, findHeaderRow, rowsToObjects, pickField, decodeText, looksLikeStatement } = __rmod("src/core/csv.js");
    var { cleanText, normalizeMerchant, hash64, parseDateTime, parseAmount } = __rmod("src/core/util.js");
    var { classify, detectType, shouldSkipRow } = __rmod("src/core/classify.js");
    var { makeTx, newId } = __rmod("src/core/model.js");
































function detectSource(text) {
const head = (text || '').slice(0, 6000);


const wxStrong = ['微信支付账单', '微信支付', '微信昵称', '微信红包', '微信账单', '当前状态', '零钱通', '微信零钱'];
const aliStrong = ['支付宝', 'alipay', '交易创建时间', '收/付款方式', '付款时间', '交易订单号', '商家订单号', '余额宝', '花呗', '收/支'];

let wxS = 0, aliS = 0;
for (const s of wxStrong) if (head.includes(s)) wxS++;
for (const s of aliStrong) if (head.includes(s)) aliS++;

if (wxS || aliS) {
return wxS >= aliS ? 'wechat' : 'alipay';
}





return 'unknown';
}





const COL = {
time: {
wechat: ['交易时间', '时间', '交易日期'],
alipay: ['交易创建时间', '付款时间', '交易时间', '创建时间', '成交时间'],
any: ['交易时间', '交易创建时间', '付款时间', '创建时间', '记账时间', '时间', '日期', '交易日期'],
},
merchant: {
wechat: ['交易对方', '对方', '商户'],
alipay: ['交易对方', '对方', '商户名称', '收款方'],
any: ['交易对方', '对方', '商户名称', '商户', '收款方', '交易对象'],
},
description: {
wechat: ['商品', '商品说明', '备注'],
alipay: ['商品说明', '商品名称', '商品', '备注', '说明'],
any: ['商品说明', '商品名称', '商品', '备注', '说明', '摘要'],
},
direction: {
wechat: ['收/支', '收支', '收支类型'],
alipay: ['收/支', '收支', '收支类型', '资金方向'],
any: ['收/支', '收支', '收支类型', '资金方向', '借贷标志'],
},
amount: {
wechat: ['金额(元)', '金额（元）', '金额'],
alipay: ['金额(元)', '金额（元）', '金额', '发生金额'],
any: ['金额(元)', '金额（元）', '金额', '发生金额', '交易金额'],
},
method: {
any: ['支付方式', '付款方式', '收付款方式', '资金渠道'],
},
rawType: {
any: ['交易类型', '类型', '业务类型', '交易分类'],
},
status: {
any: ['当前状态', '交易状态', '状态', '订单状态'],
},
counterAccount: {
any: ['对方账号', '对方账户', '收款方账号', '账号'],
},
};

function buildColumns(row) {
const get = (group) => pickField(row, COL[group].any);
return {
time: get('time'),
merchant: get('merchant'),
description: get('description'),
direction: get('direction'),
amount: get('amount'),
method: get('method'),
rawType: get('rawType'),
status: get('status'),
counterAccount: get('counterAccount'),
};
}











function parseRow(row, columns, ctx = {}) {
const source = ctx.source || 'unknown';

const timeVal = columns.time ? row[columns.time.key] : '';
const ts = parseDateTime(timeVal);
if (!ts) return { tx: null, skip: 'no-time' };

const amountVal = columns.amount ? row[columns.amount.key] : '';
const amt = parseAmount(amountVal);


if (!amt) return { tx: null, skip: 'no-amount' };
if (amt.cents === 0) return { tx: null, skip: 'zero-amount' };


if (shouldSkipRow(row, (r, keys) => {
for (const k of keys) { if (r[k] != null && r[k] !== '') return r[k]; }
return '';
})) {
return { tx: null, skip: 'invalid-status' };
}

const merchantRaw = columns.merchant ? row[columns.merchant.key] : '';
const descRaw = columns.description ? row[columns.description.key] : '';
const rawType = columns.rawType ? row[columns.rawType.key] : '';
const dirRaw = columns.direction ? row[columns.direction.key] : '';
const method = columns.method ? row[columns.method.key] : '';
const counterAccount = columns.counterAccount ? row[columns.counterAccount.key] : '';

const direction = parseDirection(dirRaw, amountVal, amt);
const merchant = cleanText(merchantRaw);
const description = cleanText(descRaw);


const merchantClean = /^名?商户/.test(merchant) ? '' : merchant;

const type = detectType({
direction,
rawType,
merchant: merchantClean,
description,
source,
}, ctx.selfNames || []);


let category;
if (type === 'income') {
category = inferIncomeCategory(merchantClean, description, rawType);
} else if (type === 'refund') {
category = 'refund';
} else if (type === 'redpacket') {
category = 'redpacket';
} else if (type === 'transfer' || type === 'repay') {
category = 'other';
} else {
const r = classify({ merchant: merchantClean, description, rawType }, ctx.rules);
category = r.category;
}


const fullName = columns.merchant ? '' : '';

const tx = makeTx({
ts,
amountCents: amt.cents,
type,
category,
merchant: merchantClean || (rawType ? cleanText(rawType).split('-')[0] : '') || '未知商户',
description: description || cleanText(rawType),
rawType: cleanText(rawType),
source: source === 'unknown' ? 'import' : source,
account: cleanText(method),
batchId: ctx.batchId || '',
});

tx.fp = fingerprint(tx);
tx.counterAccount = cleanText(counterAccount);
tx.fullMerchant = cleanText(fullName);

return { tx, skip: null };
}


function parseDirection(dirRaw, amountRaw, amtInfo) {
const d = cleanText(dirRaw);
if (d) {


if (/不计收支|不计入|中性|其它|其他/.test(d)) return 'none';




if (d === '/' || d === '-') {

} else if (/收入|转入|退款|收|入账/.test(d) && !/支出/.test(d)) return 'in';
else if (/支出|转出|付款|支/.test(d)) return 'out';
}

if (amtInfo && amtInfo.negative) return 'out';
const raw = cleanText(amountRaw);
if (/^-/.test(raw)) return 'out';
return 'out';
}


function inferIncomeCategory(merchant, description, rawType) {
const all = `${merchant} ${description} ${rawType}`;
if (/工资|薪资|薪水|代发|劳务/.test(all)) return 'salary';
if (/奖金|绩效|年终|补贴|报销/.test(all)) return 'bonus';
if (/退款|退货|退费|返现/.test(all)) return 'refund';
if (/红包/.test(all)) return 'redpacket';
if (/利息|收益|理财|余额宝收益|基金/.test(all)) return 'other_in';
return 'other_in';
}










function fingerprint(tx) {
const minute = Math.floor(tx.ts / 60000);
const parts = [
minute,
tx.amountCents,
normalizeMerchant(tx.merchant),
cleanText(tx.description).slice(0, 30),
tx.type,
];
return hash64(parts.join('\u0001'));
}











function parseStatementText(text, ctx = {}) {
const warnings = [];
const skipped = { total: 0, byReason: {} };

const source = ctx.source && ctx.source !== 'auto' ? ctx.source : detectSource(text);
if (source === 'unknown') {
warnings.push('没认出这是微信还是支付宝的账单，按通用格式解析；如果结果不对，可以手动指定来源。');
}

const { rows } = parseCSV(text);
if (!rows.length) {
return { source, txs: [], skipped, headerRow: -1, columns: null, warnings: ['文件里没有可读内容。'] };
}

const headerRow = findHeaderRow(rows, [
'交易时间', '交易创建时间', '交易对方', '商品', '金额', '收/支', '收支',
'交易类型', '付款时间', '当前状态', '交易状态',
]);

if (headerRow < 0) {
warnings.push('没找到表头行，可能不是账单文件，或者格式比较特殊。');
return { source, txs: [], skipped, headerRow: -1, columns: null, warnings };
}

const objects = rowsToObjects(rows, headerRow);
if (!objects.length) {
warnings.push('表头下面没有数据行。');
return { source, txs: [], skipped, headerRow, columns: null, warnings };
}

const columns = buildColumns(objects[0]);
if (!columns.time || !columns.amount) {
const missing = [];
if (!columns.time) missing.push('交易时间');
if (!columns.amount) missing.push('金额');
warnings.push(`账单缺少必需的列：${missing.join('、')}。表头实际是：${rows[headerRow].join(' | ').slice(0, 200)}`);
return { source, txs: [], skipped, headerRow, columns: null, warnings };
}
if (!columns.merchant && !columns.description) {
warnings.push('没有找到「交易对方」或「商品」列，商户信息可能为空。');
}

const ctxFull = { ...ctx, source };
if (!ctxFull.batchId) ctxFull.batchId = `b_${Date.now().toString(36)}`;

const txs = [];
for (const row of objects) {
skipped.total++;
let res;
try {
res = parseRow(row, columns, ctxFull);
} catch (e) {
res = { tx: null, skip: 'parse-error:' + String(e && e.message || e) };
}
if (res.tx) {
txs.push(res.tx);
skipped.total--;
} else {
const r = res.skip || 'unknown';
const base = r.split(':')[0];
skipped.byReason[base] = (skipped.byReason[base] || 0) + 1;
}
}


txs.sort((a, b) => a.ts - b.ts);


if (txs.length) {
const years = new Set(txs.map((t) => new Date(t.ts).getFullYear()));
if (years.size > 1) {
warnings.push(`这批账单跨了 ${years.size} 个年份（${[...years].sort().join('、')}），导入后建议按月份筛选核对一下。`);
}
}

return { source, txs, skipped, headerRow, columns, warnings };
}










async function parseZipFile(buffer, opts = {}) {
const { readZip } = await __rmod("src/core/zip.js");
const warnings = [];

let entries;
try {
entries = await readZip(buffer, opts.password || '');
} catch (e) {
const msg = String(e && e.message || e);
if (/密码/.test(msg)) throw new Error('解压密码不对。微信账单的密码通常是你的身份证后 6 位，如果身份证以字母 X 结尾请大写。');
if (/AES/i.test(msg)) throw new Error('这个压缩包用了新版加密方式，暂时解不开。可以在电脑上解压后用 CSV 导入。');
throw new Error('无法读取这个压缩包：' + msg);
}


const texts = entries.filter((e) => !e.dir && typeof e.text === 'string');
if (!texts.length) {
const names = entries.filter((e) => !e.dir).map((e) => e.name).join('、');
throw new Error('压缩包里没有找到文本文件。里面的文件是：' + (names || '（空）'));
}

const statements = texts.filter((e) => looksLikeStatement(e.text));
const chosen = statements.length ? statements : texts;

if (!statements.length) {
warnings.push(`压缩包里没找到标准账单文件，尝试解析了：${chosen.map((c) => c.name).join('、')}`);
}
if (chosen.length > 1) {
warnings.push(`压缩包里有 ${chosen.length} 个候选文件，都解析了。`);
}

const allTx = [];
const allWarnings = [...warnings];
const skipped = { total: 0, byReason: {} };
let source = opts.source || 'auto';

for (const entry of chosen) {
const r = parseStatementText(entry.text, opts);
if (source === 'auto') source = r.source;
allTx.push(...r.txs);
allWarnings.push(...r.warnings);
skipped.total += r.skipped.total;
for (const [k, v] of Object.entries(r.skipped.byReason)) {
skipped.byReason[k] = (skipped.byReason[k] || 0) + v;
}
}

return { source, txs: allTx, skipped, warnings: dedupeStrings(allWarnings), files: chosen.map((c) => c.name) };
}

function dedupeStrings(arr) {
return [...new Set(arr)];
}










async function parseFile(file, opts = {}) {
const name = (file.name || '').toLowerCase();
const isZip = name.endsWith('.zip') || (file.type || '').includes('zip');

if (isZip) {
const buf = await file.arrayBuffer();
const r = await parseZipFile(buf, opts);
return { ...r, fileName: file.name };
}


const buf = await file.arrayBuffer();
const { text, encoding } = decodeText(buf, opts.encoding);
const r = parseStatementText(text, opts);
return { ...r, fileName: file.name, encoding };
}


const SKIP_REASONS = {
'no-time': '日期读不出来',
'no-amount': '金额读不出来',
'zero-amount': '金额是 0',
'invalid-status': '交易已取消/退款/失败',
'parse-error': '格式异常',
unknown: '其他原因',
};

function describeSkipped(skipped) {
const parts = [];
for (const [k, v] of Object.entries(skipped.byReason || {})) {
parts.push(`${SKIP_REASONS[k] || k} ${v} 笔`);
}
return parts.join('，');
}
    return { detectSource, parseRow, parseDirection, fingerprint, parseStatementText, parseZipFile, parseFile, SKIP_REASONS, describeSkipped };
  };

  /* ---------- src/core/dedupe.js ---------- */
  __mods["src/core/dedupe.js"] = function (__rmod) {
    var { fingerprint } = __rmod("src/core/parser.js");
    var { normalizeMerchant } = __rmod("src/core/util.js");



















const SAME_MINUTE_MS = 60 * 1000;








function dedupe(incoming, existing = [], opts = {}) {
const allowSame = !!opts.allowSameFingerprint;


for (const t of incoming) if (!t.fp) t.fp = fingerprint(t);


const existingCount = new Map();
const existingByFp = new Map();
for (const t of existing) {
if (t.duplicateOf) continue;
const fp = t.fp || fingerprint(t);
existingCount.set(fp, (existingCount.get(fp) || 0) + 1);
if (!existingByFp.has(fp)) existingByFp.set(fp, []);
existingByFp.get(fp).push(t);
}


const byFp = new Map();
for (const t of incoming) {
if (!byFp.has(t.fp)) byFp.set(t.fp, []);
byFp.get(t.fp).push(t);
}

const keep = [];
const duplicates = [];
const stats = { inBatch: 0, crossBatch: 0, kept: 0 };

for (const [fp, group] of byFp) {

group.sort((a, b) => a.ts - b.ts);

const existingHere = existingCount.get(fp) || 0;
const existingList = existingByFp.get(fp) || [];






const candidates = [];
let matched = 0;
for (const t of group) {
if (matched < existingHere) {

const hit = existingList.find((e) => Math.abs(e.ts - t.ts) <= SAME_MINUTE_MS);
if (hit) {
t.duplicateOf = hit.id;
duplicates.push({ tx: t, reason: 'already-imported', duplicateOf: hit.id });
stats.crossBatch++;
matched++;
continue;
}

}
candidates.push(t);
}


const uniq = [];
for (const t of candidates) {
const twin = uniq.find((u) => Math.abs(u.ts - t.ts) <= SAME_MINUTE_MS);
if (twin && !allowSame) {
t.duplicateOf = twin.id;
duplicates.push({ tx: t, reason: 'in-batch', duplicateOf: twin.id });
stats.inBatch++;
continue;
}
uniq.push(t);
}

for (const t of uniq) {
keep.push(t);
stats.kept++;
}
}

keep.sort((a, b) => a.ts - b.ts);
return { keep, duplicates, stats };
}






function findSuspiciousPairs(txs, windowMs = 10 * 60 * 1000) {
const sorted = txs.slice().sort((a, b) => a.ts - b.ts);
const pairs = [];
const used = new Set();

for (let i = 0; i < sorted.length; i++) {
const a = sorted[i];
if (used.has(a.id)) continue;
for (let j = i + 1; j < sorted.length; j++) {
const b = sorted[j];
if (b.ts - a.ts > windowMs) break;
if (used.has(b.id)) continue;
if (a.amountCents !== b.amountCents) continue;
if (a.type !== b.type) continue;
if (normalizeMerchant(a.merchant) !== normalizeMerchant(b.merchant)) continue;
pairs.push({ a, b, gapMs: b.ts - a.ts });
used.add(a.id);
used.add(b.id);
break;
}
}
return pairs;
}

















function pairTransfers(txs, opts = {}) {
const windowMs = (opts.windowDays || 3) * 24 * 60 * 60 * 1000;
const outflows = txs.filter((t) => (t.type === 'transfer' || t.type === 'repay') && !t.excluded);
const inflows = txs.filter((t) => (t.type === 'transfer' && t.directionIn) || (t.type === 'income' && /转入|余额宝|零钱通|还款/.test(`${t.merchant}${t.description}`)));

const usedIn = new Set();
const pairs = [];

for (const o of outflows) {
let best = null;
for (const i of inflows) {
if (usedIn.has(i.id) || i.id === o.id) continue;
if (i.amountCents !== o.amountCents) continue;
const gap = Math.abs(i.ts - o.ts);
if (gap > windowMs) continue;
if (!best || gap < best.gap) best = { other: i, gap };
}
if (best) {
usedIn.add(best.other.id);
pairs.push({ out: o, in: best.other, gapMs: best.gap });
}
}
return pairs;
}








function previewImport(incoming, existing) {
const { keep, duplicates, stats } = dedupe(incoming, existing);
const dateRange = keep.length
? { from: keep[0].ts, to: keep[keep.length - 1].ts }
: null;

const byType = {};
for (const t of keep) byType[t.type] = (byType[t.type] || 0) + 1;

const spendCents = keep
.filter((t) => t.type === 'expense')
.reduce((s, t) => s + t.amountCents, 0);

return { keep, duplicates, stats, dateRange, byType, spendCents };
}
    return { dedupe, findSuspiciousPairs, pairTransfers, previewImport };
  };

  /* ---------- src/core/rules.js ---------- */
  __mods["src/core/rules.js"] = function (__rmod) {
    var { normalizeMerchant, cleanText } = __rmod("src/core/util.js");
    var { learnRule } = __rmod("src/core/classify.js");
    var db = __rmod("src/core/db.js");











function ruleMapFromRules(rules) {
const m = new Map();
for (const r of rules || []) {
if (r && r.key) m.set(r.key, r.category);
}
return m;
}

async function loadRuleMap() {
return ruleMapFromRules(await db.allRules());
}





async function rememberCorrection(merchant, category) {
const rule = learnRule(merchant, category);
if (!rule) return null;
await db.putRule(rule);
return rule;
}





async function rememberBatch(items) {
const saved = [];
for (const it of items) {
const r = await rememberCorrection(it.merchant, it.category);
if (r) saved.push(r);
}
return saved;
}

async function forgetRule(key) {
await db.deleteRule(key);
}

async function listRules() {
const rules = await db.allRules();
return rules.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function clearAllRules() {
await db.clearRules();
}





function summarizeRules(rules) {
const byCategory = new Map();
for (const r of rules || []) {
if (!byCategory.has(r.category)) byCategory.set(r.category, []);
byCategory.get(r.category).push(r.merchant || r.key);
}
return byCategory;
}
    return { normalizeMerchant, cleanText, ruleMapFromRules, loadRuleMap, rememberCorrection, rememberBatch, forgetRule, listRules, clearAllRules, summarizeRules };
  };

  /* ---------- src/core/import.js ---------- */
  __mods["src/core/import.js"] = function (__rmod) {
    var { parseFile, parseStatementText, parseZipFile, describeSkipped } = __rmod("src/core/parser.js");
    var { dedupe, previewImport } = __rmod("src/core/dedupe.js");
    var { newId } = __rmod("src/core/model.js");
    var { ruleMapFromRules } = __rmod("src/core/rules.js");
    var db = __rmod("src/core/db.js");
























async function runImport(files, opts = {}) {
const fileList = normalizeFiles(files);
const rules = ruleMapFromRules(await db.allRules());
const settings = await db.allSettings();
const selfNames = collectSelfNames(settings);

const batchId = newId('b');
const perFile = [];
const allTxs = [];
const allWarnings = [];
const allSkipped = { total: 0, byReason: {} };
let source = opts.source && opts.source !== 'auto' ? opts.source : 'auto';


if (opts.pastedText && !fileList.length) {
const r = parseStatementText(opts.pastedText, {
source: opts.source || 'auto',
rules,
selfNames,
batchId,
});
if (source === 'auto') source = r.source;
allTxs.push(...r.txs);
allWarnings.push(...r.warnings);
mergeSkipped(allSkipped, r.skipped);
perFile.push({
name: '粘贴的内容',
source: r.source,
count: r.txs.length,
warnings: r.warnings,
skipped: r.skipped,
});
}


for (const file of fileList) {
try {
const r = await parseFile(file, {
password: opts.password,
source: opts.source || 'auto',
encoding: opts.encoding,
rules,
selfNames,
batchId,
});
if (source === 'auto') source = r.source;
allTxs.push(...r.txs);
allWarnings.push(...r.warnings);
mergeSkipped(allSkipped, r.skipped);
perFile.push({
name: r.fileName || file.name,
source: r.source,
count: r.txs.length,
warnings: r.warnings,
skipped: r.skipped,
encoding: r.encoding,
zipFiles: r.files,
});
} catch (err) {
perFile.push({
name: file.name,
error: String(err && err.message || err),
count: 0,
warnings: [],
skipped: { total: 0, byReason: {} },
});
}
}


const existing = await db.allTx();
const preview = previewImport(allTxs, existing);


for (const t of preview.keep) t.batchId = batchId;
for (const d of preview.duplicates) d.tx.batchId = batchId;

return {
batchId,
source,
perFile,
keep: preview.keep,
duplicates: preview.duplicates,
stats: preview.stats,
dateRange: preview.dateRange,
byType: preview.byType,
spendCents: preview.spendCents,
warnings: [...new Set(allWarnings)],
skipped: allSkipped,
totalParsed: allTxs.length,
existingCount: existing.length,
};
}







async function commitImport(preview, opts = {}) {
const toSave = [...preview.keep];



if (opts.includeDuplicates !== false) {
for (const d of preview.duplicates) toSave.push(d.tx);
}

if (toSave.length) await db.putTxMany(toSave);

const batch = {
id: preview.batchId,
createdAt: Date.now(),
source: preview.source,
files: preview.perFile.map((f) => f.name),
parsedCount: preview.totalParsed,
importedCount: preview.keep.length,
duplicateCount: preview.duplicates.length,
skipped: preview.skipped,
fileCount: preview.perFile.length,
};
await db.putBatch(batch);

return { saved: toSave.length, imported: preview.keep.length, batch };
}




async function undoBatch(batchId) {
const all = await db.allTx();
const ids = all.filter((t) => t.batchId === batchId).map((t) => t.id);
if (ids.length) {
await db.deleteTxMany(ids);
}
await db.deleteBatch(batchId);
return ids.length;
}





function normalizeFiles(files) {
if (!files) return [];
if (files instanceof File) return [files];
if (Array.isArray(files)) return files.filter(Boolean);

return Array.from(files || []);
}

function mergeSkipped(target, src) {
if (!src) return;
target.total += src.total || 0;
for (const [k, v] of Object.entries(src.byReason || {})) {
target.byReason[k] = (target.byReason[k] || 0) + v;
}
}





function collectSelfNames(settings) {
const names = [];
const push = (v) => {
if (!v) return;
if (Array.isArray(v)) { v.forEach(push); return; }
const s = String(v).trim();
if (s && !names.includes(s)) names.push(s);
};
push(settings.selfNames);
push(settings.nickname);
push(settings.realName);
return names;
}


function summarizeImport(preview) {
const parts = [];
parts.push(`识别到 ${preview.totalParsed} 笔交易`);
if (preview.stats.crossBatch) parts.push(`其中 ${preview.stats.crossBatch} 笔之前已经导入过（会自动跳过）`);
if (preview.stats.inBatch) parts.push(`${preview.stats.inBatch} 笔文件内部重复`);
if (preview.skipped.total) {
const desc = describeSkipped(preview.skipped);
if (desc) parts.push(`忽略 ${preview.skipped.total} 行（${desc}）`);
}
return parts.join('；') + '。';
}
    return { runImport, commitImport, undoBatch, summarizeImport };
  };

  /* ---------- src/ui/import-screen.js ---------- */
  __mods["src/ui/import-screen.js"] = function (__rmod) {
    var { openSheet, toastOk, toastErr, toastWarn, esc, fmtMoney, fmtDate, fmtFileSize, confirmSheet } = __rmod("src/ui/dom.js");
    var { runImport, commitImport, undoBatch, summarizeImport } = __rmod("src/core/import.js");
    var { category: getCategory, txType } = __rmod("src/core/model.js");
    var store = __rmod("src/ui/store.js");












let lastPreview = null;


function openImportSheet(opts = {}) {
const st = {
files: [],
password: '',
source: 'auto',
busy: false,
preview: null,
error: '',
pasted: '',
mode: 'file',
};

openSheet({
title: '导入账单',
leftLabel: '关闭',
rightLabel: '开始解析',
lockBackdrop: true,
height: '80vh',
onRight: (api) => doParse(api),
render: (body, sheetApi) => {
const api = sheetApi;
body.innerHTML = `
<div class="seg" id="imp-mode" style="margin:8px 16px 14px">
<button type="button" data-mode="file" class="active">选文件</button>
<button type="button" data-mode="paste">粘贴文本</button>
</div>

<div id="imp-file-pane">
<div class="drop-zone" id="imp-drop">
<div class="big">📄</div>
<div class="t">把账单文件拖到这里</div>
<div class="s">支持 .csv / .txt / .zip<br>微信和支付宝都能识别</div>
<div style="margin-top:12px"><button type="button" class="btn primary" id="imp-pick" style="max-width:200px;margin:0 auto">选择文件</button></div>
</div>
</div>

<div id="imp-paste-pane" hidden>
<div class="px16 mb16 small muted">从微信或支付宝的账单页面复制文字，粘贴到这里（也可以直接在电脑上把 CSV 内容复制过来）。</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<textarea id="imp-paste" rows="8" placeholder="粘贴账单内容…" style="resize:none;font-size:14px"></textarea>
</div>
</div>
</div>

<div class="px16 mb16" id="imp-opts">
<div class="card" style="margin:0 0 16px">
<div class="field inline">
<label for="imp-source">账单来源</label>
<select id="imp-source" style="width:auto;flex:0 0 auto;text-align:right;direction:rtl">
<option value="auto">自动识别</option>
<option value="wechat">微信</option>
<option value="alipay">支付宝</option>
</select>
</div>
<div class="field">
<label for="imp-pwd">解压密码（只有加密 ZIP 需要填）</label>
<input id="imp-pwd" type="text" placeholder="留空表示没有密码" autocomplete="off" autocapitalize="off" spellcheck="false">
<div class="hint">微信发到邮箱的账单压缩包，密码通常是你身份证号后 6 位；如果身份证以 X 结尾，请大写。</div>
</div>
</div>
</div>

<div id="imp-files"></div>
<div id="imp-result"></div>
`;

const filePane = body.querySelector('#imp-file-pane');
const pastePane = body.querySelector('#imp-paste-pane');
const dropEl = body.querySelector('#imp-drop');
const filesEl = body.querySelector('#imp-files');
const resultEl = body.querySelector('#imp-result');
const pwdEl = body.querySelector('#imp-pwd');
const srcEl = body.querySelector('#imp-source');
const pasteEl = body.querySelector('#imp-paste');


body.querySelector('#imp-mode').addEventListener('click', (ev) => {
const b = ev.target.closest('[data-mode]');
if (!b) return;
st.mode = b.dataset.mode;
for (const x of body.querySelectorAll('#imp-mode button')) x.classList.toggle('active', x === b);
filePane.hidden = st.mode !== 'file';
pastePane.hidden = st.mode !== 'paste';
api.setRightLabel(st.mode === 'file' ? '开始解析' : '解析内容');
});


body.querySelector('#imp-pick').addEventListener('click', () => pickFiles(addFiles));


['dragenter', 'dragover'].forEach((t) => dropEl.addEventListener(t, (e) => {
e.preventDefault(); dropEl.classList.add('over');
}));
['dragleave', 'drop'].forEach((t) => dropEl.addEventListener(t, (e) => {
e.preventDefault(); dropEl.classList.remove('over');
}));
dropEl.addEventListener('drop', (e) => {
const fs = e.dataTransfer && e.dataTransfer.files;
if (fs && fs.length) addFiles(Array.from(fs));
});

pwdEl.addEventListener('input', () => { st.password = pwdEl.value; });
srcEl.addEventListener('change', () => { st.source = srcEl.value; });
pasteEl.addEventListener('input', () => { st.pasted = pasteEl.value; });


function addFiles(files) {
for (const f of files) {
if (!st.files.some((x) => x.name === f.name && x.size === f.size)) st.files.push(f);
}
st.error = '';
renderFiles();
}

function renderFiles() {
if (!st.files.length) { filesEl.innerHTML = ''; return; }
filesEl.innerHTML = `
<div class="section-title between">
<span>已选择 ${st.files.length} 个文件</span>
<button type="button" class="link" id="imp-clear">清空</button>
</div>
<div class="card" style="margin:0 16px 16px">
${st.files.map((f, i) => `
<div class="import-file">
<div class="n">${esc(f.name)}</div>
<div class="m">${fmtFileSize(f.size)}</div>
</div>`).join('')}
</div>`;
const clearBtn = filesEl.querySelector('#imp-clear');
if (clearBtn) clearBtn.addEventListener('click', () => { st.files = []; renderFiles(); });
}
renderFiles();

/* ---- 解析 ---- */
async function doParse(a) {
if (st.busy) return;
if (st.mode === 'file' && !st.files.length) { toastWarn('请先选择账单文件'); return; }
if (st.mode === 'paste' && !st.pasted.trim()) { toastWarn('请先粘贴账单内容'); return; }

st.busy = true;
a.setRightDisabled(true);
resultEl.innerHTML = '<div class="spin"></div><div class="center small muted">正在解析账单…</div>';

try {
const preview = await runImport(st.mode === 'file' ? st.files : [], {
password: st.password,
source: st.source,
pastedText: st.mode === 'paste' ? st.pasted : '',
});
st.preview = preview;
lastPreview = preview;
renderResult(preview, a);
} catch (e) {
const msg = e && e.message ? e.message : String(e);
resultEl.innerHTML = `<div class="alert danger"><span class="ico">⚠️</span><div><div class="t">解析失败</div><div class="d pre">${esc(msg)}</div></div></div>`;
toastErr('解析失败');
} finally {
st.busy = false;
a.setRightDisabled(false);
}
}

/* ---- 预览结果 ---- */
function renderResult(pv, a) {
const hasTx = pv.keep.length > 0;
const range = pv.dateRange
? `${fmtDate(pv.dateRange.from)} 至 ${fmtDate(pv.dateRange.to)}`
: '—';

const typeRows = Object.entries(pv.byType || {})
.map(([t, n]) => `${txType(t).name} ${n}`)
.join(' · ');

let html = '';

if (!hasTx && !pv.duplicates.length) {
html += `<div class="alert danger"><span class="ico">😕</span><div>
<div class="t">没有解析出交易</div>
<div class="d">可能的原因：不是账单文件、格式特殊、或者密码不对。<br>下面有详细信息。</div>
</div></div>`;
} else {
html += `<div class="alert info"><span class="ico">📊</span><div>
<div class="t">识别到 ${pv.totalParsed} 笔交易，将导入 ${pv.keep.length} 笔</div>
<div class="d">${esc(summarizeImport(pv))}<br>时间范围：${esc(range)}${typeRows ? '<br>构成：' + esc(typeRows) : ''}</div>
</div></div>`;
}

// 每个文件的解析情况
html += `<div class="section-title">文件明细</div><div class="card" style="margin:0 16px 16px">`;
for (const f of pv.perFile) {
if (f.error) {
html += `<div class="import-file"><div class="n">${esc(f.name)}</div><div class="m err">解析出错：${esc(f.error)}</div></div>`;
} else {
html += `<div class="import-file">
<div class="n">${esc(f.name)}</div>
<div class="m">
${f.count} 笔交易${f.encoding ? ' · 编码 ' + esc(f.encoding) : ''}${f.zipFiles ? ' · 包内文件 ' + esc(f.zipFiles.join('、')) : ''}
${f.skipped && f.skipped.total ? '<br>忽略 ' + f.skipped.total + ' 行' : ''}
</div>
</div>`;
}
}
html += `</div>`;

// 警告
if (pv.warnings && pv.warnings.length) {
html += `<div class="alert warn"><span class="ico">💡</span><div><div class="t">注意</div><div class="d pre">${esc(pv.warnings.join('\n'))}</div></div></div>`;
}

// 重复
if (pv.duplicates.length) {
html += `<div class="alert warn"><span class="ico">🔁</span><div>
<div class="t">${pv.duplicates.length} 笔已判为重复</div>
<div class="d">这些交易之前已经导入过（或文件内部重复），会标记但不会重复计入统计。</div>
</div></div>`;
}

// 预览几笔
if (hasTx) {
html += `<div class="section-title">前 8 笔预览</div><div class="card" style="margin:0 16px 16px">`;
for (const t of pv.keep.slice(0, 8)) {
const c = getCategory(t.category);
const tt = txType(t.type);
html += `<div class="row">
<span class="row-icon">${c.icon}</span>
<span class="row-main">
<span class="row-title">${esc(t.merchant || '未知商户')}</span>
<span class="row-sub">${esc(fmtDate(t.ts))} · ${esc(c.name)} · ${esc(tt.name)}</span>
</span>
<span class="row-value ${tt.direction === 'in' ? 'in' : ''}">${tt.direction === 'in' ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</span>
</div>`;
}
html += `</div>`;
}

resultEl.innerHTML = html;

// 把右上角按钮换成「确认导入」
api.setRightLabel('确认导入');
api.setRightDisabled(!hasTx);
api.setRightHandler(() => doCommit(pv, api));
}

async function doCommit(pv, a) {
a.setRightDisabled(true);
resultEl.innerHTML = '<div class="spin"></div><div class="center small muted">正在写入…</div>';
try {
const r = await commitImport(pv, { includeDuplicates: true });
await store.reloadAll();
if (opts.onDone) opts.onDone(r);
a.close();
toastOk(`导入完成：新增 ${r.imported} 笔`, 3000);
if (pv.duplicates.length) {
setTimeout(() => toast(`另有 ${pv.duplicates.length} 笔标记为重复，未计入统计`, '', 3600), 900);
}
} catch (e) {
toastErr('写入失败：' + (e && e.message ? e.message : e));
resultEl.innerHTML = `<div class="alert danger"><span class="ico">⚠️</span><div><div class="t">写入失败</div><div class="d">${esc(String(e && e.message || e))}</div></div></div>`;
a.setRightDisabled(false);
}
}

// 供外部调用
api.addFiles = addFiles;
},
});
}

/* ------------------------------------------------------------------ *
* 调用系统文件选择器
* ------------------------------------------------------------------ */

let filePickCallback = null;

function initFilePicker() {
const input = document.getElementById('file-input');
if (!input) return;
input.addEventListener('change', () => {
const files = Array.from(input.files || []);
input.value = '';
if (filePickCallback && files.length) filePickCallback(files);
});
}

function pickFiles(cb) {
const input = document.getElementById('file-input');
if (!input) { toastErr('当前环境不支持选择文件'); return; }
filePickCallback = cb;
input.click();
}

/* ------------------------------------------------------------------ *
* 撤销导入
* ------------------------------------------------------------------ */

function openBatchListSheet() {
openSheet({
title: '导入记录',
leftLabel: '关闭',
render: (body) => {
const batches = store.state.batches;
if (!batches.length) {
body.innerHTML = `<div class="empty"><div class="big">📥</div><div class="title">还没有导入过账单</div><div class="sub">从微信或支付宝导出账单后，在「我的 → 导入账单」里添加。</div></div>`;
return;
}
body.innerHTML = `
<div class="px16 mb16 small muted">删掉一次导入，会把那次导入的交易一起移除。手动记的账不受影响。</div>
<div class="card" style="margin:0 16px 16px">
${batches.map((b) => `
<div class="row tappable" data-batch="${esc(b.id)}">
<span class="row-icon">📄</span>
<span class="row-main">
<span class="row-title">${esc((b.files || []).join('、') || '导入')}</span>
<span class="row-sub">${esc(fmtDate(b.createdAt))} · 新增 ${b.importedCount} 笔${b.duplicateCount ? ' · 重复 ' + b.duplicateCount + ' 笔' : ''}</span>
</span>
<span class="row-chev">${chevSvg()}</span>
</div>`).join('')}
</div>`;
body.addEventListener('click', async (ev) => {
const row = ev.target.closest('[data-batch]');
if (!row) return;
const id = row.dataset.batch;
const ok = await confirmSheet({
title: '撤销这次导入？',
message: '这次导入的交易会从轻账里删除，无法恢复（除非你有备份）。',
confirmLabel: '删除',
danger: true,
});
if (!ok) return;
const n = await store.removeBatch(id);
toastOk(`已删除 ${n} 笔交易`);
openBatchListSheet();
});
},
});
}

function chevSvg() {
return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
    return { openImportSheet, initFilePicker, pickFiles, openBatchListSheet };
  };

  /* ---------- src/ui/screen-settings.js ---------- */
  __mods["src/ui/screen-settings.js"] = function (__rmod) {
    var { CATEGORIES, INCOME_CATEGORIES, category: getCategory, txType } = __rmod("src/core/model.js");
    var { FREQUENCIES, yearlyRecurringTotal } = __rmod("src/core/recurring.js");
    var { esc, fmtMoney, fmtDate, fmtFileSize, openSheet, toastOk, toastErr, toastWarn, confirmSheet, promptSheet } = __rmod("src/ui/dom.js");
    var { encryptBackup, decryptBackup, backupFileName, saveTextFile, BACKUP_EXT } = __rmod("src/core/crypto.js");
    var { openImportSheet, openBatchListSheet, pickFiles } = __rmod("src/ui/import-screen.js");
    var store = __rmod("src/ui/store.js");
    var db = __rmod("src/core/db.js");












function renderSettings(root) {
const st = store.state;
const months = new Set(st.txs.map((t) => {
const d = new Date(t.ts);
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}));
const firstTs = st.txs.length ? Math.min(...st.txs.map((t) => t.ts)) : null;
const lastTs = st.txs.length ? Math.max(...st.txs.map((t) => t.ts)) : null;

const storagePct = st.storage.quota ? (st.storage.usage / st.storage.quota) * 100 : 0;

root.innerHTML = `
<div class="section-title">账单</div>
<div class="card" style="margin:0 16px 16px">
${row('📄', '导入账单', '微信 / 支付宝的 CSV、ZIP', 'import')}
${row('🗂️', '导入记录与撤销', `${st.batches.length} 次导入`, 'batches')}
${row('🔁', '周期账单', st.recurring.length ? `${st.recurring.length} 项 · 每年约 ${fmtMoney(yearlyRecurringTotal(st.recurring), { decimals: 0, compact: true })}` : '订阅、房租这类固定支出', 'recurring')}
${row('➕', '手动记一笔', '不想导入的时候用', 'quick')}
</div>

<div class="section-title">分类</div>
<div class="card" style="margin:0 16px 16px">
${row('🏷️', '分类管理', customCatCount()
? `${CATEGORIES.length} 个支出分类（${customCatCount()} 个自定义）`
: '新建自己的分类，比如「养猫」「实验室」', 'categories')}
${row('🧠', '我教过的分类', st.rules.length ? `${st.rules.length} 条规则` : '还没有，改分类时会自动记住', 'rules')}
${row('👤', '我的名字 / 昵称', (st.settings.selfNames || []).length ? (st.settings.selfNames || []).join('、') : '用来识别「转给自己」', 'selfnames')}
</div>

<div class="section-title">备份</div>
<div class="card" style="margin:0 16px 16px">
${row('🔒', '导出加密备份', '带密码，可存到 iCloud Drive', 'backup')}
${row('📥', '从备份恢复', '选择 .qzbak 文件', 'restore')}
${row('📤', '导出 CSV', '用 Excel 打开查看（不加密）', 'csv')}
</div>

<div class="section-title">数据</div>
<div class="card" style="margin:0 16px 16px">
<div class="row">
<span class="row-icon">📊</span>
<span class="row-main"><span class="row-title">交易总数</span>
<span class="row-sub">${months.size} 个月${firstTs ? ' · ' + fmtDate(firstTs) + ' 起' : ''}</span></span>
<span class="row-value">${st.txs.length} 笔</span>
</div>
<div class="row">
<span class="row-icon">💾</span>
<span class="row-main"><span class="row-title">占用空间</span>
<span class="row-sub">${st.storage.persisted ? '已获得持久化存储' : '未获得持久化存储（有被系统清理的风险）'}</span></span>
<span class="row-value muted">${fmtFileSize(st.storage.usage)}</span>
</div>
<div class="row">
<span class="row-icon">${st.offlineCheck === 'ok' ? '📶' : st.offlineCheck === 'pending' ? '⏳' : '⚠️'}</span>
<span class="row-main"><span class="row-title">离线可用</span>
<span class="row-sub">${offlineExplain(st)}</span></span>
<span class="row-value muted small">${offlineLabel(st)}</span>
</div>
${row('🧹', '清理重复交易', '按指纹重新判定并删除重复项', 'dedupe')}
${row('⚠️', '清空所有数据', '不可恢复，请先导出备份', 'clear')}
</div>

<div class="section-title">外观</div>
<div class="card" style="margin:0 16px 16px">
<div class="field inline">
<label>跟着系统切换浅色 / 深色</label>
<span class="switch"><input type="checkbox" id="set-autotheme" ${st.settings.theme ? '' : 'checked'}><i></i></span>
</div>
<div class="field inline">
<label>深色模式</label>
<span class="switch"><input type="checkbox" id="set-dark" ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}><i></i></span>
</div>
</div>

<div class="section-title">关于</div>
<div class="card" style="margin:0 16px 16px">
<div class="row">
<span class="row-main"><span class="row-title">轻账</span>
<span class="row-sub">本地记账 · 数据只在这台手机上</span></span>
<span class="row-value muted" id="set-version">${esc(st.appVersion || '读取中…')}</span>
</div>
<div class="row tappable" data-act="check-update">
<span class="row-main"><span class="row-title">检查更新</span>
<span class="row-sub">看看有没有新版本；有新版本会自动刷新</span></span>
<span class="row-chev"><svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg></span>
</div>
<div class="row">
<span class="row-main"><span class="row-title">数据存放位置</span>
<span class="row-sub pre">只存在这台手机的浏览器数据库里，不联网、不上传。轻账没有任何服务器。</span></span>
</div>
<div class="row">
<span class="row-main"><span class="row-title">已知限制</span>
<span class="row-sub pre">无法自动读取微信/支付宝的交易，只能靠导入账单和手动记账。iPhone 上网页应用超过 7 天不打开，系统可能清理本地数据，请定期导出备份。</span></span>
</div>
</div>

<div class="px16 tiny muted center" style="padding-bottom:20px">
轻账 ${esc(st.appVersion || '')} · 为 iPhone 打造 · 人民币计价
</div>
`;


const autoEl = root.querySelector('#set-autotheme');
const darkEl = root.querySelector('#set-dark');
if (autoEl) autoEl.addEventListener('change', async () => {
if (autoEl.checked) {
document.documentElement.removeAttribute('data-theme');
await store.setSetting('theme', '');
} else {
document.documentElement.dataset.theme = 'dark';
await store.setSetting('theme', 'dark');
darkEl.checked = true;
}
});
if (darkEl) darkEl.addEventListener('change', async () => {
if (autoEl.checked) {
autoEl.checked = false;
}
const dark = darkEl.checked;
if (dark) document.documentElement.dataset.theme = 'dark';
else document.documentElement.dataset.theme = 'light';
await store.setSetting('theme', dark ? 'dark' : 'light');
});
}


function customCatCount() {
return CATEGORIES.filter((c) => !c.builtin).length + INCOME_CATEGORIES.filter((c) => !c.builtin).length;
}


function offlineLabel(st) {
switch (st.offlineCheck) {
case 'ok': return '已开启';
case 'pending': return '检查中';
case 'insecure': return '未开启';
case 'unsupported': return '不支持';
case 'failed': return '失败';
default: return '未知';
}
}








function offlineExplain(st) {
switch (st.offlineCheck) {
case 'ok':
return '飞行模式下也能打开和记账';
case 'pending':
return '正在向浏览器确认…（通常几秒内完成；如果一直停在这里，点下面的「检查更新」试试）';
case 'insecure':
return '当前地址不是 HTTPS（也不是 localhost），浏览器不允许网页应用做离线缓存。用 https 地址打开就能开启。';
case 'unsupported':
return '这个浏览器不支持离线缓存（Service Worker），换用 Safari 打开。';
case 'failed':
return `注册失败：${st.offlineError || '未知原因'}。点「检查更新」重试一次，还不行就是网络或浏览器限制了。`;
default:
return '状态未知';
}
}

function row(icon, title, sub, act) {
return `<div class="row tappable" data-act="${esc(act)}">
<span class="row-icon">${icon}</span>
<span class="row-main"><span class="row-title">${esc(title)}</span>${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</span>
<span class="row-chev"><svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg></span>
</div>`;
}

/* ------------------------------------------------------------------ *
* 备份 / 恢复
* ------------------------------------------------------------------ */

function openBackupSheet() {
openSheet({
title: '导出加密备份',
leftLabel: '取消',
rightLabel: '导出',
onRight: async (api) => {
const input = api.body.querySelector('#bk-pwd');
const pwd = input.value;
if (!pwd || pwd.length < 4) { toastErr('密码至少 4 位'); return; }
if (api.body.querySelector('#bk-pwd2').value !== pwd) { toastErr('两次输入的密码不一致'); return; }

api.setRightDisabled(true);
try {
const payload = await db.exportAll();
const text = await encryptBackup(payload, pwd);
const fname = backupFileName();
const how = await saveTextFile(fname, text, 'application/octet-stream');
api.close();
if (how === 'shared') toastOk('已导出，请在分享面板里选「存储到"文件"」保存到 iCloud Drive', 5000);
else if (how === 'cancelled') toastWarn('已取消');
else toastOk('已导出：' + fname, 4000);
} catch (e) {
toastErr('导出失败：' + (e && e.message ? e.message : e));
api.setRightDisabled(false);
}
},
render: (body) => {
body.innerHTML = `
<div class="alert info" style="margin-top:4px">
<span class="ico">🔐</span>
<div><div class="t">备份会用你设的密码加密</div>
<div class="d">用的是 AES-256 加密，和银行 App 同一级别的算法。密码丢了就再也打不开备份，轻账也没有办法帮你找回。</div></div>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>设置备份密码（至少 4 位）</label>
<input type="text" id="bk-pwd" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例如你的学号后 4 位">
</div>
<div class="field">
<label>再输一次</label>
<input type="text" id="bk-pwd2" autocomplete="off" autocapitalize="off" spellcheck="false">
</div>
</div>
<div class="px16 mb16 small muted">
导出后：
<br>1. iPhone 上会弹出系统分享面板
<br>2. 选「存储到"文件"」
<br>3. 存到 iCloud Drive 里，换手机或重装也不怕丢
</div>`;
},
});
}

function openRestoreSheet() {
openSheet({
title: '从备份恢复',
leftLabel: '取消',
rightLabel: '选择文件',
onRight: (api) => {
pickBackupFile(async (file) => {
api.close();
await doRestore(file);
});
},
render: (body) => {
body.innerHTML = `
<div class="alert warn" style="margin-top:4px">
<span class="ico">⚠️</span>
<div><div class="t">恢复会合并数据</div>
<div class="d">备份里的交易会加进来，跟现在已有的按 ID 去重，不会删掉你现在记的东西。</div></div>
</div>
<div class="px16 mb16 small muted">选择一个 .qzbak 备份文件（可以从 iCloud Drive 或「最近项目」里找）。</div>`;
},
});
}

let backupFileCallback = null;

function initBackupPicker() {
const input = document.getElementById('backup-input');
if (!input) return;
input.addEventListener('change', () => {
const f = (input.files || [])[0];
input.value = '';
if (f && backupFileCallback) backupFileCallback(f);
});
}

function pickBackupFile(cb) {
const input = document.getElementById('backup-input');
if (!input) { toastErr('当前环境不支持选择文件'); return; }
backupFileCallback = cb;
input.click();
}

async function doRestore(file) {
const pwd = await promptSheet({
title: '输入备份密码',
message: `即将恢复：${file.name}`,
inputType: 'text',
placeholder: '备份时设置的密码',
confirmLabel: '解密',
});
if (pwd == null) return;

let text;
try {
text = await file.text();
} catch (e) {
toastErr('读取文件失败');
return;
}

let payload;
try {
payload = await decryptBackup(text, pwd);
} catch (e) {
toastErr(e && e.message ? e.message : '解密失败', 4000);
return;
}

const counts = payload && payload.counts ? payload.counts : null;
const summary = counts
? `备份里有 ${counts.tx} 笔交易、${counts.rules} 条分类规则。`
: `备份里有 ${(payload.data && payload.data.tx || []).length} 笔交易。`;

const ok = await confirmSheet({
title: '确认恢复？',
message: summary + '\n\n备份时间：' + (payload.exportedAt ? fmtDate(payload.exportedAt) : '未知'),
confirmLabel: '恢复',
});
if (!ok) return;

try {
const r = await db.importAll(payload, 'merge');
await store.reloadAll();
toastOk(`恢复完成：新增 ${r.importedTx} 笔${r.skipped ? '，跳过 ' + r.skipped + ' 笔已存在' : ''}`, 4000);
} catch (e) {
toastErr('恢复失败：' + (e && e.message ? e.message : e));
}
}

/* ------------------------------------------------------------------ *
* 导出 CSV
* ------------------------------------------------------------------ */

async function exportCSV() {
const txs = store.state.txs.slice().sort((a, b) => b.ts - a.ts);
if (!txs.length) { toastWarn('还没有数据可以导出'); return; }

const headers = ['时间', '类型', '分类', '商户', '说明', '金额(元)', '收支', '来源', '支付方式', '备注', '是否重复', '不计入统计', '攒钱', '攒钱方向'];
const lines = [headers.join(',')];
for (const t of txs) {
const ty = txType(t.type);
const c = getCategory(t.category);
lines.push([
fmtDate(t.ts) + ' ' + new Date(t.ts).toTimeString().slice(0, 5),
ty.name,
c.name,
t.merchant,
t.description,
(t.amountCents / 100).toFixed(2),
ty.direction === 'in' ? '收入' : '支出',
t.source,
t.account,
t.note,
t.duplicateOf ? '是' : '',
t.excluded ? '是' : '',

t.savings ? '是' : '',
t.savings ? (t.savingsDirection === 'out' ? '取出' : '存入') : '',
].map(csvCell).join(','));
}

const text = '\uFEFF' + lines.join('\r\n');
const stamp = new Date();
const p = (n) => String(n).padStart(2, '0');
const fname = `轻账明细-${stamp.getFullYear()}${p(stamp.getMonth() + 1)}${p(stamp.getDate())}.csv`;
const how = await saveTextFile(fname, text, 'text/csv');
if (how === 'shared') toastOk('已导出，可在分享面板里存到「文件」', 4000);
else if (how === 'downloaded') toastOk('已导出：' + fname);
}

function csvCell(v) {
const s = String(v == null ? '' : v);
if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
return s;
}





function openRulesSheet() {
openSheet({
title: '我教过的分类',
leftLabel: '关闭',
rightLabel: '清空',
height: '70vh',
onRight: async (api) => {
if (!store.state.rules.length) return;
const ok = await confirmSheet({
title: '清空所有分类规则？',
message: '清空后，轻账会忘掉你改过的分类，回到内置的自动判断。已经记好的交易分类不会变。',
confirmLabel: '清空',
danger: true,
});
if (!ok) return;
await store.clearRules();
toastOk('已清空');
api.close();
},
render: (body) => {
const rules = store.state.rules.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
if (!rules.length) {
body.innerHTML = `<div class="empty"><div class="big">🧠</div><div class="title">还没有学到任何规则</div>
<div class="sub">随便点开一笔交易，改一下它的分类。<br>轻账会记住这个商户，以后自动分对。</div></div>`;
return;
}
body.innerHTML = `
<div class="px16 mb16 small muted">共 ${rules.length} 条。点右边的分类可以改，点 ✕ 删掉这条。</div>
<div class="card" style="margin:0 16px 16px">
${rules.map((r) => `
<div class="row">
<span class="row-main">
<span class="row-title">${esc(r.merchant || r.key)}</span>
<span class="row-sub">匹配：${esc(r.key)}</span>
</span>
<span class="row-value small">${esc(getCategory(r.category).icon)} ${esc(getCategory(r.category).name)}</span>
<button type="button" data-del="${esc(r.key)}" style="color:var(--label-3);padding:4px 0 4px 10px;font-size:17px">✕</button>
</div>`).join('')}
</div>`;
body.addEventListener('click', async (ev) => {
const b = ev.target.closest('[data-del]');
if (!b) return;
await store.removeRule(b.dataset.del);
toastOk('已删除这条规则');
b.closest('.row').remove();
});
},
});
}





function openSelfNamesSheet() {
const cur = (store.state.settings.selfNames || []).join('、');
openSheet({
title: '我的名字 / 昵称',
rightLabel: '保存',
onRight: async (api) => {
const input = api.body.querySelector('#sn');
const list = input.value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean);
await store.setSetting('selfNames', list);
toastOk(list.length ? `已保存 ${list.length} 个名字` : '已清空');
api.close();
},
render: (body) => {
body.innerHTML = `
<div class="px16 mb16 small muted pre">填上你自己的名字、微信昵称、支付宝实名。
轻账靠这个识别「转给自己另一张卡」这种内部转账 —— 这类钱没花掉，不应该算进消费。

多个名字用顿号或逗号隔开。</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>名字</label>
<input type="text" id="sn" value="${esc(cur)}" placeholder="例如：张伟、小伟、伟伟" autocomplete="off">
</div>
</div>`;
},
});
}





function openRecurringSheet() {
openSheet({
title: '周期账单',
leftLabel: '关闭',
rightLabel: '新增',
height: '72vh',
onRight: (api) => {
api.close();
openRecurringEdit(null);
},
render: (body) => {
const rules = store.state.recurring;
if (!rules.length) {
body.innerHTML = `<div class="empty"><div class="big">🔁</div><div class="title">还没有周期账单</div>
<div class="sub">房租、订阅、话费这类每月固定支出，<br>设置一次以后自动补记，不用手动输。</div></div>`;
return;
}
body.innerHTML = `
<div class="px16 mb16 small muted">一年合计约 <b>${esc(fmtMoney(yearlyRecurringTotal(rules)))}</b>。开启的账单会在对应日期自动记账。</div>
<div class="card" style="margin:0 16px 16px">
${rules.map((r) => {
const c = getCategory(r.category);
const freq = (FREQUENCIES.find((f) => f.id === r.frequency) || {}).name || r.frequency;
return `<div class="row tappable" data-rid="${esc(r.id)}">
<span class="row-icon">${c.icon}</span>
<span class="row-main">
<span class="row-title">${esc(r.name || '未命名')}</span>
<span class="row-sub">${esc(freq)} ${r.dayOfMonth} 号 · ${esc(c.name)}${r.enabled === false ? ' · <span class="muted">已暂停</span>' : ''}</span>
</span>
<span class="row-value">${esc(fmtMoney(r.amountCents))}</span>
</div>`;
}).join('')}
</div>`;
body.addEventListener('click', (ev) => {
const row = ev.target.closest('[data-rid]');
if (!row) return;
const rule = store.state.recurring.find((r) => r.id === row.dataset.rid);
if (rule) openRecurringEdit(rule);
});
},
});
}

function openRecurringEdit(rule) {
const isNew = !rule;
const st = rule
? { ...rule }
: { id: '', name: '', amountCents: 0, category: 'subs', type: 'expense', frequency: 'monthly', dayOfMonth: 1, enabled: true };

openSheet({
title: isNew ? '新增周期账单' : '编辑周期账单',
rightLabel: '保存',
onRight: async (api) => {
const name = api.body.querySelector('#rc-name').value.trim();
const amt = parseFloat(api.body.querySelector('#rc-amt').value);
const day = parseInt(api.body.querySelector('#rc-day').value, 10);
if (!name) { toastErr('请填名称'); return; }
if (!Number.isFinite(amt) || amt <= 0) { toastErr('请填金额'); return; }
if (!Number.isFinite(day) || day < 1 || day > 31) { toastErr('日期请填 1-31'); return; }

st.name = name;
st.amountCents = Math.round(amt * 100);
st.category = api.body.querySelector('#rc-cat').value;
st.frequency = api.body.querySelector('#rc-freq').value;
st.dayOfMonth = day;
st.enabled = api.body.querySelector('#rc-on').checked;
st.type = 'expense';

if (isNew) {
const { makeRecurring } = await __rmod("src/core/recurring.js");
const r = makeRecurring(st);
r.startMonth = curMonthKey();
await store.saveRecurring(r);
await store.runRecurring();
} else {
st.updatedAt = Date.now();
await store.saveRecurring(st);
}
toastOk('已保存');
api.close();
},
render: (body) => {
body.innerHTML = `
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>名称</label>
<input type="text" id="rc-name" value="${esc(st.name)}" placeholder="例如：房租、iCloud、话费" autocomplete="off">
</div>
<div class="field">
<label>金额（元）</label>
<input type="number" inputmode="decimal" id="rc-amt" value="${st.amountCents ? (st.amountCents / 100).toFixed(2) : ''}" placeholder="0.00">
</div>
<div class="field inline">
<label>分类</label>
<select id="rc-cat" style="width:auto;flex:0 0 auto;direction:rtl">
${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === st.category ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}
</select>
</div>
<div class="field inline">
<label>频率</label>
<select id="rc-freq" style="width:auto;flex:0 0 auto;direction:rtl">
${FREQUENCIES.map((f) => `<option value="${f.id}" ${f.id === st.frequency ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
</select>
</div>
<div class="field inline">
<label>每月几号</label>
<input type="number" inputmode="numeric" id="rc-day" min="1" max="31" value="${st.dayOfMonth}" style="max-width:30%">
</div>
<div class="field inline">
<label>启用</label>
<span class="switch"><input type="checkbox" id="rc-on" ${st.enabled !== false ? 'checked' : ''}><i></i></span>
</div>
</div>
${!isNew ? `<div class="btn-row"><button type="button" class="btn danger" id="rc-del">删除</button></div>` : ''}
`;
const delBtn = body.querySelector('#rc-del');
if (delBtn) delBtn.addEventListener('click', async () => {
await store.removeRecurring(st.id);
toastOk('已删除');
document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
});
},
});
}

function curMonthKey() {
const d = new Date();
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
* 清理重复 / 清空数据
* ------------------------------------------------------------------ */

async function cleanDuplicates() {
const dups = store.state.txs.filter((t) => t.duplicateOf);
if (!dups.length) {
toastOk('没有发现重复交易');
return;
}
const ok = await confirmSheet({
title: `删除 ${dups.length} 笔重复交易？`,
message: '这些是被判定为重复的交易（不计入统计）。删除后它们在明细里也不会再出现。',
confirmLabel: '删除',
danger: true,
});
if (!ok) return;
await store.removeTxMany(dups.map((t) => t.id));
toastOk(`已删除 ${dups.length} 笔`);
}

async function clearAllData() {
const ok = await confirmSheet({
title: '清空所有数据？',
message: '所有交易、规则、预算都会被删除，无法恢复。\n\n如果你还没导出备份，建议先取消，去「导出加密备份」存一份。',
confirmLabel: '确认清空',
danger: true,
});
if (!ok) return;

const really = await confirmSheet({
title: '最后确认',
message: '真的要清空吗？这些数据删掉就找不回来了。',
confirmLabel: '清空',
danger: true,
});
if (!really) return;

await db.clearAllData();
await store.reloadAll();
store.setTab('home');
toastOk('已清空');
}
    return { renderSettings, openBackupSheet, openRestoreSheet, initBackupPicker, exportCSV, openRulesSheet, openSelfNamesSheet, openRecurringSheet, openRecurringEdit, cleanDuplicates, clearAllData };
  };

  /* ---------- src/ui/category-sheets.js ---------- */
  __mods["src/ui/category-sheets.js"] = function (__rmod) {
    var { CATEGORIES, INCOME_CATEGORIES, CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES } = __rmod("src/core/model.js");
    var { addCategory, updateCategory, deleteCategory, resetCategories, countTxInCategory, listAll, listCustom } = __rmod("src/core/categories.js");
    var { openSheet, toastOk, toastErr, confirmSheet, esc } = __rmod("src/ui/dom.js");
    var store = __rmod("src/ui/store.js");






















function bind(root, selector, event, handler) {
const el = root.querySelector(selector);
if (!el) {
console.error(`[轻账] 界面上找不到 ${selector}，事件未绑定`);
return null;
}
el.addEventListener(event, handler);
return el;
}





function openCategoryManager() {
let lane = 'expense';

openSheet({
title: '分类管理',
leftLabel: '关闭',
rightLabel: '新建',
height: '78vh',
onRight: (api) => openCategoryEditor({ lane, onDone: () => api.close() && openCategoryManager() }),
render: (body, api) => {

api.setRightHandler(() => openCategoryEditor({
lane,
onDone: () => { api.close(); openCategoryManager(); },
}));

function draw() {
const all = listAll(lane);
const customCount = all.filter((c) => !c.builtin).length;

body.innerHTML = `
<div class="seg" id="cm-lane" style="margin:8px 16px 14px">
<button type="button" data-lane="expense" class="${lane === 'expense' ? 'active' : ''}">支出分类</button>
<button type="button" data-lane="income" class="${lane === 'income' ? 'active' : ''}">收入分类</button>
</div>

<div class="px16 mb16 small muted">
${lane === 'expense'
? '支出分类用在「消费比例」里。'
: '收入分类只用来给收入归类，不参与消费比例。'}
内置的 ${all.length - customCount} 个不能改名或删除，但你自己的可以随便改。
</div>

<div class="section-title">${lane === 'expense' ? '支出' : '收入'}分类（${all.length}）</div>
<div class="card" style="margin:0 16px 16px">
${all.map((c) => `
<div class="row ${c.builtin ? '' : 'tappable'}" ${c.builtin ? '' : `data-edit="${esc(c.id)}"`}>
<span class="row-icon" ${c.color ? `style="background:${esc(c.color)}22"` : ''}>${c.icon}</span>
<span class="row-main">
<span class="row-title">${esc(c.name)}</span>
<span class="row-sub">${c.builtin ? '内置分类' : '自定义'}${c.id === (lane === 'expense' ? 'other' : 'other_in') ? ' · 兜底用' : ''}</span>
</span>
${c.builtin
? '<span class="row-value muted small">内置</span>'
: `<span class="row-chev">${chevSvg()}</span>`}
</div>`).join('')}
</div>

${customCount ? `
<div class="btn-row">
<button type="button" class="btn" id="cm-reset">删除全部自定义分类</button>
</div>` : ''}

<div class="px16 tiny muted" style="padding-bottom:20px">
删除一个分类时，原来用它记的账会自动改到「${lane === 'expense' ? '其他' : '其他收入'}」，
轻账会告诉你影响了几笔。
</div>
`;

bind(body, '#cm-lane', 'click', (ev) => {
const b = ev.target.closest('[data-lane]');
if (!b) return;
lane = b.dataset.lane;
draw();
});

body.querySelectorAll('[data-edit]').forEach((row) => {
row.addEventListener('click', () => {
const cat = all.find((c) => c.id === row.dataset.edit);
if (cat) openCategoryEditor({ cat, lane, onDone: () => { api.close(); openCategoryManager(); } });
});
});

const resetBtn = body.querySelector('#cm-reset');
if (resetBtn) {
resetBtn.addEventListener('click', async () => {
const n = listCustom(lane).length;
const ok = await confirmSheet({
title: `删除全部 ${n} 个自定义分类？`,
message: `用它们记的账会改到「${lane === 'expense' ? '其他' : '其他收入'}」。\n内置分类不受影响。`,
confirmLabel: '删除',
danger: true,
});
if (!ok) return;
try {
const r = await resetCategories(lane);
await store.reloadAll();
toastOk(`已删除 ${r.removed} 个分类，${r.movedTx} 笔交易改到了「其他」`);
draw();
} catch (e) {
toastErr('操作失败：' + (e && e.message ? e.message : e));
}
});
}
}

draw();
},
});
}

/* ------------------------------------------------------------------ *
* 新建 / 编辑单个分类
* ------------------------------------------------------------------ */

function openCategoryEditor(opts = {}) {
const editing = opts.cat || null;
let lane = opts.lane || 'expense';
const isNew = !editing;

const st = {
name: editing ? editing.name : '',
icon: editing ? editing.icon : '🏷️',
color: editing ? (editing.color || '#8E8E93') : '#8E8E93',
};

openSheet({
title: isNew ? '新建分类' : '编辑分类',
leftLabel: '取消',
rightLabel: isNew ? '创建' : '保存',
height: '80vh',
onRight: async (api) => { await save(api); },
render: (body, api) => {
body.innerHTML = `
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>分类名称（最多 12 个字）</label>
<input type="text" id="ce-name" value="${esc(st.name)}" placeholder="例如：养猫、实验室、护肤" autocomplete="off" maxlength="12">
</div>
${isNew ? `
<div class="field inline">
<label>算在哪一侧</label>
<select id="ce-lane" style="width:auto;flex:0 0 auto;direction:rtl">
<option value="expense" ${lane === 'expense' ? 'selected' : ''}>支出</option>
<option value="income" ${lane === 'income' ? 'selected' : ''}>收入</option>
</select>
</div>` : ''}
</div>

<div class="section-title">选个图标</div>
<div class="icon-grid" id="ce-icons">
${CATEGORY_ICON_CHOICES.map((e) => `
<button type="button" data-icon="${esc(e)}" class="${e === st.icon ? 'active' : ''}">${e}</button>`).join('')}
</div>

<div class="section-title">选个颜色</div>
<div class="color-grid" id="ce-colors">
${CATEGORY_COLOR_CHOICES.map((c) => `
<button type="button" data-color="${esc(c)}" style="background:${esc(c)}" class="${c === st.color ? 'active' : ''}" aria-label="${esc(c)}"></button>`).join('')}
</div>

<div class="section-title">预览</div>
<div class="card" style="margin:0 16px 16px">
<div class="row">
<span class="row-icon" id="ce-preview-bg" style="background:${esc(st.color)}22">
<span id="ce-preview-icon">${st.icon}</span>
</span>
<span class="row-main">
<span class="row-title" id="ce-preview-name">${esc(st.name || '分类名称')}</span>
<span class="row-sub">在明细和占比里会这样显示</span>
</span>
</div>
</div>

${!isNew ? `
<div class="px16 mb16" id="ce-usage"></div>
<div class="btn-row">
<button type="button" class="btn danger" id="ce-del">删除这个分类</button>
</div>` : ''}
`;

const nameEl = body.querySelector('#ce-name');
const iconsEl = body.querySelector('#ce-icons');
const colorsEl = body.querySelector('#ce-colors');

function renderPreview() {
const n = body.querySelector('#ce-preview-name');
const i = body.querySelector('#ce-preview-icon');
const bg = body.querySelector('#ce-preview-bg');
if (n) n.textContent = st.name || '分类名称';
if (i) i.textContent = st.icon;
if (bg) bg.style.background = st.color + '22';
if (iconsEl) {
for (const b of iconsEl.querySelectorAll('button')) {
b.classList.toggle('active', b.dataset.icon === st.icon);
}
}
if (colorsEl) {
for (const b of colorsEl.querySelectorAll('button')) {
b.classList.toggle('active', b.dataset.color === st.color);
}
}
}

if (nameEl) nameEl.addEventListener('input', () => { st.name = nameEl.value; renderPreview(); });
if (iconsEl) {
iconsEl.addEventListener('click', (ev) => {
const b = ev.target.closest('[data-icon]');
if (!b) return;
st.icon = b.dataset.icon;
renderPreview();
});
}
if (colorsEl) {
colorsEl.addEventListener('click', (ev) => {
const b = ev.target.closest('[data-color]');
if (!b) return;
st.color = b.dataset.color;
renderPreview();
});
}

const laneEl = body.querySelector('#ce-lane');
if (laneEl) laneEl.addEventListener('change', () => { lane = laneEl.value; });

// 编辑模式：显示用了多少笔，并提供删除
if (!isNew) {
countTxInCategory(editing.id).then((n) => {
const box = body.querySelector('#ce-usage');
if (box) {
box.innerHTML = `<div class="alert info" style="margin:0">
<span class="ico">📊</span>
<div><div class="t">已经用了 ${n} 笔</div>
<div class="d">${n ? '删除这个分类后，这些交易会改到「' + (lane === 'expense' ? '其他' : '其他收入') + '」。' : '还没有交易用这个分类。'}</div></div>
</div>`;
}
}).catch(() => {});

bind(body, '#ce-del', 'click', async () => {
const n = await countTxInCategory(editing.id).catch(() => 0);
const ok = await confirmSheet({
title: `删除分类「${editing.name}」？`,
message: n
? `有 ${n} 笔交易用着这个分类，删除后它们会改到「${lane === 'expense' ? '其他' : '其他收入'}」。\n指向这个分类的分类规则也会一起删掉。`
: '目前没有交易用这个分类。',
confirmLabel: '删除',
danger: true,
});
if (!ok) return;
try {
const r = await deleteCategory(editing.id, lane);
await store.reloadAll();
toastOk(r.movedTx ? `已删除，${r.movedTx} 笔改到了「其他」` : '已删除');
api.close();
if (opts.onDone) opts.onDone();
} catch (e) {
toastErr('删除失败：' + (e && e.message ? e.message : e));
}
});
}

// 自动聚焦到名字输入框（延时是为了等弹层升起动画）
// 必须判空：假 DOM 或结构变动时 nameEl 可能是 null，
// 直接在 setTimeout 里调用 .focus() 会抛出无法定位的 TypeError。
setTimeout(() => {
if (isNew && nameEl && typeof nameEl.focus === 'function') nameEl.focus();
}, 320);
},
});

async function save(api) {
const name = st.name.trim();
if (!name) { toastErr('请填分类名称'); return; }
try {
if (isNew) {
const cat = await addCategory({ name, icon: st.icon, color: st.color, lane });
await store.reloadAll();
toastOk(`已创建「${cat.name}」`);
} else {
await updateCategory(editing.id, { name, icon: st.icon, color: st.color }, lane);
await store.reloadAll();
toastOk('已保存');
}
api.close();
if (opts.onDone) opts.onDone();
} catch (e) {
toastErr(e && e.message ? e.message : '保存失败');
}
}
}

function chevSvg() {
return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
    return { openCategoryManager, openCategoryEditor };
  };

  /* ---------- src/ui/screen-savings.js ---------- */
  __mods["src/ui/screen-savings.js"] = function (__rmod) {
    var { ym, monthLabelFull, category: getCategory } = __rmod("src/core/model.js");
    var { computeSavings, loadSettings, saveSettings, recordSavings, isSavings, findSavingsCandidates, markMerchantAsSavings, markAsSavings, unmarkAsSavings } = __rmod("src/core/savings.js");
    var { esc, fmtMoney, fmtDate, openSheet, toastOk, toastErr, toastWarn, confirmSheet, promptSheet } = __rmod("src/ui/dom.js");
    var store = __rmod("src/ui/store.js");












function renderSavings(root) {
const all = store.state.txs;
const settings = store.state.savingsSettings || null;

if (!settings) {
root.innerHTML = '<div class="spin"></div>';

loadSettings().then((s) => {
store.state.savingsSettings = s;
store.notify(true);
}).catch(() => {});
return;
}

const sv = computeSavings(all, settings);
const hasGoal = !!sv.goal;
const hasMonthly = !!sv.monthlyTarget;

root.innerHTML = `
<div class="hero" style="padding-bottom:6px">
<div class="hero-label">一共产下</div>
<div class="hero-value" style="color:var(--green)">${esc(fmtMoney(sv.balance))}</div>
<div class="hero-delta">
${sv.eventCount ? `共 ${sv.eventCount} 笔记录 · 存进 ${esc(fmtMoney(sv.totalIn, { decimals: 0 }))}${sv.totalOut ? ' · 取出 ' + esc(fmtMoney(sv.totalOut, { decimals: 0 })) : ''}` : '还没有攒钱记录'}
${sv.baselineCents ? `<br><span class="muted">其中含开始记账前的原有存款 ${esc(fmtMoney(sv.baselineCents))}</span>` : ''}
</div>
</div>

<div class="btn-row" style="padding-top:4px">
<button type="button" class="btn primary" data-sv="in">存一笔</button>
<button type="button" class="btn" data-sv="out">取出一笔</button>
</div>

${hasGoal ? renderGoal(sv) : renderGoalPrompt(sv)}

${hasMonthly ? renderMonthly(sv) : ''}

${sv.forecast ? `
<div class="alert info">
<span class="ico">📈</span>
<div><div class="t">按现在的速度，大约 ${esc(fmtMoney(sv.forecast.avgMonthlySaved, { decimals: 0 }))} / 月</div>
<div class="d">照这个速度，${sv.forecast.monthsNeeded} 个月后（约 ${esc(monthLabelFull(sv.forecast.etaMonth))}）能攒到目标。</div></div>
</div>` : ''}

${sv.pendingTotal > 0 ? `
<div class="alert warn">
<span class="ico">💡</span>
<div><div class="t">有 ${esc(fmtMoney(sv.pendingTotal))} 「该攒但还没转走」</div>
<div class="d">这是各月结余里没变成实际存款的部分。
钱留在余额里很容易花掉 —— 攒钱的关键就是把它转走。</div></div>
</div>` : ''}

${renderSurplusTable(sv)}

${renderHistory(sv)}

<div class="section-title">设置</div>
<div class="card" style="margin:0 16px 16px">
${settingRow('🎯', '攒钱目标', hasGoal ? esc(sv.goal.label || fmtMoney(sv.goal.target, { decimals: 0 })) : '还没设', 'goal')}
${settingRow('📅', '每月攒钱目标', hasMonthly ? esc(fmtMoney(sv.monthlyTarget.target, { decimals: 0 })) : '还没设', 'monthly')}
${settingRow('🏦', '攒钱账户名', esc(sv.settings.account || '未设置'), 'account')}
${settingRow('🔍', '从账单里找出攒钱记录', '帮你把以前的转账标成攒钱', 'scan')}
</div>

<div class="px16 tiny muted" style="padding-bottom:24px">
攒钱记录不计入消费，也不计入收入 —— 它只是钱在你自己的账户之间移动。
</div>
`;
}

/* ------------------------------------------------------------------ *
* 目标
* ------------------------------------------------------------------ */

function renderGoal(sv) {
const g = sv.goal;
const pct = Math.min(100, g.percent);
const cls = g.done ? 'green' : 'var(--green)';
return `
<div class="section-title between">
<span>攒钱目标</span>
<span class="link" data-sv="goal">修改</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="ring-row">
<div class="ring">${ring(g.percent / 100, g.done ? 'ok' : 'none', g.done ? '已达成' : '进度', g.percent.toFixed(0) + '%')}</div>
<div class="ring-info">
<div class="big">${esc(fmtMoney(g.saved))}</div>
<div class="sub">
${g.label ? esc(g.label) + '<br>' : ''}
目标 ${esc(fmtMoney(g.target))}<br>
${g.done
? '<span class="green">已经达成 🎉</span>'
: `还差 <b>${esc(fmtMoney(g.remaining))}</b>`}
${g.byMonth ? `<br>计划 ${esc(monthLabelFull(g.byMonth))} 前完成` : ''}
</div>
</div>
</div>
</div>`;
}

function renderGoalPrompt(sv) {
return `
<div class="section-title">攒钱目标</div>
<div class="card" style="margin:0 16px 16px">
<div class="row tappable" data-sv="goal">
<span class="row-icon">🎯</span>
<span class="row-main">
<span class="row-title">设一个目标</span>
<span class="row-sub">比如「攒够 5000 换电脑」，看着进度条一点点满会很有动力</span>
</span>
<span class="row-chev">${chevSvg()}</span>
</div>
</div>`;
}

function renderMonthly(sv) {
const m = sv.monthlyTarget;
const pct = Math.min(100, m.percent);
const reached = m.saved >= m.target;
return `
<div class="section-title between">
<span>这个月的攒钱目标</span>
<span class="link" data-sv="monthly">修改</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="cat-budget" style="padding:14px 16px">
<div class="head">
<span>${reached ? '✅' : '📅'}</span>
<span>${esc(monthLabelFull(ym(new Date())))}</span>
<span class="amt">${esc(fmtMoney(m.saved))} <span class="muted tiny">/ ${esc(fmtMoney(m.target, { decimals: 0 }))}</span></span>
</div>
<div class="bar"><i style="width:${pct}%;background:${reached ? 'var(--green)' : 'var(--blue)'}"></i></div>
<div class="foot">
<span>${reached ? '这个月达标了' : '还差 ' + esc(fmtMoney(m.remaining))}</span>
<span>${m.percent.toFixed(0)}%</span>
</div>
</div>
</div>`;
}

/* ------------------------------------------------------------------ *
* 月度对照表
* ------------------------------------------------------------------ */

function renderSurplusTable(sv) {
const rows = sv.surplusRows;
if (!rows.length) {
return `<div class="section-title">每月对照</div>
<div class="card" style="margin:0 16px 16px"><div class="empty" style="padding:28px">
<div class="sub">还没有数据。有收入也有消费之后，这里会告诉你每个月「本该攒多少、实际攒了多少」。</div>
</div></div>`;
}

return `
<div class="section-title between">
<span>每月对照</span>
<span class="link" style="color:var(--label-2);font-weight:400">结余 vs 实攒</span>
</div>
<div class="card" style="margin:0 16px 16px">
${rows.slice(0, 8).map((r) => {
// 三种情况分开显示，别混在一起：
//   有收支且实攒 ≥ 结余 → 达标
//   有收支但没转走        → 提醒待转
//   有收支但花的比赚的多  → 标超支
//   没记过生活收支        → 老实说「这个月没记收支」，不下任何结论
const mark = !r.hasFlow ? '·'
: r.overspent ? '⚠️'
: (r.pendingCents > 0 ? '💡' : '✅');

let flowLine;
if (!r.hasFlow) {
flowLine = '<span class="muted">这个月只记了攒钱，没有收支记录</span>';
} else {
flowLine = `收入 ${esc(fmtMoney(r.income, { decimals: 0 }))} · 消费 ${esc(fmtMoney(r.spent, { decimals: 0 }))}`;
}

let rightLine;
if (!r.hasFlow) rightLine = '';
else if (r.overspent) rightLine = `<span class="red">这个月花的比赚的多 ${esc(fmtMoney(r.overspendCents, { decimals: 0 }))}</span>`;
else rightLine = `结余 ${esc(fmtMoney(r.surplusCents, { decimals: 0 }))}`;

return `<div class="cat-budget">
<div class="head">
<span>${mark}</span>
<span>${esc(monthLabelFull(r.month))}</span>
<span class="amt">实攒 ${esc(fmtMoney(r.savedCents, { decimals: 0 }))}</span>
</div>
<div class="foot" style="margin-top:6px">
<span>${flowLine}</span>
<span>${rightLine}</span>
</div>
${r.pendingCents > 0 ? `<div class="foot"><span class="orange">💡 还有 ${esc(fmtMoney(r.pendingCents))} 没转走</span><span></span></div>` : ''}
${r.oversaved ? `<div class="foot"><span class="green">实攒比结余还多 ${esc(fmtMoney(r.savedCents - r.surplusCents, { decimals: 0 }))}，可能在动用以前的存款</span><span></span></div>` : ''}
</div>`;
}).join('')}
</div>`;
}

/* ------------------------------------------------------------------ *
* 明细
* ------------------------------------------------------------------ */

function renderHistory(sv) {
if (!sv.events.length) return '';
const list = [...sv.events].reverse().slice(0, 20);

return `
<div class="section-title between">
<span>攒钱明细</span>
<span class="link" style="color:var(--label-2);font-weight:400">最近 ${list.length} 笔</span>
</div>
<div class="card tx-list" style="margin:0 16px 16px">
${list.map((e) => `
<div class="row tappable" data-sv-tx="${esc(e.tx.id)}">
<span class="row-icon">${e.delta >= 0 ? '🏦' : '↩️'}</span>
<span class="row-main">
<span class="row-title">${e.delta >= 0 ? '存进去' : '取出来'}${e.note ? ' · ' + esc(e.note) : ''}</span>
<span class="row-sub">${esc(fmtDate(e.ts))} · 余额 ${esc(fmtMoney(e.balanceAfter, { decimals: 0 }))}</span>
</span>
<span class="row-value ${e.delta >= 0 ? 'in' : ''}">${e.delta >= 0 ? '+' : '-'}${esc(fmtMoney(e.amountCents).slice(1))}</span>
</div>`).join('')}
</div>`;
}

function settingRow(icon, title, sub, act) {
return `<div class="row tappable" data-sv="${esc(act)}">
<span class="row-icon">${icon}</span>
<span class="row-main"><span class="row-title">${esc(title)}</span>
${sub ? `<span class="row-sub">${sub}</span>` : ''}</span>
<span class="row-chev">${chevSvg()}</span>
</div>`;
}

/* ------------------------------------------------------------------ *
* 弹层
* ------------------------------------------------------------------ */

/** 存一笔 / 取出一笔 */
function openSavingsEntry(direction) {
const dir = direction === 'out' ? 'out' : 'in';
const st = { amount: '', note: '', date: fmtDate(Date.now()) };

openSheet({
title: dir === 'in' ? '存一笔' : '取出一笔',
rightLabel: '保存',
onRight: async (api) => {
const cents = Math.round(parseFloat(st.amount) * 100);
if (!Number.isFinite(cents) || cents <= 0) { toastErr('请先输入金额'); return; }
try {
const settings = store.state.savingsSettings || await loadSettings();
const tx = await recordSavings({
amountCents: cents,
direction: dir,
note: st.note,
ts: new Date(st.date + 'T12:00:00').getTime(),
settings,
});
await store.reloadAll();
toastOk(dir === 'in' ? `已存下 ${fmtMoney(cents)}` : `已取出 ${fmtMoney(cents)}`);
api.close();
void tx;
} catch (e) {
toastErr(e && e.message ? e.message : '保存失败');
}
},
render: (body) => {
body.innerHTML = `
<div class="amount-display" id="sv-amount" style="padding-top:8px">
<span class="placeholder">¥0.00</span>
</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>金额（元）</label>
<input type="number" inputmode="decimal" id="sv-amt" placeholder="0.00" autocomplete="off">
</div>
<div class="field">
<label>备注（可选）</label>
<input type="text" id="sv-note" placeholder="${dir === 'in' ? '例如：这个月生活费剩的' : '例如：买书、急用'}" autocomplete="off">
</div>
<div class="field inline">
<label>日期</label>
<input type="date" id="sv-date" value="${esc(st.date)}" style="width:auto;flex:0 0 auto">
</div>
</div>
<div class="px16 mb16 small muted">
${dir === 'in'
? '这笔会被记成「内部转账」，<b>不算消费也不算收入</b>，只影响你的攒钱总额。'
: '取出来也<b>不算收入</b>，它只是让你的攒钱总额减少。'}
</div>
<div class="btn-row"><button type="button" class="btn primary" id="sv-save">保存</button></div>
`;

const amtEl = body.querySelector('#sv-amt');
const display = body.querySelector('#sv-amount');
amtEl.addEventListener('input', () => {
st.amount = amtEl.value;
const c = Math.round(parseFloat(st.amount) * 100);
display.innerHTML = Number.isFinite(c) && c > 0
? `<span class="cur">¥</span>${esc((c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`
: '<span class="placeholder">¥0.00</span>';
});
body.querySelector('#sv-note').addEventListener('input', (e) => { st.note = e.target.value; });
body.querySelector('#sv-date').addEventListener('change', (e) => { st.date = e.target.value; });

// 面板上的保存按钮和右上角「保存」做同一件事
const saveBtn = body.querySelector('#sv-save');
if (saveBtn) {
saveBtn.addEventListener('click', () => {
const head = document.querySelector('.sheet .sheet-head');
const right = head ? head.querySelectorAll('button')[2] : null;
if (right) right.click();
});
}
setTimeout(() => amtEl.focus(), 320);
},
});
}

/** 设置攒钱目标 */
function openSavingsGoal() {
const cur = store.state.savingsSettings || {};
openSheet({
title: '攒钱目标',
rightLabel: '保存',
onRight: async (api) => {
const body = api.body;
const target = parseFloat(body.querySelector('#sv-goal').value);
const label = body.querySelector('#sv-label').value.trim();
const by = body.querySelector('#sv-by').value;
const saved = await saveSettings({
goalCents: Number.isFinite(target) && target > 0 ? Math.round(target * 100) : 0,
goalLabel: label,
goalByMonth: /^\d{4}-\d{2}$/.test(by) ? by : '',
});
store.state.savingsSettings = saved;
await store.reloadAll();
toastOk(saved.goalCents ? '目标已保存' : '已取消目标');
api.close();
},
render: (body) => {
const g = Math.round((cur.goalCents || 0) / 100);
body.innerHTML = `
<div class="px16 mb16 small muted">目标不是必须的，但「看着进度条一点点满」比单纯记数字有动力得多。</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>目标金额（元）</label>
<input type="number" inputmode="decimal" id="sv-goal" value="${g > 0 ? g : ''}" placeholder="例如 5000，留空表示不设目标">
</div>
<div class="field">
<label>攒来做什么（可选）</label>
<input type="text" id="sv-label" value="${esc(cur.goalLabel || '')}" placeholder="例如：换电脑、旅游基金" autocomplete="off">
</div>
<div class="field inline">
<label>计划什么时候达成（可选）</label>
<input type="month" id="sv-by" value="${esc(cur.goalByMonth || '')}" style="width:auto;flex:0 0 auto">
</div>
</div>`;
},
});
}


function openMonthlyTarget() {
const cur = store.state.savingsSettings || {};
openSheet({
title: '每月攒钱目标',
rightLabel: '保存',
onRight: async (api) => {
const v = parseFloat(api.body.querySelector('#sv-monthly').value);
const saved = await saveSettings({
monthlyTargetCents: Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0,
});
store.state.savingsSettings = saved;
await store.reloadAll();
toastOk(saved.monthlyTargetCents ? '已保存' : '已取消每月目标');
api.close();
},
render: (body) => {
const m = Math.round((cur.monthlyTargetCents || 0) / 100);
body.innerHTML = `
<div class="px16 mb16 small muted">
每月固定存一点，比「月底看剩多少再存」有效得多。<br>
比如生活费 2000，计划每月存 300，就填 300。
</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>每月想存多少（元）</label>
<input type="number" inputmode="decimal" id="sv-monthly" value="${m > 0 ? m : ''}" placeholder="例如 300，留空表示不设">
</div>
</div>`;
},
});
}


function openSavingsAccount() {
const cur = store.state.savingsSettings || {};
openSheet({
title: '攒钱账户名',
rightLabel: '保存',
onRight: async (api) => {
const v = api.body.querySelector('#sv-acct').value.trim();
if (!v) { toastErr('请填一个名字'); return; }
const saved = await saveSettings({ account: v });
store.state.savingsSettings = saved;
await store.reloadAll();
toastOk('已保存');
api.close();
},
render: (body) => {
body.innerHTML = `
<div class="px16 mb16 small muted">
这是你放存款的地方，比如「余额宝」「零钱通」「招商银行储蓄卡」。<br>
账单里出现这个名字的转账，轻账会认出来问你算不算攒钱。
</div>
<div class="card" style="margin:0 16px 16px">
<div class="field">
<label>账户名</label>
<input type="text" id="sv-acct" value="${esc(cur.account || '储蓄账户')}" autocomplete="off">
</div>
</div>`;
},
});
}


function openSavingsScan() {
const all = store.state.txs;
const settings = store.state.savingsSettings || {};
const candidates = findSavingsCandidates(all, settings);

openSheet({
title: '从账单里找出攒钱记录',
leftLabel: '关闭',
height: '75vh',
render: (body, api) => {
if (!candidates.length) {
body.innerHTML = `<div class="empty"><div class="big">🔍</div>
<div class="title">没找到转账记录</div>
<div class="sub">账单里没有「转账」或「还款」类型的交易。<br>
攒钱通常是「转入余额宝」「转出到银行卡」这类，先导入账单再试。</div></div>`;
return;
}

body.innerHTML = `
<div class="px16 mb16 small muted">
下面是账单里所有的「转账 / 还款」记录（这些本来就不计入消费）。
如果你在其中看到了自己的存钱动作，点「标为攒钱」，它就会计入攒钱总额。
</div>
<div class="card" style="margin:0 16px 16px">
${candidates.map((c) => `
<div class="row">
<span class="row-icon">${c.matchesName ? '🎯' : '🔄'}</span>
<span class="row-main">
<span class="row-title">${esc(c.merchant)}</span>
<span class="row-sub">${c.count} 笔 · 共 ${esc(fmtMoney(c.cents, { decimals: 0 }))} · ${esc(fmtDate(c.firstTs))} 起${c.matchesName ? ' · 名字像你的攒钱账户' : ''}</span>
</span>
<button type="button" class="btn" data-mark="${esc(c.merchant)}" style="width:auto;min-height:34px;padding:0 14px;font-size:14px">标为攒钱</button>
</div>`).join('')}
</div>`;

body.addEventListener('click', async (ev) => {
const btn = ev.target.closest('[data-mark]');
if (!btn) return;
const merchant = btn.dataset.mark;
btn.disabled = true;
try {
const n = await markMerchantAsSavings(merchant, store.state.txs);
await store.reloadAll();
toastOk(`已把「${merchant}」的 ${n} 笔标为攒钱`);
btn.textContent = '已标记';
} catch (e) {
btn.disabled = false;
toastErr('标记失败：' + (e && e.message ? e.message : e));
}
});
},
});
}





function ring(ratio, level, label, value) {
const size = 120, thickness = 12;
const r = (size - thickness) / 2 - 2;
const cx = size / 2, cy = size / 2;
const circ = 2 * Math.PI * r;
const clamped = Math.max(0, Math.min(1, ratio));
const len = clamped * circ;
const color = level === 'ok' ? 'var(--green)'
: level === 'danger' ? 'var(--red)'
: level === 'warn' ? 'var(--orange)' : 'var(--green)';

return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:120px;margin:0 auto;display:block" role="img" aria-label="${esc(label)} ${esc(value)}">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${thickness}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${thickness}"
stroke-linecap="round"
stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
transform="rotate(-90 ${cx} ${cy})"/>
<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--label)">${esc(value)}</text>
<text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="var(--label-2)">${esc(label)}</text>
</svg>`;
}

function chevSvg() {
return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
    return { renderSavings, openSavingsEntry, openSavingsGoal, openMonthlyTarget, openSavingsAccount, openSavingsScan };
  };

  /* ---------- src/ui/app.js ---------- */
  __mods["src/ui/app.js"] = function (__rmod) {
    var { renderHome } = __rmod("src/ui/screen-home.js");
    var { renderDetail, openTxSheet } = __rmod("src/ui/screen-detail.js");
    var { renderStats } = __rmod("src/ui/screen-stats.js");
    var { renderBudget, openBudgetEdit, openWarnRatioEdit } = __rmod("src/ui/screen-budget.js");
    var { renderSettings, openBackupSheet, openRestoreSheet, exportCSV, openRulesSheet, openSelfNamesSheet, openRecurringSheet, cleanDuplicates, clearAllData, initBackupPicker } = __rmod("src/ui/screen-settings.js");
    var { openImportSheet, openBatchListSheet, initFilePicker } = __rmod("src/ui/import-screen.js");
    var { openQuickEntry } = __rmod("src/ui/sheets.js");
    var { openCategoryManager } = __rmod("src/ui/category-sheets.js");
    var { renderSavings, openSavingsEntry, openSavingsGoal, openMonthlyTarget, openSavingsAccount, openSavingsScan } = __rmod("src/ui/screen-savings.js");
    var { loadSettings: loadSavings } = __rmod("src/core/savings.js");
    var { openSheet, toastOk, toastErr, toastWarn, pickMonth, esc, fmtMoney, fmtDate } = __rmod("src/ui/dom.js");
    var { CATEGORIES, INCOME_CATEGORIES } = __rmod("src/core/model.js");
    var store = __rmod("src/ui/store.js");





































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
} catch (e) {  }
done++;
if (onProgress) onProgress(done, urls.length, ok);
}));
}
return { done, ok, total: urls.length };
}














async function readSwAssetList() {
try {

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





async function boot() {
const bootEl = document.getElementById('boot');
const appEl = document.getElementById('app');


try {
const raw = localStorage.getItem('qz-theme');
if (raw === 'dark' || raw === 'light') document.documentElement.dataset.theme = raw;
} catch (e) {  }



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







appEl.hidden = false;
bootEl.hidden = true;

try { performance.mark('boot-hidden'); } catch (e) {  }


requestAnimationFrame(() => {
registerServiceWorker();
loadAppVersion().catch(() => {});
});


const launch = parseLaunchParams();
if (launch.action === 'quick') {
setTimeout(() => openQuickEntry(launch.entry), 350);
} else if (launch.action === 'import') {
setTimeout(() => openImportSheet(), 350);
} else if (launch.action === 'annual') {
store.state.statsRange = 'annual';
store.setTab('stats');
} else if (!store.state.txs.length && !store.state.settings.demoAsked) {

store.setSetting('demoAsked', true).catch(() => {});
setTimeout(askDemo, 600);
}
}














function parseLaunchParams(search) {
const q = new URLSearchParams(search != null ? search : (typeof location !== 'undefined' ? location.search : ''));

const actionRaw = (q.get('action') || '').toLowerCase();
const action = ['quick', 'import', 'annual'].includes(actionRaw) ? actionRaw : '';

if (action !== 'quick') return { action };

const entry = {};







const amount = q.get('amount');
if (amount != null && amount !== '') {
const cleaned = String(amount).trim()
.replace(/^[¥￥$]/, '')
.replace(/[,，]/g, '');

if (/^\d+(\.\d+)?$/.test(cleaned)) {
const n = Number(cleaned);
if (Number.isFinite(n) && n > 0 && n < 1e9) {
entry.amountCents = Math.round(n * 100);
}
}
}


const merchant = (q.get('merchant') || '').trim().slice(0, 40);
if (merchant) entry.merchant = merchant;


const typeRaw = (q.get('type') || '').toLowerCase();
const validTypes = ['expense', 'income', 'redpacket', 'transfer', 'repay'];
if (validTypes.includes(typeRaw)) entry.type = typeRaw;


const catRaw = (q.get('category') || '').trim();
if (catRaw) {
const lane = (entry.type === 'income' || entry.type === 'redpacket') ? INCOME_CATEGORIES : CATEGORIES;
if (lane.some((c) => c.id === catRaw)) entry.category = catRaw;
}


const account = (q.get('account') || '').trim().slice(0, 30);
if (account) entry.account = account;
const note = (q.get('note') || '').trim().slice(0, 60);
if (note) entry.note = note;


const date = (q.get('date') || '').trim();
if (/^\d{4}-\d{2}-\d{2}$/.test(date)) entry.date = date;

return { action, entry };
}















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



let reloadingForUpdate = false;
let lastController = navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange', () => {
store.state.offlineCheck = 'ok';
store.notify(true);
if (!lastController) {

lastController = navigator.serviceWorker.controller;
return;
}
if (reloadingForUpdate) return;
reloadingForUpdate = true;
console.log('[轻账] 检测到新版本，正在刷新…');
location.reload();
});

const doRegister = () => {




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

store.state.swRegistration = reg;
console.log('[轻账] 离线缓存已就绪，作用域 ' + reg.scope);

reg.update().catch(() => {});

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









async function checkForUpdate() {
toast('正在检查更新…');

let reg = store.state.swRegistration;




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

await new Promise((r) => setTimeout(r, 1200));
if (reg.installing || reg.waiting) {
toastOk('发现新版本，正在刷新…');
if (reg.waiting) reg.waiting.postMessage('skip-waiting');

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





function wireNav() {

document.getElementById('tabbar').addEventListener('click', (ev) => {
const b = ev.target.closest('[data-tab]');
if (b) { store.setTab(b.dataset.tab); return; }
if (ev.target.closest('#tab-add')) { openQuickEntry(); }
});


document.getElementById('nav-left').addEventListener('click', () => store.stepMonth(-1));
document.getElementById('nav-right').addEventListener('click', () => store.stepMonth(1));
document.getElementById('nav-title').addEventListener('click', () => {
pickMonth(store.monthList(36), store.state.month, (m) => store.setMonth(m));
});


document.getElementById('screens').addEventListener('click', onScreenClick);


const screens = document.getElementById('screens');
screens.addEventListener('click', onFilterClick);
screens.addEventListener('input', onFilterInput);
}

async function onScreenClick(ev) {

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

const svTx = ev.target.closest('[data-sv-tx]');
if (svTx) { openTxSheet(svTx.dataset.svTx); return; }


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
const { confirmSheet } = await __rmod("src/ui/dom.js");
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
try { el.setSelectionRange(pos, pos); } catch (e) {  }
}
}
}, 260);
}





function renderAll() {
const tab = store.state.tab;


const titleEl = document.getElementById('nav-title-text');
if (titleEl) {
const [y, m] = store.state.month.split('-');
const isThisYear = Number(y) === new Date().getFullYear();
titleEl.textContent = isThisYear ? `${Number(m)}月` : `${y}年${Number(m)}月`;
}


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
const { demoTxs } = await __rmod("src/ui/demo.js");
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
    return { boot, parseLaunchParams };
  };

  /* ---------- src/core/anonymize.js ---------- */
  __mods["src/core/anonymize.js"] = function (__rmod) {
























const NAME_POOL = [
'张伟', '李娜', '王芳', '刘洋', '陈静',
'杨帆', '赵磊', '黄敏', '周涛', '吴倩',
'徐强', '孙丽', '马超', '朱婷', '胡军',
'郭鹏', '何雪', '高翔', '林芸', '罗浩',
];


const FAKE_PHONE = '13800000000';

const FAKE_PHONE_TAIL = '0000';


const ORG_KEYWORDS = [
'公司', '有限', '科技', '商贸', '餐饮', '超市', '便利店', '药房', '医院',
'银行', '集团', '商店', '商城', '服务', '中心', '平台', '网络', '传媒',
'文化', '工作室',

'财付通', '支付宝', '微信', '电信', '移动', '联通', '大学', '学院', '学校',
'酒店', '宾馆', '菜场', '菜市', '市场', '门市', '药店', '诊所', '物业',
'车站', '机场', '加油站', '停车场', '快递', '驿站', '影城', '书店',
];


const ORDER_KEYWORDS = ['单号', '订单号', '交易号', '流水号'];


const REMARK_KEYWORDS = ['备注', '商品说明', '商品', '说明', '摘要', '附言', '用途'];









const MERCHANT_EXACT = [
'交易对方', '对方', '商户', '商户名称', '收款方', '付款方', '交易对象',
'对方名称', '对方姓名', '收款人', '付款人', '交易方',
];
const MERCHANT_KEYWORDS = ['交易对方', '交易对象'];


const AMOUNT_KEYWORDS = ['金额', '发生金额', '交易金额'];


const HEADER_KEYWORDS = [
'交易时间', '交易创建时间', '交易对方', '商品', '金额', '收/支', '收支',
'交易类型', '付款时间', '当前状态', '交易状态', '交易单号', '商户单号',
'交易订单号', '商家订单号', '支付方式', '收/付款方式',
];







function isTrailerLine(line) {
const s = String(line == null ? '' : line).replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
if (!s) return false;
const isDash = (ch) => ch === '-' || ch === '\u2014' || ch === '=' || ch === '*';
let a = 0;
while (a < s.length && isDash(s[a])) a++;
let b = s.length;
while (b > a && isDash(s[b - 1])) b--;
if (a === s.length) return s.length >= 4;
if (a < 2 || s.length - b < 2) return false;
return s.slice(a, b).includes('结束');
}


const CATEGORY_LABELS = {
name: '人名',
phone: '手机号',
phoneTail: '卡号尾号',
id: '身份证',
card: '银行卡/长数字',
email: '邮箱',
order: '订单号',
amount: '金额',
preamble: '文件头信息',
inline: '其它行内清理',
};






function hash64hex(str) {
const s = String(str);
let h1 = 0xdeadbeef ^ s.length;
let h2 = 0x41c6ce57 ^ s.length;
for (let i = 0; i < s.length; i++) {
const ch = s.charCodeAt(i);
h1 = Math.imul(h1 ^ ch, 2654435761);
h2 = Math.imul(h2 ^ ch, 1597334677);
}
h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
const a = (h2 >>> 0).toString(16).padStart(8, '0');
const b = (h1 >>> 0).toString(16).padStart(8, '0');
return a + b;
}


function seededRandom(seedText) {
const h = hash64hex(seedText);
let x = (parseInt(h.slice(0, 8), 16) ^ parseInt(h.slice(8), 16)) >>> 0;
if (x === 0) x = 0x9e3779b9;
return function next() {
x ^= x << 13; x >>>= 0;
x ^= x >>> 17;
x ^= x << 5; x >>>= 0;
return x / 4294967296;
};
}


function bump(counts, cat, n = 1) {
counts[cat] = (counts[cat] || 0) + n;
}






function detectDelimiter(text) {
const sample = String(text || '').slice(0, 20000);
let comma = 0, tab = 0, semi = 0, inQ = false;
for (let i = 0; i < sample.length; i++) {
const ch = sample[i];
if (ch === '"') { inQ = !inQ; continue; }
if (inQ) continue;
if (ch === ',') comma++;
else if (ch === '\t') tab++;
else if (ch === ';') semi++;
}
if (tab > comma && tab >= semi) return '\t';
if (semi > comma && semi > tab) return ';';
return ',';
}





function parseCSV(text, delimiter) {
const src = String(text == null ? '' : text);
const rows = [];
const delim = delimiter || detectDelimiter(src);
if (!src.length) return { rows, delimiter: delim };

let row = [];
let field = '';
let inQuotes = false;
let i = 0;
const n = src.length;
const pushField = () => { row.push(field); field = ''; };
const pushRow = () => {
pushField();

if (!(row.length === 1 && row[0] === '')) rows.push(row);
row = [];
};

while (i < n) {
const ch = src[i];
if (inQuotes) {
if (ch === '"') {
if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
inQuotes = false; i++; continue;
}
field += ch; i++; continue;
}
if (ch === '"') {
if (field === '') { inQuotes = true; i++; continue; }
field += ch; i++; continue;
}
if (ch === delim) { pushField(); i++; continue; }
if (ch === '\r') { if (src[i + 1] === '\n') i++; pushRow(); i++; continue; }
if (ch === '\n') { pushRow(); i++; continue; }
field += ch; i++;
}
if (field !== '' || row.length) pushRow();
return { rows, delimiter: delim };
}


function needsQuoting(v, delimiter) {
const s = String(v == null ? '' : v);
if (s === '') return false;
return s.includes(delimiter || ',') || s.includes('"') || s.includes('\n') || s.includes('\r')
|| /^[\s\u3000]|[\s\u3000]$/.test(s);
}


function stringifyCSV(rows, delimiter, eol = '\r\n') {
const d = delimiter || ',';
const out = [];
for (const row of rows) {
const parts = [];
for (const cellRaw of row) {
const s = String(cellRaw == null ? '' : cellRaw);
if (needsQuoting(s, d)) parts.push('"' + s.replace(/"/g, '""') + '"');
else parts.push(s);
}
out.push(parts.join(d));
}
return out.length ? out.join(eol) + eol : '';
}






function norm(s) {
return String(s == null ? '' : s).replace(/[\s\u3000]+/g, ' ').trim();
}


function isOrganizationValue(value) {
const s = norm(value);
if (!s) return true;
if (/[A-Za-z0-9]/.test(s)) return true;
if (s.length > 6) return true;
if (ORG_KEYWORDS.some((k) => s.includes(k))) return true;
if (/[（(【\[]/.test(s)) return true;
return false;
}







const SURNAMES = new Set(('王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤常温康施文牛樊葛邢安齐易乔伍庞颜倪庄聂章鲁岳翟殷詹申欧耿关兰焦俞左柳甘祝包宁尚符舒阮柯纪梅童凌毕单季裴霍涂成苗谷盛曲翁冉骆蓝路游辛靳管柴蒙鲍华喻祁蒲房滕屈饶解牟艾尤阳时穆农司卓古吉缪简车项连芦麦褚娄窦戚岑景党宫费卜冷晏席卫米柏宗瞿桂全佟应臧闵苟邬边卞姬邰羊隗国狄平晏').split(''));

const COMPOUND_SURNAMES = ['欧阳', '司马', '上官', '诸葛', '东方', '皇甫', '尉迟', '公孙', '慕容', '长孙', '宇文', '司徒', '司空', '令狐', '申屠', '端木', '独孤', '南宫', '百里', '夏侯', '西门', '东门', '呼延', '微生', '梁丘', '左丘', '东郭', '澹台', '公冶', '宗政', '濮阳', '淳于'];


function startsWithSurname(value) {
const s = norm(value);
if (s.length < 2) return false;
for (const c of COMPOUND_SURNAMES) {
if (s.startsWith(c)) return true;
}
return SURNAMES.has(s[0]);
}


function looksLikePersonalName(value) {
const s = norm(value);
if (!s) return false;
if (!/^[\u4e00-\u9fa5]{2,4}$/.test(s)) return false;
if (ORG_KEYWORDS.some((k) => s.includes(k))) return false;

if (/^(收入|支出|不计收支|其他|其它|转账|红包|退款|提现|充值|消费|收款|付款|零钱|余额|手续费|利息|工资)$/.test(s)) return false;

if (s.length === 4 && !startsWithSurname(s)) return false;
return true;
}






function isValidIdCardChecksum(id) {
const s = String(id || '').toUpperCase();
if (!/^\d{17}[\dX]$/.test(s)) return false;
const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const codes = '10X98765432';
let sum = 0;
for (let i = 0; i < 17; i++) sum += Number(s[i]) * w[i];
return codes[sum % 11] === s[17];
}


function fakeIdCard(id) {
const s = String(id || '').toUpperCase();
if (!/^\d{17}[\dX]$/.test(s)) return s;


const tail = s[17] === 'X' ? 'X' : '0';
return s.slice(0, 6) + '19000101' + '000' + tail;
}


function fakeCardNumber(digits) {
const s = String(digits || '');
if (s.length < 9) return s;
const head = s.slice(0, 4);
const tail = s.slice(-4);
return head + '0'.repeat(s.length - 8) + tail;
}









const INLINE_RE = new RegExp([
'(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})',
'(?<id>(?<![\\dXx])\\d{17}[\\dXx](?![\\dXx]))',
'(?<phone>(?<![\\d.])1[3-9]\\d{9}(?![\\d]))',
'(?<card>(?<![\\d.])\\d{16,19}(?![\\d.]))',
].join('|'), 'g');








function scrubInline(text, ctx, opts = {}) {
let s = String(text == null ? '' : text);
if (!s) return s;
const allow = opts.categories || ['email', 'id', 'card', 'phone'];



if (allow.includes('phone')) {
s = s.replace(/((?:尾号|后四位|后 4 位|末四位|尾数为)[\s:：]?)(\d{2,6})(?!\d)/g, (m, p1, p2) => {
if (/^0+$/.test(p2)) return m;
bump(ctx.counts, 'phoneTail');
ctx.records.push({ category: 'phoneTail', from: m, to: p1 + FAKE_PHONE_TAIL });
return p1 + FAKE_PHONE_TAIL;
});
}


return s.replace(INLINE_RE, (m, ...rest) => {

const g = rest[rest.length - 1] || {};
let which = null;
for (const name of ['email', 'id', 'card', 'phone']) {
if (g[name] !== undefined) { which = name; break; }
}
if (!which || !allow.includes(which)) return m;
if (ctx.generated.has(m)) return m;

if (which === 'email') {
const to = ctx.mapEmail(m);
ctx.records.push({ category: 'email', from: m, to });
bump(ctx.counts, 'email');
return to;
}
if (which === 'id') {
const to = ctx.mapId(m);
ctx.records.push({ category: 'id', from: m, to });
bump(ctx.counts, 'id');
return to;
}
if (which === 'card') {
const to = ctx.mapCard(m);
ctx.records.push({ category: 'card', from: m, to });
bump(ctx.counts, 'card');
return to;
}

const to = m.length >= 11 ? ctx.mapPhone(m) : '0'.repeat(m.length);
ctx.records.push({ category: 'phone', from: m, to });
bump(ctx.counts, 'phone');
return to;
});
}









function createScrubContext(opts = {}) {
const counts = Object.create(null);
const records = [];

const state = {
counts,
records,

nameMap: new Map(),

phoneMap: new Map(),

idMap: new Map(),

cardMap: new Map(),

emailMap: new Map(),

orderMap: new Map(),

selfNames: new Set(),

usedAliases: new Set(),

realNames: new Set(),

generated: new Set(),

randomizeAmount: !!opts.randomizeAmount,
nextNameIndex: 0,
nextEmailIndex: 1,
};









state.mapName = (raw) => {
const key = norm(raw);
if (state.nameMap.has(key)) return state.nameMap.get(key);
state.realNames.add(key);
let alias = '';
for (let i = 0; i < NAME_POOL.length; i++) {
const cand = NAME_POOL[state.nextNameIndex % NAME_POOL.length];
state.nextNameIndex++;
if (state.selfNames.has(cand)) continue;
if (state.usedAliases.has(cand)) continue;
if (state.realNames.has(cand)) continue;
alias = cand;
break;
}
if (!alias) alias = NAME_POOL[state.nextNameIndex++ % NAME_POOL.length];
state.usedAliases.add(alias);
state.nameMap.set(key, alias);
return alias;
};








state.fixNameCollisions = () => {
const renameMap = new Map();
for (const [real, alias] of [...state.nameMap]) {
if (state.usedAliases.has(alias) && !state.realNames.has(alias)) continue;
const taken = new Set([...state.usedAliases].filter((a) => a !== alias));
const cand = NAME_POOL.find((a) => !taken.has(a) && !state.realNames.has(a) && a !== real);
if (!cand) continue;
state.nameMap.set(real, cand);
state.usedAliases.delete(alias);
state.usedAliases.add(cand);
renameMap.set(alias, cand);
}
return renameMap;
};

state.mapPhone = (raw) => {
const key = String(raw);
if (!state.phoneMap.has(key)) {
state.phoneMap.set(key, FAKE_PHONE);
state.generated.add(FAKE_PHONE);
}
return state.phoneMap.get(key);
};

state.mapId = (raw) => {
const key = String(raw).toUpperCase();
if (!state.idMap.has(key)) {
const fake = fakeIdCard(key);
state.idMap.set(key, fake);
state.generated.add(fake);
}
return state.idMap.get(key);
};

state.mapCard = (raw) => {
const key = String(raw);
if (!state.cardMap.has(key)) {
const fake = fakeCardNumber(key);
state.cardMap.set(key, fake);
state.generated.add(fake);
}
return state.cardMap.get(key);
};

state.mapEmail = (raw) => {
const key = String(raw).toLowerCase();
if (!state.emailMap.has(key)) {
state.emailMap.set(key, `user${state.nextEmailIndex}@example.com`);
state.nextEmailIndex++;
}
return state.emailMap.get(key);
};


state.mapOrder = (raw, columnName) => {
const key = String(raw);
if (state.orderMap.has(key)) return state.orderMap.get(key);
const fake = fakeOrderNumber(key, columnName);
state.orderMap.set(key, fake);
return fake;
};

return state;
}


function orderIsNumericOnly(columnName) {
return ORDER_KEYWORDS.some((k) => String(columnName || '').includes(k));
}







function fakeOrderNumber(original, columnName) {
const s = String(original || '');
if (!s) return s;
const rnd = seededRandom('order\u0001' + s + '\u0001' + (columnName || ''));
const forceNumeric = orderIsNumericOnly(columnName);
let out = '';
for (let i = 0; i < s.length; i++) {
const ch = s[i];
if (ch >= '0' && ch <= '9') out += String(Math.floor(rnd() * 10));
else if (forceNumeric) out += String(Math.floor(rnd() * 10));
else if (ch >= 'A' && ch <= 'Z') out += String.fromCharCode(65 + Math.floor(rnd() * 26));
else if (ch >= 'a' && ch <= 'z') out += String.fromCharCode(97 + Math.floor(rnd() * 26));
else out += ch;
}
return out;
}


function fakeAmount(raw, ctx) {
const s = String(raw == null ? '' : raw).trim();
const m = /^(-?)\s*([¥￥]?)\s*([\d,]+)(\.\d+)?$/.exec(s);
if (!m) return s;
const sign = m[1] || '';
const symbol = m[2] || '';
const intPart = m[3].replace(/,/g, '');
const decPart = m[4] || '';
const hasComma = m[3].includes(',');
const rnd = seededRandom('amount\u0001' + s + '\u0001' + ctx.records.length);
const magnitude = Math.max(1, intPart.length);
const max = Math.pow(10, magnitude) - 1;
let v = Math.floor(rnd() * max);

v = String(v).padStart(intPart.length, '0');
if (hasComma) v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
return sign + symbol + v + decPart;
}






function cleanColName(h) {
return String(h == null ? '' : h).replace(/[\s\u3000]/g, '').replace(/^\uFEFF/, '');
}








function classifyColumns(header) {
const cols = (header || []).map(cleanColName);
const roles = cols.map((c) => {
if (!c) return 'other';
if (AMOUNT_KEYWORDS.some((k) => c.includes(k))) return 'amount';
if (ORDER_KEYWORDS.some((k) => c.includes(k))) return 'order';
if (REMARK_KEYWORDS.some((k) => c.includes(k))) return 'remark';
if (MERCHANT_EXACT.includes(c)) return 'merchant';
if (MERCHANT_KEYWORDS.some((k) => c.includes(k))) return 'merchant';
return 'other';
});
const index = {};
cols.forEach((c, i) => { if (c && index[c] === undefined) index[c] = i; });
return { roles, index, names: cols };
}


function findHeaderRowIndex(rows, maxScan = 60) {
const limit = Math.min(rows.length, maxScan);
let best = -1;
let bestScore = 0;
for (let i = 0; i < limit; i++) {
const cells = rows[i];
if (!cells || cells.length < 2) continue;
let score = 0;
for (const cell of cells) {
const c = cleanColName(cell);
for (const kw of HEADER_KEYWORDS) if (c.includes(kw)) score++;
}
if (score > bestScore) { bestScore = score; best = i; }
}
return bestScore >= 3 ? best : (bestScore >= 2 ? best : -1);
}


function detectPlatform(text) {
const head = String(text || '').slice(0, 8000);
let wx = 0, ali = 0;
for (const s of ['微信支付账单', '微信昵称', '微信支付', '微信红包', '当前状态', '零钱', '微信账单']) {
if (head.includes(s)) wx++;
}
for (const s of ['支付宝', 'alipay', '交易创建时间', '商品说明', '收/支', '交易订单号', '商家订单号', '收/付款方式', '交易分类']) {
if (head.includes(s)) ali++;
}
if (head.includes('当前状态') || head.includes('微信支付')) wx += 2;
if (head.includes('收/支')) ali += 2;
if (head.includes('交易创建时间') || head.includes('交易订单号')) ali += 2;
if (wx === 0 && ali === 0) return 'unknown';
return wx >= ali ? 'wechat' : 'alipay';
}






const SELF_LABEL_RE = /(昵称|姓名|名字|真实姓名|户名|账户名|账号名|微信昵称|支付宝昵称|用户)/;





function learnSelfNames(preambleLines, ctx) {
const found = [];
for (const line of preambleLines) {
const s = norm(line);
if (!s || s.length > 120) continue;
if (!SELF_LABEL_RE.test(s)) continue;

const re = /(昵称|姓名|名字|真实姓名|户名|账户名|账号名|用户)\s*[:：]\s*[\[【（(]?\s*([^\]\s,，、】）)]{2,12})/g;
let m;
while ((m = re.exec(s))) {
const v = m[2].replace(/[\]】）)]+$/, '');
if (looksLikePersonalName(v)) found.push(v);
else if (/^[\u4e00-\u9fa5]{2,4}$/.test(v) && !ORG_KEYWORDS.some((k) => v.includes(k))) found.push(v);
}
}
for (const n of found) ctx.selfNames.add(n);
return found;
}








function scrubPreambleLines(lines, ctx, maxLine = 40) {
const out = [];
for (let i = 0; i < lines.length; i++) {
let line = lines[i];
if (i >= maxLine || line == null) { out.push(line); continue; }
const before = line;


if (SELF_LABEL_RE.test(line)) {
line = line.replace(
/((?:昵称|姓名|名字|真实姓名|户名|账户名|账号名|微信昵称|支付宝昵称|用户)\s*[:：]\s*)([\[【（(]?)([^\]\s,，、】）)]{2,20})([\]】）)]?)/g,
(m, p1, p2, p3, p4) => {
if (p3.includes('@') || /[A-Za-z0-9]/.test(p3)) {

const to = scrubInline(p3, ctx);
if (to !== p3) {
bump(ctx.counts, 'preamble');
ctx.records.push({ category: 'preamble', from: m, to: p1 + p2 + to + p4 });
return p1 + p2 + to + p4;
}
return m;
}
if (looksLikePersonalName(p3) || /^[\u4e00-\u9fa5]{2,4}$/.test(p3)) {
const alias = ctx.mapName(p3);
bump(ctx.counts, 'name');
bump(ctx.counts, 'preamble');
ctx.records.push({ category: 'name', from: p3, to: alias });
return p1 + p2 + alias + p4;
}
return m;
},
);
}


const afterInline = scrubInline(line, ctx);
if (afterInline !== line) {
ctx.records.push({ category: 'preamble', from: before, to: afterInline });
line = afterInline;
}
out.push(line);
}
return out;
}














function scrubCell(value, role, colName, ctx, changes) {
let v = String(value == null ? '' : value);
if (v === '') return v;
const push = (category, from, to) => {
if (from === to) return;
if (changes) changes.push({ category, from, to, column: colName });
};


if (role === 'amount') {
if (ctx.randomizeAmount) {
const to = fakeAmount(v, ctx);
if (to !== v) { push('amount', v, to); bump(ctx.counts, 'amount'); v = to; }
}
return v;
}


if (role === 'order') {
const t = norm(v);
if (t) {
const to = ctx.mapOrder(t, colName);
if (to !== t) {
push('order', t, to);
bump(ctx.counts, 'order');

if (t === v) return to;
return v.replace(t, to);
}
}
return v;
}


if (role === 'merchant') {
const t = norm(v);
if (t && !isOrganizationValue(t)) {
let alias = null;
if (ctx.selfNames.has(t)) alias = ctx.mapName(t);
else if (looksLikePersonalName(t)) alias = ctx.mapName(t);
if (alias && alias !== t) {
push('name', t, alias);
bump(ctx.counts, 'name');
return v.replace(t, alias);
}
}

const to = scrubInline(v, ctx);
if (to !== v) push('inline', v, to);
return to;
}


if (role === 'remark') {



const step1 = v.replace(/(?<!\d)\d{11,}(?!\d)/g, (m) => {
if (ctx.generated.has(m)) return m;
const cat = m.length >= 16 ? 'card' : 'phone';
const f = cat === 'card' ? ctx.mapCard(m) : ctx.mapPhone(m);
bump(ctx.counts, cat);
push(cat, m, f);
return f;
});
const step2 = scrubInline(step1, ctx, { categories: ['email', 'id', 'card', 'phone'] });
if (step2 !== v) push('inline', v, step2);
return step2;
}




const to = scrubInline(v, ctx);
if (to !== v) push('inline', v, to);
return to;
}











function scrubStatementText(text, options = {}) {
const src = String(text == null ? '' : text);
const platform = detectPlatform(src);


const eol = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r\n|\n|\r/);
const delimiter = detectDelimiter(src);
const { rows } = parseCSV(src, delimiter);
const headerRow = findHeaderRowIndex(rows);




const headerLineIndex = headerRow < 0 ? -1 : findHeaderLineIndex(lines, rows[headerRow], delimiter);
const preambleLineCount = headerLineIndex < 0 ? 0 : headerLineIndex;

const ctx = createScrubContext(options);
const changes = [];
ctx.changes = changes;


const preambleLines = headerLineIndex < 0 ? [] : lines.slice(0, preambleLineCount);
learnSelfNames(preambleLines, ctx);
for (const n of options.seedNames || []) {
if (/^[\u4e00-\u9fa5]{2,4}$/.test(n)) ctx.selfNames.add(n);
}



const preambleOut = headerLineIndex > 0
? scrubPreambleLines(preambleLines, ctx, options.maxPreambleLines || 40)
: [];


if (headerRow < 0) {
const scrubbed = scrubPreambleLines(lines, ctx, lines.length);
const cleaned = scrubbed.map((l) => scrubInlineFullLine(l, ctx, changes)).join(eol);
return finalizeResult({
text: cleaned, platform, delimiter: null, headerRow: -1,
rowCount: 0, colCount: 0, changedCells: 0, changes, ctx, eol,
note: '没找到标准表头，按纯文本逐行清理。',
});
}


const headerCells = rows[headerRow] || [];
const { roles, names } = classifyColumns(headerCells);


let dataEnd = rows.length;
for (let i = headerRow + 1; i < rows.length; i++) {
if (isTrailerLine(rows[i].join(delimiter))) { dataEnd = i; break; }
}

let changedCells = 0;
for (let r = headerRow + 1; r < dataEnd; r++) {
const row = rows[r];
if (!row.length) continue;
if (row.every((c) => norm(c) === '')) continue;
const width = Math.max(row.length, headerCells.length);
for (let c = 0; c < width; c++) {
const raw = row[c] == null ? '' : row[c];
if (raw === '') continue;
const role = roles[c] || 'other';
const colName = names[c] || `col${c}`;
const before = raw;
const after = scrubCell(raw, role, colName, ctx, changes);
if (after !== before) { row[c] = after; changedCells++; }
}
}



ctx.preambleLines = preambleOut;
ctx.tableRows = rows;
applyNameCollisionFix(ctx, changes);
if (headerLineIndex > 0) {

const bodyLines = stringifyCSV(rows.slice(headerRow), delimiter, eol);
return finalizeResult({
text: preambleOut.join(eol) + (preambleOut.length ? eol : '') + bodyLines,
platform, delimiter, headerRow,
rowCount: Math.max(0, dataEnd - headerRow - 1),
colCount: headerCells.length,
changedCells, changes, ctx, eol,
trailerRows: rows.length - dataEnd,
});
}

const outText = stringifyCSV(rows, delimiter, eol);
return finalizeResult({
text: outText, platform, delimiter, headerRow,
rowCount: Math.max(0, dataEnd - headerRow - 1),
colCount: headerCells.length,
changedCells, changes, ctx, eol,
trailerRows: rows.length - dataEnd,
});
}





function findHeaderLineIndex(lines, headerCells, delimiter) {
const first = cleanColName((headerCells || [])[0] || '');
if (!first) return -1;
const second = cleanColName((headerCells || [])[1] || '');
let lastContent = -1;
for (let i = 0; i < lines.length; i++) {
if (lines[i].trim() === '') continue;
lastContent = i;
if (!lines[i].includes(first)) continue;
if (second && !lines[i].includes(second)) continue;

if (lines[i].includes(delimiter)) return i;
}

const prefix = lines.slice(0, lastContent + 1).join('\n');
const { rows } = parseCSV(prefix, delimiter);
let idx = -1;
rows.forEach((r, i) => { if (r === headerCells) idx = i; });
return idx >= 0 ? Math.min(idx, lines.length - 1) : 0;
}





function applyNameCollisionFix(ctx, changes) {
const rename = ctx.fixNameCollisions();
if (!rename || rename.size === 0) return;
const fix = (s) => {
let t = s;
for (const [from, to] of rename) t = t.split(from).join(to);
return t;
};
const pre = ctx.preambleLines || [];
for (let i = 0; i < pre.length; i++) pre[i] = fix(pre[i]);
const table = ctx.tableRows || [];
for (const row of table) {
for (let c = 0; c < row.length; c++) {
if (typeof row[c] === 'string') row[c] = fix(row[c]);
}
}
for (const rec of changes || []) {
if (rec.category !== 'name') continue;

if (rename.has(rec.to)) rec.to = rename.get(rec.to);
if (rename.has(rec.from)) rec.from = rename.get(rec.from);
}
}


function scrubInlineFullLine(line, ctx, changes) {
let s = String(line == null ? '' : line);
const before = s;
s = scrubInline(s, ctx);
for (const n of ctx.selfNames) {
if (!n) continue;
if (s.includes(n)) {
const alias = ctx.mapName(n);
s = s.split(n).join(alias);
bump(ctx.counts, 'name');
changes.push({ category: 'name', from: n, to: alias, column: '(正文)' });
}
}
if (s !== before && !changes.some((c) => c.from === before)) {
changes.push({ category: 'inline', from: before, to: s, column: '(正文)' });
}
return s;
}

function finalizeResult(x) {
const counts = x.ctx.counts;
return {
text: x.text,
platform: x.platform,
delimiter: x.delimiter,
headerRow: x.headerRow,
rowCount: x.rowCount,
colCount: x.colCount,
changedCells: x.changedCells,
changes: x.changes,
counts: { ...counts },
mapping: {
names: Object.fromEntries(x.ctx.nameMap),
phones: Object.fromEntries(x.ctx.phoneMap),
ids: Object.fromEntries(x.ctx.idMap),
cards: Object.fromEntries(x.ctx.cardMap),
emails: Object.fromEntries(x.ctx.emailMap),
orders: Object.fromEntries(x.ctx.orderMap),
},
note: x.note || '',
trailerRows: x.trailerRows || 0,
};
}






function hasUtf8Bom(bytes) {
return bytes && bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}







function decodeBytes(bytes) {
const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
if (hasUtf8Bom(b)) {
return { text: new TextDecoder('utf-8').decode(b), encoding: 'UTF-8 (带 BOM)' };
}
try {
const strict = new TextDecoder('utf-8', { fatal: true }).decode(b);
return { text: strict, encoding: 'UTF-8' };
} catch (e) {  }

for (const enc of ['gbk', 'gb18030']) {
try {
const t = new TextDecoder(enc).decode(b);
const bad = (t.match(/\uFFFD/g) || []).length;
if (bad / Math.max(1, t.length) < 0.01) return { text: t, encoding: 'GBK' };
} catch (e) {  }
}
return { text: new TextDecoder('utf-8').decode(b), encoding: 'UTF-8 (有乱码)' };
}


function encodeUtf8Bom(text) {
const body = new TextEncoder().encode(String(text == null ? '' : text));
const out = new Uint8Array(body.length + 3);
out[0] = 0xef; out[1] = 0xbb; out[2] = 0xbf;
out.set(body, 3);
return out;
}





const u16 = (v, i) => v[i] | (v[i + 1] << 8);
const u32 = (v, i) => (v[i] | (v[i + 1] << 8) | (v[i + 2] << 16) | (v[i + 3] << 24)) >>> 0;


async function inflateRaw(bytes) {
if (typeof DecompressionStream !== 'function') return null;
try {
const ds = new DecompressionStream('deflate-raw');
const stream = new Blob([bytes]).stream().pipeThrough(ds);
return new Uint8Array(await new Response(stream).arrayBuffer());
} catch (e) {
return null;
}
}






async function readZipEntries(bytes) {
const v = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);


let eocd = -1;
for (let i = v.length - 22; i >= 0 && i >= v.length - 66000; i--) {
if (v[i] === 0x50 && v[i + 1] === 0x4b && v[i + 2] === 0x05 && v[i + 3] === 0x06) { eocd = i; break; }
}
if (eocd < 0) throw new Error('这不是一个正常的 ZIP 文件（找不到目录结尾）。');

const total = u16(v, eocd + 10);
let off = u32(v, eocd + 16);
const entries = [];

for (let n = 0; n < total; n++) {
if (u32(v, off) !== 0x02014b50) break;
const flags = u16(v, off + 8);
const method = u16(v, off + 10);
const nameLen = u16(v, off + 28);
const extraLen = u16(v, off + 30);
const commentLen = u16(v, off + 32);
const localOff = u32(v, off + 42);
const nameBytes = v.subarray(off + 46, off + 46 + nameLen);
const utf8Flag = (flags & 0x800) !== 0;
let name;
if (utf8Flag) name = new TextDecoder('utf-8').decode(nameBytes);
else name = decodeBytes(nameBytes).text;
if ((flags & 0x1) !== 0) throw new Error('这个 ZIP 是加密的，请先在电脑上解压后用 CSV 处理：' + name);


const lNameLen = u16(v, localOff + 26);
const lExtraLen = u16(v, localOff + 28);
const dataStart = localOff + 30 + lNameLen + lExtraLen;
const compSize = u32(v, off + 20);
const raw = v.subarray(dataStart, dataStart + compSize);

let data = raw;
if (method === 8) {
const inf = await inflateRaw(raw);
if (!inf) throw new Error('浏览器不支持解压这个 ZIP 的压缩方式，请在电脑上解压后再拖入 CSV。');
data = inf;
} else if (method !== 0) {
throw new Error('这个 ZIP 用了不支持的压缩方式（method ' + method + '）。');
}
entries.push({ name, dir: name.endsWith('/'), method, data });
off += 46 + nameLen + extraLen + commentLen;
}
return entries;
}


const CRC_TABLE = (() => {
const t = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
let c = n;
for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
t[n] = c >>> 0;
}
return t;
})();

function crc32(bytes) {
const v = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
let c = 0xffffffff;
for (let i = 0; i < v.length; i++) c = CRC_TABLE[(c ^ v[i]) & 0xff] ^ (c >>> 8);
return (c ^ 0xffffffff) >>> 0;
}


function dosDateTime(d = new Date()) {
const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f);
const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
return { time: time & 0xffff, date: date & 0xffff };
}






function createZip(files, now = new Date()) {
const enc = new TextEncoder();
const { time, date } = dosDateTime(now);
const chunks = [];
const central = [];
let offset = 0;

for (const f of files) {
const nameBytes = enc.encode(f.name);
const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
const crc = crc32(data);

const local = new Uint8Array(30 + nameBytes.length);
const lv = new DataView(local.buffer);
lv.setUint32(0, 0x04034b50, true);
lv.setUint16(4, 20, true);
lv.setUint16(6, 0x0800, true);
lv.setUint16(8, 0, true);
lv.setUint16(10, time, true);
lv.setUint16(12, date, true);
lv.setUint32(14, crc, true);
lv.setUint32(18, data.length, true);
lv.setUint32(22, data.length, true);
lv.setUint16(26, nameBytes.length, true);
lv.setUint16(28, 0, true);
local.set(nameBytes, 30);

chunks.push(local, data);

const cen = new Uint8Array(46 + nameBytes.length);
const cv = new DataView(cen.buffer);
cv.setUint32(0, 0x02014b50, true);
cv.setUint16(4, 20, true);
cv.setUint16(6, 20, true);
cv.setUint16(8, 0x0800, true);
cv.setUint16(10, 0, true);
cv.setUint16(12, time, true);
cv.setUint16(14, date, true);
cv.setUint32(16, crc, true);
cv.setUint32(20, data.length, true);
cv.setUint32(24, data.length, true);
cv.setUint16(28, nameBytes.length, true);
cv.setUint16(30, 0, true);
cv.setUint16(32, 0, true);
cv.setUint16(34, 0, true);
cv.setUint16(36, 0, true);
cv.setUint32(38, 0, true);
cv.setUint32(42, offset, true);
cen.set(nameBytes, 46);
central.push(cen);

offset += local.length + data.length;
}

const centralSize = central.reduce((a, b) => a + b.length, 0);
const eocd = new Uint8Array(22);
const ev = new DataView(eocd.buffer);
ev.setUint32(0, 0x06054b50, true);
ev.setUint16(8, files.length, true);
ev.setUint16(10, files.length, true);
ev.setUint32(12, centralSize, true);
ev.setUint32(16, offset, true);

const all = [...chunks, ...central, eocd];
const total = all.reduce((a, b) => a + b.length, 0);
const out = new Uint8Array(total);
let p = 0;
for (const c of all) { out.set(c, p); p += c.length; }
return out;
}





const AMOUNT_TOOLTIP =
'默认不改金额。开启后金额会变成「同样是两位小数、同样位数」的随机数，'
+ '好处是万一文件外泄也看不出你花了多少钱；代价是你就没法核对分类规则是不是按真实金额生效的了。'
+ '拿不准就保持关闭。';

const MERCHANT_HINT =
'商户名（带「公司/有限/科技/超市/便利店/医院/银行」等字样，或含字母，或超过 6 个字）会原样保留 —— '
+ '因为 AI 要靠真实的商户名来学「这家店该算哪一类」，把它们抹掉反而会让分类失效。'
+ '只有看起来像「个人姓名」的 2~4 个字才会被换成化名。';

function isZipName(name) {
return /\.zip$/i.test(String(name || ''));
}

function isTextStatementName(name) {
return /\.(csv|txt)$/i.test(String(name || ''));
}
    return { NAME_POOL, FAKE_PHONE, FAKE_PHONE_TAIL, isTrailerLine, CATEGORY_LABELS, hash64hex, seededRandom, detectDelimiter, parseCSV, needsQuoting, stringifyCSV, isOrganizationValue, startsWithSurname, looksLikePersonalName, isValidIdCardChecksum, fakeIdCard, fakeCardNumber, scrubInline, createScrubContext, fakeOrderNumber, fakeAmount, classifyColumns, findHeaderRowIndex, detectPlatform, learnSelfNames, scrubPreambleLines, scrubCell, scrubStatementText, hasUtf8Bom, decodeBytes, encodeUtf8Bom, readZipEntries, crc32, createZip, AMOUNT_TOOLTIP, MERCHANT_HINT, isZipName, isTextStatementName };
  };

  /* ---------- src/core/zip.js ---------- */
  __mods["src/core/zip.js"] = function (__rmod) {


























let _crcTable = null;

function crcTable() {
if (_crcTable !== null) return _crcTable;
const t = new Int32Array(256);
for (let n = 0; n < 256; n++) {
let c = n;
for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
t[n] = c;
}
_crcTable = t;
return t;
}





function crc32(bytes, seed) {
const t = crcTable();
let c = ((seed === undefined ? 0 : seed) ^ 0xffffffff) >>> 0;
for (let i = 0; i < bytes.length; i++) {
c = (t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)) >>> 0;
}
return (c ^ 0xffffffff) >>> 0;
}





function crc32Update(crc, byte) {
const t = crcTable();
return ((crc >>> 8) ^ t[(crc ^ byte) & 0xff]) >>> 0;
}





const LENGTH_BASE = new Uint16Array([
3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
67, 83, 99, 115, 131, 163, 195, 227, 258,
]);
const LENGTH_EXTRA = new Uint8Array([
0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
4, 4, 4, 4, 5, 5, 5, 5, 0,
]);
const DIST_BASE = new Uint16Array([
1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
]);
const DIST_EXTRA = new Uint8Array([
0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]);

const CLEN_ORDER = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

const FIXED_LIT_LENGTHS = (() => {
const a = new Uint8Array(288);
a.fill(8, 0, 144);
a.fill(9, 144, 256);
a.fill(7, 256, 280);
a.fill(8, 280, 288);
return a;
})();
const FIXED_DIST_LENGTHS = new Uint8Array(32).fill(5);

const MAX_BITS = 15;


class BitReader {
constructor(data, pos, end) {
this.d = data;
this.p = pos;
this.e = end;
this.b = 0;
this.n = 0;
}


fill(count) {
while (this.n < count) {
if (this.p >= this.e) throw new Error('inflate: unexpected end of stream');
this.b |= this.d[this.p++] << this.n;
this.n += 8;
}
}


take(count) {
if (count === 0) return 0;
this.fill(count);
const v = this.b & ((1 << count) - 1);
this.b >>>= count;
this.n -= count;
return v;
}






peek(maxBits) {
while (this.n < maxBits && this.p < this.e) {
this.b |= this.d[this.p++] << this.n;
this.n += 8;
}
return this.b & ((1 << maxBits) - 1);
}

drop(count) {
this.b >>>= count;
this.n -= count;
}


alignToByte() {
const drop = this.n & 7;
if (drop !== 0) {
this.b >>>= drop;
this.n -= drop;
}
const whole = this.n >>> 3;
if (whole !== 0) this.p -= whole;
this.b = 0;
this.n = 0;
}
}









function buildTree(lengths, n, what) {
let maxBits = 0;
for (let i = 0; i < n; i++) {
const l = lengths[i];
if (l > maxBits) maxBits = l;
}
if (maxBits > MAX_BITS) throw new Error('inflate: ' + what + ' code length exceeds 15 bits');
if (maxBits === 0) {
return { sym: new Uint16Array(1), len: new Uint8Array(1), maxBits: 0 };
}

const count = new Int32Array(MAX_BITS + 1);
for (let i = 0; i < n; i++) if (lengths[i] !== 0) count[lengths[i]]++;



let left = 1;
for (let b = 1; b <= MAX_BITS; b++) {
left <<= 1;
left -= count[b];
if (left < 0) throw new Error('inflate: over-subscribed ' + what + ' huffman code lengths');
}

const nextCode = new Int32Array(MAX_BITS + 1);
let code = 0;
for (let b = 1; b <= MAX_BITS; b++) {
code = (code + count[b - 1]) << 1;
nextCode[b] = code;
}

const size = 1 << maxBits;
const sym = new Uint16Array(size);
const len = new Uint8Array(size);

for (let s = 0; s < n; s++) {
const l = lengths[s];
if (l === 0) continue;
let c = nextCode[l]++;
let rev = 0;
for (let i = 0; i < l; i++) {
rev = (rev << 1) | (c & 1);
c >>>= 1;
}
const step = 1 << l;
for (let j = rev; j < size; j += step) {
sym[j] = s;
len[j] = l;
}
}

return { sym, len, maxBits };
}

let _fixedLit = null;
let _fixedDist = null;

function decodeSym(tree, rd) {
const maxBits = tree.maxBits;
if (maxBits === 0) throw new Error('inflate: invalid huffman code (empty tree)');
const idx = rd.peek(maxBits);
const l = tree.len[idx];
if (l === 0) throw new Error('inflate: invalid huffman code');
if (l > rd.n) throw new Error('inflate: unexpected end of stream');
const s = tree.sym[idx];
rd.drop(l);
return s;
}

const MAX_OUTPUT = 1 << 30;






function inflateCore(data, start, end, limit) {
const rd = new BitReader(data, start, end);
let out = new Uint8Array(1 << 16);
let outPos = 0;

function ensure(need) {
const req = outPos + need;
if (req <= out.length) return;
if (req > limit) throw new Error('inflate: output exceeds the declared uncompressed size');
if (req > MAX_OUTPUT) throw new Error('inflate: decompressed data is too large');
let cap = out.length;
while (cap < req) cap *= 2;
const next = new Uint8Array(cap);
next.set(out.subarray(0, outPos));
out = next;
}

function copyMatch(dist, length) {
if (dist > outPos) throw new Error('inflate: distance too far back');
ensure(length);
const from = outPos - dist;
if (dist >= length) {
out.copyWithin(outPos, from, from + length);
outPos += length;
} else {

for (let i = 0; i < length; i++) out[outPos + i] = out[from + i];
outPos += length;
}
}

let litTree = null;
let distTree = null;
let last = 0;

do {
last = rd.take(1);
const type = rd.take(2);

if (type === 0) {

rd.alignToByte();
if (rd.p + 4 > end) throw new Error('inflate: unexpected end of stream');
const len = data[rd.p] | (data[rd.p + 1] << 8);
const nlen = data[rd.p + 2] | (data[rd.p + 3] << 8);
if ((len ^ 0xffff) !== nlen) throw new Error('inflate: stored block length check failed');
rd.p += 4;
if (rd.p + len > end) throw new Error('inflate: unexpected end of stream');
ensure(len);
out.set(data.subarray(rd.p, rd.p + len), outPos);
outPos += len;
rd.p += len;
continue;
}

if (type === 3) throw new Error('inflate: invalid block type 3 (BTYPE 11)');

if (type === 1) {

if (_fixedLit === null) {
_fixedLit = buildTree(FIXED_LIT_LENGTHS, 288, 'fixed literal/length');
_fixedDist = buildTree(FIXED_DIST_LENGTHS, 32, 'fixed distance');
}
litTree = _fixedLit;
distTree = _fixedDist;
} else {

const hlit = rd.take(5) + 257;
const hdist = rd.take(5) + 1;
const hclen = rd.take(4) + 4;
if (hlit > 286 || hdist > 30) throw new Error('inflate: invalid dynamic block header counts');

const clenLengths = new Uint8Array(19);
for (let i = 0; i < hclen; i++) clenLengths[CLEN_ORDER[i]] = rd.take(3);
const clenTree = buildTree(clenLengths, 19, 'code length');

const total = hlit + hdist;
const lengths = new Uint8Array(total);
let i = 0;
while (i < total) {
const sym = decodeSym(clenTree, rd);
if (sym < 16) {
lengths[i++] = sym;
} else if (sym === 16) {
if (i === 0) throw new Error('inflate: repeat code 16 with no previous length');
const prev = lengths[i - 1];
const rep = 3 + rd.take(2);
if (i + rep > total) throw new Error('inflate: code length repeat overflows');
for (let k = 0; k < rep; k++) lengths[i++] = prev;
} else if (sym === 17) {
const rep = 3 + rd.take(3);
if (i + rep > total) throw new Error('inflate: code length repeat overflows');
for (let k = 0; k < rep; k++) lengths[i++] = 0;
} else {
const rep = 11 + rd.take(7);
if (i + rep > total) throw new Error('inflate: code length repeat overflows');
for (let k = 0; k < rep; k++) lengths[i++] = 0;
}
}

if (lengths[256] === 0) throw new Error('inflate: dynamic block has no end-of-block code');
litTree = buildTree(lengths.subarray(0, hlit), hlit, 'literal/length');
distTree = buildTree(lengths.subarray(hlit), hdist, 'distance');
}


for (;;) {
const sym = decodeSym(litTree, rd);
if (sym < 256) {
if (outPos === out.length) ensure(1);
out[outPos++] = sym;
continue;
}
if (sym === 256) break;

const li = sym - 257;
if (li >= 29) throw new Error('inflate: invalid length code ' + sym);
const length = LENGTH_BASE[li] + rd.take(LENGTH_EXTRA[li]);

const dsym = decodeSym(distTree, rd);
if (dsym >= 30) throw new Error('inflate: invalid distance code ' + dsym);
const dist = DIST_BASE[dsym] + rd.take(DIST_EXTRA[dsym]);

copyMatch(dist, length);
}
} while (last === 0);

rd.alignToByte();
return { out: out.slice(0, outPos), consumed: rd.p - start };
}

function toUint8(x) {
if (x instanceof Uint8Array) return x;
if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
if (x instanceof ArrayBuffer) return new Uint8Array(x);
if (x && typeof x.byteLength === 'number') return new Uint8Array(x);
throw new TypeError('zip: expected an ArrayBuffer or Uint8Array');
}





function inflateRaw(data, offset, compressedLength) {
const u8 = toUint8(data);
const start = offset === undefined ? 0 : offset | 0;
const end = compressedLength === undefined ? u8.length : start + (compressedLength | 0);
if (start < 0 || end < start || end > u8.length) throw new Error('inflate: invalid range');
return inflateCore(u8, start, end, Infinity).out;
}





function zipCryptKeys(password) {


let pwBytes;
let latin1 = true;
for (let i = 0; i < password.length; i++) {
if (password.charCodeAt(i) > 0xff) { latin1 = false; break; }
}
if (latin1) {
pwBytes = new Uint8Array(password.length);
for (let i = 0; i < password.length; i++) pwBytes[i] = password.charCodeAt(i) & 0xff;
} else {
pwBytes = new TextEncoder().encode(password);
}

let k0 = 0x12345678 >>> 0;
let k1 = 0x23456789 >>> 0;
let k2 = 0x34567890 >>> 0;
for (let i = 0; i < pwBytes.length; i++) {
const c = pwBytes[i];
k0 = crc32Update(k0, c);
k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
k2 = crc32Update(k2, (k1 >>> 24) & 0xff);
}
return [k0, k1, k2];
}

function zipCryptDecryptByte(k2) {
const temp = (k2 | 2) & 0xffff;
return ((temp * (temp ^ 1)) >>> 8) & 0xff;
}

function zipCryptUpdate(keys, plain) {
keys[0] = crc32Update(keys[0], plain);
keys[1] = (Math.imul((keys[1] + (keys[0] & 0xff)) >>> 0, 134775813) + 1) >>> 0;
keys[2] = crc32Update(keys[2], (keys[1] >>> 24) & 0xff);
}

function zipCryptDecode(src, start, end, keys) {
const out = new Uint8Array(end - start);
for (let i = start; i < end; i++) {
const plain = (src[i] ^ zipCryptDecryptByte(keys[2])) & 0xff;
out[i - start] = plain;
zipCryptUpdate(keys, plain);
}
return out;
}





const UTF8 = new TextDecoder('utf-8', { fatal: false });
const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true });
let _gbk;
let _gbkTried = false;

function gbkDecoder() {
if (!_gbkTried) {
_gbkTried = true;
try {
_gbk = new TextDecoder('gbk');
} catch (e) {
_gbk = null;
}
}
return _gbk;
}

function tryDecodeGbk(bytes) {
const dec = gbkDecoder();
if (!dec) return null;
try {
return dec.decode(bytes);
} catch (e) {
return null;
}
}

function hasReplacement(s) {
return s.indexOf('\uFFFD') !== -1;
}

function stripBom(s) {
return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}


function decodeName(bytes, utf8Flag) {
if (utf8Flag) {
try {
return UTF8_STRICT.decode(bytes);
} catch (e) {

}
}
const asUtf8 = UTF8.decode(bytes);
if (!hasReplacement(asUtf8)) return asUtf8;
const asGbk = tryDecodeGbk(bytes);
if (asGbk !== null && !hasReplacement(asGbk)) return asGbk;
return asUtf8;
}

const TEXT_EXT = /\.(csv|txt|json|xml)$/i;

function isTextName(name) {
return TEXT_EXT.test(name);
}


function decodeTextBytes(bytes) {
const asUtf8 = stripBom(UTF8.decode(bytes));
if (!hasReplacement(asUtf8)) return asUtf8;
const asGbk = tryDecodeGbk(bytes);
if (asGbk !== null && !hasReplacement(asGbk)) return stripBom(asGbk);
return asUtf8;
}





const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOCATOR = 0x07064b50;

const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_UTF8 = 0x0800;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const METHOD_AES = 99;

function readU64(dv, off) {
const lo = dv.getUint32(off, true);
const hi = dv.getUint32(off + 4, true);

if (hi >= 0x200000) throw new Error('zip: ZIP64 value exceeds 2^53 bytes');
return hi * 0x100000000 + lo;
}

function basename(name) {
const i = name.lastIndexOf('/');
return i === -1 ? name : name.slice(i + 1);
}

function shouldSkip(name) {
if (name === '__MACOSX/' || name.startsWith('__MACOSX/')) return true;
if (basename(name) === '.DS_Store') return true;
return false;
}








async function readZip(arrayBuffer, password) {
const u8 = toUint8(arrayBuffer);
const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
const len = u8.length;
if (len < 22) throw new Error('zip: file is too small to be a zip archive');

const pw = (typeof password === 'string' && password.length > 0) ? password : null;


let eocd = -1;
const lowest = Math.max(0, len - 65557);
for (let i = len - 22; i >= lowest; i--) {
if (dv.getUint32(i, true) === SIG_EOCD) {
const commentLen = dv.getUint16(i + 20, true);
if (i + 22 + commentLen <= len) { eocd = i; break; }
}
}
if (eocd < 0) throw new Error('zip: end of central directory record not found (not a zip file?)');

let totalEntries = dv.getUint16(eocd + 10, true);
let cdSize = dv.getUint32(eocd + 12, true);
let cdOffset = dv.getUint32(eocd + 16, true);


const locatorPos = eocd - 20;
if (locatorPos >= 0 && dv.getUint32(locatorPos, true) === SIG_EOCD64_LOCATOR) {
const z64Offset = readU64(dv, locatorPos + 8);
if (z64Offset < 0 || z64Offset + 56 > len) {
throw new Error('zip: ZIP64 end of central directory record is out of range');
}
if (dv.getUint32(z64Offset, true) !== SIG_EOCD64) {
throw new Error('zip: invalid ZIP64 end of central directory record signature');
}
totalEntries = readU64(dv, z64Offset + 32);
cdSize = readU64(dv, z64Offset + 40);
cdOffset = readU64(dv, z64Offset + 48);
} else if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
throw new Error('zip: ZIP64 archive detected but the ZIP64 end of central directory locator is missing');
}

if (cdOffset + cdSize > len) {
throw new Error('zip: central directory is out of range (truncated or corrupt file)');
}


const entries = [];
let p = cdOffset;

for (let n = 0; n < totalEntries; n++) {
if (p + 46 > len) throw new Error('zip: truncated central directory');
if (dv.getUint32(p, true) !== SIG_CENTRAL) {
throw new Error('zip: bad central directory entry signature at offset ' + p);
}

const flags = dv.getUint16(p + 8, true);
const method = dv.getUint16(p + 10, true);
const modTime = dv.getUint16(p + 12, true);
const crc = dv.getUint32(p + 16, true);
let compSize = dv.getUint32(p + 20, true);
let uncompSize = dv.getUint32(p + 24, true);
const nameLen = dv.getUint16(p + 28, true);
const extraLen = dv.getUint16(p + 30, true);
const commentLen = dv.getUint16(p + 32, true);
let localOffset = dv.getUint32(p + 42, true);

const nameStart = p + 46;
const extraStart = nameStart + nameLen;
if (extraStart + extraLen + commentLen > len) {
throw new Error('zip: truncated central directory entry');
}

const nameBytes = u8.subarray(nameStart, extraStart);
const extra = u8.subarray(extraStart, extraStart + extraLen);


if (uncompSize === 0xffffffff || compSize === 0xffffffff || localOffset === 0xffffffff) {
let ex = 0;
let found = false;
while (ex + 4 <= extra.length) {
const id = extra[ex] | (extra[ex + 1] << 8);
const size = extra[ex + 2] | (extra[ex + 3] << 8);
if (ex + 4 + size > extra.length) break;
if (id === 0x0001) {
const edv = new DataView(extra.buffer, extra.byteOffset + ex + 4, size);
let q = 0;
if (uncompSize === 0xffffffff) {
if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
uncompSize = readU64(edv, q);
q += 8;
}
if (compSize === 0xffffffff) {
if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
compSize = readU64(edv, q);
q += 8;
}
if (localOffset === 0xffffffff) {
if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
localOffset = readU64(edv, q);
q += 8;
}
found = true;
break;
}
ex += 4 + size;
}
if (!found || uncompSize === 0xffffffff || compSize === 0xffffffff || localOffset === 0xffffffff) {
throw new Error('zip: ZIP64 entry is missing its extended information extra field');
}
}

const name = decodeName(nameBytes, (flags & FLAG_UTF8) !== 0);
p = extraStart + extraLen + commentLen;

if (shouldSkip(name)) continue;

const dir = name.endsWith('/');
const encrypted = (flags & FLAG_ENCRYPTED) !== 0;
const hasDescriptor = (flags & FLAG_DATA_DESCRIPTOR) !== 0;

if (method === METHOD_AES) {
throw new Error('zip: AES-encrypted zip entries (compression method 99 / WinZip AES) are unsupported');
}


if (localOffset + 30 > len) throw new Error('zip: local file header out of range for "' + name + '"');
if (dv.getUint32(localOffset, true) !== SIG_LOCAL) {
throw new Error('zip: bad local file header signature for "' + name + '"');
}
const localNameLen = dv.getUint16(localOffset + 26, true);
const localExtraLen = dv.getUint16(localOffset + 28, true);
let dataStart = localOffset + 30 + localNameLen + localExtraLen;
if (dataStart > len) throw new Error('zip: local file header is truncated for "' + name + '"');

let raw = null;






if (hasDescriptor && compSize === 0 && uncompSize === 0 && method === METHOD_DEFLATE && !encrypted && !dir) {
raw = inflateCore(u8, dataStart, len, MAX_OUTPUT).out;
if (crc32(raw) !== crc) {
throw new Error('zip: the central directory has no sizes for the data-descriptor entry "' + name + '"');
}
} else {
let payloadStart = dataStart;
const payloadEnd = dataStart + compSize;
if (payloadEnd > len) throw new Error('zip: file data is out of range for "' + name + '" (truncated file)');

if (encrypted) {
if (!pw) throw new Error('zip: "' + name + '" is encrypted but no password was supplied');
if (payloadEnd - payloadStart < 12) throw new Error('zip: encrypted entry "' + name + '" is too short');
const keys = zipCryptKeys(pw);
const header = zipCryptDecode(u8, payloadStart, payloadStart + 12, keys);


const expected = hasDescriptor ? ((modTime >>> 8) & 0xff) : ((crc >>> 24) & 0xff);
if (header[11] !== expected) throw new Error('密码不正确');
payloadStart += 12;
const decrypted = zipCryptDecode(u8, payloadStart, payloadEnd, keys);

if (method === METHOD_STORE) raw = decrypted;
else if (method === METHOD_DEFLATE) {
raw = inflateCore(decrypted, 0, decrypted.length, uncompSize * 2 + 65536).out;
} else {
throw new Error('zip: unsupported compression method ' + method + ' for "' + name + '"');
}
} else {
const payload = u8.subarray(payloadStart, payloadEnd);
if (method === METHOD_STORE) raw = payload;
else if (method === METHOD_DEFLATE) {
raw = inflateCore(payload, 0, payload.length, uncompSize * 2 + 65536).out;
} else {
throw new Error('zip: unsupported compression method ' + method + ' for "' + name + '"');
}
}
}

const entry = {
name,
dir,
bytes: raw,
crcOk: crc32(raw) === crc,
};
if (!dir && isTextName(name)) entry.text = decodeTextBytes(raw);
entries.push(entry);
}

return entries;
}
    return { crc32, inflateRaw, readZip };
  };

  /* ---------- src/ui/charts.js ---------- */
  __mods["src/ui/charts.js"] = function (__rmod) {





















const FONT_FAMILY = "-apple-system, 'SF Pro Text', 'PingFang SC', system-ui, sans-serif";
const FONT_ATTR = `font-family="${FONT_FAMILY}"`;
const FONT_CSS = `font-family:${FONT_FAMILY}`;


const APPLE_COLORS = Object.freeze({
blue: '#0A84FF',
green: '#30D158',
orange: '#FF9F0A',
red: '#FF3B30',
purple: '#BF5AF2',
pink: '#FF375F',
teal: '#64D2FF',
gray: '#8E8E93',
});


const PALETTE = Object.freeze([
APPLE_COLORS.blue,
APPLE_COLORS.green,
APPLE_COLORS.orange,
APPLE_COLORS.red,
APPLE_COLORS.purple,
APPLE_COLORS.pink,
APPLE_COLORS.teal,
APPLE_COLORS.gray,
]);


const LEVEL_COLORS = Object.freeze({
ok: APPLE_COLORS.green,
warn: APPLE_COLORS.orange,
danger: APPLE_COLORS.red,
none: APPLE_COLORS.gray,
});





let idSeq = 0;





function nextId(prefix) {
idSeq += 1;
const base = String(prefix === undefined || prefix === null ? 'qz' : prefix)
.replace(/[^A-Za-z0-9_-]+/g, '-')
.replace(/^-+|-+$/g, '');
return `${base || 'qz'}-${idSeq.toString(36)}`;
}


function esc(value) {
if (value === null || value === undefined) return '';
return String(value)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}


function num(value) {
if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
if (typeof value === 'string' && value.trim() !== '') {
const n = Number(value);
return Number.isFinite(n) ? n : 0;
}
return 0;
}


function px(value) {
const n = Math.round(num(value) * 100) / 100;
return String(n === 0 ? 0 : n);
}

function clamp(value, lo, hi) {
const n = num(value);
if (n < lo) return lo;
if (n > hi) return hi;
return n;
}


function str(value) {
return value === null || value === undefined ? '' : String(value);
}





function labelOf(value) {
if (typeof value === 'number' && !Number.isFinite(value)) return '';
return str(value);
}






function formatMoney(cents) {
const n = Math.round(num(cents));
const negative = n < 0;
const abs = Math.abs(n);
const yuan = Math.floor(abs / 100);
const fen = abs - yuan * 100;
const grouped = String(yuan).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
return `${negative ? '-' : ''}¥${grouped}.${String(fen).padStart(2, '0')}`;
}


function fmtPercent(value) {
return `${Math.round(num(value) * 10) / 10}%`;
}

function pickFormatter(opts) {
return typeof opts.formatValue === 'function' ? opts.formatValue : formatMoney;
}


function fmtValue(fmt, value) {
try {
return str(fmt(value));
} catch (_) {
return '';
}
}


function truncate(text, max) {
const s = str(text);
const limit = Math.max(1, Math.floor(num(max) || 4));
const chars = Array.from(s);
return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : s;
}


function estWidth(text, fontSize = 11) {
let w = 0;
for (const ch of str(text)) {
w += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
}
return w;
}





function shell(width, height, body = '') {
return (
`<svg class="qz-chart" xmlns="http://www.w3.org/2000/svg" ${FONT_ATTR}` +
` width="100%" height="${px(height)}" viewBox="0 0 ${px(width)} ${px(height)}"` +
` preserveAspectRatio="xMidYMid meet"` +
` style="${FONT_CSS};height:auto;display:block">${body}</svg>`
);
}

function straightPath(pts) {
if (!pts.length) return '';
return pts
.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x)} ${px(p.y)}`)
.join(' ');
}





function smoothPath(pts) {
if (!pts.length) return '';
if (pts.length < 3) return straightPath(pts);
let d = `M${px(pts[0].x)} ${px(pts[0].y)}`;
for (let i = 0; i < pts.length - 1; i++) {
const p0 = pts[i - 1] || pts[i];
const p1 = pts[i];
const p2 = pts[i + 1];
const p3 = pts[i + 2] || p2;
const c1x = p1.x + (p2.x - p0.x) / 6;
const c1y = p1.y + (p2.y - p0.y) / 6;
const c2x = p2.x - (p3.x - p1.x) / 6;
const c2y = p2.y - (p3.y - p1.y) / 6;
d += ` C${px(c1x)} ${px(c1y)} ${px(c2x)} ${px(c2y)} ${px(p2.x)} ${px(p2.y)}`;
}
return d;
}


function toPoints(values, width, height, padX, padY) {
const n = values.length;
const plotW = Math.max(1, width - padX * 2);
const plotH = Math.max(1, height - padY * 2);

let min = Infinity;
let max = -Infinity;
for (const v of values) {
if (v < min) min = v;
if (v > max) max = v;
}
if (!Number.isFinite(min) || !Number.isFinite(max)) {
min = 0;
max = 1;
}
if (min === max) {
if (min === 0) {
max = 1;
} else {
const d = Math.abs(min) * 0.5 || 1;
min -= d;
max += d;
}
}
const span = max - min || 1;

return values.map((v, i) => {
const x = n === 1 ? padX + plotW / 2 : padX + (plotW * i) / (n - 1);
const y = padY + plotH * (1 - (v - min) / span);
return { x, y, value: v };
});
}


function layoutLegend(entries, width, fontSize = 11) {
const lines = [];
let line = [];
let x = 0;
const swatch = 8;
const gap = 14;
for (const entry of entries) {
const w = swatch + estWidth(entry.label, fontSize);
if (x > 0 && x + w > width) {
lines.push(line);
line = [];
x = 0;
}
line.push({ label: entry.label, color: entry.color, x, w });
x += w + gap;
}
if (line.length) lines.push(line);
return lines;
}

















function donutChart(items, opts = {}) {
const o = opts || {};
const list = (Array.isArray(items) ? items : []).map((raw) => {
const it = raw || {};
return {
label: labelOf(it.label),
value: num(it.value),
color: it.color ? str(it.color) : '',
percent: it.percent === undefined || it.percent === null ? null : num(it.percent),
};
});

const size = clamp(num(o.size) || 180, 60, 2000);
const thickness = clamp(num(o.thickness) || 22, 2, Math.max(2, size / 2 - 6));
const gapDeg = o.gap === undefined || o.gap === null ? 2 : clamp(o.gap, 0, 90);
const fmt = pickFormatter(o);

const cx = size / 2;
const cy = size / 2;
const radius = Math.max(1, (size - thickness) / 2);
const circumference = 2 * Math.PI * radius;

const positive = list.filter((it) => it.value > 0);
const total = positive.reduce((sum, it) => sum + it.value, 0);
const hasData = positive.length > 0 && total > 0;


const segGap = positive.length <= 1 ? Math.max(gapDeg, 2) : gapDeg;

const segmentMarkup = [];
if (hasData) {
let cursor = 0;
positive.forEach((it, index) => {
const frac = it.value / total;
const len = frac * circumference;
const start = cursor * circumference;
cursor += frac;

const gapLen = Math.min((segGap / 360) * circumference, Math.max(0, len - 0.6));
const dash = len - gapLen;
if (dash <= 0.05) return;

const pct = it.percent === null ? frac * 100 : it.percent;
const color = it.color || PALETTE[index % PALETTE.length];
const title = `${it.label ? `${it.label} ` : ''}${fmtPercent(pct)} ${fmtValue(fmt, it.value)}`;

segmentMarkup.push(
`<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none"` +
` style="stroke:${esc(color)}" stroke-width="${px(thickness)}"` +
` stroke-dasharray="${px(dash)} ${px(circumference)}"` +
` stroke-dashoffset="${px(-start)}" stroke-linecap="butt">` +
`<title>${esc(title)}</title></circle>`
);
});
}


const track = hasData
? `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--fill)" stroke-width="${px(thickness)}" opacity="0.6"/>`
: `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--separator)" stroke-width="${px(thickness)}" opacity="0.75"/>`;

const ring = `<g transform="rotate(-90 ${px(cx)} ${px(cy)})">${track}${segmentMarkup.join('')}</g>`;

const labelText = labelOf(o.centerLabel);
const valueText = typeof o.centerValue === 'number' ? fmtValue(fmt, o.centerValue) : labelOf(o.centerValue);
const labelSize = Math.max(9, Math.round(size * 0.075));
const valueSize = Math.max(12, Math.round(size * 0.115));

const center =
`<text x="${px(cx)}" y="${px(cy - size * 0.02)}" text-anchor="middle" font-size="${labelSize}" style="fill:var(--label-2)">${esc(labelText)}</text>` +
`<text x="${px(cx)}" y="${px(cy + size * 0.12)}" text-anchor="middle" font-size="${valueSize}" font-weight="600" style="fill:var(--label)">${esc(valueText)}</text>`;

return shell(size, size, ring + center);
}



















function barChart(items, opts = {}) {
const o = opts || {};
const list = (Array.isArray(items) ? items : []).map((raw) => {
const it = raw || {};
const hasSecond = it.value2 !== undefined && it.value2 !== null;
return {
label: labelOf(it.label),
value: num(it.value),
value2: hasSecond ? num(it.value2) : null,
color: it.color ? str(it.color) : '',
color2: it.color2 ? str(it.color2) : '',
};
});

const width = clamp(num(o.width) || 320, 80, 4000);
const height = clamp(num(o.height) || 160, 60, 2400);
if (!list.length) return shell(width, height);

const showAxis = !!o.showAxis;
const showValues = !!o.showValues;
const fmt = pickFormatter(o);
const labelMax = o.labelMax === undefined || o.labelMax === null ? 4 : o.labelMax;

const padL = showAxis ? 46 : 10;
const padR = 10;
const padT = showValues ? 22 : 14;
const padB = 22;
const plotW = Math.max(1, width - padL - padR);
const plotH = Math.max(1, height - padT - padB);
const baseY = padT + plotH;


const maxValue = list.reduce((m, it) => {
const a = it.value > 0 ? it.value : 0;
const b = it.value2 !== null && it.value2 > 0 ? it.value2 : 0;
return Math.max(m, a, b);
}, 0);
const scale = maxValue > 0 ? maxValue : 1;

const yOf = (value) => {
const v = value > 0 ? value : 0;
return padT + plotH * (1 - v / scale);
};

const parts = [];


for (const f of [0.25, 0.5, 0.75]) {
const y = padT + plotH * f;
parts.push(
`<line x1="${px(padL)}" y1="${px(y)}" x2="${px(width - padR)}" y2="${px(y)}" style="stroke:var(--separator)" stroke-width="1" opacity="0.45"/>`
);
if (showAxis) {
parts.push(
`<text x="${px(padL - 6)}" y="${px(y + 3)}" text-anchor="end" font-size="10" style="fill:var(--label-2)">${esc(fmtValue(fmt, scale * (1 - f)))}</text>`
);
}
}
parts.push(
`<line x1="${px(padL)}" y1="${px(baseY)}" x2="${px(width - padR)}" y2="${px(baseY)}" style="stroke:var(--separator)" stroke-width="1" opacity="0.8"/>`
);

const slot = plotW / list.length;
const barW = Math.max(1, Math.min(46, slot * 0.62, Math.max(1, slot - 2)));
const frontW = Math.max(2, barW * 0.55);

list.forEach((it, i) => {
const centerX = padL + slot * (i + 0.5);
const color = it.color || (o.color ? str(o.color) : PALETTE[i % PALETTE.length]);
const color2 = it.color2 || (o.color2 ? str(o.color2) : APPLE_COLORS.gray);

const topMain = yOf(it.value);
const hMain = Math.max(0, baseY - topMain);
const topSecond = it.value2 === null ? null : yOf(it.value2);
const hSecond = topSecond === null ? 0 : Math.max(0, baseY - topSecond);


if (topSecond !== null) {
const rx = Math.min(5, barW / 2, hSecond / 2);
parts.push(
`<rect x="${px(centerX - barW / 2)}" y="${px(topSecond)}" width="${px(barW)}" height="${px(hSecond)}"` +
` rx="${px(rx)}" ry="${px(rx)}" fill="${esc(color2)}" opacity="0.35">` +
`<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, it.value2)}`)}</title></rect>`
);
}


const rxMain = Math.min(5, frontW / 2, hMain / 2);
parts.push(
`<rect x="${px(centerX - frontW / 2)}" y="${px(topMain)}" width="${px(frontW)}" height="${px(hMain)}"` +
` rx="${px(rxMain)}" ry="${px(rxMain)}" fill="${esc(color)}">` +
`<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, it.value)}`)}</title></rect>`
);

if (showValues) {
parts.push(
`<text x="${px(centerX)}" y="${px(Math.max(padT - 6, topMain - 5))}" text-anchor="middle" font-size="10" style="fill:var(--label)">${esc(fmtValue(fmt, it.value))}</text>`
);
if (topSecond !== null && Math.abs(topSecond - topMain) > 13) {
parts.push(
`<text x="${px(centerX)}" y="${px(Math.max(padT - 6, topSecond - 5))}" text-anchor="middle" font-size="10" style="fill:var(--label-2)">${esc(fmtValue(fmt, it.value2))}</text>`
);
}
}

if (it.label) {
parts.push(
`<text x="${px(centerX)}" y="${px(height - 6)}" text-anchor="middle" font-size="11" style="fill:var(--label-2)">${esc(truncate(it.label, labelMax))}</text>`
);
}
});

return shell(width, height, parts.join(''));
}

















function lineChart(points, opts = {}) {
const o = opts || {};
const list = (Array.isArray(points) ? points : []).map((raw) => {
const p = raw || {};
return { label: labelOf(p.label), value: num(p.value) };
});

const width = clamp(num(o.width) || 320, 80, 4000);
const height = clamp(num(o.height) || 140, 40, 2400);
const gid = nextId(typeof o.idPrefix === 'string' && o.idPrefix ? o.idPrefix : 'qz-line');

if (!list.length) return shell(width, height);

const color = o.color ? str(o.color) : APPLE_COLORS.blue;
const fmt = pickFormatter(o);
const smooth = o.smooth !== false;

const padX = 12;
const padT = 16;
const padB = 16;
const baseY = padT + Math.max(1, height - padT - padB);

const pts = toPoints(list.map((p) => p.value), width, height, padX, padT);
pts.forEach((p, i) => { p.label = list[i].label; });

const n = pts.length;
const line = smooth ? smoothPath(pts) : straightPath(pts);
const area = `${line} L${px(pts[n - 1].x)} ${px(baseY)} L${px(pts[0].x)} ${px(baseY)} Z`;

const defs =
`<defs><linearGradient id="${esc(gid)}" x1="0" y1="0" x2="0" y2="1">` +
`<stop offset="0" style="stop-color:${esc(color)};stop-opacity:0.32"/>` +
`<stop offset="1" style="stop-color:${esc(color)};stop-opacity:0"/>` +
`</linearGradient></defs>`;

const parts = [
defs,
`<path d="${area}" fill="url(#${esc(gid)})" stroke="none"/>`,
`<path d="${line}" fill="none" stroke="${esc(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
];


pts.forEach((p, i) => {
const isLast = i === n - 1;
const title = `${p.label ? `${p.label} ` : ''}${fmtValue(fmt, p.value)}`;
parts.push(
`<circle cx="${px(p.x)}" cy="${px(p.y)}" r="${isLast ? 4 : 2.5}" fill="${esc(color)}"><title>${esc(title)}</title></circle>`
);
});

if (o.showLastValue) {
const last = pts[n - 1];
const anchor = last.x > width - 40 ? 'end' : 'middle';
const x = anchor === 'end' ? width - 4 : clamp(last.x, 20, width - 20);
const y = Math.max(11, last.y - 10);
parts.push(
`<text x="${px(x)}" y="${px(y)}" text-anchor="${anchor}" font-size="11" font-weight="600" style="fill:var(--label)">${esc(fmtValue(fmt, last.value))}</text>`
);
}

return shell(width, height, parts.join(''));
}














function sparkline(values, opts = {}) {
const o = opts || {};
const list = (Array.isArray(values) ? values : []).map((raw) => {
if (raw !== null && typeof raw === 'object') {
return { label: labelOf(raw.label), value: num(raw.value) };
}
return { label: '', value: num(raw) };
});

const width = clamp(num(o.width) || 64, 8, 4000);
const height = clamp(num(o.height) || 20, 4, 2000);
if (!list.length) return shell(width, height);

const color = o.color ? str(o.color) : APPLE_COLORS.blue;
const fmt = pickFormatter(o);
const pad = 2;
const pts = toPoints(list.map((p) => p.value), width, height, pad, pad);

let d;
if (pts.length === 1) {
d = `M${px(pad)} ${px(pts[0].y)} L${px(width - pad)} ${px(pts[0].y)}`;
} else {
d = straightPath(pts);
}

const last = list[list.length - 1];
const title = last.label ? `<title>${esc(`${last.label} ${fmtValue(fmt, last.value)}`)}</title>` : '';

return shell(
width,
height,
title +
`<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
);
}

















function progressRing(ratio, opts = {}) {
const o = opts || {};
const size = clamp(num(o.size) || 120, 40, 2000);
const thickness = clamp(num(o.thickness) || 10, 2, Math.max(2, size / 2 - 4));
const value = num(ratio);

const levels = ['ok', 'warn', 'danger', 'none'];
const level = levels.includes(o.level)
? o.level
: value >= 1
? 'danger'
: value >= 0.8
? 'warn'
: 'ok';
const color = o.color ? str(o.color) : LEVEL_COLORS[level];

const pct = clamp(value, 0, 1);
const cx = size / 2;
const cy = size / 2;
const radius = Math.max(1, (size - thickness) / 2);
const circumference = 2 * Math.PI * radius;

const track = `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--fill)" stroke-width="${px(thickness)}"/>`;

let arc = '';
if (pct >= 0.999) {

arc = `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:${esc(color)}" stroke-width="${px(thickness)}" stroke-linecap="round"/>`;
} else if (pct > 0) {
arc =
`<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none"` +
` style="stroke:${esc(color)}" stroke-width="${px(thickness)}"` +
` stroke-dasharray="${px(pct * circumference)} ${px(circumference)}" stroke-dashoffset="0" stroke-linecap="round"/>`;
}

const ring = `<g transform="rotate(-90 ${px(cx)} ${px(cy)})">${track}${arc}</g>`;

const labelText = labelOf(o.label);
const valueText = labelOf(o.value);
const labelSize = Math.max(9, Math.round(size * 0.09));
const valueSize = Math.max(12, Math.round(size * 0.16));
const center =
`<text x="${px(cx)}" y="${px(cy - size * 0.02)}" text-anchor="middle" font-size="${labelSize}" style="fill:var(--label-2)">${esc(labelText)}</text>` +
`<text x="${px(cx)}" y="${px(cy + size * 0.12)}" text-anchor="middle" font-size="${valueSize}" font-weight="700" style="fill:var(--label)">${esc(valueText)}</text>`;

return shell(size, size, ring + center);
}





















function stackedBar(items, opts = {}) {
const o = opts || {};
const list = (Array.isArray(items) ? items : []).map((raw) => {
const it = raw || {};
const segs = (Array.isArray(it.segments) ? it.segments : []).map((s) => {
const seg = s || {};
const v = num(seg.value);
return { label: labelOf(seg.label), value: v > 0 ? v : 0, color: seg.color ? str(seg.color) : '' };
});
return { label: labelOf(it.label), segments: segs };
});

const width = clamp(num(o.width) || 320, 80, 4000);
const rowGap = clamp(o.rowGap === undefined || o.rowGap === null ? 12 : o.rowGap, 0, 60);
const labelWidth = clamp(
o.labelWidth === undefined || o.labelWidth === null ? 56 : o.labelWidth,
0,
Math.max(0, width / 2)
);
const labelMax = o.labelMax === undefined || o.labelMax === null ? 5 : o.labelMax;
const showPercent = !!o.showPercent;
const showTotal = !!o.showTotal;
const fmt = pickFormatter(o);

if (!list.length) return shell(width, clamp(num(o.height) || 60, 20, 2000));


const entries = [];
const seen = new Set();
for (const it of list) {
for (const seg of it.segments) {
if (!seg.label || seg.value <= 0 || seen.has(seg.label)) continue;
seen.add(seg.label);
entries.push({ label: seg.label, color: seg.color || PALETTE[entries.length % PALETTE.length] });
}
}
const legendOpt = o.showLegend === undefined ? o.legend : o.showLegend;
const showLegend = legendOpt === undefined ? entries.length > 0 : !!legendOpt;
const legendLines = showLegend ? layoutLegend(entries, Math.max(40, width - 8), 11) : [];
const legendH = legendLines.length * 18;

const top = 6;
const legendBlock = legendH ? legendH + 8 : 0;
const heightOpt = o.height === undefined || o.height === null ? null : clamp(num(o.height), 24, 20000);

let rowHeight;
let height;
if (heightOpt === null) {
rowHeight = clamp(num(o.rowHeight) || 20, 6, 200);
height = clamp(top + list.length * rowHeight + Math.max(0, list.length - 1) * rowGap + legendBlock + 6, 24, 20000);
} else {

height = heightOpt;
const avail = height - top - legendBlock - 6 - Math.max(0, list.length - 1) * rowGap;
rowHeight = clamp(avail / list.length, 6, 200);
}

const barX = labelWidth > 0 ? labelWidth : 4;
const totalW = showTotal ? 70 : 4;
const barW = Math.max(1, width - barX - totalW);
const radius = Math.min(rowHeight / 2, barW / 2, 10);
const parts = [];

list.forEach((it, i) => {
const y = top + i * (rowHeight + rowGap);
const total = it.segments.reduce((s, seg) => s + (seg.value > 0 ? seg.value : 0), 0);
const clipId = nextId('qz-stack');

parts.push(
`<defs><clipPath id="${esc(clipId)}"><rect x="${px(barX)}" y="${px(y)}" width="${px(barW)}" height="${px(rowHeight)}" rx="${px(radius)}" ry="${px(radius)}"/></clipPath></defs>`
);
parts.push(
`<rect x="${px(barX)}" y="${px(y)}" width="${px(barW)}" height="${px(rowHeight)}" rx="${px(radius)}" ry="${px(radius)}" style="fill:var(--fill)">` +
`<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, total)}`)}</title></rect>`
);

if (total > 0) {
let x = barX;
it.segments.forEach((seg, j) => {
if (seg.value <= 0) return;
const w = (seg.value / total) * barW;
const pct = (seg.value / total) * 100;
const color = seg.color || PALETTE[j % PALETTE.length];
const title = `${it.label ? `${it.label} ` : ''}${seg.label ? `${seg.label} ` : ''}${fmtPercent(pct)} ${fmtValue(fmt, seg.value)}`;

parts.push(
`<g clip-path="url(#${esc(clipId)})"><rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(rowHeight)}"` +
` fill="${esc(color)}"><title>${esc(title)}</title></rect></g>`
);
if (showPercent && w > 30) {
parts.push(
`<text x="${px(x + w / 2)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="middle" font-size="10" fill="#FFFFFF" opacity="0.95">${esc(fmtPercent(pct))}</text>`
);
}
x += w;
});
}

if (labelWidth > 0 && it.label) {
parts.push(
`<text x="${px(labelWidth - 6)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="end" font-size="12" style="fill:var(--label-2)">${esc(truncate(it.label, labelMax))}</text>`
);
}

if (showTotal) {
parts.push(
`<text x="${px(width - 4)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="end" font-size="11" style="fill:var(--label-2)">${esc(fmtValue(fmt, total))}</text>`
);
}
});

if (legendLines.length) {
const legendTop = top + list.length * rowHeight + Math.max(0, list.length - 1) * rowGap + 8;
legendLines.forEach((line, li) => {
const y = legendTop + li * 18 + 4;
for (const entry of line) {
parts.push(`<circle cx="${px(entry.x + 4)}" cy="${px(y)}" r="4" fill="${esc(entry.color)}"/>`);
parts.push(
`<text x="${px(entry.x + 12)}" y="${px(y + 4)}" font-size="11" style="fill:var(--label-2)">${esc(entry.label)}</text>`
);
}
});
}

return shell(width, height, parts.join(''));
}
    return { APPLE_COLORS, PALETTE, LEVEL_COLORS, esc, num, formatMoney, donutChart, barChart, lineChart, sparkline, progressRing, stackedBar };
  };

  /* ---------- src/ui/demo.js ---------- */
  __mods["src/ui/demo.js"] = function (__rmod) {
    var { makeTx } = __rmod("src/core/model.js");
    var { classify } = __rmod("src/core/classify.js");
    var { fingerprint } = __rmod("src/core/parser.js");












const MERCHANTS = [

['瑞幸咖啡', [9, 32], 14, 'food'],
['麦当劳', [15, 55], 8, 'food'],
['肯德基', [18, 60], 6, 'food'],
['美团外卖', [18, 55], 18, 'food'],
['饿了么', [16, 48], 12, 'food'],
['蜜雪冰城', [4, 16], 9, 'food'],
['星巴克', [28, 58], 4, 'food'],
['喜茶', [15, 32], 3, 'food'],
['学校食堂', [8, 22], 22, 'food'],
['罗森便利店', [6, 35], 7, 'food'],
['鲜丰水果', [12, 60], 4, 'food'],
['海底捞火锅', [88, 260], 2, 'food'],


['上海地铁', [3, 8], 26, 'transport'],
['滴滴出行', [12, 68], 9, 'transport'],
['哈啰单车', [1.5, 4], 8, 'transport'],
['中国石化加油', [200, 420], 2, 'transport'],
['铁路12306', [55, 320], 3, 'transport'],


['淘宝', [25, 380], 12, 'shopping'],
['天猫超市', [30, 200], 6, 'shopping'],
['京东商城', [45, 900], 5, 'shopping'],
['拼多多', [9, 120], 6, 'shopping'],
['优衣库', [99, 499], 2, 'shopping'],
['名创优品', [15, 90], 3, 'shopping'],
['Apple Store', [149, 1999], 1, 'shopping'],
['小米之家', [79, 699], 1, 'shopping'],


['中国移动话费', [30, 100], 3, 'housing'],
['上海市电力公司', [45, 180], 3, 'housing'],
['小区物业管理费', [120, 260], 3, 'housing'],


['万达影城', [35, 88], 3, 'fun'],
['B站大会员', [15, 148], 3, 'subs'],
['网易云音乐', [8, 88], 2, 'subs'],
['健身房月卡', [199, 399], 2, 'fun'],
['去哪儿旅行', [280, 1600], 1, 'fun'],
['宠物店', [45, 260], 2, 'fun'],


['叮当快药', [18, 120], 3, 'medical'],
['校医院', [10, 260], 2, 'medical'],
['益丰大药房', [20, 160], 2, 'medical'],


['当当网图书', [25, 180], 4, 'education'],
['中国知网', [10, 60], 2, 'education'],
['新东方在线', [199, 1200], 1, 'education'],
['学校教材费', [60, 320], 2, 'education'],
];

function pickWeighted(list, rnd) {
const total = list.reduce((s, x) => s + x[2], 0);
let r = rnd() * total;
for (const item of list) {
r -= item[2];
if (r <= 0) return item;
}
return list[list.length - 1];
}


function makeRnd(seed = 20260101) {
let a = seed;
return function () {
a |= 0; a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}




function demoTxs() {
const rnd = makeRnd(20260101);
const out = [];
const now = new Date();
const batchId = 'demo_batch';


const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
const days = Math.floor((now - start) / 86400000);

for (let d = 0; d <= days; d++) {
const day = new Date(start.getTime() + d * 86400000);
const isWeekend = day.getDay() === 0 || day.getDay() === 6;

const n = Math.floor(rnd() * (isWeekend ? 5 : 3)) + 1;

for (let i = 0; i < n; i++) {
const [merchant, [lo, hi], , ] = pickWeighted(MERCHANTS, rnd);
let amount = lo + rnd() * (hi - lo);

amount = amount >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100;

const hour = rnd() < 0.25 ? 8 + Math.floor(rnd() * 3)
: rnd() < 0.5 ? 11 + Math.floor(rnd() * 2)
: rnd() < 0.8 ? 17 + Math.floor(rnd() * 3)
: 12 + Math.floor(rnd() * 10);

const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
hour, Math.floor(rnd() * 60), Math.floor(rnd() * 60)).getTime();

const src = rnd() < 0.55 ? 'wechat' : 'alipay';
const cls = classify({ merchant }, new Map());

const tx = makeTx({
ts,
amountCents: Math.round(amount * 100),
type: 'expense',
category: cls.category,
merchant,
description: src === 'wechat' ? '微信支付' : '支付宝支付',
source: src,
account: src === 'wechat' ? '零钱' : (rnd() < 0.5 ? '余额宝' : '花呗'),
batchId,
});
tx.fp = fingerprint(tx);
out.push(tx);
}
}


for (let m = 2; m >= 0; m--) {
const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
const add = (dayOfMonth, merchant, yuan, category, type = 'expense', source = 'manual') => {
const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
const dd = Math.min(dayOfMonth, lastDay);
const ts = new Date(base.getFullYear(), base.getMonth(), dd, 9, 30, 0).getTime();
if (ts > now.getTime()) return;
const tx = makeTx({
ts, amountCents: Math.round(yuan * 100), type, category, merchant,
description: type === 'expense' ? '每月固定支出' : '每月固定收入',
source, account: '', batchId,
});
tx.fp = fingerprint(tx);
out.push(tx);
};

add(1, '房租', 1800, 'housing');
add(5, 'iCloud 自动续费', 6, 'subs');
add(8, '中国移动话费', 59, 'housing');
add(10, '上海市电力公司', 78.4, 'housing');
add(12, 'B站大会员', 15, 'subs');
add(15, '健身房月卡', 268, 'fun');
add(20, '爸妈生活费', 1500, 'income', 'income');
add(25, '学校补贴', 600, 'income', 'income');
}










const refundMerchants = [['京东商城', 189], ['淘宝', 68.5], ['优衣库', 199]];
for (let i = 0; i < refundMerchants.length; i++) {
const [merchant, yuan] = refundMerchants[i];

const d = new Date(now.getFullYear(), now.getMonth() - (i + 1), 20, 14, 20, 0);
const tx = makeTx({
ts: d.getTime(), amountCents: Math.round(yuan * 100), type: 'refund', category: 'refund',
merchant, description: '退款', source: 'alipay', batchId,
});
tx.fp = fingerprint(tx);
out.push(tx);
}


for (let i = 0; i < 5; i++) {
const ts = new Date(now.getFullYear(), now.getMonth() - (i % 3), 2 + i * 4, 20, 15, 0).getTime();
if (ts > now.getTime()) continue;
const tx = makeTx({
ts, amountCents: [2000, 6600, 8800, 5200, 13140][i], type: 'redpacket', category: 'redpacket',
merchant: ['妈妈', '爸爸', '室友小李', '表哥', '奶奶'][i], description: '微信红包', source: 'wechat', batchId,
});
tx.fp = fingerprint(tx);
out.push(tx);
}


for (let m = 2; m >= 0; m--) {
const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
const t1 = new Date(base.getFullYear(), base.getMonth(), 6, 10, 0, 0).getTime();
const t2 = new Date(base.getFullYear(), base.getMonth(), 18, 21, 0, 0).getTime();
if (t1 <= now.getTime()) {
const a = makeTx({
ts: t1, amountCents: 200000, type: 'transfer', category: 'other',
merchant: '余额宝', description: '转入余额宝', source: 'alipay', batchId,
});
a.fp = fingerprint(a);
out.push(a);
}
if (t2 <= now.getTime()) {
const b = makeTx({
ts: t2, amountCents: 45800, type: 'repay', category: 'other',
merchant: '花呗', description: '花呗自动还款', source: 'alipay', batchId,
});
b.fp = fingerprint(b);
out.push(b);
}
}

out.sort((a, b) => a.ts - b.ts);
return out;
}
    return { demoTxs };
  };

  /* ---------- src/ui/qr.js ---------- */
  __mods["src/ui/qr.js"] = function (__rmod) {















const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initTables() {
let x = 1;
for (let i = 0; i < 255; i++) {
EXP[i] = x;
LOG[x] = i;
x <<= 1;
if (x & 0x100) x ^= 0x11D;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
if (a === 0 || b === 0) return 0;
return EXP[LOG[a] + LOG[b]];
}


function rsGenerator(degree) {
let poly = [1];
for (let i = 0; i < degree; i++) {
const next = new Array(poly.length + 1).fill(0);
for (let j = 0; j < poly.length; j++) {
next[j] ^= gfMul(poly[j], 1);
next[j + 1] ^= gfMul(poly[j], EXP[i]);
}
poly = next;
}
return poly;
}


function rsEncode(data, ecCount) {
const gen = rsGenerator(ecCount);
const res = new Array(data.length + ecCount).fill(0);
for (let i = 0; i < data.length; i++) res[i] = data[i];

for (let i = 0; i < data.length; i++) {
const coef = res[i];
if (coef === 0) continue;
for (let j = 1; j < gen.length; j++) {
res[i + j] ^= gfMul(gen[j], coef);
}
}
return res.slice(data.length);
}






const VERSIONS_M = {
1: { total: 26, data: 16, blocks: 1 },
2: { total: 44, data: 28, blocks: 1 },
3: { total: 70, data: 44, blocks: 1 },
4: { total: 100, data: 64, blocks: 2 },
5: { total: 134, data: 86, blocks: 2 },
6: { total: 172, data: 108, blocks: 4 },
7: { total: 196, data: 124, blocks: 4 },
8: { total: 242, data: 154, blocks: 2 },
9: { total: 292, data: 182, blocks: 3 },
10: { total: 346, data: 216, blocks: 4 },
11: { total: 404, data: 254, blocks: 1 },
12: { total: 466, data: 290, blocks: 6 },
13: { total: 532, data: 334, blocks: 8 },
14: { total: 581, data: 365, blocks: 4 },
15: { total: 655, data: 415, blocks: 5 },
16: { total: 733, data: 453, blocks: 7 },
17: { total: 815, data: 507, blocks: 10 },
18: { total: 901, data: 563, blocks: 9 },
19: { total: 991, data: 627, blocks: 3 },
20: { total: 1085, data: 669, blocks: 3 },
};


const ALIGN_POS = {
1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
15: [6, 26, 48, 70], 16: [6, 26, 50, 74], 17: [6, 30, 54, 78],
18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90],
};





class BitBuffer {
constructor() { this.bits = []; }
put(value, length) {
for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
}
get length() { return this.bits.length; }
toBytes() {
const out = [];
const padded = this.bits.slice();
while (padded.length % 8 !== 0) padded.push(0);
for (let i = 0; i < padded.length; i += 8) {
let b = 0;
for (let j = 0; j < 8; j++) b = (b << 1) | padded[i + j];
out.push(b);
}
return out;
}
}










function encodeQR(text) {
const bytes = new TextEncoder().encode(String(text));


let version = 0;
for (let v = 1; v <= 20; v++) {
const cap = VERSIONS_M[v].data;

const overhead = v <= 9 ? 12 : 20;
if (bytes.length * 8 + overhead <= cap * 8) { version = v; break; }
}
if (!version) throw new Error('内容太长，放不进二维码（最多约 600 字节）');

const spec = VERSIONS_M[version];


const buf = new BitBuffer();
buf.put(0b0100, 4);
buf.put(bytes.length, version <= 9 ? 8 : 16);
for (const b of bytes) buf.put(b, 8);


const capacity = spec.data * 8;
const term = Math.min(4, capacity - buf.length);
buf.put(0, term);

while (buf.length % 8 !== 0) buf.put(0, 1);

const dataBytes = buf.toBytes();

let padToggle = 0;
while (dataBytes.length < spec.data) {
dataBytes.push(padToggle === 0 ? 0xEC : 0x11);
padToggle ^= 1;
}


const blockCount = spec.blocks;
const totalDataCw = spec.data;
const ecPerBlock = Math.floor((spec.total - spec.data) / blockCount);
const shortBlockLen = Math.floor(totalDataCw / blockCount);
const numLongBlocks = totalDataCw % blockCount;

const dataBlocks = [];
const ecBlocks = [];
let pos = 0;
for (let b = 0; b < blockCount; b++) {
const len = shortBlockLen + (b >= blockCount - numLongBlocks && numLongBlocks > 0 ? 1 : 0);
const block = dataBytes.slice(pos, pos + len);
pos += len;
dataBlocks.push(block);
ecBlocks.push(rsEncode(block, ecPerBlock));
}


const finalCw = [];
const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
for (let i = 0; i < maxDataLen; i++) {
for (const b of dataBlocks) if (i < b.length) finalCw.push(b[i]);
}
for (let i = 0; i < ecPerBlock; i++) {
for (const b of ecBlocks) if (i < b.length) finalCw.push(b[i]);
}


const size = version * 4 + 17;
const modules = Array.from({ length: size }, () => new Array(size).fill(false));
const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

const setModule = (r, c, v) => {
if (r < 0 || c < 0 || r >= size || c >= size) return;
modules[r][c] = !!v;
reserved[r][c] = true;
};


const placeFinder = (row, col) => {
for (let r = -1; r <= 7; r++) {
for (let c = -1; c <= 7; c++) {
const rr = row + r, cc = col + c;
if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
(c >= 0 && c <= 6 && (r === 0 || r === 6));
const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
setModule(rr, cc, inRing || inCore);
}
}
};
placeFinder(0, 0);
placeFinder(0, size - 7);
placeFinder(size - 7, 0);


const aligns = ALIGN_POS[version] || [];
for (const r of aligns) {
for (const c of aligns) {

if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
for (let dr = -2; dr <= 2; dr++) {
for (let dc = -2; dc <= 2; dc++) {
const isRing = Math.abs(dr) === 2 || Math.abs(dc) === 2;
const isCenter = dr === 0 && dc === 0;
setModule(r + dr, c + dc, isRing || isCenter);
}
}
}
}


for (let i = 8; i < size - 8; i++) {
setModule(6, i, i % 2 === 0);
setModule(i, 6, i % 2 === 0);
}


setModule(size - 8, 8, true);


for (let i = 0; i <= 8; i++) {
if (!reserved[8][i]) { modules[8][i] = false; reserved[8][i] = true; }
if (!reserved[i][8]) { modules[i][8] = false; reserved[i][8] = true; }
}
for (let i = 0; i < 8; i++) {
if (!reserved[8][size - 1 - i]) { modules[8][size - 1 - i] = false; reserved[8][size - 1 - i] = true; }
if (!reserved[size - 1 - i][8]) { modules[size - 1 - i][8] = false; reserved[size - 1 - i][8] = true; }
}


if (version >= 7) {
const vBits = versionInfoBits(version);
for (let i = 0; i < 18; i++) {
const bit = ((vBits >>> i) & 1) === 1;
const r = Math.floor(i / 3);
const c = i % 3;
setModule(r, size - 11 + c, bit);
setModule(size - 11 + c, r, bit);
}
}


let bitIndex = 0;
const totalBits = finalCw.length * 8;
const nextBit = () => {
if (bitIndex >= totalBits) return 0;
const b = finalCw[bitIndex >> 3];
const bit = (b >>> (7 - (bitIndex & 7))) & 1;
bitIndex++;
return bit;
};

let upward = true;
for (let col = size - 1; col > 0; col -= 2) {
if (col === 6) col--;
for (let i = 0; i < size; i++) {
const row = upward ? size - 1 - i : i;
for (let k = 0; k < 2; k++) {
const c = col - k;
if (reserved[row][c]) continue;
modules[row][c] = nextBit() === 1;
}
}
upward = !upward;
}


const formatBits = formatInfoBits(0b00);
const fmtPositions1 = [];
for (let i = 0; i <= 5; i++) fmtPositions1.push([8, i]);
fmtPositions1.push([8, 7]);
fmtPositions1.push([8, 8]);
fmtPositions1.push([7, 8]);
for (let i = 5; i >= 0; i--) fmtPositions1.push([i, 8]);

for (let i = 0; i < 15; i++) {
const bit = ((formatBits >>> i) & 1) === 1;
const [r1, c1] = fmtPositions1[i];
modules[r1][c1] = bit;

if (i < 8) modules[size - 1 - i][8] = bit;
else modules[8][size - 15 + i] = bit;
}
modules[size - 8][8] = true;



let best = null;
for (let mask = 0; mask < 8; mask++) {
const cand = modules.map((row) => row.slice());
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
if (isFunctionModule(r, c, size, version)) continue;
if (maskBit(mask, r, c)) cand[r][c] = !cand[r][c];
}
}

applyFormat(cand, size, formatInfoBits(mask));
const score = penalty(cand, size);
if (!best || score < best.score) best = { score, matrix: cand, mask };
}

return { size, modules: best.matrix, version, mask: best.mask };
}


function isFunctionModule(r, c, size, version) {

if (r < 9 && c < 9) return true;
if (r < 9 && c >= size - 8) return true;
if (r >= size - 8 && c < 9) return true;

if (r === 6 || c === 6) return true;

const aligns = ALIGN_POS[version] || [];
for (const ar of aligns) {
for (const ac of aligns) {
if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
}
}

if (version >= 7) {
if (r < 6 && c >= size - 11 && c < size - 8) return true;
if (c < 6 && r >= size - 11 && r < size - 8) return true;
}
return false;
}

function maskBit(mask, r, c) {
switch (mask) {
case 0: return (r + c) % 2 === 0;
case 1: return r % 2 === 0;
case 2: return c % 3 === 0;
case 3: return (r + c) % 3 === 0;
case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
default: return false;
}
}


function applyFormat(m, size, bits) {
const positions1 = [];
for (let i = 0; i <= 5; i++) positions1.push([8, i]);
positions1.push([8, 7]);
positions1.push([8, 8]);
positions1.push([7, 8]);
for (let i = 5; i >= 0; i--) positions1.push([i, 8]);

for (let i = 0; i < 15; i++) {
const bit = ((bits >>> i) & 1) === 1;
const [r1, c1] = positions1[i];
m[r1][c1] = bit;
if (i < 8) m[size - 1 - i][8] = bit;
else m[8][size - 15 + i] = bit;
}
m[size - 8][8] = true;
}


function formatInfoBits(mask) {
const data = (0b00 << 3) | mask;
let rem = data;
for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
return ((data << 10) | rem) ^ 0x5412;
}


function versionInfoBits(version) {
let rem = version;
for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
return (version << 12) | rem;
}





function penalty(m, size) {
let score = 0;


for (let r = 0; r < size; r++) {
let run = 1;
for (let c = 1; c < size; c++) {
if (m[r][c] === m[r][c - 1]) { run++; }
else { if (run >= 5) score += 3 + (run - 5); run = 1; }
}
if (run >= 5) score += 3 + (run - 5);
}
for (let c = 0; c < size; c++) {
let run = 1;
for (let r = 1; r < size; r++) {
if (m[r][c] === m[r - 1][c]) { run++; }
else { if (run >= 5) score += 3 + (run - 5); run = 1; }
}
if (run >= 5) score += 3 + (run - 5);
}


for (let r = 0; r < size - 1; r++) {
for (let c = 0; c < size - 1; c++) {
const v = m[r][c];
if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
}
}


const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
const check = (get, i) => {
for (let k = 0; k < 11; k++) if (get(i + k) !== pat1[k]) return false;
return true;
};
const check2 = (get, i) => {
for (let k = 0; k < 11; k++) if (get(i + k) !== pat2[k]) return false;
return true;
};
for (let r = 0; r < size; r++) {
for (let c = 0; c <= size - 11; c++) {
const get = (i) => m[r][i];
if (check(get, c) || check2(get, c)) score += 40;
}
}
for (let c = 0; c < size; c++) {
for (let r = 0; r <= size - 11; r++) {
const get = (i) => m[i][c];
if (check(get, r) || check2(get, r)) score += 40;
}
}


let dark = 0;
for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
const ratio = (dark * 100) / (size * size);
score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

return score;
}










function qrSvg(text, opts = {}) {
const { size = 220, margin = 4, dark = '#000000', light = '#FFFFFF' } = opts;

let qr;
try {
qr = encodeQR(text);
} catch (e) {
return `<div style="color:#FF3B30;font-size:13px">二维码生成失败：${escapeHtml(e.message)}</div>`;
}

const total = qr.size + margin * 2;
let path = '';
for (let r = 0; r < qr.size; r++) {
for (let c = 0; c < qr.size; c++) {
if (qr.modules[r][c]) path += `M${c + margin} ${r + margin}h1v1h-1z`;
}
}

return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="二维码">
<rect width="${total}" height="${total}" fill="${light}"/>
<path d="${path}" fill="${dark}"/>
</svg>`;
}

function escapeHtml(s) {
return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}





function qrTerminal(text) {
const qr = encodeQR(text);
const m = 2;
const size = qr.size + m * 2;
const rows = [];
for (let r = 0; r < size; r++) {
let line = '';
for (let c = 0; c < size; c++) {
const rr = r - m, cc = c - m;
const on = rr >= 0 && cc >= 0 && rr < qr.size && cc < qr.size && qr.modules[rr][cc];
line += on ? '██' : '  ';
}
rows.push(line);
}
return rows.join('\n');
}
    return { encodeQR, qrSvg, qrTerminal };
  };

  var __entry = __rmod("src/ui/app.js");
  globalThis.__QZ_BUNDLE__ = __entry;
  globalThis.__QZ_DEBUG__ = {
    boot: __entry.boot,
    module: function (id) {
      var key = String(id).replace(/^\.?\//, '');
      return __rmod(key);
    },
  };
})();

export const boot = globalThis.__QZ_BUNDLE__.boot;
export default globalThis.__QZ_BUNDLE__;
