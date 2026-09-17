// 无头冒烟测试：不需要浏览器
// 1) 验证所有像素图行宽一致（pixelTexture 会 throw）
// 2) 验证地图构建器输出（尺寸、越界、必需要素）
// 3) 验证题库引用完整
import { generateAllTextures } from '../src/textures/pixelArt.js';
import { makeGroundTexture } from '../src/textures/ground.js';
import { buildVillage, buildDungeon, buildForest, buildCave, T } from '../src/data/maps.js';
import { QUESTIONS, pickQuestion, highlight, POOLS, SLOT_POOL } from '../src/data/quizData.js';
import { G } from '../src/core/state.js';

let errors = 0;
const fail = (msg) => { errors++; console.error('  ✗', msg); };
const ok = (msg) => console.log('  ✓', msg);

// ---- 伪 DOM/Canvas ----
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return { width: 0, height: 0 };
    // 所有方法可链式调用（createRadialGradient().addColorStop() 等）
    return () => ctxStub;
  },
  set: () => true,
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }),
};

// ---- 1. 贴图生成 ----
console.log('[1] 贴图生成');
const textures = {};
const sceneStub = {
  textures: {
    canvasKeys: new Set(),
    exists(key) { return this.canvasKeys.has(key); },
    get() { return null; }, // CC0 tile 未加载 → ground 走占位分支（数据层测试不看像素）
    addCanvas(key, canvas) {
      this.canvasKeys.add(key);
      textures[key] = { w: canvas.width, h: canvas.height };
    },
  },
};
try {
  generateAllTextures(sceneStub);
  ok(`生成 ${Object.keys(textures).length} 张贴图`);
  for (const [k, v] of Object.entries(textures)) {
    if (!v.w || !v.h) fail(`贴图 ${k} 尺寸异常`);
  }
  const need = ['shard',
    'heart_full', 'heart_half', 'heart_empty',
    'portal_door', 'tablet', 'crystal', 'shroom',
    'gate_closed', 'gate_open', 'torch_0',
    'water_0', 'water_1', 'water_2',
    'slash_0', 'slash_1', 'slash_2',
    'particle', 'shadow', 'cloudshadow', 'foam_n', 'foam_s', 'foam_e', 'foam_w'];
  for (const k of need) if (!textures[k]) fail(`缺少贴图 ${k}`);
  // 水面动画帧应为 16×16（像素版 1:1）
  for (const k of ['water_0', 'water_1', 'water_2']) {
    if (textures[k] && (textures[k].w !== 16 || textures[k].h !== 16)) fail(`${k} 应为 16x16，实际 ${textures[k].w}x${textures[k].h}`);
  }
} catch (e) { fail(`贴图生成抛出异常: ${e.message}`); }

// 地面画布（整图高清）
try {
  const g1 = makeGroundTexture(sceneStub, buildVillage());
  const g2 = makeGroundTexture(sceneStub, buildDungeon());
  const g3 = makeGroundTexture(sceneStub, buildForest());
  const g4 = makeGroundTexture(sceneStub, buildCave());
  if (!textures[g1] || !textures[g2] || !textures[g3] || !textures[g4]) fail('地面画布生成失败');
  if (textures[g1] && textures[g1].w !== buildVillage().w * 128) fail(`地面画布宽度异常: ${textures[g1].w}`);
  if (textures[g3] && textures[g3].w !== buildForest().w * 128) fail(`森林地面画布宽度异常: ${textures[g3].w}`);
  if (textures[g4] && textures[g4].w !== buildCave().w * 128) fail(`洞窟地面画布宽度异常: ${textures[g4].w}`);
  ok(`地面画布 ${g1}(${textures[g1].w}x${textures[g1].h}) / ${g2}(${textures[g2].w}x${textures[g2].h}) / ${g3}(${textures[g3].w}x${textures[g3].h}) / ${g4}(${textures[g4].w}x${textures[g4].h})`);
} catch (e) { fail(`地面画布异常: ${e.message}`); }

// ---- 2. 地图 ----
console.log('[2] 地图构建');
function checkMap(def, isDungeon) {
  if (def.grid.length !== def.h) fail(`${def.key} 行数不符`);
  def.grid.forEach((row, y) => {
    if (row.length !== def.w) fail(`${def.key} 第 ${y} 行宽度 ${row.length} != ${def.w}`);
    row.forEach((v, x) => { if (!Number.isInteger(v) || v < 0 || v > 11) fail(`${def.key} (${x},${y}) 非法瓦片 ${v}`); });
  });
  const inRange = (p, label) => {
    if (p.x < 64 || p.x > def.w * 128 - 64 || p.y < 64 || p.y > def.h * 128 - 64) fail(`${def.key} ${label} 越界: (${p.x},${p.y})`);
  };
  def.props.forEach((p) => inRange(p, `prop:${p.type}`));
  (def.slimes || []).forEach((p) => inRange(p, 'slime'));
  Object.values(def.spawns).forEach((p) => inRange(p, 'spawn'));
  (def.portals || []).forEach((p) => {
    const r = p.rect;
    if (r.x < 0 || r.y < 0 || r.x + r.w > def.w * 128 || r.y + r.h > def.h * 128) fail(`${def.key} 传送门越界`);
  });
  // 出生点不能在碰撞瓦片里
  const solidAt = (x, y) => {
    const tx = Math.floor(x / 128), ty = Math.floor(y / 128);
    return def.colliding.includes(def.grid[ty] && def.grid[ty][tx]);
  };
  Object.entries(def.spawns).forEach(([k, p]) => {
    if (solidAt(p.x, p.y)) fail(`${def.key} 出生点 ${k} 落在碰撞瓦片上 (${p.x},${p.y})`);
  });
  ok(`${def.key}: ${def.w}x${def.h}, ${def.props.length} 个道具, ${def.slimes?.length || 0} 只史莱姆`);
}
try { checkMap(buildVillage(), false); } catch (e) { fail(`村庄构建异常: ${e.message}`); }
try { checkMap(buildDungeon(), true); } catch (e) { fail(`地牢构建异常: ${e.message}`); }
try { checkMap(buildForest(), false); } catch (e) { fail(`森林构建异常: ${e.message}`); }
try { checkMap(buildCave(), true); } catch (e) { fail(`洞窟构建异常: ${e.message}`); }

// 村庄应恰好 5 块碎片符文石（对应 5 枚碎片）
const village = buildVillage();
const villageRunes = village.props.filter((p) => p.type === 'rune' && !p.bossRune);
villageRunes.length === 5 ? ok('村庄有 5 块符文石（对应 5 枚碎片）') : fail(`村庄符文石数量 ${villageRunes.length} != 5`);

// 地牢符文石应为祝福符文（不产碎片）
const dungeon = buildDungeon();
const dungeonHeal = dungeon.props.filter((p) => p.type === 'rune' && p.healRune);
dungeonHeal.length === 4 ? ok('地牢有 4 块祝福符文石') : fail(`地牢祝福符文数量 ${dungeonHeal.length} != 4`);

// 第二章地图：函数之森 4 产碎片 + 1 祝福；洞窟 6 祝福 + 1 BOSS 符文 + 巨蟒
const forest = buildForest();
const cave = buildCave();
const forestRunes = forest.props.filter((p) => p.type === 'rune' && !p.bossRune);
const forestShard = forestRunes.filter((p) => !p.healRune);
const caveRunes = cave.props.filter((p) => p.type === 'rune' && !p.bossRune);
const caveBossRune = cave.props.filter((p) => p.type === 'rune' && p.bossRune);
forestRunes.length === 6 ? ok('函数之森有 6 块符文石') : fail(`森林符文石数量 ${forestRunes.length} != 6`);
forestShard.length === 5 ? ok('（其中 5 块产函数碎片 + 1 块祝福）') : fail(`森林碎片符文数量 ${forestShard.length} != 5`);
caveRunes.length === 6 ? ok('列表洞窟有 6 块祝福符文石') : fail(`洞窟符文石数量 ${caveRunes.length} != 6`);
caveBossRune.length === 1 ? ok('列表洞窟有 1 块 BOSS 符文') : fail(`洞窟 BOSS 符文数量 ${caveBossRune.length} != 1`);
cave.boss && cave.boss.type === 'snake' ? ok('列表洞窟配置了巨蟒 BOSS') : fail('洞窟缺少 snake BOSS');
forest.portals.some((p) => p.requires === 'ch2GateOpen') ? ok('洞窟之门带封印条件') : fail('洞窟之门缺少封印条件');

// ---- 3. 题库 ----
console.log('[3] 题库');
for (const [id, q] of Object.entries(QUESTIONS)) {
  try {
    if (!q.chapter || !q.prompt || !q.code || !Array.isArray(q.options) || q.options.length < 3) fail(`${id} 题目结构不完整`);
    if (q.answer < 0 || q.answer >= q.options.length) fail(`${id} answer 越界`);
    if (!q.explain) fail(`${id} 缺少讲解`);
    if (!Number.isInteger(q.tier)) fail(`${id} 缺少难度 tier`);
    const html = highlight(q.code);
    if (q.fill && !html.includes('quiz-blank')) fail(`${id} 填空题缺少空槽占位`);
    if (/<script/i.test(html)) fail(`${id} 高亮结果包含可疑内容`);
  } catch (e) { fail(`题目 ${id} 异常: ${e.message}`); }
}
ok(`题库 ${Object.keys(QUESTIONS).length} 题，格式校验通过`);

// 3b. 题池：非空 / 引用存在 / 池内难度（tier）一致
for (const [name, ids] of Object.entries(POOLS)) {
  if (!ids.length) fail(`题池 ${name} 为空`);
  ids.forEach((id) => { if (!QUESTIONS[id]) fail(`题池 ${name} 引用了不存在的题目 ${id}`); });
  const tiers = new Set(ids.map((id) => QUESTIONS[id]?.tier));
  if (tiers.size !== 1) fail(`题池 ${name} 难度不一致: tier ${[...tiers].join(' / ')}`);
}
ok(`题池 ${Object.keys(POOLS).length} 个，池内难度一致（同池同难度随机抽题）`);

// 3c. 每张地图的符文 qid 都是合法槽位，且指向非空题池
const allRunes = [...buildVillage().props, ...buildDungeon().props, ...buildForest().props, ...buildCave().props]
  .filter((p) => p.type === 'rune');
allRunes.forEach((p) => {
  const pool = POOLS[SLOT_POOL[p.qid]];
  if (!pool) fail(`符文槽 ${p.qid} 没有对应题池`);
  else if (pool.length < 3) fail(`符文槽 ${p.qid} 的题池题量不足（${pool.length} < 3）`);
});
ok(`符文-题池映射完整（${allRunes.length} 个符文槽）`);

// 3d. 随机抽题行为：同池同难度 / 重开同题 / 已答不重复 / 同池不撞题
try {
  G.qAnswered = new Set(); G.runeRolls = {};
  for (const [slot, poolName] of Object.entries(SLOT_POOL)) {
    const pool = POOLS[poolName];
    const tier = QUESTIONS[pool[0]].tier;
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      G.runeRolls = {}; // 清掉抽题记录，模拟多次独立抽取
      const q = pickQuestion(slot);
      if (!pool.includes(q.id)) fail(`符文槽 ${slot} 抽到池外题目 ${q.id}`);
      if (q.tier !== tier) fail(`符文槽 ${slot} 抽到难度不符的题 ${q.id}（tier ${q.tier} != ${tier}）`);
      seen.add(q.id);
    }
    if (seen.size < 2) fail(`符文槽 ${slot} 多次抽题毫无随机性（题池 ${poolName}）`);
  }
  // 同一符文重开：题目保持不变
  G.qAnswered = new Set(); G.runeRolls = {};
  const q1 = pickQuestion('v1');
  if (pickQuestion('v1').id !== q1.id) fail('同一符文重开时题目应保持不变');
  // 同池不同符文：不撞题
  G.runeRolls = {};
  if (pickQuestion('v1').id === pickQuestion('v2').id) fail('同池两块符文抽到了同一道题');
  // 已答过的题不再出现
  const pool = POOLS.village;
  G.qAnswered = new Set(pool.slice(0, -1)); G.runeRolls = {};
  const qLast = pickQuestion('v1');
  if (qLast.id !== pool[pool.length - 1]) fail(`已答过的题仍被抽到（期望 ${pool[pool.length - 1]}，实际 ${qLast.id}）`);
  ok('随机抽题：同池同难度、重开不变题、已答不重复、同池不撞题');
} catch (e) { fail(`随机抽题异常: ${e.message}`); }

console.log(errors === 0 ? '\n全部通过 ✔' : `\n${errors} 个错误 ✘`);
process.exit(errors === 0 ? 0 : 1);
