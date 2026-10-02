/**
 * 轻账 · 备份加密
 *
 * 备份文件是一串密文，只有用你设置的密码才能打开。
 * 用的是浏览器内置的加密能力（Web Crypto），不依赖任何第三方库。
 *
 * 算法：PBKDF2-SHA256 派生密钥（31 万次迭代）+ AES-256-GCM 加密
 * —— 这两个都是业界标准做法，iPhone 的加密也用类似机制。
 *
 * ⚠️ 密码丢了就打不开备份，没有任何后门，这是设计如此。
 */

const MAGIC = 'QZBAK1';          // 文件头标识
const PBKDF2_ITERATIONS = 310000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBytes(x) {
  return x instanceof Uint8Array ? x : new Uint8Array(x);
}

function bytesToBase64(bytes) {
  const b = toBytes(bytes);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < b.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, b.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 加密任意可 JSON 化的数据。
 * @param {any} data
 * @param {string} password
 * @returns {Promise<string>} 一个以 QZBAK1 开头的文本，可以直接存成文件
 */
export async function encryptBackup(data, password) {
  if (!password || password.length < 4) {
    throw new Error('备份密码至少要 4 位');
  }
  if (!globalThis.crypto || !crypto.subtle) {
    throw new Error('当前环境不支持加密（需要 HTTPS 或 localhost 打开本应用）');
  }

  const json = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(json);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const header = {
    v: 1,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    createdAt: Date.now(),
    plainBytes: plaintext.length,
  };

  const envelope = {
    magic: MAGIC,
    header,
    payload: bytesToBase64(cipher),
  };

  // 压缩一下：JSON + base64 体积不小，用 gzip 能省一半左右
  const packed = await maybeGzip(JSON.stringify(envelope));
  return MAGIC + '\n' + bytesToBase64(packed);
}

/**
 * 解密备份。密码错会抛「密码不正确或文件已损坏」。
 */
export async function decryptBackup(text, password) {
  if (!text || typeof text !== 'string') throw new Error('备份内容为空');
  const trimmed = text.trim();
  if (!trimmed.startsWith(MAGIC)) {
    throw new Error('这不是轻账的备份文件');
  }
  const body = trimmed.slice(MAGIC.length).trim();
  const packed = base64ToBytes(body);
  const raw = await maybeGunzip(packed);

  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder().decode(raw));
  } catch (e) {
    throw new Error('备份文件内容损坏，无法解析');
  }
  if (!envelope || envelope.magic !== MAGIC) throw new Error('这不是轻账的备份文件');

  const { header, payload } = envelope;
  if (!header || !payload) throw new Error('备份文件缺少必要字段');

  const salt = base64ToBytes(header.salt);
  const iv = base64ToBytes(header.iv);
  const key = await deriveKey(password, salt, header.iter || PBKDF2_ITERATIONS);

  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(payload));
  } catch (e) {
    throw new Error('密码不正确，或者备份文件已损坏');
  }

  try {
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    throw new Error('解密成功但内容不是有效数据');
  }
}

/* ------------------------------------------------------------------ *
 * 可选的 gzip 压缩（Safari 16.4+ 才支持 CompressionStream）
 * ------------------------------------------------------------------ */

async function maybeGzip(str) {
  const bytes = new TextEncoder().encode(str);
  if (typeof CompressionStream === 'undefined') return bytes;
  try {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    return bytes;
  }
}

async function maybeGunzip(bytes) {
  const b = toBytes(bytes);
  // gzip magic number 1f 8b
  if (!(b.length > 2 && b[0] === 0x1f && b[1] === 0x8b)) return b;
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('这个浏览器不支持解压备份文件，请升级 iOS 后重试');
  }
  try {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(b);
    writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    throw new Error('备份文件解压失败：' + String(e && e.message || e));
  }
}

/* ------------------------------------------------------------------ *
 * 文件读写辅助
 * ------------------------------------------------------------------ */

export const BACKUP_EXT = '.qzbak';

export function backupFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  return `轻账备份-${stamp}${BACKUP_EXT}`;
}

/** 触发浏览器下载 / 分享 */
export async function saveTextFile(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });

  // iOS 上优先用系统分享面板，可以「存储到文件 → iCloud Drive」
  const file = new File([blob], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // 分享失败就退回下载
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
  return 'downloaded';
}

export async function readTextFile(file) {
  const buf = await file.arrayBuffer();
  const { decodeText } = await import('./csv.js');
  return decodeText(buf).text;
}
