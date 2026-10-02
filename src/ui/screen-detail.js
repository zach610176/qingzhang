/**
 * 轻账 · 明细页
 *
 * 按日期分组的交易流水，支持搜索、按类型/分类/来源筛选。
 * 点任意一笔可以改分类、改金额、删除。
 */

import { CATEGORIES, category as getCategory, txType, txIcon, txCategoryLabel, TX_TYPES, SOURCES, source as getSource, monthRange, ymd } from '../core/model.js';
import { filterMonth, activeTxs } from '../core/stats.js';
import { esc, fmtMoney, fmtDayLabel, fmtTime, openSheet, toastOk, toastErr, confirmSheet } from './dom.js';
import { openQuickEntry } from './sheets.js';
import * as store from './store.js';

export function renderDetail(root) {
  const D = store.state.detail;
  const all = store.state.txs;
  let list = filterMonth(all, store.state.month);

  // 默认不显示重复项
  list = list.filter((t) => !t.duplicateOf || store.state.showDuplicates);

  // 筛选
  if (D.type === 'expense') list = list.filter((t) => t.type === 'expense');
  else if (D.type === 'income') list = list.filter((t) => t.type === 'income' || t.type === 'redpacket');
  else if (D.type === 'refund') list = list.filter((t) => t.type === 'refund');
  else if (D.type === 'moved') list = list.filter((t) => t.type === 'transfer' || t.type === 'repay');

  if (D.category !== 'all') list = list.filter((t) => t.category === D.category);
  if (D.source !== 'all') list = list.filter((t) => t.source === D.source);

  if (D.query.trim()) {
    const q = D.query.trim().toLowerCase();
    list = list.filter((t) =>
      (t.merchant || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q) ||
      (t.account || '').toLowerCase().includes(q));
  }

  // 计算合计
  // 只统计「计入统计」的交易：被标成 excluded 的（例如帮别人代付）在列表里仍然看得到，
  // 但不进任何数字 —— 否则明细页的支出会比首页/统计页多出一截，两块屏幕对不上。
  const counted = activeTxs(list);
  const spendSum = counted.reduce((s, t) => (t.type === 'expense' ? s + t.amountCents : t.type === 'refund' ? s - t.amountCents : s), 0);
  const incomeSum = counted.reduce((s, t) => (t.type === 'income' || t.type === 'redpacket' ? s + t.amountCents : s), 0);

  root.innerHTML = `
    <div class="search-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input type="search" id="det-q" placeholder="搜索商户、说明、备注" value="${esc(D.query)}" enterkeyhint="search">
    </div>

    <div class="chips" id="det-type">
      ${chip('all', '全部', D.type)}
      ${chip('expense', '消费', D.type)}
      ${chip('income', '收入', D.type)}
      ${chip('refund', '退款', D.type)}
      ${chip('moved', '转账/还款', D.type)}
    </div>

    ${renderFilterRow('分类', 'category', [
      { id: 'all', name: '不限' },
      ...CATEGORIES.map((c) => ({ id: c.id, name: c.icon + ' ' + c.name })),
    ], D.category)}

    ${renderFilterRow('来源', 'source', [
      { id: 'all', name: '不限' },
      { id: 'wechat', name: '微信' },
      { id: 'alipay', name: '支付宝' },
      { id: 'manual', name: '手动' },
      { id: 'recurring', name: '周期' },
    ], D.source)}

    <div class="px16 mb8 small muted" style="display:flex;justify-content:space-between">
      <span>${counted.length} 笔</span>
      <span>
        ${spendSum ? '支出 ' + fmtMoney(spendSum) : ''}
        ${spendSum && incomeSum ? ' · ' : ''}
        ${incomeSum ? '收入 ' + fmtMoney(incomeSum) : ''}
      </span>
    </div>

    ${renderList(list)}
  `;
}

function chip(id, name, cur) {
  return `<button type="button" class="chip ${id === cur ? 'active' : ''}" data-ftype="${esc(id)}">${esc(name)}</button>`;
}

function renderFilterRow(label, key, options, current) {
  return `
    <div class="section-title" style="padding-bottom:6px">${esc(label)}</div>
    <div class="chips" data-fkey="${esc(key)}">
      ${options.map((o) => `<button type="button" class="chip ${o.id === current ? 'active' : ''}" data-fval="${esc(o.id)}">${esc(o.name)}</button>`).join('')}
    </div>`;
}

function renderList(list) {
  if (!list.length) {
    return `<div class="empty">
      <div class="big">🔍</div>
      <div class="title">没有符合条件的交易</div>
      <div class="sub">换个筛选条件，或者清空搜索词试试。</div>
    </div>`;
  }

  // 按天分组
  const days = new Map();
  for (const t of list) {
    const k = ymd(t.ts);
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(t);
  }

  const dayKeys = [...days.keys()].sort().reverse();
  let html = '';
  for (const k of dayKeys) {
    const items = days.get(k).sort((a, b) => b.ts - a.ts);
    // 每天的小计同样只算「计入统计」的那些，和上面的合计保持一致
    const counted = activeTxs(items);
    const daySpend = counted.reduce((s, t) => (t.type === 'expense' ? s + t.amountCents : t.type === 'refund' ? s - t.amountCents : s), 0);
    const dayIncome = counted.reduce((s, t) => (t.type === 'income' || t.type === 'redpacket' ? s + t.amountCents : s), 0);

    html += `<div class="day-head">
      <span>${esc(fmtDayLabel(items[0].ts))}</span>
      <span class="amt">
        ${daySpend ? '支出 ' + fmtMoney(daySpend) : ''}
        ${daySpend && dayIncome ? ' · ' : ''}
        ${dayIncome ? '<span class="green">收入 ' + fmtMoney(dayIncome) + '</span>' : ''}
      </span>
    </div>`;

    html += `<div class="card tx-list" style="margin:0 16px 12px">${items.map(txRowFull).join('')}</div>`;
  }
  return html;
}

function txRowFull(t) {
  const icon = txIcon(t);
  const catLabel = txCategoryLabel(t);
  const tt = txType(t.type);
  const isIn = tt.direction === 'in';
  const srcName = getSource(t.source).name;

  const parts = [fmtTime(t.ts), catLabel];
  if (t.source !== 'manual') parts.push(srcName);
  if (t.account) parts.push(t.account);
  if (t.excluded) parts.push('不计入统计'); // 免得用户奇怪「为什么这行没被算进上面的合计」
  if (t.duplicateOf) parts.push('已判重');

  return `<div class="row tappable" data-tx="${esc(t.id)}">
    <span class="row-icon">${icon}</span>
    <span class="row-main">
      <span class="row-title">${esc(t.merchant || '未记录商户')}</span>
      <span class="row-sub">${esc(parts.join(' · '))}${t.description && t.description !== t.merchant ? ' · ' + esc(t.description.slice(0, 20)) : ''}</span>
    </span>
    <span class="row-value ${isIn ? 'in' : ''}${t.duplicateOf ? ' muted' : ''}">${isIn ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</span>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * 交易详情弹层
 * ------------------------------------------------------------------ */

export function openTxSheet(txId) {
  const t = store.state.txs.find((x) => x.id === txId);
  if (!t) { toastErr('找不到这笔交易'); return; }

  const c = getCategory(t.category);
  const tt = txType(t.type);

  openSheet({
    title: '交易详情',
    leftLabel: '关闭',
    rightLabel: '编辑',
    onRight: (api) => {
      api.close();
      openQuickEntry({ tx: t });
    },
    render: (body, api) => {
      const dt = new Date(t.ts);
      const p = (n) => String(n).padStart(2, '0');
      const dateStr = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${p(dt.getHours())}:${p(dt.getMinutes())}`;

      body.innerHTML = `
        <div class="hero" style="padding-top:4px">
          <div style="font-size:34px;margin-bottom:4px">${txIcon(t)}</div>
          <div class="hero-value" style="font-size:34px">${tt.direction === 'in' ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</div>
          <div class="hero-delta">${esc(t.merchant || '未记录商户')}</div>
        </div>

        <div class="card" style="margin:0 16px 16px">
          ${infoRow('时间', dateStr)}
          ${infoRow('类型', tt.name)}
          ${infoRow('分类', txCategoryLabel(t))}
          ${t.description ? infoRow('商品说明', t.description) : ''}
          ${t.account ? infoRow('支付方式', t.account) : ''}
          ${t.note ? infoRow('备注', t.note) : ''}
          ${infoRow('来源', getSource(t.source).name)}
          ${t.rawType ? infoRow('账单原始类型', t.rawType) : ''}
          ${t.dupReason || t.duplicateOf ? infoRow('状态', '已判为重复，不计入统计') : ''}
        </div>

        <div class="section-title">改分类（会记住这个商户）</div>
        <div class="cat-pick" id="tx-cats">
          ${CATEGORIES.map((x) => `<button type="button" data-cat="${x.id}" class="${x.id === t.category ? 'active' : ''}">
            <span class="e">${x.icon}</span>${esc(x.name)}
          </button>`).join('')}
        </div>

        <div class="card" style="margin:0 16px 16px">
          <div class="field inline">
            <label>不计入统计</label>
            <span class="switch"><input type="checkbox" id="tx-excl" ${t.excluded ? 'checked' : ''}><i></i></span>
          </div>
          <div class="hint px16" style="padding-bottom:12px;color:var(--label-2);font-size:12px">
            打开后这笔钱不会被算进消费和预算，适合「帮别人代付、之后会还你」的情况。
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn danger" id="tx-del">删除这笔</button>
        </div>
      `;

      body.querySelector('#tx-cats').addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-cat]');
        if (!b) return;
        const newCat = b.dataset.cat;
        if (newCat === t.category) return;
        try {
          await store.updateTx({ id: t.id, category: newCat, userCategory: true });
          // 记住这个商户
          if (t.merchant) {
            const { learnRule } = await import('../core/classify.js');
            const rule = learnRule(t.merchant, newCat);
            if (rule) await store.setRule(rule);
          }
          toastOk(`已改为「${getCategory(newCat).name}」，以后这个商户自动分到这里`);
          api.close();
        } catch (e) {
          toastErr('修改失败：' + (e && e.message ? e.message : e));
        }
      });

      body.querySelector('#tx-excl').addEventListener('change', async (ev) => {
        try {
          await store.updateTx({ id: t.id, excluded: ev.target.checked });
          toastOk(ev.target.checked ? '已设为不计入统计' : '已恢复计入统计');
        } catch (e) {
          toastErr('修改失败');
        }
      });

      body.querySelector('#tx-del').addEventListener('click', async () => {
        const ok = await confirmSheet({
          title: '删除这笔交易？',
          message: '删除后无法恢复，除非你有备份文件。',
          confirmLabel: '删除',
          danger: true,
        });
        if (!ok) return;
        try {
          await store.removeTx(t.id);
          toastOk('已删除');
          api.close();
        } catch (e) {
          toastErr('删除失败');
        }
      });
    },
  });
}

function infoRow(label, value) {
  return `<div class="field"><label>${esc(label)}</label>
    <div class="pre" style="font-size:16px">${esc(value)}</div></div>`;
}
