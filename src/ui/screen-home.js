/**
 * 轻账 · 首页
 *
 * 一屏回答三个问题：这个月花了多少、花在哪了、还剩多少预算。
 */

import { CATEGORIES, category as getCategory, txType, txIcon, txCategoryLabel, money, monthRange, monthLabel, monthLabelFull } from '../core/model.js';
import { overview, categoryBreakdown, comparison, activeTxs, filterMonth } from '../core/stats.js';
import { budgetStatus, budgetAlerts } from '../core/budget.js';
import { computeSavings } from '../core/savings.js';
import { esc, fmtMoney, fmtDate, fmtDayLabel, fmtTime, pickMonth } from './dom.js';
import * as store from './store.js';

export function renderHome(root) {
  const all = store.state.txs;
  const month = store.state.month;
  const monthTxs = filterMonth(all, month);

  // 只统计本月。第二参数传 null 而不是 monthKey：
  // 这样日均按「本月有交易的天数」算，月初打开不会显示一个荒谬的小数字
  // （例如 1 号花了 100 元，按 31 天算日均只有 3 元）。
  const ov = overview(monthTxs, null);
  const cmp = comparison(all, month);
  const budget = store.effectiveBudget(month);
  const bStatus = budgetStatus(all, month, budget);
  const alerts = budgetAlerts(all, month, budget);
  const { rows: cats, total: catTotal } = categoryBreakdown(monthTxs);

  // 空状态
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

/* ------------------------------------------------------------------ *
 * 各区块
 * ------------------------------------------------------------------ */

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

/** 还没设置预算时，也要有个显眼的入口，否则用户永远找不到预算页 */
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

/**
 * 首页的攒钱卡片。
 *
 * 设计考虑：刚开始用时这个数字是 0，所以文案要「鼓励」而不是「报警」。
 * 优先显示能推动下一步的那个数字 ——
 * 有目标就显示离目标还差多少，有该转没转的就提醒去转，否则显示本月进度。
 */
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

  // 还没开始攒钱，也没设目标 → 给一个轻量的引导
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

  // 决定主数字和副文案
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

export function txRow(t) {
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
