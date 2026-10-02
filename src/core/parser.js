/**
 * 轻账 · 微信 / 支付宝账单解析器
 *
 * 支持的输入：
 *   - .csv / .txt 账单文件（UTF-8 或 GBK）
 *   - .zip 压缩包（微信发到邮箱的那种，可能带解压密码）
 *   - 直接粘贴的账单文本
 *
 * 解析流程：识别来源 → 找到表头 → 逐行映射字段 → 判定收支类型 → 分类
 */

import { parseCSV, findHeaderRow, rowsToObjects, pickField, decodeText, looksLikeStatement } from './csv.js';
import { cleanText, normalizeMerchant, hash64, parseDateTime, parseAmount } from './util.js';
import { classify, detectType, shouldSkipRow } from './classify.js';
import { makeTx, newId } from './model.js';

/* ------------------------------------------------------------------ *
 * 来源识别
 * ------------------------------------------------------------------ */

/**
 * 识别账单是微信还是支付宝。
 *
 * 分两级判断，这个区分很重要：
 *   - 强信号：某平台独有的字样（「微信支付」「支付宝」「收/付款方式」…）。
 *     命中任意一个就足够定论。
 *   - 弱信号：两家都用的通用列名（「交易时间」「交易对方」「金额」…）。
 *     只能作为参考，**单独出现时不足以判定平台**。
 *
 * 之前的实现把弱信号和强信号一起计分，导致一份「交易时间,交易对方,金额(元)」
 * 这种通用小账单被误判成支付宝，进而套用支付宝的列名映射，解析出错误结果。
 */
export function detectSource(text) {
  const head = (text || '').slice(0, 6000);

  // —— 强信号：平台独有 ——
  const wxStrong = ['微信支付账单', '微信支付', '微信昵称', '微信红包', '微信账单', '当前状态', '零钱通', '微信零钱'];
  const aliStrong = ['支付宝', 'alipay', '交易创建时间', '收/付款方式', '付款时间', '交易订单号', '商家订单号', '余额宝', '花呗', '收/支'];

  let wxS = 0, aliS = 0;
  for (const s of wxStrong) if (head.includes(s)) wxS++;
  for (const s of aliStrong) if (head.includes(s)) aliS++;

  if (wxS || aliS) {
    return wxS >= aliS ? 'wechat' : 'alipay';
  }

  // —— 弱信号：两家共有的通用列名 ——
  // 「交易时间」「交易对方」「金额」这类列名微信和支付宝都有，
  // 列得再全也不能断定是哪一家，所以这里刻意不参与判定，
  // 直接返回 unknown，让上层按通用格式解析并给用户一条提示。
  return 'unknown';
}

/* ------------------------------------------------------------------ *
 * 列名映射
 * ------------------------------------------------------------------ */

const COL = {
  time: {
    wechat: ['交易时间', '时间', '交易日期'],
    alipay: ['交易创建时间', '付款时间', '交易时间', '创建时间', '成交时间'],
    any: ['交易时间', '交易创建时间', '付款时间', '创建时间', '记账时间', '时间', '日期', '交易日期'],
  },
  merchant: {
    wechat: ['交易对方', '对方', '商户'],
    alipay: ['交易对方', '对方', '商户名称', '收款方'],
    any: ['交易对方', '对方', '商户名称', '商户', '收款方', '交易对象'],
  },
  description: {
    wechat: ['商品', '商品说明', '备注'],
    alipay: ['商品说明', '商品名称', '商品', '备注', '说明'],
    any: ['商品说明', '商品名称', '商品', '备注', '说明', '摘要'],
  },
  direction: {
    wechat: ['收/支', '收支', '收支类型'],
    alipay: ['收/支', '收支', '收支类型', '资金方向'],
    any: ['收/支', '收支', '收支类型', '资金方向', '借贷标志'],
  },
  amount: {
    wechat: ['金额(元)', '金额（元）', '金额'],
    alipay: ['金额(元)', '金额（元）', '金额', '发生金额'],
    any: ['金额(元)', '金额（元）', '金额', '发生金额', '交易金额'],
  },
  method: {
    any: ['支付方式', '付款方式', '收付款方式', '资金渠道'],
  },
  rawType: {
    any: ['交易类型', '类型', '业务类型', '交易分类'],
  },
  status: {
    any: ['当前状态', '交易状态', '状态', '订单状态'],
  },
  counterAccount: {
    any: ['对方账号', '对方账户', '收款方账号', '账号'],
  },
};

function buildColumns(row) {
  const get = (group) => pickField(row, COL[group].any);
  return {
    time: get('time'),
    merchant: get('merchant'),
    description: get('description'),
    direction: get('direction'),
    amount: get('amount'),
    method: get('method'),
    rawType: get('rawType'),
    status: get('status'),
    counterAccount: get('counterAccount'),
  };
}

/* ------------------------------------------------------------------ *
 * 单行解析
 * ------------------------------------------------------------------ */

/**
 * @param {object} row          rowsToObjects 出来的一行
 * @param {object} columns      buildColumns 的结果
 * @param {object} ctx          { source, selfNames, rules, batchId, aliases }
 * @returns {{tx: object|null, skip: string|null}}
 */
export function parseRow(row, columns, ctx = {}) {
  const source = ctx.source || 'unknown';

  const timeVal = columns.time ? row[columns.time.key] : '';
  const ts = parseDateTime(timeVal);
  if (!ts) return { tx: null, skip: 'no-time' };

  const amountVal = columns.amount ? row[columns.amount.key] : '';
  const amt = parseAmount(amountVal);
  // 读不出来的金额 与 「0.00」这种空交易 是两回事，跳过原因必须分开报，
  // 否则界面上永远显示不出「金额是 0」（原来的第二个判断是死代码，永远走不到）
  if (!amt) return { tx: null, skip: 'no-amount' };
  if (amt.cents === 0) return { tx: null, skip: 'zero-amount' };

  // 失败/关闭的交易
  if (shouldSkipRow(row, (r, keys) => {
    for (const k of keys) { if (r[k] != null && r[k] !== '') return r[k]; }
    return '';
  })) {
    return { tx: null, skip: 'invalid-status' };
  }

  const merchantRaw = columns.merchant ? row[columns.merchant.key] : '';
  const descRaw = columns.description ? row[columns.description.key] : '';
  const rawType = columns.rawType ? row[columns.rawType.key] : '';
  const dirRaw = columns.direction ? row[columns.direction.key] : '';
  const method = columns.method ? row[columns.method.key] : '';
  const counterAccount = columns.counterAccount ? row[columns.counterAccount.key] : '';

  const direction = parseDirection(dirRaw, amountVal, amt);
  const merchant = cleanText(merchantRaw);
  const description = cleanText(descRaw);

  // 「名商户」占位符：微信有时把商户名写成「名商户xx」
  const merchantClean = /^名?商户/.test(merchant) ? '' : merchant;

  const type = detectType({
    direction,
    rawType,
    merchant: merchantClean,
    description,
    source,
  }, ctx.selfNames || []);

  // 分类
  let category;
  if (type === 'income') {
    category = inferIncomeCategory(merchantClean, description, rawType);
  } else if (type === 'refund') {
    category = 'refund';
  } else if (type === 'redpacket') {
    category = 'redpacket';
  } else if (type === 'transfer' || type === 'repay') {
    category = 'other';
  } else {
    const r = classify({ merchant: merchantClean, description, rawType }, ctx.rules);
    category = r.category;
  }

  // 微信里「商户全称」比「交易对方」更规范，能帮助分类
  const fullName = columns.merchant ? '' : '';

  const tx = makeTx({
    ts,
    amountCents: amt.cents,
    type,
    category,
    merchant: merchantClean || (rawType ? cleanText(rawType).split('-')[0] : '') || '未知商户',
    description: description || cleanText(rawType),
    rawType: cleanText(rawType),
    source: source === 'unknown' ? 'import' : source,
    account: cleanText(method),
    batchId: ctx.batchId || '',
  });

  tx.fp = fingerprint(tx);
  tx.counterAccount = cleanText(counterAccount);
  tx.fullMerchant = cleanText(fullName);

  return { tx, skip: null };
}

/** 解析「收/支」列 */
export function parseDirection(dirRaw, amountRaw, amtInfo) {
  const d = cleanText(dirRaw);
  if (d) {
    // 「不计收支」必须最先判：它含有「收」字，而下面的 /收入|收|…/ 会把
    // 「不计收支」当成「收入」，于是整份账单里这类中性流水全被算成收入/消费。
    if (/不计收支|不计入|中性|其它|其他/.test(d)) return 'none';
    // 斜杠和短横线是「没填」，不是「中性」。
    // 微信账单里方向为 / 的行绝大多数是普通消费（例如扫码付款），
    // 如果当成中性会被 detectType 归到「内部转账」，从而漏掉真实消费。
    // 所以这里不 return，让它落到下面的兜底逻辑（按金额符号 → 默认支出）。
    if (d === '/' || d === '-') {
      // 什么都不做，继续往下走
    } else if (/收入|转入|退款|收|入账/.test(d) && !/支出/.test(d)) return 'in';
    else if (/支出|转出|付款|支/.test(d)) return 'out';
  }
  // 没写方向：靠金额正负号
  if (amtInfo && amtInfo.negative) return 'out';
  const raw = cleanText(amountRaw);
  if (/^-/.test(raw)) return 'out';
  return 'out'; // 默认当支出，误差最小（账单里绝大多数是支出）
}

/** 收入细分：工资/退款/红包/其他 */
function inferIncomeCategory(merchant, description, rawType) {
  const all = `${merchant} ${description} ${rawType}`;
  if (/工资|薪资|薪水|代发|劳务/.test(all)) return 'salary';
  if (/奖金|绩效|年终|补贴|报销/.test(all)) return 'bonus';
  if (/退款|退货|退费|返现/.test(all)) return 'refund';
  if (/红包/.test(all)) return 'redpacket';
  if (/利息|收益|理财|余额宝收益|基金/.test(all)) return 'other_in';
  return 'other_in';
}

/* ------------------------------------------------------------------ *
 * 指纹：用于去重
 * ------------------------------------------------------------------ */

/**
 * 同一笔交易重复导入时，指纹必须一致。
 * 注意：金额、时间、商户三者相同仍然可能是两笔真实交易（例如同一天买两次同样价钱的奶茶），
 * 所以指纹只用来「快速找出可疑重复」，真正判定由 dedupe 决定。
 */
export function fingerprint(tx) {
  const minute = Math.floor(tx.ts / 60000);
  const parts = [
    minute,
    tx.amountCents,
    normalizeMerchant(tx.merchant),
    cleanText(tx.description).slice(0, 30),
    tx.type,
  ];
  return hash64(parts.join('\u0001'));
}

/* ------------------------------------------------------------------ *
 * 文件级解析
 * ------------------------------------------------------------------ */

/**
 * 解析一段账单文本。
 * @param {string} text
 * @param {object} ctx
 * @returns {{source:string, txs:object[], skipped:object, headerRow:number, columns:object|null, warnings:string[], encoding?:string}}
 */
export function parseStatementText(text, ctx = {}) {
  const warnings = [];
  const skipped = { total: 0, byReason: {} };

  const source = ctx.source && ctx.source !== 'auto' ? ctx.source : detectSource(text);
  if (source === 'unknown') {
    warnings.push('没认出这是微信还是支付宝的账单，按通用格式解析；如果结果不对，可以手动指定来源。');
  }

  const { rows } = parseCSV(text);
  if (!rows.length) {
    return { source, txs: [], skipped, headerRow: -1, columns: null, warnings: ['文件里没有可读内容。'] };
  }

  const headerRow = findHeaderRow(rows, [
    '交易时间', '交易创建时间', '交易对方', '商品', '金额', '收/支', '收支',
    '交易类型', '付款时间', '当前状态', '交易状态',
  ]);

  if (headerRow < 0) {
    warnings.push('没找到表头行，可能不是账单文件，或者格式比较特殊。');
    return { source, txs: [], skipped, headerRow: -1, columns: null, warnings };
  }

  const objects = rowsToObjects(rows, headerRow);
  if (!objects.length) {
    warnings.push('表头下面没有数据行。');
    return { source, txs: [], skipped, headerRow, columns: null, warnings };
  }

  const columns = buildColumns(objects[0]);
  if (!columns.time || !columns.amount) {
    const missing = [];
    if (!columns.time) missing.push('交易时间');
    if (!columns.amount) missing.push('金额');
    warnings.push(`账单缺少必需的列：${missing.join('、')}。表头实际是：${rows[headerRow].join(' | ').slice(0, 200)}`);
    return { source, txs: [], skipped, headerRow, columns: null, warnings };
  }
  if (!columns.merchant && !columns.description) {
    warnings.push('没有找到「交易对方」或「商品」列，商户信息可能为空。');
  }

  const ctxFull = { ...ctx, source };
  if (!ctxFull.batchId) ctxFull.batchId = `b_${Date.now().toString(36)}`;

  const txs = [];
  for (const row of objects) {
    skipped.total++;
    let res;
    try {
      res = parseRow(row, columns, ctxFull);
    } catch (e) {
      res = { tx: null, skip: 'parse-error:' + String(e && e.message || e) };
    }
    if (res.tx) {
      txs.push(res.tx);
      skipped.total--; // 成功的不算跳过
    } else {
      const r = res.skip || 'unknown';
      const base = r.split(':')[0];
      skipped.byReason[base] = (skipped.byReason[base] || 0) + 1;
    }
  }

  // 交易按时间排序
  txs.sort((a, b) => a.ts - b.ts);

  // 解析出来的年份跨度提示（防止把不同年份的账单混在一起）
  if (txs.length) {
    const years = new Set(txs.map((t) => new Date(t.ts).getFullYear()));
    if (years.size > 1) {
      warnings.push(`这批账单跨了 ${years.size} 个年份（${[...years].sort().join('、')}），导入后建议按月份筛选核对一下。`);
    }
  }

  return { source, txs, skipped, headerRow, columns, warnings };
}

/* ------------------------------------------------------------------ *
 * ZIP 处理
 * ------------------------------------------------------------------ */

/**
 * 从 zip 里找出账单文件并解析。
 * @param {ArrayBuffer} buffer
 * @param {object} opts { password, source, rules, selfNames }
 */
export async function parseZipFile(buffer, opts = {}) {
  const { readZip } = await import('./zip.js');
  const warnings = [];

  let entries;
  try {
    entries = await readZip(buffer, opts.password || '');
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/密码/.test(msg)) throw new Error('解压密码不对。微信账单的密码通常是你的身份证后 6 位，如果身份证以字母 X 结尾请大写。');
    if (/AES/i.test(msg)) throw new Error('这个压缩包用了新版加密方式，暂时解不开。可以在电脑上解压后用 CSV 导入。');
    throw new Error('无法读取这个压缩包：' + msg);
  }

  // 挑出「像账单」的文本文件
  const texts = entries.filter((e) => !e.dir && typeof e.text === 'string');
  if (!texts.length) {
    const names = entries.filter((e) => !e.dir).map((e) => e.name).join('、');
    throw new Error('压缩包里没有找到文本文件。里面的文件是：' + (names || '（空）'));
  }

  const statements = texts.filter((e) => looksLikeStatement(e.text));
  const chosen = statements.length ? statements : texts;

  if (!statements.length) {
    warnings.push(`压缩包里没找到标准账单文件，尝试解析了：${chosen.map((c) => c.name).join('、')}`);
  }
  if (chosen.length > 1) {
    warnings.push(`压缩包里有 ${chosen.length} 个候选文件，都解析了。`);
  }

  const allTx = [];
  const allWarnings = [...warnings];
  const skipped = { total: 0, byReason: {} };
  let source = opts.source || 'auto';

  for (const entry of chosen) {
    const r = parseStatementText(entry.text, opts);
    if (source === 'auto') source = r.source;
    allTx.push(...r.txs);
    allWarnings.push(...r.warnings);
    skipped.total += r.skipped.total;
    for (const [k, v] of Object.entries(r.skipped.byReason)) {
      skipped.byReason[k] = (skipped.byReason[k] || 0) + v;
    }
  }

  return { source, txs: allTx, skipped, warnings: dedupeStrings(allWarnings), files: chosen.map((c) => c.name) };
}

function dedupeStrings(arr) {
  return [...new Set(arr)];
}

/* ------------------------------------------------------------------ *
 * 统一入口
 * ------------------------------------------------------------------ */

/**
 * 解析用户选择的文件（浏览器 File 对象）。
 * @param {File} file
 * @param {object} opts
 */
export async function parseFile(file, opts = {}) {
  const name = (file.name || '').toLowerCase();
  const isZip = name.endsWith('.zip') || (file.type || '').includes('zip');

  if (isZip) {
    const buf = await file.arrayBuffer();
    const r = await parseZipFile(buf, opts);
    return { ...r, fileName: file.name };
  }

  // 文本类
  const buf = await file.arrayBuffer();
  const { text, encoding } = decodeText(buf, opts.encoding);
  const r = parseStatementText(text, opts);
  return { ...r, fileName: file.name, encoding };
}

/** 跳过原因的「人话」解释 */
export const SKIP_REASONS = {
  'no-time': '日期读不出来',
  'no-amount': '金额读不出来',
  'zero-amount': '金额是 0',
  'invalid-status': '交易已取消/退款/失败',
  'parse-error': '格式异常',
  unknown: '其他原因',
};

export function describeSkipped(skipped) {
  const parts = [];
  for (const [k, v] of Object.entries(skipped.byReason || {})) {
    parts.push(`${SKIP_REASONS[k] || k} ${v} 笔`);
  }
  return parts.join('，');
}
