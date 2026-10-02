/**
 * 轻账 · 数据模型定义
 * 这是整个应用的「字典」：所有分类、交易类型、来源都在这里定义一次，
 * 其他模块一律从这里 import，避免出现「同一个分类两种写法」的 bug。
 */

/* ------------------------------------------------------------------ *
 * 分类
 *
 * 这里有两层：
 *   CATEGORIES      —— 运行时完整清单（内置 + 用户自定义），原地更新
 *   BUILTIN_CATEGORIES —— 内置的十个，永远不变，是「恢复默认」的依据
 *
 * 为什么用「原地更新」而不是每次返回新数组：
 * 界面和统计里有 8 处直接引用 CATEGORIES，如果改成函数调用，
 * 就要动一大片代码、引入新 bug 的风险。改成原地 splice 之后，
 * 所有引用自动看到最新分类，调用点一行都不用改。
 * ------------------------------------------------------------------ */

export const BUILTIN_CATEGORIES = [
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

/** 运行时清单：内置分类 + 用户自定义分类。内容会被 setCustomCategories 原地替换。 */
export const CATEGORIES = BUILTIN_CATEGORIES.map((c) => ({ ...c, builtin: true }));

/** 内置 id 集合（判断「是不是自定义」用） */
const BUILTIN_IDS = new Set(BUILTIN_CATEGORIES.map((c) => c.id));

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/**
 * 设置用户自定义分类。传空数组就回到只有内置分类的状态。
 * 会原地更新 CATEGORIES，所以所有已有引用立刻生效。
 * @param {Array<{id:string,name:string,icon:string,color:string}>} list
 */
export function setCustomCategories(list) {
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

  // 顺序显式拼出来，不依赖 Array.sort 的稳定性：
  //   内置分类（不含「其他」） → 自定义分类 → 「其他」
  // 这样界面上的顺序永远稳定，「其他」永远在最后。
  const builtinNoOther = BUILTIN_CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({ ...c, builtin: true }));
  const otherCat = BUILTIN_CATEGORIES.find((c) => c.id === 'other');
  const next = [...builtinNoOther, ...custom, { ...otherCat, builtin: true }];

  CATEGORIES.length = 0;
  CATEGORIES.push(...next);
  return CATEGORIES;
}

/** 内置 id 集合（副本，防止外部改动） */
export function builtinCategoryIds() {
  return new Set(BUILTIN_IDS);
}

/** 判断一个分类 id 是不是用户自定义的 */
export function isCustomCategory(id) {
  return !!id && !BUILTIN_IDS.has(id) && CATEGORIES.some((c) => c.id === id);
}

/** 分类 id 是否有效（内置或自定义都算） */
export function isKnownCategory(id) {
  return CATEGORIES.some((c) => c.id === id) || INCOME_CATEGORIES.some((c) => c.id === id);
}

/** 生成一个新的自定义分类 id，保证不和内置/已有冲突 */
export function newCategoryId(name) {
  const base = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  return base;
}

/**
 * 按 id 取分类。
 * 注意：找不到时回退到「其他」，所以调用方拿到的永远是有效对象。
 */
export function category(id) {
  for (const c of CATEGORIES) if (c.id === id) return c;
  for (const c of INCOME_CATEGORIES) if (c.id === id) return c;
  return CATEGORIES.find((c) => c.id === 'other') || BUILTIN_CATEGORIES[9];
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
  // 自定义分类优先（它可能在消费也可能在收入侧）
  const custom = CATEGORIES.find((c) => c.id === tx.category);
  if (custom && !custom.builtin) return custom.icon;
  if (tx.type === 'income') {
    return category(tx.category).icon || '➕';
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
  // 自定义分类优先
  const custom = CATEGORIES.find((c) => c.id === tx.category);
  if (custom && !custom.builtin) return custom.name;
  if (tx.type === 'income') {
    return category(tx.category).name || '其他收入';
  }
  return category(tx.category).name;
}

/** 收入分类。用户可以往里加自定义项，所以同样是可变数组。 */
export const INCOME_CATEGORIES = [
  { id: 'salary',   name: '工资',   icon: '💼' },
  { id: 'bonus',    name: '奖金',   icon: '🏆' },
  { id: 'refund',   name: '退款',   icon: '↩️' },
  { id: 'redpacket',name: '红包',   icon: '🧧' },
  { id: 'other_in', name: '其他收入', icon: '➕' },
];

/** 收入侧的内置清单，用于「恢复默认」 */
export const BUILTIN_INCOME_CATEGORIES = INCOME_CATEGORIES.map((c) => ({ ...c }));

/**
 * 设置收入侧的自定义分类（同样原地更新）
 * @param {Array<{id:string,name:string,icon:string}>} list
 */
export function setCustomIncomeCategories(list) {
  const custom = (Array.isArray(list) ? list : [])
    .filter((c) => c && typeof c.id === 'string' && c.id && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({
      id: c.id,
      name: String(c.name).trim().slice(0, 12),
      icon: c.icon || '🏷️',
      builtin: false,
      createdAt: c.createdAt || Date.now(),
    }));

  // 顺序：内置收入分类（不含「其他收入」） → 自定义 → 「其他收入」
  const builtinNoOther = BUILTIN_INCOME_CATEGORIES.filter((c) => c.id !== 'other_in').map((c) => ({ ...c, builtin: true }));
  const otherCat = BUILTIN_INCOME_CATEGORIES.find((c) => c.id === 'other_in');
  const next = [...builtinNoOther, ...custom, { ...otherCat, builtin: true }];

  INCOME_CATEGORIES.length = 0;
  INCOME_CATEGORIES.push(...next);
  return INCOME_CATEGORIES;
}

/** 可选图标 / 颜色，给「新建分类」界面用 */
export const CATEGORY_ICON_CHOICES = [
  '🍜', '🍔', '☕', '🧋', '🚇', '🚕', '⛽', '✈️', '🛍️', '👕', '👟', '💄',
  '🏠', '💡', '📱', '🧹', '🎮', '🎬', '🎵', '🏀', '💊', '🏥', '📚', '✏️',
  '🎁', '🧧', '🔁', '📦', '🐱', '🐶', '🌱', '🔬', '🎨', '🧪', '💻', '🎧',
];

export const CATEGORY_COLOR_CHOICES = [
  '#FF9F0A', '#FF375F', '#FF6482', '#BF5AF2', '#5E5CE6', '#0A84FF',
  '#64D2FF', '#30D158', '#A2845E', '#8E8E93', '#98989D', '#FF3B30',
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
    /**
     * 是否是攒钱记录（钱转进自己的储蓄账户）。
     *
     * ⚠️ makeTx 是白名单式构造器：patch 里没列出来的字段会被**静默丢掉**。
     * 攒钱相关的字段一开始就漏了，结果 recordSavings() 传进来的 savings 标记
     * 消失得无影无踪 —— 功能在浏览器里也会坏掉，不只是测试问题。
     * 以后再往交易上加字段，记得同步加到这里。
     *
     * 这两个字段只在「确实要标攒钱」时才写，保持旧数据干净。
     */
    ...(patch.savings ? { savings: true } : {}),
    ...(patch.savingsDirection ? { savingsDirection: patch.savingsDirection } : {}),
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
