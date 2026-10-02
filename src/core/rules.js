/**
 * 轻账 · 分类规则表（商户记忆）
 *
 * 把「用户改过的分类」变成一张查得快的表。
 */

import { normalizeMerchant, cleanText } from './util.js';
import { learnRule } from './classify.js';
import * as db from './db.js';

/** 把数据库里的规则数组转成 Map，供 classify() 使用 */
export function ruleMapFromRules(rules) {
  const m = new Map();
  for (const r of rules || []) {
    if (r && r.key) m.set(r.key, r.category);
  }
  return m;
}

export async function loadRuleMap() {
  return ruleMapFromRules(await db.allRules());
}

/**
 * 记住「这个商户属于这个分类」。
 * 同一商户反复修改时，后改的覆盖先改的。
 */
export async function rememberCorrection(merchant, category) {
  const rule = learnRule(merchant, category);
  if (!rule) return null;
  await db.putRule(rule);
  return rule;
}

/**
 * 批量学习：把一批已经手动分类的交易变成规则。
 * @param {Array<{merchant:string, category:string, count?:number}>} items
 */
export async function rememberBatch(items) {
  const saved = [];
  for (const it of items) {
    const r = await rememberCorrection(it.merchant, it.category);
    if (r) saved.push(r);
  }
  return saved;
}

export async function forgetRule(key) {
  await db.deleteRule(key);
}

export async function listRules() {
  const rules = await db.allRules();
  return rules.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function clearAllRules() {
  await db.clearRules();
}

/**
 * 统计「哪些商户的分类已经被你改过」，
 * 用于设置页展示「轻账已经学会了这些」。
 */
export function summarizeRules(rules) {
  const byCategory = new Map();
  for (const r of rules || []) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r.merchant || r.key);
  }
  return byCategory;
}

export { normalizeMerchant, cleanText };
