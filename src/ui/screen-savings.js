/**
 * 轻账 · 攒钱页
 *
 * 一屏回答：我一共存了多少、离目标还差多少、这个月该存多少、
 * 以及最关键的 —— 有几个月我「算出来能攒」但实际没转走。
 */

import { ym, monthLabelFull, category as getCategory } from '../core/model.js';
import { computeSavings, loadSettings, saveSettings, recordSavings, isSavings, findSavingsCandidates, markMerchantAsSavings, markAsSavings, unmarkAsSavings } from '../core/savings.js';
import { esc, fmtMoney, fmtDate, openSheet, toastOk, toastErr, toastWarn, confirmSheet, promptSheet } from './dom.js';
import * as store from './store.js';

export function renderSavings(root) {
  const all = store.state.txs;
  const settings = store.state.savingsSettings || null;

  if (!settings) {
    root.innerHTML = '<div class="spin"></div>';
    // 设置还没载入（首次进入），载入后重画
    loadSettings().then((s) => {
      store.state.savingsSettings = s;
      store.notify(true);
    }).catch(() => {});
    return;
  }

  const sv = computeSavings(all, settings);
  const hasGoal = !!sv.goal;
  const hasMonthly = !!sv.monthlyTarget;

  root.innerHTML = `
    <div class="hero" style="padding-bottom:6px">
      <div class="hero-label">一共产下</div>
      <div class="hero-value" style="color:var(--green)">${esc(fmtMoney(sv.balance))}</div>
      <div class="hero-delta">
        ${sv.eventCount ? `共 ${sv.eventCount} 笔记录 · 存进 ${esc(fmtMoney(sv.totalIn, { decimals: 0 }))}${sv.totalOut ? ' · 取出 ' + esc(fmtMoney(sv.totalOut, { decimals: 0 })) : ''}` : '还没有攒钱记录'}
        ${sv.baselineCents ? `<br><span class="muted">其中含开始记账前的原有存款 ${esc(fmtMoney(sv.baselineCents))}</span>` : ''}
      </div>
    </div>

    <div class="btn-row" style="padding-top:4px">
      <button type="button" class="btn primary" data-sv="in">存一笔</button>
      <button type="button" class="btn" data-sv="out">取出一笔</button>
    </div>

    ${hasGoal ? renderGoal(sv) : renderGoalPrompt(sv)}

    ${hasMonthly ? renderMonthly(sv) : ''}

    ${sv.forecast ? `
    <div class="alert info">
      <span class="ico">📈</span>
      <div><div class="t">按现在的速度，大约 ${esc(fmtMoney(sv.forecast.avgMonthlySaved, { decimals: 0 }))} / 月</div>
      <div class="d">照这个速度，${sv.forecast.monthsNeeded} 个月后（约 ${esc(monthLabelFull(sv.forecast.etaMonth))}）能攒到目标。</div></div>
    </div>` : ''}

    ${sv.pendingTotal > 0 ? `
    <div class="alert warn">
      <span class="ico">💡</span>
      <div><div class="t">有 ${esc(fmtMoney(sv.pendingTotal))} 「该攒但还没转走」</div>
      <div class="d">这是各月结余里没变成实际存款的部分。
      钱留在余额里很容易花掉 —— 攒钱的关键就是把它转走。</div></div>
    </div>` : ''}

    ${renderSurplusTable(sv)}

    ${renderHistory(sv)}

    <div class="section-title">设置</div>
    <div class="card" style="margin:0 16px 16px">
      ${settingRow('🎯', '攒钱目标', hasGoal ? esc(sv.goal.label || fmtMoney(sv.goal.target, { decimals: 0 })) : '还没设', 'goal')}
      ${settingRow('📅', '每月攒钱目标', hasMonthly ? esc(fmtMoney(sv.monthlyTarget.target, { decimals: 0 })) : '还没设', 'monthly')}
      ${settingRow('🏦', '攒钱账户名', esc(sv.settings.account || '未设置'), 'account')}
      ${settingRow('🔍', '从账单里找出攒钱记录', '帮你把以前的转账标成攒钱', 'scan')}
    </div>

    <div class="px16 tiny muted" style="padding-bottom:24px">
      攒钱记录不计入消费，也不计入收入 —— 它只是钱在你自己的账户之间移动。
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * 目标
 * ------------------------------------------------------------------ */

function renderGoal(sv) {
  const g = sv.goal;
  const pct = Math.min(100, g.percent);
  const cls = g.done ? 'green' : 'var(--green)';
  return `
    <div class="section-title between">
      <span>攒钱目标</span>
      <span class="link" data-sv="goal">修改</span>
    </div>
    <div class="card" style="margin:0 16px 16px">
      <div class="ring-row">
        <div class="ring">${ring(g.percent / 100, g.done ? 'ok' : 'none', g.done ? '已达成' : '进度', g.percent.toFixed(0) + '%')}</div>
        <div class="ring-info">
          <div class="big">${esc(fmtMoney(g.saved))}</div>
          <div class="sub">
            ${g.label ? esc(g.label) + '<br>' : ''}
            目标 ${esc(fmtMoney(g.target))}<br>
            ${g.done
              ? '<span class="green">已经达成 🎉</span>'
              : `还差 <b>${esc(fmtMoney(g.remaining))}</b>`}
            ${g.byMonth ? `<br>计划 ${esc(monthLabelFull(g.byMonth))} 前完成` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function renderGoalPrompt(sv) {
  return `
    <div class="section-title">攒钱目标</div>
    <div class="card" style="margin:0 16px 16px">
      <div class="row tappable" data-sv="goal">
        <span class="row-icon">🎯</span>
        <span class="row-main">
          <span class="row-title">设一个目标</span>
          <span class="row-sub">比如「攒够 5000 换电脑」，看着进度条一点点满会很有动力</span>
        </span>
        <span class="row-chev">${chevSvg()}</span>
      </div>
    </div>`;
}

function renderMonthly(sv) {
  const m = sv.monthlyTarget;
  const pct = Math.min(100, m.percent);
  const reached = m.saved >= m.target;
  return `
    <div class="section-title between">
      <span>这个月的攒钱目标</span>
      <span class="link" data-sv="monthly">修改</span>
    </div>
    <div class="card" style="margin:0 16px 16px">
      <div class="cat-budget" style="padding:14px 16px">
        <div class="head">
          <span>${reached ? '✅' : '📅'}</span>
          <span>${esc(monthLabelFull(ym(new Date())))}</span>
          <span class="amt">${esc(fmtMoney(m.saved))} <span class="muted tiny">/ ${esc(fmtMoney(m.target, { decimals: 0 }))}</span></span>
        </div>
        <div class="bar"><i style="width:${pct}%;background:${reached ? 'var(--green)' : 'var(--blue)'}"></i></div>
        <div class="foot">
          <span>${reached ? '这个月达标了' : '还差 ' + esc(fmtMoney(m.remaining))}</span>
          <span>${m.percent.toFixed(0)}%</span>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * 月度对照表
 * ------------------------------------------------------------------ */

function renderSurplusTable(sv) {
  const rows = sv.surplusRows;
  if (!rows.length) {
    return `<div class="section-title">每月对照</div>
      <div class="card" style="margin:0 16px 16px"><div class="empty" style="padding:28px">
        <div class="sub">还没有数据。有收入也有消费之后，这里会告诉你每个月「本该攒多少、实际攒了多少」。</div>
      </div></div>`;
  }

  return `
    <div class="section-title between">
      <span>每月对照</span>
      <span class="link" style="color:var(--label-2);font-weight:400">结余 vs 实攒</span>
    </div>
    <div class="card" style="margin:0 16px 16px">
      ${rows.slice(0, 8).map((r) => {
        // 三种情况分开显示，别混在一起：
        //   有收支且实攒 ≥ 结余 → 达标
        //   有收支但没转走        → 提醒待转
        //   有收支但花的比赚的多  → 标超支
        //   没记过生活收支        → 老实说「这个月没记收支」，不下任何结论
        const mark = !r.hasFlow ? '·'
          : r.overspent ? '⚠️'
            : (r.pendingCents > 0 ? '💡' : '✅');

        let flowLine;
        if (!r.hasFlow) {
          flowLine = '<span class="muted">这个月只记了攒钱，没有收支记录</span>';
        } else {
          flowLine = `收入 ${esc(fmtMoney(r.income, { decimals: 0 }))} · 消费 ${esc(fmtMoney(r.spent, { decimals: 0 }))}`;
        }

        let rightLine;
        if (!r.hasFlow) rightLine = '';
        else if (r.overspent) rightLine = `<span class="red">这个月花的比赚的多 ${esc(fmtMoney(r.overspendCents, { decimals: 0 }))}</span>`;
        else rightLine = `结余 ${esc(fmtMoney(r.surplusCents, { decimals: 0 }))}`;

        return `<div class="cat-budget">
          <div class="head">
            <span>${mark}</span>
            <span>${esc(monthLabelFull(r.month))}</span>
            <span class="amt">实攒 ${esc(fmtMoney(r.savedCents, { decimals: 0 }))}</span>
          </div>
          <div class="foot" style="margin-top:6px">
            <span>${flowLine}</span>
            <span>${rightLine}</span>
          </div>
          ${r.pendingCents > 0 ? `<div class="foot"><span class="orange">💡 还有 ${esc(fmtMoney(r.pendingCents))} 没转走</span><span></span></div>` : ''}
          ${r.oversaved ? `<div class="foot"><span class="green">实攒比结余还多 ${esc(fmtMoney(r.savedCents - r.surplusCents, { decimals: 0 }))}，可能在动用以前的存款</span><span></span></div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

/* ------------------------------------------------------------------ *
 * 明细
 * ------------------------------------------------------------------ */

function renderHistory(sv) {
  if (!sv.events.length) return '';
  const list = [...sv.events].reverse().slice(0, 20);

  return `
    <div class="section-title between">
      <span>攒钱明细</span>
      <span class="link" style="color:var(--label-2);font-weight:400">最近 ${list.length} 笔</span>
    </div>
    <div class="card tx-list" style="margin:0 16px 16px">
      ${list.map((e) => `
        <div class="row tappable" data-sv-tx="${esc(e.tx.id)}">
          <span class="row-icon">${e.delta >= 0 ? '🏦' : '↩️'}</span>
          <span class="row-main">
            <span class="row-title">${e.delta >= 0 ? '存进去' : '取出来'}${e.note ? ' · ' + esc(e.note) : ''}</span>
            <span class="row-sub">${esc(fmtDate(e.ts))} · 余额 ${esc(fmtMoney(e.balanceAfter, { decimals: 0 }))}</span>
          </span>
          <span class="row-value ${e.delta >= 0 ? 'in' : ''}">${e.delta >= 0 ? '+' : '-'}${esc(fmtMoney(e.amountCents).slice(1))}</span>
        </div>`).join('')}
    </div>`;
}

function settingRow(icon, title, sub, act) {
  return `<div class="row tappable" data-sv="${esc(act)}">
    <span class="row-icon">${icon}</span>
    <span class="row-main"><span class="row-title">${esc(title)}</span>
    ${sub ? `<span class="row-sub">${sub}</span>` : ''}</span>
    <span class="row-chev">${chevSvg()}</span>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * 弹层
 * ------------------------------------------------------------------ */

/** 存一笔 / 取出一笔 */
export function openSavingsEntry(direction) {
  const dir = direction === 'out' ? 'out' : 'in';
  const st = { amount: '', note: '', date: fmtDate(Date.now()) };

  openSheet({
    title: dir === 'in' ? '存一笔' : '取出一笔',
    rightLabel: '保存',
    onRight: async (api) => {
      const cents = Math.round(parseFloat(st.amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) { toastErr('请先输入金额'); return; }
      try {
        const settings = store.state.savingsSettings || await loadSettings();
        const tx = await recordSavings({
          amountCents: cents,
          direction: dir,
          note: st.note,
          ts: new Date(st.date + 'T12:00:00').getTime(),
          settings,
        });
        await store.reloadAll();
        toastOk(dir === 'in' ? `已存下 ${fmtMoney(cents)}` : `已取出 ${fmtMoney(cents)}`);
        api.close();
        void tx;
      } catch (e) {
        toastErr(e && e.message ? e.message : '保存失败');
      }
    },
    render: (body) => {
      body.innerHTML = `
        <div class="amount-display" id="sv-amount" style="padding-top:8px">
          <span class="placeholder">¥0.00</span>
        </div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>金额（元）</label>
            <input type="number" inputmode="decimal" id="sv-amt" placeholder="0.00" autocomplete="off">
          </div>
          <div class="field">
            <label>备注（可选）</label>
            <input type="text" id="sv-note" placeholder="${dir === 'in' ? '例如：这个月生活费剩的' : '例如：买书、急用'}" autocomplete="off">
          </div>
          <div class="field inline">
            <label>日期</label>
            <input type="date" id="sv-date" value="${esc(st.date)}" style="width:auto;flex:0 0 auto">
          </div>
        </div>
        <div class="px16 mb16 small muted">
          ${dir === 'in'
            ? '这笔会被记成「内部转账」，<b>不算消费也不算收入</b>，只影响你的攒钱总额。'
            : '取出来也<b>不算收入</b>，它只是让你的攒钱总额减少。'}
        </div>
        <div class="btn-row"><button type="button" class="btn primary" id="sv-save">保存</button></div>
      `;

      const amtEl = body.querySelector('#sv-amt');
      const display = body.querySelector('#sv-amount');
      amtEl.addEventListener('input', () => {
        st.amount = amtEl.value;
        const c = Math.round(parseFloat(st.amount) * 100);
        display.innerHTML = Number.isFinite(c) && c > 0
          ? `<span class="cur">¥</span>${esc((c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`
          : '<span class="placeholder">¥0.00</span>';
      });
      body.querySelector('#sv-note').addEventListener('input', (e) => { st.note = e.target.value; });
      body.querySelector('#sv-date').addEventListener('change', (e) => { st.date = e.target.value; });

      // 面板上的保存按钮和右上角「保存」做同一件事
      const saveBtn = body.querySelector('#sv-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const head = document.querySelector('.sheet .sheet-head');
          const right = head ? head.querySelectorAll('button')[2] : null;
          if (right) right.click();
        });
      }
      setTimeout(() => amtEl.focus(), 320);
    },
  });
}

/** 设置攒钱目标 */
export function openSavingsGoal() {
  const cur = store.state.savingsSettings || {};
  openSheet({
    title: '攒钱目标',
    rightLabel: '保存',
    onRight: async (api) => {
      const body = api.body;
      const target = parseFloat(body.querySelector('#sv-goal').value);
      const label = body.querySelector('#sv-label').value.trim();
      const by = body.querySelector('#sv-by').value;
      const saved = await saveSettings({
        goalCents: Number.isFinite(target) && target > 0 ? Math.round(target * 100) : 0,
        goalLabel: label,
        goalByMonth: /^\d{4}-\d{2}$/.test(by) ? by : '',
      });
      store.state.savingsSettings = saved;
      await store.reloadAll();
      toastOk(saved.goalCents ? '目标已保存' : '已取消目标');
      api.close();
    },
    render: (body) => {
      const g = Math.round((cur.goalCents || 0) / 100);
      body.innerHTML = `
        <div class="px16 mb16 small muted">目标不是必须的，但「看着进度条一点点满」比单纯记数字有动力得多。</div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>目标金额（元）</label>
            <input type="number" inputmode="decimal" id="sv-goal" value="${g > 0 ? g : ''}" placeholder="例如 5000，留空表示不设目标">
          </div>
          <div class="field">
            <label>攒来做什么（可选）</label>
            <input type="text" id="sv-label" value="${esc(cur.goalLabel || '')}" placeholder="例如：换电脑、旅游基金" autocomplete="off">
          </div>
          <div class="field inline">
            <label>计划什么时候达成（可选）</label>
            <input type="month" id="sv-by" value="${esc(cur.goalByMonth || '')}" style="width:auto;flex:0 0 auto">
          </div>
        </div>`;
    },
  });
}

/** 每月攒钱目标 */
export function openMonthlyTarget() {
  const cur = store.state.savingsSettings || {};
  openSheet({
    title: '每月攒钱目标',
    rightLabel: '保存',
    onRight: async (api) => {
      const v = parseFloat(api.body.querySelector('#sv-monthly').value);
      const saved = await saveSettings({
        monthlyTargetCents: Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0,
      });
      store.state.savingsSettings = saved;
      await store.reloadAll();
      toastOk(saved.monthlyTargetCents ? '已保存' : '已取消每月目标');
      api.close();
    },
    render: (body) => {
      const m = Math.round((cur.monthlyTargetCents || 0) / 100);
      body.innerHTML = `
        <div class="px16 mb16 small muted">
          每月固定存一点，比「月底看剩多少再存」有效得多。<br>
          比如生活费 2000，计划每月存 300，就填 300。
        </div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>每月想存多少（元）</label>
            <input type="number" inputmode="decimal" id="sv-monthly" value="${m > 0 ? m : ''}" placeholder="例如 300，留空表示不设">
          </div>
        </div>`;
    },
  });
}

/** 攒钱账户名 */
export function openSavingsAccount() {
  const cur = store.state.savingsSettings || {};
  openSheet({
    title: '攒钱账户名',
    rightLabel: '保存',
    onRight: async (api) => {
      const v = api.body.querySelector('#sv-acct').value.trim();
      if (!v) { toastErr('请填一个名字'); return; }
      const saved = await saveSettings({ account: v });
      store.state.savingsSettings = saved;
      await store.reloadAll();
      toastOk('已保存');
      api.close();
    },
    render: (body) => {
      body.innerHTML = `
        <div class="px16 mb16 small muted">
          这是你放存款的地方，比如「余额宝」「零钱通」「招商银行储蓄卡」。<br>
          账单里出现这个名字的转账，轻账会认出来问你算不算攒钱。
        </div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>账户名</label>
            <input type="text" id="sv-acct" value="${esc(cur.account || '储蓄账户')}" autocomplete="off">
          </div>
        </div>`;
    },
  });
}

/** 从账单里找出可能的攒钱记录 */
export function openSavingsScan() {
  const all = store.state.txs;
  const settings = store.state.savingsSettings || {};
  const candidates = findSavingsCandidates(all, settings);

  openSheet({
    title: '从账单里找出攒钱记录',
    leftLabel: '关闭',
    height: '75vh',
    render: (body, api) => {
      if (!candidates.length) {
        body.innerHTML = `<div class="empty"><div class="big">🔍</div>
          <div class="title">没找到转账记录</div>
          <div class="sub">账单里没有「转账」或「还款」类型的交易。<br>
          攒钱通常是「转入余额宝」「转出到银行卡」这类，先导入账单再试。</div></div>`;
        return;
      }

      body.innerHTML = `
        <div class="px16 mb16 small muted">
          下面是账单里所有的「转账 / 还款」记录（这些本来就不计入消费）。
          如果你在其中看到了自己的存钱动作，点「标为攒钱」，它就会计入攒钱总额。
        </div>
        <div class="card" style="margin:0 16px 16px">
          ${candidates.map((c) => `
            <div class="row">
              <span class="row-icon">${c.matchesName ? '🎯' : '🔄'}</span>
              <span class="row-main">
                <span class="row-title">${esc(c.merchant)}</span>
                <span class="row-sub">${c.count} 笔 · 共 ${esc(fmtMoney(c.cents, { decimals: 0 }))} · ${esc(fmtDate(c.firstTs))} 起${c.matchesName ? ' · 名字像你的攒钱账户' : ''}</span>
              </span>
              <button type="button" class="btn" data-mark="${esc(c.merchant)}" style="width:auto;min-height:34px;padding:0 14px;font-size:14px">标为攒钱</button>
            </div>`).join('')}
        </div>`;

      body.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('[data-mark]');
        if (!btn) return;
        const merchant = btn.dataset.mark;
        btn.disabled = true;
        try {
          const n = await markMerchantAsSavings(merchant, store.state.txs);
          await store.reloadAll();
          toastOk(`已把「${merchant}」的 ${n} 笔标为攒钱`);
          btn.textContent = '已标记';
        } catch (e) {
          btn.disabled = false;
          toastErr('标记失败：' + (e && e.message ? e.message : e));
        }
      });
    },
  });
}

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

function ring(ratio, level, label, value) {
  const size = 120, thickness = 12;
  const r = (size - thickness) / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const len = clamped * circ;
  const color = level === 'ok' ? 'var(--green)'
    : level === 'danger' ? 'var(--red)'
      : level === 'warn' ? 'var(--orange)' : 'var(--green)';

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

function chevSvg() {
  return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
