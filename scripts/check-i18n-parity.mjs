// ============================================================
// i18n sidecar parity check（Lane B）
// 校验 en sidecar 与权威 zh 数据的结构/语义一致性：
//   1) quizBank-en：190 题全覆盖；prompt/explain 无残留中文；
//      options（若提供）同长度同序；answer/code/fill/tier 等
//      抽题与判定字段绝不出现在 sidecar（answer 索引不变由
//      「不覆写」保证）；fill 题选项必须与 zh 完全一致（代码不翻）；
//      非 fill 题逐项：与 zh 相同（代码/数字/输出原样）或不含中文。
//   2) 章节标签映射：QUESTIONS 中出现的每个 chapter 标签都有
//      英文标签，且英文标签不含中文。
//   3) _hint 英文表：18 条，键与 zh 标签一致，值无中文。
//   4) chapters-en：8 章全覆盖，title/npcName/npcLines（阶段键
//      与 zh 一致）/extraGreets/victory 齐备且无残留中文。
// 退出码：0 = 全部通过；1 = 存在问题（原始退出码由调用方记录）。
// ============================================================
import { QUESTIONS } from '../src/data/quizBank.js';
import { CHAPTERS } from '../src/data/chapters.js';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;
let errors = 0;
const fail = (msg) => { errors++; console.error('  ✗', msg); };
const ok = (msg) => console.log('  ✓', msg);

// ---- 0. sidecar 可加载 ----
let QUESTIONS_EN = null;
let CHAPTER_LABELS_EN = null;
let HINTS_EN = null;
try {
  ({ QUESTIONS_EN, CHAPTER_LABELS_EN, HINTS_EN } = await import('../src/data/quizBank-en.js'));
} catch (e) {
  fail(`quizBank-en.js 无法加载: ${e.message}`);
}
let CHAPTERS_EN = null;
try {
  ({ CHAPTERS_EN } = await import('../src/data/chapters-en.js'));
} catch (e) {
  fail(`chapters-en.js 无法加载: ${e.message}`);
}

const zhIds = Object.keys(QUESTIONS);
console.log(`[quiz] zh 题库 ${zhIds.length} 题`);

// ---- 1. 逐题校验 ----
const FORBIDDEN_KEYS = ['answer', 'code', 'fill', 'tier', 'chapter', 'chapterBoss', 'id'];
let covered = 0;
let optPairs = 0;
let optKept = 0;
for (const id of zhIds) {
  const zh = QUESTIONS[id];
  const en = QUESTIONS_EN && QUESTIONS_EN[id];
  if (!en) { fail(`${id} 缺少英文条目`); continue; }
  covered++;
  for (const k of Object.keys(en)) {
    if (FORBIDDEN_KEYS.includes(k)) fail(`${id} sidecar 含禁写字段 "${k}"（抽题/判定逻辑不得覆写）`);
  }
  if (typeof en.prompt !== 'string' || !en.prompt.trim()) { fail(`${id} prompt 缺失`); continue; }
  if (typeof en.explain !== 'string' || !en.explain.trim()) { fail(`${id} explain 缺失`); continue; }
  if (CJK.test(en.prompt)) fail(`${id} prompt 残留中文`);
  if (CJK.test(en.explain)) fail(`${id} explain 残留中文`);
  if (en.options !== undefined) {
    if (!Array.isArray(en.options)) { fail(`${id} options 非数组`); continue; }
    if (en.options.length !== zh.options.length) {
      fail(`${id} options 长度不符（en ${en.options.length} != zh ${zh.options.length}）`);
      continue;
    }
    if (zh.fill) {
      // 填空题选项是代码片段：必须逐字保持
      const same = en.options.every((o, i) => o === zh.options[i]);
      if (!same) fail(`${id} 填空题选项必须与 zh 完全一致（代码不翻译）`);
    } else {
      for (let i = 0; i < en.options.length; i++) {
        optPairs++;
        const e = en.options[i], z = zh.options[i];
        if (e === z) { optKept++; continue; } // 代码/数字/输出原样保留
        if (typeof e !== 'string') { fail(`${id} 选项[${i}] 非字符串`); continue; }
        if (CJK.test(e)) fail(`${id} 选项[${i}] "${e}" 残留中文（与 zh 不同则必须译净）`);
      }
    }
  }
}
if (QUESTIONS_EN) {
  const extra = Object.keys(QUESTIONS_EN).filter((k) => !QUESTIONS[k]);
  if (extra.length) fail(`sidecar 存在 zh 题库没有的条目: ${extra.join(', ')}`);
}
ok(`英文覆盖 ${covered} / ${zhIds.length} 题` +
  (optPairs ? `；非填空选项 ${optPairs} 对（其中 ${optKept} 对按原样保留代码/数字）` : ''));

// ---- 2. 章节标签映射 ----
const labels = [...new Set(zhIds.map((id) => QUESTIONS[id].chapter))];
if (CHAPTER_LABELS_EN) {
  for (const lbl of labels) {
    const en = CHAPTER_LABELS_EN[lbl];
    if (!en) fail(`章节标签 "${lbl}" 缺少英文映射`);
    else if (CJK.test(en)) fail(`章节标签 "${lbl}" 英文映射含中文: ${en}`);
  }
  const extraL = Object.keys(CHAPTER_LABELS_EN).filter((k) => !labels.includes(k));
  if (extraL.length) fail(`标签映射存在多余键: ${extraL.join(', ')}`);
  ok(`章节标签 ${labels.length} 个全部映射`);
} else fail('缺少 CHAPTER_LABELS_EN 导出');

// ---- 3. _hint 英文表 ----
if (HINTS_EN) {
  const keys = Object.keys(HINTS_EN);
  if (keys.length !== 18) fail(`HINTS_EN 应为 18 条，实际 ${keys.length}`);
  for (const k of keys) {
    if (!labels.includes(k)) fail(`HINTS_EN 键 "${k}" 不是有效章节标签`);
    else if (CJK.test(HINTS_EN[k])) fail(`HINTS_EN["${k}"] 含中文`);
  }
  if (keys.length === 18) ok('HINTS_EN 18 条齐备');
} else fail('缺少 HINTS_EN 导出');

// ---- 4. chapters-en ----
const CH_FIELDS = ['title', 'subtitle', 'shardLabel', 'fieldName', 'lairName', 'bossName', 'npcName', 'npcLines', 'victory'];
const VICTORY_FIELDS = ['title', 'text', 'next'];
const PHASES = ['new', 'collecting', 'ready', 'open', 'done'];
if (CHAPTERS_EN) {
  let chOk = 0;
  for (const ch of CHAPTERS) {
    const en = CHAPTERS_EN[ch.id];
    if (!en) { fail(`第 ${ch.id} 章缺少英文配置`); continue; }
    chOk++;
    for (const f of CH_FIELDS) {
      if (en[f] === undefined) fail(`第 ${ch.id} 章 en 缺少 ${f}`);
    }
    for (const f of ['title', 'subtitle', 'shardLabel', 'fieldName', 'lairName', 'bossName', 'npcName']) {
      if (typeof en[f] === 'string' && CJK.test(en[f])) fail(`第 ${ch.id} 章 en.${f} 含中文: ${en[f]}`);
    }
    // npcLines 阶段键与 zh 一致
    const zhPhases = Object.keys(ch.npcLines || {});
    const enPhases = Object.keys(en.npcLines || {});
    for (const p of zhPhases) if (!enPhases.includes(p)) fail(`第 ${ch.id} 章 en.npcLines 缺少阶段 "${p}"`);
    for (const p of enPhases) {
      if (!PHASES.includes(p)) fail(`第 ${ch.id} 章 en.npcLines 阶段 "${p}" 非法`);
      const zhE = (ch.npcLines || {})[p], enE = en.npcLines[p];
      const zhFn = typeof zhE === 'function', enFn = typeof enE === 'function';
      if (zhFn !== enFn) fail(`第 ${ch.id} 章 npcLines.${p} 形态不一致（zh 函数=${zhFn}）`);
      if (!enFn) {
        if (!Array.isArray(enE) || enE.length !== (zhE || []).length) fail(`第 ${ch.id} 章 npcLines.${p} 行数不符`);
        enE.forEach((l, i) => { if (typeof l === 'string' && CJK.test(l)) fail(`第 ${ch.id} 章 npcLines.${p}[${i}] 含中文`); });
      }
    }
    if ((typeof ch.extraGreets === 'function') !== (typeof en.extraGreets === 'function')) {
      fail(`第 ${ch.id} 章 extraGreets 形态不一致`);
    }
    for (const f of VICTORY_FIELDS) {
      if (en.victory && typeof en.victory[f] !== 'string') fail(`第 ${ch.id} 章 victory.${f} 缺失`);
    }
    if (en.victory) {
      if (CJK.test(en.victory.title || '')) fail(`第 ${ch.id} 章 victory.title 含中文`);
      if (CJK.test(en.victory.next || '')) fail(`第 ${ch.id} 章 victory.next 含中文`);
      // text 允许 <br /> 标签，剥掉后再查中文
      if (CJK.test((en.victory.text || '').replace(/<br\s*\/?>/g, ''))) fail(`第 ${ch.id} 章 victory.text 含中文`);
    }
  }
  const extraC = Object.keys(CHAPTERS_EN).map(Number).filter((id) => !CHAPTERS.some((c) => c.id === id));
  if (extraC.length) fail(`chapters-en 存在多余章节: ${extraC.join(', ')}`);
  if (chOk === CHAPTERS.length) ok(`章节 ${chOk} / ${CHAPTERS.length} 全覆盖`);
} else fail('缺少 CHAPTERS_EN 导出');

console.log(errors === 0 ? '\ni18n parity 全部通过 ✔' : `\n${errors} 个问题 ✘`);
process.exit(errors === 0 ? 0 : 1);
