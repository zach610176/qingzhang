/**
 * 轻账 · 分类管理界面
 *
 * 两个弹层：
 *   openCategoryManager()  —— 分类清单（看、加、改、删、恢复默认）
 *   openCategoryEditor()   —— 新建/编辑单个分类（名字、图标、颜色）
 */

import {
  CATEGORIES, INCOME_CATEGORIES,
  CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES,
} from '../core/model.js';
import {
  addCategory, updateCategory, deleteCategory, resetCategories,
  countTxInCategory, listAll, listCustom,
} from '../core/categories.js';
import { openSheet, toastOk, toastErr, confirmSheet, esc } from './dom.js';
import * as store from './store.js';

/**
 * 安全地给元素挂事件。
 *
 * 为什么需要它：真实浏览器在 `el.innerHTML = '<div id="x">'` 之后
 * 立刻就能 querySelector('#x')（HTML 解析是同步的），所以直接查询通常没问题。
 * 但如果哪天结构改名了，直接 `体.querySelector('#x').addEventListener` 会抛出
 * 「Cannot read properties of null」这种毫无线索的错误。
 * 这里统一报出「哪个选择器没找到」，排查快得多。
 */
function bind(root, selector, event, handler) {
  const el = root.querySelector(selector);
  if (!el) {
    console.error(`[轻账] 界面上找不到 ${selector}，事件未绑定`);
    return null;
  }
  el.addEventListener(event, handler);
  return el;
}

/* ------------------------------------------------------------------ *
 * 分类清单
 * ------------------------------------------------------------------ */

export function openCategoryManager() {
  let lane = 'expense';

  openSheet({
    title: '分类管理',
    leftLabel: '关闭',
    rightLabel: '新建',
    height: '78vh',
    onRight: (api) => openCategoryEditor({ lane, onDone: () => api.close() && openCategoryManager() }),
    render: (body, api) => {
      // 让「新建」按钮跟着当前这一侧走
      api.setRightHandler(() => openCategoryEditor({
        lane,
        onDone: () => { api.close(); openCategoryManager(); },
      }));

      function draw() {
        const all = listAll(lane);
        const customCount = all.filter((c) => !c.builtin).length;

        body.innerHTML = `
          <div class="seg" id="cm-lane" style="margin:8px 16px 14px">
            <button type="button" data-lane="expense" class="${lane === 'expense' ? 'active' : ''}">支出分类</button>
            <button type="button" data-lane="income" class="${lane === 'income' ? 'active' : ''}">收入分类</button>
          </div>

          <div class="px16 mb16 small muted">
            ${lane === 'expense'
              ? '支出分类用在「消费比例」里。'
              : '收入分类只用来给收入归类，不参与消费比例。'}
            内置的 ${all.length - customCount} 个不能改名或删除，但你自己的可以随便改。
          </div>

          <div class="section-title">${lane === 'expense' ? '支出' : '收入'}分类（${all.length}）</div>
          <div class="card" style="margin:0 16px 16px">
            ${all.map((c) => `
              <div class="row ${c.builtin ? '' : 'tappable'}" ${c.builtin ? '' : `data-edit="${esc(c.id)}"`}>
                <span class="row-icon" ${c.color ? `style="background:${esc(c.color)}22"` : ''}>${c.icon}</span>
                <span class="row-main">
                  <span class="row-title">${esc(c.name)}</span>
                  <span class="row-sub">${c.builtin ? '内置分类' : '自定义'}${c.id === (lane === 'expense' ? 'other' : 'other_in') ? ' · 兜底用' : ''}</span>
                </span>
                ${c.builtin
                  ? '<span class="row-value muted small">内置</span>'
                  : `<span class="row-chev">${chevSvg()}</span>`}
              </div>`).join('')}
          </div>

          ${customCount ? `
            <div class="btn-row">
              <button type="button" class="btn" id="cm-reset">删除全部自定义分类</button>
            </div>` : ''}

          <div class="px16 tiny muted" style="padding-bottom:20px">
            删除一个分类时，原来用它记的账会自动改到「${lane === 'expense' ? '其他' : '其他收入'}」，
            轻账会告诉你影响了几笔。
          </div>
        `;

        bind(body, '#cm-lane', 'click', (ev) => {
          const b = ev.target.closest('[data-lane]');
          if (!b) return;
          lane = b.dataset.lane;
          draw();
        });

        body.querySelectorAll('[data-edit]').forEach((row) => {
          row.addEventListener('click', () => {
            const cat = all.find((c) => c.id === row.dataset.edit);
            if (cat) openCategoryEditor({ cat, lane, onDone: () => { api.close(); openCategoryManager(); } });
          });
        });

        const resetBtn = body.querySelector('#cm-reset');
        if (resetBtn) {
          resetBtn.addEventListener('click', async () => {
            const n = listCustom(lane).length;
            const ok = await confirmSheet({
              title: `删除全部 ${n} 个自定义分类？`,
              message: `用它们记的账会改到「${lane === 'expense' ? '其他' : '其他收入'}」。\n内置分类不受影响。`,
              confirmLabel: '删除',
              danger: true,
            });
            if (!ok) return;
            try {
              const r = await resetCategories(lane);
              await store.reloadAll();
              toastOk(`已删除 ${r.removed} 个分类，${r.movedTx} 笔交易改到了「其他」`);
              draw();
            } catch (e) {
              toastErr('操作失败：' + (e && e.message ? e.message : e));
            }
          });
        }
      }

      draw();
    },
  });
}

/* ------------------------------------------------------------------ *
 * 新建 / 编辑单个分类
 * ------------------------------------------------------------------ */

export function openCategoryEditor(opts = {}) {
  const editing = opts.cat || null;
  let lane = opts.lane || 'expense';
  const isNew = !editing;

  const st = {
    name: editing ? editing.name : '',
    icon: editing ? editing.icon : '🏷️',
    color: editing ? (editing.color || '#8E8E93') : '#8E8E93',
  };

  openSheet({
    title: isNew ? '新建分类' : '编辑分类',
    leftLabel: '取消',
    rightLabel: isNew ? '创建' : '保存',
    height: '80vh',
    onRight: async (api) => { await save(api); },
    render: (body, api) => {
      body.innerHTML = `
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>分类名称（最多 12 个字）</label>
            <input type="text" id="ce-name" value="${esc(st.name)}" placeholder="例如：养猫、实验室、护肤" autocomplete="off" maxlength="12">
          </div>
          ${isNew ? `
          <div class="field inline">
            <label>算在哪一侧</label>
            <select id="ce-lane" style="width:auto;flex:0 0 auto;direction:rtl">
              <option value="expense" ${lane === 'expense' ? 'selected' : ''}>支出</option>
              <option value="income" ${lane === 'income' ? 'selected' : ''}>收入</option>
            </select>
          </div>` : ''}
        </div>

        <div class="section-title">选个图标</div>
        <div class="icon-grid" id="ce-icons">
          ${CATEGORY_ICON_CHOICES.map((e) => `
            <button type="button" data-icon="${esc(e)}" class="${e === st.icon ? 'active' : ''}">${e}</button>`).join('')}
        </div>

        <div class="section-title">选个颜色</div>
        <div class="color-grid" id="ce-colors">
          ${CATEGORY_COLOR_CHOICES.map((c) => `
            <button type="button" data-color="${esc(c)}" style="background:${esc(c)}" class="${c === st.color ? 'active' : ''}" aria-label="${esc(c)}"></button>`).join('')}
        </div>

        <div class="section-title">预览</div>
        <div class="card" style="margin:0 16px 16px">
          <div class="row">
            <span class="row-icon" id="ce-preview-bg" style="background:${esc(st.color)}22">
              <span id="ce-preview-icon">${st.icon}</span>
            </span>
            <span class="row-main">
              <span class="row-title" id="ce-preview-name">${esc(st.name || '分类名称')}</span>
              <span class="row-sub">在明细和占比里会这样显示</span>
            </span>
          </div>
        </div>

        ${!isNew ? `
        <div class="px16 mb16" id="ce-usage"></div>
        <div class="btn-row">
          <button type="button" class="btn danger" id="ce-del">删除这个分类</button>
        </div>` : ''}
      `;

      const nameEl = body.querySelector('#ce-name');
      const iconsEl = body.querySelector('#ce-icons');
      const colorsEl = body.querySelector('#ce-colors');

      function renderPreview() {
        const n = body.querySelector('#ce-preview-name');
        const i = body.querySelector('#ce-preview-icon');
        const bg = body.querySelector('#ce-preview-bg');
        if (n) n.textContent = st.name || '分类名称';
        if (i) i.textContent = st.icon;
        if (bg) bg.style.background = st.color + '22';
        if (iconsEl) {
          for (const b of iconsEl.querySelectorAll('button')) {
            b.classList.toggle('active', b.dataset.icon === st.icon);
          }
        }
        if (colorsEl) {
          for (const b of colorsEl.querySelectorAll('button')) {
            b.classList.toggle('active', b.dataset.color === st.color);
          }
        }
      }

      if (nameEl) nameEl.addEventListener('input', () => { st.name = nameEl.value; renderPreview(); });
      if (iconsEl) {
        iconsEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-icon]');
          if (!b) return;
          st.icon = b.dataset.icon;
          renderPreview();
        });
      }
      if (colorsEl) {
        colorsEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-color]');
          if (!b) return;
          st.color = b.dataset.color;
          renderPreview();
        });
      }

      const laneEl = body.querySelector('#ce-lane');
      if (laneEl) laneEl.addEventListener('change', () => { lane = laneEl.value; });

      // 编辑模式：显示用了多少笔，并提供删除
      if (!isNew) {
        countTxInCategory(editing.id).then((n) => {
          const box = body.querySelector('#ce-usage');
          if (box) {
            box.innerHTML = `<div class="alert info" style="margin:0">
              <span class="ico">📊</span>
              <div><div class="t">已经用了 ${n} 笔</div>
              <div class="d">${n ? '删除这个分类后，这些交易会改到「' + (lane === 'expense' ? '其他' : '其他收入') + '」。' : '还没有交易用这个分类。'}</div></div>
            </div>`;
          }
        }).catch(() => {});

        bind(body, '#ce-del', 'click', async () => {
          const n = await countTxInCategory(editing.id).catch(() => 0);
          const ok = await confirmSheet({
            title: `删除分类「${editing.name}」？`,
            message: n
              ? `有 ${n} 笔交易用着这个分类，删除后它们会改到「${lane === 'expense' ? '其他' : '其他收入'}」。\n指向这个分类的分类规则也会一起删掉。`
              : '目前没有交易用这个分类。',
            confirmLabel: '删除',
            danger: true,
          });
          if (!ok) return;
          try {
            const r = await deleteCategory(editing.id, lane);
            await store.reloadAll();
            toastOk(r.movedTx ? `已删除，${r.movedTx} 笔改到了「其他」` : '已删除');
            api.close();
            if (opts.onDone) opts.onDone();
          } catch (e) {
            toastErr('删除失败：' + (e && e.message ? e.message : e));
          }
        });
      }

      // 自动聚焦到名字输入框（延时是为了等弹层升起动画）
      // 必须判空：假 DOM 或结构变动时 nameEl 可能是 null，
      // 直接在 setTimeout 里调用 .focus() 会抛出无法定位的 TypeError。
      setTimeout(() => {
        if (isNew && nameEl && typeof nameEl.focus === 'function') nameEl.focus();
      }, 320);
    },
  });

  async function save(api) {
    const name = st.name.trim();
    if (!name) { toastErr('请填分类名称'); return; }
    try {
      if (isNew) {
        const cat = await addCategory({ name, icon: st.icon, color: st.color, lane });
        await store.reloadAll();
        toastOk(`已创建「${cat.name}」`);
      } else {
        await updateCategory(editing.id, { name, icon: st.icon, color: st.color }, lane);
        await store.reloadAll();
        toastOk('已保存');
      }
      api.close();
      if (opts.onDone) opts.onDone();
    } catch (e) {
      toastErr(e && e.message ? e.message : '保存失败');
    }
  }
}

function chevSvg() {
  return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
