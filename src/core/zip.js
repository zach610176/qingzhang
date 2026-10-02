/**
 * zip.js — dependency-free ZIP reader + raw DEFLATE (RFC 1951) inflater.
 *
 * Targets ES2020+ / Safari 17 (iOS). No imports, no dependencies.
 *
 * Exports:
 *   readZip(arrayBuffer, password)              -> Promise<Entry[]>
 *   inflateRaw(data, offset, compressedLength)  -> Uint8Array
 *   crc32(bytes, seed)                          -> number (unsigned 32-bit)
 *
 * Entry = { name, dir, bytes: Uint8Array, text?: string, crcOk: boolean }
 *
 * Design notes:
 *   - Every bit/byte read in the inflater is bounds-checked; running past the
 *     end throws Error('inflate: unexpected end of stream') instead of
 *     silently returning garbage.
 *   - Sizes always come from the central directory (the local header is zeroed
 *     when general-purpose bit 3 / "data descriptor" is set).
 *   - Unsupported constructs (AES / WinZip encryption, unknown compression
 *     methods) throw explicit errors rather than producing wrong bytes.
 */

/* ================================================================== *
 * CRC-32 (reflected, polynomial 0xEDB88320)
 * ================================================================== */

let _crcTable = null;

function crcTable() {
  if (_crcTable !== null) return _crcTable;
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  _crcTable = t;
  return t;
}

/**
 * CRC-32 of `bytes`. `seed` is the previous return value when hashing data in
 * chunks (seed 0 / undefined == a fresh CRC-32).
 */
export function crc32(bytes, seed) {
  const t = crcTable();
  let c = ((seed === undefined ? 0 : seed) ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    c = (t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * One raw (non-finalised) CRC-32 step — this exact form is what the PKZIP
 * stream cipher is defined in terms of.
 */
function crc32Update(crc, byte) {
  const t = crcTable();
  return ((crc >>> 8) ^ t[(crc ^ byte) & 0xff]) >>> 0;
}

/* ================================================================== *
 * Raw DEFLATE (RFC 1951)
 * ================================================================== */

const LENGTH_BASE = new Uint16Array([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
  67, 83, 99, 115, 131, 163, 195, 227, 258,
]);
const LENGTH_EXTRA = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
  4, 4, 4, 4, 5, 5, 5, 5, 0,
]);
const DIST_BASE = new Uint16Array([
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
  769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
]);
const DIST_EXTRA = new Uint8Array([
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
  9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]);
/** Order in which the 19 code-length code lengths are stored. */
const CLEN_ORDER = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

const FIXED_LIT_LENGTHS = (() => {
  const a = new Uint8Array(288);
  a.fill(8, 0, 144);
  a.fill(9, 144, 256);
  a.fill(7, 256, 280);
  a.fill(8, 280, 288);
  return a;
})();
const FIXED_DIST_LENGTHS = new Uint8Array(32).fill(5);

const MAX_BITS = 15;

/** LSB-first bit reader over data[start, end). */
class BitReader {
  constructor(data, pos, end) {
    this.d = data;
    this.p = pos;
    this.e = end;
    this.b = 0; // bit buffer
    this.n = 0; // number of valid bits in the buffer
  }

  /** Make sure at least `count` bits are buffered, or throw. */
  fill(count) {
    while (this.n < count) {
      if (this.p >= this.e) throw new Error('inflate: unexpected end of stream');
      this.b |= this.d[this.p++] << this.n;
      this.n += 8;
    }
  }

  /** Read `count` bits (LSB first). `count` must be <= 16. */
  take(count) {
    if (count === 0) return 0;
    this.fill(count);
    const v = this.b & ((1 << count) - 1);
    this.b >>>= count;
    this.n -= count;
    return v;
  }

  /**
   * Look at the next `maxBits` bits without consuming them. If the stream ends
   * early the missing high bits are zero-filled; the caller must reject any
   * table hit whose code length exceeds `this.n`.
   */
  peek(maxBits) {
    while (this.n < maxBits && this.p < this.e) {
      this.b |= this.d[this.p++] << this.n;
      this.n += 8;
    }
    return this.b & ((1 << maxBits) - 1);
  }

  drop(count) {
    this.b >>>= count;
    this.n -= count;
  }

  /** Discard bits up to the next byte boundary. */
  alignToByte() {
    const drop = this.n & 7;
    if (drop !== 0) {
      this.b >>>= drop;
      this.n -= drop;
    }
    const whole = this.n >>> 3;
    if (whole !== 0) this.p -= whole;
    this.b = 0;
    this.n = 0;
  }
}

/**
 * Build a canonical Huffman decoding table.
 *
 * Huffman codes are packed MSB-first (RFC 1951 3.1.1) while bits are read
 * LSB-first, so each canonical code is bit-reversed over its own length to get
 * the table index; the entry is then replicated over every slot sharing those
 * low bits, which makes a single lookup valid for any shorter prefix.
 */
function buildTree(lengths, n, what) {
  let maxBits = 0;
  for (let i = 0; i < n; i++) {
    const l = lengths[i];
    if (l > maxBits) maxBits = l;
  }
  if (maxBits > MAX_BITS) throw new Error('inflate: ' + what + ' code length exceeds 15 bits');
  if (maxBits === 0) {
    return { sym: new Uint16Array(1), len: new Uint8Array(1), maxBits: 0 };
  }

  const count = new Int32Array(MAX_BITS + 1);
  for (let i = 0; i < n; i++) if (lengths[i] !== 0) count[lengths[i]]++;

  // Over-subscribed code sets are always invalid. Incomplete sets are left
  // alone: the unused slots stay length-0 and explode if the stream uses them.
  let left = 1;
  for (let b = 1; b <= MAX_BITS; b++) {
    left <<= 1;
    left -= count[b];
    if (left < 0) throw new Error('inflate: over-subscribed ' + what + ' huffman code lengths');
  }

  const nextCode = new Int32Array(MAX_BITS + 1);
  let code = 0;
  for (let b = 1; b <= MAX_BITS; b++) {
    code = (code + count[b - 1]) << 1;
    nextCode[b] = code;
  }

  const size = 1 << maxBits;
  const sym = new Uint16Array(size);
  const len = new Uint8Array(size);

  for (let s = 0; s < n; s++) {
    const l = lengths[s];
    if (l === 0) continue;
    let c = nextCode[l]++;
    let rev = 0;
    for (let i = 0; i < l; i++) {
      rev = (rev << 1) | (c & 1);
      c >>>= 1;
    }
    const step = 1 << l;
    for (let j = rev; j < size; j += step) {
      sym[j] = s;
      len[j] = l;
    }
  }

  return { sym, len, maxBits };
}

let _fixedLit = null;
let _fixedDist = null;

function decodeSym(tree, rd) {
  const maxBits = tree.maxBits;
  if (maxBits === 0) throw new Error('inflate: invalid huffman code (empty tree)');
  const idx = rd.peek(maxBits);
  const l = tree.len[idx];
  if (l === 0) throw new Error('inflate: invalid huffman code');
  if (l > rd.n) throw new Error('inflate: unexpected end of stream');
  const s = tree.sym[idx];
  rd.drop(l);
  return s;
}

const MAX_OUTPUT = 1 << 30; // hard safety ceiling (1 GiB)

/**
 * Core inflater. Returns { out, consumed } where `consumed` is the number of
 * input bytes the deflate stream actually occupied.
 * `limit` bounds the output size (Infinity for no bound).
 */
function inflateCore(data, start, end, limit) {
  const rd = new BitReader(data, start, end);
  let out = new Uint8Array(1 << 16);
  let outPos = 0;

  function ensure(need) {
    const req = outPos + need;
    if (req <= out.length) return;
    if (req > limit) throw new Error('inflate: output exceeds the declared uncompressed size');
    if (req > MAX_OUTPUT) throw new Error('inflate: decompressed data is too large');
    let cap = out.length;
    while (cap < req) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(out.subarray(0, outPos));
    out = next;
  }

  function copyMatch(dist, length) {
    if (dist > outPos) throw new Error('inflate: distance too far back');
    ensure(length);
    const from = outPos - dist;
    if (dist >= length) {
      out.copyWithin(outPos, from, from + length);
      outPos += length;
    } else {
      // Overlapping copy: must be byte-by-byte (RLE style back references).
      for (let i = 0; i < length; i++) out[outPos + i] = out[from + i];
      outPos += length;
    }
  }

  let litTree = null;
  let distTree = null;
  let last = 0;

  do {
    last = rd.take(1);
    const type = rd.take(2);

    if (type === 0) {
      /* ---------- stored (BTYPE 00) ---------- */
      rd.alignToByte();
      if (rd.p + 4 > end) throw new Error('inflate: unexpected end of stream');
      const len = data[rd.p] | (data[rd.p + 1] << 8);
      const nlen = data[rd.p + 2] | (data[rd.p + 3] << 8);
      if ((len ^ 0xffff) !== nlen) throw new Error('inflate: stored block length check failed');
      rd.p += 4;
      if (rd.p + len > end) throw new Error('inflate: unexpected end of stream');
      ensure(len);
      out.set(data.subarray(rd.p, rd.p + len), outPos);
      outPos += len;
      rd.p += len;
      continue;
    }

    if (type === 3) throw new Error('inflate: invalid block type 3 (BTYPE 11)');

    if (type === 1) {
      /* ---------- fixed Huffman (BTYPE 01) ---------- */
      if (_fixedLit === null) {
        _fixedLit = buildTree(FIXED_LIT_LENGTHS, 288, 'fixed literal/length');
        _fixedDist = buildTree(FIXED_DIST_LENGTHS, 32, 'fixed distance');
      }
      litTree = _fixedLit;
      distTree = _fixedDist;
    } else {
      /* ---------- dynamic Huffman (BTYPE 10) ---------- */
      const hlit = rd.take(5) + 257;
      const hdist = rd.take(5) + 1;
      const hclen = rd.take(4) + 4;
      if (hlit > 286 || hdist > 30) throw new Error('inflate: invalid dynamic block header counts');

      const clenLengths = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) clenLengths[CLEN_ORDER[i]] = rd.take(3);
      const clenTree = buildTree(clenLengths, 19, 'code length');

      const total = hlit + hdist;
      const lengths = new Uint8Array(total);
      let i = 0;
      while (i < total) {
        const sym = decodeSym(clenTree, rd);
        if (sym < 16) {
          lengths[i++] = sym;
        } else if (sym === 16) {
          if (i === 0) throw new Error('inflate: repeat code 16 with no previous length');
          const prev = lengths[i - 1];
          const rep = 3 + rd.take(2);
          if (i + rep > total) throw new Error('inflate: code length repeat overflows');
          for (let k = 0; k < rep; k++) lengths[i++] = prev;
        } else if (sym === 17) {
          const rep = 3 + rd.take(3);
          if (i + rep > total) throw new Error('inflate: code length repeat overflows');
          for (let k = 0; k < rep; k++) lengths[i++] = 0;
        } else {
          const rep = 11 + rd.take(7);
          if (i + rep > total) throw new Error('inflate: code length repeat overflows');
          for (let k = 0; k < rep; k++) lengths[i++] = 0;
        }
      }

      if (lengths[256] === 0) throw new Error('inflate: dynamic block has no end-of-block code');
      litTree = buildTree(lengths.subarray(0, hlit), hlit, 'literal/length');
      distTree = buildTree(lengths.subarray(hlit), hdist, 'distance');
    }

    /* ---------- compressed data ---------- */
    for (;;) {
      const sym = decodeSym(litTree, rd);
      if (sym < 256) {
        if (outPos === out.length) ensure(1);
        out[outPos++] = sym;
        continue;
      }
      if (sym === 256) break;

      const li = sym - 257;
      if (li >= 29) throw new Error('inflate: invalid length code ' + sym);
      const length = LENGTH_BASE[li] + rd.take(LENGTH_EXTRA[li]);

      const dsym = decodeSym(distTree, rd);
      if (dsym >= 30) throw new Error('inflate: invalid distance code ' + dsym);
      const dist = DIST_BASE[dsym] + rd.take(DIST_EXTRA[dsym]);

      copyMatch(dist, length);
    }
  } while (last === 0);

  rd.alignToByte();
  return { out: out.slice(0, outPos), consumed: rd.p - start };
}

function toUint8(x) {
  if (x instanceof Uint8Array) return x;
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (x && typeof x.byteLength === 'number') return new Uint8Array(x);
  throw new TypeError('zip: expected an ArrayBuffer or Uint8Array');
}

/**
 * Inflate the raw deflate stream found at data[offset ... offset+compressedLength).
 * Returns a fresh Uint8Array with the decompressed bytes.
 */
export function inflateRaw(data, offset, compressedLength) {
  const u8 = toUint8(data);
  const start = offset === undefined ? 0 : offset | 0;
  const end = compressedLength === undefined ? u8.length : start + (compressedLength | 0);
  if (start < 0 || end < start || end > u8.length) throw new Error('inflate: invalid range');
  return inflateCore(u8, start, end, Infinity).out;
}

/* ================================================================== *
 * PKZIP stream cipher (traditional ZipCrypto)
 * ================================================================== */

function zipCryptKeys(password) {
  // ZipCrypto operates on raw password bytes. ASCII / Latin-1 passwords use the
  // UTF-16 code unit directly; anything else is encoded as UTF-8 (best effort).
  let pwBytes;
  let latin1 = true;
  for (let i = 0; i < password.length; i++) {
    if (password.charCodeAt(i) > 0xff) { latin1 = false; break; }
  }
  if (latin1) {
    pwBytes = new Uint8Array(password.length);
    for (let i = 0; i < password.length; i++) pwBytes[i] = password.charCodeAt(i) & 0xff;
  } else {
    pwBytes = new TextEncoder().encode(password);
  }

  let k0 = 0x12345678 >>> 0;
  let k1 = 0x23456789 >>> 0;
  let k2 = 0x34567890 >>> 0;
  for (let i = 0; i < pwBytes.length; i++) {
    const c = pwBytes[i];
    k0 = crc32Update(k0, c);
    k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
    k2 = crc32Update(k2, (k1 >>> 24) & 0xff);
  }
  return [k0, k1, k2];
}

function zipCryptDecryptByte(k2) {
  const temp = (k2 | 2) & 0xffff;
  return ((temp * (temp ^ 1)) >>> 8) & 0xff;
}

function zipCryptUpdate(keys, plain) {
  keys[0] = crc32Update(keys[0], plain);
  keys[1] = (Math.imul((keys[1] + (keys[0] & 0xff)) >>> 0, 134775813) + 1) >>> 0;
  keys[2] = crc32Update(keys[2], (keys[1] >>> 24) & 0xff);
}

function zipCryptDecode(src, start, end, keys) {
  const out = new Uint8Array(end - start);
  for (let i = start; i < end; i++) {
    const plain = (src[i] ^ zipCryptDecryptByte(keys[2])) & 0xff;
    out[i - start] = plain;
    zipCryptUpdate(keys, plain);
  }
  return out;
}

/* ================================================================== *
 * Text decoding helpers
 * ================================================================== */

const UTF8 = new TextDecoder('utf-8', { fatal: false });
const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true });
let _gbk;
let _gbkTried = false;

function gbkDecoder() {
  if (!_gbkTried) {
    _gbkTried = true;
    try {
      _gbk = new TextDecoder('gbk');
    } catch (e) {
      _gbk = null;
    }
  }
  return _gbk;
}

function tryDecodeGbk(bytes) {
  const dec = gbkDecoder();
  if (!dec) return null;
  try {
    return dec.decode(bytes);
  } catch (e) {
    return null;
  }
}

function hasReplacement(s) {
  return s.indexOf('\uFFFD') !== -1;
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Decode a filename: honour the UTF-8 flag, fall back to GBK for legacy zips. */
function decodeName(bytes, utf8Flag) {
  if (utf8Flag) {
    try {
      return UTF8_STRICT.decode(bytes);
    } catch (e) {
      /* fall through to the lenient path */
    }
  }
  const asUtf8 = UTF8.decode(bytes);
  if (!hasReplacement(asUtf8)) return asUtf8;
  const asGbk = tryDecodeGbk(bytes);
  if (asGbk !== null && !hasReplacement(asGbk)) return asGbk;
  return asUtf8;
}

const TEXT_EXT = /\.(csv|txt|json|xml)$/i;

function isTextName(name) {
  return TEXT_EXT.test(name);
}

/** UTF-8 first; if it does not decode cleanly, try GBK. BOM is stripped. */
function decodeTextBytes(bytes) {
  const asUtf8 = stripBom(UTF8.decode(bytes));
  if (!hasReplacement(asUtf8)) return asUtf8;
  const asGbk = tryDecodeGbk(bytes);
  if (asGbk !== null && !hasReplacement(asGbk)) return stripBom(asGbk);
  return asUtf8;
}

/* ================================================================== *
 * ZIP container
 * ================================================================== */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOCATOR = 0x07064b50;

const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_UTF8 = 0x0800;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const METHOD_AES = 99;

function readU64(dv, off) {
  const lo = dv.getUint32(off, true);
  const hi = dv.getUint32(off + 4, true);
  // 0x200000 * 2^32 == 2^53, the largest exactly representable integer.
  if (hi >= 0x200000) throw new Error('zip: ZIP64 value exceeds 2^53 bytes');
  return hi * 0x100000000 + lo;
}

function basename(name) {
  const i = name.lastIndexOf('/');
  return i === -1 ? name : name.slice(i + 1);
}

function shouldSkip(name) {
  if (name === '__MACOSX/' || name.startsWith('__MACOSX/')) return true;
  if (basename(name) === '.DS_Store') return true;
  return false;
}

/**
 * Read a .zip archive.
 *
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @param {string} [password]  ZipCrypto password ('' / undefined = none)
 * @returns {Promise<Array<{name:string, dir:boolean, bytes:Uint8Array, text?:string, crcOk:boolean}>>}
 */
export async function readZip(arrayBuffer, password) {
  const u8 = toUint8(arrayBuffer);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const len = u8.length;
  if (len < 22) throw new Error('zip: file is too small to be a zip archive');

  const pw = (typeof password === 'string' && password.length > 0) ? password : null;

  /* ---------------- End of Central Directory ---------------- */
  let eocd = -1;
  const lowest = Math.max(0, len - 65557);
  for (let i = len - 22; i >= lowest; i--) {
    if (dv.getUint32(i, true) === SIG_EOCD) {
      const commentLen = dv.getUint16(i + 20, true);
      if (i + 22 + commentLen <= len) { eocd = i; break; }
    }
  }
  if (eocd < 0) throw new Error('zip: end of central directory record not found (not a zip file?)');

  let totalEntries = dv.getUint16(eocd + 10, true);
  let cdSize = dv.getUint32(eocd + 12, true);
  let cdOffset = dv.getUint32(eocd + 16, true);

  /* ---------------- ZIP64 ---------------- */
  const locatorPos = eocd - 20;
  if (locatorPos >= 0 && dv.getUint32(locatorPos, true) === SIG_EOCD64_LOCATOR) {
    const z64Offset = readU64(dv, locatorPos + 8);
    if (z64Offset < 0 || z64Offset + 56 > len) {
      throw new Error('zip: ZIP64 end of central directory record is out of range');
    }
    if (dv.getUint32(z64Offset, true) !== SIG_EOCD64) {
      throw new Error('zip: invalid ZIP64 end of central directory record signature');
    }
    totalEntries = readU64(dv, z64Offset + 32);
    cdSize = readU64(dv, z64Offset + 40);
    cdOffset = readU64(dv, z64Offset + 48);
  } else if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('zip: ZIP64 archive detected but the ZIP64 end of central directory locator is missing');
  }

  if (cdOffset + cdSize > len) {
    throw new Error('zip: central directory is out of range (truncated or corrupt file)');
  }

  /* ---------------- Central directory ---------------- */
  const entries = [];
  let p = cdOffset;

  for (let n = 0; n < totalEntries; n++) {
    if (p + 46 > len) throw new Error('zip: truncated central directory');
    if (dv.getUint32(p, true) !== SIG_CENTRAL) {
      throw new Error('zip: bad central directory entry signature at offset ' + p);
    }

    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const modTime = dv.getUint16(p + 12, true);
    const crc = dv.getUint32(p + 16, true);
    let compSize = dv.getUint32(p + 20, true);
    let uncompSize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    let localOffset = dv.getUint32(p + 42, true);

    const nameStart = p + 46;
    const extraStart = nameStart + nameLen;
    if (extraStart + extraLen + commentLen > len) {
      throw new Error('zip: truncated central directory entry');
    }

    const nameBytes = u8.subarray(nameStart, extraStart);
    const extra = u8.subarray(extraStart, extraStart + extraLen);

    /* ---- ZIP64 extended information extra field (0x0001) ---- */
    if (uncompSize === 0xffffffff || compSize === 0xffffffff || localOffset === 0xffffffff) {
      let ex = 0;
      let found = false;
      while (ex + 4 <= extra.length) {
        const id = extra[ex] | (extra[ex + 1] << 8);
        const size = extra[ex + 2] | (extra[ex + 3] << 8);
        if (ex + 4 + size > extra.length) break;
        if (id === 0x0001) {
          const edv = new DataView(extra.buffer, extra.byteOffset + ex + 4, size);
          let q = 0;
          if (uncompSize === 0xffffffff) {
            if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
            uncompSize = readU64(edv, q);
            q += 8;
          }
          if (compSize === 0xffffffff) {
            if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
            compSize = readU64(edv, q);
            q += 8;
          }
          if (localOffset === 0xffffffff) {
            if (q + 8 > size) throw new Error('zip: malformed ZIP64 extra field');
            localOffset = readU64(edv, q);
            q += 8;
          }
          found = true;
          break;
        }
        ex += 4 + size;
      }
      if (!found || uncompSize === 0xffffffff || compSize === 0xffffffff || localOffset === 0xffffffff) {
        throw new Error('zip: ZIP64 entry is missing its extended information extra field');
      }
    }

    const name = decodeName(nameBytes, (flags & FLAG_UTF8) !== 0);
    p = extraStart + extraLen + commentLen;

    if (shouldSkip(name)) continue;

    const dir = name.endsWith('/');
    const encrypted = (flags & FLAG_ENCRYPTED) !== 0;
    const hasDescriptor = (flags & FLAG_DATA_DESCRIPTOR) !== 0;

    if (method === METHOD_AES) {
      throw new Error('zip: AES-encrypted zip entries (compression method 99 / WinZip AES) are unsupported');
    }

    /* ---- local file header ---- */
    if (localOffset + 30 > len) throw new Error('zip: local file header out of range for "' + name + '"');
    if (dv.getUint32(localOffset, true) !== SIG_LOCAL) {
      throw new Error('zip: bad local file header signature for "' + name + '"');
    }
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const localExtraLen = dv.getUint16(localOffset + 28, true);
    let dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart > len) throw new Error('zip: local file header is truncated for "' + name + '"');

    let raw = null;

    /* Normal case: the central directory always carries the authoritative
     * sizes, so a data descriptor simply needs nothing extra from us. Some
     * streaming writers nonetheless leave the sizes at zero; recover those by
     * inflating to the end of the stream, but only accept the result when the
     * CRC proves it was the right data. */
    if (hasDescriptor && compSize === 0 && uncompSize === 0 && method === METHOD_DEFLATE && !encrypted && !dir) {
      raw = inflateCore(u8, dataStart, len, MAX_OUTPUT).out;
      if (crc32(raw) !== crc) {
        throw new Error('zip: the central directory has no sizes for the data-descriptor entry "' + name + '"');
      }
    } else {
      let payloadStart = dataStart;
      const payloadEnd = dataStart + compSize;
      if (payloadEnd > len) throw new Error('zip: file data is out of range for "' + name + '" (truncated file)');

      if (encrypted) {
        if (!pw) throw new Error('zip: "' + name + '" is encrypted but no password was supplied');
        if (payloadEnd - payloadStart < 12) throw new Error('zip: encrypted entry "' + name + '" is too short');
        const keys = zipCryptKeys(pw);
        const header = zipCryptDecode(u8, payloadStart, payloadStart + 12, keys);
        // Last header byte: CRC high byte, or (with a data descriptor) the high
        // byte of the DOS modification time.
        const expected = hasDescriptor ? ((modTime >>> 8) & 0xff) : ((crc >>> 24) & 0xff);
        if (header[11] !== expected) throw new Error('密码不正确');
        payloadStart += 12;
        const decrypted = zipCryptDecode(u8, payloadStart, payloadEnd, keys);

        if (method === METHOD_STORE) raw = decrypted;
        else if (method === METHOD_DEFLATE) {
          raw = inflateCore(decrypted, 0, decrypted.length, uncompSize * 2 + 65536).out;
        } else {
          throw new Error('zip: unsupported compression method ' + method + ' for "' + name + '"');
        }
      } else {
        const payload = u8.subarray(payloadStart, payloadEnd);
        if (method === METHOD_STORE) raw = payload;
        else if (method === METHOD_DEFLATE) {
          raw = inflateCore(payload, 0, payload.length, uncompSize * 2 + 65536).out;
        } else {
          throw new Error('zip: unsupported compression method ' + method + ' for "' + name + '"');
        }
      }
    }

    const entry = {
      name,
      dir,
      bytes: raw,
      crcOk: crc32(raw) === crc,
    };
    if (!dir && isTextName(name)) entry.text = decodeTextBytes(raw);
    entries.push(entry);
  }

  return entries;
}
