/**
 * 轻账 · 去重
 *
 * 为什么需要去重：微信和支付宝按「月」导出账单，你连续导入 8 月、9 月的文件时，
 * 很容易把同一天导入两次；补导旧账单时也会跟已有数据重叠。
 *
 * 策略分两层：
 *   1. 批内去重：同一批里指纹完全相同的，只留一笔。
 *      但「同一天同一商户同一金额」也可能是两笔真实交易（买两杯奶茶），
 *      所以只有连时间都落在同一分钟内才认为是重复。
 *   2. 跨批去重：指纹和已有交易相同时，如果两笔在这一批里还是一一对应，
 *      说明是重复导入，跳过；如果已有交易里只有 1 笔而新导入有 2 笔，
 *      多出来的那笔保留（真的是又买了一杯）。
 */

import { fingerprint } from './parser.js';
import { normalizeMerchant } from './util.js';

/** 多久之内的两笔才算「同一时刻」 */
const SAME_MINUTE_MS = 60 * 1000;

/**
 * @param {object[]} incoming 新解析出来的交易
 * @param {object[]} existing 数据库里已有的交易
 * @param {object} [opts]
 * @param {boolean} [opts.allowSameFingerprint] 同批内是否允许保留指纹相同的多笔
 * @returns {{keep:object[], duplicates:object[], stats:object}}
 */
export function dedupe(incoming, existing = [], opts = {}) {
  const allowSame = !!opts.allowSameFingerprint;

  // 确保都有指纹
  for (const t of incoming) if (!t.fp) t.fp = fingerprint(t);

  // 已有交易的指纹计数：fingerprint -> 已有笔数
  const existingCount = new Map();
  const existingByFp = new Map();
  for (const t of existing) {
    if (t.duplicateOf) continue; // 已经被判为重复的不参与
    const fp = t.fp || fingerprint(t);
    existingCount.set(fp, (existingCount.get(fp) || 0) + 1);
    if (!existingByFp.has(fp)) existingByFp.set(fp, []);
    existingByFp.get(fp).push(t);
  }

  // 批内先按指纹分组
  const byFp = new Map();
  for (const t of incoming) {
    if (!byFp.has(t.fp)) byFp.set(t.fp, []);
    byFp.get(t.fp).push(t);
  }

  const keep = [];
  const duplicates = [];
  const stats = { inBatch: 0, crossBatch: 0, kept: 0 };

  for (const [fp, group] of byFp) {
    // 组内按时间排序，保留最早的
    group.sort((a, b) => a.ts - b.ts);

    const existingHere = existingCount.get(fp) || 0;
    const existingList = existingByFp.get(fp) || [];

    // 先跟「库里已有」的比。
    // 顺序很重要：同一分钟内、同一金额、同一商户的 N 笔长得一模一样，
    // 如果先做批内去重，新来的第 2 笔会被第 1 笔吃掉，导致
    // 「库里已有 1 笔 + 新导入 2 笔」时 2 笔全丢、一笔都不留。
    // 正确的做法是已有 M 笔先跟新来的 N 笔一一抵消，剩下的才在批内去重。
    const candidates = [];
    let matched = 0;
    for (const t of group) {
      if (matched < existingHere) {
        // 精确到分钟的匹配才算
        const hit = existingList.find((e) => Math.abs(e.ts - t.ts) <= SAME_MINUTE_MS);
        if (hit) {
          t.duplicateOf = hit.id;
          duplicates.push({ tx: t, reason: 'already-imported', duplicateOf: hit.id });
          stats.crossBatch++;
          matched++;
          continue;
        }
        // 同指纹但时间差得多，说明是不同时间的同类交易，保留
      }
      candidates.push(t);
    }

    // 再处理批内重复：同一分钟内指纹相同的只留最早的一笔
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

/**
 * 近似重复检测：找出「同一商户、同金额、时间相差 10 分钟内」的成对交易，
 * 供用户在「可能有重复」列表里人工确认。
 * 不做自动删除，因为同价同店连续买两次是真实存在的。
 */
export function findSuspiciousPairs(txs, windowMs = 10 * 60 * 1000) {
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

/* ------------------------------------------------------------------ *
 * 内部转账配对
 * ------------------------------------------------------------------ */

/**
 * 识别「一笔转出 + 一笔转入」是同一笔钱的搬运，例如：
 *   银行卡 → 余额宝（转出），余额宝 → 银行卡（转入）
 * 或者信用卡还款在两边各出现一次。
 *
 * 这类交易本来就不计入消费统计，配对的意义是：
 *   - 在明细里标注「这是一次账户搬运」，让你知道钱没花掉
 *   - 统计每日净流水时不会虚增
 *
 * @param {object[]} txs
 * @param {object} [opts] { windowDays: 3 }
 */
export function pairTransfers(txs, opts = {}) {
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

/* ------------------------------------------------------------------ *
 * 与已有数据比对，给出「导入预览」的统计
 * ------------------------------------------------------------------ */

/**
 * 给导入预览界面用：告诉用户这次导入会发生什么。
 */
export function previewImport(incoming, existing) {
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
