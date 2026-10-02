/**
 * 轻账 · 图表零件（纯字符串 SVG，无依赖）
 *
 * 设计约束：
 *  - 只返回 SVG 标记字符串，不碰 document / window，可以直接在 Node 里跑单元测试；
 *  - 没有第三方库、没有构建步骤、没有外部字体或网络资源；
 *  - 所有用户文本一律过 esc()，所有数字一律过 num()，
 *    因此输出里永远不会出现 NaN / Infinity / undefined；
 *  - 中性色用 CSS 变量（var(--label) / var(--label-2) / var(--separator) / var(--fill)），
 *    数据色用苹果系统色，浅色/深色模式都正常。
 *
 * 【金额单位】全部是「分」(integer cents)。
 *   123456 -> "¥1,234.56"。格式化的默认实现是 formatMoney(cents)。
 *   需要别的显示方式就传 opts.formatValue。
 */

/**
 * 字体：不加载任何字体文件，只用系统字体（中文走苹方）。
 * 同时写成 SVG 属性（FONT_ATTR）和内联 CSS（FONT_CSS），
 * 不依赖外部 CSS 类，单独把这个字符串塞进页面也能正常显示。
 */
const FONT_FAMILY = "-apple-system, 'SF Pro Text', 'PingFang SC', system-ui, sans-serif";
const FONT_ATTR = `font-family="${FONT_FAMILY}"`;
const FONT_CSS = `font-family:${FONT_FAMILY}`;

/** 苹果系统色 */
export const APPLE_COLORS = Object.freeze({
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF3B30',
  purple: '#BF5AF2',
  pink: '#FF375F',
  teal: '#64D2FF',
  gray: '#8E8E93',
});

/** 分类默认配色（不传 color 时按顺序取） */
export const PALETTE = Object.freeze([
  APPLE_COLORS.blue,
  APPLE_COLORS.green,
  APPLE_COLORS.orange,
  APPLE_COLORS.red,
  APPLE_COLORS.purple,
  APPLE_COLORS.pink,
  APPLE_COLORS.teal,
  APPLE_COLORS.gray,
]);

/** 预算进度环的档位配色 */
export const LEVEL_COLORS = Object.freeze({
  ok: APPLE_COLORS.green,
  warn: APPLE_COLORS.orange,
  danger: APPLE_COLORS.red,
  none: APPLE_COLORS.gray,
});

/* ------------------------------------------------------------------ *
 * 基础工具
 * ------------------------------------------------------------------ */

let idSeq = 0;

/**
 * 生成页面内唯一的 id（同一次会话内递增）。
 * 渐变 / clipPath 必须唯一，否则同页多个图表会互相串色。
 */
function nextId(prefix) {
  idSeq += 1;
  const base = String(prefix === undefined || prefix === null ? 'qz' : prefix)
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'qz'}-${idSeq.toString(36)}`;
}

/** 转义 XML 文本/属性。账单商户名里真的会有 < > & " '。 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 任何输入 -> 有限数字，非有限值一律当 0，杜绝 NaN 扩散 */
export function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** 数字 -> 属性字符串（两位小数，-0 归一成 0） */
function px(value) {
  const n = Math.round(num(value) * 100) / 100;
  return String(n === 0 ? 0 : n);
}

function clamp(value, lo, hi) {
  const n = num(value);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/** 任何输入 -> 字符串（null/undefined 变成空串，不会打出 "undefined"） */
function str(value) {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * 标签文本：和 str() 一样，但非有限的数字（NaN / Infinity）当成空串，
 * 免得 "NaN" 这种字面量漏进输出。
 */
function labelOf(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  return str(value);
}

/**
 * 金额格式化：输入「分」，输出 ¥1,234.56。
 * formatMoney(123456) === '¥1,234.56'
 * formatMoney(-123456) === '-¥1,234.56'
 */
export function formatMoney(cents) {
  const n = Math.round(num(cents));
  const negative = n < 0;
  const abs = Math.abs(n);
  const yuan = Math.floor(abs / 100);
  const fen = abs - yuan * 100;
  const grouped = String(yuan).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}¥${grouped}.${String(fen).padStart(2, '0')}`;
}

/** 32.5% / 33% —— 保留一位小数但不显示多余的 .0 */
function fmtPercent(value) {
  return `${Math.round(num(value) * 10) / 10}%`;
}

function pickFormatter(opts) {
  return typeof opts.formatValue === 'function' ? opts.formatValue : formatMoney;
}

/** 安全地调用格式化函数：永远拿到字符串 */
function fmtValue(fmt, value) {
  try {
    return str(fmt(value));
  } catch (_) {
    return '';
  }
}

/** 按「字符」截断（emoji 不会被劈开），加省略号 */
function truncate(text, max) {
  const s = str(text);
  const limit = Math.max(1, Math.floor(num(max) || 4));
  const chars = Array.from(s);
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : s;
}

/** 粗略估算文字宽度（中文按 1 个字宽，西文按 0.55），用于图例换行 */
function estWidth(text, fontSize = 11) {
  let w = 0;
  for (const ch of str(text)) {
    w += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
  }
  return w;
}

/**
 * SVG 外壳：viewBox 定死比例 + width="100%" 跟随容器。
 * 内联 height:auto 让高度由 viewBox 比例算出来（浏览器按固有比例渲染）。
 */
function shell(width, height, body = '') {
  return (
    `<svg class="qz-chart" xmlns="http://www.w3.org/2000/svg" ${FONT_ATTR}` +
    ` width="100%" height="${px(height)}" viewBox="0 0 ${px(width)} ${px(height)}"` +
    ` preserveAspectRatio="xMidYMid meet"` +
    ` style="${FONT_CSS};height:auto;display:block">${body}</svg>`
  );
}

function straightPath(pts) {
  if (!pts.length) return '';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x)} ${px(p.y)}`)
    .join(' ');
}

/**
 * Catmull-Rom -> 三次贝塞尔：把折线变成顺滑的趋势线。
 * 控制点用相邻点的差分算，标准做法，不需要额外依赖。
 */
function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length < 3) return straightPath(pts);
  let d = `M${px(pts[0].x)} ${px(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${px(c1x)} ${px(c1y)} ${px(c2x)} ${px(c2y)} ${px(p2.x)} ${px(p2.y)}`;
  }
  return d;
}

/** 数值 -> 点坐标（统一处理 min===max、单点、空数组） */
function toPoints(values, width, height, padX, padY) {
  const n = values.length;
  const plotW = Math.max(1, width - padX * 2);
  const plotH = Math.max(1, height - padY * 2);

  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    if (min === 0) {
      max = 1;
    } else {
      const d = Math.abs(min) * 0.5 || 1;
      min -= d;
      max += d;
    }
  }
  const span = max - min || 1;

  return values.map((v, i) => {
    const x = n === 1 ? padX + plotW / 2 : padX + (plotW * i) / (n - 1);
    const y = padY + plotH * (1 - (v - min) / span);
    return { x, y, value: v };
  });
}

/** 图例排版：返回按行分组的条目 */
function layoutLegend(entries, width, fontSize = 11) {
  const lines = [];
  let line = [];
  let x = 0;
  const swatch = 8;
  const gap = 14;
  for (const entry of entries) {
    const w = swatch + estWidth(entry.label, fontSize);
    if (x > 0 && x + w > width) {
      lines.push(line);
      line = [];
      x = 0;
    }
    line.push({ label: entry.label, color: entry.color, x, w });
    x += w + gap;
  }
  if (line.length) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------------ *
 * 1. 环形图
 * ------------------------------------------------------------------ */

/**
 * donutChart(items, opts)
 * @param {Array<{label?:string, value:number, color?:string, percent?:number}>} items
 *        value 单位是「分」。单条占比 100% 也能画成一个带小缺口的环。
 * @param {object} [opts]
 * @param {number} [opts.size=180]        画布边长
 * @param {number} [opts.thickness=22]    环宽
 * @param {number} [opts.gap=2]           段与段之间的视觉缺口（度）
 * @param {string} [opts.centerLabel]     圆心小字（灰）
 * @param {string|number} [opts.centerValue] 圆心大字（数字按「分」格式化）
 * @param {Function} [opts.formatValue]   value -> string
 */
export function donutChart(items, opts = {}) {
  const o = opts || {};
  const list = (Array.isArray(items) ? items : []).map((raw) => {
    const it = raw || {};
    return {
      label: labelOf(it.label),
      value: num(it.value),
      color: it.color ? str(it.color) : '',
      percent: it.percent === undefined || it.percent === null ? null : num(it.percent),
    };
  });

  const size = clamp(num(o.size) || 180, 60, 2000);
  const thickness = clamp(num(o.thickness) || 22, 2, Math.max(2, size / 2 - 6));
  const gapDeg = o.gap === undefined || o.gap === null ? 2 : clamp(o.gap, 0, 90);
  const fmt = pickFormatter(o);

  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(1, (size - thickness) / 2);
  const circumference = 2 * Math.PI * radius;

  const positive = list.filter((it) => it.value > 0);
  const total = positive.reduce((sum, it) => sum + it.value, 0);
  const hasData = positive.length > 0 && total > 0;

  // 只有一个扇区（≈100%）时也要留一点缺口，否则看不出是个环
  const segGap = positive.length <= 1 ? Math.max(gapDeg, 2) : gapDeg;

  const segmentMarkup = [];
  if (hasData) {
    let cursor = 0;
    positive.forEach((it, index) => {
      const frac = it.value / total;
      const len = frac * circumference;
      const start = cursor * circumference;
      cursor += frac;

      const gapLen = Math.min((segGap / 360) * circumference, Math.max(0, len - 0.6));
      const dash = len - gapLen;
      if (dash <= 0.05) return;

      const pct = it.percent === null ? frac * 100 : it.percent;
      const color = it.color || PALETTE[index % PALETTE.length];
      const title = `${it.label ? `${it.label} ` : ''}${fmtPercent(pct)} ${fmtValue(fmt, it.value)}`;

      segmentMarkup.push(
        `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none"` +
          ` style="stroke:${esc(color)}" stroke-width="${px(thickness)}"` +
          ` stroke-dasharray="${px(dash)} ${px(circumference)}"` +
          ` stroke-dashoffset="${px(-start)}" stroke-linecap="butt">` +
          `<title>${esc(title)}</title></circle>`
      );
    });
  }

  // 底环：有数据时是淡色轨道；没有数据时是一条中性满环
  const track = hasData
    ? `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--fill)" stroke-width="${px(thickness)}" opacity="0.6"/>`
    : `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--separator)" stroke-width="${px(thickness)}" opacity="0.75"/>`;

  const ring = `<g transform="rotate(-90 ${px(cx)} ${px(cy)})">${track}${segmentMarkup.join('')}</g>`;

  const labelText = labelOf(o.centerLabel);
  const valueText = typeof o.centerValue === 'number' ? fmtValue(fmt, o.centerValue) : labelOf(o.centerValue);
  const labelSize = Math.max(9, Math.round(size * 0.075));
  const valueSize = Math.max(12, Math.round(size * 0.115));

  const center =
    `<text x="${px(cx)}" y="${px(cy - size * 0.02)}" text-anchor="middle" font-size="${labelSize}" style="fill:var(--label-2)">${esc(labelText)}</text>` +
    `<text x="${px(cx)}" y="${px(cy + size * 0.12)}" text-anchor="middle" font-size="${valueSize}" font-weight="600" style="fill:var(--label)">${esc(valueText)}</text>`;

  return shell(size, size, ring + center);
}

/* ------------------------------------------------------------------ *
 * 2. 柱状图
 * ------------------------------------------------------------------ */

/**
 * barChart(items, opts)
 * @param {Array<{label?:string, value:number, value2?:number, color?:string, color2?:string}>} items
 *        value / value2 单位都是「分」。value2 有值时画一根更淡的宽柱在背后（对比收入/支出）。
 * @param {object} [opts]
 * @param {number} [opts.width=320]
 * @param {number} [opts.height=160]
 * @param {boolean} [opts.showValues]  柱顶数值
 * @param {boolean} [opts.showAxis]    Y 轴刻度文字（默认只有 3 条淡网格线）
 * @param {Function} [opts.formatValue]
 * @param {string} [opts.color]        主色（不传按调色板轮转）
 * @param {string} [opts.color2]       次色（默认灰）
 * @param {number} [opts.labelMax=4]   X 轴标签截断长度
 */
export function barChart(items, opts = {}) {
  const o = opts || {};
  const list = (Array.isArray(items) ? items : []).map((raw) => {
    const it = raw || {};
    const hasSecond = it.value2 !== undefined && it.value2 !== null;
    return {
      label: labelOf(it.label),
      value: num(it.value),
      value2: hasSecond ? num(it.value2) : null,
      color: it.color ? str(it.color) : '',
      color2: it.color2 ? str(it.color2) : '',
    };
  });

  const width = clamp(num(o.width) || 320, 80, 4000);
  const height = clamp(num(o.height) || 160, 60, 2400);
  if (!list.length) return shell(width, height);

  const showAxis = !!o.showAxis;
  const showValues = !!o.showValues;
  const fmt = pickFormatter(o);
  const labelMax = o.labelMax === undefined || o.labelMax === null ? 4 : o.labelMax;

  const padL = showAxis ? 46 : 10;
  const padR = 10;
  const padT = showValues ? 22 : 14;
  const padB = 22;
  const plotW = Math.max(1, width - padL - padR);
  const plotH = Math.max(1, height - padT - padB);
  const baseY = padT + plotH;

  // 全是 0（或全负）时用 1 兜底，绝不出现除以 0
  const maxValue = list.reduce((m, it) => {
    const a = it.value > 0 ? it.value : 0;
    const b = it.value2 !== null && it.value2 > 0 ? it.value2 : 0;
    return Math.max(m, a, b);
  }, 0);
  const scale = maxValue > 0 ? maxValue : 1;

  const yOf = (value) => {
    const v = value > 0 ? value : 0;
    return padT + plotH * (1 - v / scale);
  };

  const parts = [];

  // 3 条淡网格线（默认不写刻度文字）
  for (const f of [0.25, 0.5, 0.75]) {
    const y = padT + plotH * f;
    parts.push(
      `<line x1="${px(padL)}" y1="${px(y)}" x2="${px(width - padR)}" y2="${px(y)}" style="stroke:var(--separator)" stroke-width="1" opacity="0.45"/>`
    );
    if (showAxis) {
      parts.push(
        `<text x="${px(padL - 6)}" y="${px(y + 3)}" text-anchor="end" font-size="10" style="fill:var(--label-2)">${esc(fmtValue(fmt, scale * (1 - f)))}</text>`
      );
    }
  }
  parts.push(
    `<line x1="${px(padL)}" y1="${px(baseY)}" x2="${px(width - padR)}" y2="${px(baseY)}" style="stroke:var(--separator)" stroke-width="1" opacity="0.8"/>`
  );

  const slot = plotW / list.length;
  const barW = Math.max(1, Math.min(46, slot * 0.62, Math.max(1, slot - 2)));
  const frontW = Math.max(2, barW * 0.55);

  list.forEach((it, i) => {
    const centerX = padL + slot * (i + 0.5);
    const color = it.color || (o.color ? str(o.color) : PALETTE[i % PALETTE.length]);
    const color2 = it.color2 || (o.color2 ? str(o.color2) : APPLE_COLORS.gray);

    const topMain = yOf(it.value);
    const hMain = Math.max(0, baseY - topMain);
    const topSecond = it.value2 === null ? null : yOf(it.value2);
    const hSecond = topSecond === null ? 0 : Math.max(0, baseY - topSecond);

    // 次序列：更淡、更宽，画在背后
    if (topSecond !== null) {
      const rx = Math.min(5, barW / 2, hSecond / 2);
      parts.push(
        `<rect x="${px(centerX - barW / 2)}" y="${px(topSecond)}" width="${px(barW)}" height="${px(hSecond)}"` +
          ` rx="${px(rx)}" ry="${px(rx)}" fill="${esc(color2)}" opacity="0.35">` +
          `<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, it.value2)}`)}</title></rect>`
      );
    }

    // 主序列：圆角顶
    const rxMain = Math.min(5, frontW / 2, hMain / 2);
    parts.push(
      `<rect x="${px(centerX - frontW / 2)}" y="${px(topMain)}" width="${px(frontW)}" height="${px(hMain)}"` +
        ` rx="${px(rxMain)}" ry="${px(rxMain)}" fill="${esc(color)}">` +
        `<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, it.value)}`)}</title></rect>`
    );

    if (showValues) {
      parts.push(
        `<text x="${px(centerX)}" y="${px(Math.max(padT - 6, topMain - 5))}" text-anchor="middle" font-size="10" style="fill:var(--label)">${esc(fmtValue(fmt, it.value))}</text>`
      );
      if (topSecond !== null && Math.abs(topSecond - topMain) > 13) {
        parts.push(
          `<text x="${px(centerX)}" y="${px(Math.max(padT - 6, topSecond - 5))}" text-anchor="middle" font-size="10" style="fill:var(--label-2)">${esc(fmtValue(fmt, it.value2))}</text>`
        );
      }
    }

    if (it.label) {
      parts.push(
        `<text x="${px(centerX)}" y="${px(height - 6)}" text-anchor="middle" font-size="11" style="fill:var(--label-2)">${esc(truncate(it.label, labelMax))}</text>`
      );
    }
  });

  return shell(width, height, parts.join(''));
}

/* ------------------------------------------------------------------ *
 * 3. 折线图
 * ------------------------------------------------------------------ */

/**
 * lineChart(points, opts)
 * @param {Array<{label?:string, value:number}>} points value 单位「分」
 * @param {object} [opts]
 * @param {number} [opts.width=320]
 * @param {number} [opts.height=140]
 * @param {boolean} [opts.smooth=true]      false = 直线段
 * @param {string} [opts.color]             线色（默认苹果蓝）
 * @param {boolean} [opts.showLastValue]    最后一点显示数值
 * @param {string} [opts.idPrefix='qz-line'] 渐变 id 前缀（同页多次调用也各自唯一）
 * @param {Function} [opts.formatValue]
 */
export function lineChart(points, opts = {}) {
  const o = opts || {};
  const list = (Array.isArray(points) ? points : []).map((raw) => {
    const p = raw || {};
    return { label: labelOf(p.label), value: num(p.value) };
  });

  const width = clamp(num(o.width) || 320, 80, 4000);
  const height = clamp(num(o.height) || 140, 40, 2400);
  const gid = nextId(typeof o.idPrefix === 'string' && o.idPrefix ? o.idPrefix : 'qz-line');

  if (!list.length) return shell(width, height);

  const color = o.color ? str(o.color) : APPLE_COLORS.blue;
  const fmt = pickFormatter(o);
  const smooth = o.smooth !== false;

  const padX = 12;
  const padT = 16;
  const padB = 16;
  const baseY = padT + Math.max(1, height - padT - padB);

  const pts = toPoints(list.map((p) => p.value), width, height, padX, padT);
  pts.forEach((p, i) => { p.label = list[i].label; });

  const n = pts.length;
  const line = smooth ? smoothPath(pts) : straightPath(pts);
  const area = `${line} L${px(pts[n - 1].x)} ${px(baseY)} L${px(pts[0].x)} ${px(baseY)} Z`;

  const defs =
    `<defs><linearGradient id="${esc(gid)}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" style="stop-color:${esc(color)};stop-opacity:0.32"/>` +
    `<stop offset="1" style="stop-color:${esc(color)};stop-opacity:0"/>` +
    `</linearGradient></defs>`;

  const parts = [
    defs,
    `<path d="${area}" fill="url(#${esc(gid)})" stroke="none"/>`,
    `<path d="${line}" fill="none" stroke="${esc(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  ];

  // 数据点；最后一个稍大
  pts.forEach((p, i) => {
    const isLast = i === n - 1;
    const title = `${p.label ? `${p.label} ` : ''}${fmtValue(fmt, p.value)}`;
    parts.push(
      `<circle cx="${px(p.x)}" cy="${px(p.y)}" r="${isLast ? 4 : 2.5}" fill="${esc(color)}"><title>${esc(title)}</title></circle>`
    );
  });

  if (o.showLastValue) {
    const last = pts[n - 1];
    const anchor = last.x > width - 40 ? 'end' : 'middle';
    const x = anchor === 'end' ? width - 4 : clamp(last.x, 20, width - 20);
    const y = Math.max(11, last.y - 10);
    parts.push(
      `<text x="${px(x)}" y="${px(y)}" text-anchor="${anchor}" font-size="11" font-weight="600" style="fill:var(--label)">${esc(fmtValue(fmt, last.value))}</text>`
    );
  }

  return shell(width, height, parts.join(''));
}

/* ------------------------------------------------------------------ *
 * 4. 迷你趋势线
 * ------------------------------------------------------------------ */

/**
 * sparkline(values, opts)
 * @param {Array<number|{label?:string,value:number}>} values  单位「分」（纯数字或对象都行）
 * @param {object} [opts]
 * @param {number} [opts.width=64]
 * @param {number} [opts.height=20]
 * @param {string} [opts.color]
 * 没有坐标轴、没有数据点；有 label 时写进 <title> 供长按查看。
 */
export function sparkline(values, opts = {}) {
  const o = opts || {};
  const list = (Array.isArray(values) ? values : []).map((raw) => {
    if (raw !== null && typeof raw === 'object') {
      return { label: labelOf(raw.label), value: num(raw.value) };
    }
    return { label: '', value: num(raw) };
  });

  const width = clamp(num(o.width) || 64, 8, 4000);
  const height = clamp(num(o.height) || 20, 4, 2000);
  if (!list.length) return shell(width, height);

  const color = o.color ? str(o.color) : APPLE_COLORS.blue;
  const fmt = pickFormatter(o);
  const pad = 2;
  const pts = toPoints(list.map((p) => p.value), width, height, pad, pad);

  let d;
  if (pts.length === 1) {
    d = `M${px(pad)} ${px(pts[0].y)} L${px(width - pad)} ${px(pts[0].y)}`;
  } else {
    d = straightPath(pts);
  }

  const last = list[list.length - 1];
  const title = last.label ? `<title>${esc(`${last.label} ${fmtValue(fmt, last.value)}`)}</title>` : '';

  return shell(
    width,
    height,
    title +
      `<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/* ------------------------------------------------------------------ *
 * 5. 预算进度环
 * ------------------------------------------------------------------ */

/**
 * progressRing(ratio, opts)
 * @param {number} ratio 0..n（可以 >1 表示超支）；画出来的弧最多 100%
 * @param {object} [opts]
 * @param {'ok'|'warn'|'danger'|'none'} [opts.level]
 *        不传则按 ratio 自动判定：>=1 红，>=0.8 橙，其余绿
 * @param {string} [opts.color]   直接指定弧色（优先级高于 level）
 * @param {number} [opts.size=120]
 * @param {number} [opts.thickness=10]
 * @param {string} [opts.label]  圆心小字（灰）
 * @param {string} [opts.value]  圆心大字
 */
export function progressRing(ratio, opts = {}) {
  const o = opts || {};
  const size = clamp(num(o.size) || 120, 40, 2000);
  const thickness = clamp(num(o.thickness) || 10, 2, Math.max(2, size / 2 - 4));
  const value = num(ratio);

  const levels = ['ok', 'warn', 'danger', 'none'];
  const level = levels.includes(o.level)
    ? o.level
    : value >= 1
      ? 'danger'
      : value >= 0.8
        ? 'warn'
        : 'ok';
  const color = o.color ? str(o.color) : LEVEL_COLORS[level];

  const pct = clamp(value, 0, 1);
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(1, (size - thickness) / 2);
  const circumference = 2 * Math.PI * radius;

  const track = `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:var(--fill)" stroke-width="${px(thickness)}"/>`;

  let arc = '';
  if (pct >= 0.999) {
    // 满环：直接画整圆，避免接头处出现叠影
    arc = `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none" style="stroke:${esc(color)}" stroke-width="${px(thickness)}" stroke-linecap="round"/>`;
  } else if (pct > 0) {
    arc =
      `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(radius)}" fill="none"` +
      ` style="stroke:${esc(color)}" stroke-width="${px(thickness)}"` +
      ` stroke-dasharray="${px(pct * circumference)} ${px(circumference)}" stroke-dashoffset="0" stroke-linecap="round"/>`;
  }

  const ring = `<g transform="rotate(-90 ${px(cx)} ${px(cy)})">${track}${arc}</g>`;

  const labelText = labelOf(o.label);
  const valueText = labelOf(o.value);
  const labelSize = Math.max(9, Math.round(size * 0.09));
  const valueSize = Math.max(12, Math.round(size * 0.16));
  const center =
    `<text x="${px(cx)}" y="${px(cy - size * 0.02)}" text-anchor="middle" font-size="${labelSize}" style="fill:var(--label-2)">${esc(labelText)}</text>` +
    `<text x="${px(cx)}" y="${px(cy + size * 0.12)}" text-anchor="middle" font-size="${valueSize}" font-weight="700" style="fill:var(--label)">${esc(valueText)}</text>`;

  return shell(size, size, ring + center);
}

/* ------------------------------------------------------------------ *
 * 6. 百分比堆叠条（横向）
 * ------------------------------------------------------------------ */

/**
 * stackedBar(items, opts)
 * @param {Array<{label?:string, segments:Array<{value:number,color?:string,label?:string}>}>} items
 *        value 单位「分」；每行按比例铺满整条。
 * @param {object} [opts]
 * @param {number} [opts.width=320]
 * @param {number} [opts.rowHeight=20]
 * @param {number} [opts.rowGap=12]
 * @param {number} [opts.labelWidth=56]  左侧行标签宽度，0 = 不显示
 * @param {number} [opts.labelMax=5]     行标签截断长度
 * @param {number} [opts.height]         指定总高（给了就按它压缩行高）
 * @param {boolean} [opts.showLegend]    默认：有 segment.label 时显示（opts.legend 亦可）
 * @param {boolean} [opts.showTotal]     行尾显示该行合计
 * @param {boolean} [opts.showPercent]   段内显示百分比（够宽才画）
 * @param {Function} [opts.formatValue]
 */
export function stackedBar(items, opts = {}) {
  const o = opts || {};
  const list = (Array.isArray(items) ? items : []).map((raw) => {
    const it = raw || {};
    const segs = (Array.isArray(it.segments) ? it.segments : []).map((s) => {
      const seg = s || {};
      const v = num(seg.value);
      return { label: labelOf(seg.label), value: v > 0 ? v : 0, color: seg.color ? str(seg.color) : '' };
    });
    return { label: labelOf(it.label), segments: segs };
  });

  const width = clamp(num(o.width) || 320, 80, 4000);
  const rowGap = clamp(o.rowGap === undefined || o.rowGap === null ? 12 : o.rowGap, 0, 60);
  const labelWidth = clamp(
    o.labelWidth === undefined || o.labelWidth === null ? 56 : o.labelWidth,
    0,
    Math.max(0, width / 2)
  );
  const labelMax = o.labelMax === undefined || o.labelMax === null ? 5 : o.labelMax;
  const showPercent = !!o.showPercent;
  const showTotal = !!o.showTotal;
  const fmt = pickFormatter(o);

  if (!list.length) return shell(width, clamp(num(o.height) || 60, 20, 2000));

  // 图例：按 segment.label 去重，保持出现顺序
  const entries = [];
  const seen = new Set();
  for (const it of list) {
    for (const seg of it.segments) {
      if (!seg.label || seg.value <= 0 || seen.has(seg.label)) continue;
      seen.add(seg.label);
      entries.push({ label: seg.label, color: seg.color || PALETTE[entries.length % PALETTE.length] });
    }
  }
  const legendOpt = o.showLegend === undefined ? o.legend : o.showLegend;
  const showLegend = legendOpt === undefined ? entries.length > 0 : !!legendOpt;
  const legendLines = showLegend ? layoutLegend(entries, Math.max(40, width - 8), 11) : [];
  const legendH = legendLines.length * 18;

  const top = 6;
  const legendBlock = legendH ? legendH + 8 : 0;
  const heightOpt = o.height === undefined || o.height === null ? null : clamp(num(o.height), 24, 20000);

  let rowHeight;
  let height;
  if (heightOpt === null) {
    rowHeight = clamp(num(o.rowHeight) || 20, 6, 200);
    height = clamp(top + list.length * rowHeight + Math.max(0, list.length - 1) * rowGap + legendBlock + 6, 24, 20000);
  } else {
    // 指定了总高：行高按剩余空间压缩
    height = heightOpt;
    const avail = height - top - legendBlock - 6 - Math.max(0, list.length - 1) * rowGap;
    rowHeight = clamp(avail / list.length, 6, 200);
  }

  const barX = labelWidth > 0 ? labelWidth : 4;
  const totalW = showTotal ? 70 : 4;
  const barW = Math.max(1, width - barX - totalW);
  const radius = Math.min(rowHeight / 2, barW / 2, 10);
  const parts = [];

  list.forEach((it, i) => {
    const y = top + i * (rowHeight + rowGap);
    const total = it.segments.reduce((s, seg) => s + (seg.value > 0 ? seg.value : 0), 0);
    const clipId = nextId('qz-stack');

    parts.push(
      `<defs><clipPath id="${esc(clipId)}"><rect x="${px(barX)}" y="${px(y)}" width="${px(barW)}" height="${px(rowHeight)}" rx="${px(radius)}" ry="${px(radius)}"/></clipPath></defs>`
    );
    parts.push(
      `<rect x="${px(barX)}" y="${px(y)}" width="${px(barW)}" height="${px(rowHeight)}" rx="${px(radius)}" ry="${px(radius)}" style="fill:var(--fill)">` +
        `<title>${esc(`${it.label ? `${it.label} ` : ''}${fmtValue(fmt, total)}`)}</title></rect>`
    );

    if (total > 0) {
      let x = barX;
      it.segments.forEach((seg, j) => {
        if (seg.value <= 0) return;
        const w = (seg.value / total) * barW;
        const pct = (seg.value / total) * 100;
        const color = seg.color || PALETTE[j % PALETTE.length];
        const title = `${it.label ? `${it.label} ` : ''}${seg.label ? `${seg.label} ` : ''}${fmtPercent(pct)} ${fmtValue(fmt, seg.value)}`;

        parts.push(
          `<g clip-path="url(#${esc(clipId)})"><rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(rowHeight)}"` +
            ` fill="${esc(color)}"><title>${esc(title)}</title></rect></g>`
        );
        if (showPercent && w > 30) {
          parts.push(
            `<text x="${px(x + w / 2)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="middle" font-size="10" fill="#FFFFFF" opacity="0.95">${esc(fmtPercent(pct))}</text>`
          );
        }
        x += w;
      });
    }

    if (labelWidth > 0 && it.label) {
      parts.push(
        `<text x="${px(labelWidth - 6)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="end" font-size="12" style="fill:var(--label-2)">${esc(truncate(it.label, labelMax))}</text>`
      );
    }

    if (showTotal) {
      parts.push(
        `<text x="${px(width - 4)}" y="${px(y + rowHeight / 2 + 4)}" text-anchor="end" font-size="11" style="fill:var(--label-2)">${esc(fmtValue(fmt, total))}</text>`
      );
    }
  });

  if (legendLines.length) {
    const legendTop = top + list.length * rowHeight + Math.max(0, list.length - 1) * rowGap + 8;
    legendLines.forEach((line, li) => {
      const y = legendTop + li * 18 + 4;
      for (const entry of line) {
        parts.push(`<circle cx="${px(entry.x + 4)}" cy="${px(y)}" r="4" fill="${esc(entry.color)}"/>`);
        parts.push(
          `<text x="${px(entry.x + 12)}" y="${px(y + 4)}" font-size="11" style="fill:var(--label-2)">${esc(entry.label)}</text>`
        );
      }
    });
  }

  return shell(width, height, parts.join(''));
}
