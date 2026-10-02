/**
 * 轻账 · 数据模型定义
 * 这是整个应用的「字典」：所有分类、交易类型、来源都在这里定义一次，
 * 其他模块一律从这里 import，避免出现「同一个分类两种写法」的 bug。
 */

/* ------------------------------------------------------------------ *
 * 分类
 * ------------------------------------------------------------------ */

export const CATEGORIES = [
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

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id) {
  return CATEGORY_BY_ID.get(id) || CATEGORY_BY_ID.get('other');
}

export function categoryName(id) {
  return category(id).name;
}

/**
 * 一笔交易在界面上该显示什么图标。
 * 红包收到时 category 是 'redpacket'，它不在消费分类里，
 * 所以不能直接用 category()，否则会显示成「其他」的箱子。
 */
export function txIcon(tx) {
  if (!tx) return '📦';
  if (tx.type === 'redpacket') return '🧧';
  if (tx.type === 'refund') return '↩️';
  if (tx.type === 'transfer') return '🔄';
  if (tx.type === 'repay') return '💳';
  if (tx.type === 'income') {
    const hit = INCOME_CATEGORIES.find((c) => c.id === tx.category);
    return hit ? hit.icon : '➕';
  }
  return category(tx.category).icon;
}

/** 图标 + 名称，收入类也适用 */
export function txCategoryLabel(tx) {
  if (!tx) return '其他';
  if (tx.type === 'refund') return '退款';
  if (tx.type === 'redpacket') return '红包';
  if (tx.type === 'transfer') return '内部转账';
  if (tx.type === 'repay') return '信用卡还款';
  if (tx.type === 'income') {
    const hit = INCOME_CATEGORIES.find((c) => c.id === tx.category);
    return hit ? hit.name : '其他收入';
  }
  return category(tx.category).name;
}

/** 收入也有分类，但只用于展示，不参与「消费比例」。 */
export const INCOME_CATEGORIES = [
  { id: 'salary',   name: '工资',   icon: '💼' },
  { id: 'bonus',    name: '奖金',   icon: '🏆' },
  { id: 'refund',   name: '退款',   icon: '↩️' },
  { id: 'redpacket',name: '红包',   icon: '🧧' },
  { id: 'other_in', name: '其他收入', icon: '➕' },
];

/* ------------------------------------------------------------------ *
 * 交易类型
 * ------------------------------------------------------------------ */

/**
 * direction:   out  = 钱出去了      in = 钱进来了
 * countsAsSpend: 是否计入「消费」统计
 *
 * ⚠️ 这是记账软件最容易算错的地方，规则如下：
 *   - 内部转账（转给自己的另一张卡/余额）：钱没花掉，只是换了个口袋 → 不计消费
 *   - 信用卡还款：刷卡时那笔消费已经算过一次了，还款再算就重复 → 不计消费
 *   - 退款：冲减消费，由 stats 层做负数处理，不算「收入」
 */
export const TX_TYPES = {
  expense:  { id: 'expense',  name: '消费',     direction: 'out', countsAsSpend: true,  color: '#FF3B30' },
  income:   { id: 'income',   name: '收入',     direction: 'in',  countsAsSpend: false, color: '#34C759' },
  refund:   { id: 'refund',   name: '退款',     direction: 'in',  countsAsSpend: false, color: '#30D158' },
  redpacket:{ id: 'redpacket',name: '红包',     direction: 'in',  countsAsSpend: false, color: '#FF6482' },
  transfer: { id: 'transfer', name: '内部转账', direction: 'out', countsAsSpend: false, color: '#8E8E93' },
  repay:    { id: 'repay',    name: '信用卡还款',direction: 'out', countsAsSpend: false, color: '#8E8E93' },
};

export const TX_TYPE_IDS = Object.keys(TX_TYPES);

export function txType(id) {
  return TX_TYPES[id] || TX_TYPES.expense;
}

/** 用户能在界面上手动选择的类型（其他由解析器自动判定） */
export const MANUAL_TYPES = ['expense', 'income', 'redpacket', 'transfer', 'repay'];

/* ------------------------------------------------------------------ *
 * 来源
 * ------------------------------------------------------------------ */

export const SOURCES = {
  wechat:  { id: 'wechat',  name: '微信',   short: '微', color: '#07C160' },
  alipay:  { id: 'alipay',  name: '支付宝', short: '支', color: '#1677FF' },
  manual:  { id: 'manual',  name: '手动',   short: '手动', color: '#8E8E93' },
  recurring:{ id: 'recurring', name: '周期', short: '周期', color: '#BF5AF2' },
  import:  { id: 'import',  name: '导入',   short: '导入', color: '#5E5CE6' },
};

export function source(id) {
  return SOURCES[id] || SOURCES.manual;
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

let _seq = 0;
/** 本地唯一 id，不依赖 crypto.randomUUID（老 Safari 可能没有） */
export function newId(prefix = 't') {
  _seq = (_seq + 1) % 100000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}_${rand}`;
}

/** 把金额规范成「分」为单位的整数，避免浮点误差（0.1+0.2 问题） */
export function toCents(yuan) {
  const n = typeof yuan === 'number' ? yuan : parseFloat(String(yuan).replace(/[^\d.\-]/g, ''));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** 分 → 元（数字） */
export function toYuan(cents) {
  return Math.round(cents) / 100;
}

/** 分 → ¥1,234.56 字符串 */
export function money(cents, opts = {}) {
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

/** 本地日期 YYYY-MM-DD（注意不能用 toISOString，那是 UTC，会差 8 小时） */
export function ymd(date) {
  const d = date instanceof Date ? date : new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 本地月份 YYYY-MM */
export function ym(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${Number(m)}月`;
}

export function monthLabelFull(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${y}年${Number(m)}月`;
}

/** 月份加减：shiftMonth('2026-01', -1) => '2025-12' */
export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ym(d);
}

/** 上一个月 */
export function prevMonth(monthKey) {
  return shiftMonth(monthKey, -1);
}

/** 一个月的起止时间戳 */
export function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0).getTime(),
    end: new Date(y, m, 1, 0, 0, 0, 0).getTime(),
  };
}

/** 该月有多少天 */
export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/* ------------------------------------------------------------------ *
 * 交易对象的构造与校验
 * ------------------------------------------------------------------ */

/**
 * 创建一条标准交易
 * @param {object} patch
 */
export function makeTx(patch = {}) {
  const amount = Number.isFinite(patch.amountCents)
    ? Math.trunc(patch.amountCents)
    : toCents(patch.amount || 0);

  return {
    id: patch.id || newId(),
    /** 交易发生时间戳（毫秒） */
    ts: patch.ts || Date.now(),
    /** 金额，单位「分」，永远是正数；方向由 type 决定 */
    amountCents: Math.abs(amount),
    /** 见 TX_TYPES */
    type: TX_TYPES[patch.type] ? patch.type : 'expense',
    /** 分类 id；收入类交易用 INCOME_CATEGORIES 的 id，也放在这个字段 */
    category: patch.category || (patch.type === 'income' ? 'other_in' : 'other'),
    /** 原始商户/交易对方（来自账单，不改） */
    merchant: (patch.merchant || '').trim(),
    /** 商品说明 */
    description: (patch.description || '').trim(),
    /** 账单里原始的交易类型文字，排错时有用 */
    rawType: (patch.rawType || '').trim(),
    /** 数据来源 */
    source: SOURCES[patch.source] ? patch.source : 'manual',
    /** 所属账户（可选，用于识别内部转账） */
    account: patch.account || '',
    /** 该笔是否由用户手动改过分类（改了就不再被自动规则覆盖） */
    userCategory: !!patch.userCategory,
    /** 用户备注 */
    note: patch.note || '',
    /** 账单文件名 / 导入批次，用于「撤销这次导入」 */
    batchId: patch.batchId || '',
    /** 去重指纹 */
    fp: patch.fp || '',
    /** 是否被判为重复而隐藏 */
    duplicateOf: patch.duplicateOf || null,
    /** 是否被手工标记为「不计入统计」（例如帮别人代付） */
    excluded: !!patch.excluded,
    createdAt: patch.createdAt || Date.now(),
    updatedAt: patch.updatedAt || Date.now(),
  };
}

/** 交易是否计入「消费」统计 */
export function countsAsSpend(tx) {
  if (tx.excluded || tx.duplicateOf) return false;
  if (tx.type === 'expense') return true;
  // 退款不直接算消费，而是在统计时以负数冲减
  return false;
}

/** 退款金额（正数），用于冲减当月消费 */
export function refundAmount(tx) {
  if (tx.excluded || tx.duplicateOf) return 0;
  if (tx.type === 'refund') return tx.amountCents;
  return 0;
}

/** 交易对「现金流」的影响（收入为正，支出为负），内部转账不计 */
export function cashFlow(tx) {
  if (tx.excluded || tx.duplicateOf) return 0;
  if (tx.type === 'transfer' || tx.type === 'repay') return 0;
  const t = txType(tx.type);
  return t.direction === 'in' ? tx.amountCents : -tx.amountCents;
}
