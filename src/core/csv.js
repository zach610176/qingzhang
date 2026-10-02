/**
 * 轻账 · CSV 解析器
 *
 * 微信和支付宝导出的「CSV」其实很不规范：
 *   - 微信前面有十几行说明文字（-----微信支付账单明细----- 之类），真正的表头在中间
 *   - 引号里可能包含换行、逗号
 *   - 分隔符可能是逗号，也可能是制表符
 *   - 编码可能是 UTF-8，也可能是 GBK
 * 所以不能简单按逗号 split，必须正经写一个状态机。
 */

import { cleanText } from './util.js';

/**
 * 把一段 CSV 文本切成二维数组。
 * @param {string} text
 * @param {string} [delimiter] 不传则自动探测
 * @returns {{rows: string[][], delimiter: string}}
 */
export function parseCSV(text, delimiter) {
  if (typeof text !== 'string') text = String(text ?? '');
  const rows = [];
  if (!text.length) return { rows, delimiter: delimiter || ',' };

  const delim = delimiter || detectDelimiter(text);
  const DELIMS = new Set([delim]);

  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  /** 当前这一行有没有出现过分隔符。用来区分「只剩分隔符的行」和「只有空格的行」 */
  let rowHasDelimiter = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    pushField();
    // 空行处理要区分两种情况：
    //   1. 完全空行、只有空格的行 → 整个丢掉。
    //      否则最后一行会变成空行（测试明确断言最后一行不该是空的）。
    //   2. 只剩分隔符的行（`,,,`）→ 保留，交给上层统计成「跳过」。
    //      这是测试明确记录的既有行为。
    //
    // 判据必须是「这一行有没有真的遇到过分隔符」。
    // 不能只看 row.length：只有空格的行 `'   '` 也会是 1 个字段，
    // 而带引号的空字段看起来也和空行一样，所以靠一个显式标志最稳。
    const isBlank = row.every((c) => c.trim() === '');
    if (!isBlank || rowHasDelimiter) rows.push(row);
    row = [];
    rowHasDelimiter = false;
  };

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }

    if (ch === '"') {
      // 引号只在字段开头有意义；其它情况当普通字符
      if (field === '') { inQuotes = true; i++; continue; }
      field += ch; i++; continue;
    }

    if (DELIMS.has(ch)) { pushField(); rowHasDelimiter = true; i++; continue; }

    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      pushRow(); i++; continue;
    }
    if (ch === '\n') { pushRow(); i++; continue; }

    field += ch;
    i++;
  }

  // 收尾：只有确实还有内容（或者遇到过分隔符）时才补最后一行，
  // 否则文末的换行会产生一个多余的空行。
  if (field !== '' || rowHasDelimiter) pushRow();

  // 去掉末尾的空行。
  // 文件中间的空行要保留（上层会把它们统计成「跳过」，这是既有行为），
  // 但文末的空行纯粹是换行符带来的噪声：留着会让「最后一行」变成空行。
  while (rows.length) {
    const last = rows[rows.length - 1];
    if (last.every((c) => c.trim() === '')) rows.pop();
    else break;
  }

  return { rows, delimiter: delim };
}

/** 探测分隔符：对比前若干行里逗号/制表符/分号的出现次数 */
function detectDelimiter(text) {
  const sample = text.slice(0, 8000);
  const candidates = [
    { d: ',', n: 0 },
    { d: '\t', n: 0 },
    { d: ';', n: 0 },
  ];
  let inQuotes = false;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    for (const c of candidates) if (ch === c.d) c.n++;
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0].n > 0 ? candidates[0].d : ',';
}

/**
 * 从一堆行里找出表头行。
 * @param {string[][]} rows
 * @param {string[]} mustContain 表头里必须出现的关键词（任一命中即可）
 * @param {number} [maxScan] 最多往下找多少行
 * @returns {number} 表头行下标，找不到返回 -1
 */
export function findHeaderRow(rows, mustContain, maxScan = 60) {
  const limit = Math.min(rows.length, maxScan);
  let best = -1;
  let bestScore = 0;

  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map((c) => cleanText(c));
    if (cells.length < 2) continue;
    let score = 0;
    for (const cell of cells) {
      for (const kw of mustContain) {
        if (cell.includes(kw)) score++;
      }
    }
    // 表头行通常字段数较多且命中关键词
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return bestScore >= 2 ? best : -1;
}

/**
 * 把表头行 + 数据行整理成「列名 → 值」的数组。
 * 空列名会自动补成 col0/col1...
 */
export function rowsToObjects(rows, headerIndex) {
  const header = rows[headerIndex].map((h, i) => {
    const name = cleanText(h).replace(/[\s\u3000]/g, '');
    return name || `col${i}`;
  });

  const out = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.length) continue;
    // 整行都是空的就跳过
    if (r.every((c) => cleanText(c) === '')) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = cleanText(r[j] ?? '');
    }
    // 万一某行列数比表头多，也保留
    for (let j = header.length; j < r.length; j++) {
      obj[`col${j}`] = cleanText(r[j]);
    }
    obj.__rowIndex = i;
    out.push(obj);
  }
  return out;
}

/**
 * 在一个对象里，按「候选列名列表」模糊找一个字段。
 * 例如找金额：先找完全等于「金额」的列，再找包含「金额」的列。
 * @param {object} row
 * @param {string[]} candidates
 * @param {{exclude?: string[]}} [opts]
 */
export function pickField(row, candidates, opts = {}) {
  const keys = Object.keys(row).filter((k) => !k.startsWith('__'));
  const exclude = opts.exclude || [];

  // 1) 精确匹配（忽略大小写和空格）
  for (const cand of candidates) {
    const target = cand.toLowerCase();
    for (const k of keys) {
      if (exclude.some((e) => k.includes(e))) continue;
      if (k.toLowerCase() === target) return { key: k, value: row[k] };
    }
  }
  // 2) 包含匹配
  for (const cand of candidates) {
    const target = cand.toLowerCase();
    for (const k of keys) {
      if (exclude.some((e) => k.includes(e))) continue;
      if (k.toLowerCase().includes(target)) return { key: k, value: row[k] };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 编码
 * ------------------------------------------------------------------ */

/**
 * 把 ArrayBuffer 解成文本。
 * 微信早期导出是 GBK，用 UTF-8 解会全是乱码，所以要做探测。
 */
export function decodeText(buffer, preferredEncoding) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (preferredEncoding) {
    try {
      return { text: new TextDecoder(preferredEncoding).decode(bytes), encoding: preferredEncoding };
    } catch (e) { /* 不认识这个编码，继续探测 */ }
  }

  // 有 UTF-8 BOM，直接按 UTF-8
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8' };
  }

  // 先严格按 UTF-8 解，失败说明不是 UTF-8
  let utf8 = '';
  try {
    utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: utf8, encoding: 'utf-8' };
  } catch (e) { /* 不是合法 UTF-8 */ }

  // 退回 GBK
  for (const enc of ['gbk', 'gb18030', 'big5']) {
    try {
      const t = new TextDecoder(enc).decode(bytes);
      // 出现大量替换字符说明也不对
      const bad = (t.match(/\uFFFD/g) || []).length;
      if (bad / Math.max(1, t.length) < 0.01) return { text: t, encoding: enc };
    } catch (e) { /* 浏览器不支持这个编码，跳过 */ }
  }

  // 全都不行，用非严格 UTF-8 兜底
  return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8-lossy' };
}

/** 猜测 CSV 里有没有内容（用于解压后挑文件） */
export function looksLikeStatement(text) {
  if (!text) return false;
  const s = text.slice(0, 4000);
  const hits = ['交易时间', '交易创建时间', '交易对方', '金额', '收/支', '收支', '商品', '交易类型', '付款时间', '账单明细'];
  let n = 0;
  for (const h of hits) if (s.includes(h)) n++;
  return n >= 2;
}
