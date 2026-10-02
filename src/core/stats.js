/**
 * 轻账 · 统计计算
 *
 * 全部是纯函数：传进去一批交易，算出来一堆数字。
 * 不碰数据库、不碰界面，所以可以单独跑测试验证对不对。
 *
 * ── 口径说明（很重要，记账软件的「对不对」全看这里）──
 *   总支出      = 所有「消费」类型的金额之和（不含退款冲减）
 *   消费净额    = 总支出 - 退款金额          ← 界面上「本月消费」用这个
 *   真实收入    = 收入 + 红包（退款不算收入，它是冲减支出）
 *   结余        = 真实收入 - 消费净额
 *   内部转账 / 信用卡还款：完全不参与以上任何一项
 */

import { CATEGORIES, category, txType, countsAsSpend, refundAmount, cashFlow, ymd, ym, monthRange, prevMonth, daysInMonth } from './model.js';
import { groupBy, sum, percent, normalizeMerchant } from './util.js';

/* ------------------------------------------------------------------ *
 * 基础口径
 * ------------------------------------------------------------------ */

export function isActive(tx) {
  return !tx.excluded && !tx.duplicateOf;
}

/** 有效交易（去掉被排除和已判重的） */
export function activeTxs(txs) {
  return txs.filter(isActive);
}

/** 支出总额（毛额，不扣退款） */
export function totalExpense(txs) {
  return sum(txs, (t) => (isActive(t) && t.type === 'expense' ? t.amountCents : 0));
}

/** 退款总额 */
export function totalRefund(txs) {
  return sum(txs, (t) => refundAmount(t));
}

/** 消费净额 = 支出 - 退款 */
export function netSpend(txs) {
  return Math.max(0, totalExpense(txs) - totalRefund(txs));
}

/** 真实收入（工资/奖金/其他收入 + 红包；退款不算） */
export function totalIncome(txs) {
  return sum(txs, (t) => (isActive(t) && (t.type === 'income' || t.type === 'redpacket') ? t.amountCents : 0));
}

/** 内部转账 + 还款总额（仅展示，不进结余） */
export function totalMoved(txs) {
  return sum(txs, (t) => (isActive(t) && (t.type === 'transfer' || t.type === 'repay') ? t.amountCents : 0));
}

/* ------------------------------------------------------------------ *
 * 分类占比
 * ------------------------------------------------------------------ */

/**
 * 各分类的消费占比。退款会冲减到「对应分类」里（按商户匹配原消费的分类）。
 * @returns {Array<{id,name,icon,color,cents,percent,count,refundCents,netCents}>}
 */
export function categoryBreakdown(txs, opts = {}) {
  const includeEmpty = !!opts.includeEmpty;
  const active = activeTxs(txs);

  // 每笔退款找到它对应的消费分类
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

  // 各分类先按「毛支出 / 归属退款」汇总；分母（grandNet）最后统一取消费净额。
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
      // 先不夹到 0：等所有分类都算完再统一处理「退款比该分类支出还多」的情况
      netCents: cents - refundCents,
      count: countByCategory.get(c.id) || 0,
      percent: 0,
    };
  });

  // 某个月里，退款可能比该分类当月的支出还多（例如退的是上个月的订单）。
  // 如果这时简单地把该分类夹到 0，多出来的退款就凭空消失了：
  // 环形图中心的「合计」会比首页的「消费净额」大，分类占比也不再是 100%。
  // 所以：先把负的分类夹到 0，再把多出来的那部分按各分类净额等比分摊回去，
  // 保证「各分类净额之和 === 消费净额 === max(0, 总支出 - 总退款)」。
  const expenseAll = rows.reduce((s, r) => s + r.cents, 0);
  const refundAll = rows.reduce((s, r) => s + r.refundCents, 0);
  const grandNet = Math.max(0, expenseAll - refundAll);
  for (const r of rows) if (r.netCents < 0) r.netCents = 0;

  const positiveSum = rows.reduce((s, r) => s + r.netCents, 0);
  const surplus = positiveSum - grandNet; // 需要从各分类里扣掉的总额（分）
  if (surplus > 0 && positiveSum > 0) {
    const pos = rows.filter((r) => r.netCents > 0).sort((a, b) => b.netCents - a.netCents);
    let taken = 0;
    pos.forEach((r, i) => {
      // 最后一行吃掉四舍五入的零头，保证扣掉的总额正好等于 surplus
      const cut = i === pos.length - 1 ? surplus - taken : Math.floor((surplus * r.netCents) / positiveSum);
      const c = Math.max(0, Math.min(r.netCents, cut));
      r.netCents -= c;
      taken += c;
    });
    // floor 剩下的零头不会超过「分类数」分，逐分补扣
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

/** 退款归属：优先按分类字段；分类是 'refund' 时，靠商户名去找原消费 */
function matchRefundCategory(refundTx, activeTxsList) {
  const c = normalizeCategoryId(refundTx.category);
  if (c && c !== 'other') return c;
  const norm = normalizeMerchant(refundTx.merchant);
  if (norm) {
    for (const t of activeTxsList) {
      if (t.type !== 'expense') continue;
      if (normalizeMerchant(t.merchant) === norm) return normalizeCategoryId(t.category);
    }
  }
  return 'other';
}

function normalizeCategoryId(id) {
  const known = CATEGORIES.some((c) => c.id === id);
  return known ? id : 'other';
}

/* ------------------------------------------------------------------ *
 * 收支总览
 * ------------------------------------------------------------------ */

export function overview(txs, monthKey) {
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

/* ------------------------------------------------------------------ *
 * 趋势
 * ------------------------------------------------------------------ */

/**
 * 最近 n 个月的收支曲线。
 * @returns {Array<{month,label,expense,refund,net,income,balance,percent}>}
 */
export function trend(txs, endMonth, n = 6) {
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

/**
 * 环比 / 同比
 */
export function comparison(txs, monthKey) {
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

/**
 * 分类占比的环比：每个分类比上个月多了/少了多少
 */
export function categoryComparison(txs, monthKey) {
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

export function filterMonth(txs, monthKey) {
  const { start, end } = monthRange(monthKey);
  return txs.filter((t) => t.ts >= start && t.ts < end);
}

/* ------------------------------------------------------------------ *
 * 商户排行
 * ------------------------------------------------------------------ */

export function merchantRanking(txs, limit = 20) {
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

/* ------------------------------------------------------------------ *
 * 每日流水（日历 / 柱状）
 * ------------------------------------------------------------------ */

export function dailySeries(txs, monthKey) {
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

/* ------------------------------------------------------------------ *
 * 时段分布
 * ------------------------------------------------------------------ */

export function hourDistribution(txs) {
  const buckets = new Array(24).fill(0);
  for (const t of activeTxs(txs)) {
    if (t.type !== 'expense') continue;
    buckets[new Date(t.ts).getHours()] += t.amountCents;
  }
  const max = Math.max(1, ...buckets);
  return buckets.map((cents, hour) => ({ hour, cents, percent: (cents / max) * 100 }));
}

/** 星期分布：0=周日 */
export function weekdayDistribution(txs) {
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

/* ------------------------------------------------------------------ *
 * 收入构成
 * ------------------------------------------------------------------ */

export function incomeBreakdown(txs) {
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

/* ------------------------------------------------------------------ *
 * 按来源 / 账户
 * ------------------------------------------------------------------ */

export function breakdownBy(txs, field) {
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

/* ------------------------------------------------------------------ *
 * 可用月份列表
 * ------------------------------------------------------------------ */

export function availableMonths(txs) {
  const set = new Set();
  for (const t of txs) set.add(ym(t.ts));
  return [...set].sort().reverse();
}
