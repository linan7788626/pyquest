import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIFF, computeCliffCells, isWaterTile } from '../src/textures/nliCliffs.js';
import { T } from '../src/data/maps.js';

const W = 5, H = 5;
const make = (patches) => {
  const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => T.GRASS));
  for (const [x, y, v] of patches) grid[y][x] = v;
  return { w: W, h: H, grid };
};
const at = (cells, x, y) => cells.find((c) => c.x === x && c.y === y);

test('CLIFF constants are frozen and match the brief', () => {
  assert.equal(CLIFF.LIP, 8);
  assert.equal(CLIFF.REACH, 96);
  assert.equal(CLIFF.FH, 104);
  assert.ok(Object.isFrozen(CLIFF));
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
