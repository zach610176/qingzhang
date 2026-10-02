/**
 * 轻账 · 设置页（「我的」）
 */

import { CATEGORIES, INCOME_CATEGORIES, category as getCategory, txType } from '../core/model.js';
import { FREQUENCIES, yearlyRecurringTotal } from '../core/recurring.js';
import { esc, fmtMoney, fmtDate, fmtFileSize, openSheet, toastOk, toastErr, toastWarn, confirmSheet, promptSheet } from './dom.js';
import { encryptBackup, decryptBackup, backupFileName, saveTextFile, BACKUP_EXT } from '../core/crypto.js';
import { openImportSheet, openBatchListSheet, pickFiles } from './import-screen.js';
import * as store from './store.js';
import * as db from '../core/db.js';

export function renderSettings(root) {
  const st = store.state;
  const months = new Set(st.txs.map((t) => {
    const d = new Date(t.ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }));
  const firstTs = st.txs.length ? Math.min(...st.txs.map((t) => t.ts)) : null;
  const lastTs = st.txs.length ? Math.max(...st.txs.map((t) => t.ts)) : null;

  const storagePct = st.storage.quota ? (st.storage.usage / st.storage.quota) * 100 : 0;

  root.innerHTML = `
    <div class="section-title">账单</div>
    <div class="card" style="margin:0 16px 16px">
      ${row('📄', '导入账单', '微信 / 支付宝的 CSV、ZIP', 'import')}
      ${row('🗂️', '导入记录与撤销', `${st.batches.length} 次导入`, 'batches')}
      ${row('🔁', '周期账单', st.recurring.length ? `${st.recurring.length} 项 · 每年约 ${fmtMoney(yearlyRecurringTotal(st.recurring), { decimals: 0, compact: true })}` : '订阅、房租这类固定支出', 'recurring')}
      ${row('➕', '手动记一笔', '不想导入的时候用', 'quick')}
    </div>

    <div class="section-title">分类</div>
    <div class="card" style="margin:0 16px 16px">
      ${row('🏷️', '分类管理', customCatCount()
        ? `${CATEGORIES.length} 个支出分类（${customCatCount()} 个自定义）`
        : '新建自己的分类，比如「养猫」「实验室」', 'categories')}
      ${row('🧠', '我教过的分类', st.rules.length ? `${st.rules.length} 条规则` : '还没有，改分类时会自动记住', 'rules')}
      ${row('👤', '我的名字 / 昵称', (st.settings.selfNames || []).length ? (st.settings.selfNames || []).join('、') : '用来识别「转给自己」', 'selfnames')}
    </div>

    <div class="section-title">备份</div>
    <div class="card" style="margin:0 16px 16px">
      ${row('🔒', '导出加密备份', '带密码，可存到 iCloud Drive', 'backup')}
      ${row('📥', '从备份恢复', '选择 .qzbak 文件', 'restore')}
      ${row('📤', '导出 CSV', '用 Excel 打开查看（不加密）', 'csv')}
    </div>

    <div class="section-title">数据</div>
    <div class="card" style="margin:0 16px 16px">
      <div class="row">
        <span class="row-icon">📊</span>
        <span class="row-main"><span class="row-title">交易总数</span>
        <span class="row-sub">${months.size} 个月${firstTs ? ' · ' + fmtDate(firstTs) + ' 起' : ''}</span></span>
        <span class="row-value">${st.txs.length} 笔</span>
      </div>
      <div class="row">
        <span class="row-icon">💾</span>
        <span class="row-main"><span class="row-title">占用空间</span>
        <span class="row-sub">${st.storage.persisted ? '已获得持久化存储' : '未获得持久化存储（有被系统清理的风险）'}</span></span>
        <span class="row-value muted">${fmtFileSize(st.storage.usage)}</span>
      </div>
      <div class="row">
        <span class="row-icon">${st.offlineAvailable ? '📶' : '⚠️'}</span>
        <span class="row-main"><span class="row-title">离线可用</span>
        <span class="row-sub">${offlineExplain(st)}</span></span>
        <span class="row-value muted small">${st.offlineAvailable ? '已开启' : '未开启'}</span>
      </div>
      ${row('🧹', '清理重复交易', '按指纹重新判定并删除重复项', 'dedupe')}
      ${row('⚠️', '清空所有数据', '不可恢复，请先导出备份', 'clear')}
    </div>

    <div class="section-title">外观</div>
    <div class="card" style="margin:0 16px 16px">
      <div class="field inline">
        <label>跟着系统切换浅色 / 深色</label>
        <span class="switch"><input type="checkbox" id="set-autotheme" ${st.settings.theme ? '' : 'checked'}><i></i></span>
      </div>
      <div class="field inline">
        <label>深色模式</label>
        <span class="switch"><input type="checkbox" id="set-dark" ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}><i></i></span>
      </div>
    </div>

    <div class="section-title">关于</div>
    <div class="card" style="margin:0 16px 16px">
      <div class="row">
        <span class="row-main"><span class="row-title">轻账</span>
        <span class="row-sub">本地记账 · 数据只在这台手机上</span></span>
        <span class="row-value muted" id="set-version">${esc(st.appVersion || '读取中…')}</span>
      </div>
      <div class="row tappable" data-act="check-update">
        <span class="row-main"><span class="row-title">检查更新</span>
        <span class="row-sub">看看有没有新版本；有新版本会自动刷新</span></span>
        <span class="row-chev"><svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg></span>
      </div>
      <div class="row">
        <span class="row-main"><span class="row-title">数据存放位置</span>
        <span class="row-sub pre">只存在这台手机的浏览器数据库里，不联网、不上传。轻账没有任何服务器。</span></span>
      </div>
      <div class="row">
        <span class="row-main"><span class="row-title">已知限制</span>
        <span class="row-sub pre">无法自动读取微信/支付宝的交易，只能靠导入账单和手动记账。iPhone 上网页应用超过 7 天不打开，系统可能清理本地数据，请定期导出备份。</span></span>
      </div>
    </div>

    <div class="px16 tiny muted center" style="padding-bottom:20px">
      轻账 ${esc(st.appVersion || '')} · 为 iPhone 打造 · 人民币计价
    </div>
  `;

  // 外观开关
  const autoEl = root.querySelector('#set-autotheme');
  const darkEl = root.querySelector('#set-dark');
  if (autoEl) autoEl.addEventListener('change', async () => {
    if (autoEl.checked) {
      document.documentElement.removeAttribute('data-theme');
      await store.setSetting('theme', '');
    } else {
      document.documentElement.dataset.theme = 'dark';
      await store.setSetting('theme', 'dark');
      darkEl.checked = true;
    }
  });
  if (darkEl) darkEl.addEventListener('change', async () => {
    if (autoEl.checked) {
      autoEl.checked = false;
    }
    const dark = darkEl.checked;
    if (dark) document.documentElement.dataset.theme = 'dark';
    else document.documentElement.dataset.theme = 'light';
    await store.setSetting('theme', dark ? 'dark' : 'light');
  });
}

/** 自定义分类数量（内置的不算） */
function customCatCount() {
  return CATEGORIES.filter((c) => !c.builtin).length + INCOME_CATEGORIES.filter((c) => !c.builtin).length;
}

function offlineExplain(st) {  if (st.offlineAvailable === true) return '飞行模式下也能打开和记账';
  if (st.offlineAvailable === false) {
    return '当前地址不是 HTTPS（也不是 localhost），浏览器不允许网页应用做离线缓存。用 https 地址打开就能开启。';
  }
  return '正在检查…（浏览器只在 https 或 localhost 下允许离线缓存）';
}

function row(icon, title, sub, act) {
  return `<div class="row tappable" data-act="${esc(act)}">
    <span class="row-icon">${icon}</span>
    <span class="row-main"><span class="row-title">${esc(title)}</span>${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</span>
    <span class="row-chev"><svg viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5l-5 5"/></svg></span>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * 备份 / 恢复
 * ------------------------------------------------------------------ */

export function openBackupSheet() {
  openSheet({
    title: '导出加密备份',
    leftLabel: '取消',
    rightLabel: '导出',
    onRight: async (api) => {
      const input = api.body.querySelector('#bk-pwd');
      const pwd = input.value;
      if (!pwd || pwd.length < 4) { toastErr('密码至少 4 位'); return; }
      if (api.body.querySelector('#bk-pwd2').value !== pwd) { toastErr('两次输入的密码不一致'); return; }

      api.setRightDisabled(true);
      try {
        const payload = await db.exportAll();
        const text = await encryptBackup(payload, pwd);
        const fname = backupFileName();
        const how = await saveTextFile(fname, text, 'application/octet-stream');
        api.close();
        if (how === 'shared') toastOk('已导出，请在分享面板里选「存储到"文件"」保存到 iCloud Drive', 5000);
        else if (how === 'cancelled') toastWarn('已取消');
        else toastOk('已导出：' + fname, 4000);
      } catch (e) {
        toastErr('导出失败：' + (e && e.message ? e.message : e));
        api.setRightDisabled(false);
      }
    },
    render: (body) => {
      body.innerHTML = `
        <div class="alert info" style="margin-top:4px">
          <span class="ico">🔐</span>
          <div><div class="t">备份会用你设的密码加密</div>
          <div class="d">用的是 AES-256 加密，和银行 App 同一级别的算法。密码丢了就再也打不开备份，轻账也没有办法帮你找回。</div></div>
        </div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>设置备份密码（至少 4 位）</label>
            <input type="text" id="bk-pwd" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例如你的学号后 4 位">
          </div>
          <div class="field">
            <label>再输一次</label>
            <input type="text" id="bk-pwd2" autocomplete="off" autocapitalize="off" spellcheck="false">
          </div>
        </div>
        <div class="px16 mb16 small muted">
          导出后：
          <br>1. iPhone 上会弹出系统分享面板
          <br>2. 选「存储到"文件"」
          <br>3. 存到 iCloud Drive 里，换手机或重装也不怕丢
        </div>`;
    },
  });
}

export function openRestoreSheet() {
  openSheet({
    title: '从备份恢复',
    leftLabel: '取消',
    rightLabel: '选择文件',
    onRight: (api) => {
      pickBackupFile(async (file) => {
        api.close();
        await doRestore(file);
      });
    },
    render: (body) => {
      body.innerHTML = `
        <div class="alert warn" style="margin-top:4px">
          <span class="ico">⚠️</span>
          <div><div class="t">恢复会合并数据</div>
          <div class="d">备份里的交易会加进来，跟现在已有的按 ID 去重，不会删掉你现在记的东西。</div></div>
        </div>
        <div class="px16 mb16 small muted">选择一个 .qzbak 备份文件（可以从 iCloud Drive 或「最近项目」里找）。</div>`;
    },
  });
}

let backupFileCallback = null;

export function initBackupPicker() {
  const input = document.getElementById('backup-input');
  if (!input) return;
  input.addEventListener('change', () => {
    const f = (input.files || [])[0];
    input.value = '';
    if (f && backupFileCallback) backupFileCallback(f);
  });
}

function pickBackupFile(cb) {
  const input = document.getElementById('backup-input');
  if (!input) { toastErr('当前环境不支持选择文件'); return; }
  backupFileCallback = cb;
  input.click();
}

async function doRestore(file) {
  const pwd = await promptSheet({
    title: '输入备份密码',
    message: `即将恢复：${file.name}`,
    inputType: 'text',
    placeholder: '备份时设置的密码',
    confirmLabel: '解密',
  });
  if (pwd == null) return;

  let text;
  try {
    text = await file.text();
  } catch (e) {
    toastErr('读取文件失败');
    return;
  }

  let payload;
  try {
    payload = await decryptBackup(text, pwd);
  } catch (e) {
    toastErr(e && e.message ? e.message : '解密失败', 4000);
    return;
  }

  const counts = payload && payload.counts ? payload.counts : null;
  const summary = counts
    ? `备份里有 ${counts.tx} 笔交易、${counts.rules} 条分类规则。`
    : `备份里有 ${(payload.data && payload.data.tx || []).length} 笔交易。`;

  const ok = await confirmSheet({
    title: '确认恢复？',
    message: summary + '\n\n备份时间：' + (payload.exportedAt ? fmtDate(payload.exportedAt) : '未知'),
    confirmLabel: '恢复',
  });
  if (!ok) return;

  try {
    const r = await db.importAll(payload, 'merge');
    await store.reloadAll();
    toastOk(`恢复完成：新增 ${r.importedTx} 笔${r.skipped ? '，跳过 ' + r.skipped + ' 笔已存在' : ''}`, 4000);
  } catch (e) {
    toastErr('恢复失败：' + (e && e.message ? e.message : e));
  }
}

/* ------------------------------------------------------------------ *
 * 导出 CSV
 * ------------------------------------------------------------------ */

export async function exportCSV() {
  const txs = store.state.txs.slice().sort((a, b) => b.ts - a.ts);
  if (!txs.length) { toastWarn('还没有数据可以导出'); return; }

  const headers = ['时间', '类型', '分类', '商户', '说明', '金额(元)', '收支', '来源', '支付方式', '备注', '是否重复', '不计入统计', '攒钱', '攒钱方向'];
  const lines = [headers.join(',')];
  for (const t of txs) {
    const ty = txType(t.type);
    const c = getCategory(t.category);
    lines.push([
      fmtDate(t.ts) + ' ' + new Date(t.ts).toTimeString().slice(0, 5),
      ty.name,
      c.name,
      t.merchant,
      t.description,
      (t.amountCents / 100).toFixed(2),
      ty.direction === 'in' ? '收入' : '支出',
      t.source,
      t.account,
      t.note,
      t.duplicateOf ? '是' : '',
      t.excluded ? '是' : '',
      // 攒钱列：导出也要完整，否则用 Excel 核对时会对不上 App 里的数字
      t.savings ? '是' : '',
      t.savings ? (t.savingsDirection === 'out' ? '取出' : '存入') : '',
    ].map(csvCell).join(','));
  }

  const text = '\uFEFF' + lines.join('\r\n');
  const stamp = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fname = `轻账明细-${stamp.getFullYear()}${p(stamp.getMonth() + 1)}${p(stamp.getDate())}.csv`;
  const how = await saveTextFile(fname, text, 'text/csv');
  if (how === 'shared') toastOk('已导出，可在分享面板里存到「文件」', 4000);
  else if (how === 'downloaded') toastOk('已导出：' + fname);
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* ------------------------------------------------------------------ *
 * 分类记忆
 * ------------------------------------------------------------------ */

export function openRulesSheet() {
  openSheet({
    title: '我教过的分类',
    leftLabel: '关闭',
    rightLabel: '清空',
    height: '70vh',
    onRight: async (api) => {
      if (!store.state.rules.length) return;
      const ok = await confirmSheet({
        title: '清空所有分类规则？',
        message: '清空后，轻账会忘掉你改过的分类，回到内置的自动判断。已经记好的交易分类不会变。',
        confirmLabel: '清空',
        danger: true,
      });
      if (!ok) return;
      await store.clearRules();
      toastOk('已清空');
      api.close();
    },
    render: (body) => {
      const rules = store.state.rules.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (!rules.length) {
        body.innerHTML = `<div class="empty"><div class="big">🧠</div><div class="title">还没有学到任何规则</div>
          <div class="sub">随便点开一笔交易，改一下它的分类。<br>轻账会记住这个商户，以后自动分对。</div></div>`;
        return;
      }
      body.innerHTML = `
        <div class="px16 mb16 small muted">共 ${rules.length} 条。点右边的分类可以改，点 ✕ 删掉这条。</div>
        <div class="card" style="margin:0 16px 16px">
          ${rules.map((r) => `
            <div class="row">
              <span class="row-main">
                <span class="row-title">${esc(r.merchant || r.key)}</span>
                <span class="row-sub">匹配：${esc(r.key)}</span>
              </span>
              <span class="row-value small">${esc(getCategory(r.category).icon)} ${esc(getCategory(r.category).name)}</span>
              <button type="button" data-del="${esc(r.key)}" style="color:var(--label-3);padding:4px 0 4px 10px;font-size:17px">✕</button>
            </div>`).join('')}
        </div>`;
      body.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-del]');
        if (!b) return;
        await store.removeRule(b.dataset.del);
        toastOk('已删除这条规则');
        b.closest('.row').remove();
      });
    },
  });
}

/* ------------------------------------------------------------------ *
 * 名字设置
 * ------------------------------------------------------------------ */

export function openSelfNamesSheet() {
  const cur = (store.state.settings.selfNames || []).join('、');
  openSheet({
    title: '我的名字 / 昵称',
    rightLabel: '保存',
    onRight: async (api) => {
      const input = api.body.querySelector('#sn');
      const list = input.value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean);
      await store.setSetting('selfNames', list);
      toastOk(list.length ? `已保存 ${list.length} 个名字` : '已清空');
      api.close();
    },
    render: (body) => {
      body.innerHTML = `
        <div class="px16 mb16 small muted pre">填上你自己的名字、微信昵称、支付宝实名。
轻账靠这个识别「转给自己另一张卡」这种内部转账 —— 这类钱没花掉，不应该算进消费。

多个名字用顿号或逗号隔开。</div>
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>名字</label>
            <input type="text" id="sn" value="${esc(cur)}" placeholder="例如：张伟、小伟、伟伟" autocomplete="off">
          </div>
        </div>`;
    },
  });
}

/* ------------------------------------------------------------------ *
 * 周期账单
 * ------------------------------------------------------------------ */

export function openRecurringSheet() {
  openSheet({
    title: '周期账单',
    leftLabel: '关闭',
    rightLabel: '新增',
    height: '72vh',
    onRight: (api) => {
      api.close();
      openRecurringEdit(null);
    },
    render: (body) => {
      const rules = store.state.recurring;
      if (!rules.length) {
        body.innerHTML = `<div class="empty"><div class="big">🔁</div><div class="title">还没有周期账单</div>
          <div class="sub">房租、订阅、话费这类每月固定支出，<br>设置一次以后自动补记，不用手动输。</div></div>`;
        return;
      }
      body.innerHTML = `
        <div class="px16 mb16 small muted">一年合计约 <b>${esc(fmtMoney(yearlyRecurringTotal(rules)))}</b>。开启的账单会在对应日期自动记账。</div>
        <div class="card" style="margin:0 16px 16px">
          ${rules.map((r) => {
            const c = getCategory(r.category);
            const freq = (FREQUENCIES.find((f) => f.id === r.frequency) || {}).name || r.frequency;
            return `<div class="row tappable" data-rid="${esc(r.id)}">
              <span class="row-icon">${c.icon}</span>
              <span class="row-main">
                <span class="row-title">${esc(r.name || '未命名')}</span>
                <span class="row-sub">${esc(freq)} ${r.dayOfMonth} 号 · ${esc(c.name)}${r.enabled === false ? ' · <span class="muted">已暂停</span>' : ''}</span>
              </span>
              <span class="row-value">${esc(fmtMoney(r.amountCents))}</span>
            </div>`;
          }).join('')}
        </div>`;
      body.addEventListener('click', (ev) => {
        const row = ev.target.closest('[data-rid]');
        if (!row) return;
        const rule = store.state.recurring.find((r) => r.id === row.dataset.rid);
        if (rule) openRecurringEdit(rule);
      });
    },
  });
}

export function openRecurringEdit(rule) {
  const isNew = !rule;
  const st = rule
    ? { ...rule }
    : { id: '', name: '', amountCents: 0, category: 'subs', type: 'expense', frequency: 'monthly', dayOfMonth: 1, enabled: true };

  openSheet({
    title: isNew ? '新增周期账单' : '编辑周期账单',
    rightLabel: '保存',
    onRight: async (api) => {
      const name = api.body.querySelector('#rc-name').value.trim();
      const amt = parseFloat(api.body.querySelector('#rc-amt').value);
      const day = parseInt(api.body.querySelector('#rc-day').value, 10);
      if (!name) { toastErr('请填名称'); return; }
      if (!Number.isFinite(amt) || amt <= 0) { toastErr('请填金额'); return; }
      if (!Number.isFinite(day) || day < 1 || day > 31) { toastErr('日期请填 1-31'); return; }

      st.name = name;
      st.amountCents = Math.round(amt * 100);
      st.category = api.body.querySelector('#rc-cat').value;
      st.frequency = api.body.querySelector('#rc-freq').value;
      st.dayOfMonth = day;
      st.enabled = api.body.querySelector('#rc-on').checked;
      st.type = 'expense';

      if (isNew) {
        const { makeRecurring } = await import('../core/recurring.js');
        const r = makeRecurring(st);
        r.startMonth = curMonthKey();
        await store.saveRecurring(r);
        await store.runRecurring();
      } else {
        st.updatedAt = Date.now();
        await store.saveRecurring(st);
      }
      toastOk('已保存');
      api.close();
    },
    render: (body) => {
      body.innerHTML = `
        <div class="card" style="margin:0 16px 16px">
          <div class="field">
            <label>名称</label>
            <input type="text" id="rc-name" value="${esc(st.name)}" placeholder="例如：房租、iCloud、话费" autocomplete="off">
          </div>
          <div class="field">
            <label>金额（元）</label>
            <input type="number" inputmode="decimal" id="rc-amt" value="${st.amountCents ? (st.amountCents / 100).toFixed(2) : ''}" placeholder="0.00">
          </div>
          <div class="field inline">
            <label>分类</label>
            <select id="rc-cat" style="width:auto;flex:0 0 auto;direction:rtl">
              ${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === st.category ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field inline">
            <label>频率</label>
            <select id="rc-freq" style="width:auto;flex:0 0 auto;direction:rtl">
              ${FREQUENCIES.map((f) => `<option value="${f.id}" ${f.id === st.frequency ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field inline">
            <label>每月几号</label>
            <input type="number" inputmode="numeric" id="rc-day" min="1" max="31" value="${st.dayOfMonth}" style="max-width:30%">
          </div>
          <div class="field inline">
            <label>启用</label>
            <span class="switch"><input type="checkbox" id="rc-on" ${st.enabled !== false ? 'checked' : ''}><i></i></span>
          </div>
        </div>
        ${!isNew ? `<div class="btn-row"><button type="button" class="btn danger" id="rc-del">删除</button></div>` : ''}
      `;
      const delBtn = body.querySelector('#rc-del');
      if (delBtn) delBtn.addEventListener('click', async () => {
        await store.removeRecurring(st.id);
        toastOk('已删除');
        document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('show'));
        document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
      });
    },
  });
}

function curMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
 * 清理重复 / 清空数据
 * ------------------------------------------------------------------ */

export async function cleanDuplicates() {
  const dups = store.state.txs.filter((t) => t.duplicateOf);
  if (!dups.length) {
    toastOk('没有发现重复交易');
    return;
  }
  const ok = await confirmSheet({
    title: `删除 ${dups.length} 笔重复交易？`,
    message: '这些是被判定为重复的交易（不计入统计）。删除后它们在明细里也不会再出现。',
    confirmLabel: '删除',
    danger: true,
  });
  if (!ok) return;
  await store.removeTxMany(dups.map((t) => t.id));
  toastOk(`已删除 ${dups.length} 笔`);
}

export async function clearAllData() {
  const ok = await confirmSheet({
    title: '清空所有数据？',
    message: '所有交易、规则、预算都会被删除，无法恢复。\n\n如果你还没导出备份，建议先取消，去「导出加密备份」存一份。',
    confirmLabel: '确认清空',
    danger: true,
  });
  if (!ok) return;

  const really = await confirmSheet({
    title: '最后确认',
    message: '真的要清空吗？这些数据删掉就找不回来了。',
    confirmLabel: '清空',
    danger: true,
  });
  if (!really) return;

  await db.clearAllData();
  await store.reloadAll();
  store.setTab('home');
  toastOk('已清空');
}
