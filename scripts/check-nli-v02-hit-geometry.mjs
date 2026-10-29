// ============================================================
// Task 0（v0.2 全面替换）· 补充 hit-geometry 改前捕获（fix1 F6）
//
// 目的：主脚本冻结的是行为几何基线，但缺 enemy/head/segment
// getBounds、静态体世界坐标、heart 浮动后物理体、四方向攻击边界
// 等命中几何覆盖。本脚本从「immutable v02-before 快照」独立起一个
// Vite dev server（绝不碰 live assets——live 由并行资源 lane 随时改写，
// 不能当 before 证据），把命中几何改前值一次性冻结进新 fixture。
//
// 用法：
//   node scripts/check-nli-v02-hit-geometry.mjs --self-test
//   node scripts/check-nli-v02-hit-geometry.mjs --capture-baseline [--output <dir>] [--port 5199]
//   node scripts/check-nli-v02-hit-geometry.mjs [--output <dir>] [--port 5199]
//   node scripts/check-nli-v02-hit-geometry.mjs --url http://127.0.0.1:5186   # live 比对
//
// fix2 live 模式（--url，绝不允许 live capture）：
//   · 跳过快照 Vite server，直接对 live dev server 比对同场景命中几何
//   · --url + --capture-baseline → exit 3（live 资产随 lane 改写，禁止当 before）
//   · 仍做 94 项快照 hash 前后校验（本模式根本不服务快照 → 必须全一致）
//   · compare 只忽略 informational 元数据（capturedAt/serverPort/hashGate.after）
//     + heart 两处显示 depth（v0.2 §9 有意改 FX_BASE+1500，由 live 断言单独
//     验证）；body/bounds/attacks 全部照常逐字段比对
//
// 快照服务器安全规则（lane 约定）：
//   · root = .slim/deepwork/nli-systematic-2026-10-27/v02-before（只读）
//   · configFile:false、publicDir=<root>/assets、base './'
//   · cacheDir 在快照之外（本脚本自身 evidence 目录）
//   · 独立回环端口（默认 5199，与主 lane 5186 区分）、host 127.0.0.1
//   · 依赖解析走 workspace node_modules（快照内无 node_modules；
//     bare import 自快照 src 向上解析命中 worktree 根）
//   · 服务前后各做一次 94 项快照全量 hash 校验——运行后出现任何
//     mismatch 说明服务写进快照 → exit 3
//   · 绝不在快照内创建文件/符号链接
//
// 确定性（pin geometry/state，不写数值答案）：
//   · 敌人/BOSS/体节/王冠全部钉到由 mapDef 尺寸推导的固定锚点，
//     同一 evaluate 内「读取→动作→读取」（rAF 不穿插 → 物理不步进）
//   · 四方向攻击边界 = 真实 player.tryAttack() + 真实敌人 getBounds()
//     的 RectangleToRectangle 结果做粗扫 + 二分细化，inside/outside
//     各再探一次验证边界两侧真实行为
//   · heart 用真实 spawnHeartDrop（先 15×13 静态体后放大显示，
//     tween 浮动），三个时刻读 body 15×13 不变（产品物理不修）
//
// 退出码：0 全过 / 1 断言失败 / 3 环境 fail-closed（快照被写、fixture
// 缺失/已存在/畸形、页面错误、重载、服务不可达；环境失败绝不创建 fixture）
// ============================================================
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TMP_ROOT = '/private/var/folders/7z/hdr_2hpx1td2cw2cxslg7d1w0000gs/T/opencode';
const SNAP = resolve(ROOT, '.slim/deepwork/nli-systematic-2026-10-27/v02-before');
const FIXTURE = resolve(ROOT, 'scripts/fixtures/nli-v02-hit-geometry-before.json');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const SELF_TEST = argv.includes('--self-test');
const CAPTURE = argv.includes('--capture-baseline');
const LIVE_URL = argOf('--url');
const LIVE = !!LIVE_URL;
if (LIVE && CAPTURE) {
  console.error('ENV-ERROR: --url（live）与 --capture-baseline 互斥——live src 由并行 lane 随时改写，禁止作为 before 证据');
  process.exit(3);
}
const PORT = Number(argOf('--port') || 5199);
const OUT = resolve(ROOT, argOf('--output')
  || '.superpowers/sdd/2026-10-28-nli-v02-full-replacement/task-0-browser-evidence');

// ---------- 独立字面期望（产品物理不变量，非数值答案来源） ----------
const HIT_SCENES = ['Village', 'Dungeon', 'Cave', 'SciLair'];
const BOSS_BY_SCENE = { Village: null, Dungeon: 'BossSlime', Cave: 'BossSnake', SciLair: 'BossSlime' };
const SNAKE_SEGS = 6;
const HEART_BODY_W = 15, HEART_BODY_H = 13;     // 拾取物理体（显示放大后不 refreshBody）
const HEART_DISP_W = 116, HEART_DISP_H = 100;   // 显示放大
const TREE_VARIANTS = ['tree1', 'tree2', 'tree3', 'tree4'];

// ============================================================
// 纯函数（供 --self-test 独立负向测试）
// ============================================================
const NULLABLE = /\.(boss|crown|body|segs)$/;

/** F4 同款值域扫描：undefined/function/symbol/bigint/非有限/稀疏/null（白名单外） */
function scanValueTree(v, path, errs) {
  if (v === undefined) { errs.push(`undefined at ${path}`); return; }
  if (v === null) { if (!NULLABLE.test(path)) errs.push(`null at ${path}`); return; }
  const t = typeof v;
  if (t === 'function' || t === 'symbol' || t === 'bigint') { errs.push(`${t} at ${path}`); return; }
  if (t === 'number' && !Number.isFinite(v)) { errs.push(`非有限数 at ${path}`); return; }
  if (t !== 'object') return;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (!(i in v)) { errs.push(`稀疏数组 at ${path}[${i}]`); return; }
    }
    v.forEach((x, i) => scanValueTree(x, `${path}[${i}]`, errs));
  } else {
    for (const [k, x] of Object.entries(v)) scanValueTree(x, `${path}.${k}`, errs);
  }
}

/** 命中几何快照结构校验（含产品物理字面不变量） */
function validateHitSnapshot(snap) {
  const errs = [];
  if (!snap || typeof snap !== 'object') return ['快照不是对象'];
  scanValueTree(snap, '', errs);
  if (!snap.scenes || typeof snap.scenes !== 'object') { errs.push('scenes 缺失'); return errs; }
  const dirOK = ['down', 'up', 'left', 'right'];
  for (const key of HIT_SCENES) {
    const sc = snap.scenes[key];
    if (!sc) { errs.push(`scenes.${key} 缺失`); continue; }
    if (!Array.isArray(sc.slimes) || sc.slimes.length === 0) errs.push(`${key}: slimes 空`);
    sc.slimes?.forEach((sl, i) => {
      if (!(sl.bounds?.w > 0) || !(sl.bounds?.h > 0)) errs.push(`${key}: slimes[${i}].bounds 空`);
      if (!(sl.body?.w > 0) || !(sl.body?.h > 0)) errs.push(`${key}: slimes[${i}].body 空`);
    });
    if (!Array.isArray(sc.attack) || sc.attack.length !== 4) { errs.push(`${key}: attack 不是 4 方向`); }
    else sc.attack.forEach((a, i) => {
      if (a.facing !== dirOK[i]) errs.push(`${key}: attack[${i}].facing=${a.facing}≠${dirOK[i]}`);
      if (!(a.boundary > 0)) errs.push(`${key}: attack[${a.facing}].boundary=${a.boundary} 非>0`);
      if (a.insideHit !== true) errs.push(`${key}: attack[${a.facing}].insideHit≠true`);
      if (a.outsideHit !== false) errs.push(`${key}: attack[${a.facing}].outsideHit≠false`);
      if (!(a.enemyBounds?.w > 0) || !(a.enemyBounds?.h > 0)) errs.push(`${key}: attack[${a.facing}].enemyBounds 空`);
    });
    const wantBoss = BOSS_BY_SCENE[key];
    if (wantBoss === null) {
      if (sc.boss !== null) errs.push(`${key}: 期望无 BOSS，实际 ${sc.boss?.cls}`);
    } else if (!sc.boss || sc.boss.cls !== wantBoss) {
      errs.push(`${key}: 期望 ${wantBoss}，实际 ${sc.boss?.cls ?? 'none'}`);
    } else {
      if (!(sc.boss.bounds?.w > 0) || !(sc.boss.bounds?.h > 0)) errs.push(`${key}: boss head bounds 空`);
      if (!(sc.boss.body?.w > 0) || !(sc.boss.body?.h > 0)) errs.push(`${key}: boss body 空`);
      if (wantBoss === 'BossSnake') {
        if ((sc.boss.segs?.length ?? 0) !== SNAKE_SEGS) errs.push(`${key}: 体节数 ${sc.boss.segs?.length}≠${SNAKE_SEGS}`);
        sc.boss.segs?.forEach((g, i) => {
          if (!(g.bounds?.w > 0) || !(g.bounds?.h > 0)) errs.push(`${key}: segs[${i}].bounds 空`);
        });
      }
    }
    if (!Array.isArray(sc.solids)) errs.push(`${key}: solids 缺失`);
    sc.solids?.forEach((so, i) => {
      if (!(so.bounds?.w > 0) || !(so.bounds?.h > 0)) errs.push(`${key}: solids[${i}].bounds 空`);
      if (so.body !== null && !(so.body?.w > 0)) errs.push(`${key}: solids[${i}].body 异常`);
    });
    const solidKeys = new Set((sc.solids || []).map((so) => so.key));
    if (key === 'Village' && !(solidKeys.has('castle') && solidKeys.has('gate_closed'))) {
      errs.push('Village: 静态体缺 castle/gate_closed');
    }
    if (key === 'Cave' && !solidKeys.has('crystal')) errs.push('Cave: 静态体缺 crystal');
    if (!Array.isArray(sc.entityTypes) || sc.entityTypes.length === 0) errs.push(`${key}: entityTypes 空`);
  }
  const treeKeys = Object.keys(snap.treeVariants || {});
  if (treeKeys.length !== 4 || !TREE_VARIANTS.every((k) => treeKeys.includes(k))) {
    errs.push(`树四变体不全：${treeKeys.join(',')}`);
  }
  TREE_VARIANTS.forEach((k) => {
    const t = snap.treeVariants?.[k];
    if (t && (!(t.dispW > 0) || !(t.bodyW > 0))) errs.push(`树 ${k} 规格空`);
  });
  const h = snap.heart;
  if (!h || !h.initial || !h.afterFloat) {
    errs.push('heart 探针缺失');
  } else {
    for (const [k, r] of [['initial', h.initial], ['afterFloat', h.afterFloat]]) {
      if (r.bodyW !== HEART_BODY_W || r.bodyH !== HEART_BODY_H) {
        errs.push(`heart.${k}.body ${r.bodyW}×${r.bodyH}≠${HEART_BODY_W}×${HEART_BODY_H}`);
      }
      if (r.dispW !== HEART_DISP_W || r.dispH !== HEART_DISP_H) {
        errs.push(`heart.${k}.display ${r.dispW}×${r.dispH}≠${HEART_DISP_W}×${HEART_DISP_H}`);
      }
    }
    if (h.floatingObserved !== true) errs.push('heart 浮动未见位移（tween 未生效）');
    if (h.initial.bodyX !== h.afterFloat.bodyX || h.initial.bodyY !== h.afterFloat.bodyY) {
      errs.push('heart 静态拾取体随浮动漂移');
    }
  }
  if (!errs.length) {
    const s1 = JSON.stringify(snap);
    if (s1 !== JSON.stringify(JSON.parse(s1))) errs.push('JSON 往返有损');
  }
  return errs;
}

/** 既有 fixture 读取 + 校验（空/损坏/畸形一律拒绝） */
function loadAndValidateHitFixture(path) {
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
  const errs = validateHitSnapshot(snap);
  if (errs.length) throw new Error(`fixture 结构校验失败：${errs.slice(0, 8).join('；')}`);
  return snap;
}

/** 快照全量 hash 校验（root 参数化 → self-test 可用临时目录副本） */
function hashCheckSnapshot(root) {
  const hashFile = join(root, 'worktree-hashes.json');
  const map = JSON.parse(readFileSync(hashFile, 'utf8'));
  const mismatched = [], missing = [];
  for (const [rel, want] of Object.entries(map)) {
    const p = join(root, rel);
    let got;
    try {
      const st = statSync(p);
      if (st.isSymbolicLink()) { mismatched.push(`${rel} (符号链接！)`); continue; }
      got = createHash('sha256').update(readFileSync(p)).digest('hex');
    } catch { missing.push(rel); continue; }
    if (got !== want) mismatched.push(rel);
  }
  return { compared: Object.keys(map).length, mismatched, missing };
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
// --self-test：独立负向自测（纯逻辑 + 临时目录，绝不触碰真实 fixture/快照）
// ============================================================
function runSelfTest() {
  const stPass = [], stFail = [];
  const st = (cond, label) => {
    console.log(cond ? `  ✓ ${label}` : `  ✗ ${label}`);
    (cond ? stPass : stFail).push(label);
  };
  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const R = (v) => Math.round(v * 1e6) / 1e6;
  const mkScene = (key) => ({
    key,
    slimes: [{ tex: 'pawn_red', pos: [10, 20],
      bounds: { x: 10, y: 20, w: 96, h: 48 }, body: { w: 48, h: 24, ox: 24, oy: 60 }, scale: 2 }],
    boss: BOSS_BY_SCENE[key] ? (() => {
      const b = { cls: BOSS_BY_SCENE[key], tex: 'warrior_purple',
        bounds: { x: 1, y: 2, w: 614.4, h: 614.4 }, body: { w: 192, h: 83.2, ox: 165, oy: 330 },
        origin: [0.5, 0.708], scale: [1.28], segs: null, crown: { bounds: { x: 1, y: 2, w: 88, h: 88 } } };
      if (BOSS_BY_SCENE[key] === 'BossSnake') {
        b.crown = null;
        b.segs = Array.from({ length: 6 }, (_, i) => ({ tex: 'pawn_black',
          bounds: { x: i, y: i, w: 238, h: 119 }, origin: [0.5, 0.698], scale: [1.24] }));
      }
      return b;
    })() : null,
    attack: ['down', 'up', 'left', 'right'].map((facing) => (
      { facing, boundary: 300, insideHit: true, outsideHit: false, enemyBounds: { w: 96, h: 48 } })),
    solids: key === 'Village'
      ? [{ key: 'castle', pos: [1, 2], bounds: { x: 1, y: 2, w: 640, h: 640 }, body: { w: 320, h: 160, ox: 160, oy: 400 } },
        { key: 'gate_closed', pos: [3, 4], bounds: { x: 3, y: 4, w: 128, h: 128 }, body: { w: 64, h: 32, ox: 32, oy: 90 } }]
      : key === 'Cave'
        ? [{ key: 'crystal', pos: [5, 6], bounds: { x: 5, y: 6, w: 128, h: 256 }, body: { w: 64, h: 128, ox: 32, oy: 120 } }]
        : [],
    entityTypes: ['pawn_red', 'warrior'],
    treeVariantsLocal: {},
  });
  const minimal = () => ({
    purpose: 'selftest',
    capturedAt: 't', serverPort: 1,
    hitHashCheck: { before: { compared: 94, mismatched: 0, missing: 0 }, after: { compared: 94, mismatched: 0, missing: 0 } },
    scenes: Object.fromEntries(HIT_SCENES.map((k) => [k, mkScene(k)])),
    treeVariants: { tree1: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree2: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree3: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 },
      tree4: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 } },
    heart: { spawnAt: [100, 200], floatingObserved: true,
      initial: { bodyW: 15, bodyH: 13, dispW: 116, dispH: 100, x: 100, y: 200, bodyX: 92.5, bodyY: 193.5, depth: 1500 },
      afterFloat: { bodyW: 15, bodyH: 13, dispW: 116, dispH: 100, x: 100, bodyX: 92.5, bodyY: 193.5, depth: 1500 } },
  });
  // 1. 合法最小快照通过
  st(validateHitSnapshot(minimal()).length === 0, 'validateHitSnapshot：合法最小快照通过');
  // 2. 结构/值域缺陷必须拒绝
  const mutants = [];
  const m1 = deepClone(minimal()); delete m1.scenes.Cave;
  mutants.push(['缺 Cave 场景', m1]);
  const m2 = deepClone(minimal()); m2.scenes.Village.slimes = [];
  mutants.push(['slimes 空', m2]);
  const m3 = deepClone(minimal()); m3.scenes.Dungeon.attack[0].insideHit = false;
  mutants.push(['insideHit=false（边界内侧未命中）', m3]);
  const m4 = deepClone(minimal()); m4.scenes.Dungeon.attack[1].outsideHit = true;
  mutants.push(['outsideHit=true（边界外侧命中）', m4]);
  const m5 = deepClone(minimal()); m5.scenes.Dungeon.attack[2].boundary = 0;
  mutants.push(['boundary=0', m5]);
  const m6 = deepClone(minimal()); m6.scenes.Cave.boss.segs = m6.scenes.Cave.boss.segs.slice(0, 5);
  mutants.push(['体节 5 个', m6]);
  const m7 = deepClone(minimal()); m7.scenes.SciLair.boss = null;
  mutants.push(['SciLair 缺 BOSS', m7]);
  const m8 = deepClone(minimal()); m8.scenes.Village.solids = m8.scenes.Village.solids.slice(0, 1);
  mutants.push(['Village 缺 gate_closed', m8]);
  const m9 = deepClone(minimal()); m9.heart.afterFloat.bodyW = 14;
  mutants.push(['heart body 14（浮动后物理体被改）', m9]);
  const m10 = deepClone(minimal()); delete m10.heart.afterFloat;
  mutants.push(['heart 缺 afterFloat 读数', m10]);
  const m11 = deepClone(minimal()); m11.heart.floatingObserved = false;
  mutants.push(['heart 未见浮动位移', m11]);
  const m11b = deepClone(minimal()); m11b.heart.afterFloat.bodyY = 150;
  mutants.push(['heart 静态拾取体随浮动漂移', m11b]);
  const m12 = deepClone(minimal()); m12.scenes.Village.slimes[0].tex = undefined;
  mutants.push(['undefined 值', m12]);
  const m13 = deepClone(minimal()); m13.scenes.Village.entityTypes = () => [];
  mutants.push(['function 值', m13]);
  const m14 = deepClone(minimal()); m14.scenes.Village.attack[0].boundary = Infinity;
  mutants.push(['非有限数 Infinity', m14]);
  const m15 = deepClone(minimal()); m15.scenes.Village.entityTypes = ['warrior'];
  m15.scenes.Village.entityTypes.length = 3;
  mutants.push(['稀疏数组', m15]);
  const m16 = deepClone(minimal()); delete m16.treeVariants.tree4;
  mutants.push(['树变体 3 个', m16]);
  for (const [label, mut] of mutants) {
    st(validateHitSnapshot(mut).length > 0, `validateHitSnapshot 拒绝：${label}`);
  }
  // 3. 快照 hash 校验（临时目录内伪造 mini 快照树）
  const dir = mkdtempSync(join(TMP_ROOT, 'hitgeo-selftest-'));
  try {
    const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/a.js'), 'A');
    writeFileSync(join(dir, 'index.html'), 'I');
    writeFileSync(join(dir, 'worktree-hashes.json'), JSON.stringify({
      'src/a.js': sha(join(dir, 'src/a.js')), 'index.html': sha(join(dir, 'index.html')),
    }));
    st(hashCheckSnapshot(dir).mismatched.length === 0, 'hashCheckSnapshot：一致快照通过');
    writeFileSync(join(dir, 'src/a.js'), 'TAMPERED');
    st(hashCheckSnapshot(dir).mismatched.length === 1, 'hashCheckSnapshot：篡改文件检出');
    writeFileSync(join(dir, 'src/a.js'), 'A');
    const map = JSON.parse(readFileSync(join(dir, 'worktree-hashes.json'), 'utf8'));
    map['src/gone.js'] = 'deadbeef';
    writeFileSync(join(dir, 'worktree-hashes.json'), JSON.stringify(map));
    st(hashCheckSnapshot(dir).missing.length === 1, 'hashCheckSnapshot：缺失文件检出');
    // 4. fixture 校验 + 排他写入（临时目录内）
    const fEmpty = join(dir, 'empty.json');
    writeFileSync(fEmpty, '');
    let threw = false;
    try { loadAndValidateHitFixture(fEmpty); } catch { threw = true; }
    st(threw, 'loadAndValidateHitFixture 拒绝空文件');
    const fBad = join(dir, 'bad.json');
    writeFileSync(fBad, '{"scenes":');
    threw = false;
    try { loadAndValidateHitFixture(fBad); } catch { threw = true; }
    st(threw, 'loadAndValidateHitFixture 拒绝损坏 JSON');
    const fMut = join(dir, 'mut.json');
    writeFileSync(fMut, JSON.stringify(mutants[0][1]));
    threw = false;
    try { loadAndValidateHitFixture(fMut); } catch { threw = true; }
    st(threw, 'loadAndValidateHitFixture 拒绝结构畸形 fixture');
    const fOk = join(dir, 'ok.json');
    writeFileSync(fOk, JSON.stringify(minimal()));
    st(loadAndValidateHitFixture(fOk).heart.initial.bodyW === 15, 'loadAndValidateHitFixture 接受合法 fixture');
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
// 主流程
// ============================================================
mkdirSync(OUT, { recursive: true });
const CACHE_DIR = join(OUT, 'hitgeo-vite-cache'); // 快照之外

// ---- 0. 服务前快照全量 hash 校验（94 项；任何 mismatch → exit 3） ----
const before = hashCheckSnapshot(SNAP);
console.log(`快照 hash 校验（服务前）：${before.compared} 项，`
  + `${before.mismatched.length} 不一致、${before.missing.length} 缺失`);
if (before.mismatched.length || before.missing.length) {
  console.error('ENV-ERROR: v02-before 快照在服务启动前已不完整/被修改——拒绝继续');
  process.exit(3);
}

// ---- 1. fixture 状态检查（capture：已存在拒绝；compare：缺失/畸形 → exit 3） ----
if (CAPTURE && existsSync(FIXTURE)) {
  console.error(`ENV-ERROR: fixture 已存在，拒绝覆盖：${FIXTURE}`);
  process.exit(3);
}
if (!CAPTURE) {
  try {
    loadAndValidateHitFixture(FIXTURE);
  } catch (e) {
    console.error(`ENV-ERROR: ${e.message}`);
    process.exit(3);
  }
}

// ---- 2. 快照专用 Vite dev server（root=快照，cacheDir 在外） ----
let viteServer = null;
let BASE = `http://127.0.0.1:${PORT}/`;
let browser, context, page;
const consoleErrors = [];
let reloadedAfterBoot = false;
let initialNavDone = false;
let snapshot = null;
let villageDefH = null; // fix2 live 模式 heart depth 断言用（不入快照——避免 fixture 比对出现额外字段）
let writeRejected = null;

// 页内采集函数（自含；锚点由 mapDef 尺寸推导 → 确定性）
const captureHitGeoFn = () => {
  const R = (v) => Math.round(v * 1e6) / 1e6;
  const root = (k) => k.replace(/_(idle|run)$/, '');
  const s = window.__PYQUEST__.active();
  const def = s.mapDef;
  const W = def.w * 128, H = def.h * 128;
  const out = {};

  // ---- BOSS：钉到固定锚点后读 head/segments/crown 真实 getBounds ----
  const bx = W * 0.5, by = H * 0.75;
  const b = s.boss;
  if (b && b.active && !b.dead) {
    window.__PYQUEST__.pinBoss(s.scene.settings.key, bx, by);
    const bb = b.getBounds();
    out.boss = {
      cls: b.constructor.name, tex: root(b.texture.key),
      bounds: { x: R(bb.x), y: R(bb.y), w: R(bb.width), h: R(bb.height) },
      body: { w: b.body.width, h: b.body.height, ox: R(b.body.offset.x), oy: R(b.body.offset.y) },
      origin: [R(b.originX), R(b.originY)], scale: [R(b.scaleX), R(b.scaleY)],
      segs: (b.segs || []).map((g, i) => {
        g.setPosition(bx, by - (i + 1) * 160);
        const gb = g.getBounds();
        return { tex: root(g.texture.key),
          bounds: { x: R(gb.x), y: R(gb.y), w: R(gb.width), h: R(gb.height) },
          origin: [R(g.originX), R(g.originY)], scale: [R(g.scaleX), R(g.scaleY)] };
      }),
      crown: (() => {
        if (!b.crown) return null;
        b.crown.setPosition(bx, by - 300);
        const cb = b.crown.getBounds();
        return { bounds: { x: R(cb.x), y: R(cb.y), w: R(cb.width), h: R(cb.height) },
          dispW: R(b.crown.displayWidth), dispH: R(b.crown.displayHeight) };
      })(),
    };
  } else out.boss = null;

  // ---- 小怪：每 tex 根名取首例，钉到固定锚点读 bounds/body ----
  const alive = s.slimeGroup.children.entries.filter((e) => e && e.active && !e.isBoss && !e.dead);
  const byTex = new Map();
  for (const sl of alive) {
    const k = root(sl.texture.key);
    if (!byTex.has(k)) byTex.set(k, sl);
  }
  out.slimes = [...byTex.keys()].sort().map((k, i) => {
    const sl = byTex.get(k);
    const ax = W * 0.5 - 600 + i * 240, ay = H * 0.25;
    sl.setPosition(ax, ay); sl.body.reset(ax, ay); sl.setVelocity(0, 0);
    const gb = sl.getBounds();
    return { tex: k, pos: [R(sl.x), R(sl.y)],
      bounds: { x: R(gb.x), y: R(gb.y), w: R(gb.width), h: R(gb.height) },
      body: { w: sl.body.width, h: sl.body.height, ox: R(sl.body.offset.x), oy: R(sl.body.offset.y) },
      scale: R(sl.scaleX) };
  });

  // ---- 静态碰撞体世界坐标 + 树四变体规格 ----
  const solids = [], trees = {};
  let treeTotal = 0;
  for (const o of s.solids.children.entries) {
    if (!o || !o.texture) continue;
    const k = o.texture.key;
    const gb = o.getBounds();
    if (/^tree[1-4]$/.test(k)) {
      treeTotal++;
      if (!trees[k]) trees[k] = { dispW: R(o.displayWidth), dispH: R(o.displayHeight),
        bodyW: o.body.width, bodyH: o.body.height, ox: R(o.body.offset.x), oy: R(o.body.offset.y) };
    } else {
      solids.push({ key: k, pos: [R(o.x), R(o.y)],
        bounds: { x: R(gb.x), y: R(gb.y), w: R(gb.width), h: R(gb.height) },
        body: o.body ? { w: o.body.width, h: o.body.height, ox: R(o.body.offset.x), oy: R(o.body.offset.y) } : null });
    }
  }
  solids.sort((a, b2) => (a.key < b2.key ? -1 : a.key > b2.key ? 1 : a.pos[0] - b2.pos[0] || a.pos[1] - b2.pos[1]));
  out.solids = solids; out.trees = trees; out.treeTotal = treeTotal;

  // ---- 四方向攻击边界（真实 tryAttack + 真实 getBounds 的判定结果） ----
  const target = alive[0];
  out.attack = null;
  if (target) {
    const ax = W * 0.5, ay = H * 0.5;
    for (const sl of s.slimeGroup.children.entries) { // 其余敌人（含 BOSS）移远
      if (!sl || sl.dead || !sl.active || sl === target) continue;
      sl.setPosition(ax, ay + 4000);
      if (sl.body) sl.body.reset(ax, ay + 4000);
    }
    target.setPosition(ax, ay); target.body.reset(ax, ay); target.setVelocity(0, 0);
    if (target.hp < 2) target.hp = 2; // 钉状态：防探针期间死亡
    const hp0 = target.hp;
    const gb = target.getBounds();
    const ex = gb.x + gb.width / 2, ey = gb.y + gb.height / 2;
    const p = s.player;
    const px0 = p.x, py0 = p.y, f0 = p.facing;
    const attackOnce = (facing, px, py) => {
      p.attackCdUntil = 0; p.dying = false;
      p.facing = facing; p.setPosition(px, py);
      const hp = target.hp, ku = target.knockUntil;
      p.tryAttack();
      const hit = target.hp !== hp || target.knockUntil > ku;
      // 钉状态复原：evaluate 内 time.now 冻结，hurt 的 280ms 冷却会永久挡住
      // 后续探针（复现：修前 up/left/right 全 false）→ 探针间必须清零
      target.hp = hp0; target.knockUntil = 0; target.hurtCdUntil = 0;
      return hit;
    };
    const sweep = (facing) => {
      const horiz = facing === 'left' || facing === 'right';
      const sign = (facing === 'right' || facing === 'down') ? 1 : -1; // 从远处一侧逼近
      const E = horiz ? ex : ey;
      const testAt = (t) => (horiz ? attackOnce(facing, t, ey) : attackOnce(facing, ex, t));
      let noHitT = E + sign * 1500;
      if (testAt(noHitT)) return { facing, boundary: -1, insideHit: null, outsideHit: null,
        enemyBounds: { w: R(gb.width), h: R(gb.height) } };
      let hitT = null;
      for (let k = 1; k <= 30; k++) { // 粗扫 50px 步长
        const t = E + sign * (1500 - k * 50);
        if (testAt(t)) { hitT = t; break; }
        noHitT = t;
      }
      if (hitT === null) return { facing, boundary: -2, insideHit: null, outsideHit: null,
        enemyBounds: { w: R(gb.width), h: R(gb.height) } };
      while (Math.abs(hitT - noHitT) > 1) { // 二分细化到 1px
        const mid = (hitT + noHitT) / 2;
        if (testAt(mid)) hitT = mid; else noHitT = mid;
      }
      const inside = testAt(hitT - sign * 20);   // 边界内 20px → 必须命中
      const outside = testAt(hitT + sign * 20);  // 边界外 20px → 必须落空
      return { facing, boundary: R(Math.abs(hitT - E)), insideHit: inside, outsideHit: outside,
        enemyBounds: { w: R(gb.width), h: R(gb.height) } };
    };
    out.attack = ['down', 'up', 'left', 'right'].map(sweep);
    p.facing = f0; p.setPosition(px0, py0); p.body.reset(px0, py0); // 还原玩家
  }

  out.entityTypes = [...new Set([root(s.player.texture.key),
    ...alive.map((e) => root(e.texture.key)),
    ...(out.boss ? [out.boss.cls, out.boss.tex, ...out.boss.segs.map((g) => g.tex)] : [])])].sort();
  return out;
};

const spawnHeartFn = () => {
  const s = window.__PYQUEST__.active();
  const def = s.mapDef;
  const W = def.w * 128, H = def.h * 128;
  window.__PYQUEST__.teleport(W * 0.25, H * 0.25); // 玩家远离 heart 生成点
  s.spawnHeartDrop(W * 0.5, H * 0.5);
  return { spawnAt: [W * 0.5, H * 0.5] };
};

const readHeartFn = () => {
  const R = (v) => Math.round(v * 1e6) / 1e6;
  const s = window.__PYQUEST__.active();
  const hs = s.children.list.filter((o) => o && o.texture && o.texture.key === 'heart_full' && o.body);
  const h = hs[hs.length - 1];
  if (!h) return null;
  return { bodyW: h.body.width, bodyH: h.body.height, dispW: R(h.displayWidth), dispH: R(h.displayHeight),
    x: R(h.x), y: R(h.y), bodyX: R(h.body.position.x), bodyY: R(h.body.position.y), depth: h.depth };
};

try {
  if (!LIVE) {
    viteServer = await createServer({
      root: SNAP,
      configFile: false,
      base: './',
      publicDir: join(SNAP, 'assets'),
      cacheDir: CACHE_DIR,
      optimizeDeps: { include: ['phaser'] }, // 唯一裸依赖：启动即预打包，避免运行中优化触发页面重载
      server: { host: '127.0.0.1', port: PORT, strictPort: true, fs: { allow: [SNAP, ROOT] } },
      logLevel: 'error',
    });
    await viteServer.listen();
    const resolved = viteServer.resolvedUrls?.local?.[0];
    if (resolved) BASE = resolved;
    console.log(`快照 dev server：${BASE}（root=${SNAP}，cacheDir=${CACHE_DIR}）`);
  } else {
    BASE = LIVE_URL.endsWith('/') ? LIVE_URL : `${LIVE_URL}/`;
    console.log(`live 模式：直接比对 ${BASE}（不启动快照服务器；快照仍未触碰，`
      + `前后 94 项 hash 校验证明）`);
  }

  const probe = await fetch(BASE, { signal: AbortSignal.timeout(8000) });
  if (probe.status !== 200) throw new Error(`ENV: 快照服务器返回 HTTP ${probe.status}`);

  // ---- 3. 浏览器阶段 ----
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
  page.on('framenavigated', (frame) => {
    if (initialNavDone && frame === page.mainFrame()) reloadedAfterBoot = true;
  });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  initialNavDone = true;
  await page.waitForTimeout(1200);
  await page.click('#btn-start');
  await page.waitForFunction(() => {
    const pq = window.__PYQUEST__;
    return pq && pq.active() && pq.active().scene.settings.key === 'Village';
  }, null, { timeout: 15000, polling: 200 });
  await page.evaluate(() => window.__PYQUEST__.godmode());

  async function gotoScene(key) {
    const spawn = key === 'Village' ? 'start' : /L$/.test(key) ? 'fromField' : 'fromPrev';
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.evaluate(([k, sp]) => { window.__PYQUEST__.active().scene.start(k, { spawn: sp }); }, [key, spawn]);
      await page.waitForFunction((k) => {
        const s = window.__PYQUEST__.active();
        return s && s.scene.settings.key === k && s.player && s.mapDef;
      }, key, { timeout: 15000, polling: 150 });
      await page.evaluate(() => window.__PYQUEST__.godmode());
      await page.evaluate((k) => window.__PYQUEST__.pinBoss(k), key); // 冻结 AI（防推挤漂移）
      await page.waitForTimeout(800);
      if ((await page.evaluate(() => window.__PYQUEST__.active().scene.settings.key)) === key) return;
    }
    throw new Error(`ENV: 场景 ${key} 无法稳定落位`);
  }

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const scenes = {};
  let heart = null;
  for (const key of HIT_SCENES) {
    await gotoScene(key);
    await page.waitForTimeout(400);
    const geo = await ev(captureHitGeoFn);
    scenes[key] = geo;
    await page.screenshot({ path: `${OUT}/hitgeo-scene-${key}.png` });
    console.log(`[capture] ${key}: slimes=${geo.slimes.length} boss=${geo.boss ? geo.boss.cls : 'none'} `
      + `solids=${geo.solids.length} trees=${geo.treeTotal} boundary=[${geo.attack ? geo.attack.map((a) => a.boundary).join(',') : 'n/a'}]`);
    if (key === 'Village') {
      villageDefH = await ev(() => window.__PYQUEST__.active().mapDef.h);
      // heart：真实 spawnHeartDrop（15×13 静态体 → 放大显示 → tween 浮动）
      // headless rAF 节流 → 固定时刻采样 y 是相位不确定的（复现：read 恰落 yoyo
      // 回归点时漂移=0 假失败）→ 改为 poll 观测位移；afterFloat 剔除 y（相位不确定）
      const sp = await ev(spawnHeartFn);
      const initial = await ev(readHeartFn);
      const found = await page.waitForFunction((thr) => {
        const s = window.__PYQUEST__.active();
        const hs = s.children.list.filter((o) => o && o.texture && o.texture.key === 'heart_full' && o.body);
        const h = hs[hs.length - 1];
        return h ? h.y <= thr : false;
      }, initial.y - 5, { timeout: 5000, polling: 100 }).catch(() => null);
      const afterFloat = await ev(readHeartFn);
      const { y, ...afterFloatStable } = afterFloat; // y 依赖 tween 相位，不入 fixture
      heart = { spawnAt: sp.spawnAt, initial, floatingObserved: !!found, afterFloat: afterFloatStable };
      console.log(`[heart] initial=${JSON.stringify(initial)} floating=${heart.floatingObserved} `
        + `afterFloat=${JSON.stringify(afterFloatStable)}`);
    }
  }

  // 树四变体跨场景聚合（单场景变体分配随机）
  const treeVariants = {};
  for (const key of HIT_SCENES) {
    for (const [k, spec] of Object.entries(scenes[key].trees || {})) treeVariants[k] = spec;
  }

  snapshot = {
    purpose: 'v0.2 hit-geometry pre-change baseline from immutable v02-before snapshot: '
      + 'enemy/head/segment getBounds, static-body world coords, heart pickup physics after '
      + 'enlargement+tween, four-direction attack reach boundary via real tryAttack outcomes',
    capturedAt: new Date().toISOString(),
    serverPort: PORT,
    hitHashCheck: { before: { compared: before.compared, mismatched: 0, missing: 0 } },
    scenes, treeVariants, heart,
  };
  const snapErrs = validateHitSnapshot(snapshot);
  if (snapErrs.length) {
    console.error('ENV-ERROR: 命中几何快照校验失败，不创建 fixture：');
    snapErrs.slice(0, 30).forEach((e) => console.error(`  · ${e}`));
    envFatal = `快照校验失败（${snapErrs.length} 项）`;
  }
} catch (e) {
  envFatal = e.message || String(e);
} finally {
  try { await context?.close(); } catch { /* ignore */ }
  try { await browser?.close(); } catch { /* ignore */ }
  try { await viteServer?.close(); } catch { /* ignore */ }
}

// ---- 4. 服务后快照全量 hash 校验（任何写入都会暴露） ----
let after = null;
if (!envFatal) {
  after = hashCheckSnapshot(SNAP);
  console.log(`快照 hash 校验（服务后）：${after.compared} 项，`
    + `${after.mismatched.length} 不一致、${after.missing.length} 缺失`);
  if (after.mismatched.length || after.missing.length) {
    envFatal = '快照在服务运行期间被写入/修改（fail-closed）';
    after.mismatched.slice(0, 10).forEach((m) => console.error(`  · ${m}`));
  } else if (snapshot) {
    snapshot.hitHashCheck.after = { compared: after.compared, mismatched: 0, missing: 0 };
  }
}

const envProblems = [];
if (consoleErrors.length) envProblems.push(`页面错误 ${consoleErrors.length} 条：\n    ${consoleErrors.slice(0, 6).join('\n    ')}`);
if (reloadedAfterBoot) envProblems.push('运行期间发生主框架页面导航/重载');
if (envFatal) envProblems.push(envFatal);
if (envProblems.length) {
  console.log('ENV-ERROR（fail-closed，非契约 RED）：');
  for (const n of envProblems) console.log(`  · ${n}`);
  console.log(CAPTURE ? 'capture 模式：fixture 未创建（环境失败禁止初始化）' : '');
  console.log('exit 3');
  process.exit(3);
}

// ---- 5. 真实行为断言（capture 与 compare 都跑：数值来自本次实测） ----
if (snapshot) {
  console.log('--- H1. 四方向攻击边界（真实 tryAttack 命中/落空判定）---');
  for (const key of HIT_SCENES) {
    for (const a of snapshot.scenes[key].attack) {
      check(a.boundary > 0, `${key}/${a.facing}: 攻击边界距离 = ${a.boundary}（粗扫+二分实测）`);
      check(a.insideHit === true && a.outsideHit === false,
        `${key}/${a.facing}: 边界内 20px 真实命中、边界外 20px 真实落空`,
        `inside=${a.insideHit} outside=${a.outsideHit}`);
    }
  }
  console.log('--- H2. 敌人/BOSS 头部/体节/王冠 getBounds（钉位实测）---');
  for (const key of HIT_SCENES) {
    const sc = snapshot.scenes[key];
    for (const sl of sc.slimes) {
      check(sl.bounds.w > 0 && sl.bounds.h > 0 && sl.body.w > 0,
        `${key}: 敌人 ${sl.tex} getBounds ${sl.bounds.w}×${sl.bounds.h}（body ${sl.body.w}×${sl.body.h}）`);
    }
    if (sc.boss) {
      check(sc.boss.bounds.w > 0 && sc.boss.body.w > 0,
        `${key}: BOSS ${sc.boss.cls} head getBounds ${sc.boss.bounds.w}×${sc.boss.bounds.h}`);
      for (const [i, g] of (sc.boss.segs || []).entries()) {
        check(g.bounds.w > 0 && g.bounds.h > 0, `${key}: 体节[${i}] ${g.tex} getBounds ${g.bounds.w}×${g.bounds.h}`);
      }
      if (sc.boss.crown) {
        check(sc.boss.crown.bounds.w > 0, `${key}: 王徽 getBounds ${sc.boss.crown.bounds.w}×${sc.boss.crown.bounds.h}`);
      }
    }
  }
  console.log('--- H3. 静态碰撞体世界坐标（crystal/castle/gate_closed）---');
  for (const key of HIT_SCENES) {
    for (const so of snapshot.scenes[key].solids) {
      check(so.bounds.w > 0 && so.bounds.h > 0, `${key}: 静态体 ${so.key} 世界坐标 (${so.bounds.x},${so.bounds.y}) ${so.bounds.w}×${so.bounds.h}`);
    }
  }
  console.log('--- H4. heart 拾取体：显示放大 116×100 且 tween 浮动后 body 恒 15×13 ---');
  const h = snapshot.heart;
  check(h.initial.bodyW === HEART_BODY_W && h.initial.bodyH === HEART_BODY_H
    && h.initial.dispW === HEART_DISP_W && h.initial.dispH === HEART_DISP_H,
    `heart 放大后（t≈0）：body ${h.initial.bodyW}×${h.initial.bodyH}、display ${h.initial.dispW}×${h.initial.dispH}`);
  check(h.afterFloat.bodyW === HEART_BODY_W && h.afterFloat.bodyH === HEART_BODY_H
    && h.afterFloat.dispW === HEART_DISP_W && h.afterFloat.dispH === HEART_DISP_H,
    `heart 浮动后：body ${h.afterFloat.bodyW}×${h.afterFloat.bodyH} 不变（显示 ${h.afterFloat.dispW}×${h.afterFloat.dispH}）`);
  check(h.initial.bodyX === h.afterFloat.bodyX && h.initial.bodyY === h.afterFloat.bodyY,
    'heart 静态拾取体位置不随浮动漂移',
    `(${h.afterFloat.bodyX},${h.afterFloat.bodyY})`);
  check(h.floatingObserved === true, 'heart tween 浮动真实位移（poll 观测 ≥5px）');
  if (LIVE && h && villageDefH) {
    // fix2 live 断言：heart 显示 depth 按 §9 应为 FX_BASE+1500（compare 对该
    // 两处显示 depth 有意 IGNORE，由此断言单独验证真实值，绝不静默放过）
    const base = Math.ceil((villageDefH * 128 + 1024) / 1024) * 1024;
    check(h.initial.depth === base + 1500,
      `live: heart 显示 depth = FX_BASE+1500 (${base + 1500})`,
      `实际 ${h.initial.depth}（→ RED）`);
    check(h.afterFloat.depth === base + 1500,
      `live: heart 浮动后显示 depth = FX_BASE+1500 (${base + 1500})`,
      `实际 ${h.afterFloat.depth}（→ RED）`);
  }
  console.log('--- H5. 实体类型全覆盖 + 树四变体 ---');
  for (const key of HIT_SCENES) {
    check(snapshot.scenes[key].entityTypes.includes('warrior'),
      `${key}: entityTypes ${snapshot.scenes[key].entityTypes.join(',')}`);
  }
  check(TREE_VARIANTS.every((k) => snapshot.treeVariants[k]),
    `树四变体规格齐全（${Object.keys(snapshot.treeVariants).join(',')}）`);
}

// ---- 6. capture：全部校验通过后排他写入 fixture ----
if (CAPTURE && snapshot) {
  try {
    writeFileSync(FIXTURE, JSON.stringify(snapshot, null, 1) + '\n', { flag: 'wx' });
    const sha = createHash('sha256').update(readFileSync(FIXTURE)).digest('hex');
    console.log(`fixture 已初始化（排他创建）：${FIXTURE}`);
    console.log(`fixture SHA256: ${sha}`);
  } catch (e) {
    writeRejected = e.code || e.message;
  }
}

// ---- 7. compare：与冻结 fixture 逐字段比对（钉位确定性 → 预期全一致） ----
if (!CAPTURE && snapshot) {
  const frozen = loadAndValidateHitFixture(FIXTURE);
  let leaves = 0, drift = 0;
  const drifts = [];
  const IGNORE = [/^\.capturedAt$/, /^\.serverPort$/, /^\.hitHashCheck\.after\./];
  if (LIVE) {
    // fix2 live：仅忽略 heart 两处显示 depth（§9 有意改 FX_BASE+1500，live 断言
    // 单独验证）；body/bounds/attacks 与其余全部字段照常逐字段比对
    IGNORE.push(/^\.heart\.initial\.depth$/, /^\.heart\.afterFloat\.depth$/);
  }
  (function walk(a, b, path) {
    if (IGNORE.some((re) => re.test(path))) return;
    if (typeof a === 'number' && typeof b === 'number') {
      leaves++;
      if (Math.abs(a - b) > 1e-6) { drift++; drifts.push(`  ✗ 漂移 ${path}: fixture=${a} 实测=${b}`); }
      return;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      leaves++;
      if (a !== b) { drift++; drifts.push(`  ✗ 漂移 ${path}: fixture=${JSON.stringify(a)} 实测=${JSON.stringify(b)}`); }
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) walk(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`);
  })(frozen, snapshot, '');
  const ok = drift === 0;
  console.log(`--- H6. 命中几何与冻结 fixture 逐字段一致（${leaves} 字段，容差 1e-6）---`);
  check(ok, '命中几何基线与 fixture 一致（钉位确定性）', ok ? `共 ${leaves} 字段全部一致` : `${drift} 处漂移`);
  drifts.slice(0, 30).forEach((d) => { console.log(d); failures.push(d); });
}

if (writeRejected) {
  console.log(`ENV-ERROR: fixture 排他创建失败（${writeRejected}）`);
  console.log('exit 3');
  process.exit(3);
}
console.log(`断言：${passes.length} 通过，${failures.length} 失败`);
for (const f of failures) console.log(f);
if (failures.length === 0) {
  console.log(CAPTURE ? 'PASS: 命中几何改前值已冻结（capture 完成）' : 'PASS: 命中几何基线 GREEN（快照不变量成立）');
  process.exit(0);
}
console.log('FAIL: 命中几何断言未满足');
process.exit(1);
