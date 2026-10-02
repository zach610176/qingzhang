/**
 * 轻账 · 账单脱敏（纯函数模块，不碰 DOM，可被 Node 直接单元测试）
 *
 * 目标：把微信 / 支付宝账单里的「个人信息」抹掉，但**保持文件的形状不变** ——
 * 列数、行数、引号规则、时间/金额格式、订单号长度和字符类别都尽量原样保留，
 * 这样脱敏后的文件还能被测序/解析程序正常读取。
 *
 * 关键设计：
 *   - 商户名（含「公司/有限/科技/超市/…」或含字母，或长于 6 字）**不脱敏**，
 *     因为商户名正是下游做自动分类时最有价值的信息。
 *   - 同一个人名在同一份文件里永远映射到同一个化名（文件级映射表），
 *     这样「张三 → 李四」的对应关系在行与行之间保持自洽。
 *   - 订单号这类高熵标识符用「原值的哈希」派生出等长假值，
 *     同一原值每次得到同一个假值，且不可反推。
 *   - 金额默认不动（可选项，默认关闭）。
 *
 * 保密性：本模块不发任何网络请求，不读文件系统，纯字符串进 / 字符串出。
 */

/* ================================================================== *
 * 常量
 * ================================================================== */

/** 人名化名池：按「首次出现顺序」依次取用，保证文件内映射稳定 */
export const NAME_POOL = [
  '张伟', '李娜', '王芳', '刘洋', '陈静',
  '杨帆', '赵磊', '黄敏', '周涛', '吴倩',
  '徐强', '孙丽', '马超', '朱婷', '胡军',
  '郭鹏', '何雪', '高翔', '林芸', '罗浩',
];

/** 手机号统一替换成的假号（保持 11 位、1 开头） */
export const FAKE_PHONE = '13800000000';
/** 「尾号/后四位」统一替换成的 4 位假值 */
export const FAKE_PHONE_TAIL = '0000';

/** 判定「这是商户/机构而不是个人」的关键词 */
const ORG_KEYWORDS = [
  '公司', '有限', '科技', '商贸', '餐饮', '超市', '便利店', '药房', '医院',
  '银行', '集团', '商店', '商城', '服务', '中心', '平台', '网络', '传媒',
  '文化', '工作室',
  // 下面这些是「运营主体」常见后缀，同样应保留（例如「财付通」「支付宝」）
  '财付通', '支付宝', '微信', '电信', '移动', '联通', '大学', '学院', '学校',
  '酒店', '宾馆', '菜场', '菜市', '市场', '门市', '药店', '诊所', '物业',
  '车站', '机场', '加油站', '停车场', '快递', '驿站', '影城', '书店',
];

/** 「订单号」列名特征 */
const ORDER_KEYWORDS = ['单号', '订单号', '交易号', '流水号'];

/** 「备注/说明」列名特征（这些列保留内容，但要做行内清理） */
const REMARK_KEYWORDS = ['备注', '商品说明', '商品', '说明', '摘要', '附言', '用途'];

/**
 * 「交易对方/商户」列名特征（这些列才做姓名化名）。
 * 踩过的坑：
 *   - 不能放裸的「对方」：「收/付款方式」里并不含它，但「付款方」会命中，
 *     于是支付宝的支付方式列被当成交易对方列，整列被写成化名。
 *   - 所以除了「交易对方」（微信/支付宝的实际列名），
 *     其余短词一律走 MERCHANT_EXACT 的「精确等于」判断。
 */
const MERCHANT_EXACT = [
  '交易对方', '对方', '商户', '商户名称', '收款方', '付款方', '交易对象',
  '对方名称', '对方姓名', '收款人', '付款人', '交易方',
];
const MERCHANT_KEYWORDS = ['交易对方', '交易对象'];

/** 「金额」列名特征（只有开启「金额随机」时才动） */
const AMOUNT_KEYWORDS = ['金额', '发生金额', '交易金额'];

/** 表头里至少出现的字段名（用来定位真正的表头行） */
const HEADER_KEYWORDS = [
  '交易时间', '交易创建时间', '交易对方', '商品', '金额', '收/支', '收支',
  '交易类型', '付款时间', '当前状态', '交易状态', '交易单号', '商户单号',
  '交易订单号', '商家订单号', '支付方式', '收/付款方式',
];

/**
 * 表头行之后的收尾标记（微信/支付宝账单末尾的「-----…结束-----」）。
 * 踩过的坑：一开始写成「两端是横线、中间随便什么」，结果把**表头上面**那一行
 * -----微信支付账单明细列表----- 也认成了收尾标记，导致整段明细被跳过。
 * 现在只认两种情况：① 整行就是一串横线（≥4 个）；② 横线中间夹着「结束」二字。
 */
export function isTrailerLine(line) {
  const s = String(line == null ? '' : line).replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  if (!s) return false;
  const isDash = (ch) => ch === '-' || ch === '\u2014' || ch === '=' || ch === '*';
  let a = 0;
  while (a < s.length && isDash(s[a])) a++;
  let b = s.length;
  while (b > a && isDash(s[b - 1])) b--;
  if (a === s.length) return s.length >= 4;          // 整行横线
  if (a < 2 || s.length - b < 2) return false;       // 两端都得有横线
  return s.slice(a, b).includes('结束');             // 中间必须有「结束」
}

/** 分类标签（用于界面上的计数） */
export const CATEGORY_LABELS = {
  name: '人名',
  phone: '手机号',
  phoneTail: '卡号尾号',
  id: '身份证',
  card: '银行卡/长数字',
  email: '邮箱',
  order: '订单号',
  amount: '金额',
  preamble: '文件头信息',
  inline: '其它行内清理',
};

/* ================================================================== *
 * 小工具
 * ================================================================== */

/** FNV-1a 64bit（两路），输出 16 进制；用于从原值派生假值 */
export function hash64hex(str) {
  const s = String(str);
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = (h2 >>> 0).toString(16).padStart(8, '0');
  const b = (h1 >>> 0).toString(16).padStart(8, '0');
  return a + b;
}

/** 由哈希播种的确定性伪随机数发生器（xorshift32） */
export function seededRandom(seedText) {
  const h = hash64hex(seedText);
  let x = (parseInt(h.slice(0, 8), 16) ^ parseInt(h.slice(8), 16)) >>> 0;
  if (x === 0) x = 0x9e3779b9;
  return function next() {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

/** 出现过的分类计数 */
function bump(counts, cat, n = 1) {
  counts[cat] = (counts[cat] || 0) + n;
}

/* ================================================================== *
 * CSV 解析 / 生成
 * ================================================================== */

/** 探测分隔符：逗号还是制表符（引号内的不算） */
export function detectDelimiter(text) {
  const sample = String(text || '').slice(0, 20000);
  let comma = 0, tab = 0, semi = 0, inQ = false;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (inQ) continue;
    if (ch === ',') comma++;
    else if (ch === '\t') tab++;
    else if (ch === ';') semi++;
  }
  if (tab > comma && tab >= semi) return '\t';
  if (semi > comma && semi > tab) return ';';
  return ',';
}

/**
 * 正经的 CSV 解析：支持引号内逗号与换行、双写引号转义。
 * @returns {{rows: string[][], delimiter: string}}
 */
export function parseCSV(text, delimiter) {
  const src = String(text == null ? '' : text);
  const rows = [];
  const delim = delimiter || detectDelimiter(src);
  if (!src.length) return { rows, delimiter: delim };

  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = src.length;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    pushField();
    // 整行只有一个空字段 → 视为空行，丢弃
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') {
      if (field === '') { inQuotes = true; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === delim) { pushField(); i++; continue; }
    if (ch === '\r') { if (src[i + 1] === '\n') i++; pushRow(); i++; continue; }
    if (ch === '\n') { pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) pushRow();
  return { rows, delimiter: delim };
}

/** 生成 CSV 时，判断这个字段需不需要加引号 */
export function needsQuoting(v, delimiter) {
  const s = String(v == null ? '' : v);
  if (s === '') return false;
  return s.includes(delimiter || ',') || s.includes('"') || s.includes('\n') || s.includes('\r')
    || /^[\s\u3000]|[\s\u3000]$/.test(s);
}

/** 把二维数组重新拼成 CSV 文本 */
export function stringifyCSV(rows, delimiter, eol = '\r\n') {
  const d = delimiter || ',';
  const out = [];
  for (const row of rows) {
    const parts = [];
    for (const cellRaw of row) {
      const s = String(cellRaw == null ? '' : cellRaw);
      if (needsQuoting(s, d)) parts.push('"' + s.replace(/"/g, '""') + '"');
      else parts.push(s);
    }
    out.push(parts.join(d));
  }
  return out.length ? out.join(eol) + eol : '';
}

/* ================================================================== *
 * 文本清洗判断
 * ================================================================== */

/** 全角空格等归一化（只用于判断，不修改原文） */
function norm(s) {
  return String(s == null ? '' : s).replace(/[\s\u3000]+/g, ' ').trim();
}

/** 这个值是不是「机构/商户」→ 是的话绝对不能化名 */
export function isOrganizationValue(value) {
  const s = norm(value);
  if (!s) return true;              // 空值不当人名处理
  if (/[A-Za-z0-9]/.test(s)) return true;   // 含字母数字（店铺号、英文名等）
  if (s.length > 6) return true;            // 超过 6 字基本是机构全称
  if (ORG_KEYWORDS.some((k) => s.includes(k))) return true;
  if (/[（(【\[]/.test(s)) return true;       // 带括号备注的通常是店铺全称
  return false;
}

/**
 * 常见单字姓氏（百家姓里覆盖绝大多数人的那一批）。
 * 用途：4 个汉字的值是不是人名，靠「第一个字是不是姓」来判断 ——
 * 因为「携程旅行」这种 4 字商户名和「欧阳娜娜」这种 4 字人名长得一模一样，
 * 只看字数是分不开的，而把商户名误当人名抹掉会直接毁掉分类信号。
 */
const SURNAMES = new Set(('王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤常温康施文牛樊葛邢安齐易乔伍庞颜倪庄聂章鲁岳翟殷詹申欧耿关兰焦俞左柳甘祝包宁尚符舒阮柯纪梅童凌毕单季裴霍涂成苗谷盛曲翁冉骆蓝路游辛靳管柴蒙鲍华喻祁蒲房滕屈饶解牟艾尤阳时穆农司卓古吉缪简车项连芦麦褚娄窦戚岑景党宫费卜冷晏席卫米柏宗瞿桂全佟应臧闵苟邬边卞姬邰羊隗国狄平晏').split(''));
/** 复姓 */
const COMPOUND_SURNAMES = ['欧阳', '司马', '上官', '诸葛', '东方', '皇甫', '尉迟', '公孙', '慕容', '长孙', '宇文', '司徒', '司空', '令狐', '申屠', '端木', '独孤', '南宫', '百里', '夏侯', '西门', '东门', '呼延', '微生', '梁丘', '左丘', '东郭', '澹台', '公冶', '宗政', '濮阳', '淳于'];

/** 首字（或前两字）是不是姓氏 */
export function startsWithSurname(value) {
  const s = norm(value);
  if (s.length < 2) return false;
  for (const c of COMPOUND_SURNAMES) {
    if (s.startsWith(c)) return true;
  }
  return SURNAMES.has(s[0]);
}

/** 这个值看起来像「中国人名」吗 */
export function looksLikePersonalName(value) {
  const s = norm(value);
  if (!s) return false;
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(s)) return false;
  if (ORG_KEYWORDS.some((k) => s.includes(k))) return false;
  // 常见非人名词（账单里的状态词、类型词）
  if (/^(收入|支出|不计收支|其他|其它|转账|红包|退款|提现|充值|消费|收款|付款|零钱|余额|手续费|利息|工资)$/.test(s)) return false;
  // 4 个字：必须首字是姓氏，才敢当人名（否则可能是「携程旅行」这类商户名）
  if (s.length === 4 && !startsWithSurname(s)) return false;
  return true;
}

/* ================================================================== *
 * 行内清理（备注、文件头等自由文本）
 * ================================================================== */

/** 判断 18 位身份证校验位是否合法（用于降低误伤） */
export function isValidIdCardChecksum(id) {
  const s = String(id || '').toUpperCase();
  if (!/^\d{17}[\dX]$/.test(s)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * w[i];
  return codes[sum % 11] === s[17];
}

/** 身份证 → 同形状假号：地区码保留，出生日期归零，顺序码保留，X 保留 */
export function fakeIdCard(id) {
  const s = String(id || '').toUpperCase();
  if (!/^\d{17}[\dX]$/.test(s)) return s;
  // 保留前 6 位地区码，出生日期 8 位填 19000101，顺序码 3 位 + 校验位归零，
  // 结尾如果是 X 则保留 X（形状一致：18 位、前 6 位是地区码）
  const tail = s[17] === 'X' ? 'X' : '0';
  return s.slice(0, 6) + '19000101' + '000' + tail;
}

/** 银行卡/长数字 → 等长，保留前 4 后 4，中间补 0 */
export function fakeCardNumber(digits) {
  const s = String(digits || '');
  if (s.length < 9) return s;
  const head = s.slice(0, 4);
  const tail = s.slice(-4);
  return head + '0'.repeat(s.length - 8) + tail;
}

/* --- 行内扫描用的正则（顺序即优先级） -------------------------------
 * 用法说明：
 *   - 用「具名捕获组」而不是数位置：以前用 rest 参数按下标取组，
 *     结果手机号/身份证被错误地当成邮箱（下标算错了），是个很难看的坑。
 *   - 手机号必须排在银行卡前面：「中国银行(尾号6688)」里的 6688 用
 *     「保留前 4 后 4」处理会原地不动（根本认不出是尾号），
 *     先匹配手机号（然后由调用方把 11 位以下当尾号处理）才符合直觉。
 * ------------------------------------------------------------------ */
const INLINE_RE = new RegExp([
  '(?<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})',
  '(?<id>(?<![\\dXx])\\d{17}[\\dXx](?![\\dXx]))',
  '(?<phone>(?<![\\d.])1[3-9]\\d{9}(?![\\d]))',
  '(?<card>(?<![\\d.])\\d{16,19}(?![\\d.]))',
].join('|'), 'g');

/**
 * 对一段自由文本做行内脱敏（备注、文件头、纯文本文件都用它）。
 * @param {string} text
 * @param {object} ctx  由 createScrubContext 生成
 * @param {object} [opts] { categories: string[] 限定只处理哪些类别 }
 * @returns {string}
 */
export function scrubInline(text, ctx, opts = {}) {
  let s = String(text == null ? '' : text);
  if (!s) return s;
  const allow = opts.categories || ['email', 'id', 'card', 'phone'];

  // 1) 「尾号1234 / 后四位1234」这种尾号 → 统一成 0000
  // 单独算一类（phoneTail）：它不是手机号，混在手机号里会让人看不懂计数。
  if (allow.includes('phone')) {
    s = s.replace(/((?:尾号|后四位|后 4 位|末四位|尾数为)[\s:：]?)(\d{2,6})(?!\d)/g, (m, p1, p2) => {
      if (/^0+$/.test(p2)) return m;          // 已经是 0000，不要重复计数
      bump(ctx.counts, 'phoneTail');
      ctx.records.push({ category: 'phoneTail', from: m, to: p1 + FAKE_PHONE_TAIL });
      return p1 + FAKE_PHONE_TAIL;
    });
  }

  // 2) 邮箱 / 身份证 / 银行卡 / 手机号
  return s.replace(INLINE_RE, (m, ...rest) => {
    // 命中的是哪一个具名组
    const g = rest[rest.length - 1] || {};
    let which = null;
    for (const name of ['email', 'id', 'card', 'phone']) {
      if (g[name] !== undefined) { which = name; break; }
    }
    if (!which || !allow.includes(which)) return m;
    if (ctx.generated.has(m)) return m;      // 已经是自己生成的假值，别再洗一遍

    if (which === 'email') {
      const to = ctx.mapEmail(m);
      ctx.records.push({ category: 'email', from: m, to });
      bump(ctx.counts, 'email');
      return to;
    }
    if (which === 'id') {
      const to = ctx.mapId(m);
      ctx.records.push({ category: 'id', from: m, to });
      bump(ctx.counts, 'id');
      return to;
    }
    if (which === 'card') {
      const to = ctx.mapCard(m);
      ctx.records.push({ category: 'card', from: m, to });
      bump(ctx.counts, 'card');
      return to;
    }
    // phone：11 位当手机号，短于 11 位的（尾号/后四位）相同位数补 0
    const to = m.length >= 11 ? ctx.mapPhone(m) : '0'.repeat(m.length);
    ctx.records.push({ category: 'phone', from: m, to });
    bump(ctx.counts, 'phone');
    return to;
  });
}

/* ================================================================== *
 * 文件级脱敏上下文（映射表）
 * ================================================================== */

/**
 * 一份文件对应一个 ctx：所有映射表都挂在它下面。
 * @param {object} [opts] { randomizeAmount: boolean }
 */
export function createScrubContext(opts = {}) {
  const counts = Object.create(null);
  const records = [];

  const state = {
    counts,
    records,
    /** 人名映射：原名 → 化名 */
    nameMap: new Map(),
    /** 手机号映射 */
    phoneMap: new Map(),
    /** 身份证映射 */
    idMap: new Map(),
    /** 银行卡映射 */
    cardMap: new Map(),
    /** 邮箱映射 */
    emailMap: new Map(),
    /** 订单号映射 */
    orderMap: new Map(),
    /** 用户本人的姓名（从文件头里学到的），会全局替换 */
    selfNames: new Set(),
    /** 已经被用掉的化名（避免两个真名共用一个化名） */
    usedAliases: new Set(),
    /** 本文件里出现过的真名（化名不能和真名撞车） */
    realNames: new Set(),
    /** 已经生成过的假值（假身份证/假卡号），避免被下一步重复处理 */
    generated: new Set(),
    /** 「很可能是本人的机构/账号名」等也一并记住 */
    randomizeAmount: !!opts.randomizeAmount,
    nextNameIndex: 0,
    nextEmailIndex: 1,
  };

  /**
   * 取人名化名，保证同一个人名稳定。
   * 注意：化名不能和「本文件里出现过的真名」或者「已经用掉的化名」撞车，
   * 否则会出现「张三 → 李四」而李四恰好也是文件里的另一个人，
   * 阅读脱敏结果时容易误判成两个人其实是同一个（也踩过：化名池里的
   * 王芳/刘洋 和陈静/林小雨 这类真名重名，结果真名原封不动地留在了文件里）。
   * 池子用完（不同人名超过 20 个）就循环，保证不重复使用同一个化名。
   */
  state.mapName = (raw) => {
    const key = norm(raw);
    if (state.nameMap.has(key)) return state.nameMap.get(key);
    state.realNames.add(key);
    let alias = '';
    for (let i = 0; i < NAME_POOL.length; i++) {
      const cand = NAME_POOL[state.nextNameIndex % NAME_POOL.length];
      state.nextNameIndex++;
      if (state.selfNames.has(cand)) continue;
      if (state.usedAliases.has(cand)) continue;
      if (state.realNames.has(cand)) continue;
      alias = cand;
      break;
    }
    if (!alias) alias = NAME_POOL[state.nextNameIndex++ % NAME_POOL.length];
    state.usedAliases.add(alias);
    state.nameMap.set(key, alias);
    return alias;
  };

  /**
   * 收尾修正：处理「化名与后面才出现的真名撞车」的情况。
   * 真名是逐行发现的，所以必须等全部行处理完才能确定哪些化名不能用。
   * 这里只改「假名恰好等于某个真名」的条目，已分配且不冲突的化名一律不动，
   * 保证「同一个人名 → 同一个化名」这条契约不被破坏。
   * @returns {Map<string,string>} 需要替换的文本对（旧化名 → 新化名）
   */
  state.fixNameCollisions = () => {
    const renameMap = new Map();
    for (const [real, alias] of [...state.nameMap]) {
      if (state.usedAliases.has(alias) && !state.realNames.has(alias)) continue;
      const taken = new Set([...state.usedAliases].filter((a) => a !== alias));
      const cand = NAME_POOL.find((a) => !taken.has(a) && !state.realNames.has(a) && a !== real);
      if (!cand) continue;                       // 池子真的用完了，保持现状
      state.nameMap.set(real, cand);
      state.usedAliases.delete(alias);
      state.usedAliases.add(cand);
      renameMap.set(alias, cand);
    }
    return renameMap;
  };

  state.mapPhone = (raw) => {
    const key = String(raw);
    if (!state.phoneMap.has(key)) {
      state.phoneMap.set(key, FAKE_PHONE);
      state.generated.add(FAKE_PHONE);
    }
    return state.phoneMap.get(key);
  };

  state.mapId = (raw) => {
    const key = String(raw).toUpperCase();
    if (!state.idMap.has(key)) {
      const fake = fakeIdCard(key);
      state.idMap.set(key, fake);
      state.generated.add(fake);
    }
    return state.idMap.get(key);
  };

  state.mapCard = (raw) => {
    const key = String(raw);
    if (!state.cardMap.has(key)) {
      const fake = fakeCardNumber(key);
      state.cardMap.set(key, fake);
      state.generated.add(fake);
    }
    return state.cardMap.get(key);
  };

  state.mapEmail = (raw) => {
    const key = String(raw).toLowerCase();
    if (!state.emailMap.has(key)) {
      state.emailMap.set(key, `user${state.nextEmailIndex}@example.com`);
      state.nextEmailIndex++;
    }
    return state.emailMap.get(key);
  };

  /** 订单号：等长、按列名约束字符类别、由哈希确定性派生 */
  state.mapOrder = (raw, columnName) => {
    const key = String(raw);
    if (state.orderMap.has(key)) return state.orderMap.get(key);
    const fake = fakeOrderNumber(key, columnName);
    state.orderMap.set(key, fake);
    return fake;
  };

  return state;
}

/** 判断这一列是不是「必然是纯数字」的订单号列（支付宝的订单号都是纯数字） */
function orderIsNumericOnly(columnName) {
  return ORDER_KEYWORDS.some((k) => String(columnName || '').includes(k));
}

/**
 * 生成等长假订单号：
 *   - 保留长度
 *   - 保留每个位置原本的字符类别（数字 / 大写字母 / 小写字母）
 *   - 由原值哈希播种，同一原值永远得到同一个假值
 */
export function fakeOrderNumber(original, columnName) {
  const s = String(original || '');
  if (!s) return s;
  const rnd = seededRandom('order\u0001' + s + '\u0001' + (columnName || ''));
  const forceNumeric = orderIsNumericOnly(columnName);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') out += String(Math.floor(rnd() * 10));
    else if (forceNumeric) out += String(Math.floor(rnd() * 10));
    else if (ch >= 'A' && ch <= 'Z') out += String.fromCharCode(65 + Math.floor(rnd() * 26));
    else if (ch >= 'a' && ch <= 'z') out += String.fromCharCode(97 + Math.floor(rnd() * 26));
    else out += ch; // 连接符等原样保留
  }
  return out;
}

/** 由原金额派生一个「同量级、同小数位」的随机金额（仅在用户主动开启时使用） */
export function fakeAmount(raw, ctx) {
  const s = String(raw == null ? '' : raw).trim();
  const m = /^(-?)\s*([¥￥]?)\s*([\d,]+)(\.\d+)?$/.exec(s);
  if (!m) return s;
  const sign = m[1] || '';
  const symbol = m[2] || '';
  const intPart = m[3].replace(/,/g, '');
  const decPart = m[4] || '';
  const hasComma = m[3].includes(',');
  const rnd = seededRandom('amount\u0001' + s + '\u0001' + ctx.records.length);
  const magnitude = Math.max(1, intPart.length);
  const max = Math.pow(10, magnitude) - 1;
  let v = Math.floor(rnd() * max);
  // 保持和原值差不多的位数
  v = String(v).padStart(intPart.length, '0');
  if (hasComma) v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + symbol + v + decPart;
}

/* ================================================================== *
 * 列角色判定
 * ================================================================== */

/** 去掉列名里的空白，便于判断 */
function cleanColName(h) {
  return String(h == null ? '' : h).replace(/[\s\u3000]/g, '').replace(/^\uFEFF/, '');
}

/**
 * 按列名判定每一列的角色。
 * 顺序很重要：先认「金额 / 订单号 / 备注」，最后才认「商户」，
 * 并且商户列里除了几个不会歧义的长词，其余只允许「精确等于」。
 * @param {string[]} header
 * @returns {{roles: string[], index: object, names: string[]}}
 */
export function classifyColumns(header) {
  const cols = (header || []).map(cleanColName);
  const roles = cols.map((c) => {
    if (!c) return 'other';
    if (AMOUNT_KEYWORDS.some((k) => c.includes(k))) return 'amount';
    if (ORDER_KEYWORDS.some((k) => c.includes(k))) return 'order';
    if (REMARK_KEYWORDS.some((k) => c.includes(k))) return 'remark';
    if (MERCHANT_EXACT.includes(c)) return 'merchant';
    if (MERCHANT_KEYWORDS.some((k) => c.includes(k))) return 'merchant';
    return 'other';
  });
  const index = {};
  cols.forEach((c, i) => { if (c && index[c] === undefined) index[c] = i; });
  return { roles, index, names: cols };
}

/** 在若干行里找表头行（命中字段名最多的一行） */
export function findHeaderRowIndex(rows, maxScan = 60) {
  const limit = Math.min(rows.length, maxScan);
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < limit; i++) {
    const cells = rows[i];
    if (!cells || cells.length < 2) continue;
    let score = 0;
    for (const cell of cells) {
      const c = cleanColName(cell);
      for (const kw of HEADER_KEYWORDS) if (c.includes(kw)) score++;
    }
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return bestScore >= 3 ? best : (bestScore >= 2 ? best : -1);
}

/** 判断账单来源 */
export function detectPlatform(text) {
  const head = String(text || '').slice(0, 8000);
  let wx = 0, ali = 0;
  for (const s of ['微信支付账单', '微信昵称', '微信支付', '微信红包', '当前状态', '零钱', '微信账单']) {
    if (head.includes(s)) wx++;
  }
  for (const s of ['支付宝', 'alipay', '交易创建时间', '商品说明', '收/支', '交易订单号', '商家订单号', '收/付款方式', '交易分类']) {
    if (head.includes(s)) ali++;
  }
  if (head.includes('当前状态') || head.includes('微信支付')) wx += 2;
  if (head.includes('收/支')) ali += 2;
  if (head.includes('交易创建时间') || head.includes('交易订单号')) ali += 2;
  if (wx === 0 && ali === 0) return 'unknown';
  return wx >= ali ? 'wechat' : 'alipay';
}

/* ================================================================== *
 * 文件头（前言行）脱敏
 * ================================================================== */

/** 文件中带「本人姓名」的标签 */
const SELF_LABEL_RE = /(昵称|姓名|名字|真实姓名|户名|账户名|账号名|微信昵称|支付宝昵称|用户)/;

/**
 * 从文件头里学习「用户本人的姓名」，之后全文（含明细区）都会一并替换。
 * @returns {string[]} 学到的姓名列表
 */
export function learnSelfNames(preambleLines, ctx) {
  const found = [];
  for (const line of preambleLines) {
    const s = norm(line);
    if (!s || s.length > 120) continue;
    if (!SELF_LABEL_RE.test(s)) continue;
    // 「微信昵称：[张三]」「姓名: 张三」「真实姓名：张三」
    const re = /(昵称|姓名|名字|真实姓名|户名|账户名|账号名|用户)\s*[:：]\s*[\[【（(]?\s*([^\]\s,，、】）)]{2,12})/g;
    let m;
    while ((m = re.exec(s))) {
      const v = m[2].replace(/[\]】）)]+$/, '');
      if (looksLikePersonalName(v)) found.push(v);
      else if (/^[\u4e00-\u9fa5]{2,4}$/.test(v) && !ORG_KEYWORDS.some((k) => v.includes(k))) found.push(v);
    }
  }
  for (const n of found) ctx.selfNames.add(n);
  return found;
}

/**
 * 把文件头若干行里的个人信息抹掉（保留其余内容与格式）。
 * @param {string[]} lines 文件头行
 * @param {object} ctx
 * @param {number} [maxLine] 只处理前多少行
 * @returns {string[]} 处理后的行
 */
export function scrubPreambleLines(lines, ctx, maxLine = 40) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i >= maxLine || line == null) { out.push(line); continue; }
    const before = line;

    // 1) 「微信昵称：xxx」「姓名:xxx」「支付宝昵称：[xxx]」
    if (SELF_LABEL_RE.test(line)) {
      line = line.replace(
        /((?:昵称|姓名|名字|真实姓名|户名|账户名|账号名|微信昵称|支付宝昵称|用户)\s*[:：]\s*)([\[【（(]?)([^\]\s,，、】）)]{2,20})([\]】）)]?)/g,
        (m, p1, p2, p3, p4) => {
          if (p3.includes('@') || /[A-Za-z0-9]/.test(p3)) {
            // 邮箱或字母名 → 走邮箱/整段清理
            const to = scrubInline(p3, ctx);
            if (to !== p3) {
              bump(ctx.counts, 'preamble');
              ctx.records.push({ category: 'preamble', from: m, to: p1 + p2 + to + p4 });
              return p1 + p2 + to + p4;
            }
            return m;
          }
          if (looksLikePersonalName(p3) || /^[\u4e00-\u9fa5]{2,4}$/.test(p3)) {
            const alias = ctx.mapName(p3);
            bump(ctx.counts, 'name');
            bump(ctx.counts, 'preamble');
            ctx.records.push({ category: 'name', from: p3, to: alias });
            return p1 + p2 + alias + p4;
          }
          return m;
        },
      );
    }

    // 2) 行内扫一遍（手机号 / 身份证 / 邮箱 / 银行卡）
    const afterInline = scrubInline(line, ctx);
    if (afterInline !== line) {
      ctx.records.push({ category: 'preamble', from: before, to: afterInline });
      line = afterInline;
    }
    out.push(line);
  }
  return out;
}

/* ================================================================== *
 * 单元格脱敏
 * ================================================================== */

/**
 * 处理一个单元格。
 * @param {string} value
 * @param {string} role    列角色（merchant / order / remark / amount / other）
 * @param {string} colName 列名
 * @param {object} ctx
 * @param {string[]} changes 收集「修改前→修改后」（由调用方传入以便预览）
 * @returns {string}
 */
export function scrubCell(value, role, colName, ctx, changes) {
  let v = String(value == null ? '' : value);
  if (v === '') return v;
  const push = (category, from, to) => {
    if (from === to) return;
    if (changes) changes.push({ category, from, to, column: colName });
  };

  // ---- 金额列 ----
  if (role === 'amount') {
    if (ctx.randomizeAmount) {
      const to = fakeAmount(v, ctx);
      if (to !== v) { push('amount', v, to); bump(ctx.counts, 'amount'); v = to; }
    }
    return v;
  }

  // ---- 订单号列：等长假值 ----
  if (role === 'order') {
    const t = norm(v);
    if (t) {
      const to = ctx.mapOrder(t, colName);
      if (to !== t) {
        push('order', t, to);
        bump(ctx.counts, 'order');
        // 注意：不动原始空白，只在整格是订单号时替换
        if (t === v) return to;
        return v.replace(t, to);
      }
    }
    return v;
  }

  // ---- 商户 / 交易对方列：人名化名 ----
  if (role === 'merchant') {
    const t = norm(v);
    if (t && !isOrganizationValue(t)) {
      let alias = null;
      if (ctx.selfNames.has(t)) alias = ctx.mapName(t);
      else if (looksLikePersonalName(t)) alias = ctx.mapName(t);
      if (alias && alias !== t) {
        push('name', t, alias);
        bump(ctx.counts, 'name');
        return v.replace(t, alias);
      }
    }
    // 商户格里残留的手机号/身份证/邮箱也要清掉
    const to = scrubInline(v, ctx);
    if (to !== v) push('inline', v, to);
    return to;
  }

  // ---- 备注 / 说明列：保留内容，只把身份证/手机号/卡号/邮箱/长数字清掉 ----
  if (role === 'remark') {
    // 先处理「裸的长数字」（≥11 位）：订单号、卡号之类。
    // 关键：不能重复处理「上一步刚生成的假值」，否则
    // 假身份证 310101190001010000 会被再当成卡号洗一遍（踩过这个坑）。
    const step1 = v.replace(/(?<!\d)\d{11,}(?!\d)/g, (m) => {
      if (ctx.generated.has(m)) return m;
      const cat = m.length >= 16 ? 'card' : 'phone';
      const f = cat === 'card' ? ctx.mapCard(m) : ctx.mapPhone(m);
      bump(ctx.counts, cat);
      push(cat, m, f);
      return f;
    });
    const step2 = scrubInline(step1, ctx, { categories: ['email', 'id', 'card', 'phone'] });
    if (step2 !== v) push('inline', v, step2);
    return step2;
  }

  // ---- 其它列：做行内清理（邮箱、手机号、身份证、卡号、尾号） ----
  // 注意这里不能只放 email：支付方式列里会有「中国银行(尾号6688)」这类内容，
  // 尾号也必须清掉，否则银行卡后四位就跟着账单一起交出去了。
  const to = scrubInline(v, ctx);
  if (to !== v) push('inline', v, to);
  return to;
}

/* ================================================================== *
 * 主流程
 * ================================================================== */

/**
 * 脱敏「已经是字符串」的一份账单。
 * @param {string} text
 * @param {object} [options] { randomizeAmount?: boolean, maxPreambleLines?: number, seedNames?: string[] }
 * @returns {object} 结果对象
 */
export function scrubStatementText(text, options = {}) {
  const src = String(text == null ? '' : text);
  const platform = detectPlatform(src);

  // 统一换行符处理：内部用 \n，输出时再决定
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r\n|\n|\r/);
  const delimiter = detectDelimiter(src);
  const { rows } = parseCSV(src, delimiter);
  const headerRow = findHeaderRowIndex(rows);

  // parseCSV 会丢掉空行，所以不能让「行下标」直接当「物理行号」用。
  // 这里按内容把表头行对回物理行号，前言区只做文本替换、绝不重新解析，
  // 这样前言里的引号 / 空白 / 逗号都会被原样保住。
  const headerLineIndex = headerRow < 0 ? -1 : findHeaderLineIndex(lines, rows[headerRow], delimiter);
  const preambleLineCount = headerLineIndex < 0 ? 0 : headerLineIndex;

  const ctx = createScrubContext(options);
  const changes = [];
  ctx.changes = changes;

  // 文件头：先学姓名，再清理
  const preambleLines = headerLineIndex < 0 ? [] : lines.slice(0, preambleLineCount);
  learnSelfNames(preambleLines, ctx);
  for (const n of options.seedNames || []) {
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(n)) ctx.selfNames.add(n);
  }
  // 关键顺序：**先**处理文件头，**再**处理明细行。
  // 否则同一份文件里先出现的明细行会先占用化名，导致同一个真名
  // 在文件头和明细区里拿到不同的化名（映射就自相矛盾了）。
  const preambleOut = headerLineIndex > 0
    ? scrubPreambleLines(preambleLines, ctx, options.maxPreambleLines || 40)
    : [];

  // 学习「本人姓名」之后，如果整份文档是「非 CSV」，走纯文本模式
  if (headerRow < 0) {
    const scrubbed = scrubPreambleLines(lines, ctx, lines.length);
    const cleaned = scrubbed.map((l) => scrubInlineFullLine(l, ctx, changes)).join(eol);
    return finalizeResult({
      text: cleaned, platform, delimiter: null, headerRow: -1,
      rowCount: 0, colCount: 0, changedCells: 0, changes, ctx, eol,
      note: '没找到标准表头，按纯文本逐行清理。',
    });
  }

  // ---- 表格区 ----
  const headerCells = rows[headerRow] || [];
  const { roles, names } = classifyColumns(headerCells);

  // 找明细区结束位置（收尾标记行，例如 -----微信支付账单明细列表结束-----）
  let dataEnd = rows.length;
  for (let i = headerRow + 1; i < rows.length; i++) {
    if (isTrailerLine(rows[i].join(delimiter))) { dataEnd = i; break; }
  }

  let changedCells = 0;
  for (let r = headerRow + 1; r < dataEnd; r++) {
    const row = rows[r];
    if (!row.length) continue;
    if (row.every((c) => norm(c) === '')) continue;
    const width = Math.max(row.length, headerCells.length);
    for (let c = 0; c < width; c++) {
      const raw = row[c] == null ? '' : row[c];
      if (raw === '') continue;
      const role = roles[c] || 'other';
      const colName = names[c] || `col${c}`;
      const before = raw;
      const after = scrubCell(raw, role, colName, ctx, changes);
      if (after !== before) { row[c] = after; changedCells++; }
    }
  }

  // ---- 文件头已经处理好了（见上面 preambleOut），这里只负责拼回去 ----
  // 把这两份数据挂到 ctx 上，收尾修正化名撞车时要用（见 applyNameCollisionFix）
  ctx.preambleLines = preambleOut;
  ctx.tableRows = rows;
  applyNameCollisionFix(ctx, changes);
  if (headerLineIndex > 0) {
    // 表头及之后沿用「保留引号」的表格版本
    const bodyLines = stringifyCSV(rows.slice(headerRow), delimiter, eol);
    return finalizeResult({
      text: preambleOut.join(eol) + (preambleOut.length ? eol : '') + bodyLines,
      platform, delimiter, headerRow,
      rowCount: Math.max(0, dataEnd - headerRow - 1),
      colCount: headerCells.length,
      changedCells, changes, ctx, eol,
      trailerRows: rows.length - dataEnd,
    });
  }

  const outText = stringifyCSV(rows, delimiter, eol);
  return finalizeResult({
    text: outText, platform, delimiter, headerRow,
    rowCount: Math.max(0, dataEnd - headerRow - 1),
    colCount: headerCells.length,
    changedCells, changes, ctx, eol,
    trailerRows: rows.length - dataEnd,
  });
}

/**
 * 把「表头行」对回「物理行号」。
 * @returns {number} 物理行号；找不到返回 -1（表示表头就在第一行）
 */
function findHeaderLineIndex(lines, headerCells, delimiter) {
  const first = cleanColName((headerCells || [])[0] || '');
  if (!first) return -1;
  const second = cleanColName((headerCells || [])[1] || '');
  let lastContent = -1;   // 最后一个非空行的行号
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    lastContent = i;
    if (!lines[i].includes(first)) continue;
    if (second && !lines[i].includes(second)) continue;
    // 上面两格的列名都出现，且这一行有分隔符 → 就是表头行
    if (lines[i].includes(delimiter)) return i;
  }
  // 退而求其次：用 parseCSV 在该区间内的行数兜底
  const prefix = lines.slice(0, lastContent + 1).join('\n');
  const { rows } = parseCSV(prefix, delimiter);
  let idx = -1;
  rows.forEach((r, i) => { if (r === headerCells) idx = i; });
  return idx >= 0 ? Math.min(idx, lines.length - 1) : 0;
}

/**
 * 在「表格区处理完」之后、拼接输出之前，统一修正化名撞车问题。
 * 覆盖三处已经写过化名的地方：文件头行、表格单元格、修改记录。
 */
function applyNameCollisionFix(ctx, changes) {
  const rename = ctx.fixNameCollisions();
  if (!rename || rename.size === 0) return;
  const fix = (s) => {
    let t = s;
    for (const [from, to] of rename) t = t.split(from).join(to);
    return t;
  };
  const pre = ctx.preambleLines || [];
  for (let i = 0; i < pre.length; i++) pre[i] = fix(pre[i]);
  const table = ctx.tableRows || [];
  for (const row of table) {
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string') row[c] = fix(row[c]);
    }
  }
  for (const rec of changes || []) {
    if (rec.category !== 'name') continue;
    // 展示用的「修改前 → 修改后」也要跟着改，否则预览会自相矛盾
    if (rename.has(rec.to)) rec.to = rename.get(rec.to);
    if (rename.has(rec.from)) rec.from = rename.get(rec.from);
  }
}

/** 纯文本模式：整行做行内清理，另外替换本人姓名 */
function scrubInlineFullLine(line, ctx, changes) {
  let s = String(line == null ? '' : line);
  const before = s;
  s = scrubInline(s, ctx);
  for (const n of ctx.selfNames) {
    if (!n) continue;
    if (s.includes(n)) {
      const alias = ctx.mapName(n);
      s = s.split(n).join(alias);
      bump(ctx.counts, 'name');
      changes.push({ category: 'name', from: n, to: alias, column: '(正文)' });
    }
  }
  if (s !== before && !changes.some((c) => c.from === before)) {
    changes.push({ category: 'inline', from: before, to: s, column: '(正文)' });
  }
  return s;
}

function finalizeResult(x) {
  const counts = x.ctx.counts;
  return {
    text: x.text,
    platform: x.platform,
    delimiter: x.delimiter,
    headerRow: x.headerRow,
    rowCount: x.rowCount,
    colCount: x.colCount,
    changedCells: x.changedCells,
    changes: x.changes,
    counts: { ...counts },
    mapping: {
      names: Object.fromEntries(x.ctx.nameMap),
      phones: Object.fromEntries(x.ctx.phoneMap),
      ids: Object.fromEntries(x.ctx.idMap),
      cards: Object.fromEntries(x.ctx.cardMap),
      emails: Object.fromEntries(x.ctx.emailMap),
      orders: Object.fromEntries(x.ctx.orderMap),
    },
    note: x.note || '',
    trailerRows: x.trailerRows || 0,
  };
}

/* ================================================================== *
 * 编码：探测 / 解码 / 编码
 * ================================================================== */

/** 有没有 UTF-8 BOM */
export function hasUtf8Bom(bytes) {
  return bytes && bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

/**
 * 探测 + 解码字节流。
 * 顺序：BOM → 严格 UTF-8 → GBK(GB18030)。
 * @param {Uint8Array} bytes
 * @returns {{text: string, encoding: string}}
 */
export function decodeBytes(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (hasUtf8Bom(b)) {
    return { text: new TextDecoder('utf-8').decode(b), encoding: 'UTF-8 (带 BOM)' };
  }
  try {
    const strict = new TextDecoder('utf-8', { fatal: true }).decode(b);
    return { text: strict, encoding: 'UTF-8' };
  } catch (e) { /* 不是合法 UTF-8，继续 */ }

  for (const enc of ['gbk', 'gb18030']) {
    try {
      const t = new TextDecoder(enc).decode(b);
      const bad = (t.match(/\uFFFD/g) || []).length;
      if (bad / Math.max(1, t.length) < 0.01) return { text: t, encoding: 'GBK' };
    } catch (e) { /* 浏览器不支持，跳过 */ }
  }
  return { text: new TextDecoder('utf-8').decode(b), encoding: 'UTF-8 (有乱码)' };
}

/** UTF-8 编码并加 BOM（Excel 打开中文 CSV 不乱码） */
export function encodeUtf8Bom(text) {
  const body = new TextEncoder().encode(String(text == null ? '' : text));
  const out = new Uint8Array(body.length + 3);
  out[0] = 0xef; out[1] = 0xbb; out[2] = 0xbf;
  out.set(body, 3);
  return out;
}

/* ================================================================== *
 * ZIP：读（stored + deflate） / 写（stored，method 0）
 * ================================================================== */

const u16 = (v, i) => v[i] | (v[i + 1] << 8);
const u32 = (v, i) => (v[i] | (v[i + 1] << 8) | (v[i + 2] << 16) | (v[i + 3] << 24)) >>> 0;

/** 用 DecompressionStream('deflate-raw') 解 deflate；环境不支持时返回 null */
async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (e) {
    return null;
  }
}

/**
 * 读取 ZIP 里的条目（不支持加密包）。
 * @param {Uint8Array} bytes
 * @returns {Promise<Array<{name:string, dir:boolean, method:number, data:Uint8Array}>>}
 */
export async function readZipEntries(bytes) {
  const v = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // 找 EOCD（可能带注释，从尾部往前扫）
  let eocd = -1;
  for (let i = v.length - 22; i >= 0 && i >= v.length - 66000; i--) {
    if (v[i] === 0x50 && v[i + 1] === 0x4b && v[i + 2] === 0x05 && v[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('这不是一个正常的 ZIP 文件（找不到目录结尾）。');

  const total = u16(v, eocd + 10);
  let off = u32(v, eocd + 16);
  const entries = [];

  for (let n = 0; n < total; n++) {
    if (u32(v, off) !== 0x02014b50) break;
    const flags = u16(v, off + 8);
    const method = u16(v, off + 10);
    const nameLen = u16(v, off + 28);
    const extraLen = u16(v, off + 30);
    const commentLen = u16(v, off + 32);
    const localOff = u32(v, off + 42);
    const nameBytes = v.subarray(off + 46, off + 46 + nameLen);
    const utf8Flag = (flags & 0x800) !== 0;
    let name;
    if (utf8Flag) name = new TextDecoder('utf-8').decode(nameBytes);
    else name = decodeBytes(nameBytes).text;
    if ((flags & 0x1) !== 0) throw new Error('这个 ZIP 是加密的，请先在电脑上解压后用 CSV 处理：' + name);

    // 本地文件头：跳过它自己的 name/extra（长度可能与中央目录不同）
    const lNameLen = u16(v, localOff + 26);
    const lExtraLen = u16(v, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const compSize = u32(v, off + 20);
    const raw = v.subarray(dataStart, dataStart + compSize);

    let data = raw;
    if (method === 8) {
      const inf = await inflateRaw(raw);
      if (!inf) throw new Error('浏览器不支持解压这个 ZIP 的压缩方式，请在电脑上解压后再拖入 CSV。');
      data = inf;
    } else if (method !== 0) {
      throw new Error('这个 ZIP 用了不支持的压缩方式（method ' + method + '）。');
    }
    entries.push({ name, dir: name.endsWith('/'), method, data });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* --- CRC32（写 ZIP 必须） ------------------------------------------ */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  const v = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let c = 0xffffffff;
  for (let i = 0; i < v.length; i++) c = CRC_TABLE[(c ^ v[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 本地时间 → ZIP 的 DOS 时间格式 */
function dosDateTime(d = new Date()) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time: time & 0xffff, date: date & 0xffff };
}

/**
 * 生成 ZIP（全部用 STORED，不压缩 —— 合法且 Windows / iOS 都能打开）。
 * @param {Array<{name:string, data:Uint8Array}>} files
 * @returns {Uint8Array}
 */
export function createZip(files, now = new Date()) {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0x0800, true);      // flags: UTF-8 文件名
    lv.setUint16(8, 0, true);           // method 0 = stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, data);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cen.set(nameBytes, 46);
    central.push(cen);

    offset += local.length + data.length;
  }

  const centralSize = central.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, eocd];
  const total = all.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

/* ================================================================== *
 * 说明文本（界面直接引用，保证两处一致）
 * ================================================================== */

export const AMOUNT_TOOLTIP =
  '默认不改金额。开启后金额会变成「同样是两位小数、同样位数」的随机数，'
  + '好处是万一文件外泄也看不出你花了多少钱；代价是你就没法核对分类规则是不是按真实金额生效的了。'
  + '拿不准就保持关闭。';

export const MERCHANT_HINT =
  '商户名（带「公司/有限/科技/超市/便利店/医院/银行」等字样，或含字母，或超过 6 个字）会原样保留 —— '
  + '因为 AI 要靠真实的商户名来学「这家店该算哪一类」，把它们抹掉反而会让分类失效。'
  + '只有看起来像「个人姓名」的 2~4 个字才会被换成化名。';

export function isZipName(name) {
  return /\.zip$/i.test(String(name || ''));
}

export function isTextStatementName(name) {
  return /\.(csv|txt)$/i.test(String(name || ''));
}
