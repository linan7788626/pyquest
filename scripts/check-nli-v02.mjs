// ============================================================
// Task 0（v0.2 全面替换）· 浏览器基线 + v0.2 RED 检查（fix1）
//
// 用法：
//   node scripts/check-nli-v02.mjs --self-test
//   node scripts/check-nli-v02.mjs --url http://127.0.0.1:5186 --output <dir> [--capture-baseline]
//
// 退出码：
//   0 = 基线几何比对 GREEN 且 v0.2 显示/资源检查全部满足（Task2 完成后预期）
//   1 = 断言失败（当前预期：v0.2 检查真 RED，基线几何应全 GREEN）
//   3 = 环境/前置错误（服务不可达、fixture 缺失/已存在/损坏、hash 门不匹配、
//       运行中页面重载、console/page 错误）——fail-closed，绝不冒充 RED；
//       环境失败时绝不创建 fixture（写入被推迟到全部检查与环境判定之后）
//
// fix1 要点（相对初版）：
//   F1 所有固定 FX 断言的「实际值」一律读自真实对象（spawnShardFx/burst/
//      floatText/heart/环境粒子调用后新建对象的实际 depth），不再写字面量。
//   F2 WorldMap 期望恰为 8 张插画：复用 castle_medium(1254²) + 7 张 map_*(256²)，
//      逐 URL 校验真实渲染成功（img.complete 且 naturalWidth>0 且尺寸正确）；
//      7 张 map_* 专用计数与 8 张总量分开。
//   F3 framenavigated 回调参数是 Frame 本身（旧代码读 f.frame 恒 undefined →
//      重载检测失效）；仅初始导航完成后的主框架导航记为重载。console/page
//      错误与重载一律 exit 3（不再降级为断言失败）。
//   F4 快照校验拒绝 undefined/function/symbol/bigint/非有限数/稀疏数组/null
//      （仅显式可空字段）+ 结构校验（16 场景/几何/动画）+ JSON 无损往返；
//      比对前先校验既有 fixture（空/损坏/畸形 → exit 3）。--self-test 提供
//      独立负向自测（临时目录内，绝不触碰真实 fixture）。
//   F5 贴图普查不再作为物理不变量绑定显示字段：比对前对两侧统一归一化
//      （ground_* → __ground__、剔除 castle_medium/portal_blue_gold 显示地标），
//      其余实体 presence/count/type 全部保留比较。
//
// 断言来源（独立字面期望，不从产品常量导出）：
//   - docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md §§2/5/6.1/7/9/10
//   - .superpowers/sdd/2026-10-28-nli-v02-full-replacement/lane-contract.md（62 PNG/manifest 字段）
//   - fixture 只存「实测改前值」，比对的是自身冻结快照（行为不变量）。
// ============================================================
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TMP_ROOT = '/private/var/folders/7z/hdr_2hpx1td2cw2cxslg7d1w0000gs/T/opencode';

// ---------- CLI ----------
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const BASE = argOf('--url') || 'http://127.0.0.1:5186';
const CAPTURE = argv.includes('--capture-baseline');
const SELF_TEST = argv.includes('--self-test');
const OUT = resolve(ROOT, argOf('--output')
  || '.superpowers/sdd/2026-10-28-nli-v02-full-replacement/task-0-browser-evidence');
const FIXTURE = resolve(ROOT, 'scripts/fixtures/nli-v02-runtime-before.json');
const HASHES = resolve(ROOT, '.slim/deepwork/nli-systematic-2026-10-27/v02-before/worktree-hashes.json');

// ---------- 独立字面期望（designer spec / lane-contract） ----------
const SCENE_KEYS = ['Village', 'Dungeon', 'Forest', 'Cave', 'SciField', 'SciLair',
  'C4F', 'C4L', 'C5F', 'C5L', 'C6F', 'C6L', 'C7F', 'C7L', 'C8F', 'C8L'];
const LANDMARKS = ['castle_medium', 'portal_blue_gold'];   // spec §5：1254² 原样拷贝
const MAP_KEYS = ['map_forest', 'map_highland', 'map_tower', 'map_forge',
  'map_temple', 'map_signal', 'map_halo'];                  // lane-contract：7×256²
// spec §6.1：世界地图 = 复用 castle_medium + 7 张 map_*，恰 8 张插画
const ILLUSTRATION_URLS = ['/nli-preview/castle_medium.png',
  ...MAP_KEYS.map((k) => `/nli-preview/${k}.png`)];
const MANIFEST_ENTRIES = 62;                                // 旧 55 key + 7 地图衍生
const ANIM_MIN = 21;                                        // TS_ANIMS 21 项 dur/loop 冻结
// spec §9：FX_BASE = ceil((def.h*128+1024)/1024)*1024，只映射 1200/1500/1800/1900/2000
const fxBase = (defH) => Math.ceil((defH * 128 + 1024) / 1024) * 1024;
// 真实产品调用的确定性产出计数（回归锚：FX 不再生成同样会被抓到）
const SHARD_FX_COUNT = 14;   // WorldScene.spawnShardFx 循环 14 个奖励粒子
const BURST_COUNT = 4;       // Slime.burst(colors, 4) 探针

// ============================================================
// 纯函数（供 --self-test 独立负向测试）
// ============================================================
/** F3：framenavigated 回调参数即 Frame 本身；仅初始导航后的主框架导航算重载 */
function shouldFlagReload(frame, mainFrame, initialNavDone) {
  return initialNavDone && frame === mainFrame;
}

/** 显式可空字段（真实「无」语义），其余位置出现 null/undefined 一律拒绝 */
const NULLABLE = /\.(boss|burst|burstDepths|ambient|ambientDepth|floatTextDepth|body|bounds|artIsOldSvg|water|clouds|snakeFx|delayed|pop|die)$/;

/** F4：结构 + 值域校验（拒绝空/falsey/undefined/function/symbol/非有限/稀疏/有损） */
function validateSnapshot(snap) {
  const errs = [];
  (function scan(v, path, seen) {
    if (v === undefined) { errs.push(`undefined at ${path}`); return; }
    if (v === null) { if (!NULLABLE.test(path)) errs.push(`null at ${path}`); return; }
    const t = typeof v;
    if (t === 'function' || t === 'symbol' || t === 'bigint') { errs.push(`${t} at ${path}`); return; }
    if (t === 'number' && !Number.isFinite(v)) { errs.push(`非有限数 at ${path}`); return; }
    if (t !== 'object') return;
    // 环检测用路径栈进出标记：共享引用（DAG，如 scene.heart 与 fxInfo.heart
    // 同一对象、treeVariants 与 trees.specs 共享 spec）JSON 可序列化不报错；
    // 只有回到「仍在栈上」的对象才是真环。此前全局 WeakSet 把共享引用误报
    // 为循环引用（20 项假 ENV-ERROR，实测复现）。
    if (seen.has(v)) { errs.push(`循环引用 at ${path}（fixture 必须可 JSON 冻结）`); return; }
    seen.add(v);
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (!(i in v)) { errs.push(`稀疏数组 at ${path}[${i}]`); return; }
      }
      v.forEach((x, i) => scan(x, `${path}[${i}]`, seen));
    } else {
      for (const [k, x] of Object.entries(v)) scan(x, `${path}.${k}`, seen);
    }
    seen.delete(v);
  })(snap, '', new WeakSet());
  if (!snap || typeof snap !== 'object') return ['快照不是对象'];
  if (!snap.scenes || !Array.isArray(snap.scenes) || snap.scenes.length !== SCENE_KEYS.length) {
    errs.push(`scenes 数量 ${snap.scenes?.length}≠${SCENE_KEYS.length}`);
  }
  snap.scenes?.forEach((sc, i) => {
    const want = SCENE_KEYS[i];
    if (!sc || sc.key !== want) errs.push(`scenes[${i}].key=${sc?.key}≠${want}`);
    if (!(sc?.player?.body?.w > 0) || !(sc?.player?.body?.h > 0)) errs.push(`${want}: player body 空/falsey`);
    if (!(sc?.groundW > 0) || !(sc?.groundH > 0)) errs.push(`${want}: ground 尺寸空/falsey`);
    if (!sc?.census || Object.keys(sc.census).length === 0) errs.push(`${want}: census 空`);
    if (!Array.isArray(sc?.interactables)) errs.push(`${want}: interactables 缺失`);
    if (!Array.isArray(sc?.zones)) errs.push(`${want}: zones 缺失`);
    if (!(sc?.heart?.bodyW > 0) || !(sc?.heart?.dispW > 0) || !(sc?.heart?.bounds?.w > 0)) {
      errs.push(`${want}: heart 探针空/falsey`);
    }
  });
  if (!snap.anims || !Array.isArray(snap.anims) || snap.anims.length < ANIM_MIN) {
    errs.push(`anims 数量 ${snap.anims?.length}<${ANIM_MIN}`);
  }
  snap.anims?.forEach((a) => {
    if (!a?.key || !(a.duration > 0) || a.repeat === undefined || !(a.frames > 0)) {
      errs.push(`anim ${a?.key} 字段空/falsey`);
    }
  });
  const treeKeys = Object.keys(snap.treeVariants || {});
  if (treeKeys.length !== 4 || !treeKeys.every((k) => /^tree[1-4]$/.test(k))) {
    errs.push(`树四变体聚合不全：${treeKeys.join(',')}`);
  }
  if (!errs.length) {
    const s1 = JSON.stringify(snap);
    if (s1 !== JSON.stringify(JSON.parse(s1))) errs.push('JSON 往返有损');
  }
  return errs;
}

/** F5：比对前对两侧统一归一化「精确允许的显示字段」——
 * 版本化地面 key（spec §7）合并为 __ground__；
 * fix2-4：portal_blue_gold 精确替换 Village 的一张 portal_door（spec §5）→
 * 两侧合并为 __portal__（数量仍比对：替换必须等量）；castle_medium 为无 v0.1
 * 对应物的新显示地标（B1 单独校验）→ 剔除。
 * fix3-B（review B）：portal 合并与 castle_medium 剔除 gate 在 scene key 恰
 * 'Village'——这是 Village-only 显示变更（spec §5），非 Village 场景的同名
 * 键一律保留比对（「其他场景不得任意归一化同名新增」）。隐身 castle 载体、
 * 全部玩法实体 presence/count/type 与非显示语义保留比较。地标投影已在采集侧
 * 剔除（仅 Village，见 splitCensusShadows；B1b 校验） */
function normalizeForCompare(snap) {
  const adaptScene = (sc) => {
    const isVillage = !!(sc && sc.key === 'Village');
    const census = { ...sc.census };
    for (const k of Object.keys(census)) {
      if (/^ground_/.test(k)) {
        census.__ground__ = (census.__ground__ || 0) + census[k];
        delete census[k];
      } else if (isVillage && (k === 'portal_door' || k === 'portal_blue_gold')) {
        census.__portal__ = (census.__portal__ || 0) + census[k];
        delete census[k];
      } else if (isVillage && k === 'castle_medium') {
        delete census[k];
      }
    }
    return { ...sc, census };
  };
  return { ...snap, scenes: snap.scenes.map(adaptScene) };
}

/** fix2-4：两地标投影独立校验（剔除前必须先验证）：
 * 恰 2 个、规格（600×96@(1088,1432) / 320×64@(4352,1400)）、alpha≈0.18、depth−9 */
const LANDMARK_SHADOW_SPEC = [
  { w: 600, h: 96, x: 1088, y: 1432 }, { w: 320, h: 64, x: 4352, y: 1400 },
];
function validateLandmarkShadows(list) {
  const errs = [];
  if (!Array.isArray(list)) return ['landmarkShadows 非数组'];
  if (list.length !== 2) errs.push(`投影数 ${list.length}≠2`);
  if (list.filter((o) => o && o.tagged).length > 2) errs.push('超过 2 个对象携带 nliDisplayRole 标识');
  for (const sp of LANDMARK_SHADOW_SPEC) {
    const hit = list.find((o) => o && Math.abs(o.dispW - sp.w) <= 1 && Math.abs(o.dispH - sp.h) <= 1);
    if (!hit) { errs.push(`缺 ${sp.w}×${sp.h} 投影`); continue; }
    if (Math.abs(hit.x - sp.x) > 1 || Math.abs(hit.y - sp.y) > 1) {
      errs.push(`${sp.w}×${sp.h} 投影位置 (${hit.x},${hit.y})≠(${sp.x},${sp.y})`);
    }
    if (Math.abs(hit.alpha - 0.18) > 0.01) errs.push(`${sp.w}×${sp.h} alpha=${hit.alpha}≠0.18`);
    if (hit.depth !== -9) errs.push(`${sp.w}×${sp.h} depth=${hit.depth}≠-9`);
  }
  return errs;
}

/** fix3-B（review B）：采集侧地标投影剔除/计数（纯函数——页内 captureSceneFn
 * 只带回 ts_shadow 候选描述符，剔除决定在 Node 侧本函数做，主流程与
 * --self-test 共用同一真实采集选择路径）。
 * gate 在 scene key 恰 'Village'：非 Village 的 tagged/规格尺寸影子一律
 * 保留 census 计数（可检出），不产生 landmarkShadows 记录。 */
function splitCensusShadows(candidates, sceneKey) {
  const landmarkShadows = [];
  let censusShadows = 0;
  const isVillage = sceneKey === 'Village';
  for (const c of (Array.isArray(candidates) ? candidates : [])) {
    if (!c) { censusShadows++; continue; }
    const spec = LANDMARK_SHADOW_SPEC.find((sp) => Math.abs(c.dispW - sp.w) <= 1
      && Math.abs(c.dispH - sp.h) <= 1);
    if (isVillage && (c.tagged || spec)) {
      landmarkShadows.push({ tagged: !!c.tagged, x: c.x, y: c.y,
        dispW: c.dispW, dispH: c.dispH, alpha: c.alpha, depth: c.depth });
    } else {
      censusShadows++;
    }
  }
  return { censusShadows, landmarkShadows };
}

/** fix3-B（review B）：landmarkShadows 比较忽略限定「真实 Village 场景索引」
 * （按 scene key 动态定位，绝不硬编码索引，也绝不放宽到全部场景）。
 * 采集侧仅在 Village 产出该字段（splitCensusShadows），故非 Village 出现
 * stray landmarkShadows 记录必然进入逐字段比对被检出。无 Village 场景 →
 * 忽略列表为空（fail-closed：全比对）。 */
function landmarkShadowsIgnore(scenes) {
  const idx = Array.isArray(scenes) ? scenes.findIndex((sc) => sc && sc.key === 'Village') : -1;
  return idx >= 0 ? [new RegExp(`^\\.scenes\\[${idx}\\]\\.landmarkShadows$`)] : [];
}

/** fix3-B：基线逐字段比对（纯函数：主流程阶段 A 与 --self-test 负向共用同一
 * 真实比较路径；行为与 fix2 内联 walk 完全一致，仅提取为可测函数） */
function diffBaseline(frozen, fresh, ignoreRes) {
  let leaves = 0, drift = 0;
  const drifts = [];
  (function walk(a, b, path) {
    if (ignoreRes.some((re) => re.test(path))) return;
    if (typeof a === 'number' && typeof b === 'number') {
      leaves++;
      if (Math.abs(a - b) > 1e-6) { drift++; drifts.push(`  ✗ 基线漂移 ${path}: fixture=${a} 实测=${b}`); }
      return;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || typeof b === 'undefined') {
      leaves++;
      if (a !== b) { drift++; drifts.push(`  ✗ 基线漂移 ${path}: fixture=${JSON.stringify(a)} 实测=${JSON.stringify(b)}`); }
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      walk(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`);
    }
  })(frozen, fresh, '');
  return { leaves, drift, drifts };
}

/** F4：既有 fixture 读取 + 校验（空/损坏/畸形一律拒绝） */
function loadAndValidateFixture(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new Error(`fixture 不可读：${e.message}`);
  }
  if (!raw.trim()) throw new Error('fixture 为空文件');
  let snap;
  try {
    snap = JSON.parse(raw);
  } catch (e) {
    throw new Error(`fixture JSON 损坏：${e.message}`);
  }
  const errs = validateSnapshot(snap);
  if (errs.length) throw new Error(`fixture 结构校验失败：${errs.slice(0, 8).join('；')}`);
  return snap;
}

// ---------- 结果收集 ----------
const passes = [], failures = [], envNotes = [];
let envFatal = null;
const check = (cond, label, detail = '') => {
  const full = (cond ? `  ✓ ${label}` : `  ✗ ${label}`) + (detail ? ` | ${detail}` : '');
  console.log(full);
  (cond ? passes : failures).push(full);
};

// ============================================================
// --self-test：独立负向自测（纯逻辑 + 临时目录，绝不触碰真实 fixture）
// ============================================================
function runSelfTest() {
  const stPass = [], stFail = [];
  const st = (cond, label) => {
    console.log(cond ? `  ✓ ${label}` : `  ✗ ${label}`);
    (cond ? stPass : stFail).push(label);
  };
  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const minimalScene = (key) => ({
    key, defW: 36, defH: 24, worldW: 4608, worldH: 3072,
    groundW: 4608, groundH: 3072, groundKey: 'ground_X',
    player: { x: 1, y: 2, depth: 3, scaleX: 2, scaleY: 2, tex: 'warrior',
      body: { x: 1, y: 2, w: 120, h: 52, ox: 66, oy: 132, enable: true },
      bounds: { x: 1, y: 2, w: 384, h: 384 } },
    slimes: [{ tex: 'pawn_red', count: 3, w: 96, h: 48, ox: 72, oy: 134, scaleX: 2 }],
    boss: null, solids: {}, trees: { total: 1, positions: [[1, 2]], specs: {} },
    bushes: { total: 0, positions: [] }, interactables: [], zones: [],
    census: { ground_X: 1, castle: 1 }, doorSprites: [],
    heart: { bodyW: 15, bodyH: 13, dispW: 116, dispH: 100, depth: 1500,
      bounds: { x: 1, y: 2, w: 116, h: 100 } },
    fxInfo: { floatTextDepth: 2000, shardFxDepths: [1900], shardFxCount: 14,
      burstDepths: [1800], burstCount: 4, ambientDepth: 1200 },
  });
  const minimal = () => ({
    purpose: 'selftest', base: 'http://x', viewport: [1440, 960],
    capturedAt: 't', hashGate: { compared: 89, mismatched: 0 },
    stateBefore: {}, scenes: SCENE_KEYS.map(minimalScene),
    anims: Array.from({ length: 21 }, (_, i) => (
      { key: `a${i}`, duration: 500, repeat: -1, frames: 1, frameRate: 2 })),
    treeVariants: { tree1: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree2: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree3: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 },
      tree4: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 } },
    worldMapOld: { artIsOldSvg: true, routeLayerCount: 1, mapImgCount: 0 },
  });
  // 1. 合法最小快照应通过
  st(validateSnapshot(minimal()).length === 0, 'validateSnapshot：合法最小快照通过');
  // 2. 各类缺陷必须被拒绝
  const mutants = [];
  const m = minimal(); m.scenes = m.scenes.slice(0, 15);
  mutants.push(['scenes=15', m]);
  const m2 = minimal(); m2.scenes[3].key = 'Wrong';
  mutants.push(['场景 key 错位', m2]);
  const m3 = minimal(); m3.scenes[0].player.body.w = 0;
  mutants.push(['player body 0', m3]);
  const m4 = minimal(); m4.scenes[0].groundW = 0;
  mutants.push(['ground 0', m4]);
  const m5 = minimal(); m5.scenes[0].census = {};
  mutants.push(['census 空', m5]);
  const m6 = minimal(); m6.scenes[0].heart = null;
  mutants.push(['heart null', m6]);
  const m7 = minimal(); m7.anims = m7.anims.slice(0, 20);
  mutants.push(['anims=20', m7]);
  const m8 = minimal(); m8.anims[0].duration = NaN;
  mutants.push(['duration NaN（有损）', m8]);
  const m9 = deepClone(minimal()); m9.scenes[0].player.tex = undefined;
  mutants.push(['undefined 值', m9]);
  const m10 = deepClone(minimal()); m10.stateBefore.fn = () => 1;
  mutants.push(['function 值', m10]);
  const m11 = deepClone(minimal()); m11.stateBefore.sym = Symbol('x');
  mutants.push(['symbol 值（stringify 会丢）', m11]);
  const m12 = deepClone(minimal()); m12.scenes[0].zones = [1, 2, 3];
  mutants.push(['非有限数 Infinity', (() => { m12.scenes[0].player.x = Infinity; return m12; })()]);
  const m13 = deepClone(minimal()); m13.scenes[0].bushes.positions = [1]; m13.scenes[0].bushes.positions.length = 3;
  mutants.push(['稀疏数组', m13]);
  const m14 = minimal(); m14.treeVariants = { tree1: {}, tree2: {}, tree3: {} };
  mutants.push(['树变体 3 个', m14]);
  for (const [label, mut] of mutants) {
    st(validateSnapshot(mut).length > 0, `validateSnapshot 拒绝：${label}`);
  }
  // 3. F5 归一化：ground_* 合并、显示地标剔除、实体键保留
  const norm = normalizeForCompare(minimal());
  const c = norm.scenes[0].census;
  st(c.__ground__ === 1 && !('ground_X' in c) && c.castle === 1,
    'normalizeForCompare：ground_* → __ground__ 且实体键保留');
  const withLm = deepClone(minimal());
  withLm.scenes[0].census.castle_medium = 1;
  withLm.scenes[0].census.portal_blue_gold = 2;
  const c2 = normalizeForCompare(withLm).scenes[0].census;
  st(!('castle_medium' in c2) && !('portal_blue_gold' in c2) && c2.castle === 1,
    'normalizeForCompare：剔除新显示地标 castle_medium（无 v0.1 对应物）');
  // fix2-4：portal_blue_gold 精确替换 portal_door（数量仍比对），隐身 castle 载体保留
  // fix3-B：portal 归一化 gate 在 scene key 恰 'Village'（本组用例即 Village 语义）
  const censusEq = (a, b) => JSON.stringify(
    normalizeForCompare({ scenes: [{ key: 'Village', census: a }] }).scenes[0].census)
    === JSON.stringify(normalizeForCompare({ scenes: [{ key: 'Village', census: b }] }).scenes[0].census);
  st(censusEq({ portal_door: 1, castle: 2 }, { portal_blue_gold: 1, castle: 2 }),
    'census 归一化：portal_blue_gold 等量替换 portal_door → 通过');
  st(!censusEq({ portal_door: 1, castle: 2 }, { castle: 2 }),
    'census 归一化：portal 整体缺失 → 失败（presence 保留）');
  st(!censusEq({ portal_door: 1, castle: 2 }, { portal_blue_gold: 2, castle: 2 }),
    'census 归一化：portal 数量漂移 → 失败（等量替换才放行）');
  st(!censusEq({ portal_door: 1, castle: 2 }, { portal_door: 1 }),
    'census 归一化：隐身 castle 载体缺失 → 失败');
  // fix2-4：两地标投影独立校验（剔除前必须先验证规格）
  const mkShadow = (sp, tagged) => ({ tagged, x: sp.x, y: sp.y,
    dispW: sp.w, dispH: sp.h, alpha: 0.18, depth: -9 });
  const shadowsOk = [mkShadow(LANDMARK_SHADOW_SPEC[0], true), mkShadow(LANDMARK_SHADOW_SPEC[1], false)];
  st(validateLandmarkShadows(shadowsOk).length === 0, 'validateLandmarkShadows：2 个合规投影通过');
  const shMut = [];
  shMut.push(['投影 0 个', []]);
  shMut.push(['投影 3 个', [...shadowsOk, mkShadow(LANDMARK_SHADOW_SPEC[0], true)]]);
  const badPos = deepClone(shadowsOk); badPos[0].x = 9999;
  shMut.push(['600×96 位置错', badPos]);
  const badAlpha = deepClone(shadowsOk); badAlpha[1].alpha = 0.9;
  shMut.push(['320×64 alpha 错', badAlpha]);
  const badDepth = deepClone(shadowsOk); badDepth[0].depth = -8;
  shMut.push(['600×96 depth 非 -9', badDepth]);
  const badSize = deepClone(shadowsOk); badSize[1].dispW = 300;
  shMut.push(['320×64 尺寸错', badSize]);
  for (const [label, mut] of shMut) {
    st(validateLandmarkShadows(mut).length > 0, `validateLandmarkShadows 拒绝：${label}`);
  }
  // fix3-B（review B）：Village-only 归一化/剔除/忽略收紧——先 RED 后最小修复。
  // 契约：portal 合并与 castle_medium 剔除仅在 scene key 恰 'Village'；非 Village
  // 的 portal 替换/新增、castle_medium、tagged/规格尺寸影子必须留在比对域内可检出。
  const censusEqKeyed = (a, b, key) => JSON.stringify(
    normalizeForCompare({ scenes: [{ key, census: a }] }).scenes[0].census)
    === JSON.stringify(normalizeForCompare({ scenes: [{ key, census: b }] }).scenes[0].census);
  st(!censusEqKeyed({ portal_door: 1, castle: 2 }, { portal_blue_gold: 1, castle: 2 }, 'Forest'),
    'fix3：非 Village portal_door→portal_blue_gold 替换必须失败（原键保留可检出）');
  st(!censusEqKeyed({ portal_door: 1, castle: 2 }, { portal_door: 1, portal_blue_gold: 1, castle: 2 }, 'Dungeon'),
    'fix3：非 Village portal_blue_gold 新增必须失败（数量比对保留）');
  st((() => {
    const c = normalizeForCompare(
      { scenes: [{ key: 'Cave', census: { castle_medium: 1, castle: 2 } }] }).scenes[0].census;
    return c.castle_medium === 1;
  })(), 'fix3：非 Village castle_medium 新增必须保留在 census（可检出）');
  st((() => {
    const c = normalizeForCompare(
      { scenes: [{ key: 'Village', census: { castle_medium: 1, castle: 2 } }] }).scenes[0].census;
    return !('castle_medium' in c);
  })(), 'fix3：Village castle_medium 仍剔除（合法显示差异放行）');
  // 采集侧剔除选择：真实 splitCensusShadows 路径（非手写布尔）
  const hasSplit = typeof splitCensusShadows === 'function';
  st(hasSplit, 'fix3：splitCensusShadows 采集侧纯函数存在（真实采集选择路径）');
  if (hasSplit) {
    const cand = (over) => Object.assign(
      { tagged: false, x: 1, y: 2, dispW: 96, dispH: 48, alpha: 1, depth: 5 }, over);
    const tagged = cand({ tagged: true });
    const specSized = cand({ dispW: 600, dispH: 96, x: 1088, y: 1432, alpha: 0.18, depth: -9 });
    const v = splitCensusShadows([tagged, specSized, cand({})], 'Village');
    st(v.censusShadows === 1 && v.landmarkShadows.length === 2,
      'fix3：Village tagged/规格尺寸影子剔除入 landmarkShadows，普通 ts_shadow 保留计数');
    const nv = splitCensusShadows([tagged, specSized, cand({})], 'Forest');
    st(nv.censusShadows === 3 && nv.landmarkShadows.length === 0,
      'fix3：非 Village tagged/规格尺寸影子保留 census（可检出）');
  }
  // 比较路径：真实 diffBaseline + landmarkShadowsIgnore（含重排输入防硬编码 index）
  const hasCmp = typeof diffBaseline === 'function' && typeof landmarkShadowsIgnore === 'function';
  st(hasCmp, 'fix3：diffBaseline/landmarkShadowsIgnore 比较路径纯函数存在');
  if (hasCmp) {
    const order = ['Dungeon', 'Forest', 'Village', 'Cave']; // Village 真实 index=2（防硬编码）
    const villageLm = [mkShadow(LANDMARK_SHADOW_SPEC[0], true), mkShadow(LANDMARK_SHADOW_SPEC[1], false)];
    const IGN = landmarkShadowsIgnore(order.map((k) => ({ key: k })));
    st(IGN.length === 1 && IGN[0].test('.scenes[2].landmarkShadows')
      && !IGN[0].test('.scenes[0].landmarkShadows') && !IGN[0].test('.scenes[2].doorSprites'),
      'fix3：landmarkShadowsIgnore 限定真实 Village 索引（重排输入 → index 2）');
    const baseScenes = () => order.map((k) => ({ key: k, census: { castle: 1 } }));
    const dOk = diffBaseline(
      normalizeForCompare({ scenes: baseScenes() }),
      normalizeForCompare({ scenes: order.map((k) => ({ key: k, census: { castle: 1 },
        ...(k === 'Village' ? { landmarkShadows: villageLm } : {}) })) }), IGN);
    st(dOk.drift === 0, 'fix3：Village landmarkShadows 在真实 index 被忽略（重排输入 0 漂移）');
    const dStray = diffBaseline(
      normalizeForCompare({ scenes: baseScenes() }),
      normalizeForCompare({ scenes: order.map((k) => ({ key: k, census: { castle: 1 },
        ...(k === 'Village' ? { landmarkShadows: villageLm } : {}),
        ...(k === 'Dungeon' ? { landmarkShadows: [mkShadow(LANDMARK_SHADOW_SPEC[0], true)] } : {}) })) }), IGN);
    st(dStray.drift > 0 && dStray.drifts.some((d) => /scenes\[0\]\.landmarkShadows/.test(d)),
      'fix3：非 Village stray landmarkShadows 记录被比对检出（不被忽略）');
    const dVillage = diffBaseline(
      normalizeForCompare({ scenes: [{ key: 'Village', census: { portal_door: 1, castle: 2 } }] }),
      normalizeForCompare({ scenes: [{ key: 'Village', census: { portal_blue_gold: 1, castle: 2, castle_medium: 1 } }] }), []);
    st(dVillage.drift === 0, 'fix3：Village 合法显示差异（portal 等量替换+castle_medium）归一化后仍通过');
    const dCount = diffBaseline(
      normalizeForCompare({ scenes: [{ key: 'Village', census: { portal_door: 1, castle: 2 } }] }),
      normalizeForCompare({ scenes: [{ key: 'Village', census: { portal_blue_gold: 1, castle: 3, castle_medium: 1 } }] }), []);
    st(dCount.drift > 0, 'fix3：Village 实体计数漂移仍被检出（counts 不因显示豁免弱化）');
    st(landmarkShadowsIgnore([{ key: 'Forest' }]).length === 0,
      'fix3：无 Village 场景 → 忽略列表为空（fail-closed 全比对）');
  }
  // 4. F3 重载判定（回归：旧代码读 f.frame 恒 undefined → 永远检测不到重载）
  const mainFrame = { id: 1 };
  st(shouldFlagReload(mainFrame, mainFrame, true) === true,
    'shouldFlagReload：主框架导航（初始导航后）→ 重载');
  st(shouldFlagReload({ id: 2 }, mainFrame, true) === false,
    'shouldFlagReload：子框架导航 → 非重载');
  st(shouldFlagReload(mainFrame, mainFrame, false) === false,
    'shouldFlagReload：初始导航本身 → 非重载');
  // 5. F4 既有 fixture 校验 + 排他写入（临时目录内）
  const dir = mkdtempSync(join(TMP_ROOT, 'check-nli-v02-selftest-'));
  try {
    const fEmpty = join(dir, 'empty.json');
    writeFileSync(fEmpty, '');
    let threw = false;
    try { loadAndValidateFixture(fEmpty); } catch { threw = true; }
    st(threw, 'loadAndValidateFixture 拒绝空文件');
    const fBad = join(dir, 'bad.json');
    writeFileSync(fBad, '{"scenes":');
    threw = false;
    try { loadAndValidateFixture(fBad); } catch { threw = true; }
    st(threw, 'loadAndValidateFixture 拒绝损坏 JSON');
    const fMut = join(dir, 'mut.json');
    writeFileSync(fMut, JSON.stringify(mutants[0][1]));
    threw = false;
    try { loadAndValidateFixture(fMut); } catch { threw = true; }
    st(threw, 'loadAndValidateFixture 拒绝结构畸形 fixture');
    const fOk = join(dir, 'ok.json');
    writeFileSync(fOk, JSON.stringify(minimal()));
    st(loadAndValidateFixture(fOk).scenes.length === 16, 'loadAndValidateFixture 接受合法 fixture');
    const fEx = join(dir, 'exclusive.json');
    writeFileSync(fEx, 'x', { flag: 'wx' });
    threw = false;
    try { writeFileSync(fEx, 'y', { flag: 'wx' }); } catch { threw = true; }
    st(threw && readFileSync(fEx, 'utf8') === 'x', '排他 wx：已存在文件拒绝写入且内容不变');
  } finally {
    rmSync(dir, { recursive: true, force: true }); // 仅清理自建临时目录
  }
  console.log(`self-test：${stPass.length} 通过，${stFail.length} 失败`);
  return stFail.length;
}

if (SELF_TEST) {
  const bad = runSelfTest();
  process.exit(bad === 0 ? 0 : 1);
}

// ============================================================
// 环境前置：服务探测 + hash 门（初始化前逐文件比对 v02-before）
// ============================================================
try {
  const probe = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
  if (probe.status !== 200) throw new Error(`ENV: BASE_URL 返回 HTTP ${probe.status}`);
} catch (e) {
  console.error(`ENV-ERROR: ${BASE} 不可达（${e.message}）——请先启动 dev server`);
  process.exit(3);
}

// hash 门：比对 v02-before/worktree-hashes.json 中的运行时输入
// （src/ + assets/ + index.html + package*.json + vite.config.js，共 89 项；
//   scripts/ 不要求一致——测试脚本允许先改，lane-contract 第 11 行）。
const hashGate = (() => {
  const map = JSON.parse(readFileSync(HASHES, 'utf8'));
  const runtime = Object.entries(map).filter(([k]) => !k.startsWith('scripts/'));
  const mismatched = [], missing = [];
  for (const [rel, want] of runtime) {
    let got;
    try {
      got = createHash('sha256').update(readFileSync(resolve(ROOT, rel))).digest('hex');
    } catch { missing.push(rel); continue; }
    if (got !== want) mismatched.push(rel);
  }
  return { compared: runtime.length, mismatched, missing };
})();
if (CAPTURE) {
  // 只有初始化（capture）要求严格一致：改前证据必须对应 v02-before 状态
  if (hashGate.mismatched.length || hashGate.missing.length) {
    console.error(`ENV-ERROR: hash 门不匹配，拒绝初始化 fixture：${hashGate.compared} 项中 `
      + `${hashGate.mismatched.length} 不一致、${hashGate.missing.length} 缺失`);
    for (const m of hashGate.mismatched.slice(0, 10)) console.error(`  · mismatch ${m}`);
    for (const m of hashGate.missing.slice(0, 10)) console.error(`  · missing ${m}`);
    process.exit(3);
  }
  console.log(`hash 门：${hashGate.compared}/${hashGate.compared} 运行时输入与 v02-before 一致`);
} else {
  console.log(`hash 门（参考）：${hashGate.compared} 项中 ${hashGate.mismatched.length} 不一致 `
    + `${hashGate.missing.length} 缺失（产品 writer 落地后属预期，不阻断比对）`);
}

// fixture 状态检查（capture：已存在一律拒绝；compare：缺失/畸形即环境错误）
if (CAPTURE && existsSync(FIXTURE)) {
  console.error(`ENV-ERROR: fixture 已存在，拒绝覆盖（lane-contract：绝不覆盖既有 fixture）：${FIXTURE}`);
  process.exit(3);
}
if (!CAPTURE) {
  try {
    loadAndValidateFixture(FIXTURE);
  } catch (e) {
    console.error(`ENV-ERROR: ${e.message}`);
    process.exit(3);
  }
}
mkdirSync(OUT, { recursive: true });

// ============================================================
// 页内采集函数（真实函数传入 evaluate；不依赖闭包，页内自含 1e-6 量化）
// ============================================================
/** 单场景核心几何采集：全部真实 scene 对象读取 */
const captureSceneFn = () => {
  const R = (v) => Math.round(v * 1e6) / 1e6;
  // 实体贴图会随移动状态在 *_idle/*_run 间翻转（随机游走）→ 统一取根名
  const root = (k) => k.replace(/_(idle|run)$/, '');
  const s = window.__PYQUEST__.active();
  const def = s.mapDef;
  const player = (() => {
    const p = s.player, b = p.body, bb = p.getBounds();
    return { x: R(p.x), y: R(p.y), depth: R(p.depth), scaleX: R(p.scaleX), scaleY: R(p.scaleY),
      tex: root(p.texture.key),
      body: { x: R(b.position.x), y: R(b.position.y), w: b.width, h: b.height,
        ox: b.offset.x, oy: b.offset.y, enable: b.enable },
      bounds: { x: R(bb.x), y: R(bb.y), w: R(bb.width), h: R(bb.height) } };
  })();
  const slimes = (() => {
    const byTex = {};
    for (const sl of s.slimeGroup.children.entries) {
      if (!sl || sl.isBoss || sl.dead) continue;
      const k = root(sl.texture.key);
      byTex[k] = byTex[k] || { count: 0, w: sl.body.width, h: sl.body.height,
        ox: sl.body.offset.x, oy: sl.body.offset.y, scaleX: R(sl.scaleX) };
      byTex[k].count++;
    }
    return Object.keys(byTex).sort().map((k) => ({ tex: k, ...byTex[k] }));
  })();
  const boss = (() => {
    const bo = s.boss;
    if (!bo || !bo.active) return null;
    return { cls: bo.constructor.name, tex: root(bo.texture.key),
      scale: [R(bo.scaleX), R(bo.scaleY)], origin: [R(bo.originX), R(bo.originY)],
      body: { w: bo.body.width, h: bo.body.height, ox: bo.body.offset.x, oy: bo.body.offset.y },
      tinted: !!bo.isTinted, hp: bo.hp,
      segs: (bo.segs || []).map((g) => ({ tex: root(g.texture.key),
        scale: [R(g.scaleX), R(g.scaleY)], origin: [R(g.originX), R(g.originY)] })) };
  })();
  // 静态碰撞体：树/灌木变体按 prop 随机分配 → 单场景 per-key 计数不稳定，
  // 改为聚合「总位置集合」（确定性）+ per-variant 结构规格（并入全局聚合）
  const solids = {}, trees = { total: 0, positions: [], specs: {} }, bushes = { total: 0, positions: [] };
  for (const o of s.solids.children.entries) {
    if (!o || !o.texture) continue;
    const k = o.texture.key;
    if (/^tree[1-4]$/.test(k)) {
      trees.total++;
      // 树精灵 y = prop.y + 变体高×0.32（变体随机 256/192 → 归一化回 prop 坐标，
      // 既稳定又仍验证真实生成行为；displayHeight 即变体显示高）
      trees.positions.push([R(o.x), R(o.y - o.displayHeight * 0.32)]);
      if (!trees.specs[k]) trees.specs[k] = { dispW: R(o.displayWidth), dispH: R(o.displayHeight),
        bodyW: o.body.width, bodyH: o.body.height, ox: R(o.body.offset.x), oy: R(o.body.offset.y) };
    } else if (/^bush[1-4]$/.test(k)) {
      bushes.total++;
      bushes.positions.push([R(o.x), R(o.y)]);
    } else {
      const e = solids[k] = solids[k] || { positions: [], bodies: {}, displays: {}, origins: {}, depths: {} };
      e.positions.push([R(o.x), R(o.y)]);
      const bkey = o.body ? `${o.body.width}x${o.body.height}+${o.body.offset.x},${o.body.offset.y}` : 'nobody';
      e.bodies[bkey] = 1;
      e.displays[`${R(o.displayWidth)}x${R(o.displayHeight)}`] = 1;
      e.origins[`${R(o.originX)},${R(o.originY)}`] = 1;
      e.depths[`${R(o.depth)}`] = 1;
    }
  }
  for (const t of [trees, bushes]) t.positions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const k of Object.keys(solids)) {
    const e = solids[k];
    e.positions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    e.bodies = Object.keys(e.bodies).sort();
    e.displays = Object.keys(e.displays).sort();
    e.origins = Object.keys(e.origins).sort();
    e.depths = Object.keys(e.depths).sort();
  }
  // 互动点（含锁门矩形）；spriteKey 单独放 info（v0.2 会换门贴图）
  const interactables = s.interactables.map((it) => {
    const b = it.body && it.body.body;
    return { kind: it.kind || (it.prop && it.prop.type) || 'unknown', x: R(it.x), y: R(it.y),
      locked: !!it.locked,
      body: b ? { x: R(b.position.x), y: R(b.position.y), w: b.width, h: b.height, enable: b.enable } : null };
  }).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.x - b.x || a.y - b.y));
  const zones = s.children.list.filter((o) => o && o.type === 'Zone' && o.body)
    .map((z) => ({ x: R(z.x), y: R(z.y), w: z.width, h: z.height }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const ground = (() => {
    const g = s.children.list.find((o) => o && o.depth === -10 && o.texture);
    if (!g) return null;
    const src = g.texture.getSourceImage();
    return { key: g.texture.key, w: src.width, h: src.height };
  })();
  // 贴图普查：每个 key（实体贴图按根名合并 *_idle/*_run）的真实对象数
  // （排除瞬态环境粒子 particle 与随机变体树/灌木；比对前另行归一化
  //   ground_*/portal 替换——见 normalizeForCompare）
  // fix3-B（review B）：ts_shadow 候选整体带回 Node 侧（splitCensusShadows
  // 纯函数决定剔除/计数——真实采集选择路径可被 --self-test 覆盖）。页内不再
  // 做剔除决定，也不再产出 landmarkShadows 字段（该字段仅 Village 由 Node 侧
  // 产出）：非 Village 的 tagged/规格尺寸影子保留 census 计数（可检出）。
  const shadowCandidates = [];
  const census = {};
  for (const o of s.children.list) {
    if (!o || !o.texture) continue;
    const k = root(o.texture.key);
    if (k === 'particle' || /^tree[1-4]$|^bush[1-4]$/.test(k)) continue;
    if (k === 'ts_shadow') {
      let tagged = false;
      try { tagged = o.getData && o.getData('nliDisplayRole') === 'landmark-shadow'; } catch { /* 无 data API */ }
      shadowCandidates.push({ tagged, x: R(o.x), y: R(o.y),
        dispW: R(o.displayWidth), dispH: R(o.displayHeight), alpha: R(o.alpha), depth: R(o.depth) });
      continue; // 计数决定在 Node 侧 splitCensusShadows（scene key gate）
    }
    census[k] = (census[k] || 0) + 1;
  }
  const doorSprites = s.interactables.filter((it) => it.sprite)
    .map((it) => it.sprite.texture.key).sort();
  return { key: s.scene.settings.key, defW: def.w, defH: def.h,
    worldW: def.w * 128, worldH: def.h * 128,
    groundW: ground ? ground.w : 0, groundH: ground ? ground.h : 0,
    groundKey: ground ? ground.key : '',   // 信息性：v0.2 按 §7 加配方版本，不比对
    player, slimes, boss, solids, trees, bushes, interactables, zones,
    census: Object.keys(census).sort().reduce((acc, k) => (acc[k] = census[k], acc), {}),
    shadowCandidates, doorSprites };
};

/** F1 固定 FX 探针：调用真实产品方法后，读「新建对象的实际 depth」，
 * 绝不写字面量（旧 1200/1500/1800/1900/2000 期望值与实测值分离） */
const probeFxFn = () => {
  const R = (v) => Math.round(v * 1e6) / 1e6;
  const s = window.__PYQUEST__.active();
  const list = () => s.children.list;
  s.floatText(200, 200, '__v02_probe__');
  const t = list().find((o) => o.type === 'Text' && o.text === '__v02_probe__');
  const n0 = list().length;
  s.spawnHeartDrop(64, 64);
  const h = list().slice(n0).find((o) => o.texture && o.texture.key === 'heart_full');
  const hb = h ? h.getBounds() : null;
  const n1 = list().length;
  s.spawnShardFx(320, 320);
  const shard = list().slice(n1)
    .filter((o) => o.texture && o.texture.key === 'particle').map((o) => o.depth);
  let burst = null;
  const sl = s.slimeGroup.children.entries.find((o) => o && !o.isBoss && !o.dead);
  if (sl) {
    const n2 = list().length;
    sl.burst([0xffffff], 4);
    burst = list().slice(n2).filter((o) => o.texture).map((o) => o.depth);
  }
  return {
    floatTextDepth: t ? t.depth : null,
    heart: h ? { bodyW: h.body.width, bodyH: h.body.height,
      dispW: R(h.displayWidth), dispH: R(h.displayHeight), depth: h.depth,
      bounds: hb ? { x: R(hb.x), y: R(hb.y), w: R(hb.width), h: R(hb.height) } : null } : null,
    shardFxDepths: [...new Set(shard)].sort((a, b) => a - b),
    shardFxCount: shard.length,
    burstDepths: burst ? [...new Set(burst)].sort((a, b) => a - b) : null,
    burstCount: burst ? burst.length : null,
  };
};

/** fix2-3 环境粒子真身探针：调用真实 spawnAmbient()，只看本次调用新建的对象。
 * 旧实现抓「场景里第一个 particle」误抓既有 rune/塔 aura（实测 Village 703.5、
 * Dungeon 217 都不是环境粒子）。花粉分支用 Math.random 测试期覆盖（0.99≥0.35
 * 跳过水光分支），finally 恢复，绝不改产品 RNG。 */
const ambientProbeFn = () => {
  const s = window.__PYQUEST__.active();
  const kind = s.mapDef.ambient ? 'sparks' : 'pollen';
  const n0 = s.children.list.length;
  const orig = Math.random;
  try {
    if (kind === 'pollen') Math.random = () => 0.99;
    s.spawnAmbient();
  } finally {
    Math.random = orig;
  }
  const created = s.children.list.slice(n0)
    .filter((o) => o && o.texture && o.texture.key === 'particle');
  return { kind, count: created.length,
    depths: [...new Set(created.map((o) => o.depth))].sort((a, b) => a - b),
    tints: [...new Set(created.map((o) => o.tintTopLeft))].sort() };
};

/** fix2-3 水光探针（不经过 fixedFxDepth，spec §9 明确保留 -5）：
 * 仅 waterTiles 非空场景；Math.random 测试期覆盖为 0.10 走水光分支，finally 恢复 */
const ambientWaterProbeFn = () => {
  const s = window.__PYQUEST__.active();
  if (!s.waterTiles || !s.waterTiles.length) return null;
  const n0 = s.children.list.length;
  const orig = Math.random;
  try {
    Math.random = () => 0.1;
    s.spawnAmbient();
  } finally {
    Math.random = orig;
  }
  const created = s.children.list.slice(n0)
    .filter((o) => o && o.texture && o.texture.key === 'particle');
  return { count: created.length,
    depths: [...new Set(created.map((o) => o.depth))].sort((a, b) => a - b),
    tints: [...new Set(created.map((o) => o.tintTopLeft))].sort() };
};

/** fix2-3 云影探针：读 startAmbient() 在场景 create 时真实创建的 3 朵云
 * （cloud1..5 仅此一处使用；tween 只动 x/y，depth/alpha/display 稳定） */
const cloudsProbeFn = () => {
  const s = window.__PYQUEST__.active();
  if (s.mapDef.ambient) return null; // 室内无云
  const clouds = s.children.list
    .filter((o) => o && o.texture && /^cloud[1-5]$/.test(o.texture.key));
  return { count: clouds.length,
    depths: [...new Set(clouds.map((o) => o.depth))].sort((a, b) => a - b),
    alphas: [...new Set(clouds.map((o) => o.alpha))],
    displays: [...new Set(clouds.map((o) => `${Math.round(o.displayWidth)}x${Math.round(o.displayHeight)}`))].sort() };
};

/** fix2-3 BossSnake 断节探针：真实 popSegment()。不用 children.list 索引切片——
 * Phaser DisplayList 在 destroy 中段删除元素会使尾部新粒子索引前移（实测
 * pop 少 1、die 少 2）→ 先给全部现存 particle 打标记，只认「无标记」新建对象 */
const snakePopProbeFn = () => {
  const s = window.__PYQUEST__.active();
  const b = s.boss;
  if (!b || !b.popSegment) return null;
  for (const o of s.children.list) {
    if (o && o.texture && o.texture.key === 'particle') o.__v02mark = true;
  }
  b.popSegment();
  const created = s.children.list
    .filter((o) => o && o.texture && o.texture.key === 'particle' && !o.__v02mark);
  return { count: created.length,
    depths: [...new Set(created.map((o) => o.depth))].sort((a, b2) => a - b2) };
};

/** fix2-3 BossSnake 死亡探针（同步部分）：先标记全部现存 particle（隔离
 * probeFxFn/popSegment 残留与环境粒子），再真实 die()；burst 28 粒同步可读，
 * 并给同步新建粒子加 __v02sync 二级标记（供异步探针剥离 sync 残留）。
 * 实例级 test-only 覆盖 onBossDefeated，隔离 +1100ms 胜利 DOM 面板（粒子路径
 * 不经该方法）；体节爆裂走 delayedCall，由轮询谓词在阈值达成瞬间原子返回。 */
const snakeDieProbeFn = () => {
  const s = window.__PYQUEST__.active();
  const b = s.boss;
  if (!b || !b.die) return null;
  for (const o of s.children.list) {
    if (o && o.texture && o.texture.key === 'particle') o.__v02mark = true;
  }
  const orig = s.onBossDefeated;
  s.onBossDefeated = () => {}; // 仅本探针实例、仅本次调用
  b.die();
  s.onBossDefeated = orig;
  const created = s.children.list
    .filter((o) => o && o.texture && o.texture.key === 'particle' && !o.__v02mark);
  for (const o of created) o.__v02sync = true;
  return { syncCount: created.length,
    syncDepths: [...new Set(created.map((o) => o.depth))].sort((a, b2) => a - b2) };
};

// ============================================================
// 真实浏览器阶段
// ============================================================
let browser, context, page;
const consoleErrors = [];
const mapRequests = [];
const previewResponses = []; // fix2 B4：/nli-preview/* 的 HTTP 响应状态（SVG <image> 无 DOM load 事件）
const previewFailures = [];
let reloadedAfterBoot = false;
let initialNavDone = false;
let snapshot = null;
let writeRejected = null;
let landmarkTex = [];
let villageLandmarks = [];
let worldMap = { open: false, artIsOldSvg: null, routeLayerCount: 0, rendered: [] };

const ev = (fn, arg) => page.evaluate(fn, arg);

try {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 } }); // spec §10 基准机位
  page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
  // F3：framenavigated 参数即 Frame 本身；仅初始导航后的主框架导航 = 重载
  page.on('framenavigated', (frame) => {
    if (shouldFlagReload(frame, page.mainFrame(), initialNavDone)) reloadedAfterBoot = true;
  });
  page.on('request', (r) => { if (/\/nli-preview\/map_/.test(r.url())) mapRequests.push(r.url()); });
  // fix2 B4：SVG <image> 无 DOM load 事件（实测 document 捕获 0 条）→ 以 HTTP
  // 响应状态 + drawImage 实解码像素 + 渲染 rect 构成 load/decode/render 证据链
  page.on('response', (r) => { if (/\/nli-preview\//.test(r.url())) previewResponses.push({ url: r.url(), status: r.status() }); });
  page.on('requestfailed', (r) => { if (/\/nli-preview\//.test(r.url())) previewFailures.push(r.url()); });

  // 启动游戏（隔离存档：全新 context + localStorage 清空）
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
  initialNavDone = true; // 此后任何主框架导航都按重载处理（fail-closed）
  await page.waitForTimeout(1200);
  await page.click('#btn-start');
  await page.waitForFunction(() => {
    const pq = window.__PYQUEST__;
    return pq && pq.active() && pq.active().scene.settings.key === 'Village';
  }, null, { timeout: 15000, polling: 200 });
  await ev(() => window.__PYQUEST__.godmode());

  // 初始进度快照（信息性：锁门/护盾状态的改前记录，不比对）
  const stateBefore = await ev(() => window.__PYQUEST__.state());

  // ---------- 场景遍历：真实 scene.start + 原生 spawn 语义 ----------
  const PREFERRED = { Village: 'start' };
  for (const k of SCENE_KEYS.slice(1)) PREFERRED[k] = /L$/.test(k) ? 'fromField' : 'fromPrev';

  async function gotoScene(key) {
    let spawn = PREFERRED[key];
    for (let attempt = 0; attempt < 4; attempt++) {
      await ev(([k, sp]) => { window.__PYQUEST__.active().scene.start(k, { spawn: sp }); }, [key, spawn]);
      await page.waitForFunction((k) => {
        const s = window.__PYQUEST__.active();
        return s && s.scene.settings.key === k && s.player && s.mapDef;
      }, key, { timeout: 15000, polling: 150 });
      const info = await ev(() => ({ spawnKeys: Object.keys(window.__PYQUEST__.active().mapDef.spawns || {}) }));
      await ev(() => window.__PYQUEST__.godmode()); // 新 player 实例需重设免伤
      // 冻结 BOSS AI（既有 seam 语义）：Boss 与玩家是 collider（会物理推挤），
      // 不冻结会把玩家推进 portal zone 导致采集期场景漂移
      await ev((k) => window.__PYQUEST__.pinBoss(k), key);
      await page.waitForTimeout(800);               // 稳定窗：spawn 落在 portal zone 会在此被送走
      if ((await ev(() => window.__PYQUEST__.active().scene.settings.key)) === key) return;
      spawn = info.spawnKeys[(attempt + 1) % Math.max(info.spawnKeys.length, 1)] || spawn;
    }
    throw new Error(`ENV: 场景 ${key} 无法稳定落位（连续被传送/启动失败）`);
  }

  const scenes = [];
  for (const key of SCENE_KEYS) {
    await gotoScene(key);
    await page.waitForTimeout(400); // 落位稳定（无输入、免伤，玩家停在 spawn）
    const core = await ev(captureSceneFn);
    // fix3-B：ts_shadow 剔除/计数在 Node 侧纯函数 splitCensusShadows（scene key
    // gate 恰 'Village'）：Village 的 tagged/规格尺寸两地标投影剔除入
    // landmarkShadows（B1b 校验），普通 ts_shadow 照常计数；非 Village 一律
    // 计数（census 可检出），不产出 landmarkShadows 字段（与冻结 fixture 一致）。
    const shadowSplit = splitCensusShadows(core.shadowCandidates || [], key);
    const censusMerged = { ...core.census };
    if (shadowSplit.censusShadows > 0) censusMerged.ts_shadow = shadowSplit.censusShadows;
    delete core.shadowCandidates;
    const fx = await ev(probeFxFn);
    // fix2-3 环境粒子真身（真实 spawnAmbient 新建对象，缺失即失败不静默）：
    const ambient = await ev(ambientProbeFn);
    const water = await ev(ambientWaterProbeFn);
    const clouds = await ev(cloudsProbeFn);
    // fix2-3 BossSnake 断节/死亡两处 1800（真实 popSegment/die 方法路径）
    let snakeFx = null;
    if (core.boss && core.boss.cls === 'BossSnake') {
      const pop = await ev(snakePopProbeFn);
      const die = await ev(snakeDieProbeFn);
      let delayed = null;
      if (die && die.syncCount > 0) {
        // 体节爆裂 delayedCall(i*90)：轮询「无 __v02mark/__v02sync 标记且非
        // 0xffb84d 飞灰」的粒子（纯 delayed 新建）；谓词在阈值达成瞬间原子返回
        // 快照——避免轮询与读取之间 fade tween 销毁粒子造成计数竞态。
        // 阈值 6 = 单节爆裂的粒子数（产品 6 节 × 6 粒，窗口内共存 ≥6 必然）。
        // 本 Playwright 版本 waitForFunction 返回 JSHandle（实测含 ._connection
        // 循环引用，曾致 validateSnapshot 栈溢出）→ 必须 jsonValue() 解包。
        const delayedHandle = await page.waitForFunction(() => {
          const s = window.__PYQUEST__.active();
          const fresh = s.children.list.filter((o) => o && o.texture
            && o.texture.key === 'particle' && !o.__v02mark && !o.__v02sync
            && o.tintTopLeft !== 0xffb84d);
          if (fresh.length < 6) return false;
          return { count: fresh.length,
            depths: [...new Set(fresh.map((o) => o.depth))].sort((a, b) => a - b) };
        }, null, { timeout: 4000, polling: 120 }).catch(() => null);
        delayed = delayedHandle ? await delayedHandle.jsonValue() : null;
      }
      snakeFx = { pop, die: die ? { ...die, delayed } : null };
    }
    scenes.push({ ...core,
      census: Object.keys(censusMerged).sort().reduce((acc, k) => (acc[k] = censusMerged[k], acc), {}),
      ...(key === 'Village' ? { landmarkShadows: shadowSplit.landmarkShadows } : {}),
      heart: fx.heart,
      fxInfo: { ...fx, ambient, water, clouds, snakeFx } });
    await page.screenshot({ path: `${OUT}/scene-${key}.png` });
    console.log(`[capture] ${key}: slimes=${core.slimes.reduce((n, v) => n + v.count, 0)} `
      + `trees=${core.trees.total} zones=${core.zones.length} boss=${core.boss ? core.boss.cls : 'none'} `
      + `ambient=${ambient ? ambient.kind + '/' + ambient.count : 'none'} clouds=${clouds ? clouds.count : '-'}`);
  }

  // 21 动画契约：真实全局 AnimationManager（Phaser 3.90：anims.anims.entries）
  // 的 dur/loop/帧数/帧率（TS_ANIMS 冻结；duration 为浮点，按 1e-6 量化）
  const anims = await ev(() => {
    const R = (v) => Math.round(v * 1e6) / 1e6;
    const entries = window.__PYQUEST__.active().anims.anims.entries;
    return Object.values(entries).map((a) => ({ key: a.key, duration: R(a.duration),
      repeat: a.repeat, frames: a.frames.length, frameRate: R(a.frameRate) }))
      .sort((x, y) => (x.key < y.key ? -1 : 1));
  });

  // B1：两张 1254² 地标 —— 真实 texture manager + Village scene 对象
  landmarkTex = await ev((keys) => keys.map((k) => {
    const s = window.__PYQUEST__.active();
    if (!s.textures.exists(k)) return { key: k, loaded: false };
    const t = s.textures.get(k).getSourceImage();
    return { key: k, loaded: true, w: t.width || t.naturalWidth, h: t.height || t.naturalHeight };
  }), LANDMARKS);
  await gotoScene('Village'); // 与基线采集同一落位（spawn 'start'）
  villageLandmarks = await ev((keys) => keys.map((k) =>
    window.__PYQUEST__.active().children.list
      .filter((o) => o && o.texture && o.texture.key === k).length), LANDMARKS);

  // B4：真实 Tab 打开世界地图（DOM + 真实网络请求 + 渲染成功）
  // fix2 接口对齐：designer 的 WorldMap 用内联 svg.map-art 内 8 个 SVG <image
  // href=/nli-preview/…>（外链 PNG 必须置于内联 SVG；data:SVG 作 img 会被禁
  // 取子图）。验证以「真实渲染」为准：SVGImageElement 无 DOM load 事件（实测
  // document 捕获 0 条，fix2-sbdbg-svgload.mjs）→ 证据链 = HTTP 200 响应
  // （previewResponses）+ drawImage→getImageData 实解码出非零 alpha 像素 +
  // getBoundingClientRect 渲染边界 + href/布局尺寸 + 8 项覆盖。HTTP 可达（B3）
  // 与 markup 计数不单独代替渲染。兼容 HTML img（complete/natural 尺寸照验）。
  await page.keyboard.press('Tab');
  await page.waitForTimeout(700);
  worldMap = await page.evaluate(() => {
    const el = document.getElementById('map-path');
    if (!el) return { open: false, artIsOldSvg: null, routeLayerCount: 0, rendered: [] };
    // 旧程序化装饰侦测：img.map-art 的 data:SVG（已移除时应不存在）
    const oldArt = el.querySelector('img.map-art');
    const artIsOldSvg = !!(oldArt && (oldArt.src || '').startsWith('data:image/svg+xml'));
    const mapRect = el.getBoundingClientRect();
    const svgArts = [...el.querySelectorAll('svg.map-art image')].map((im) => {
      const href = im.getAttribute('href')
        || (im.getAttributeNS && im.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))
        || '';
      const r = im.getBoundingClientRect();
      let decodedPixels = null; // null=方法不可用；0=解码为空；>0=真实像素
      try {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(im, 0, 0, 64, 64); // SVGImageElement 是合法 CanvasImageSource
        const d = ctx.getImageData(0, 0, 64, 64).data;
        decodedPixels = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) decodedPixels++;
      } catch { decodedPixels = null; }
      const insideMap = r.width > 0 && r.height > 0 && r.left >= mapRect.left - 2
        && r.right <= mapRect.right + 2 && r.top >= mapRect.top - 2 && r.bottom <= mapRect.bottom + 2;
      return { kind: 'svg', href,
        x: im.x.baseVal.value, y: im.y.baseVal.value,
        w: im.width.baseVal.value, h: im.height.baseVal.value,
        rectW: Math.round(r.width), rectH: Math.round(r.height), insideMap,
        decodedPixels };
    });
    const imgs = [...el.querySelectorAll('img')].filter((i) => /nli-preview\//.test(i.src || ''))
      .map((i) => {
        const r = i.getBoundingClientRect();
        return { kind: 'img', href: i.getAttribute('src') || i.src || '',
          rectW: Math.round(r.width), rectH: Math.round(r.height),
          insideMap: r.width > 0 && r.height > 0,
          decodedPixels: null, w: i.naturalWidth, h: i.naturalHeight,
          complete: i.complete, naturalW: i.naturalWidth, naturalH: i.naturalHeight };
      });
    return { open: true, artIsOldSvg,
      routeLayerCount: el.querySelectorAll('svg.route-layer').length,
      rendered: [...svgArts, ...imgs] };
  });
  await page.screenshot({ path: `${OUT}/worldmap-old.png` });
  await page.keyboard.press('Tab'); // 关闭，恢复场景
  await page.waitForTimeout(300);

  // ============================================================
  // 快照组装（树四变体跨 16 场景聚合，单场景变体分配随机）
  // ============================================================
  const treeVariants = {};
  for (const sc of scenes) {
    for (const [k, spec] of Object.entries(sc.trees.specs || {})) treeVariants[k] = spec;
  }
  snapshot = {
    purpose: 'v0.2 full-replacement pre-change real-Phaser runtime baseline (Task 0): '
      + 'behavioral geometry + anims frozen; display fields (groundKey, fx depths, door '
      + 'sprites, WorldMap art) recorded as informational only',
    base: BASE, viewport: [1440, 960],
    capturedAt: new Date().toISOString(),
    hashGate: { compared: hashGate.compared, mismatched: hashGate.mismatched.length },
    stateBefore, scenes, anims, treeVariants,
    worldMapOld: { artIsOldSvg: worldMap.artIsOldSvg, routeLayerCount: worldMap.routeLayerCount,
      mapImgCount: worldMap.rendered.length },
  };
  // F4：快照结构校验（失败 → exit 3，绝不写 fixture）
  const snapErrs = validateSnapshot(snapshot);
  if (snapErrs.length) {
    console.error('ENV-ERROR: 快照校验失败，不创建 fixture：');
    snapErrs.slice(0, 30).forEach((e) => console.error(`  · ${e}`));
    envFatal = `快照校验失败（${snapErrs.length} 项）`;
  }
} catch (e) {
  // fix2 诊断：live src 由 designer 并行改写，页面异常需带栈定位来源
  envFatal = (e && e.stack) ? `${e.message}\n    ${String(e.stack).split('\n').slice(1, 5).join('\n    ')}` : (e.message || String(e));
}
// ============================================================
// 阶段 A 比对（仅 compare 模式）：行为几何 vs 冻结 fixture（GREEN 预期）
// 注意：比对在 envFatal 之外也能跑（浏览器阶段成功但后续环境问题时仍需报告），
// 但 env 问题最终一律 exit 3。
// ============================================================
if (!CAPTURE && snapshot && !envFatal) {
  const frozen = normalizeForCompare(loadAndValidateFixture(FIXTURE));
  const fresh = normalizeForCompare(snapshot);
  const IGNORE = [ // v0.2 有意替换的显示字段（fixture 里仅作改前记录）
    /^\.scenes\[\d+\]\.groundKey$/,
    /^\.scenes\[\d+\]\.fxInfo\./,          // 固定 FX 深度按 §9 改 FX_BASE+d
    /^\.scenes\[\d+\]\.heart\.depth$/,
    /^\.scenes\[\d+\]\.doorSprites/,       // 门贴图换新源
    /^\.scenes\[\d+\]\.trees\.specs\./,    // 单场景随机变体分配（聚合进 treeVariants 比对）
    // fix3-B（review B）：两地标投影忽略限定「真实 Village 场景索引」（按 scene
    // key 动态定位，非硬编码 index、非全部场景；B1b 单独校验 Village 规格）。
    ...landmarkShadowsIgnore(snapshot.scenes),
    /^\.stateBefore\./, /^\.worldMapOld\./, /^\.capturedAt$/, /^\.hashGate\./,
  ];
  const { leaves: baselineLeaves, drift: baselineDrift, drifts } = diffBaseline(frozen, fresh, IGNORE);
  const ok = baselineDrift === 0;
  console.log(`--- A. 行为几何基线比对（16 场景 + ${frozen.anims.length} 动画，`
    + `${baselineLeaves} 字段，容差 1e-6，忽略 v0.2 有意替换的显示字段；`
    + `普查已归一化 ground_*/显示地标）---`);
  check(ok, '行为几何与冻结 fixture 逐字段一致',
    ok ? `共 ${baselineLeaves} 字段全部一致` : `${baselineDrift} 处漂移`);
  drifts.slice(0, 30).forEach((d) => { console.log(d); failures.push(d); });
}

// ============================================================
// 阶段 B：v0.2 显示/资源检查（当前旧产品必须真 RED）
// （与阶段 A 一样仅在浏览器阶段成功后执行；env 问题最终 exit 3）
// ============================================================
if (snapshot && !envFatal) {
  console.log('--- B1. 两张 1254² 地标真实加载并显示（spec §5）---');
  // 抓的真实回归：Task2 loader 未接两地标 → Boot 回退遮蔽（Gate R 明令防回退遮蔽）
  for (const t of landmarkTex) {
    check(t.loaded, `纹理 ${t.key} 已由 Boot 真实加载`, t.loaded ? '' : 'textures 中不存在（→ RED）');
    if (t.loaded) check(t.w === 1254 && t.h === 1254, `${t.key} 源纹理 1254×1254 原样拷贝`, `实际 ${t.w}×${t.h}`);
  }
  for (const [i, n] of villageLandmarks.entries()) {
    check(n >= 1, `Village scene 真实创建 ${LANDMARKS[i]} 显示对象`, `实际 ${n} 个（→ RED）`);
  }

  console.log('--- B1b. 两地标投影（spec §5；剔除普查前独立校验规格）---');
  // 抓的真实回归：Task2 未落投影 → 0 个（→ RED）。规格：600×96@(1088,1432)、
  // 320×64@(4352,1400)、alpha.18、depth−9；仅这两个对象可携带 nliDisplayRole 标识
  const villageSnap = snapshot.scenes.find((sc) => sc.key === 'Village');
  const shadowErrs = validateLandmarkShadows(villageSnap ? villageSnap.landmarkShadows : []);
  check(shadowErrs.length === 0, 'Village 两地标投影规格符合 spec §5（尺寸/位置/alpha/depth）',
    shadowErrs.length ? `${shadowErrs.slice(0, 4).join('；')}（→ RED）` : '2 个且规格一致');

  console.log('--- B2. manifest 声明 v0.2 新源（lane-contract：source_version/62 entries/sampling）---');
  // 抓的真实回归：导出器没重建元数据，旧包来源冒充新包
  // fix2-5：fetch/JSON 异常一律 envFatal → exit 3（fail-closed，绝不冒充 RED/挂死）
  let manifest = null;
  try {
    const r = await fetch(`${BASE}/nli-preview/manifest.json`, { signal: AbortSignal.timeout(8000) });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    manifest = await r.json();
  } catch (e) {
    envFatal = `manifest 获取失败：${e.message}`;
  }
  if (manifest) {
  const sv = manifest.source_version;
  check(typeof sv === 'string' && /0\.2/.test(sv), 'manifest 顶层 source_version 声明 v0.2',
    sv ? `实际 "${sv}"` : '字段缺失（→ RED）');
  check((manifest.entries || []).length === MANIFEST_ENTRIES,
    `manifest entries = ${MANIFEST_ENTRIES}（旧 55 key + 7 地图衍生）`, `实际 ${(manifest.entries || []).length}`);
  const sample = (manifest.entries || []).find((e) => e.key === 'warrior_idle') || (manifest.entries || [])[0];
  check(!!(sample && sample.source_image_path), 'art entry 声明 source_image_path',
    sample ? `实际字段: ${Object.keys(sample).join(',')}` : '无 entries');
  check(!!(sample && sample.sampling && typeof sample.sampling === 'object'),
    'art entry 声明 sampling{mode,...}（F/C/terrain/composite/copy）',
    sample?.sampling ? `实际 ${JSON.stringify(sample.sampling).slice(0, 80)}` : '字段缺失（→ RED）');
  check(!!manifest.runtime_derivatives, 'manifest.runtime_derivatives 独立列出（§7 地面衍生记录）',
    manifest.runtime_derivatives ? '' : '缺失（→ RED）');
  }

  console.log('--- B3. 7 张 map_* 衍生 PNG 真实 HTTP 可达且 256² ---');
  // fix2-5：B2 env 失败后不再继续断言（避免把服务故障误报为 RED）
  if (!envFatal) {
  // 抓的真实回归：WorldMap 插画资源未导出。注意 Vite dev 对缺失静态文件会回退
  // index.html（HTTP 200 text/html），必须校验 PNG 签名而非只看状态码
  for (const k of MAP_KEYS) {
    let st = 0, w = 0, h = 0, isPng = false;
    try {
      const r = await fetch(`${BASE}/nli-preview/${k}.png`);
      st = r.status;
      const buf = Buffer.from(await r.arrayBuffer());
      isPng = buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      if (isPng) { w = buf.readUInt32BE(16); h = buf.readUInt32BE(20); }
    } catch (e) { st = `ERR:${e.message}`; }
    check(st === 200 && isPng && w === 256 && h === 256, `${k}.png HTTP 200 且 PNG 256×256`,
      `status=${st} ${isPng ? `${w}×${h}` : '非 PNG 内容（Vite SPA 回退）（→ RED）'}`);
  }

  console.log('--- B4. WorldMap 移除旧程序化装饰、渲染 8 张插画（真实 Tab 交互 + SVG 真实渲染）---');
  // fix2 接口对齐：designer 用内联 svg.map-art 内 SVG <image href>（非 HTML img；
  // SVG <image> 无 DOM load 事件，实测 document 捕获 0 条）。每项验证真实渲染
  // 证据链：HTTP 200 响应（previewResponses）+ drawImage/getImageData 实解码出
  // 非零 alpha 像素 + getBoundingClientRect 渲染边界 + href/布局尺寸；兼容
  // HTML img（complete+natural 尺寸）。HTTP 可达（B3）与 markup 计数不单独
  // 代替渲染。
  const wm = worldMap;
  check(wm.open === true, 'Tab 真实打开世界地图（#map-path 渲染）', `open=${wm.open}`);
  for (const u of ILLUSTRATION_URLS) {
    const art = wm.rendered.find((a) => (a.href || '').includes(u));
    const want = u.includes('castle_medium') ? 1254 : 256; // 源尺寸：复用地标 1254²、map_* 256²
    const resp = previewResponses.find((r) => r.url.includes(u));
    const httpOK = !!resp && resp.status === 200 && !previewFailures.some((f) => f.includes(u));
    const decodedOK = art && (art.kind === 'svg'
      ? art.decodedPixels !== null && art.decodedPixels > 0
      : art.complete === true && art.naturalW === want && art.naturalH === want);
    check(!!art && httpOK && !!decodedOK,
      `插画 ${u} 真实 load+解码成功（${art ? art.kind : '缺失'}：HTTP ${resp ? resp.status : '无响应'}`
      + ` + ${art && art.kind === 'svg' ? `drawImage→${art.decodedPixels}px 非零 alpha` : `natural=${art && art.naturalW}×${art && art.naturalH}（期望 ${want}）`}）`,
      (art && httpOK && decodedOK) ? '' : `art=${!!art} http=${httpOK} decoded=${!!decodedOK}（→ RED）`);
    check(!!art && art.w > 0 && art.h > 0,
      `插画 ${u} 布局尺寸正确（${art ? `${art.w}×${art.h}` : '缺失'}）`,
      art ? '' : 'DOM 中不存在（→ RED）');
    check(!!art && art.rectW > 5 && art.rectH > 5 && art.insideMap,
      `插画 ${u} 正渲染于地图边界内（rect ${art ? `${art.rectW}×${art.rectH}` : '-'}）`,
      art ? `rect=${art.rectW}×${art.rectH} inside=${art.insideMap}（→ RED）` : 'DOM 中不存在（→ RED）');
  }
  const mapOnly = wm.rendered.filter((a) => /\/nli-preview\/map_/.test(a.href || '')).length;
  check(wm.rendered.length >= 8 && mapOnly === 7, '8 张插画全覆盖（7 张 map_* 单独计数）',
    `共 ${wm.rendered.length} 项，map_* ${mapOnly}（→ RED）`);
  check(mapRequests.length >= 7, '打开地图期间真实发起 map_* 资源请求',
    `实际 ${mapRequests.length} 条（→ RED）`);
  check(wm.artIsOldSvg === false, '旧 img.map-art 程序化 SVG 装饰已移除',
    wm.artIsOldSvg ? '仍是 data:image/svg+xml 旧风景（→ RED）' : '已移除');

  console.log('--- B5. 固定 FX 深度改为 FX_BASE+d（spec §9 公式；实测值一律读自真实对象）---');
  // 抓的真实回归：旧固定 1200/1500/1800/1900/2000 在高场景/地标下被压住（反馈不可见）
  for (const sc of snapshot.scenes) {
    const base = fxBase(sc.defH);
    const fx = sc.fxInfo;
    check(fx.floatTextDepth === base + 2000,
      `${sc.key}: floatText depth = FX_BASE+2000 (${base + 2000})`, `实际 ${fx.floatTextDepth}（→ RED）`);
    if (sc.heart) check(sc.heart.depth === base + 1500,
      `${sc.key}: heart 显示 depth = FX_BASE+1500 (${base + 1500})`, `实际 ${sc.heart.depth}（→ RED）`);
    check(fx.shardFxCount === SHARD_FX_COUNT && fx.shardFxDepths.length === 1
      && fx.shardFxDepths[0] === base + 1900,
      `${sc.key}: 奖励粒子 ${SHARD_FX_COUNT} 个且全部 depth = FX_BASE+1900 (${base + 1900})`,
      `实际 count=${fx.shardFxCount} depths=${JSON.stringify(fx.shardFxDepths)}（→ RED）`);
    if (fx.burstDepths) {
      check(fx.burstCount === BURST_COUNT && fx.burstDepths.length === 1
        && fx.burstDepths[0] === base + 1800,
        `${sc.key}: Slime burst ${BURST_COUNT} 个且全部 depth = FX_BASE+1800 (${base + 1800})`,
        `实际 count=${fx.burstCount} depths=${JSON.stringify(fx.burstDepths)}（→ RED）`);
    }
    // fix2-3 环境粒子（花粉/火把飞灰）：必须由真实 spawnAmbient() 新建对象测得，
    // 缺失即失败（不再 null 静默跳过；旧实现误抓既有 aura 得 703.5/217 假值）
    const amb = fx.ambient;
    check(!!amb && amb.count >= 1 && amb.depths.length === 1 && amb.depths[0] === base + 1200,
      `${sc.key}: ${amb && amb.kind === 'sparks' ? '火把飞灰' : '花粉'}（真实 spawnAmbient 新建）`
      + ` depth = FX_BASE+1200 (${base + 1200})`,
      amb ? `实际 count=${amb.count} depths=${JSON.stringify(amb.depths)}（→ RED）` : '未创建（→ RED）');
    // fix2-3 水光：spec §9 明确不经过 fixedFxDepth，保持 −5
    if (fx.water) {
      check(fx.water.count >= 1 && fx.water.depths.length === 1 && fx.water.depths[0] === -5,
        `${sc.key}: 水光 depth 恒 −5（不经 FX_BASE）`,
        `实际 count=${fx.water.count} depths=${JSON.stringify(fx.water.depths)}（→ RED）`);
    }
    // fix2-3 云影（户外）：startAmbient 真实路径创建的 3 朵透明云
    if (fx.clouds) {
      check(fx.clouds.count === 3 && fx.clouds.depths.length === 1
        && fx.clouds.depths[0] === base + 1500,
        `${sc.key}: 3 朵云影 depth = FX_BASE+1500 (${base + 1500})`,
        `实际 count=${fx.clouds.count} depths=${JSON.stringify(fx.clouds.depths)}（→ RED）`);
    }
    // fix2-3 BossSnake 断节/死亡两处 1800（真实 popSegment/die 方法路径）
    if (fx.snakeFx) {
      const { pop, die } = fx.snakeFx;
      check(!!pop && pop.count === 8 && pop.depths.length === 1 && pop.depths[0] === base + 1800,
        `${sc.key}: BossSnake 断节 8 粒 depth = FX_BASE+1800 (${base + 1800})`,
        pop ? `实际 count=${pop.count} depths=${JSON.stringify(pop.depths)}（→ RED）` : '未创建（→ RED）');
      check(!!die && die.syncCount === 28 && die.syncDepths.length === 1
        && die.syncDepths[0] === base + 1800,
        `${sc.key}: BossSnake 死亡 burst 28 粒 depth = FX_BASE+1800 (${base + 1800})`,
        die ? `实际 count=${die.syncCount} depths=${JSON.stringify(die.syncDepths)}（→ RED）` : '未创建（→ RED）');
      const del = die && die.delayed;
      check(!!del && del.count >= 6 && del.depths.length === 1
        && del.depths[0] === base + 1800,
        `${sc.key}: BossSnake 死亡体节爆裂（delayedCall，剥离 sync 后纯新建）depth = FX_BASE+1800 (${base + 1800})`,
        del ? `实际 count=${del.count} depths=${JSON.stringify(del.depths)}（→ RED）` : '未观测到（→ RED）');
    }
    }
  }
}

// ============================================================
// 汇总（退出码：0 全过 / 1 断言失败 / 3 环境 fail-closed）
// F3：console/page 错误与重载一律 exit 3；capture 的 fixture 写入推迟到
// 此处（环境失败 → 不创建任何 fixture）
// ============================================================
console.log('');
console.log('='.repeat(64));
const envProblems = [];
if (consoleErrors.length) envProblems.push(`页面错误 ${consoleErrors.length} 条：\n    ${consoleErrors.slice(0, 6).join('\n    ')}`);
if (reloadedAfterBoot) envProblems.push('运行期间发生主框架页面导航/重载（可能 Vite HMR），结果不可作为 RED/GREEN 依据');
if (envFatal) envProblems.push(envFatal);
if (envProblems.length) {
  console.log('ENV-ERROR（fail-closed，非契约 RED）：');
  for (const n of envProblems) console.log(`  · ${n}`);
  console.log(CAPTURE ? 'capture 模式：fixture 未创建（环境失败禁止初始化）' : '');
  try { await context?.close(); } catch { /* ignore */ }
  try { await browser?.close(); } catch { /* ignore */ }
  console.log('exit 3');
  process.exit(3);
}
if (CAPTURE && snapshot) {
  try {
    // 排他创建（flag 'wx'）：文件已存在时抛错，绝不覆盖
    writeFileSync(FIXTURE, JSON.stringify(snapshot, null, 1) + '\n', { flag: 'wx' });
    const sha = createHash('sha256').update(readFileSync(FIXTURE)).digest('hex');
    console.log(`fixture 已初始化（排他创建）：${FIXTURE}`);
    console.log(`fixture SHA256: ${sha}`);
  } catch (e) {
    writeRejected = e.code || e.message;
  }
}
try { await context?.close(); } catch { /* ignore */ }
try { await browser?.close(); } catch { /* ignore */ }
if (writeRejected) {
  console.log(`ENV-ERROR: fixture 排他创建失败（${writeRejected}）`);
  console.log('exit 3');
  process.exit(3);
}
console.log(`断言：${passes.length} 通过，${failures.length} 失败`);
for (const f of failures) console.log(f);
if (failures.length === 0) {
  console.log('PASS: 基线 GREEN 且 v0.2 显示/资源检查全部满足');
  process.exit(0);
}
console.log(CAPTURE
  ? 'FAIL: v0.2 显示/资源检查未满足（当前为预期 RED：Task2 未实施）'
  : 'FAIL: v0.2 检查未满足（预期 RED）或基线漂移（非预期，需主代理裁定）');
process.exit(1);
