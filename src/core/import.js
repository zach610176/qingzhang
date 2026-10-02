/**
 * 轻账 · 导入流水线
 *
 * 把「用户选了一个账单文件」到「数据进库」这一整条链路串起来：
 *   解析 → 去重 → 分类修正 → 写库 → 记录可撤销的批次
 */

import { parseFile, parseStatementText, parseZipFile, describeSkipped } from './parser.js';
import { dedupe, previewImport } from './dedupe.js';
import { newId } from './model.js';
import * as db from './db.js';
import { ruleMapFromRules } from './rules.js';

/**
 * 阶段一：只解析，不写库（用于给用户看「导入预览」）
 *
 * @param {File|File[]} files
 * @param {object} opts
 * @param {string} [opts.password] zip 密码
 * @param {string} [opts.source] 'auto'|'wechat'|'alipay'
 * @param {string} [opts.encoding]
 * @param {string} [opts.pastedText] 直接粘贴的文本（与 files 二选一）
 * @returns {Promise<object>} 预览结果
 */
export async function runImport(files, opts = {}) {
  const fileList = normalizeFiles(files);
  const rules = ruleMapFromRules(await db.allRules());
  const settings = await db.allSettings();
  const selfNames = collectSelfNames(settings);

  const batchId = newId('b');
  const perFile = [];
  const allTxs = [];
  const allWarnings = [];
  const allSkipped = { total: 0, byReason: {} };
  let source = opts.source && opts.source !== 'auto' ? opts.source : 'auto';

  // —— 直接粘贴的文本 ——
  if (opts.pastedText && !fileList.length) {
    const r = parseStatementText(opts.pastedText, {
      source: opts.source || 'auto',
      rules,
      selfNames,
      batchId,
    });
    if (source === 'auto') source = r.source;
    allTxs.push(...r.txs);
    allWarnings.push(...r.warnings);
    mergeSkipped(allSkipped, r.skipped);
    perFile.push({
      name: '粘贴的内容',
      source: r.source,
      count: r.txs.length,
      warnings: r.warnings,
      skipped: r.skipped,
    });
  }

  // —— 文件 ——
  for (const file of fileList) {
    try {
      const r = await parseFile(file, {
        password: opts.password,
        source: opts.source || 'auto',
        encoding: opts.encoding,
        rules,
        selfNames,
        batchId,
      });
      if (source === 'auto') source = r.source;
      allTxs.push(...r.txs);
      allWarnings.push(...r.warnings);
      mergeSkipped(allSkipped, r.skipped);
      perFile.push({
        name: r.fileName || file.name,
        source: r.source,
        count: r.txs.length,
        warnings: r.warnings,
        skipped: r.skipped,
        encoding: r.encoding,
        zipFiles: r.files,
      });
    } catch (err) {
      perFile.push({
        name: file.name,
        error: String(err && err.message || err),
        count: 0,
        warnings: [],
        skipped: { total: 0, byReason: {} },
      });
    }
  }

  // —— 跟库里已有的比对去重 ——
  const existing = await db.allTx();
  const preview = previewImport(allTxs, existing);

  // 补上批次号
  for (const t of preview.keep) t.batchId = batchId;
  for (const d of preview.duplicates) d.tx.batchId = batchId;

  return {
    batchId,
    source,
    perFile,
    keep: preview.keep,
    duplicates: preview.duplicates,
    stats: preview.stats,
    dateRange: preview.dateRange,
    byType: preview.byType,
    spendCents: preview.spendCents,
    warnings: [...new Set(allWarnings)],
    skipped: allSkipped,
    totalParsed: allTxs.length,
    existingCount: existing.length,
  };
}

/**
 * 阶段二：确认导入（把预览结果写进数据库）
 *
 * @param {object} preview runImport 的返回值
 * @param {object} [opts] { includeDuplicates: boolean } 是否连重复的也存进去（标记为重复）
 */
export async function commitImport(preview, opts = {}) {
  const toSave = [...preview.keep];

  // 重复的也存下来（标记 duplicateOf），这样以后重新判定去重规则时有据可查；
  // 它们不会参与任何统计。
  if (opts.includeDuplicates !== false) {
    for (const d of preview.duplicates) toSave.push(d.tx);
  }

  if (toSave.length) await db.putTxMany(toSave);

  const batch = {
    id: preview.batchId,
    createdAt: Date.now(),
    source: preview.source,
    files: preview.perFile.map((f) => f.name),
    parsedCount: preview.totalParsed,
    importedCount: preview.keep.length,
    duplicateCount: preview.duplicates.length,
    skipped: preview.skipped,
    fileCount: preview.perFile.length,
  };
  await db.putBatch(batch);

  return { saved: toSave.length, imported: preview.keep.length, batch };
}

/**
 * 撤销一次导入
 */
export async function undoBatch(batchId) {
  const all = await db.allTx();
  const ids = all.filter((t) => t.batchId === batchId).map((t) => t.id);
  if (ids.length) {
    await db.deleteTxMany(ids);
  }
  await db.deleteBatch(batchId);
  return ids.length;
}

/* ------------------------------------------------------------------ *
 * 辅助
 * ------------------------------------------------------------------ */

function normalizeFiles(files) {
  if (!files) return [];
  if (files instanceof File) return [files];
  if (Array.isArray(files)) return files.filter(Boolean);
  // FileList
  return Array.from(files || []);
}

function mergeSkipped(target, src) {
  if (!src) return;
  target.total += src.total || 0;
  for (const [k, v] of Object.entries(src.byReason || {})) {
    target.byReason[k] = (target.byReason[k] || 0) + v;
  }
}

/**
 * 收集「自己的名字」，用于识别内部转账。
 * 来源：设置里的姓名/昵称，以及微信账单头部的「微信昵称」。
 */
function collectSelfNames(settings) {
  const names = [];
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(push); return; }
    const s = String(v).trim();
    if (s && !names.includes(s)) names.push(s);
  };
  push(settings.selfNames);
  push(settings.nickname);
  push(settings.realName);
  return names;
}

/** 导入结果的一句话总结 */
export function summarizeImport(preview) {
  const parts = [];
  parts.push(`识别到 ${preview.totalParsed} 笔交易`);
  if (preview.stats.crossBatch) parts.push(`其中 ${preview.stats.crossBatch} 笔之前已经导入过（会自动跳过）`);
  if (preview.stats.inBatch) parts.push(`${preview.stats.inBatch} 笔文件内部重复`);
  if (preview.skipped.total) {
    const desc = describeSkipped(preview.skipped);
    if (desc) parts.push(`忽略 ${preview.skipped.total} 行（${desc}）`);
  }
  return parts.join('；') + '。';
}
