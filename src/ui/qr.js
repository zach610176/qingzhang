/**
 * 轻账 · 二维码生成（纯 JS，无第三方库）
 *
 * 为什么要这个：服务器地址是 http://192.168.x.x:8412/ 这种，
 * 让用户在手机上手输太痛苦了。生成二维码扫一下就行。
 *
 * 实现的是标准 QR Code Model 2 的 Byte 模式（UTF-8），
 * 带里德-所罗门纠错，级别 M。
 */

/* ------------------------------------------------------------------ *
 * 1. 里德-所罗门纠错码
 * ------------------------------------------------------------------ */

// GF(256) 上的指数/对数表，本原多项式 0x11D
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** 生成 degree 次的生成多项式 */
function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1);
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** 计算纠错码字 */
function rsEncode(data, ecCount) {
  const gen = rsGenerator(ecCount);
  const res = new Array(data.length + ecCount).fill(0);
  for (let i = 0; i < data.length; i++) res[i] = data[i];

  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

/* ------------------------------------------------------------------ *
 * 2. 版本参数（纠错级别 M）
 * ------------------------------------------------------------------ */

/** 每个版本在纠错级别 M 下的 [总码字数, 数据码字数, 分块数] */
const VERSIONS_M = {
  1: { total: 26, data: 16, blocks: 1 },
  2: { total: 44, data: 28, blocks: 1 },
  3: { total: 70, data: 44, blocks: 1 },
  4: { total: 100, data: 64, blocks: 2 },
  5: { total: 134, data: 86, blocks: 2 },
  6: { total: 172, data: 108, blocks: 4 },
  7: { total: 196, data: 124, blocks: 4 },
  8: { total: 242, data: 154, blocks: 2 },
  9: { total: 292, data: 182, blocks: 3 },
  10: { total: 346, data: 216, blocks: 4 },
  11: { total: 404, data: 254, blocks: 1 },
  12: { total: 466, data: 290, blocks: 6 },
  13: { total: 532, data: 334, blocks: 8 },
  14: { total: 581, data: 365, blocks: 4 },
  15: { total: 655, data: 415, blocks: 5 },
  16: { total: 733, data: 453, blocks: 7 },
  17: { total: 815, data: 507, blocks: 10 },
  18: { total: 901, data: 563, blocks: 9 },
  19: { total: 991, data: 627, blocks: 3 },
  20: { total: 1085, data: 669, blocks: 3 },
};

/** 每个版本的对齐图案中心坐标 */
const ALIGN_POS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
  15: [6, 26, 48, 70], 16: [6, 26, 50, 74], 17: [6, 30, 54, 78],
  18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90],
};

/* ------------------------------------------------------------------ *
 * 3. 位流
 * ------------------------------------------------------------------ */

class BitBuffer {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
  toBytes() {
    const out = [];
    const padded = this.bits.slice();
    while (padded.length % 8 !== 0) padded.push(0);
    for (let i = 0; i < padded.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | padded[i + j];
      out.push(b);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * 4. 主流程
 * ------------------------------------------------------------------ */

/**
 * 生成二维码矩阵
 * @param {string} text
 * @returns {{size:number, modules:boolean[][], version:number}}
 */
export function encodeQR(text) {
  const bytes = new TextEncoder().encode(String(text));

  // 选版本（Byte 模式，纠错级别 M）
  let version = 0;
  for (let v = 1; v <= 20; v++) {
    const cap = VERSIONS_M[v].data;
    // 模式指示符 4 bit + 字符计数 8 bit（版本 1-9）或 16 bit（10+）+ 数据 + 结束符
    const overhead = v <= 9 ? 12 : 20;
    if (bytes.length * 8 + overhead <= cap * 8) { version = v; break; }
  }
  if (!version) throw new Error('内容太长，放不进二维码（最多约 600 字节）');

  const spec = VERSIONS_M[version];

  /* ---- 位流 ---- */
  const buf = new BitBuffer();
  buf.put(0b0100, 4);                       // Byte 模式
  buf.put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) buf.put(b, 8);

  // 结束符
  const capacity = spec.data * 8;
  const term = Math.min(4, capacity - buf.length);
  buf.put(0, term);
  // 补齐到字节边界
  while (buf.length % 8 !== 0) buf.put(0, 1);

  const dataBytes = buf.toBytes();
  // 填充码字 0xEC / 0x11 交替
  let padToggle = 0;
  while (dataBytes.length < spec.data) {
    dataBytes.push(padToggle === 0 ? 0xEC : 0x11);
    padToggle ^= 1;
  }

  /* ---- 分块 + 纠错 ---- */
  const blockCount = spec.blocks;
  const totalDataCw = spec.data;
  const ecPerBlock = Math.floor((spec.total - spec.data) / blockCount);
  const shortBlockLen = Math.floor(totalDataCw / blockCount);
  const numLongBlocks = totalDataCw % blockCount;

  const dataBlocks = [];
  const ecBlocks = [];
  let pos = 0;
  for (let b = 0; b < blockCount; b++) {
    const len = shortBlockLen + (b >= blockCount - numLongBlocks && numLongBlocks > 0 ? 1 : 0);
    const block = dataBytes.slice(pos, pos + len);
    pos += len;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
  }

  // 交织
  const finalCw = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlocks) if (i < b.length) finalCw.push(b[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of ecBlocks) if (i < b.length) finalCw.push(b[i]);
  }

  /* ---- 构建矩阵 ---- */
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const setModule = (r, c, v) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    modules[r][c] = !!v;
    reserved[r][c] = true;
  };

  // 定位图案 + 分隔符
  const placeFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(rr, cc, inRing || inCore);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 对齐图案
  const aligns = ALIGN_POS[version] || [];
  for (const r of aligns) {
    for (const c of aligns) {
      // 跳过与定位图案重叠的位置
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isRing = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          setModule(r + dr, c + dc, isRing || isCenter);
        }
      }
    }
  }

  // 定时图案
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // 固定黑的模块（规范里明确规定）
  setModule(size - 8, 8, true);

  // 预留格式信息区域
  for (let i = 0; i <= 8; i++) {
    if (!reserved[8][i]) { modules[8][i] = false; reserved[8][i] = true; }
    if (!reserved[i][8]) { modules[i][8] = false; reserved[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][size - 1 - i]) { modules[8][size - 1 - i] = false; reserved[8][size - 1 - i] = true; }
    if (!reserved[size - 1 - i][8]) { modules[size - 1 - i][8] = false; reserved[size - 1 - i][8] = true; }
  }

  // 版本信息（版本 >= 7）
  if (version >= 7) {
    const vBits = versionInfoBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      setModule(r, size - 11 + c, bit);
      setModule(size - 11 + c, r, bit);
    }
  }

  /* ---- 数据填充（之字形） ---- */
  let bitIndex = 0;
  const totalBits = finalCw.length * 8;
  const nextBit = () => {
    if (bitIndex >= totalBits) return 0;   // 剩余位补 0（规范允许）
    const b = finalCw[bitIndex >> 3];
    const bit = (b >>> (7 - (bitIndex & 7))) & 1;
    bitIndex++;
    return bit;
  };

  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;   // 跳过定时图案那一列
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (reserved[row][c]) continue;
        modules[row][c] = nextBit() === 1;
      }
    }
    upward = !upward;
  }

  /* ---- 格式信息 ---- */
  const formatBits = formatInfoBits(0b00); // 纠错级别 M => 00
  const fmtPositions1 = [];
  for (let i = 0; i <= 5; i++) fmtPositions1.push([8, i]);
  fmtPositions1.push([8, 7]);
  fmtPositions1.push([8, 8]);
  fmtPositions1.push([7, 8]);
  for (let i = 5; i >= 0; i--) fmtPositions1.push([i, 8]);

  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> i) & 1) === 1;
    const [r1, c1] = fmtPositions1[i];
    modules[r1][c1] = bit;
    // 第二份副本
    if (i < 8) modules[size - 1 - i][8] = bit;
    else modules[8][size - 15 + i] = bit;
  }
  modules[size - 8][8] = true;

  /* ---- 掩码 ---- */
  // 对 8 种掩码各算一次罚分，取罚分最低的（这样二维码更容易被扫到）
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const cand = modules.map((row) => row.slice());
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isFunctionModule(r, c, size, version)) continue;
        if (maskBit(mask, r, c)) cand[r][c] = !cand[r][c];
      }
    }
    // 掩码编号要写回格式信息区
    applyFormat(cand, size, formatInfoBits(mask));
    const score = penalty(cand, size);
    if (!best || score < best.score) best = { score, matrix: cand, mask };
  }

  return { size, modules: best.matrix, version, mask: best.mask };
}

/** 判断某个位置是不是功能图案（不能被掩码翻转） */
function isFunctionModule(r, c, size, version) {
  // 定位图案 + 分隔符
  if (r < 9 && c < 9) return true;
  if (r < 9 && c >= size - 8) return true;
  if (r >= size - 8 && c < 9) return true;
  // 定时图案
  if (r === 6 || c === 6) return true;
  // 对齐图案
  const aligns = ALIGN_POS[version] || [];
  for (const ar of aligns) {
    for (const ac of aligns) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
      if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
    }
  }
  // 版本信息
  if (version >= 7) {
    if (r < 6 && c >= size - 11 && c < size - 8) return true;
    if (c < 6 && r >= size - 11 && r < size - 8) return true;
  }
  return false;
}

function maskBit(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

/** 把格式信息写进矩阵 */
function applyFormat(m, size, bits) {
  const positions1 = [];
  for (let i = 0; i <= 5; i++) positions1.push([8, i]);
  positions1.push([8, 7]);
  positions1.push([8, 8]);
  positions1.push([7, 8]);
  for (let i = 5; i >= 0; i--) positions1.push([i, 8]);

  for (let i = 0; i < 15; i++) {
    const bit = ((bits >>> i) & 1) === 1;
    const [r1, c1] = positions1[i];
    m[r1][c1] = bit;
    if (i < 8) m[size - 1 - i][8] = bit;
    else m[8][size - 15 + i] = bit;
  }
  m[size - 8][8] = true;
}

/** 15 位格式信息 = 5 位数据 + BCH 纠错 + 掩码 0x5412 */
function formatInfoBits(mask) {
  const data = (0b00 << 3) | mask;   // 00 = 纠错级别 M
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18 位版本信息（版本 7 以上） */
function versionInfoBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  return (version << 12) | rem;
}

/* ------------------------------------------------------------------ *
 * 5. 掩码罚分（规范里的四条规则）
 * ------------------------------------------------------------------ */

function penalty(m, size) {
  let score = 0;

  // 规则1：同色连续 5 个以上
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (m[r][c] === m[r][c - 1]) { run++; }
      else { if (run >= 5) score += 3 + (run - 5); run = 1; }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (m[r][c] === m[r - 1][c]) { run++; }
      else { if (run >= 5) score += 3 + (run - 5); run = 1; }
    }
    if (run >= 5) score += 3 + (run - 5);
  }

  // 规则2：2x2 同色块
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }

  // 规则3：出现 1:1:3:1:1 的比例图案
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const check = (get, i) => {
    for (let k = 0; k < 11; k++) if (get(i + k) !== pat1[k]) return false;
    return true;
  };
  const check2 = (get, i) => {
    for (let k = 0; k < 11; k++) if (get(i + k) !== pat2[k]) return false;
    return true;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const get = (i) => m[r][i];
      if (check(get, c) || check2(get, c)) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      const get = (i) => m[i][c];
      if (check(get, r) || check2(get, r)) score += 40;
    }
  }

  // 规则4：黑白比例偏离 50%
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

/* ------------------------------------------------------------------ *
 * 6. 输出
 * ------------------------------------------------------------------ */

/**
 * 生成二维码 SVG 字符串
 * @param {string} text
 * @param {object} [opts] { size, margin, dark, light, quietZone }
 */
export function qrSvg(text, opts = {}) {
  const { size = 220, margin = 4, dark = '#000000', light = '#FFFFFF' } = opts;

  let qr;
  try {
    qr = encodeQR(text);
  } catch (e) {
    return `<div style="color:#FF3B30;font-size:13px">二维码生成失败：${escapeHtml(e.message)}</div>`;
  }

  const total = qr.size + margin * 2;
  let path = '';
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) path += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="二维码">
  <rect width="${total}" height="${total}" fill="${light}"/>
  <path d="${path}" fill="${dark}"/>
</svg>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 生成终端里能看的二维码（用半角字符块），方便在命令行里直接扫。
 * 白色用两个空格，黑色用 ██，这样在深色终端里也是反的，效果最好。
 */
export function qrTerminal(text) {
  const qr = encodeQR(text);
  const m = 2;
  const size = qr.size + m * 2;
  const rows = [];
  for (let r = 0; r < size; r++) {
    let line = '';
    for (let c = 0; c < size; c++) {
      const rr = r - m, cc = c - m;
      const on = rr >= 0 && cc >= 0 && rr < qr.size && cc < qr.size && qr.modules[rr][cc];
      line += on ? '██' : '  ';
    }
    rows.push(line);
  }
  return rows.join('\n');
}
