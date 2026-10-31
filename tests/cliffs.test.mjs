import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIFF, CLIFF_RECIPE, computeCliffCells, isWaterTile } from '../src/textures/nliCliffs.js';
import { T } from '../src/data/maps.js';

const W = 5, H = 5;
const make = (patches) => {
  const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => T.GRASS));
  for (const [x, y, v] of patches) grid[y][x] = v;
  return { w: W, h: H, grid };
};
const at = (cells, x, y) => cells.find((c) => c.x === x && c.y === y);

// 2026-10-30 显示层几何修订（用户批准，final-fix-brief）：原 LIP=8/FH=104 与冻结碰撞体
// 几何上不可能产生可达遮挡（见下一用例推导）；S 带改为 LIP=64 压陆格 + REACH=96 伸入水格，
// FH=160。REACH 不变（水面伸入量保持 96）。
test('CLIFF constants are frozen and match the approved display-only geometry fix', () => {
  assert.equal(CLIFF.LIP, 64);
  assert.equal(CLIFF.REACH, 96);
  assert.equal(CLIFF.FH, 160);
  assert.ok(Object.isFrozen(CLIFF));
});

test('S band is LIP over land + REACH into water (FH = LIP + REACH)', () => {
  assert.equal(CLIFF.FH, CLIFF.LIP + CLIFF.REACH);
  assert.ok(CLIFF.LIP > 0 && CLIFF.LIP < 128, 'lip must stay inside the land tile');
  assert.ok(CLIFF.REACH > 0 && CLIFF.REACH < 128, 'reach must stay inside the water tile');
});

test('CLIFF_RECIPE is nli02-cliff-v4 (bumped to invalidate v3 cliff overlay canvases)', () => {
  assert.equal(CLIFF_RECIPE, 'nli02-cliff-v4');
});

// 可达遮挡契约（final-fix-brief 要求的行为约束，非纯常量复述）：
// Player.js 冻结几何：origin (0.5, 136/192) × scale2 + body 60×26 offset(66,132)
//   ⇒ collider 底 = 脚点+44；warrior 帧 alpha bbox 底 y139 vs FOOT_Y 136 ⇒ 可见底 ≤ 脚点+6。
// 南向碰撞停在 body 底 = 水界时，可见内容只能到界−38 —— LIP ≤ 38 ⇒ 可达位置 0px 遮挡
// （task5 三拍法实测 0px，即本轮修复的诊断基线）。本契约要求 LIP 越过死区并留出
// 跑动帧抬脚余量：界−64 带顶 ⇒ 真实停靠处 ≥24px 下身被遮挡。
test('S-band lip clears the reachable-body dead zone at the real collision stop', () => {
  const COLLIDER_BELOW_FEET = 44; // 冻结碰撞体低于脚锚点的量
  const VISIBLE_BELOW_FEET = 6;   // 可见精灵低于脚锚点的最大量
  const deadZone = COLLIDER_BELOW_FEET - VISIBLE_BELOW_FEET; // 38
  const occlusionAtStop = CLIFF.LIP - deadZone;
  assert.ok(occlusionAtStop >= 24,
    `expected >=24px lower-body occlusion at the reachable stop, got ${occlusionAtStop}`);
});

test('isWaterTile recognizes all three water codes and rejects land/indoor codes', () => {
  for (const v of [T.WATER, T.WATER2, T.WATER3]) assert.equal(isWaterTile(v), true);
  for (const v of [T.GRASS, T.GRASS2, T.GRASS3, T.GRASS4, T.PATH, T.FLOWER, T.DFLOOR, T.DWALL, T.VOID]) {
    assert.equal(isWaterTile(v), false);
  }
});

test('land cell with water to the south gets edges==8 (S bit only)', () => {
  const cells = computeCliffCells(make([[2, 3, T.WATER]]));
  const cell = at(cells, 2, 2);
  assert.ok(cell, 'expected a cliff cell at (2,2)');
  assert.equal(cell.edges, 8);
});

test('inner corner: water to south and east gives edges==10 (S+E)', () => {
  const cells = computeCliffCells(make([[2, 3, T.WATER], [3, 2, T.WATER2]]));
  const cell = at(cells, 2, 2);
  assert.ok(cell, 'expected a cliff cell at (2,2)');
  assert.equal(cell.edges, 10);
});

test('dry border cells (all-land neighbors, even off-grid) produce no cliffs', () => {
  const cells = computeCliffCells(make([]));
  assert.equal(cells.length, 0);
  assert.equal(at(cells, 0, 0), undefined);
  assert.equal(at(cells, W - 1, H - 1), undefined);
});

test('PATH land tile next to water also produces a cliff cell', () => {
  const cells = computeCliffCells(make([[2, 2, T.PATH], [2, 3, T.WATER]]));
  const cell = at(cells, 2, 2);
  assert.ok(cell, 'path terrace next to water should cliff');
  assert.equal(cell.edges, 8);
});

test('indoor floor/wall tiles never produce cliff cells even beside water', () => {
  const cells = computeCliffCells(make([[2, 2, T.DFLOOR], [3, 2, T.DWALL], [2, 3, T.WATER], [3, 3, T.WATER]]));
  assert.equal(at(cells, 2, 2), undefined);
  assert.equal(at(cells, 3, 2), undefined);
});

test('computeCliffCells is deterministic and row-major ordered', () => {
  const def = make([[2, 3, T.WATER], [3, 2, T.WATER]]);
  const a = computeCliffCells(def);
  const b = computeCliffCells(def);
  assert.deepEqual(a, b);
  assert.deepEqual(a, [...a].sort((p, q) => (p.y - q.y) || (p.x - q.x)));
});
