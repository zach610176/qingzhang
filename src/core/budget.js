/**
 * 轻账 · 预算
 *
 * 两种预算：
 *   - 总预算：这个月一共能花多少
 *   - 分类预算：例如「餐饮 1500，交通 300」
 *
 * 提醒阈值：用掉 80% 给黄色提醒，超过 100% 给红色提醒。
 */

import { monthRange, category as getCategory } from './model.js';
import { sum } from './util.js';
import { activeTxs } from './stats.js';

export const DEFAULT_WARN_RATIO = 0.8;

export function defaultBudget() {
  return {
    /** 总预算，单位分；0 表示没设置 */
    totalCents: 0,
    /** { [categoryId]: cents } */
    byCategory: {},
    /** 提醒阈值 0~1 */
    warnRatio: DEFAULT_WARN_RATIO,
    /** 是否在月初自动结转（暂未实现，保留字段） */
    carryOver: false,
    updatedAt: 0,
  };
}

/**
 * 计算某个分类在这个月已经花了多少（净额，退款冲减）
 */
export function spentInMonth(txs, monthKey, categoryId) {
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

/**
 * 总预算执行情况
 */
export function budgetStatus(txs, monthKey, budget) {
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

  // 按当前速度预测月底会花多少
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

/**
 * 分类预算执行情况
 * @returns {Array<{id,name,icon,color,budgetCents,spent,remaining,ratio,level,count}>}
 */
export function categoryBudgetStatus(txs, monthKey, budget) {
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

/**
 * 生成提醒文案
 */
export function budgetAlerts(txs, monthKey, budget) {
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

  // 超支的排前面
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
  // 过去的月份算满月，未来的月份算 1 天（避免除零）
  const total = daysInMonthOf(monthKey);
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return monthKey < thisMonth ? total : 1;
}

function daysInMonthOf(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
