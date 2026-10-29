// ============================================================
// i18n 核心（Lane B）：中文/English 双语显示层
// 原则（ADR-0001 同源精神）：
//   - 权威数据仍是 zh（quizBank.js / chapters.js / maps.js）；
//     本层只做「显示时」的英文覆写，不迁移、不清空 save v2。
//   - 语言偏好存独立 localStorage key `pyquest:lang`（默认 zh），
//     绝不写入游戏存档。
//   - setLang 即时生效：更新 <html lang>、静态 DOM（data-i18n，zh 往返恢复原文）、
//     语言胶囊按钮态，并派发自定义 `pyquest:lang` 事件 +
//     `pyquest:hud`（HUD 目标行重渲染）。不重启场景、不重抽题。
// ============================================================
import { QUESTIONS_EN, CHAPTER_LABELS_EN, HINTS_EN } from '../data/quizBank-en.js';
import { CHAPTERS_EN } from '../data/chapters-en.js';

const LANG_KEY = 'pyquest:lang';
let lang = 'zh';
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'zh') lang = saved;
} catch { /* localStorage 不可用时静默回退默认 zh */ }

export function getLang() { return lang; }
export function isEn() { return lang === 'en'; }

/** 双语直取：t('中文', 'English') */
export function t(zh, en) { return lang === 'en' ? en : zh; }

// ------------------------------------------------------------
// 静态 DOM 文案（index.html 的 data-i18n 元素）
// html 里的中文原文即 zh 槽；此处只补英文与个别含 kbd 的模板
// ------------------------------------------------------------
const STATIC_EN = {
  'quiz-cancel': 'Not now',
  'lg-done': 'Cleared',
  'lg-open': 'Open',
  'lg-lock': 'Locked',
  subtitle: 'NLI Asset Preview · Static Poses',
  keys: `<kbd>Arrows</kbd> / <kbd>WASD</kbd> move &nbsp;·&nbsp; <kbd>J</kbd> / <kbd>Space</kbd> attack &nbsp;·&nbsp; <kbd>E</kbd> interact / talk &nbsp;·&nbsp; <kbd>Tab</kbd> world map<br />
        Eight chapters map to eight weeks: basics → functions → NumPy → astro packages → speed-up → numerical methods → signals → dark matter halos!`,
  'btn-restart': 'Abandon & Restart',
};

function applyHtmlLang() {
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
}

// 首次加载时快照 zh 原文，切回中文时原样恢复（支持 zh ⇄ en 往返）
const ZH_ORIGINALS = new Map();

function applyStaticDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!ZH_ORIGINALS.has(el)) ZH_ORIGINALS.set(el, el.innerHTML);
    if (lang === 'en') {
      const en = STATIC_EN[key];
      if (en !== undefined) el.innerHTML = en;
    } else {
      el.innerHTML = ZH_ORIGINALS.get(el); // zh：恢复 index.html 原文
    }
  });
  document.querySelectorAll('[data-lang-opt]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.langOpt === lang));
  });
}

// ------------------------------------------------------------
// 语言切换短反馈（aria-live，1.6s 收起，不打断互动提示）
// ------------------------------------------------------------
let _toastT = 0;
function showToast() {
  const el = document.getElementById('lang-toast');
  if (!el) return;
  el.textContent = lang === 'en' ? 'Language: English' : '已切换为中文';
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('show'), 1600);
}

export function setLang(next) {
  if (next !== 'en' && next !== 'zh') return;
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* 忽略写入失败 */ }
  applyHtmlLang();
  applyStaticDom();
  showToast();
  document.dispatchEvent(new CustomEvent('pyquest:lang', { detail: { lang } }));
  document.dispatchEvent(new CustomEvent('pyquest:hud')); // HUD 目标行等即时重渲染
}

// ------------------------------------------------------------
// 语言胶囊（HUD 右上 + 标题页）：真实 button、aria-pressed、
// 键盘可聚焦；聚焦时拦截游戏按键（J/空格/E 等不冒泡触发挥剑）
// ------------------------------------------------------------
export function initLangToggles() {
  applyHtmlLang();
  applyStaticDom();
  document.querySelectorAll('[data-lang-opt]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.langOpt));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') return; // 保留 Tab 导航
      e.stopPropagation(); // 不冒泡到挥剑/交互/答题快捷键
    });
  });
}

// ------------------------------------------------------------
// 题目显示层本地化：qid → { prompt, explain, options? }
// 只覆写文案；id / answer / code / fill / tier / 抽题与判定不动。
// 填空题（fill）选项是代码，sidecar 不提供 options → 原样使用。
// ------------------------------------------------------------
export function localizeQuestion(q) {
  if (lang !== 'en' || !q || !QUESTIONS_EN[q.id]) return q;
  const en = QUESTIONS_EN[q.id];
  const out = { ...q, prompt: en.prompt, explain: en.explain };
  if (Array.isArray(en.options) && en.options.length === q.options.length) {
    out.options = en.options;
  }
  if (CHAPTER_LABELS_EN[q.chapter]) out.chapter = CHAPTER_LABELS_EN[q.chapter];
  return out;
}

/** 答题失误提示（QuizOverlay._hint 的英文表，键沿用 zh 章节标签） */
export function hintEn(chapterLabel) {
  return (lang === 'en' && HINTS_EN[chapterLabel]) || null;
}

// ------------------------------------------------------------
// 章节显示层本地化：L(ch) 返回 en 覆写后的章节视图（浅合并）。
// npcLines / extraGreets / victory 结构与 zh 完全同形，
// phaseOf / npcLinesFor 等既有逻辑无需感知语言。
// ------------------------------------------------------------
export function L(ch) {
  if (lang !== 'en' || !ch || !CHAPTERS_EN[ch.id]) return ch;
  return { ...ch, ...CHAPTERS_EN[ch.id] };
}

// ------------------------------------------------------------
// 地图默认门文案（maps.js 只读）：按道具形态在显示层重建英文
//   - unlockOnShards 巢穴封印门：两行 lockLines
//   - 其余（requires done 的前方传送门）：迷雾两行
// ------------------------------------------------------------
const DOOR_LABEL_EN = {
  '前方传送门': 'Portal Ahead',
  '返回上一章': 'Back to Previous Chapter',
  '前往下一章': 'To the Next Chapter',
  '洞窟封印': 'Cavern Seal',
  '巢穴封印': 'Lair Seal',
  '封印之门': 'Sealed Gate',
};
const LOCK_HINT_EN = {
  '迷雾封锁着传送门……': 'Mist seals the portal…',
  '迷雾封锁着前方……': 'Mist blocks the way ahead…',
  '巢穴之门纹丝不动……': 'The lair gate will not budge…',
  '被魔法封印着……': 'Sealed by magic…',
};

/** 门/传送门名称（prop.label 可能是章名或默认词） */
export function localizeDoorLabel(prop, ch) {
  const label = prop && prop.label;
  if (lang !== 'en' || !label) return label;
  if (ch && label === ch.lairName) return L(ch).lairName;
  if (ch && label === ch.fieldName) return L(ch).fieldName;
  return DOOR_LABEL_EN[label] || label;
}

/** 封印门 lockLines（zh 由 maps.js 生成，en 按形态重建） */
export function localizeLockLines(prop, ch) {
  if (lang !== 'en' || !prop || !Array.isArray(prop.lockLines)) return prop.lockLines;
  if (prop.unlockOnShards && ch) {
    const n = ch.shardsNeeded;
    return [
      `The gate to the ${L(ch).lairName} is locked by a seal.`,
      `The tablet whispers: "Gather ${n} ${L(ch).shardLabel} and the seal will break."`,
    ];
  }
  return [
    'A thin mist clings to the portal.',
    "(It seems this chapter's trial must be completed before the mist clears)",
  ];
}

/** 封印提示浮字（lockHint） */
export function localizeLockHint(prop) {
  const hint = prop && prop.lockHint;
  if (lang !== 'en' || !hint) return hint;
  return LOCK_HINT_EN[hint] || hint;
}

// 模块加载即接线（module script 在 DOM ready 后执行）。
// Node 侧检查脚本（check-visual-invariants 等）会经 WorldScene import 本模块，
// 无 document 环境下跳过 DOM 接线，纯显示层函数（t/localize*/L）仍可用。
if (typeof document !== 'undefined') initLangToggles();
