/**
 * 轻账 · 自定义分类管理
 *
 * 只管「存、读、增、删、改」，界面在 settings 页。
 *
 * 存放位置：settings 表里的 customCategories / customIncomeCategories 两个键。
 * 用设置表而不是新建一个 object store，好处是不用改数据库版本、
 * 备份/恢复也自动带上（exportAll 已经把 settings 全量导出）。
 */

import {
  setCustomCategories, setCustomIncomeCategories,
  BUILTIN_CATEGORIES, BUILTIN_INCOME_CATEGORIES,
  CATEGORIES, INCOME_CATEGORIES,
  newCategoryId, isCustomCategory,
  CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES,
} from './model.js';
import * as db from './db.js';
import { cleanText } from './util.js';

const KEY_EXPENSE = 'customCategories';
const KEY_INCOME = 'customIncomeCategories';

/**
 * 从数据库载入自定义分类并应用到模型。
 * 应用启动时调用一次。
 */
export async function loadCustomCategories() {
  const [expense, income] = await Promise.all([
    db.getSetting(KEY_EXPENSE, []),
    db.getSetting(KEY_INCOME, []),
  ]);
  setCustomCategories(expense || []);
  setCustomIncomeCategories(income || []);
  return {
    expense: CATEGORIES.filter((c) => !c.builtin).length,
    income: INCOME_CATEGORIES.filter((c) => !c.builtin).length,
  };
}

/** 当前所有自定义分类 */
export function listCustom(lane = 'expense') {
  const arr = lane === 'income' ? INCOME_CATEGORIES : CATEGORIES;
  return arr.filter((c) => !c.builtin).map((c) => ({ ...c }));
}

/** 某一侧的全部分类（内置 + 自定义），给界面渲染用 */
export function listAll(lane = 'expense') {
  const arr = lane === 'income' ? INCOME_CATEGORIES : CATEGORIES;
  return arr.map((c) => ({ ...c }));
}

/* ------------------------------------------------------------------ *
 * 增删改
 * ------------------------------------------------------------------ */

/**
 * 新增一个自定义分类。
 * @param {object} input { name, icon, color, lane: 'expense'|'income' }
 * @returns {Promise<object>} 新建的分类
 */
export async function addCategory(input) {
  const lane = input.lane === 'income' ? 'income' : 'expense';
  const name = cleanText(input.name);

  if (!name) throw new Error('请填分类名称');
  if (name.length > 12) throw new Error('分类名称最多 12 个字');

  const all = listAll(lane);
  if (all.some((c) => c.name === name)) {
    throw new Error(`已经有叫「${name}」的分类了`);
  }

  const cat = {
    id: newCategoryId(name),
    name,
    icon: input.icon || '🏷️',
    color: input.color || '#8E8E93',
    createdAt: Date.now(),
    builtin: false,
  };

  const next = [...listCustom(lane), cat];
  await persist(lane, next);
  return cat;
}

/**
 * 改名 / 换图标。内置分类不允许改。
 */
export async function updateCategory(id, patch, lane = 'expense') {
  if (!isCustomCategory(id) && !listCustom(lane).some((c) => c.id === id)) {
    throw new Error('内置分类不能修改');
  }
  const list = listCustom(lane);
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('找不到这个分类');

  const name = patch.name != null ? cleanText(patch.name) : list[idx].name;
  if (!name) throw new Error('请填分类名称');
  if (name.length > 12) throw new Error('分类名称最多 12 个字');

  const all = listAll(lane);
  if (all.some((c) => c.id !== id && c.name === name)) {
    throw new Error(`已经有叫「${name}」的分类了`);
  }

  list[idx] = {
    ...list[idx],
    name,
    icon: patch.icon != null ? patch.icon : list[idx].icon,
    color: patch.color != null ? patch.color : list[idx].color,
  };
  await persist(lane, list);
  return list[idx];
}

/**
 * 删除一个自定义分类。
 *
 * ⚠️ 关键：分类被删掉之后，原来用它记的账不能变成「幽灵分类」。
 * 所以这里把那些交易改挂到「其他」上，并返回影响了多少笔，
 * 让界面如实告诉用户 —— 数据可以改，但不能偷偷改。
 *
 * @returns {Promise<{movedTx:number}>}
 */
export async function deleteCategory(id, lane = 'expense') {
  if (!listCustom(lane).some((c) => c.id === id)) {
    throw new Error('内置分类不能删除');
  }

  const fallback = lane === 'income' ? 'other_in' : 'other';

  // 把用到这个分类的交易改挂到「其他」
  const all = await db.allTx();
  const affected = all.filter((t) => t.category === id);
  for (const t of affected) {
    t.category = fallback;
    t.updatedAt = Date.now();
  }
  if (affected.length) await db.putTxMany(affected);

  // 指向这个分类的规则也要清掉（否则规则会指向一个不存在的分类）
  const rules = await db.allRules();
  const deadRules = rules.filter((r) => r.category === id);
  for (const r of deadRules) await db.deleteRule(r.key);

  const next = listCustom(lane).filter((c) => c.id !== id);
  await persist(lane, next);

  return { movedTx: affected.length, removedRules: deadRules.length };
}

/** 恢复成只有内置分类。用到自定义分类的交易会挂到「其他」。 */
export async function resetCategories(lane = 'expense') {
  const custom = listCustom(lane);
  if (!custom.length) return { movedTx: 0, removed: 0 };

  const fallback = lane === 'income' ? 'other_in' : 'other';
  const ids = new Set(custom.map((c) => c.id));

  const all = await db.allTx();
  const affected = all.filter((t) => ids.has(t.category));
  for (const t of affected) {
    t.category = fallback;
    t.updatedAt = Date.now();
  }
  if (affected.length) await db.putTxMany(affected);

  const rules = await db.allRules();
  const deadRules = rules.filter((r) => ids.has(r.category));
  for (const r of deadRules) await db.deleteRule(r.key);

  await persist(lane, []);
  return { movedTx: affected.length, removed: custom.length, removedRules: deadRules.length };
}

/* ------------------------------------------------------------------ *
 * 内部
 * ------------------------------------------------------------------ */

async function persist(lane, customList) {
  const key = lane === 'income' ? KEY_INCOME : KEY_EXPENSE;
  const clean = customList.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    createdAt: c.createdAt || Date.now(),
  }));
  await db.setSetting(key, clean);

  // 立刻应用到模型，界面下次重绘就是这个新状态
  if (lane === 'income') setCustomIncomeCategories(clean);
  else setCustomCategories(clean);

  return clean;
}

/** 某个分类下有多少笔交易（删除前提示用） */
export async function countTxInCategory(id) {
  const all = await db.allTx();
  return all.filter((t) => t.category === id && !t.duplicateOf).length;
}

export { CATEGORY_ICON_CHOICES, CATEGORY_COLOR_CHOICES, BUILTIN_CATEGORIES, BUILTIN_INCOME_CATEGORIES };
