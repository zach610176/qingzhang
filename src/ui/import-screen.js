/**
 * 轻账 · 导入界面
 *
 * 流程：选文件 → 输密码（如果是加密 zip）→ 看预览 → 确认导入
 * 预览这一步很重要：让你在写库之前看到「识别到多少笔、跳过多少笔、重复多少笔」。
 */

import { openSheet, toastOk, toastErr, toastWarn, esc, fmtMoney, fmtDate, fmtFileSize, confirmSheet } from './dom.js';
import { runImport, commitImport, undoBatch, summarizeImport } from '../core/import.js';
import { category as getCategory, txType } from '../core/model.js';
import * as store from './store.js';

let lastPreview = null;

/** 打开导入面板 */
export function openImportSheet(opts = {}) {
  const st = {
    files: [],
    password: '',
    source: 'auto',
    busy: false,
    preview: null,
    error: '',
    pasted: '',
    mode: 'file',   // 'file' | 'paste'
  };

  openSheet({
    title: '导入账单',
    leftLabel: '关闭',
    rightLabel: '开始解析',
    lockBackdrop: true,
    height: '80vh',
    onRight: (api) => doParse(api),
    render: (body, sheetApi) => {
      const api = sheetApi;
      body.innerHTML = `
        <div class="seg" id="imp-mode" style="margin:8px 16px 14px">
          <button type="button" data-mode="file" class="active">选文件</button>
          <button type="button" data-mode="paste">粘贴文本</button>
        </div>

        <div id="imp-file-pane">
          <div class="drop-zone" id="imp-drop">
            <div class="big">📄</div>
            <div class="t">把账单文件拖到这里</div>
            <div class="s">支持 .csv / .txt / .zip<br>微信和支付宝都能识别</div>
            <div style="margin-top:12px"><button type="button" class="btn primary" id="imp-pick" style="max-width:200px;margin:0 auto">选择文件</button></div>
          </div>
        </div>

        <div id="imp-paste-pane" hidden>
          <div class="px16 mb16 small muted">从微信或支付宝的账单页面复制文字，粘贴到这里（也可以直接在电脑上把 CSV 内容复制过来）。</div>
          <div class="card" style="margin:0 16px 16px">
            <div class="field">
              <textarea id="imp-paste" rows="8" placeholder="粘贴账单内容…" style="resize:none;font-size:14px"></textarea>
            </div>
          </div>
        </div>

        <div class="px16 mb16" id="imp-opts">
          <div class="card" style="margin:0 0 16px">
            <div class="field inline">
              <label for="imp-source">账单来源</label>
              <select id="imp-source" style="width:auto;flex:0 0 auto;text-align:right;direction:rtl">
                <option value="auto">自动识别</option>
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
              </select>
            </div>
            <div class="field">
              <label for="imp-pwd">解压密码（只有加密 ZIP 需要填）</label>
              <input id="imp-pwd" type="text" placeholder="留空表示没有密码" autocomplete="off" autocapitalize="off" spellcheck="false">
              <div class="hint">微信发到邮箱的账单压缩包，密码通常是你身份证号后 6 位；如果身份证以 X 结尾，请大写。</div>
            </div>
          </div>
        </div>

        <div id="imp-files"></div>
        <div id="imp-result"></div>
      `;

      const filePane = body.querySelector('#imp-file-pane');
      const pastePane = body.querySelector('#imp-paste-pane');
      const dropEl = body.querySelector('#imp-drop');
      const filesEl = body.querySelector('#imp-files');
      const resultEl = body.querySelector('#imp-result');
      const pwdEl = body.querySelector('#imp-pwd');
      const srcEl = body.querySelector('#imp-source');
      const pasteEl = body.querySelector('#imp-paste');

      /* ---- 模式切换 ---- */
      body.querySelector('#imp-mode').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-mode]');
        if (!b) return;
        st.mode = b.dataset.mode;
        for (const x of body.querySelectorAll('#imp-mode button')) x.classList.toggle('active', x === b);
        filePane.hidden = st.mode !== 'file';
        pastePane.hidden = st.mode !== 'paste';
        api.setRightLabel(st.mode === 'file' ? '开始解析' : '解析内容');
      });

      /* ---- 选择文件 ---- */
      body.querySelector('#imp-pick').addEventListener('click', () => pickFiles(addFiles));

      // 拖拽（电脑上方便）
      ['dragenter', 'dragover'].forEach((t) => dropEl.addEventListener(t, (e) => {
        e.preventDefault(); dropEl.classList.add('over');
      }));
      ['dragleave', 'drop'].forEach((t) => dropEl.addEventListener(t, (e) => {
        e.preventDefault(); dropEl.classList.remove('over');
      }));
      dropEl.addEventListener('drop', (e) => {
        const fs = e.dataTransfer && e.dataTransfer.files;
        if (fs && fs.length) addFiles(Array.from(fs));
      });

      pwdEl.addEventListener('input', () => { st.password = pwdEl.value; });
      srcEl.addEventListener('change', () => { st.source = srcEl.value; });
      pasteEl.addEventListener('input', () => { st.pasted = pasteEl.value; });

      /* ---- 文件列表 ---- */
      function addFiles(files) {
        for (const f of files) {
          if (!st.files.some((x) => x.name === f.name && x.size === f.size)) st.files.push(f);
        }
        st.error = '';
        renderFiles();
      }

      function renderFiles() {
        if (!st.files.length) { filesEl.innerHTML = ''; return; }
        filesEl.innerHTML = `
          <div class="section-title between">
            <span>已选择 ${st.files.length} 个文件</span>
            <button type="button" class="link" id="imp-clear">清空</button>
          </div>
          <div class="card" style="margin:0 16px 16px">
            ${st.files.map((f, i) => `
              <div class="import-file">
                <div class="n">${esc(f.name)}</div>
                <div class="m">${fmtFileSize(f.size)}</div>
              </div>`).join('')}
          </div>`;
        const clearBtn = filesEl.querySelector('#imp-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => { st.files = []; renderFiles(); });
      }
      renderFiles();

      /* ---- 解析 ---- */
      async function doParse(a) {
        if (st.busy) return;
        if (st.mode === 'file' && !st.files.length) { toastWarn('请先选择账单文件'); return; }
        if (st.mode === 'paste' && !st.pasted.trim()) { toastWarn('请先粘贴账单内容'); return; }

        st.busy = true;
        a.setRightDisabled(true);
        resultEl.innerHTML = '<div class="spin"></div><div class="center small muted">正在解析账单…</div>';

        try {
          const preview = await runImport(st.mode === 'file' ? st.files : [], {
            password: st.password,
            source: st.source,
            pastedText: st.mode === 'paste' ? st.pasted : '',
          });
          st.preview = preview;
          lastPreview = preview;
          renderResult(preview, a);
        } catch (e) {
          const msg = e && e.message ? e.message : String(e);
          resultEl.innerHTML = `<div class="alert danger"><span class="ico">⚠️</span><div><div class="t">解析失败</div><div class="d pre">${esc(msg)}</div></div></div>`;
          toastErr('解析失败');
        } finally {
          st.busy = false;
          a.setRightDisabled(false);
        }
      }

      /* ---- 预览结果 ---- */
      function renderResult(pv, a) {
        const hasTx = pv.keep.length > 0;
        const range = pv.dateRange
          ? `${fmtDate(pv.dateRange.from)} 至 ${fmtDate(pv.dateRange.to)}`
          : '—';

        const typeRows = Object.entries(pv.byType || {})
          .map(([t, n]) => `${txType(t).name} ${n}`)
          .join(' · ');

        let html = '';

        if (!hasTx && !pv.duplicates.length) {
          html += `<div class="alert danger"><span class="ico">😕</span><div>
            <div class="t">没有解析出交易</div>
            <div class="d">可能的原因：不是账单文件、格式特殊、或者密码不对。<br>下面有详细信息。</div>
          </div></div>`;
        } else {
          html += `<div class="alert info"><span class="ico">📊</span><div>
            <div class="t">识别到 ${pv.totalParsed} 笔交易，将导入 ${pv.keep.length} 笔</div>
            <div class="d">${esc(summarizeImport(pv))}<br>时间范围：${esc(range)}${typeRows ? '<br>构成：' + esc(typeRows) : ''}</div>
          </div></div>`;
        }

        // 每个文件的解析情况
        html += `<div class="section-title">文件明细</div><div class="card" style="margin:0 16px 16px">`;
        for (const f of pv.perFile) {
          if (f.error) {
            html += `<div class="import-file"><div class="n">${esc(f.name)}</div><div class="m err">解析出错：${esc(f.error)}</div></div>`;
          } else {
            html += `<div class="import-file">
              <div class="n">${esc(f.name)}</div>
              <div class="m">
                ${f.count} 笔交易${f.encoding ? ' · 编码 ' + esc(f.encoding) : ''}${f.zipFiles ? ' · 包内文件 ' + esc(f.zipFiles.join('、')) : ''}
                ${f.skipped && f.skipped.total ? '<br>忽略 ' + f.skipped.total + ' 行' : ''}
              </div>
            </div>`;
          }
        }
        html += `</div>`;

        // 警告
        if (pv.warnings && pv.warnings.length) {
          html += `<div class="alert warn"><span class="ico">💡</span><div><div class="t">注意</div><div class="d pre">${esc(pv.warnings.join('\n'))}</div></div></div>`;
        }

        // 重复
        if (pv.duplicates.length) {
          html += `<div class="alert warn"><span class="ico">🔁</span><div>
            <div class="t">${pv.duplicates.length} 笔已判为重复</div>
            <div class="d">这些交易之前已经导入过（或文件内部重复），会标记但不会重复计入统计。</div>
          </div></div>`;
        }

        // 预览几笔
        if (hasTx) {
          html += `<div class="section-title">前 8 笔预览</div><div class="card" style="margin:0 16px 16px">`;
          for (const t of pv.keep.slice(0, 8)) {
            const c = getCategory(t.category);
            const tt = txType(t.type);
            html += `<div class="row">
              <span class="row-icon">${c.icon}</span>
              <span class="row-main">
                <span class="row-title">${esc(t.merchant || '未知商户')}</span>
                <span class="row-sub">${esc(fmtDate(t.ts))} · ${esc(c.name)} · ${esc(tt.name)}</span>
              </span>
              <span class="row-value ${tt.direction === 'in' ? 'in' : ''}">${tt.direction === 'in' ? '+' : '-'}${esc(fmtMoney(t.amountCents).slice(1))}</span>
            </div>`;
          }
          html += `</div>`;
        }

        resultEl.innerHTML = html;

        // 把右上角按钮换成「确认导入」
        api.setRightLabel('确认导入');
        api.setRightDisabled(!hasTx);
        api.setRightHandler(() => doCommit(pv, api));
      }

      async function doCommit(pv, a) {
        a.setRightDisabled(true);
        resultEl.innerHTML = '<div class="spin"></div><div class="center small muted">正在写入…</div>';
        try {
          const r = await commitImport(pv, { includeDuplicates: true });
          await store.reloadAll();
          if (opts.onDone) opts.onDone(r);
          a.close();
          toastOk(`导入完成：新增 ${r.imported} 笔`, 3000);
          if (pv.duplicates.length) {
            setTimeout(() => toast(`另有 ${pv.duplicates.length} 笔标记为重复，未计入统计`, '', 3600), 900);
          }
        } catch (e) {
          toastErr('写入失败：' + (e && e.message ? e.message : e));
          resultEl.innerHTML = `<div class="alert danger"><span class="ico">⚠️</span><div><div class="t">写入失败</div><div class="d">${esc(String(e && e.message || e))}</div></div></div>`;
          a.setRightDisabled(false);
        }
      }

      // 供外部调用
      api.addFiles = addFiles;
    },
  });
}

/* ------------------------------------------------------------------ *
 * 调用系统文件选择器
 * ------------------------------------------------------------------ */

let filePickCallback = null;

export function initFilePicker() {
  const input = document.getElementById('file-input');
  if (!input) return;
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (filePickCallback && files.length) filePickCallback(files);
  });
}

export function pickFiles(cb) {
  const input = document.getElementById('file-input');
  if (!input) { toastErr('当前环境不支持选择文件'); return; }
  filePickCallback = cb;
  input.click();
}

/* ------------------------------------------------------------------ *
 * 撤销导入
 * ------------------------------------------------------------------ */

export function openBatchListSheet() {
  openSheet({
    title: '导入记录',
    leftLabel: '关闭',
    render: (body) => {
      const batches = store.state.batches;
      if (!batches.length) {
        body.innerHTML = `<div class="empty"><div class="big">📥</div><div class="title">还没有导入过账单</div><div class="sub">从微信或支付宝导出账单后，在「我的 → 导入账单」里添加。</div></div>`;
        return;
      }
      body.innerHTML = `
        <div class="px16 mb16 small muted">删掉一次导入，会把那次导入的交易一起移除。手动记的账不受影响。</div>
        <div class="card" style="margin:0 16px 16px">
          ${batches.map((b) => `
            <div class="row tappable" data-batch="${esc(b.id)}">
              <span class="row-icon">📄</span>
              <span class="row-main">
                <span class="row-title">${esc((b.files || []).join('、') || '导入')}</span>
                <span class="row-sub">${esc(fmtDate(b.createdAt))} · 新增 ${b.importedCount} 笔${b.duplicateCount ? ' · 重复 ' + b.duplicateCount + ' 笔' : ''}</span>
              </span>
              <span class="row-chev">${chevSvg()}</span>
            </div>`).join('')}
        </div>`;
      body.addEventListener('click', async (ev) => {
        const row = ev.target.closest('[data-batch]');
        if (!row) return;
        const id = row.dataset.batch;
        const ok = await confirmSheet({
          title: '撤销这次导入？',
          message: '这次导入的交易会从轻账里删除，无法恢复（除非你有备份）。',
          confirmLabel: '删除',
          danger: true,
        });
        if (!ok) return;
        const n = await store.removeBatch(id);
        toastOk(`已删除 ${n} 笔交易`);
        openBatchListSheet();
      });
    },
  });
}

function chevSvg() {
  return '<svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg>';
}
