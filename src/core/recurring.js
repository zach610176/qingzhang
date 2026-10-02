/**
 * 轻账 · 周期账单（订阅、房租、水电这类固定支出）
 *
 * 你设置一次「每月 15 号 房租 2500 住房」，以后每个月 15 号打开轻账，
 * 它会自动把这笔补记上，不用你手动输。
 */

import { makeTx, newId, monthRange, ym, daysInMonth } from './model.js';

export const FREQUENCIES = [
  { id: 'monthly', name: '每月' },
  { id: 'quarterly', name: '每季' },
  { id: 'yearly', name: '每年' },
  { id: 'weekly', name: '每周' },
];

export function makeRecurring(patch = {}) {
  return {
    id: patch.id || newId('r'),
    name: patch.name || '',
    amountCents: Math.abs(patch.amountCents || 0),
    category: patch.category || 'subs',
    type: patch.type || 'expense',
    source: patch.source || 'recurring',
    note: patch.note || '',
    frequency: patch.frequency || 'monthly',
    /** 每月几号（1-31），超过当月天数时自动取最后一天 */
    dayOfMonth: patch.dayOfMonth || 1,
    /** 每周/每年时的额外信息 */
    weekday: patch.weekday ?? null,
    monthOfYear: patch.monthOfYear ?? null,
    /** 从哪天开始生效 */
    startMonth: patch.startMonth || ym(new Date()),
    /** 到哪天结束（空表示一直有效） */
    endMonth: patch.endMonth || '',
    /** 已经生成到哪个月，避免重复生成 */
    lastGeneratedMonth: patch.lastGeneratedMonth || '',
    enabled: patch.enabled !== false,
    createdAt: patch.createdAt || Date.now(),
    updatedAt: patch.updatedAt || Date.now(),
  };
}

/**
 * 计算一个周期账单在某个月应该生成的日期（时间戳）
 * @returns {number|null}
 */
export function occurrenceInMonth(rule, monthKey) {
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

  // monthly
  const day = Math.min(rule.dayOfMonth || 1, totalDays);
  return new Date(y, m - 1, day, 12, 0, 0).getTime();
}

/**
 * 生成从某个起始月份到目标月份之间、所有「还没生成过」的周期交易。
 *
 * @param {object[]} rules
 * @param {string} upToMonth   生成到这个月（含）
 * @param {object[]} existingTxs 已有交易，用来避免重复
 * @returns {object[]} 新增的交易
 */
export function generateRecurring(rules, upToMonth, existingTxs = []) {
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

/** 预估一年的周期支出，展示用 */
export function yearlyRecurringTotal(rules) {
  let total = 0;
  for (const r of rules) {
    if (r.enabled === false) continue;
    const mult = r.frequency === 'yearly' ? 1 : r.frequency === 'quarterly' ? 4 : r.frequency === 'weekly' ? 52 : 12;
    total += r.amountCents * mult;
  }
  return total;
}
