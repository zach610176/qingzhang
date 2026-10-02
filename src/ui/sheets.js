/**
 * 轻账 · 记账面板
 *
 * 设计目标：从打开到记完不超过 3 秒。
 *   - 打开就能直接按数字键盘，不用先点输入框
 *   - 商户名有历史建议，选中后自动带你上次用的分类
 *   - 分类改过一次就记住，下次不用再改
 */

import { openSheet, toastOk, toastErr, esc, fmtMoney, fmtDate } from './dom.js';
import { CATEGORIES, INCOME_CATEGORIES, MANUAL_TYPES, txType, newId, toCents, category as getCategory } from '../core/model.js';
import { classify, learnRule } from '../core/classify.js';
import * as store from './store.js';
import { normalizeMerchant, cleanText } from '../core/util.js';

const TYPES_FOR_PICKER = [
  { id: 'expense', name: '消费' },
  { id: 'income', name: '收入' },
  { id: 'redpacket', name: '红包' },
  { id: 'transfer', name: '转账' },
  { id: 'repay', name: '还款' },
];

/**
 * 打开记账面板
 * @param {object} [opts]
 * @param {object} [opts.tx]       传入表示编辑已有交易
 * @param {string} [opts.type]     新增时的默认类型
 * @param {number} [opts.amountCents]
 * @param {string} [opts.category]
 * @param {string} [opts.merchant]
 * @param {string} [opts.date]     'YYYY-MM-DD'
 * @param {Function} [opts.onSaved]
 */
export function openQuickEntry(opts = {}) {
  const editing = opts.tx || null;

  const st = {
    type: editing ? editing.type : (opts.type || 'expense'),
    amountStr: editing ? centsToInput(editing.amountCents) : (opts.amountCents ? centsToInput(opts.amountCents) : ''),
    category: editing ? editing.category : (opts.category || ''),
    merchant: editing ? editing.merchant : (opts.merchant || ''),
    note: editing ? (editing.note || '') : '',
    date: editing ? fmtDate(editing.ts) : (opts.date || fmtDate(Date.now())),
    source: editing ? editing.source : 'manual',
    account: editing ? (editing.account || '') : '',
    recurring: false,
  };

  // 新增且没指定分类时，先用商户名猜一个
  if (!st.category && st.merchant) {
    const r = classify({ merchant: st.merchant }, store.ruleMap());
    st.category = r.category;
  }
  if (!st.category) st.category = 'food';

  let api = null;

  api = openSheet({
    title: editing ? '编辑' : '记一笔',
    leftLabel: '取消',
    rightLabel: editing ? '保存' : '完成',
    // 不锁死高度：让内容决定，排版更紧凑，数字键盘也一定露得出来
    onLeft: (a) => a.close(),
    onRight: (a) => { save(a); },
    render: (body, sheetApi) => {
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.innerHTML = `
        <div class="type-tabs" id="qe-types">
          ${TYPES_FOR_PICKER.map((t) => `<button type="button" class="type-tab" data-type="${t.id}">${t.name}</button>`).join('')}
        </div>

        <div class="amount-display" id="qe-amount"></div>

        <div class="merchant-row" style="position:relative">
          <input id="qe-merchant" type="text" placeholder="商户 / 说明（可选）" autocomplete="off"
                 autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
          <div class="suggest" id="qe-suggest" hidden></div>
        </div>

        <div class="cat-pick" id="qe-cats"></div>
        <button type="button" class="cat-manage" id="qe-manage">
          <span>＋</span> 新建 / 管理分类
        </button>

        <div class="card" style="margin:0 16px 10px">
          <div class="field inline">
            <label for="qe-date">日期</label>
            <input id="qe-date" type="date">
          </div>
          <div class="field inline">
            <label for="qe-account">账户</label>
            <input id="qe-account" type="text" placeholder="选填" autocomplete="off">
          </div>
          <div class="field inline">
            <label for="qe-note">备注</label>
            <input id="qe-note" type="text" placeholder="选填" autocomplete="off">
          </div>
          ${editing ? '' : `
          <div class="field inline">
            <label for="qe-recurring">每月固定支出</label>
            <span class="switch"><input id="qe-recurring" type="checkbox"><i></i></span>
          </div>`}
        </div>

        <div class="keypad" id="qe-keys" style="margin-top:auto">
          <button type="button" class="fn" data-k="7">7</button>
          <button type="button" class="fn" data-k="8">8</button>
          <button type="button" class="fn" data-k="9">9</button>
          <button type="button" class="fn" data-k="del">⌫</button>

          <button type="button" class="fn" data-k="4">4</button>
          <button type="button" class="fn" data-k="5">5</button>
          <button type="button" class="fn" data-k="6">6</button>
          <button type="button" class="fn" data-k="c">清空</button>

          <button type="button" class="fn" data-k="1">1</button>
          <button type="button" class="fn" data-k="2">2</button>
          <button type="button" class="fn" data-k="3">3</button>
          <button type="button" class="fn" data-k="today">今天</button>

          <button type="button" class="fn" data-k=".">.</button>
          <button type="button" class="fn" data-k="0">0</button>
          <button type="button" class="fn" data-k="00">00</button>
          <button type="button" class="ok" data-k="ok">完成</button>
        </div>
      `;

      const amountEl = body.querySelector('#qe-amount');
      const catsEl = body.querySelector('#qe-cats');
      const merchantEl = body.querySelector('#qe-merchant');
      const suggestEl = body.querySelector('#qe-suggest');
      const dateEl = body.querySelector('#qe-date');
      const accountEl = body.querySelector('#qe-account');
      const noteEl = body.querySelector('#qe-note');
      const recEl = body.querySelector('#qe-recurring');

      merchantEl.value = st.merchant;
      dateEl.value = st.date;
      accountEl.value = st.account;
      noteEl.value = st.note;

      /* ---------- 渲染 ---------- */

      function renderTypes() {
        for (const b of body.querySelectorAll('#qe-types .type-tab')) {
          b.classList.toggle('active', b.dataset.type === st.type);
        }
      }

      function renderAmount() {
        if (!st.amountStr) {
          amountEl.innerHTML = '<span class="placeholder">¥0.00</span>';
          return;
        }
        const cents = toCents(st.amountStr);
        amountEl.innerHTML = `<span class="cur">¥</span>${esc((cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
      }

      function renderCats() {
        // 自定义分类（builtin === false）两边都要显示：
        // 支出侧的自定义分类要出现在「消费」里，收入侧的出现在「收入」里。
        // 这里靠 builtin 标志和列表来源区分，不靠 id 前缀猜。
        const list = st.type === 'income' || st.type === 'redpacket'
          ? INCOME_CATEGORIES
          : CATEGORIES;
        // 兜底：切换收支类型后，原来的分类可能不在当前列表里，
        // 这时候自动落到列表第一项，否则界面上会出现「一个都没选中」的尴尬状态。
        if (!list.some((c) => c.id === st.category)) {
          st.category = list[0].id;
        }
        catsEl.innerHTML = list.map((c) => `
          <button type="button" data-cat="${c.id}" class="${c.id === st.category ? 'active' : ''}"
                  ${c.color ? `style="--cat-color:${esc(c.color)}"` : ''}>
            <span class="e">${c.icon || '•'}</span>${esc(c.name)}
          </button>`).join('');
      }

      function renderSuggest() {
        const q = cleanText(merchantEl.value);
        if (!q || q.length < 1) { suggestEl.hidden = true; return; }

        const seen = new Map();
        for (const t of store.state.txs) {
          if (!t.merchant) continue;
          if (t.duplicateOf) continue;
          const key = normalizeMerchant(t.merchant);
          if (!key || !key.includes(q.toLowerCase())) continue;
          const prev = seen.get(key);
          if (prev) { prev.count++; if (t.ts > prev.ts) { prev.ts = t.ts; prev.category = t.category; } }
          else seen.set(key, { name: t.merchant, category: t.category, count: 1, ts: t.ts });
        }

        const rows = [...seen.values()].sort((a, b) => b.count - a.count || b.ts - a.ts).slice(0, 6);
        if (!rows.length) { suggestEl.hidden = true; return; }

        suggestEl.innerHTML = rows.map((r) => `
          <button type="button" data-name="${esc(r.name)}" data-cat="${esc(r.category)}">
            ${esc(r.name)}
            <span class="c">${esc(getCategory(r.category).name)} · ${r.count}笔</span>
          </button>`).join('');
        suggestEl.hidden = false;
      }

      function renderAll() {
        renderTypes();
        renderAmount();
        renderCats();
      }

      renderAll();

      /* ---------- 交互 ---------- */

      body.querySelector('#qe-types').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-type]');
        if (!b) return;
        st.type = b.dataset.type;
        // 切到收支类型时，把分类重置成该类别的合理默认值
        if (st.type === 'income') st.category = 'other_in';
        else if (st.type === 'redpacket') st.category = 'redpacket';
        else if (st.type === 'transfer' || st.type === 'repay') st.category = 'other';
        else if (!CATEGORIES.some((c) => c.id === st.category)) st.category = 'food';
        renderAll();
      });

      catsEl.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-cat]');
        if (!b) return;
        st.category = b.dataset.cat;
        renderCats();
      });

      merchantEl.addEventListener('input', () => {
        renderSuggest();
        // 商户名一变，如果用户还没手动点过分类，就重新猜
        if (!st.userTouchedCategory) {
          const r = classify({ merchant: merchantEl.value }, store.ruleMap());
          if (r.category) { st.category = r.category; renderCats(); }
        }
      });
      merchantEl.addEventListener('focus', renderSuggest);
      merchantEl.addEventListener('blur', () => {
        setTimeout(() => { suggestEl.hidden = true; }, 180);
      });

      suggestEl.addEventListener('mousedown', (ev) => {
        const b = ev.target.closest('[data-name]');
        if (!b) return;
        ev.preventDefault();
        st.merchant = b.dataset.name;
        st.category = b.dataset.cat;
        merchantEl.value = st.merchant;
        suggestEl.hidden = true;
        renderCats();
      });

      // 记录用户是否手动点过分类（点过就不再被自动猜测覆盖）
      catsEl.addEventListener('click', () => { st.userTouchedCategory = true; });

      // 「新建 / 管理分类」——这个查询必须放在 body.innerHTML 赋值之后，
      // 否则拿到 null，按钮点了没反应。
      const manageBtn = body.querySelector('#qe-manage');
      if (manageBtn) {
        manageBtn.addEventListener('click', async () => {
          const { openCategoryManager } = await import('./category-sheets.js');
          openCategoryManager();
        });
      }

      dateEl.addEventListener('change', () => { st.date = dateEl.value; });
      accountEl.addEventListener('input', () => { st.account = accountEl.value; });
      noteEl.addEventListener('input', () => { st.note = noteEl.value; });
      if (recEl) recEl.addEventListener('change', () => { st.recurring = recEl.checked; });
      recEl && (st.recurring = false);

      body.querySelector('#qe-keys').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-k]');
        if (!b) return;
        pressKey(b.dataset.k);
      });

      // 物理键盘也能用（电脑上调试方便）
      sheetApi.root.addEventListener('keydown', (ev) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (/^[0-9.]$/.test(ev.key)) { pressKey(ev.key); ev.preventDefault(); }
        else if (ev.key === 'Backspace') { pressKey('del'); ev.preventDefault(); }
        else if (ev.key === 'Enter') { save(sheetApi); }
      });

      setTimeout(() => {
        body.style.transform = 'none';
      }, 0);
    },
  });

  /* ---------- 键盘逻辑 ---------- */

  function pressKey(k) {
    if (k === 'ok') { save(api); return; }
    if (k === 'del') { st.amountStr = st.amountStr.slice(0, -1); }
    else if (k === 'c') { st.amountStr = ''; }
    else if (k === 'today') { st.date = fmtDate(Date.now()); const d = api.body.querySelector('#qe-date'); if (d) d.value = st.date; return; }
    else if (k === '.') {
      if (st.amountStr.includes('.')) return;
      st.amountStr = (st.amountStr || '0') + '.';
    } else {
      // 限制：最多 9 位整数 + 2 位小数
      const [intPart, decPart] = st.amountStr.split('.');
      if (decPart !== undefined && decPart.length >= 2) return;
      if (decPart === undefined && intPart && intPart.replace('-', '').length >= 9) return;
      if (st.amountStr === '0' && k !== '.') st.amountStr = k;
      else st.amountStr += k;
    }
    renderAmountOnly();
  }

  function renderAmountOnly() {
    const amountEl = api.body.querySelector('#qe-amount');
    if (!amountEl) return;
    if (!st.amountStr) { amountEl.innerHTML = '<span class="placeholder">¥0.00</span>'; return; }
    const cents = toCents(st.amountStr);
    amountEl.innerHTML = `<span class="cur">¥</span>${esc((cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
  }

  /* ---------- 保存 ---------- */

  async function save(sheetApi) {
    const cents = toCents(st.amountStr);
    if (!cents || cents <= 0) { toastErr('请先输入金额'); return; }

    const dt = parseDateInput(st.date);
    const merchant = cleanText(st.merchant);

    const tx = {
      id: editing ? editing.id : newId(),
      ts: dt,
      amountCents: cents,
      type: st.type,
      category: st.category,
      merchant: merchant || (st.type === 'expense' ? '未记录商户' : txType(st.type).name),
      description: cleanText(st.note),
      source: editing ? editing.source : 'manual',
      account: cleanText(st.account),
      note: cleanText(st.note),
      userCategory: true,
      batchId: editing ? editing.batchId : '',
      createdAt: editing ? editing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (editing) {
        await store.updateTx(tx);
      } else {
        await store.addTx(tx);
      }
    } catch (e) {
      toastErr('保存失败：' + (e && e.message ? e.message : e));
      return;
    }

    // 学习：商户名 → 分类。只在用户真的选了分类时记，避免污染规则库。
    if (merchant && catalogHas(st.category)) {
      const rule = learnRule(merchant, st.category);
      if (rule) await store.setRule(rule);
    }

    // 周期账单
    if (st.recurring && !editing) {
      const d = new Date(dt);
      await store.saveRecurring({
        id: newId('r'),
        name: merchant || tx.description || '周期账单',
        amountCents: cents,
        category: st.category,
        type: st.type,
        frequency: 'monthly',
        dayOfMonth: d.getDate(),
        startMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        lastGeneratedMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    toastOk(editing ? '已保存' : `已记 ${fmtMoney(cents)}`);
    sheetApi.close();
    if (opts.onSaved) opts.onSaved(tx);
  }
}

/* ------------------------------------------------------------------ *
 * 辅助
 * ------------------------------------------------------------------ */

function centsToInput(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

function catalogHas(catId) {
  return CATEGORIES.some((c) => c.id === catId) || INCOME_CATEGORIES.some((c) => c.id === catId);
}

function parseDateInput(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  const now = new Date();
  if (!m) return now.getTime();
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), now.getHours(), now.getMinutes(), 0, 0);
  return d.getTime();
}
