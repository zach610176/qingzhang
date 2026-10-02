/**
 * 轻账 · 本地数据库
 *
 * 数据全部存在浏览器的 IndexedDB 里，不联网、不上传。
 * IndexedDB 是浏览器自带的数据库，可以理解成「App 内部的一个小文件柜」。
 */

const DB_NAME = 'qingzhang';
const DB_VERSION = 1;

export const STORE = {
  TX: 'tx',           // 交易流水
  RULES: 'rules',     // 用户自己教的分类规则（商户 → 分类）
  SETTINGS: 'settings', // 设置项（键值对）
  BATCHES: 'batches', // 导入批次，用于「撤销上次导入」
  RECURRING: 'recurring', // 周期账单模板
  META: 'meta',       // 其他元数据
};

let _dbPromise = null;

/**
 * 当前是不是 Node（跑测试用的），而不是真正的浏览器。
 *
 * 为什么需要这个：测试要在 Node 里跑界面和统计逻辑，但 Node 没有 IndexedDB。
 * 早期做法是用 Node 的模块加载钩子把 db.js 换成内存实现，
 * 但那个做法不可靠 —— ES 模块的静态依赖在钩子生效之前就已经解析了，
 * 于是「真 db」和「内存 db」会同时存在两份实例，谁拿到哪一份取决于导入顺序。
 * 现在改成在 db.js 内部判断环境，不管谁导入都只有一种行为。
 */
function isNodeEnv() {
  return typeof process !== 'undefined' && !!(process.versions && process.versions.node);
}

/**
 * IndexedDB 的内存替身，只实现 db.js 用到的那些 API。
 *
 * 它模拟的是「事务」这一层：写操作在 tx 完成时才生效，
 * 读操作把结果挂在 request.result 上 —— 和真实 IndexedDB 的时序保持一致，
 * 这样上层代码不用为了测试写两套逻辑。
 */
function createMemoryIDB() {
  /** storeName → Map(key → value) */
  const data = {
    [STORE.TX]: new Map(),
    [STORE.RULES]: new Map(),
    [STORE.SETTINGS]: new Map(),
    [STORE.BATCHES]: new Map(),
    [STORE.RECURRING]: new Map(),
    [STORE.META]: new Map(),
  };
  const keyPathOf = {
    [STORE.TX]: 'id',
    [STORE.RULES]: 'key',
    [STORE.SETTINGS]: 'key',
    [STORE.BATCHES]: 'id',
    [STORE.RECURRING]: 'id',
    [STORE.META]: 'key',
  };

  const later = (fn) => setTimeout(fn, 0);
  const req = () => ({ result: undefined, onsuccess: null, onerror: null });

  function makeStore(name) {
    const map = () => {
      if (!data[name]) throw new Error('内存后端里没有这个 store：' + name);
      return data[name];
    };
    const kp = keyPathOf[name];

    return {
      put(value) {
        const r = req();
        map().set(value[kp], value);
        r.result = value[kp];
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      get(key) {
        const r = req();
        r.result = map().get(key);
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      getAll() {
        const r = req();
        r.result = [...map().values()];
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      delete(key) {
        const r = req();
        map().delete(key);
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      clear() {
        const r = req();
        map().clear();
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      count() {
        const r = req();
        r.result = map().size;
        later(() => r.onsuccess && r.onsuccess());
        return r;
      },
      /** 简易索引：只支持 ts 这一个（txInRange 用到） */
      index() {
        return {
          openCursor(range) {
            const r = req();
            let list = [...map().values()];
            if (range && typeof range.lower === 'number') {
              const lo = range.lowerOpen ? (v) => v > range.lower : (v) => v >= range.lower;
              const hi = range.upper === undefined
                ? () => true
                : (range.upperOpen ? (v) => v < range.upper : (v) => v <= range.upper);
              list = list.filter((v) => lo(v.ts) && hi(v.ts));
            }
            list.sort((a, b) => a.ts - b.ts);
            let i = 0;
            const step = () => {
              if (i >= list.length) { r.result = null; r.onsuccess && r.onsuccess(); return; }
              r.result = { value: list[i], continue: () => { i++; later(step); } };
              r.onsuccess && r.onsuccess();
            };
            later(step);
            return r;
          },
          getAll() {
            const r = req();
            r.result = [...map().values()];
            later(() => r.onsuccess && r.onsuccess());
            return r;
          },
        };
      },
    };
  }

  return {
    transaction(names) {
      const list = Array.isArray(names) ? names : [names];
      const stores = {};
      for (const n of list) stores[n] = makeStore(n);
      const tx = {
        objectStore: (n) => {
          if (!stores[n]) stores[n] = makeStore(n);
          return stores[n];
        },
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      // 所有请求都排在微任务之后，写完再触发 complete —— 和真实行为一致
      later(() => later(() => tx.oncomplete && tx.oncomplete()));
      return tx;
    },
  };
}

function openDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    // Node 环境（跑测试）没有 IndexedDB，用内存后端顶上
    if (isNodeEnv() && typeof indexedDB === 'undefined') {
      resolve(createMemoryIDB());
      return;
    }
    if (typeof indexedDB === 'undefined') {
      reject(new Error('这个浏览器不支持本地数据库（IndexedDB），无法保存数据'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const oldVersion = ev.oldVersion;

      if (oldVersion < 1) {
        const tx = db.createObjectStore(STORE.TX, { keyPath: 'id' });
        tx.createIndex('ts', 'ts');
        tx.createIndex('fp', 'fp');
        tx.createIndex('type', 'type');
        tx.createIndex('category', 'category');
        tx.createIndex('batchId', 'batchId');
        tx.createIndex('source', 'source');

        const rules = db.createObjectStore(STORE.RULES, { keyPath: 'key' });
        rules.createIndex('category', 'category');

        db.createObjectStore(STORE.SETTINGS, { keyPath: 'key' });
        db.createObjectStore(STORE.BATCHES, { keyPath: 'id' });
        db.createObjectStore(STORE.RECURRING, { keyPath: 'id' });
        db.createObjectStore(STORE.META, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('打开本地数据库失败'));
    req.onblocked = () => reject(new Error('数据库被其他标签页占用，请关闭轻账的其他页面后重试'));
  });

  return _dbPromise;
}

/** 通用事务包装 */
async function withStore(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let result;
    let tx;
    try {
      tx = db.transaction(storeName, mode);
    } catch (e) {
      reject(e);
      return;
    }
    const store = tx.objectStore(storeName);
    try {
      result = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('数据库事务被中断'));
  });
}

function wrap(request) {
  const box = { __req: request };
  return box;
}

/* ------------------------------------------------------------------ *
 * 交易
 * ------------------------------------------------------------------ */

export async function putTxMany(txs) {
  if (!txs.length) return 0;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE.TX, 'readwrite');
    const store = tx.objectStore(STORE.TX);
    for (const t of txs) store.put(t);
    tx.oncomplete = () => resolve(txs.length);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('写入交易失败'));
  });
}

export async function putTx(t) {
  await putTxMany([t]);
  return t;
}

export async function getTx(id) {
  return withStore(STORE.TX, 'readonly', (s) => wrap(s.get(id)));
}

export async function deleteTx(id) {
  return withStore(STORE.TX, 'readwrite', (s) => wrap(s.delete(id)));
}

export async function deleteTxMany(ids) {
  if (!ids.length) return 0;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE.TX, 'readwrite');
    const store = tx.objectStore(STORE.TX);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve(ids.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function allTx() {
  return withStore(STORE.TX, 'readonly', (s) => wrap(s.getAll()));
}

/** 按时间范围取（含 start，不含 end） */
export async function txInRange(start, end) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE.TX, 'readonly');
    const idx = tx.objectStore(STORE.TX).index('ts');
    const out = [];
    // 直接用上下界对象，而不是浏览器里的 IDBKeyRange.bound：
    // Node 内存后端没有这个全局对象，传普通对象两边都能处理，
    // 真实的 IndexedDB 也接受符合 IDBKeyRange 结构的对象。
    const range = { lower: start, upper: end, lowerOpen: false, upperOpen: true };
    const req = idx.openCursor(range);
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { out.push(cur.value); cur.continue(); }
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
}

export async function countTx() {
  return withStore(STORE.TX, 'readonly', (s) => wrap(s.count()));
}

/* ------------------------------------------------------------------ *
 * 分类规则（商户记忆）
 * ------------------------------------------------------------------ */

export async function allRules() {
  return withStore(STORE.RULES, 'readonly', (s) => wrap(s.getAll()));
}

export async function putRule(rule) {
  return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.put(rule)));
}

export async function deleteRule(key) {
  return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.delete(key)));
}

export async function clearRules() {
  return withStore(STORE.RULES, 'readwrite', (s) => wrap(s.clear()));
}

/* ------------------------------------------------------------------ *
 * 设置
 * ------------------------------------------------------------------ */

export async function getSetting(key, fallback = null) {
  const row = await withStore(STORE.SETTINGS, 'readonly', (s) => wrap(s.get(key)));
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  return withStore(STORE.SETTINGS, 'readwrite', (s) => wrap(s.put({ key, value })));
}

export async function allSettings() {
  const rows = await withStore(STORE.SETTINGS, 'readonly', (s) => wrap(s.getAll()));
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/* ------------------------------------------------------------------ *
 * 导入批次
 * ------------------------------------------------------------------ */

export async function putBatch(batch) {
  return withStore(STORE.BATCHES, 'readwrite', (s) => wrap(s.put(batch)));
}

export async function allBatches() {
  const rows = await withStore(STORE.BATCHES, 'readonly', (s) => wrap(s.getAll()));
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteBatch(id) {
  return withStore(STORE.BATCHES, 'readwrite', (s) => wrap(s.delete(id)));
}

/* ------------------------------------------------------------------ *
 * 周期账单
 * ------------------------------------------------------------------ */

export async function allRecurring() {
  return withStore(STORE.RECURRING, 'readonly', (s) => wrap(s.getAll()));
}

export async function putRecurring(r) {
  return withStore(STORE.RECURRING, 'readwrite', (s) => wrap(s.put(r)));
}

export async function deleteRecurring(id) {
  return withStore(STORE.RECURRING, 'readwrite', (s) => wrap(s.delete(id)));
}

/* ------------------------------------------------------------------ *
 * 备份 / 恢复 / 清空
 * ------------------------------------------------------------------ */

export async function exportAll() {
  const [txs, rules, settings, batches, recurring] = await Promise.all([
    allTx(), allRules(), allSettings(), allBatches(), allRecurring(),
  ]);
  return {
    app: 'qingzhang',
    formatVersion: 1,
    exportedAt: Date.now(),
    counts: { tx: txs.length, rules: rules.length, batches: batches.length, recurring: recurring.length },
    data: { tx: txs, rules, settings, batches, recurring },
  };
}

/** mode: 'replace' 全量覆盖 | 'merge' 合并（按 id 去重） */
export async function importAll(payload, mode = 'merge') {
  const d = payload && payload.data ? payload.data : payload;
  if (!d || !Array.isArray(d.tx)) throw new Error('备份文件格式不正确');

  if (mode === 'replace') {
    await clearAllData();
  }

  const existing = mode === 'merge'
    ? new Set((await allTx()).map((t) => t.id))
    : new Set();

  const fresh = d.tx.filter((t) => t && t.id && !existing.has(t.id));
  await putTxMany(fresh);

  // 规则：合并时用备份里的覆盖同名规则
  if (Array.isArray(d.rules)) {
    for (const r of d.rules) {
      if (r && r.key) await putRule(r);
    }
  }
  if (d.settings && typeof d.settings === 'object') {
    for (const [k, v] of Object.entries(d.settings)) await setSetting(k, v);
  }
  if (Array.isArray(d.recurring)) {
    for (const r of d.recurring) { if (r && r.id) await putRecurring(r); }
  }
  if (Array.isArray(d.batches)) {
    for (const b of d.batches) { if (b && b.id) await putBatch(b); }
  }

  return { importedTx: fresh.length, skipped: d.tx.length - fresh.length };
}

export async function clearAllData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const names = Object.values(STORE);
    const tx = db.transaction(names, 'readwrite');
    for (const n of names) tx.objectStore(n).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* ------------------------------------------------------------------ *
 * 存储空间
 * ------------------------------------------------------------------ */

/**
 * 申请「持久化存储」。
 * 说明：iOS 对网页应用有个 7 天没打开就可能清理空间的规定，
 * 申请持久化能降低被清的概率；Safari 可能直接拒绝，那就如实告诉用户。
 */
export async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) {
      return { supported: false, persisted: false };
    }
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (already) return { supported: true, persisted: true };
    const granted = await navigator.storage.persist();
    return { supported: true, persisted: !!granted };
  } catch (e) {
    return { supported: false, persisted: false, error: String(e) };
  }
}

export async function storageEstimate() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 测试辅助（只在 Node 里用得到；浏览器里调用是无害的空操作）
 * ------------------------------------------------------------------ */

/** 清空内存后端（测试之间互相隔离用） */
export async function __resetDb() {
  if (!isNodeEnv()) return false;
  await clearAllData();
  return true;
}

/** 直接塞一批交易进去（测试准备数据用） */
export async function __seedDb(txs) {
  if (!isNodeEnv()) return 0;
  await putTxMany(txs);
  return txs.length;
}

/** 当前用的是不是内存后端 */
export function __isMemoryBackend() {
  return isNodeEnv() && typeof indexedDB === 'undefined';
}
