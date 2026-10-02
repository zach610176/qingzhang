/**
 * 轻账 · 攒钱
 *
 * ── 为什么要单独做，不能靠「收入 − 消费」─
 * 「本月结余 800」只是**算出来的**，钱还在余额里，下个月大概率就花掉了。
 * 真正的攒钱是「把钱转进一个不动的账户」这个**动作**。
 * 所以轻账里必须区分三个数：
 *
 *   月度结余   收入 − 消费          （算出来的，理论能攒）
 *   实际攒下   转进储蓄账户的钱       （记下来的，事实）
 *   待转       结余里还没转走的部分    ← 攒钱失败就发生在这里
 *
 * ── 怎么记录「攒钱」这个动作 ─
 * 攒钱 = 资金在自己账户之间搬运，所以它**不是消费也不是收入**，
 * 完全不能进「消费比例」和「结余」。做法：
 *   在攒钱账本里的交易打上 savings: true 标记，从「余额宝」这类账户转入。
 *
 * ── 初始本金怎么算 ─
 * 你开始记账之前可能已经有存款了。为了让「总攒下」反映真实余额，
 * 我们把它拆成两段：
 *   初始本金 = 这个标了攒钱的账户在**最早一次净流出**之前的所有净流入
 *   之后每一笔就按 存/取 正常累加
 * 这样既不用你手动填「我原本有 3000」，又能出现真实数字。
 */

import { makeTx, newId, ym, monthRange, shiftMonth, category as getCategory, ymd } from './model.js';
import { activeTxs, totalIncome, netSpend } from './stats.js';
import { normalizeMerchant, cleanText, groupBy, sum } from './util.js';
import * as db from './db.js';

const KEY = 'savings';

/* ------------------------------------------------------------------ *
 * 配置
 * ------------------------------------------------------------------ */

export function defaultSavings() {
  return {
    /** 攒钱账户名（商户名）。存钱记成「转入这个账户」 */
    account: '储蓄账户',
    /** 目标金额（分）；0 表示没设目标 */
    goalCents: 0,
    /** 目标说明，例如「换电脑」 */
    goalLabel: '',
    /** 希望什么时候达成，'YYYY-MM' 或空 */
    goalByMonth: '',
    /** 每月攒钱目标（分）；0 表示没设 */
    monthlyTargetCents: 0,
    /** 备选账户名（用于识别历史账单里的攒钱记录） */
    aliases: [],
    updatedAt: 0,
  };
}

export async function loadSettings() {
  const raw = await db.getSetting(KEY, null);
  return { ...defaultSavings(), ...(raw || {}) };
}

export async function saveSettings(patch) {
  const cur = await loadSettings();
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  await db.setSetting(KEY, next);
  return next;
}

/* ------------------------------------------------------------------ *
 * 识别攒钱交易
 * ------------------------------------------------------------------ */

/** 这笔是不是攒钱记录 */
export function isSavings(tx) {
  return !!(tx && tx.savings && !tx.duplicateOf && !tx.excluded);
}

/** 转账类（钱在账户之间搬，不是消费） */
export function isMoveType(type) {
  return type === 'transfer' || type === 'repay';
}

/** 攒钱账户的所有别名（含主名字），用于匹配历史账单 */
export function savingsNames(settings) {
  const s = settings || defaultSavings();
  const names = [s.account, ...(s.aliases || [])]
    .map((x) => cleanText(x))
    .filter(Boolean);
  return [...new Set(names)];
}

/** 某个商户名像不像攒钱账户 */
function looksLikeSavings(name, names) {
  const n = normalizeMerchant(name);
  if (!n) return false;
  return names.some((want) => {
    const w = normalizeMerchant(want);
    return w && (n === w || n.includes(w) || w.includes(n));
  });
}

/* ------------------------------------------------------------------ *
 * 计算
 * ------------------------------------------------------------------ */

/**
 * 从一批交易里算出攒钱账本。
 *
 * ⚠️ 只统计**明确标记过**的攒钱记录（tx.savings === true）。
 *
 * 曾经这里还会「按账户名自动认领」：只要转账的商户名里有你的攒钱账户名，
 * 就自动算成攒钱。结果很危险 —— 用户只是把账户名填成「余额宝」，
 * 过去所有「转入余额宝」的转账就被静默改判成攒钱，余额凭空多出好几千。
 * 实测踩到过：4 笔真实记录被算成 6 笔、余额 ¥3180 变成 ¥7180。
 *
 * 现在改为：账户名只用来**提示**（findSavingsCandidates），
 * 要不要算进攒钱由用户在「从账单里找出攒钱记录」里一键确认。
 * 这样账本里的每一分钱都是用户认过的。
 *
 * @param {object[]} txs
 * @param {object} settings
 * @returns {object}
 */
export function computeSavings(txs, settings) {
  const s = { ...defaultSavings(), ...(settings || {}) };
  const names = savingsNames(s);
  const active = activeTxs(txs);

  // 只认显式标记
  const ledger = active.filter((t) => t.savings === true);
  ledger.sort((a, b) => a.ts - b.ts);

  // 3) 每笔对「储蓄账户余额」的影响方向。
  //
  //    这里容易绕晕，先说清视角：交易上的 merchant 是**对手方户名**。
  //    如果攒钱账户叫「储蓄账户」，那么一笔「转到储蓄账户」的交易：
  //       type=transfer  merchant=储蓄账户   → 储蓄余额 +金额
  //    一笔「从储蓄账户取回」：
  //       type=income    merchant=储蓄账户   → 储蓄余额 −金额
  //
  //    但如果用户把交易记成「从余额宝转出」（merchant=余额宝，也就是**储蓄账户本身**），
  //    那 merchant 指的是「钱从哪个账户出来」，方向正好相反。
  //    为避免这种歧义，攒钱功能内部一律用 savingsDirection 明确表达：
  //       'in'  = 存进储蓄（余额增加）
  //       'out' = 从储蓄取出（余额减少）
  //    只有在没有 savingsDirection 的历史数据上，才按 type 猜：
  //       记成 transfer/repay 的多半是「存进去」，记成 income 的多半是「取出」。
  const directionOf = (t) => {
    if (t.savingsDirection === 'in') return 'in';
    if (t.savingsDirection === 'out') return 'out';
    return t.type === 'income' ? 'out' : 'in';
  };

  // 4) 初始本金：
  //    在**第一次「存进去」之前**的净额，视为你原本就有的存款。
  //    （正常攒钱从「存」开始；之前若出现「取出」，说明那笔取的是老本。）
  let firstDepositIdx = -1;
  for (let i = 0; i < ledger.length; i++) {
    if (directionOf(ledger[i]) === 'in') { firstDepositIdx = i; break; }
  }

  let baselineCents = 0;
  const counted = [];
  if (firstDepositIdx > 0) {
    // 前面这些是「先取出老本」的记录，把它们的净额作为起始本金
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

    // 第一笔「存进去」额外带一个基准信息，界面可以显示「含原有存款」
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

  /* ---- 按月汇总 ---- */
  const byMonth = new Map();
  for (const e of events) {
    const row = byMonth.get(e.month) || { month: e.month, inCents: 0, outCents: 0, netCents: 0, count: 0 };
    if (e.delta >= 0) row.inCents += e.delta;
    else row.outCents += -e.delta;
    row.netCents += e.delta;
    row.count++;
    byMonth.set(e.month, row);
  }

  /* ---- 每个月「算出来的结余」对比「实际攒下」 ---- */
  const months = [...byMonth.keys()].sort().reverse();
  const surplusRows = months.map((m) => {
    const { start, end } = monthRange(m);
    const list = active.filter((t) => t.ts >= start && t.ts < end);
    const income = totalIncome(list);
    const spent = netSpend(list);
    const surplus = income - spent;
    const saved = (byMonth.get(m) || {}).netCents || 0;

    // 这个月到底有没有「日常收支」数据？
    // 判定超支/待转之前必须先看这个，否则「只记了攒钱、没记生活开支」的月份
    // （例如刚装轻账只记了一笔「暑假兼职存 2000」）会被算成「本月超支」，
    // 那是错的结论 —— 收支都是 0，谈不上超支。
    const hasFlow = income > 0 || spent > 0;

    return {
      month: m,
      income,
      spent,
      surplusCents: surplus,
      savedCents: saved,
      hasFlow,
      // 该攒但还没转走的：只有在「这个月确实有收支」时才有意义
      pendingCents: hasFlow ? Math.max(0, surplus - saved) : 0,
      // 超支：必须在有收支数据、并且真的花的比赚的多的时候才成立
      overspent: hasFlow && surplus < 0,
      overspendCents: hasFlow && surplus < 0 ? -surplus : 0,
      oversaved: hasFlow && surplus > 0 && saved > surplus,
      count: (byMonth.get(m) || {}).count || 0,
    };
  });

  /* ---- 目标进度 ---- */
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

  /* ---- 每月目标进度（本月） ---- */
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

  /* ---- 待转总额（所有「该攒但没转」的月份之和） ---- */
  const pendingTotal = sum(surplusRows, (r) => r.pendingCents);

  /* ---- 预测 ---- */
  // 按最近几个月「实际攒下」的平均速度，估算还要多久达成目标
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
      // 按当前速度，大约哪个月能攒到
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

/* ------------------------------------------------------------------ *
 * 记录一笔攒钱
 * ------------------------------------------------------------------ */

/**
 * 记一笔「存进储蓄」或「从储蓄取出」。
 *
 * @param {object} input
 * @param {number} input.amountCents 金额（分，正数）
 * @param {'in'|'out'} input.direction in=存进去，out=取出来
 * @param {string} [input.note]
 * @param {number} [input.ts]
 * @param {object} input.settings
 */
export async function recordSavings(input) {
  const s = { ...defaultSavings(), ...(input.settings || await loadSettings()) };

  // 金额必须是正数。方向由 direction 决定。
  // 以前这里用 Math.abs 兜底，结果 -100 会被悄悄变成 +100 ——
  // 宁可报错也不要静默改用户的意思。
  const amount = Number(input.amountCents);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请先输入一个大于 0 的金额');
  }

  const dir = input.direction === 'out' ? 'out' : 'in';

  const tx = makeTx({
    ts: input.ts || Date.now(),
    amountCents: Math.trunc(amount),
    // 存进去：钱从日常账户出去 → transfer
    // 取出来：钱回到日常账户 → income，
    // 但 totalIncome / totalMoved 都会因为 savings 标记而跳过它（见 stats.js）
    type: dir === 'in' ? 'transfer' : 'income',
    category: dir === 'in' ? 'other' : 'other_in',
    merchant: cleanText(input.merchant || s.account),
    description: input.note ? cleanText(input.note) : (dir === 'in' ? '攒钱' : '从储蓄取出'),
    note: cleanText(input.note || ''),
    source: 'manual',
    account: '',
    // 这两个字段必须同时出现在 makeTx 的白名单里，否则会被丢掉
    savings: true,
    savingsDirection: dir,
  });

  await db.putTx(tx);
  return tx;
}

/* ------------------------------------------------------------------ *
 * 从账单里认出可能的攒钱记录（供用户确认）
 * ------------------------------------------------------------------ */

/**
 * 找出「看起来像攒钱、但还没标记」的转账。
 * 用于设置页提示：要不要把这些算进攒钱？
 */
export function findSavingsCandidates(txs, settings) {
  const s = { ...defaultSavings(), ...(settings || {}) };
  const names = savingsNames(s);
  const active = activeTxs(txs).filter((t) => !t.savings);

  // 统计每个「转账/还款」商户出现的次数与金额
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
      // 名字命中攒钱账户的排最前，其次按出现次数
      if (a.matchesName !== b.matchesName) return a.matchesName ? -1 : 1;
      return b.count - a.count;
    });
}

/** 把一批交易标记为攒钱记录 */
export async function markAsSavings(ids) {
  const all = await db.allTx();
  const set = new Set(ids);
  const touched = all.filter((t) => set.has(t.id));
  for (const t of touched) {
    t.savings = true;
    // 转账类默认视为「存进去」；收入类视为「取出来」
    t.savingsDirection = t.type === 'income' ? 'out' : 'in';
    t.updatedAt = Date.now();
  }
  if (touched.length) await db.putTxMany(touched);
  return touched.length;
}

/** 取消攒钱标记 */
export async function unmarkAsSavings(ids) {
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

/** 这个商户名下所有转账都标记为攒钱（用户从候选列表里确认时用） */
export async function markMerchantAsSavings(merchant, txs) {
  const ids = txs
    .filter((t) => t.merchant === merchant && isMoveType(t.type) && !t.savings)
    .map((t) => t.id);
  return markAsSavings(ids);
}
