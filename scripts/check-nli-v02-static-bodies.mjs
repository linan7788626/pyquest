// ============================================================
// Task 0（v0.2 全面替换）· fix2 H3 补真：静态碰撞体 body.position
// 改前基线（scripts/fixtures/nli-v02-static-bodies-before.json）
//
// fix1 的 H3「静态体世界坐标」只冻结了 sprite getBounds，没有
// body.position/width/height/enable——静态物理体的真实世界坐标从未
// 被测过。本脚本从「immutable v02-before 快照」独立起 Vite dev
// server（live src 由 designer 并行改写，绝不能当 before 证据），
// 把每个静态体的 sprite 几何与 body 几何分列冻结：
//   · castle(house)/gate_closed/crystal 全部实例
//   · tree1..4 四变体（RND 播种 → same-prop/same-variant 确定性）
//
// 用法：
//   node scripts/check-nli-v02-static-bodies.mjs --self-test
//   node scripts/check-nli-v02-static-bodies.mjs --capture-baseline [--output <dir>] [--port 5200]
//   node scripts/check-nli-v02-static-bodies.mjs [--output <dir>] [--port 5200]
//   node scripts/check-nli-v02-static-bodies.mjs --url http://127.0.0.1:5186 [--output <dir>]
//
// fix3-A（review A）：--url live 模式（对齐 hit-geometry 入口模式）——
//   · 直接比对指定 live dev server（如 designer 冻结后的 src），不启动快照
//     Vite、不绑定 5200；确定性播种机制（测试期 LCG/loop.sleep）为测试侧
//     逻辑，对 live 同样适用；
//   · 数值仍逐字段对冻结 fixture d8a7ed19…255 比对，无 live 专属 ignore；
//   · 显式 URL 缺值/畸形一律 fail-closed（exit 3），绝不静默回落快照模式；
//   · --url 与 --capture-baseline 互斥：在任何浏览器/服务器/输出/fixture
//     写入之前 exit 3（live src 禁止作为 before 证据）；
//   · 94 项快照 hash 前后校验在 live 模式仍执行（parent 明确保留该保护；
//     快照只读未触碰，前后一致即为证明）。
//
// 快照服务器安全规则（与 hit-geometry 同款 lane 约定）：
//   · root = .slim/deepwork/nli-systematic-2026-10-27/v02-before（只读）
//   · configFile:false、publicDir=<root>/assets、base './'
//   · cacheDir 在快照之外（本脚本自身 evidence 目录）
//   · 独立回环端口（默认 5200）、host 127.0.0.1、strictPort
//   · 服务前后各做一次 94 项快照全量 hash 校验 → 任何写入即 exit 3
//
// 确定性（不写数值答案）：
//   · 树变体选择走真实 Phaser.Math.Between（全局 RND）→ 播种
//     Phaser.Math.RND.sow([seed]) 后 scene.start 重启：sow 与 create
//     之间旧场景已 shutdown（其 ambient 计时器一并销毁，无 RND 消费）
//     → 变体序列由 seed 决定；每个场景用相同 seed 重启两次，两次
//     捕获必须逐字段一致（determinismObserved）
//   · 保留产品真实 quirky body 位置/尺寸/offset（含 castle body
//     160×180 等），全部实测，绝不写期望值
//
// 负向证据（--self-test）：body-position-only 变异（sprite bounds
// 不动）必须被 compare 检出——证明本基线真的覆盖 body.position。
//
// 退出码：0 全过 / 1 断言失败 / 3 环境 fail-closed（快照被写、
// fixture 缺失/已存在/畸形、页面错误、重载、服务不可达；环境
// 失败绝不创建 fixture）
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
const FIXTURE = resolve(ROOT, 'scripts/fixtures/nli-v02-static-bodies-before.json');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const SELF_TEST = argv.includes('--self-test');
const CAPTURE = argv.includes('--capture-baseline');
const PORT = Number(argOf('--port') || 5200);
const OUT = resolve(ROOT, argOf('--output')
  || '.superpowers/sdd/2026-10-28-nli-v02-full-replacement/task-0-browser-evidence');

// ---------- 独立字面期望（结构不变量，非数值答案来源） ----------
const STATIC_SCENES = ['Village', 'Cave', 'SciLair'];
const SCENE_SPAWN = { Village: 'start', Cave: 'fromPrev', SciLair: 'fromField' };
const TREE_SCENES = ['Village'];                      // 只有户外场有树
const TREE_SEEDS = [1, 2, 3, 5, 7, 11, 13, 17];       // RND 播种序列（确定性变体覆盖）
const TREE_VARIANTS = ['tree1', 'tree2', 'tree3', 'tree4'];

/** fix3-A（review A）：--url live 参数解析（纯函数；主流程与 --self-test 共用
 * 同一真实解析路径）。显式 URL 缺值/畸形/非 http(s) 一律 fail-closed 返回
 * error（主流程 exit 3），绝不静默回落快照模式。 */
function resolveLiveArg(rawArgv) {
  const idx = rawArgv.indexOf('--url');
  if (idx < 0) return { live: false, url: null, error: null };
  const val = rawArgv[idx + 1];
  if (!val || val.startsWith('--')) {
    return { live: false, url: null, error: '--url 缺少 URL 参数值' };
  }
  let u;
  try { u = new URL(val); } catch { return { live: false, url: null, error: `--url 畸形：${val}` }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { live: false, url: null, error: `--url 仅支持 http/https：${val}` };
  }
  return { live: true, url: val.endsWith('/') ? val : `${val}/`, error: null };
}

// ============================================================
// 纯函数（供 --self-test 独立负向测试）
// ============================================================

/** 值域扫描：undefined/function/symbol/bigint/非有限/稀疏数组 */
function scanValueTree(v, path, errs) {
  if (v === undefined) { errs.push(`undefined at ${path}`); return; }
  const t = typeof v;
  if (t === 'function' || t === 'symbol' || t === 'bigint') { errs.push(`${t} at ${path}`); return; }
  if (t === 'number' && !Number.isFinite(v)) { errs.push(`非有限数 at ${path}`); return; }
  if (v === null || t !== 'object') return;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (!(i in v)) { errs.push(`稀疏数组 at ${path}[${i}]`); return; }
    }
    v.forEach((x, i) => scanValueTree(x, `${path}[${i}]`, errs));
  } else {
    for (const [k, x] of Object.entries(v)) scanValueTree(x, `${path}.${k}`, errs);
  }
}

/** 静态体快照结构校验（含 presence 不变量；数值全部留给实测断言） */
function validateStaticSnapshot(snap) {
  const errs = [];
  if (!snap || typeof snap !== 'object') return ['快照不是对象'];
  scanValueTree(snap, '', errs);
  if (!snap.scenes || typeof snap.scenes !== 'object') { errs.push('scenes 缺失'); return errs; }
  for (const key of STATIC_SCENES) {
    const sc = snap.scenes[key];
    if (!sc) { errs.push(`scenes.${key} 缺失`); continue; }
    if (!Array.isArray(sc.solids) || sc.solids.length === 0) errs.push(`${key}: solids 空`);
    sc.solids?.forEach((so, i) => {
      if (!(so.sprite?.bounds?.w > 0) || !(so.sprite?.bounds?.h > 0)) {
        errs.push(`${key}: solids[${i}].sprite.bounds 空`);
      }
      if (!(so.body?.x >= 0) || !(so.body?.y >= 0)) errs.push(`${key}: solids[${i}].body.position 空`);
      if (!(so.body?.w > 0) || !(so.body?.h > 0)) errs.push(`${key}: solids[${i}].body 尺寸空`);
      if (so.body?.enable !== true) errs.push(`${key}: solids[${i}].body.enable≠true`);
    });
    if (sc.determinismObserved !== true) errs.push(`${key}: 同 seed 两次捕获不一致`);
  }
  const solidKeys = (key) => new Set((snap.scenes[key]?.solids || []).map((so) => so.key));
  if (!solidKeys('Village').has('castle')) errs.push('Village: 静态体缺 castle');
  if (!solidKeys('Village').has('gate_closed')) errs.push('Village: 静态体缺 gate_closed');
  if (!solidKeys('Cave').has('crystal')) errs.push('Cave: 静态体缺 crystal');
  if (!solidKeys('SciLair').has('crystal')) errs.push('SciLair: 静态体缺 crystal');
  const treeKeys = Object.keys(snap.treeVariants || {});
  if (treeKeys.length !== 4 || !TREE_VARIANTS.every((k) => treeKeys.includes(k))) {
    errs.push(`树四变体不全：${treeKeys.join(',')}`);
  }
  TREE_VARIANTS.forEach((k) => {
    const t = snap.treeVariants?.[k];
    if (t && (!(t.dispW > 0) || !(t.bodyW > 0))) errs.push(`树 ${k} 规格空`);
  });
  if (!errs.length) {
    const s1 = JSON.stringify(snap);
    if (s1 !== JSON.stringify(JSON.parse(s1))) errs.push('JSON 往返有损');
  }
  return errs;
}

/** 逐字段比对（纯函数：主流程与 --self-test 负向共用同一实现） */
function diffSnapshots(frozen, fresh, ignoreRes) {
  let leaves = 0, drift = 0;
  const drifts = [];
  (function walk(a, b, path) {
    if (ignoreRes.some((re) => re.test(path))) return;
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
  })(frozen, fresh, '');
  return { leaves, drift, drifts };
}

/** 既有 fixture 读取 + 校验（空/损坏/畸形一律拒绝） */
function loadAndValidateStaticFixture(path) {
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
  const errs = validateStaticSnapshot(snap);
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
const passes = [], failures = [];
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
  const mkSolid = (key) => ({
    key,
    sprite: { x: 100, y: 200, dispW: 256, dispH: 256,
      bounds: { x: -28, y: -31.5, w: 256, h: 256 } },
    body: { x: 72, y: 184, w: 104, h: 60, ox: 76, oy: 184, enable: true },
  });
  const mkScene = (key, extra = []) => ({
    key, defW: 34, defH: 26,
    solids: [mkSolid('castle'), mkSolid('gate_closed'), ...extra],
    trees: { tree1: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 } },
    treeTotal: 1, determinismObserved: true,
  });
  const minimal = () => ({
    purpose: 'selftest', capturedAt: 't', serverPort: 1,
    staticHashCheck: { before: { compared: 94, mismatched: 0, missing: 0 }, after: { compared: 94, mismatched: 0, missing: 0 } },
    scenes: {
      Village: mkScene('Village'),
      Cave: mkScene('Cave', [mkSolid('crystal')]),
      SciLair: mkScene('SciLair', [mkSolid('crystal')]),
    },
    treeVariants: { tree1: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree2: { dispW: 256, dispH: 256, bodyW: 104, bodyH: 60, ox: 76, oy: 184 },
      tree3: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 },
      tree4: { dispW: 256, dispH: 192, bodyW: 104, bodyH: 60, ox: 76, oy: 120 } },
  });
  const IGN = [/^\.capturedAt$/, /^\.serverPort$/, /^\.staticHashCheck\.after\./];
  // 1. 合法最小快照通过
  st(validateStaticSnapshot(minimal()).length === 0, 'validateStaticSnapshot：合法最小快照通过');
  // 2. 结构/presence 缺陷必须拒绝
  const mutants = [];
  const m1 = deepClone(minimal()); delete m1.scenes.Cave;
  mutants.push(['缺 Cave 场景', m1]);
  const m2 = deepClone(minimal()); m2.scenes.Village.solids = m2.scenes.Village.solids
    .filter((so) => so.key !== 'castle');
  mutants.push(['Village 缺 castle（隐身载体缺失）', m2]);
  const m3 = deepClone(minimal()); m3.scenes.Village.solids = m3.scenes.Village.solids
    .filter((so) => so.key !== 'gate_closed');
  mutants.push(['Village 缺 gate_closed', m3]);
  const m4 = deepClone(minimal()); m4.scenes.Cave.solids = m4.scenes.Cave.solids
    .filter((so) => so.key !== 'crystal');
  mutants.push(['Cave 缺 crystal', m4]);
  const m5 = deepClone(minimal()); delete m5.treeVariants.tree4;
  mutants.push(['树变体 3 个', m5]);
  const m6 = deepClone(minimal()); m6.scenes.SciLair.determinismObserved = false;
  mutants.push(['同 seed 两次捕获不一致', m6]);
  const m7 = deepClone(minimal()); m7.scenes.Village.solids[0].body.enable = false;
  mutants.push(['body.enable=false（静态体被禁用）', m7]);
  const m8 = deepClone(minimal()); m8.scenes.Village.solids[0].body.w = 0;
  mutants.push(['body 宽 0', m8]);
  const m9 = deepClone(minimal()); m9.scenes.Village.solids[0].sprite.bounds = undefined;
  mutants.push(['sprite.bounds undefined', m9]);
  const m10 = deepClone(minimal()); m10.scenes.Cave.solids[2].body.x = Infinity;
  mutants.push(['非有限数 Infinity', m10]);
  const m11 = deepClone(minimal()); m11.scenes.Cave.solids[2].body.oy = undefined;
  mutants.push(['undefined 值', m11]);
  const m12 = deepClone(minimal()); m12.scenes.SciLair.trees = () => ({});
  mutants.push(['function 值', m12]);
  for (const [label, mut] of mutants) {
    st(validateStaticSnapshot(mut).length > 0, `validateStaticSnapshot 拒绝：${label}`);
  }
  // 3. compare 纯函数：负向变异检出（核心负向证据）
  // 3a. body-position-only 变异：sprite 全部字段（含 bounds）不动，只动 body.position
  const posMut = deepClone(minimal());
  posMut.scenes.Village.solids[1].body.x += 7;
  posMut.scenes.Village.solids[1].body.y -= 3;
  const d1 = diffSnapshots(minimal(), posMut, IGN);
  st(d1.drift >= 2, `diffSnapshots：body-position-only 变异被检出（${d1.drift} 处）`);
  st(d1.drifts.every((d) => /solids\[1\]\.body\.[xy]/.test(d.replace('✗ 漂移 ', ''))),
    'diffSnapshots：变异定位在 body.position，sprite bounds 零漂移');
  // 3b. 合规新增（多一个 crystal）不引发 body 字段误报，但 presence 漂移仍要比对
  const addMut = deepClone(minimal());
  addMut.scenes.Cave.solids.push(deepClone(addMut.scenes.Cave.solids[2]));
  const d2 = diffSnapshots(minimal(), addMut, IGN);
  st(d2.drift > 0, 'diffSnapshots：新增静态体（presence）被检出');
  // 3c. 完全一致 → 0 漂移
  const d3 = diffSnapshots(minimal(), deepClone(minimal()), IGN);
  st(d3.drift === 0 && d3.leaves > 0, `diffSnapshots：相同快照 0 漂移（${d3.leaves} 字段）`);
  // 3d. body.enable 变异检出
  const enMut = deepClone(minimal());
  enMut.scenes.Cave.solids[2].body.enable = false;
  st(diffSnapshots(minimal(), enMut, IGN).drift === 1, 'diffSnapshots：body.enable 变异检出');
  // fix3-A（review A）：--url live 参数解析（真实 CLI 解析路径；先 RED 后实现）。
  // 契约：显式 URL 缺值/畸形一律 fail-closed，绝不静默回落快照模式。
  const hasResolve = typeof resolveLiveArg === 'function';
  st(hasResolve, 'fix3：resolveLiveArg（--url 解析纯函数）存在');
  if (hasResolve) {
    const r1 = resolveLiveArg(['--url', 'http://127.0.0.1:5186']);
    st(r1.live === true && r1.url === 'http://127.0.0.1:5186/' && r1.error === null,
      'resolveLiveArg：合法 http URL 接受（live 模式）');
    st(resolveLiveArg(['--url', 'not-a-url']).error !== null
      && resolveLiveArg(['--url', 'not-a-url']).live === false,
      'resolveLiveArg：畸形 URL 拒绝（fail-closed，不回落快照模式）');
    st(resolveLiveArg(['--url']).error !== null && resolveLiveArg(['--url']).live === false,
      'resolveLiveArg：--url 缺值拒绝');
    st(resolveLiveArg([]).live === false && resolveLiveArg([]).error === null,
      'resolveLiveArg：无 --url → 快照 compare 模式（不误伤既有入口）');
    st(resolveLiveArg(['--url', 'ftp://127.0.0.1/x']).error !== null,
      'resolveLiveArg：非 http/https 协议拒绝');
  }
  // fix3-A：真实冻结 fixture 的 body-position-only 变异（内存副本；只读绝不写回）
  let frozenReal = null;
  try { if (existsSync(FIXTURE)) frozenReal = loadAndValidateStaticFixture(FIXTURE); } catch { frozenReal = null; }
  if (frozenReal) {
    const mutReal = deepClone(frozenReal);
    const so = mutReal.scenes.Village.solids.find((s) => s.key === 'gate_closed')
      || mutReal.scenes.Village.solids[1];
    so.body.x += 7;
    so.body.y -= 3;
    const dReal = diffSnapshots(frozenReal, mutReal, IGN);
    st(dReal.drift >= 2 && dReal.drifts.every((x) => /\.body\.[xy]: fixture=/.test(x)),
      `真实冻结 fixture 内存 body-position-only 变异被检出（${dReal.drift} 处，sprite 零漂移）`);
  }
  // 4. 快照 hash 校验（临时目录内伪造 mini 快照树）
  const dir = mkdtempSync(join(TMP_ROOT, 'static-bodies-selftest-'));
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
    // 5. fixture 校验 + 排他写入（临时目录内）
    const fEmpty = join(dir, 'empty.json');
    writeFileSync(fEmpty, '');
    let threw = false;
    try { loadAndValidateStaticFixture(fEmpty); } catch { threw = true; }
    st(threw, 'loadAndValidateStaticFixture 拒绝空文件');
    const fBad = join(dir, 'bad.json');
    writeFileSync(fBad, '{"scenes":');
    threw = false;
    try { loadAndValidateStaticFixture(fBad); } catch { threw = true; }
    st(threw, 'loadAndValidateStaticFixture 拒绝损坏 JSON');
    const fMut = join(dir, 'mut.json');
    writeFileSync(fMut, JSON.stringify(mutants[0][1]));
    threw = false;
    try { loadAndValidateStaticFixture(fMut); } catch { threw = true; }
    st(threw, 'loadAndValidateStaticFixture 拒绝结构畸形 fixture');
    const fOk = join(dir, 'ok.json');
    writeFileSync(fOk, JSON.stringify(minimal()));
    st(loadAndValidateStaticFixture(fOk).scenes.Village.solids[0].body.x === 72,
      'loadAndValidateStaticFixture 接受合法 fixture');
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

// ---- fix3-A：--url live 参数校验（在任何输出/服务器/浏览器/fixture 写入之前） ----
const LIVE_INFO = resolveLiveArg(argv);
const LIVE = LIVE_INFO.live;
if (LIVE_INFO.error) {
  console.error(`ENV-ERROR: ${LIVE_INFO.error}——显式 URL 缺失/畸形一律 fail-closed，绝不静默回落快照模式`);
  process.exit(3);
}
if (LIVE && CAPTURE) {
  console.error('ENV-ERROR: --url（live）与 --capture-baseline 互斥——live src 由并行 lane 随时改写，'
    + '禁止作为 before 证据（已在任何浏览器/服务器/输出/fixture 写入之前拒绝）');
  process.exit(3);
}

// ============================================================
// 主流程
// ============================================================
mkdirSync(OUT, { recursive: true });
const CACHE_DIR = join(OUT, 'static-bodies-vite-cache'); // 快照之外

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
    loadAndValidateStaticFixture(FIXTURE);
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
let writeRejected = null;

// 页内采集函数（自含）：sprite 几何与 body 几何分列，全部实测
const captureStaticFn = () => {
  const R = (v) => Math.round(v * 1e6) / 1e6;
  const s = window.__PYQUEST__.active();
  const def = s.mapDef;
  const solids = [];
  const trees = {};
  let treeTotal = 0;
  for (const o of s.solids.children.entries) {
    if (!o || !o.texture || !o.body) continue;
    const k = o.texture.key;
    const gb = o.getBounds();
    const rec = {
      key: k,
      sprite: { x: R(o.x), y: R(o.y), dispW: R(o.displayWidth), dispH: R(o.displayHeight),
        bounds: { x: R(gb.x), y: R(gb.y), w: R(gb.width), h: R(gb.height) } },
      body: { x: R(o.body.position.x), y: R(o.body.position.y),
        w: o.body.width, h: o.body.height,
        ox: R(o.body.offset.x), oy: R(o.body.offset.y), enable: o.body.enable === true },
    };
    solids.push(rec);
    if (/^tree[1-4]$/.test(k)) {
      treeTotal++;
      if (!trees[k]) trees[k] = { dispW: rec.sprite.dispW, dispH: rec.sprite.dispH,
        bodyW: rec.body.w, bodyH: rec.body.h, ox: rec.body.ox, oy: rec.body.oy };
    }
  }
  solids.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1
    : a.sprite.x - b.sprite.x || a.sprite.y - b.sprite.y));
  return { key: s.scene.settings.key, defW: def.w, defH: def.h,
    solids, trees, treeTotal, determinismObserved: null };
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
    // fix3-A：live 模式——不启动快照 Vite、不绑定 ${PORT}；数值仍对冻结 fixture
    // d8a7ed19…255 逐字段比对，无 live 专属 ignore。快照 hash 前后校验仍执行。
    BASE = LIVE_INFO.url;
    console.log(`live 模式：直接比对 ${BASE}（不启动快照 Vite、不绑定 ${PORT}；`
      + `94 项快照 hash 前后校验仍执行——快照只读未触碰）`);
  }

  const probe = await fetch(BASE, { signal: AbortSignal.timeout(8000) });
  if (probe.status !== 200) {
    throw new Error(`ENV: ${LIVE ? `live URL ${BASE}` : '快照服务器'}返回 HTTP ${probe.status}`);
  }

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

  const ev = (fn, arg) => page.evaluate(fn, arg);

  /** 播种重启（确定性，实测驱动的两处修正）：
   *  (1) Phaser.Math.Between 基于 Math.random 而非 Phaser.Math.RND（RND
   *      原型探针实测重启窗口内调用数为 0）→ 测试期把 Math.random 覆盖为
   *      确定性 LCG（场景就绪后立即恢复原函数，绝不改产品 RNG/源码）；
   *  (2) sow 与 create 之间旧场景 update（slime wander 等）仍会消费随机数
   *      → 重启窗口内 game.loop.sleep() 冻结 rAF 循环，create 从精确播种
   *      状态消费。调试证据：fix2-sbdbg-determinism.mjs（seed=1 两次分布
   *      全等、seed=2 不同） */
  async function restartSeeded(key, seed) {
    await ev(([k, sd, sp]) => {
      const s = window.__PYQUEST__.active();
      window.__v02game = s.game;
      s.game.loop.sleep(); // 冻结循环：sow 与 create 之间零随机消费
      window.__v02origRandom = Math.random;
      let st = (sd * 1103515245 + 12345) >>> 0;
      Math.random = () => { // 测试期 LCG（Phaser.Math.Between 的真实随机源）
        st = (st * 1103515245 + 12345) >>> 0;
        return (st >>> 8) / 0x1000000;
      };
      Phaser.Math.RND.sow([sd]); // 真用 RND 的路径（GetRandom 等）同样播种
      s.scene.start(k, { spawn: sp });
    }, [key, seed, SCENE_SPAWN[key]]);
    await page.waitForTimeout(250); // 睡眠窗：确保 create 尚未发生
    await ev(() => window.__v02game.loop.wake());
    await page.waitForFunction((k) => {
      const s = window.__PYQUEST__.active();
      return s && s.scene.settings.key === k && s.player && s.mapDef && s.solids;
    }, key, { timeout: 15000, polling: 150 });
    await ev(() => { Math.random = window.__v02origRandom; }); // 恢复产品 RNG
    await ev(() => window.__PYQUEST__.godmode());
    await ev((k) => window.__PYQUEST__.pinBoss(k), key); // 冻结 AI（防推挤；静态体不受影响）
    await page.waitForTimeout(600);
    if ((await ev(() => window.__PYQUEST__.active().scene.settings.key)) !== key) {
      throw new Error(`ENV: 场景 ${key}（seed=${seed}）未稳定落位`);
    }
    return ev(captureStaticFn);
  }

  const scenes = {};
  const treeVariants = {};
  for (const key of STATIC_SCENES) {
    const seeds = TREE_SCENES.includes(key) ? TREE_SEEDS : [TREE_SEEDS[0]];
    const runs = {};
    for (const seed of seeds) runs[seed] = await restartSeeded(key, seed);
    // 确定性：canonical seed 重启一次，两次捕获必须逐字段一致
    const canonical = seeds[0];
    const again = await restartSeeded(key, canonical);
    const a = JSON.stringify(runs[canonical]);
    const b = JSON.stringify(again);
    const determinismObserved = a === b;
    console.log(`[capture] ${key}: solids=${runs[canonical].solids.length} `
      + `trees=${runs[canonical].treeTotal} seeds=${seeds.length} `
      + `determinism=${determinismObserved ? '一致' : '漂移!'}`);
    scenes[key] = { ...runs[canonical], determinismObserved };
    for (const sd of seeds) {
      for (const [k, spec] of Object.entries(runs[sd].trees || {})) {
        treeVariants[k] = treeVariants[k] || spec;
      }
    }
    await page.screenshot({ path: `${OUT}/static-bodies-scene-${key}.png` });
  }

  snapshot = {
    purpose: 'v0.2 static-body pre-change baseline from immutable v02-before snapshot: '
      + 'per-instance sprite geometry AND physics body.position/size/offset/enable for '
      + 'castle/gate_closed/crystal and all four tree variants, deterministically '
      + 'reproduced via Phaser.Math.RND seeding before scene restart',
    capturedAt: new Date().toISOString(),
    serverPort: LIVE ? null : PORT, // 信息性（compare IGNORE）；live 模式未绑定任何端口
    staticHashCheck: { before: { compared: before.compared, mismatched: 0, missing: 0 } },
    scenes, treeVariants,
  };
  const snapErrs = validateStaticSnapshot(snapshot);
  if (snapErrs.length) {
    console.error('ENV-ERROR: 静态体快照校验失败，不创建 fixture：');
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
    snapshot.staticHashCheck.after = { compared: after.compared, mismatched: 0, missing: 0 };
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
  console.log('--- S1. 静态体 body.position/size/enable（实测；sprite 与 body 分列）---');
  for (const key of STATIC_SCENES) {
    const sc = snapshot.scenes[key];
    for (const so of sc.solids) {
      check(so.body.w > 0 && so.body.h > 0 && so.body.enable === true,
        `${key}: ${so.key} body (${so.body.x},${so.body.y}) ${so.body.w}×${so.body.h} enable=${so.body.enable}`,
        `sprite bounds (${so.sprite.bounds.x},${so.sprite.bounds.y}) ${so.sprite.bounds.w}×${so.sprite.bounds.h}`);
    }
  }
  console.log('--- S2. 关键静态体 presence（castle/gate_closed/crystal）---');
  const solidKeys = (key) => new Set(snapshot.scenes[key].solids.map((so) => so.key));
  check(solidKeys('Village').has('castle') && solidKeys('Village').has('gate_closed'),
    'Village: castle + gate_closed 均有静态 body');
  check(solidKeys('Cave').has('crystal') && solidKeys('SciLair').has('crystal'),
    'Cave/SciLair: crystal 均有静态 body');
  console.log('--- S3. 树四变体（RND 播种确定性聚合）---');
  check(TREE_VARIANTS.every((k) => snapshot.treeVariants[k]),
    `树四变体规格齐全（${Object.keys(snapshot.treeVariants).join(',')}）`);
  console.log('--- S4. 同 seed 两次重启逐字段一致（确定性）---');
  for (const key of STATIC_SCENES) {
    check(snapshot.scenes[key].determinismObserved === true, `${key}: seed=${TREE_SEEDS[0]} 两次捕获一致`);
  }
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

// ---- 7. compare：与冻结 fixture 逐字段比对（含 body.position；播种确定性 → 预期全一致） ----
if (!CAPTURE && snapshot) {
  const frozen = loadAndValidateStaticFixture(FIXTURE);
  const IGN = [/^\.capturedAt$/, /^\.serverPort$/, /^\.staticHashCheck\.after\./];
  const { leaves, drift, drifts } = diffSnapshots(frozen, snapshot, IGN);
  const ok = drift === 0;
  console.log(`--- S5. 静态体基线与 fixture 逐字段一致（${leaves} 字段，容差 1e-6，含 body.position）---`);
  check(ok, '静态体基线（sprite+body 分列）与 fixture 一致', ok ? `共 ${leaves} 字段全部一致` : `${drift} 处漂移`);
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
  console.log(CAPTURE ? 'PASS: 静态体改前值已冻结（capture 完成）' : 'PASS: 静态体基线 GREEN（body.position 不变量成立）');
  process.exit(0);
}
console.log('FAIL: 静态体断言未满足');
process.exit(1);
