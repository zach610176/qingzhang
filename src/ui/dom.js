/**
 * 轻账 · 界面基础零件
 * 弹层、提示条、DOM 小工具。所有中文内容都在这里集中处理，避免各处拼字符串。
 */

/* ------------------------------------------------------------------ *
 * DOM 小工具
 * ------------------------------------------------------------------ */

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/** 转义 HTML。账单里的商户名可能带 < > & "，不转义会破坏页面结构。 */
export function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  if (html) node.innerHTML = html;
  return node;
}

/** 事件委托：在容器上挂一次，处理所有后代点击 */
export function delegate(root, selector, handler) {
  root.addEventListener('click', (ev) => {
    const target = ev.target.closest(selector);
    if (!target || !root.contains(target)) return;
    handler(ev, target);
  });
}

/* ------------------------------------------------------------------ *
 * Toast 提示
 * ------------------------------------------------------------------ */

const toastRoot = () => document.getElementById('toast-root');

export function toast(msg, kind = '', ms = 2400) {
  const root = toastRoot();
  if (!root) return;
  const node = document.createElement('div');
  node.className = 'toast' + (kind ? ' ' + kind : '');
  node.textContent = msg;
  root.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .2s';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 220);
  }, ms);
}

export const toastOk = (m, ms) => toast(m, 'ok', ms);
export const toastErr = (m, ms) => toast(m, 'err', ms ?? 3200);
export const toastWarn = (m, ms) => toast(m, 'warn', ms ?? 3000);

/* ------------------------------------------------------------------ *
 * 弹层（从底部升起的面板）
 * ------------------------------------------------------------------ */

let openSheets = 0;

/**
 * 打开一个底部弹层。
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.leftLabel]  左上角按钮文字（默认「取消」）
 * @param {string} [opts.rightLabel] 右上角按钮文字
 * @param {boolean} [opts.rightDisabled]
 * @param {Function} [opts.onLeft]
 * @param {Function} [opts.onRight]
 * @param {Function} [opts.onClose]
 * @param {boolean} [opts.grip]
 * @param {boolean} [opts.lockBackdrop] 点背景不关闭
 * @param {string} [opts.height]  CSS 高度，如 '60vh'
 * @param {Function} [opts.render] (bodyEl, api) => void
 * @returns {{body:HTMLElement, close:Function, setRightDisabled:Function, setTitle:Function}}
 */
export function openSheet(opts = {}) {
  const {
    title = '',
    leftLabel = '取消',
    rightLabel = '',
    rightDisabled = false,
    onLeft,
    onRight,
    onClose,
    grip = true,
    lockBackdrop = false,
    height,
    render,
  } = opts;

  const root = document.getElementById('sheet-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'sheet';

  const head = document.createElement('div');
  head.className = 'sheet-head';

  const left = document.createElement('button');
  left.type = 'button';
  left.textContent = leftLabel;

  const titleEl = document.createElement('span');
  titleEl.className = 't';
  titleEl.textContent = title;

  const right = document.createElement('button');
  right.type = 'button';
  right.className = 'strong';
  right.textContent = rightLabel || '';
  right.disabled = rightDisabled;
  if (!rightLabel) right.style.visibility = 'hidden';

  head.append(left, titleEl, right);

  const body = document.createElement('div');
  body.className = 'sheet-body';

  if (grip) {
    const g = document.createElement('div');
    g.className = 'sheet-grip';
    sheet.appendChild(g);
  }
  sheet.appendChild(head);
  sheet.appendChild(body);
  if (height) body.style.maxHeight = height;

  root.append(backdrop, sheet);
  document.body.style.overflow = 'hidden';
  openSheets++;

  let closed = false;
  let rightHandler = onRight;
  right.addEventListener('click', () => {
    if (right.disabled || !rightHandler) return;
    rightHandler(api);
  });

  const api = {
    body,
    close,
    setRightDisabled(v) { right.disabled = !!v; },
    setTitle(t) { titleEl.textContent = t; },
    setRightLabel(t) { right.textContent = t; right.style.visibility = t ? 'visible' : 'hidden'; },
    /** 换掉右上角按钮的行为（例如「开始解析」完成后变成「确认导入」） */
    setRightHandler(fn) { rightHandler = fn; },
    root: sheet,
  };

  function close(result) {
    if (closed) return;
    closed = true;
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    openSheets = Math.max(0, openSheets - 1);
    if (openSheets === 0) document.body.style.overflow = '';
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 320);
    if (onClose) onClose(result);
  }

  left.addEventListener('click', () => {
    if (onLeft) onLeft(api);
    else close();
  });
  if (!lockBackdrop) {
    backdrop.addEventListener('click', () => {
      if (onLeft) onLeft(api);
      else close();
    });
  }

  if (render) render(body, api);

  // 触发进场动画
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.classList.add('show');
  });

  return api;
}

/** 确认对话框 */
export function confirmSheet({ title, message, confirmLabel = '确定', cancelLabel = '取消', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      leftLabel: cancelLabel,
      rightLabel: confirmLabel,
      onLeft: (api) => { answered = true; api.close(); resolve(false); },
      onRight: (api) => { answered = true; api.close(); resolve(true); },
      onClose: () => { if (!answered) resolve(false); },
      render: (body) => {
        body.innerHTML = `<div class="card" style="margin:0 16px 16px"><div class="card-pad pre" style="font-size:15px;color:var(--label-2)">${esc(message)}</div></div>`;
        const row = document.createElement('div');
        row.className = 'btn-row';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (danger ? 'danger' : 'primary');
        btn.textContent = confirmLabel;
        btn.addEventListener('click', () => {
          answered = true;
          document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
          resolve(true);
        });
        row.appendChild(btn);
        body.appendChild(row);
      },
    });
  });
}

/** 输入对话框（用于预算金额、密码等） */
export function promptSheet({ title, message, value = '', placeholder = '', confirmLabel = '确定', inputType = 'text', hint = '' }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      rightLabel: confirmLabel,
      onLeft: (api) => { answered = true; api.close(); resolve(null); },
      onRight: (api) => {
        const v = body.querySelector('input')?.value ?? '';
        answered = true;
        api.close();
        resolve(v);
      },
      onClose: () => { if (!answered) resolve(null); },
      render: (body) => {
        body.innerHTML = `
          ${message ? `<div class="px16 mb16 small muted pre">${esc(message)}</div>` : ''}
          <div class="card" style="margin:0 16px 16px">
            <div class="field">
              <input type="${esc(inputType)}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false">
              ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
            </div>
          </div>`;
        const input = body.querySelector('input');
        setTimeout(() => input && input.focus(), 320);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            answered = true;
            const v = input.value;
            resolve(v);
            document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
            document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
          }
        });
      },
    });
  });
}

/* ------------------------------------------------------------------ *
 * 月份选择
 * ------------------------------------------------------------------ */

export function monthLabelShort(monthKey) {
  const [y, m] = monthKey.split('-');
  const now = new Date();
  if (Number(y) === now.getFullYear()) return `${Number(m)}月`;
  return `${y}年${Number(m)}月`;
}

export function pickMonth(months, current, onPick) {
  let year = Number((current || months[0] || '2026-01').split('-')[0]);

  openSheet({
    title: '选择月份',
    leftLabel: '关闭',
    render: (body, api) => {
      function draw() {
        const years = [...new Set(months.map((m) => Number(m.split('-')[0])))].sort((a, b) => b - a);
        if (!years.includes(year)) year = years[0];

        const ofYear = months.filter((m) => Number(m.split('-')[0]) === year);

        body.innerHTML = `
          <div class="seg" style="margin:8px 16px 12px">
            ${years.map((y) => `<button type="button" data-year="${y}" class="${y === year ? 'active' : ''}">${y}</button>`).join('')}
          </div>
          <div class="month-grid">
            ${ofYear.map((m) => {
              const mm = Number(m.split('-')[1]);
              const has = true;
              return `<button type="button" data-month="${esc(m)}" class="${m === current ? 'active' : ''}">${mm}月</button>`;
            }).join('')}
          </div>
        `;
      }

      draw();

      body.addEventListener('click', (ev) => {
        const yBtn = ev.target.closest('[data-year]');
        if (yBtn) { year = Number(yBtn.dataset.year); draw(); return; }
        const mBtn = ev.target.closest('[data-month]');
        if (mBtn) {
          api.close();
          onPick(mBtn.dataset.month);
        }
      });
    },
  });
}

/* ------------------------------------------------------------------ *
 * 金额格式化（界面统一入口）
 * ------------------------------------------------------------------ */

export function fmtMoney(cents, opts) {
  const { sign = false, compact = false, decimals = 2 } = opts || {};
  const v = Math.round(cents) / 100;
  const abs = Math.abs(v);
  let body;
  if (compact && abs >= 1000000) body = (abs / 10000).toFixed(0) + '万';
  else if (compact && abs >= 10000) body = (abs / 10000).toFixed(abs >= 100000 ? 0 : 1) + '万';
  else body = abs.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const neg = v < 0;
  const head = sign ? (neg ? '-¥' : '+¥') : (neg ? '-¥' : '¥');
  return head + body;
}

export function fmtSigned(cents) {
  return fmtMoney(cents, { sign: true });
}

/** 相对时间：今天 / 昨天 / 3天前 / 2026-01-05 */
export function fmtDayLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  if (diff > 2 && diff < 7) return `${diff}天前`;
  const p = (n) => String(n).padStart(2, '0');
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
}

export function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
