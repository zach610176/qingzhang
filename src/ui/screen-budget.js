/**
 * 轻账 · 预算页
 */

import { CATEGORIES, category as getCategory, monthLabelFull, prevMonth } from '../core/model.js';
import { budgetStatus, categoryBudgetStatus, budgetAlerts, defaultBudget } from '../core/budget.js';
import { esc, fmtMoney, toastOk, toastErr, openSheet, confirmSheet } from './dom.js';
import * as store from './store.js';

export function renderBudget(root) {
  const month = store.state.month;
  const all = store.state.txs;
  const budget = store.effectiveBudget(month);
  const isCustom = !!store.state.budgets[month];
  const s = budgetStatus(all, month, budget);
  const catRows = categoryBudgetStatus(all, month, budget);
  const alerts = budgetAlerts(all, month, budget);
  const hasAny = s.hasTotal || catRows.length > 0;

  root.innerHTML = `
    <div class="hero" style="padding-bottom:4px">
      <div class="hero-label">${esc(monthLabelFull(month))}预算</div>
      <div class="hero-value">${s.hasTotal ? esc(fmtMoney(s.totalCents)) : '<span class="muted" style="font-size:26px">未设置</span>'}</div>
      ${isCustom ? '<div class="hero-delta flat">这个月单独设置过</div>' : '<div class="hero-delta flat">使用默认预算</div>'}
    </div>

    ${alerts.length ? alerts.map((a) => `
      <div class="alert ${a.level === 'danger' ? 'danger' : 'warn'}">
        <span class="ico">${a.level === 'danger' ? '🔴' : '🟡'}</span>
        <div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.detail)}</div></div>
      </div>`).join('') : ''}

    ${s.hasTotal ? `
      <div class="card" style="margin:0 16px 16px">
        <div class="ring-row">
          <div class="ring">${ring(s.ratio, s.level, '已用', s.percentUsed.toFixed(0) + '%')}</div>
          <div class="ring-info">
            <div class="big">${esc(fmtMoney(s.spent))}</div>
            <div class="sub">
              预算 ${esc(fmtMoney(s.totalCents))}<br>
              ${s.remaining >= 0 ? '还剩 ' + esc(fmtMoney(s.remaining)) : '<span class="red">已超 ' + esc(fmtMoney(-s.remaining)) + '</span>'}<br>
              今天 ${esc(String(s.dayOfMonth))} 号 / 共 ${s.totalDays} 天<br>
              ${s.totalDays - s.dayOfMonth > 0 ? '每天可花 ' + esc(fmtMoney(s.dailyAllowance)) : '本月已结束'}
            </div>
          </div>
        </div>
        ${s.willExceed && s.ratio < 1 ? `<div class="px16 pb16 small orange">按当前速度，月底预计花到 ${esc(fmtMoney(s.pace))}，会超预算。</div>` : ''}
      </div>` : ''}

    <div class="section-title between">
      <span>总预算</span>
      <span class="link" data-act="edit-total">${s.hasTotal ? '修改' : '设置'}</span>
    </div>
    <div class="card" style="margin:0 16px 16px">
      <div class="row tappable" data-act="edit-total">
        <span class="row-main"><span class="row-title">每月总预算</span>
        <span class="row-sub">所有分类加起来的上限</span></span>
        <span class="row-value ${s.hasTotal ? '' : 'muted'}">${s.hasTotal ? esc(fmtMoney(s.totalCents)) : '未设置'}</span>
      </div>
      <div class="row tappable" data-act="edit-warn">
        <span class="row-main"><span class="row-title">提醒阈值</span>
        <span class="row-sub">用到多少比例时给黄色提醒</span></span>
        <span class="row-value">${Math.round((budget.warnRatio ?? 0.8) * 100)}%</span>
      </div>
    </div>

    <div class="section-title between">
      <span>分类预算</span>
      <span class="link" data-act="edit-cats">${catRows.length ? '修改' : '设置'}</span>
    </div>
    <div class="card" style="margin:0 16px 16px">
      ${catRows.length ? catRows.map(catRow).join('') : `
        <div class="empty" style="padding:24px">
          <div class="sub">还没有设置分类预算。<br>设置后可以看到「餐饮还剩多少」这类提示。</div>
        </div>`}
    </div>

    <div class="section-title">这个月的收支</div>
    <div class="card" style="margin:0 16px 16px">
      <div class="row"><span class="row-main"><span class="row-title">消费净额</span></span>
        <span class="row-value">${esc(fmtMoney(s.spent))}</span></div>
      <div class="row"><span class="row-main"><span class="row-title">收入</span></span>
        <span class="row-value in">${esc(fmtMoney(s.balance + s.spent))}</span></div>
      <div class="row"><span class="row-main"><span class="row-title">结余</span></span>
        <span class="row-value ${s.balance >= 0 ? '' : 'red'}">${esc(fmtMoney(s.balance))}</span></div>
    </div>

    ${isCustom ? `<div class="btn-row"><button type="button" class="btn" data-act="reset-month">恢复为默认预算</button></div>` : ''}
  `;
}

function catRow(c) {
  const pct = Math.min(100, c.percentUsed);
  const cls = c.level === 'danger' ? 'var(--red)' : c.level === 'warn' ? 'var(--orange)' : c.color;
  return `<div class="cat-budget">
    <div class="head">
      <span>${c.icon}</span>
      <span>${esc(c.name)}</span>
      <span class="amt">${esc(fmtMoney(c.spent))} <span class="muted tiny">/ ${esc(fmtMoney(c.budgetCents, { decimals: 0 }))}</span></span>
    </div>
    <div class="bar"><i style="width:${pct}%;background:${cls}"></i></div>
    <div class="foot">
      <span>${c.count} 笔 · ${c.percentUsed.toFixed(0)}%</span>
      <span>${c.remaining >= 0 ? '还剩 ' + esc(fmtMoney(c.remaining)) : '<span class="red">超 ' + esc(fmtMoney(-c.remaining)) + '</span>'}</span>
    </div>
  </div>`;
}

function ring(ratio, level, label, value) {
  const size = 120, thickness = 12;
  const r = (size - thickness) / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const len = clamped * circ;
  const color = level === 'danger' ? 'var(--red)' : level === 'warn' ? 'var(--orange)' : level === 'ok' ? 'var(--green)' : 'var(--gray)';

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:120px;margin:0 auto;display:block" role="img" aria-label="${esc(label)} ${esc(value)}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${thickness}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${thickness}"
      stroke-linecap="round"
      stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--label)">${esc(value)}</text>
    <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="var(--label-2)">${esc(label)}</text>
  </svg>`;
}

/* ------------------------------------------------------------------ *
 * 编辑弹层
 * ------------------------------------------------------------------ */

export function openBudgetEdit() {
  const month = store.state.month;
  const budget = store.effectiveBudget(month);
  const draft = JSON.parse(JSON.stringify({ ...defaultBudget(), ...budget }));

  openSheet({
    title: '设置预算',
    leftLabel: '取消',
    rightLabel: '保存',
    height: '76vh',
    onRight: async (api) => {
      await store.saveBudget(month, draft);
      toastOk('预算已保存');
      api.close();
    },
    render: (body, api) => {
      body.innerHTML = `
        <div class="px16 mb16 small muted">这里的设置会应用到这个月。不单独设置的话，就用下面「默认预算」里的值。</div>

        <div class="section-title">总预算</div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>每月总预算（元）</label>
            <input type="number" inputmode="decimal" id="bd-total" min="0" step="100" placeholder="例如 3000，留空或 0 表示不限制" value="${draft.totalCents ? (draft.totalCents / 100).toFixed(0) : ''}">
          </div>
          <div class="field">
            <label>提醒阈值（%）</label>
            <input type="number" inputmode="numeric" id="bd-warn" min="1" max="100" step="5" value="${Math.round((draft.warnRatio ?? 0.8) * 100)}">
            <div class="hint">花到这个比例时提醒你，默认 80%。</div>
          </div>
        </div>

        <div class="section-title between">
          <span>分类预算</span>
          <button type="button" class="link" id="bd-clear">全部清空</button>
        </div>
        <div class="card" style="margin:0 16px 16px">
          ${CATEGORIES.map((c) => `
            <div class="field inline">
              <label>${c.icon} ${esc(c.name)}</label>
              <input type="number" inputmode="decimal" min="0" step="50" data-cat="${c.id}"
                placeholder="不限" value="${draft.byCategory[c.id] ? (draft.byCategory[c.id] / 100).toFixed(0) : ''}"
                style="max-width:46%">
            </div>`).join('')}
        </div>

        <div class="card" style="margin:0 16px 16px">
          <div class="field inline">
            <label>把它设为默认预算</label>
            <span class="switch"><input type="checkbox" id="bd-default" checked><i></i></span>
          </div>
          <div class="hint px16" style="padding-bottom:12px;color:var(--label-2);font-size:12px">
            打开后，以后每个月都用这套预算（当月可再单独调整）。
          </div>
        </div>
      `;

      const totalEl = body.querySelector('#bd-total');
      const warnEl = body.querySelector('#bd-warn');
      const defEl = body.querySelector('#bd-default');

      const sync = () => {
        const t = parseFloat(totalEl.value);
        draft.totalCents = Number.isFinite(t) && t > 0 ? Math.round(t * 100) : 0;
        const w = parseFloat(warnEl.value);
        draft.warnRatio = Number.isFinite(w) && w > 0 && w <= 100 ? w / 100 : 0.8;

        draft.byCategory = {};
        for (const inp of body.querySelectorAll('[data-cat]')) {
          const v = parseFloat(inp.value);
          if (Number.isFinite(v) && v > 0) draft.byCategory[inp.dataset.cat] = Math.round(v * 100);
        }
      };

      body.addEventListener('input', sync);

      body.querySelector('#bd-clear').addEventListener('click', () => {
        for (const inp of body.querySelectorAll('[data-cat]')) inp.value = '';
        sync();
      });

      // 保存时把「设为默认」也一起处理
      api.setRightHandler(async (a) => {
        sync();
        await store.saveBudget(month, draft);
        if (defEl.checked) {
          await store.saveBudget('__default', { ...draft, byCategory: { ...draft.byCategory } });
        }
        toastOk('预算已保存');
        a.close();
      });
    },
  });
}

export function openWarnRatioEdit() {
  const month = store.state.month;
  const budget = store.effectiveBudget(month);
  const cur = Math.round((budget.warnRatio ?? 0.8) * 100);

  openSheet({
    title: '提醒阈值',
    rightLabel: '保存',
    onRight: async (api) => {
      const input = api.body.querySelector('#wr');
      const v = parseFloat(input && input.value);
      if (!Number.isFinite(v) || v < 1 || v > 100) { toastErr('请输入 1 到 100 之间的数字'); return; }
      const b = store.effectiveBudget(month);
      await store.saveBudget(month, { ...b, warnRatio: v / 100 });
      toastOk(`已设为 ${Math.round(v)}%`);
      api.close();
    },
    render: (body) => {
      body.innerHTML = `
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>用到百分之多少时提醒（1-100）</label>
            <input type="number" id="wr" inputmode="numeric" min="1" max="100" value="${cur}">
            <div class="hint">例如填 80，就是花掉预算的 80% 时显示黄色提醒。</div>
          </div>
        </div>`;
    },
  });
}
