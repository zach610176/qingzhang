/**
 * 轻账 · 自动分类引擎
 *
 * 工作顺序（后面的不会覆盖前面的）：
 *   1. 用户教的规则（商户记忆）—— 权重最高，你改过一次就永远听你的
 *   2. 内置关键词规则 —— 覆盖主流商户
 *   3. 兜底：「其他」
 *
 * 另外负责判定「内部转账 / 信用卡还款」，这两种不算消费。
 */

import { normalizeMerchant, containsAny, cleanText } from './util.js';

/* ------------------------------------------------------------------ *
 * 内置关键词规则
 * 顺序有意义：越靠前优先级越高（避免「美团买药」被算成餐饮）
 * ------------------------------------------------------------------ */

const BUILTIN = [
  // —— 医疗（要放在餐饮/购物前面，因为「美团买药」「京东健康」容易被误判）——
  { cat: 'medical', kw: ['医院', '药房', '药店', '大药房', '买药', '医药', '诊所', '门诊', '挂号', '体检', '口腔', '牙科', '眼科', '卫生院', '卫生服务', '疾控', '医疗', '健康科技', '京东健康', '阿里健康', '叮当快药', '同仁堂', '国大药房', '益丰', '老百姓大药房', '海王星辰'] },

  // —— 教育（同理，放在前面）——
  { cat: 'education', kw: ['学费', '学杂费', '培训', '教育', '网校', '课程', '驾校', '考试', '报名费', '书店', '图书', '文具', '得到', '樊登', '新东方', '学而思', '猿辅导', '中国大学', '知网', '超星', '校园卡', '宿舍费', '教材'] },

  // —— 订阅（自动续费类，要在「娱乐」前面）——
  { cat: 'subs', kw: ['自动续费', '连续包月', '连续包年', '会员服务', '订阅', 'icloud', 'apple.com/bill', 'apple music', 'app store', 'netflix', 'spotify', '爱奇艺', '腾讯视频', '优酷', '芒果tv', '哔哩哔哩大会员', 'b站大会员', '网易云音乐', 'qq音乐', '酷狗', '百度网盘', 'wps会员', 'office365', 'chatgpt', 'openai', 'claude', '夸克会员', '迅雷会员', 'steam 充值', 'google one', 'dropbox'] },

  // —— 交通 ——
  { cat: 'transport', kw: ['地铁', '轨道交通', '公交', '巴士', '出租', '打车', '滴滴', '高德打车', '曹操出行', 't3出行', '花小猪', '首汽', '享道', '哈啰', '青桔', '美团单车', '共享单车', '单车', '停车', '泊车', '高速', 'etc', '通行费', '加油', '中石化', '中石油', '壳牌', '充电桩', '特来电', '星星充电', '火车票', '12306', '高铁', '动车', '机票', '航空', '航旅', '春秋航空', '东方航空', '南方航空', '机场', '长途汽车', '轮渡', '船票', '违章', '车管所', '年检', '车险', '摩托车', '电动车充电'] },

  // —— 餐饮 ——
  { cat: 'food', kw: ['餐饮', '饭店', '餐厅', 'food', '美团外卖', '饿了么', '外卖', '快餐', '汉堡', '麦当劳', 'mcdonald', '肯德基', 'kfc', '必胜客', 'pizza', '星巴克', 'starbucks', '瑞幸', 'luckin', '库迪', '咖啡', '奶茶', '喜茶', '奈雪', '蜜雪冰城', '茶百道', '古茗', '沪上阿姨', '霸王茶姬', '一点点', 'coco', '书亦', '便利店', '罗森', 'lawson', '全家', 'family', '711', '7-11', '便利蜂', '美宜佳', '超市', '生鲜', '菜市场', '菜场', '食堂', '小笼包', '面馆', '拉面', '米线', '火锅', '烧烤', '烤肉', '自助餐', '小吃', '早餐', '豆浆', '煎饼', '沙县', '黄焖鸡', '麻辣烫', '螺蛳粉', '料理', '寿司', '日料', '韩餐', '西餐', '酒馆', '酒吧', '烘焙', '面包', '蛋糕', '水果', '酸奶', '零食', '盒马', '山姆', '永辉', '大润发', '沃尔玛', '家乐福', '叮咚买菜', '每日优鲜', '朴朴', '钱大妈', '美团买菜', '小象超市'] },

  // —— 住房 ——
  { cat: 'housing', kw: ['房租', '租金', '住房', '物业', '物业管理', '水费', '电费', '燃气', '煤气', '天然气', '供暖', '取暖', '宽带', '电信', '联通', '移动通信', '中国移动', '中国联通', '中国电信', '话费', '充值话费', '家政', '保洁', '搬家', '中介费', '链家', '贝壳', '自如', '蛋壳', '公寓', '宿舍', '床品', '家居', '宜家', 'ikea', '家具', '装修', '建材', '五金', '垃圾处理', '公摊'] },

  // —— 娱乐 ——
  { cat: 'fun', kw: ['电影', '影院', '影城', '万达', 'cgv', '横店', 'ktv', '唱歌', '桌游', '剧本杀', '密室', '电玩', '游戏', 'steam', 'epic', 'playstation', 'psn', 'switch', '任天堂', '米哈游', '原神', '网易游戏', '腾讯游戏', '王者荣耀', '充值点券', '点券', '演出', '演唱会', '话剧', 'livehouse', '展览', '美术馆', '博物馆', '景区', '门票', '公园', '游乐园', '迪士尼', '环球影城', '海洋馆', '动物园', '旅游', '携程', '去哪儿', '飞猪', '马蜂窝', 'airbnb', '民宿', '酒店', '宾馆', '旅店', '露营', '滑雪', '游泳', '健身房', '健身', '瑜伽', '球馆', '羽毛球', '篮球', '桌球', '按摩', '足疗', 'spa', '美容', '美发', '理发', '美甲', '宠物', '猫舍', '狗粮', '花店', '鲜花', '彩票', '烟', '酒'] },

  // —— 购物 ——
  { cat: 'shopping', kw: ['淘宝', '天猫', 'taobao', 'tmall', '京东', 'jd.com', '拼多多', '唯品会', '苏宁', '国美', '当当', '小红书', '抖音商城', '快手小店', '微店', '闲鱼', '转转', '得物', '奥特莱斯', '商场', '百货', '优衣库', 'uniqlo', 'zara', 'h&m', '无印良品', 'muji', '名创优品', 'nike', '耐克', 'adidas', '阿迪', '李宁', '安踏', '服饰', '服装', '鞋', '箱包', '数码', '手机', '电脑', '笔记本', '耳机', '键盘', '鼠标', '显示器', '相机', '苹果', 'apple store', '小米', '华为', 'oppo', 'vivo', '荣耀', '三星', '家电', '电器', '厨具', '日用品', '化妆品', '护肤', '彩妆', '丝芙兰', '屈臣氏', '口红', '香水', '母婴', '奶粉', '纸尿裤', '玩具', '模型', '手办', '谷子', '文具店', '快递', '邮费', '运费', '聚划算', '百亿补贴'] },

  // —— 人情（红包、转账给个人、随礼）——
  { cat: 'gift', kw: ['红包', '礼金', '随礼', '份子', '压岁钱', '生日礼物', '礼物', '代付', '垫付', '转账给', '亲属卡', '人情'] },
];

/** 明确的「内部转账 / 信用卡还款」信号词 */
export const TRANSFER_HINTS = [
  '转账', '转入', '转出', '提现', '充值', '零钱通', '余额宝', '余利宝',
  '银行转入', '银行转出', '还款', '信用卡还款', '花呗', '借呗', '网商贷',
  '备用金', '资金归集', '内部',
];

export const REPAY_HINTS = ['还款', '信用卡还款', '花呗', '借呗', '分期', '偿还', '贷款还款', '车贷', '房贷还款'];

/** 冲正 / 失败 的交易应该直接丢弃 */
export const INVALID_HINTS = ['已退款', '退款成功', '已全额退款', '交易关闭', '已关闭', '失败', '已撤销', '取消', '未支付', '已失效', '解冻'];

/* ------------------------------------------------------------------ *
 * 核心分类
 * ------------------------------------------------------------------ */

/**
 * @param {object} input
 * @param {string} input.merchant  交易对方
 * @param {string} [input.description] 商品/说明
 * @param {string} [input.rawType]  账单原始类型文字
 * @param {Map<string, string>|object} [rules] 用户规则：归一化商户 → 分类id
 * @returns {{category: string, matchedBy: string, matchedKey?: string}}
 */
export function classify(input, rules) {
  const merchant = cleanText(input.merchant);
  const description = cleanText(input.description);
  const rawType = cleanText(input.rawType);

  // 1) 用户规则：先拿「完整商户名」精确匹配，再拿归一化名匹配
  const ruleMap = toRuleMap(rules);
  if (ruleMap.size) {
    const candidates = [merchant];
    const norm = normalizeMerchant(merchant);
    if (norm) candidates.push(norm);

    for (const c of candidates) {
      const hit = ruleMap.get(c);
      if (hit) return { category: hit, matchedBy: 'rule', matchedKey: c };
    }

    // 归一化后互相包含也算命中（「瑞幸咖啡(上海)」命中规则「瑞幸咖啡」）
    if (norm) {
      for (const [key, cat] of ruleMap) {
        if (!key) continue;
        if (norm.includes(key) || key.includes(norm)) {
          return { category: cat, matchedBy: 'rule-fuzzy', matchedKey: key };
        }
      }
    }
  }

  // 2) 内置关键词：商户名优先，其次说明和原始类型
  const haystacks = [
    { text: merchant, weight: 3 },
    { text: description, weight: 2 },
    { text: rawType, weight: 1 },
  ].filter((h) => h.text);

  let best = null;
  for (const rule of BUILTIN) {
    for (const h of haystacks) {
      if (containsAny(h.text, rule.kw)) {
        const score = h.weight;
        if (!best || score > best.score) {
          best = { category: rule.cat, score, matchedBy: 'builtin', matchedKey: rule.kw.find((k) => h.text.toLowerCase().includes(k.toLowerCase())) };
        }
        break;
      }
    }
    if (best && best.score === 3) break; // 已经是最高权重，不用再找
  }
  if (best) return { category: best.category, matchedBy: best.matchedBy, matchedKey: best.matchedKey };

  // 3) 兜底
  return { category: 'other', matchedBy: 'default' };
}

function toRuleMap(rules) {
  if (!rules) return new Map();
  if (rules instanceof Map) return rules;
  if (Array.isArray(rules)) {
    const m = new Map();
    for (const r of rules) if (r && r.key) m.set(r.key, r.category);
    return m;
  }
  return new Map(Object.entries(rules));
}

/* ------------------------------------------------------------------ *
 * 交易类型判定
 * ------------------------------------------------------------------ */

/**
 * 判定一笔交易的最终类型。
 *
 * @param {object} input
 * @param {string} input.direction  'out' | 'in' | 'none'（账单里的 收/支）
 * @param {string} [input.rawType]
 * @param {string} [input.merchant]
 * @param {string} [input.description]
 * @param {string} [input.source]   'wechat' | 'alipay' | ...
 * @param {string[]} [selfNames]    你自己的名字/昵称，用于识别「转给自己」
 * @returns {'expense'|'income'|'refund'|'redpacket'|'transfer'|'repay'}
 */
export function detectType(input, selfNames = []) {
  const rawType = cleanText(input.rawType);
  const merchant = cleanText(input.merchant);
  const description = cleanText(input.description);
  const dir = input.direction || 'out';
  const all = `${rawType} ${merchant} ${description}`;

  // 退款：方向可能是「收入」，但本质是冲减消费
  if (/退款|退货|退费|返现|冲正|已退/.test(all)) return 'refund';

  // 信用卡还款 / 借贷还款：永远不算消费
  if (containsAny(all, REPAY_HINTS)) return 'repay';

  // 红包
  if (/红包/.test(all)) {
    if (dir === 'in') return 'redpacket';
    // 发红包是消费（人情），不是转账
    return 'expense';
  }

  // 转账类：如果对方是你自己 → 内部转账；对方是别人 → 正常收支
  const looksLikeTransfer = containsAny(all, TRANSFER_HINTS);
  if (looksLikeTransfer) {
    if (isSelfTransfer(merchant, description, selfNames)) return 'transfer';
    // 账单里的「转账-来自xxx」这种，方向已经决定收支
    if (/信用卡|花呗|借呗|贷款/.test(all) && /还款|偿还/.test(all)) return 'repay';
    // 提现、充值到自己账户
    if (/提现|充值|零钱通|余额宝|余利宝|资金归集/.test(all) && dir === 'none') return 'transfer';
    // 「不计收支」= 账单已经明说这笔钱既不进也不出，必须先判定。
    // 以前这里会继续往下走，落到 /转账/ 分支变成消费、或者落到收尾的
    // dir==='in' 变成收入，两种都是虚增（支付宝「信用借还 / 不计收支」曾算成收入）。
    if (dir === 'none') return 'transfer';
    if (/转账/.test(rawType)) {
      // 转给具体的人，算消费（人情类会自己命中）；收到别人转账算收入
      return dir === 'in' ? 'income' : 'expense';
    }
  }

  // 走到这里说明账单没写方向、且带有转账/还款类信号词（上面 lookedLikeTransfer 分支已处理）。
  // 「不计收支」= 钱在账户之间挪，既不是消费也不是收入，统一按内部转账处理。
  if (dir === 'none') return 'transfer';

  if (dir === 'in') return 'income';
  return 'expense';
}

/**
 * 判断是不是「转给自己」。
 * 依据：对方名字出现在自己配置的名字列表里，
 * 或说明里带有自己银行卡/账户的后四位。
 */
export function isSelfTransfer(merchant, description, selfNames = []) {
  const text = `${merchant} ${description}`.toLowerCase();
  if (!text.trim()) return false;

  for (const name of selfNames) {
    const n = cleanText(name).toLowerCase();
    if (!n) continue;
    if (n.length >= 2 && text.includes(n)) return true;
  }

  // 「转账到银行卡」「提现到xx银行」「零钱通转入」这类，几乎一定是自己账户间调动
  if (/提现到|转入银行|转出到银行|银行卡充值|还款至|自动还款|零钱通(转入|转出)|余额宝(转入|转出)|余利宝/.test(text)) {
    return true;
  }

  return false;
}

/**
 * 判断账单里这一行是否需要跳过（失败、关闭、冲正等）
 */
export function shouldSkipRow(row, getField) {
  const status = cleanText(getField(row, ['当前状态', '状态', '交易状态', '订单状态']) || '');
  if (!status) return false;
  // 「已退款」必须在这里：微信有大量状态就写「已退款」的行，
  // 漏掉它会让已经退钱给用户的交易仍然算成消费（INVALID_HINTS 里本来就有这个词）
  if (/已退款|退款成功|已全额退款|交易关闭|已关闭|失败|已撤销|交易已取消|未支付|已失效/.test(status)) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * 从用户修正中学习
 * ------------------------------------------------------------------ */

/**
 * 当用户手动改了一笔交易的分类，生成一条规则。
 * @param {string} merchant
 * @param {string} category
 * @returns {{key:string, category:string, merchant:string, updatedAt:number}|null}
 */
export function learnRule(merchant, category) {
  const clean = cleanText(merchant);
  if (!clean || clean.length < 2) return null;
  // 纯数字或纯符号的「商户」没有学习价值
  if (/^[\d\s\W]+$/.test(clean)) return null;
  return {
    key: normalizeMerchant(clean) || clean.toLowerCase(),
    category,
    merchant: clean,
    updatedAt: Date.now(),
  };
}

/** 导出一份可读的规则表（用于设置页展示 / 删除） */
export function ruleSummary(rule) {
  return {
    key: rule.key,
    merchant: rule.merchant || rule.key,
    category: rule.category,
    updatedAt: rule.updatedAt || 0,
  };
}
