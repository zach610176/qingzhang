/**
 * 轻账 · 统计页
 *
 * 回答：钱花在哪些类别、哪些商户、什么时候花、跟上月比怎么样。
 */

import { CATEGORIES, category as getCategory, monthLabel, monthLabelFull, prevMonth } from '../core/model.js';
import {
  overview, categoryBreakdown, categoryComparison, trend, merchantRanking,
  dailySeries, weekdayDistribution, hourDistribution, incomeBreakdown,
  breakdownBy, activeTxs, filterMonth, comparison,
} from '../core/stats.js';
import { esc, fmtMoney, fmtDate, openSheet, toastOk } from './dom.js';
import * as store from './store.js';

const RANGES = [
  { id: 'month', name: '本月' },
  { id: 'quarter', name: '近3月' },
  { id: 'year', name: '本年' },
  { id: 'all', name: '全部' },
];

export function renderStats(root) {
  const all = store.state.txs;
  const range = store.state.statsRange;

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
