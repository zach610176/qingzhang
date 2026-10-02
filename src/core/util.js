/**
 * 轻账 · 通用小工具
 * 这里只放没有任何业务含义的纯函数，方便单独测试。
 */

/* ------------------------------------------------------------------ *
 * 指纹 / 哈希
 * ------------------------------------------------------------------ */

/** FNV-1a 32bit，快且够用；用于去重指纹 */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** 更强的 64bit 变体，降低碰撞概率 */
export function hash64(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + '-' + (h1 >>> 0).toString(36);
}

/* ------------------------------------------------------------------ *
 * 文本清洗
 * ------------------------------------------------------------------ */

/** 去掉首尾空白、全角空格、零宽字符、BOM */
export function cleanText(s) {
  if (s == null) return '';
  return String(s)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

/** 归一化商户名：去掉常见后缀、括号备注，便于「商户记忆」命中 */
export function normalizeMerchant(name) {
  let s = cleanText(name);
  if (!s) return '';
  // 去掉尾部括号内容，如「某某店（上海分店）」
  s = s.replace(/[（(][^）)]{0,20}[）)]\s*$/, '');
  // 去掉常见平台后缀
  s = s.replace(/(有限公司|有限责任公司|股份有限公司|分公司|集团)$/,'');
  // 去掉纯装饰符号
  s = s.replace(/[·・.。,\-_*#]+/g, ' ');
  return cleanText(s).toLowerCase();
}

/** 判断字符串里是否包含任一关键词（大小写不敏感） */
export function containsAny(text, keywords) {
  if (!text) return false;
  const t = text.toLowerCase();
  for (const k of keywords) {
    if (t.includes(k.toLowerCase())) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * 数组 / 数值
 * ------------------------------------------------------------------ */

export function sum(arr, pick = (x) => x) {
  let s = 0;
  for (const x of arr) s += pick(x);
  return s;
}

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    let bucket = map.get(k);
    if (!bucket) { bucket = []; map.set(k, bucket); }
    bucket.push(item);
  }
  return map;
}

export function sortByDesc(arr, pick) {
  return arr.slice().sort((a, b) => pick(b) - pick(a));
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function percent(part, whole) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

/* ------------------------------------------------------------------ *
 * 二进制
 * ------------------------------------------------------------------ */

export function bufToBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ------------------------------------------------------------------ *
 * 日期
 * ------------------------------------------------------------------ */

/**
 * 宽容地解析账单里的各种日期写法。
 * 支持：2026-01-05 12:30:00 / 2026/1/5 / 2026年1月5日 / 20260105 / 01/05/2026
 * 返回毫秒时间戳，解析不了返回 null。
 */
export function parseDateTime(input, fallbackTime) {
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'number' && input > 1e12) return input;

  let s = cleanText(input);
  if (!s) return null;

  // 先看时间部分 HH:mm:ss
  let hh = 0, mm = 0, ss = 0;
  const tm = s.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (tm) {
    hh = +tm[1]; mm = +tm[2]; ss = +(tm[3] || 0);
    s = s.replace(tm[0], ' ');
  }
  if (fallbackTime && !tm) {
    const ft = cleanText(fallbackTime).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (ft) { hh = +ft[1]; mm = +ft[2]; ss = +(ft[3] || 0); }
  }

  s = s.trim();

  let y, mo, d;

  let m = s.match(/^(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/))) {
    // 01/05/2026 这种，按 月/日/年 处理
    mo = +m[1]; d = +m[2]; y = +m[3];
  }
  else if ((m = s.match(/^(\d{1,2})\s*[-/月]\s*(\d{1,2})日?/))) {
    // 没有年份，默认今年
    y = new Date().getFullYear(); mo = +m[1]; d = +m[2];
  }
  else {
    // 交给原生解析兜底（例如 ISO 字符串）
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }

  if (!y || !mo || !d) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const dt = new Date(y, mo - 1, d, hh, mm, ss, 0);
  // 校验没有溢出（例如 2月30日会被自动进位到3月）
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}

/**
 * 解析金额。处理：¥1,234.56 / -12.30 / 12.30元 / 1,234
 * 返回 { cents, negative }，解析不了返回 null。
 */
export function parseAmount(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return { cents: Math.round(Math.abs(input) * 100), negative: input < 0 };
  }
  let s = cleanText(input);
  if (!s) return null;
  const negative = /^\s*-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[¥￥,，\s()]/g, '').replace(/元$/, '').replace(/^\+/, '');
  if (s.startsWith('-')) { s = s.slice(1); }
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null;
  const val = parseFloat(s);
  if (!Number.isFinite(val)) return null;
  return { cents: Math.round(val * 100), negative };
}
