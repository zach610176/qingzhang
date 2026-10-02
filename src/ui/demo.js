/**
 * 轻账 · 演示数据
 *
 * 全部是伪造的交易，用来在导入真实账单之前看界面。
 * 商户名用的是真实存在的高频商户，这样自动分类的效果也能一并验证。
 */

import { makeTx } from '../core/model.js';
import { classify } from '../core/classify.js';
import { fingerprint } from '../core/parser.js';

/** 商户池：[商户名, 金额范围(元), 权重] */
const MERCHANTS = [
  // 餐饮
  ['瑞幸咖啡', [9, 32], 14, 'food'],
  ['麦当劳', [15, 55], 8, 'food'],
  ['肯德基', [18, 60], 6, 'food'],
  ['美团外卖', [18, 55], 18, 'food'],
  ['饿了么', [16, 48], 12, 'food'],
  ['蜜雪冰城', [4, 16], 9, 'food'],
  ['星巴克', [28, 58], 4, 'food'],
  ['喜茶', [15, 32], 3, 'food'],
  ['学校食堂', [8, 22], 22, 'food'],
  ['罗森便利店', [6, 35], 7, 'food'],
  ['鲜丰水果', [12, 60], 4, 'food'],
  ['海底捞火锅', [88, 260], 2, 'food'],

  // 交通
  ['上海地铁', [3, 8], 26, 'transport'],
  ['滴滴出行', [12, 68], 9, 'transport'],
  ['哈啰单车', [1.5, 4], 8, 'transport'],
  ['中国石化加油', [200, 420], 2, 'transport'],
  ['铁路12306', [55, 320], 3, 'transport'],

  // 购物
  ['淘宝', [25, 380], 12, 'shopping'],
  ['天猫超市', [30, 200], 6, 'shopping'],
  ['京东商城', [45, 900], 5, 'shopping'],
  ['拼多多', [9, 120], 6, 'shopping'],
  ['优衣库', [99, 499], 2, 'shopping'],
  ['名创优品', [15, 90], 3, 'shopping'],
  ['Apple Store', [149, 1999], 1, 'shopping'],
  ['小米之家', [79, 699], 1, 'shopping'],

  // 住房 / 通讯
  ['中国移动话费', [30, 100], 3, 'housing'],
  ['上海市电力公司', [45, 180], 3, 'housing'],
  ['小区物业管理费', [120, 260], 3, 'housing'],

  // 娱乐
  ['万达影城', [35, 88], 3, 'fun'],
  ['B站大会员', [15, 148], 3, 'subs'],
  ['网易云音乐', [8, 88], 2, 'subs'],
  ['健身房月卡', [199, 399], 2, 'fun'],
  ['去哪儿旅行', [280, 1600], 1, 'fun'],
  ['宠物店', [45, 260], 2, 'fun'],

  // 医疗
  ['叮当快药', [18, 120], 3, 'medical'],
  ['校医院', [10, 260], 2, 'medical'],
  ['益丰大药房', [20, 160], 2, 'medical'],

  // 教育
  ['当当网图书', [25, 180], 4, 'education'],
  ['中国知网', [10, 60], 2, 'education'],
  ['新东方在线', [199, 1200], 1, 'education'],
  ['学校教材费', [60, 320], 2, 'education'],
];

function pickWeighted(list, rnd) {
  const total = list.reduce((s, x) => s + x[2], 0);
  let r = rnd() * total;
  for (const item of list) {
    r -= item[2];
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

/** 一个可复现的伪随机数生成器（mulberry32），保证每次演示数据一样 */
function makeRnd(seed = 20260101) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成约 120 笔演示交易，覆盖最近 3 个月。
 */
export function demoTxs() {
  const rnd = makeRnd(20260101);
  const out = [];
  const now = new Date();
  const batchId = 'demo_batch';

  // 从 3 个月前的 1 号开始，到今天
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const days = Math.floor((now - start) / 86400000);

  for (let d = 0; d <= days; d++) {
    const day = new Date(start.getTime() + d * 86400000);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    // 每天的交易笔数：工作日 1-4 笔，周末 2-6 笔
    const n = Math.floor(rnd() * (isWeekend ? 5 : 3)) + 1;

    for (let i = 0; i < n; i++) {
      const [merchant, [lo, hi], , ] = pickWeighted(MERCHANTS, rnd);
      let amount = lo + rnd() * (hi - lo);
      // 让金额更像真的：小额凑到分，大额凑到整数
      amount = amount >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100;

      const hour = rnd() < 0.25 ? 8 + Math.floor(rnd() * 3)
        : rnd() < 0.5 ? 11 + Math.floor(rnd() * 2)
        : rnd() < 0.8 ? 17 + Math.floor(rnd() * 3)
        : 12 + Math.floor(rnd() * 10);

      const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
        hour, Math.floor(rnd() * 60), Math.floor(rnd() * 60)).getTime();

      const src = rnd() < 0.55 ? 'wechat' : 'alipay';
      const cls = classify({ merchant }, new Map());

      const tx = makeTx({
        ts,
        amountCents: Math.round(amount * 100),
        type: 'expense',
        category: cls.category,
        merchant,
        description: src === 'wechat' ? '微信支付' : '支付宝支付',
        source: src,
        account: src === 'wechat' ? '零钱' : (rnd() < 0.5 ? '余额宝' : '花呗'),
        batchId,
      });
      tx.fp = fingerprint(tx);
      out.push(tx);
    }
  }

  // 每月的固定支出
  for (let m = 2; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const add = (dayOfMonth, merchant, yuan, category, type = 'expense', source = 'manual') => {
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const dd = Math.min(dayOfMonth, lastDay);
      const ts = new Date(base.getFullYear(), base.getMonth(), dd, 9, 30, 0).getTime();
      if (ts > now.getTime()) return;
      const tx = makeTx({
        ts, amountCents: Math.round(yuan * 100), type, category, merchant,
        description: type === 'expense' ? '每月固定支出' : '每月固定收入',
        source, account: '', batchId,
      });
      tx.fp = fingerprint(tx);
      out.push(tx);
    };

    add(1, '房租', 1800, 'housing');
    add(5, 'iCloud 自动续费', 6, 'subs');
    add(8, '中国移动话费', 59, 'housing');
    add(10, '上海市电力公司', 78.4, 'housing');
    add(12, 'B站大会员', 15, 'subs');
    add(15, '健身房月卡', 268, 'fun');
    add(20, '爸妈生活费', 1500, 'income', 'income');
    add(25, '学校补贴', 600, 'income', 'income');
  }

  // 几笔退款
  const refundMerchants = [['京东商城', 189], ['淘宝', 68.5], ['优衣库', 199]];
  for (let i = 0; i < refundMerchants.length; i++) {
    const [merchant, yuan] = refundMerchants[i];
    const ts = new Date(now.getFullYear(), now.getMonth(), 3 + i * 6, 14, 20, 0).getTime();
    if (ts > now.getTime()) continue;
    const tx = makeTx({
      ts, amountCents: Math.round(yuan * 100), type: 'refund', category: 'refund',
      merchant, description: '退款', source: 'alipay', batchId,
    });
    tx.fp = fingerprint(tx);
    out.push(tx);
  }

  // 红包（收）
  for (let i = 0; i < 5; i++) {
    const ts = new Date(now.getFullYear(), now.getMonth() - (i % 3), 2 + i * 4, 20, 15, 0).getTime();
    if (ts > now.getTime()) continue;
    const tx = makeTx({
      ts, amountCents: [2000, 6600, 8800, 5200, 13140][i], type: 'redpacket', category: 'redpacket',
      merchant: ['妈妈', '爸爸', '室友小李', '表哥', '奶奶'][i], description: '微信红包', source: 'wechat', batchId,
    });
    tx.fp = fingerprint(tx);
    out.push(tx);
  }

  // 内部转账与信用卡还款（这两类不该计入消费）
  for (let m = 2; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const t1 = new Date(base.getFullYear(), base.getMonth(), 6, 10, 0, 0).getTime();
    const t2 = new Date(base.getFullYear(), base.getMonth(), 18, 21, 0, 0).getTime();
    if (t1 <= now.getTime()) {
      const a = makeTx({
        ts: t1, amountCents: 200000, type: 'transfer', category: 'other',
        merchant: '余额宝', description: '转入余额宝', source: 'alipay', batchId,
      });
      a.fp = fingerprint(a);
      out.push(a);
    }
    if (t2 <= now.getTime()) {
      const b = makeTx({
        ts: t2, amountCents: 45800, type: 'repay', category: 'other',
        merchant: '花呗', description: '花呗自动还款', source: 'alipay', batchId,
      });
      b.fp = fingerprint(b);
      out.push(b);
    }
  }

  out.sort((a, b) => a.ts - b.ts);
  return out;
}
