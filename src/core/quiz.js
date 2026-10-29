// ============================================================
// 答题行为层：随机抽题（pickQuestion）+ 极简 Python 语法高亮（highlight）。
// 题面内容 / 同难度题池 / 槽位映射是纯数据，权威源在 data/quizBank.js
// （ADR-0001：题面内容不在重构中搬动）；本文件只依赖全局状态 G
// （core/state.js）与数据层，依赖方向保持单向：core/quiz → core/state + data。
// ============================================================

import { G } from './state.js';
import { QUESTIONS, POOLS, SLOT_POOL } from '../data/quizBank.js';

/**
 * 为符文槽随机抽一道题（同池同难度）：
 * - 同一块符文石在答对之前始终显示同一道题（抽题记录存 G.runeRolls）
 * - 已答对的题（G.qAnswered）不会再被抽到
 * - 其他符文石已抽走但未答对的题也会避开（同池不撞题）
 */
export function pickQuestion(slotId) {
  const pool = POOLS[SLOT_POOL[slotId]];
  if (!pool) throw new Error(`未知符文槽: ${slotId}`);

  // 已抽过且尚未答对 → 沿用同一道题
  const rolled = G.runeRolls[slotId];
  if (rolled && pool.includes(rolled) && !G.qAnswered.has(rolled)) {
    return { id: rolled, ...QUESTIONS[rolled] };
  }

  const taken = new Set(Object.values(G.runeRolls)); // 其他符文已抽走的题
  let candidates = pool.filter((qid) => !G.qAnswered.has(qid) && !taken.has(qid));
  if (!candidates.length) candidates = pool.filter((qid) => !G.qAnswered.has(qid));
  if (!candidates.length) candidates = pool.slice(); // 题池全部答完时允许复用（兜底）

  const qid = candidates[Math.floor(Math.random() * candidates.length)];
  G.runeRolls[slotId] = qid;
  return { id: qid, ...QUESTIONS[qid] };
}

// ---------- 极简 Python 语法高亮 ----------
const KEYWORDS = /\b(for|while|in|if|elif|else|def|return|import|from|and|or|not|True|False|as|lambda)\b/g;
const FUNCS = /\b(print|range|len|append|int|str|input|np|plt|array|arange|linspace|zeros|ones|mean|sum|rand|argmax|reshape|scatter|hist|xlabel|ylabel|savefig|fits|units|u|SkyCoord|quad|dblquad|curve_fit|solve_ivp|brentq|interp1d|fft|rfft|eig|cov|convolve|Pool|jit|ma|compressed|logical_not|isfinite|Bcast|gradient|inner|solve)\b/g;

export function highlight(code) {
  const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokens = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|_{3,}|\b[A-Za-z_][A-Za-z_0-9]*\b|\b\d+(?:\.\d+)?\b/g;
  let end = 0, html = '';
  for (const match of code.matchAll(tokens)) {
    html += esc(code.slice(end, match.index));
    const token = match[0];
    KEYWORDS.lastIndex = FUNCS.lastIndex = 0;
    const cls = /^['"]/.test(token) ? 'str' : token.startsWith('#') ? 'comment'
      : /^_{3,}$/.test(token) ? 'blank' : KEYWORDS.test(token) ? 'kw'
      : FUNCS.test(token) ? 'fn' : /^\d/.test(token) ? 'num' : '';
    html += cls === 'blank' ? '<span class="blank" id="quiz-blank">____</span>'
      : cls ? `<span class="${cls}">${esc(token)}</span>` : esc(token);
    end = match.index + token.length;
  }
  return html + esc(code.slice(end));
}
