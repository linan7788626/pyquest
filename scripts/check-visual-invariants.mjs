// ============================================================
// 视觉不变量特征测试（Village 视觉计划 · Task 1）
// 保护「当前行为」，供后续地标/地形任务做回归基线：
//   1. 玩家 body 60×26、offset (66,132)
//   2. 横向攻击矩形 250×170，纵向 170×250（含方向偏移）
//   3. WorldScene.applyAttack 命中敌人用 getBounds()，而非物理 body
//   4. ts_warrior_run 为 5 帧拼接条（start=0,end=4）；idle/attack 保持单帧
//   5. Village 构建器 grid/colliding/spawns/portals/qid 可序列化，
//      与 scripts/fixtures/village-logic-before.json 基线比对
//
// 用法：
//   node scripts/check-visual-invariants.mjs                     # 只读校验（默认）
//   node scripts/check-visual-invariants.mjs --update-fixture    # 初始化基线（仅当基线缺失
//                                                                # 且其余断言全部通过；基线一经
//                                                                # 存在即不可变，存在时本命令 FAIL）
//
// 原则：
//   - 不改 src/、不装依赖：通过 node:module registerHooks 注入 Phaser 桩
//     （data: URL 模块，无需 --experimental 标志），运行真实产品代码做行为断言。
//   - 基线快照不可变：普通运行只读比对，永不写文件；--update-fixture 仅允许
//     「基线缺失 + 其余断言全部通过」时以排他创建（flag 'wx'）初始化，基线已存在
//     即拒绝（即使内容一致也不覆盖），存在前置失败时绝不写。
//   - 快照序列化必须是 JSON 无损的：函数/undefined/symbol/非有限数等会被
//     JSON.stringify 静默丢弃的值一律 FAIL（防字段静默丢失）。
//   - 基线解析后无条件比对：null/false/0/"" 等合法 JSON 但结构非法的基线 FAIL，
//     不因 truthiness 跳过比较。
//   - 本测试设计为在独立 Node 进程中调用：Phaser resolve 钩子与 window 兜底是
//     进程级副作用，不承诺与同进程其他真实 Phaser 导入共存。
//   - 失败时进程退出码 1。
// ============================================================
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures', 'village-logic-before.json');

// ------------------------------------------------------------
// Phaser 桩：仅实现本测试触达的 API 面（类定义 + 几何 + 数学）。
// 关键语义与真实 Phaser 对齐：RectangleToRectangle 为标准 AABB
// 相交（贴边不算命中）。
// ------------------------------------------------------------
const PHASER_STUB_SOURCE = `
class GeomRectangle {
  constructor(x, y, width, height) { this.x = x; this.y = y; this.width = width; this.height = height; }
}
function rectangleToRectangle(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
class GameObject {
  constructor(scene, x, y) { this.scene = scene; this.x = x || 0; this.y = y || 0; }
}
const CHAIN = ['setOrigin', 'setScale', 'setDepth', 'setAlpha', 'setTint', 'clearTint',
  'setFlipX', 'setRotation', 'setVelocity', 'setPosition', 'setDisplaySize', 'setVisible',
  'setTexture', 'setCollideWorldBounds', 'play', 'once'];
for (const m of CHAIN) GameObject.prototype[m] = function () { return this; };
class Sprite extends GameObject {}
export default {
  Geom: { Rectangle: GeomRectangle, Intersects: { RectangleToRectangle: rectangleToRectangle } },
  Math: {
    Between: (a) => a, // 本测试不依赖随机；保持确定性
    Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) },
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
  },
  Physics: { Arcade: { Sprite } },
  Scene: class Scene { constructor() {} },
  GameObjects: { Sprite, Image: Sprite, Rectangle: GeomRectangle, Container: class Container {} },
};
`;

let phaserStubRegistered = false;
function ensurePhaserStub() {
  if (phaserStubRegistered) return;
  phaserStubRegistered = true;
  // 环境兜底：sfx.ensure() 在调用时访问 window.AudioContext（undefined → 静默无声）
  if (typeof globalThis.window === 'undefined') globalThis.window = {};
  const phaserURL = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(PHASER_STUB_SOURCE);
  // 线程内同步钩子：把 'phaser' 重定向到桩模块（data: URL，无需额外文件/标志）
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'phaser') return { url: phaserURL, shortCircuit: true };
      return next(specifier, context);
    },
  });
}

// ------------------------------------------------------------
// 轻量 scene/body 桩：记录产品代码的真实调用结果
// ------------------------------------------------------------
class RecordingBody {
  constructor() { this.width = 0; this.height = 0; this.offset = { x: 0, y: 0 }; }
  setSize(w, h) { this.width = w; this.height = h; return this; }
  setOffset(x, y) { this.offset = { x, y }; return this; }
}

class StubGameObject {
  setDisplaySize() { return this; }
  setAlpha() { return this; }
  setDepth() { return this; }
  setFlipX() { return this; }
  setRotation() { return this; }
  play() { return this; }
  once() { return this; }
  setPosition() { return this; }
  destroy() {}
}

function makeFakeScene() {
  const attackRects = [];
  const scene = {
    time: { now: 0 },
    add: {
      existing() {},
      image: () => new StubGameObject(),
      sprite: () => new StubGameObject(),
    },
    physics: { add: { existing: (obj) => { obj.body = new RecordingBody(); } } },
    applyAttack: (rect) => attackRects.push(rect),
  };
  return { scene, attackRects };
}

// ------------------------------------------------------------
// 深比较（基线 vs 当前快照），返回差异路径列表
// ------------------------------------------------------------
function deepDiff(a, b, path = '') {
  if (a === b) return [];
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
    return [`${path || '<root>'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`];
  }
  const out = [];
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`${path}: 长度 ${a.length} ≠ ${b.length}`);
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) out.push(...deepDiff(a[i], b[i], `${path}[${i}]`));
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out.push(...deepDiff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return out;
}

// ------------------------------------------------------------
// JSON 保真检查：找出 JSON.stringify 会静默丢弃或无法表示的值。
// 返回违规路径列表（空 = 可无损序列化）。
// 覆盖：function / symbol / bigint / undefined / 非有限数 / 循环引用 /
//       symbol 键（Object.entries 跳过 → stringify 丢弃）。
// ------------------------------------------------------------
function findNonSerializable(value, path = '', seen = new Set()) {
  const label = path || '<root>';
  if (typeof value === 'function') return [`${label}: function`];
  if (typeof value === 'symbol') return [`${label}: symbol`];
  if (typeof value === 'bigint') return [`${label}: bigint`];
  if (typeof value === 'undefined') return [`${label}: undefined`];
  if (typeof value === 'number' && !Number.isFinite(value)) return [`${label}: 非有限数 ${value}`];
  if (value === null || typeof value !== 'object') return []; // 其余原始值 JSON 可保真
  if (seen.has(value)) return [`${label}: 循环引用`];
  seen.add(value);
  const out = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...findNonSerializable(v, `${path}[${i}]`, seen)));
  } else {
    for (const [k, v] of Object.entries(value)) {
      out.push(...findNonSerializable(v, path ? `${path}.${k}` : k, seen));
    }
    // symbol 键会被 JSON.stringify 静默丢弃
    for (const s of Object.getOwnPropertySymbols(value)) out.push(`${label}: symbol 键 ${String(s)}`);
  }
  return out;
}

/** 基线结构诊断：null/false/0/"" 等给出可读的类型描述 */
function describeJson(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'JSON 数组';
  const t = typeof v;
  if (t === 'string') return v === '' ? '空字符串' : '字符串';
  if (t === 'object') return '对象';
  return `${t} ${JSON.stringify(v)}`;
}

// ------------------------------------------------------------
// 主检查：导出给程序化调用；CLI 直接运行时由文件底部驱动
// ------------------------------------------------------------
export async function checkVisualInvariants({ updateFixture = false } = {}) {
  const failures = [];
  const fail = (msg) => failures.push(msg);
  const ok = (msg) => console.log('  ✓', msg);

  ensurePhaserStub();
  // 动态 import：确保 register 的 Phaser 桩先生效（静态 import 会先于 register 执行）
  const { Player } = await import('../src/entities/Player.js');
  const { WorldScene } = await import('../src/scenes/WorldScene.js');
  const { createTSAnimations } = await import('../src/assets/ts.js');
  const { buildVillage } = await import('../src/data/maps.js');
  const { CHAPTERS } = await import('../src/data/chapters.js');

  // ---- 1. 玩家碰撞体：60×26 @ (66,132)（运行真实 Player 构造器）----
  {
    const { scene } = makeFakeScene();
    const p = new Player(scene, 1000, 2000);
    if (p.body.width !== 60 || p.body.height !== 26) {
      fail(`玩家 body 尺寸应为 60×26，实际 ${p.body.width}×${p.body.height}`);
    }
    if (p.body.offset.x !== 66 || p.body.offset.y !== 132) {
      fail(`玩家 body offset 应为 (66,132)，实际 (${p.body.offset.x},${p.body.offset.y})`);
    }
    if (!failures.length) ok('玩家 body 60×26 @ offset (66,132)');
  }

  // ---- 2. 攻击矩形：横向 250×170 / 纵向 170×250（运行真实 tryAttack，含方向偏移）----
  {
    const PX = 1000, PY = 2000;
    const { scene, attackRects } = makeFakeScene();
    const p = new Player(scene, PX, PY);
    // 特征基线：各朝向的矩形尺寸与中心偏移（x±116 横向、上 -112 / 下 +104 纵向）
    const EXPECT = {
      right: { ox: 116, oy: 0, w: 250, h: 170 },
      left: { ox: -116, oy: 0, w: 250, h: 170 },
      up: { ox: 0, oy: -112, w: 170, h: 250 },
      down: { ox: 0, oy: 104, w: 170, h: 250 },
    };
    let t = 10000;
    let rectsOk = true;
    for (const [facing, e] of Object.entries(EXPECT)) {
      p.facing = facing;
      scene.time.now = t; t += 1000; // 递增时间绕过攻击冷却（340ms）
      attackRects.length = 0;
      p.tryAttack();
      const r = attackRects.pop();
      if (!r) { fail(`facing=${facing}: tryAttack 未产生攻击矩形`); rectsOk = false; continue; }
      const expX = PX + e.ox - e.w / 2, expY = PY + e.oy - e.h / 2;
      if (r.width !== e.w || r.height !== e.h) {
        fail(`facing=${facing}: 攻击矩形应为 ${e.w}×${e.h}，实际 ${r.width}×${r.height}`);
        rectsOk = false;
      }
      if (r.x !== expX || r.y !== expY) {
        fail(`facing=${facing}: 攻击矩形原点应为 (${expX},${expY})，实际 (${r.x},${r.y})`);
        rectsOk = false;
      }
    }
    if (rectsOk) ok('攻击矩形：横向 250×170 / 纵向 170×250，四个朝向偏移与基线一致');
  }

  // ---- 3. WorldScene.applyAttack 命中判定用 getBounds() 而非 body ----
  // 构造 getBounds 与 body 「相交关系相反」的敌人：只有真正读 getBounds 的实现才会按预期命中。
  {
    const { scene, attackRects } = makeFakeScene();
    const p = new Player(scene, 1000, 2000);
    p.facing = 'right';
    scene.time.now = 50000;
    p.tryAttack();
    const rect = attackRects.pop();
    if (!rect) {
      fail('无法获取攻击矩形（getBounds 场景）');
    } else {
      const hurt = [];
      let seq = 0;
      const mkSlime = (bounds, bodyRect) => {
        const id = 'S' + (seq++);
        return {
          id, active: true, dead: false,
          getBounds: () => bounds, // WorldScene 实际读取的包围盒
          body: bodyRect,          // 若实现误用物理 body，将在这里暴露
          hurt: () => hurt.push(id),
        };
      };
      // 攻击矩形右向：(991,1915,250,170)，覆盖 x[991,1241] × y[1915,2085]
      const A = mkSlime({ x: 1200, y: 2000, width: 100, height: 100 }, { x: 3000, y: 3000, width: 48, height: 24 }); // 仅 getBounds 相交
      const B = mkSlime({ x: 5000, y: 5000, width: 100, height: 100 }, { x: 1000, y: 1920, width: 48, height: 24 }); // 仅 body 相交
      const C = mkSlime({ x: 1400, y: 2050, width: 100, height: 100 }, { x: 1400, y: 2050, width: 48, height: 24 }); // 均不相交
      const fakeWorld = {
        slimeGroup: { children: { iterate: (fn) => [A, B, C].forEach(fn) } },
        player: { x: p.x, y: p.y },
      };
      WorldScene.prototype.applyAttack.call(fakeWorld, rect);
      if (!hurt.includes('S0')) fail('applyAttack 未命中 getBounds 相交的敌人（A 应受伤 → 命中判定未用 getBounds？）');
      if (hurt.includes('S1')) fail('applyAttack 命中了仅 body 相交的敌人（B 不应受伤 → 命中判定用的是 body）');
      if (hurt.includes('S2')) fail('applyAttack 命中了两者均不相交的敌人（C 不应受伤）');
      if (hurt.filter((x) => x === 'S0').length !== 1) fail('applyAttack 对同一敌人重复造成伤害');
      if (!failures.length) ok('applyAttack 命中判定基于 getBounds()（body 相交不触发命中）');
    }
  }

  // ---- 4. 动画契约：ts_warrior_run 五帧拼接条（start=0,end=4）；idle/attack 单帧 ----
  // 2026-10-29 行走 lane：warrior_run sheet 换为 5 帧拼接条（run/warrior_run_sheet.png），
  // 其余 TS_ANIMS 契约不变（详见 manifest.json 顶层 run_sheet 与 src/assets/ts.js 注释）。
  {
    const created = [];
    const animScene = {
      anims: {
        exists: () => false,
        generateFrameNumbers: (sheet, frames) => ({ sheet, start: frames.start, end: frames.end }),
        create: (cfg) => { created.push(cfg); return cfg; },
      },
    };
    createTSAnimations(animScene);
    // 精确断言：key → 对应 spritesheet 与帧范围（run 为 0..4 五帧拼接，其余单帧且为首帧）
    const EXPECT_ANIM = {
      ts_warrior_idle: { sheet: 'warrior_idle', end: 0 },
      ts_warrior_run: { sheet: 'warrior_run', end: 4 },
      ts_warrior_attack: { sheet: 'warrior_attack', end: 0 },
    };
    let animsOk = true;
    for (const [key, exp] of Object.entries(EXPECT_ANIM)) {
      const cfg = created.find((c) => c.key === key);
      if (!cfg) { fail(`缺少动画 ${key}`); animsOk = false; continue; }
      if (cfg.frames.sheet !== exp.sheet) {
        fail(`${key} 应引用 sheet "${exp.sheet}"，实际 "${cfg.frames.sheet}"`);
        animsOk = false;
      }
      if (cfg.frames.start !== 0 || cfg.frames.end !== exp.end) {
        fail(`${key} 帧范围应为 start=0,end=${exp.end}${exp.end === 0 ? '（单帧且为首帧）' : '（五帧拼接条）'}，实际 start=${cfg.frames.start}, end=${cfg.frames.end}`);
        animsOk = false;
      }
    }
    if (animsOk) ok('ts_warrior_run 五帧拼接条（0..4）；idle/attack 保持单帧（sheet 正确）');
  }

  // ---- 5. Village 地图结构快照（grid/colliding/spawns/portals/qid）----
  {
    const ch = CHAPTERS[0];
    const def = buildVillage(ch);
    const snapshot = {
      w: def.w,
      h: def.h,
      grid: def.grid,
      colliding: def.colliding,
      spawns: def.spawns,
      portals: def.portals,
      qid: def.props.filter((pr) => pr.type === 'rune').map((pr) => pr.qid),
    };

    // JSON 保真自检：任何会被 JSON.stringify 静默丢弃/无法表示的值都 FAIL，
    // 防止「快照字段丢失但比对仍一致」的假通过（如 portal 加了函数字段）。
    const nonSerializable = findNonSerializable(snapshot);
    if (nonSerializable.length) {
      fail(`Village 快照含 JSON 无法无损保真的字段（共 ${nonSerializable.length} 处，将被静默丢弃）: ${nonSerializable.slice(0, 5).join('; ')}`);
    }

    let roundTrip = null;
    try {
      roundTrip = JSON.parse(JSON.stringify(snapshot));
    } catch (e) {
      fail(`Village 快照不可序列化: ${e.message}`);
    }

    const fixtureExists = existsSync(FIXTURE_PATH);

    if (updateFixture && fixtureExists) {
      // 基线不可变：已存在即拒绝（即使内容一致也不覆盖）
      fail(`--update-fixture 被拒绝：基线已存在且不可变 ${FIXTURE_PATH}（基线重置需单独评审的显式流程）`);
    }

    if (updateFixture && !fixtureExists) {
      if (failures.length > 0) {
        // 前置断言失败时绝不初始化基线，否则坏状态会成为新真值
        fail(`--update-fixture 被拒绝：其余断言存在 ${failures.length} 项失败，不得初始化基线`);
      } else {
        try {
          mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
          // 排他创建（flag 'wx'）：文件已存在时抛错而非覆盖
          writeFileSync(FIXTURE_PATH, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
          ok(`基线已初始化 ${FIXTURE_PATH}（缺失 + 其余断言全部通过，排他创建）`);
        } catch (e) {
          fail(`基线初始化失败（排他创建被拒）: ${e.message}`);
        }
      }
    } else {
      // 只读比对（含「--update-fixture + 基线已存在」场景：拒绝之余仍给出比对诊断）
      if (!fixtureExists) {
        fail(`村庄基线快照缺失: ${FIXTURE_PATH}（首次采集请运行 node scripts/check-visual-invariants.mjs --update-fixture）`);
      } else if (roundTrip !== null) {
        let baseline; // 注意：不用 null 作哨兵——null 是本分支要显式判非法的取值
        let parseOk = true;
        try {
          baseline = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
        } catch (e) {
          fail(`村庄基线快照损坏（JSON 解析失败）: ${e.message}`);
          parseOk = false;
        }
        if (parseOk) {
          // 无条件结构校验：null/false/0/"" 等合法 JSON 但错误结构一律 FAIL，
          // 绝不因 truthiness 跳过比较
          if (baseline === null || typeof baseline !== 'object' || Array.isArray(baseline)) {
            fail(`村庄基线快照结构非法: 期望 JSON 对象，实际 ${describeJson(baseline)}`);
          } else {
            for (const k of ['w', 'h', 'grid', 'colliding', 'spawns', 'portals', 'qid']) {
              if (!(k in baseline)) fail(`村庄基线缺少必需字段: ${k}`);
            }
            const diffs = deepDiff(baseline, roundTrip);
            if (diffs.length) {
              fail(`Village 地图结构与基线不一致（共 ${diffs.length} 处）: ${diffs.slice(0, 5).join('; ')}`);
            } else if (failures.length === 0) {
              ok('Village grid/colliding/spawns/portals/qid 与基线快照一致');
            }
          }
        }
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

// ------------------------------------------------------------
// CLI 入口
// ------------------------------------------------------------
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const updateFixture = process.argv.includes('--update-fixture');
  console.log(`[check-visual-invariants] 模式: ${updateFixture ? '初始化基线（仅限基线缺失且其余断言全部通过）' : '只读校验'}`);
  const { ok, failures } = await checkVisualInvariants({ updateFixture });
  if (ok) {
    console.log('PASS: 视觉不变量全部通过');
  } else {
    console.error('FAIL: 视觉不变量未通过');
    for (const f of failures) console.error('  ✗', f);
    process.exitCode = 1;
  }
}
