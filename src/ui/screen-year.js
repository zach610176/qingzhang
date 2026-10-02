/**
 * 轻账 · 年度报告
 *
 * 一页把一整年的账讲清楚：
 *   年消费 / 收入 / 结余 / 日均
 *   逐月柱状（一眼看出哪个月花超了）
 *   分类占比 TOP
 *   商户 TOP
 *   各种「最」：最大一笔、最贵的一天、最常去的地方、最烧钱的月份
 */

import { CATEGORIES, INCOME_CATEGORIES, category as getCategory, txType, txIcon, txCategoryLabel, ym, monthRange, daysInMonth } from '../core/model.js';
import {
  activeTxs, totalExpense, totalRefund, netSpend, totalIncome,
  categoryBreakdown, merchantRanking, breakdownBy,
} from '../core/stats.js';
import { esc, fmtMoney, fmtDate, toastOk } from './dom.js';
import * as store from './store.js';

/* ------------------------------------------------------------------ *
 * 计算（纯函数，可单独测试）
 * ------------------------------------------------------------------ */

/**
 * 复算某一年的全部数字。
 * @param {object[]} txs
 * @param {string} year  '2026'
 */
export function yearStats(txs, year) {
  const list = txs.filter((t) => {
    const d = new Date(t.ts);
    return d.getFullYear() === Number(year);
  });
  const active = activeTxs(list);

  const expense = totalExpense(active);
  const refund = totalRefund(active);
  const net = netSpend(active);
  const income = totalIncome(active);

  // 逐月
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const { start, end } = monthRange(key);
    const ml = active.filter((t) => t.ts >= start && t.ts < end);
    const me = totalExpense(ml);
    const mr = totalRefund(ml);
    const mn = Math.max(0, me - mr);
    months.push({
      month: m,
      key,
      label: `${m}月`,
      expense: me,
      refund: mr,
      net: mn,
      income: totalIncome(ml),
      count: ml.length,
    });
  }
  const maxMonthNet = Math.max(1, ...months.map((m) => m.net));
  for (const m of months) m.percent = (m.net / maxMonthNet) * 100;

  // 有消费的月份（用于算月均）
  const monthsWithData = months.filter((m) => m.count > 0);

  // 天数：按实际有交易的天数算日均（和首页口径一致），
  // 但年度报告里同时给出「按自然日」的数字，避免月初看的人误解
  const daysWithTx = new Set(active.map((t) => {
    const d = new Date(t.ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  })).size;

  const { rows: cats, total: catTotal } = categoryBreakdown(active);
  const merchants = merchantRanking(active, 10);

  // 各种「最」
  const expenses = active.filter((t) => t.type === 'expense');
  const largest = expenses.reduce((m, t) => (!m || t.amountCents > m.amountCents ? t : m), null);

  // 最贵的一天
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

  // 最常去的商户（按笔数，不是按金额 —— 金额榜上面已经有了）
  const byMerchantCount = new Map();
  for (const t of expenses) {
    const k = t.merchant || '未知商户';
    byMerchantCount.set(k, (byMerchantCount.get(k) || 0) + 1);
  }
  let mostVisited = null;
  for (const [k, v] of byMerchantCount) {
    if (!mostVisited || v > mostVisited.count) mostVisited = { name: k, count: v };
  }

  // 最烧钱的月份
  const topMonth = months.reduce((m, x) => (!m || x.net > m.net ? x : m), null);

  // 分类第一
  const topCat = cats[0] || null;

  // 有几个月没记过账（提示数据可能不完整）
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
    // 按有交易的天数算（和首页一致）
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

/** 有哪些年份的数据 */
export function availableYears(txs) {
  const set = new Set();
  for (const t of txs) set.add(String(new Date(t.ts).getFullYear()));
  return [...set].sort().reverse();
}

/* ------------------------------------------------------------------ *
 * 渲染
 * ------------------------------------------------------------------ */

export function renderYearReport(root) {
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
        ${s.months.map((m) => `
          <div class="mb-row">
            <span class="mb-label">${m.month}月</span>
            <span class="mb-track"><i class="mb-fill" style="width:${m.percent}%;background:${m.net === 0 ? 'var(--fill)' : (m.month === (s.topMonth ? s.topMonth.month : -1) ? 'var(--red)' : 'var(--blue)')}"></i></span>
            <span class="mb-amt">${m.net ? esc(fmtMoney(m.net, { decimals: 0 })) : '<span class="muted">—</span>'}</span>
          </div>`).join('')}
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

/* ------------------------------------------------------------------ *
 * 子块
 * ------------------------------------------------------------------ */

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

/** 逐月柱状图（SVG，宽度自适应） */
function monthBarSvg(months) {
  const w = 320, h = 90, padB = 16, padT = 8;
  const innerH = h - padT - padB;
  const bw = w / 12;
  const max = Math.max(1, ...months.map((m) => m.net));

  let bars = '';
  months.forEach((m, i) => {
    const bh = m.net > 0 ? Math.max(2, (m.net / max) * innerH) : 0;
    const x = i * bw + bw * 0.18;
    const y = padT + innerH - bh;
    const isTop = m.net === max && m.net > 0;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(bh, 0.5).toFixed(1)}" rx="2.5"
        fill="${isTop ? 'var(--red)' : 'var(--blue)'}" opacity="${m.net > 0 ? 1 : 0.15}">
        <title>${m.month}月 ${m.net ? fmtMoney(m.net) : '没有消费'}</title></rect>`;
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

/** '2026-03-15' → '3月15日' */
function fmtDayCn(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  return `${Number(m[2])}月${Number(m[3])}日`;
}
