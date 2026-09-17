// ============================================================
// 地图数据：全部由代码程序化生成（瓦片索引 + 道具标记）
// 瓦片索引见 textures/pixelArt.js 的 drawGroundTile：
// 0草地 1草地2 2土路 3水 4水2 5花草地 6地牢地板 7地牢墙 8虚空
// ============================================================

import { G } from '../core/state.js';

export const T = { GRASS: 0, GRASS2: 1, PATH: 2, WATER: 3, WATER2: 4, FLOWER: 5, DFLOOR: 6, DWALL: 7, VOID: 8, WATER3: 9, GRASS3: 10, GRASS4: 11 };

// 确定性伪随机（保证每次进入地图布局一致）
function lcg(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const px = (t) => t * 64;      // 瓦片 → 像素（Tiny Swords tile = 64px）
const pc = (t) => t * 64 + 32; // 瓦片 → 像素（格子中心）

// ------------------------------------------------------------
// 诺瓦村庄（36 × 24）
// ------------------------------------------------------------
export function buildVillage() {
  const w = 36, h = 24;
  const rand = lcg(20260916);
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => {
    const r = rand();
    if (r < 0.05) return T.GRASS3;   // 草丛
    if (r < 0.14) return T.GRASS2;
    if (r < 0.19) return T.GRASS4;   // 碎石小花
    return T.GRASS;
  }));

  // 花丛点缀
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
    grid[y][x] = T.FLOWER;
  }

  // 边界树林（北门留出 12-13 列）
  const trees = [];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      if (y === 0 && (x === 12 || x === 13)) continue;
      trees.push({ tx: x, ty: y });
      grid[y][x] = T.GRASS;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      if (x === w - 1 && y >= 9 && y <= 11) continue; // 东侧缺口（森林传送门）
      trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS;
    }
  }
  // 内部树丛
  [
    [3, 3], [16, 8], [5, 3], [27, 3], [28, 4], [29, 3], [30, 5],
    [3, 12], [4, 13], [30, 13], [31, 12], [24, 19], [25, 20], [26, 19],
    [16, 21], [20, 3], [21, 4], [22, 3], [33, 8], [31, 8], [17, 12], [18, 13],
  ].forEach(([tx, ty]) => trees.push({ tx, ty }));

  // 池塘（左下角，边缘使用波动贴图）
  for (let y = 18; y <= 21; y++) {
    for (let x = 3; x <= 10; x++) {
      const edge = x === 3 || x === 10 || y === 18 || y === 21;
      grid[y][x] = edge && rand() < 0.5 ? T.WATER2 : T.WATER;
    }
  }
  // 池塘边花
  [[2, 17], [11, 17], [2, 19], [11, 20], [5, 17], [8, 17]].forEach(([x, y]) => grid[y][x] = T.FLOWER);

  // 道路：北门竖路 + 东西横路 + 屋前小路 + 东侧通往森林的路
  for (let y = 0; y <= 17; y++) { grid[y][12] = T.PATH; grid[y][13] = T.PATH; }
  for (let x = 6; x <= 33; x++) { grid[17][x] = T.PATH; grid[18][x] = T.PATH; }
  for (let y = 11; y <= 17; y++) grid[y][8] = T.PATH;
  for (let y = 10; y <= 17; y++) grid[y][33] = T.PATH; // 东侧竖路 → 函数之森之门

  // 房子（放大后 8×7 瓦片，位于屋前路顶端）
  const house = { x: px(8), y: px(10.5) }; // 底边中心锚点

  return {
    key: 'Village',
    name: '诺瓦村庄',
    w, h,
    grid,
    colliding: [T.WATER, T.WATER2],
    ambient: null,
    spawns: {
      start: { x: pc(13.5), y: px(20.5) },
      fromDungeon: { x: pc(13), y: px(2.8) },
      fromForest: { x: px(31.5), y: pc(10) },
    },
    props: [
      { type: 'house', x: house.x, y: house.y },
      { type: 'npc', x: pc(11), y: pc(13), id: 'elder' },
      { type: 'rune', x: pc(17), y: pc(5), qid: 'v1' },
      { type: 'rune', x: pc(6), y: pc(15.5), qid: 'v2' },
      { type: 'rune', x: pc(28), y: pc(9), qid: 'v3' },
      { type: 'rune', x: pc(24), y: pc(12.5), qid: 'v4' },
      { type: 'rune', x: pc(4), y: pc(6), qid: 'v5' },
      { type: 'gate', x: pc(12.5), y: px(2.2) },
      { type: 'doorlink', x: pc(33), y: pc(10), to: 'Forest', spawn: 'fromVillage',
        label: '森林传送门', requires: 'ch1Done',
        lockLines: ['森林传送门上凝着一层薄薄的迷雾。', '（似乎要先完成第一章的试炼，迷雾才会散去）'] },
      ...trees.map(t => ({ type: 'tree', x: pc(t.tx), y: pc(t.ty) })),
    ],
    slimes: [
      { x: pc(21), y: pc(8) },
      { x: pc(29), y: pc(16) },
      { x: pc(8), y: pc(14) },
    ],
    portals: [
      { rect: { x: px(12), y: 0, w: 128, h: 80 }, to: 'Dungeon', spawn: 'fromVillage', label: '循环地牢' },
      { rect: { x: px(34.2), y: px(9.2), w: 104, h: 160 }, to: 'Forest', spawn: 'fromVillage',
        label: '森林传送门', requires: 'ch1Done', lockHint: '迷雾封锁着森林传送门……' },
    ],
  };
}

// ------------------------------------------------------------
// 循环地牢（28 × 20）
// ------------------------------------------------------------
export function buildDungeon() {
  const w = 28, h = 20;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => T.DFLOOR));

  // 外墙
  for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  // 房间隔墙（BOSS 房 / 大厅 / 入口）
  for (let x = 1; x < w - 1; x++) {
    grid[9][x] = T.DWALL;
    grid[14][x] = T.DWALL;
  }
  for (const x of [12, 13, 14, 15]) { grid[9][x] = T.DFLOOR; grid[14][x] = T.DFLOOR; }

  const torches = [
    [4, 1], [10, 1], [17, 1], [23, 1],
    [4, 10], [23, 10], [9, 15], [18, 15],
  ].map(([tx, ty]) => ({ type: 'torch', x: pc(tx), y: pc(ty) + 16 }));

  return {
    key: 'Dungeon',
    name: '循环地牢',
    w, h,
    grid,
    colliding: [T.DWALL, T.VOID],
    ambient: 0x2c2438,
    spawns: {
      fromVillage: { x: pc(13.5), y: px(17.5) },
    },
    props: [
      ...torches,
      { type: 'rune', x: pc(5), y: pc(12), qid: 'd1', healRune: true },
      { type: 'rune', x: pc(22), y: pc(12), qid: 'd2', healRune: true },
      { type: 'rune', x: pc(9), y: pc(13), qid: 'd4', healRune: true },
      { type: 'rune', x: pc(22), y: pc(16), qid: 'd5', healRune: true },
      { type: 'rune', x: pc(9), y: pc(6), qid: 'boss', bossRune: true },
      { type: 'door', x: pc(13.5), y: px(18.6) },
    ],
    slimes: [
      { x: pc(8), y: pc(12.5) },
      { x: pc(19), y: pc(12) },
      { x: pc(14), y: pc(5) },
    ],
    boss: { x: pc(13.5), y: pc(5.5) },
    portals: [
      { rect: { x: pc(13.5) - 56, y: px(18), w: 112, h: 128 }, to: 'Village', spawn: 'fromDungeon', label: '诺瓦村庄' },
    ],
  };
}

// ------------------------------------------------------------
// 函数之森（38 × 28）：第二章野外地图
// 5 块函数符文石（4 产碎片 + 1 祝福）+ 深红史莱姆 + 北方的洞窟封印之门
// ------------------------------------------------------------
export function buildForest() {
  const w = 38, h = 28;
  const rand = lcg(20261001);
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => {
    const r = rand();
    if (r < 0.09) return T.GRASS3;   // 深草丛（森林感更浓）
    if (r < 0.26) return T.GRASS2;
    if (r < 0.31) return T.GRASS4;
    return T.GRASS;
  }));

  // 花丛点缀
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
    grid[y][x] = T.FLOWER;
  }

  // 边界密林（南边 x=8,9 留出回村的缺口）
  const trees = [];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      if (y === h - 1 && (x === 8 || x === 9)) continue;
      trees.push({ tx: x, ty: y });
      grid[y][x] = T.GRASS;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) { trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS; }
  }

  // 林间小湖（左上）
  for (let y = 3; y <= 7; y++) {
    for (let x = 2; x <= 7; x++) {
      const edge = x === 2 || x === 7 || y === 3 || y === 7;
      grid[y][x] = edge && rand() < 0.5 ? T.WATER2 : T.WATER;
    }
  }

  // 蜿蜒主路：南侧缺口 → 西竖路 → 中部横路 → 北竖路（至洞窟之门）
  for (let y = 19; y <= 26; y++) { grid[y][8] = T.PATH; grid[y][9] = T.PATH; }
  for (let x = 8; x <= 28; x++) { grid[19][x] = T.PATH; grid[20][x] = T.PATH; }
  for (let y = 3; y <= 19; y++) { grid[y][27] = T.PATH; grid[y][28] = T.PATH; }

  // 内部树丛（避开道路 / 符文 / 出生点）
  [
    [10, 3], [12, 2], [14, 3], [17, 2], [20, 3], [23, 2], [25, 3],
    [3, 9], [6, 10], [11, 6], [15, 8], [19, 6], [23, 7], [31, 6], [33, 10],
    [2, 13], [3, 15], [11, 14], [14, 12], [17, 15], [21, 13], [25, 16], [31, 12], [34, 14],
    [2, 22], [4, 24], [6, 22], [12, 24], [16, 23], [20, 24], [24, 22], [28, 24], [32, 23], [35, 25],
  ].forEach(([tx, ty]) => trees.push({ tx, ty }));

  const bushes = [
    [7, 12], [13, 16], [22, 11], [29, 18], [10, 21], [26, 8], [33, 16], [5, 17],
  ].map(([tx, ty]) => ({ type: 'bush', x: pc(tx), y: pc(ty) + 12 }));

  const shrooms = [
    [4, 5], [6, 4], [3, 20], [30, 10], [21, 21],
  ].map(([tx, ty]) => ({ type: 'shroom', x: pc(tx), y: pc(ty) + 16 }));

  return {
    key: 'Forest',
    name: '函数之森',
    w, h,
    grid,
    colliding: [T.WATER, T.WATER2],
    ambient: null,
    spawns: {
      fromVillage: { x: px(8.5), y: px(25.2) },
      fromCave: { x: pc(27.5), y: px(5) },
    },
    props: [
      { type: 'npc', x: pc(11), y: pc(22.5), id: 'tablet', tex: 'tablet' },
      { type: 'rune', x: pc(5), y: pc(12.5), qid: 'f1' },
      { type: 'rune', x: pc(31), y: pc(15.5), qid: 'f2' },
      { type: 'rune', x: pc(12), y: pc(7), qid: 'f3' },
      { type: 'rune', x: pc(34), y: pc(6), qid: 'f4' },
      { type: 'rune', x: pc(22), y: pc(16), qid: 'f5' },
      { type: 'rune', x: pc(3), y: pc(19), qid: 'f6', healRune: true },
      { type: 'doorlink', x: pc(27.5), y: px(3.9), to: 'Cave', spawn: 'fromForest',
        label: '洞窟封印', requires: 'ch2GateOpen',
        lockLines: ['洞窟之门被一道函数封印锁住了。', `石碑低语：「收集 ${G.ch2ShardsNeeded} 枚函数碎片，封印自会瓦解。」`] },
      { type: 'door', x: px(8.5), y: px(26.9) }, // 南侧缺口的路标之门（回村）
      ...bushes,
      ...shrooms,
      ...trees.map(t => ({ type: 'tree', x: pc(t.tx), y: pc(t.ty) })),
    ],
    slimes: [
      { x: pc(14), y: pc(15), variant: 'crimson' },
      { x: pc(24), y: pc(9), variant: 'crimson' },
      { x: pc(33), y: pc(21), variant: 'crimson' },
      { x: pc(5), y: pc(19), variant: 'crimson' },
      { x: pc(20), y: pc(23.5) },
      { x: pc(30), y: pc(5) },
    ],
    portals: [
      { rect: { x: px(8), y: px(26.1), w: 128, h: 120 }, to: 'Village', spawn: 'fromForest', label: '诺瓦村庄' },
      { rect: { x: pc(27.5) - 64, y: px(1.2), w: 128, h: 120 }, to: 'Cave', spawn: 'fromForest',
        label: '洞窟封印', requires: 'ch2GateOpen', lockHint: '洞窟之门纹丝不动……' },
    ],
  };
}

// ------------------------------------------------------------
// 列表洞窟（32 × 26）：第二章洞窟地图
// 6 块列表符文石（祝福符文）+ BOSS 符文 + 列表巨蟒 毕森
// ------------------------------------------------------------
export function buildCave() {
  const w = 32, h = 26;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => T.DFLOOR));

  // 外墙
  for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  // 隔墙：BOSS 巢穴（上）/ 大厅（中）/ 入口（下），开口在 15-16 列
  for (let x = 1; x < w - 1; x++) { grid[8][x] = T.DWALL; grid[17][x] = T.DWALL; }
  for (const x of [15, 16]) { grid[8][x] = T.DFLOOR; grid[17][x] = T.DFLOOR; }
  // 大厅石柱
  grid[12][10] = T.DWALL;
  grid[13][21] = T.DWALL;

  const torches = [
    [4, 9], [11, 9], [20, 9], [27, 9],
    [4, 16], [27, 16], [8, 24], [23, 24],
  ].map(([tx, ty]) => ({ type: 'torch', x: pc(tx), y: pc(ty) + 16 }));

  const crystals = [
    [12, 10], [19, 14], [6, 15], [25, 10], [10, 3], [21, 4], [13, 5],
  ].map(([tx, ty]) => ({ type: 'crystal', x: pc(tx), y: pc(ty) }));

  const shrooms = [
    [9, 14], [23, 11], [13, 20], [18, 22], [7, 4], [26, 5],
  ].map(([tx, ty]) => ({ type: 'shroom', x: pc(tx), y: pc(ty) + 16 }));

  return {
    key: 'Cave',
    name: '列表洞窟',
    w, h,
    grid,
    colliding: [T.DWALL, T.VOID],
    ambient: 0x1c1730,
    spawns: {
      fromForest: { x: pc(15.5), y: px(22.8) },
    },
    props: [
      ...torches,
      ...crystals,
      ...shrooms,
      { type: 'rune', x: pc(6), y: pc(12), qid: 'l1', healRune: true },
      { type: 'rune', x: pc(25), y: pc(12), qid: 'l2', healRune: true },
      { type: 'rune', x: pc(8), y: pc(20), qid: 'l3', healRune: true },
      { type: 'rune', x: pc(20), y: pc(20), qid: 'l4', healRune: true },
      { type: 'rune', x: pc(11), y: pc(15), qid: 'l5', healRune: true },
      { type: 'rune', x: pc(26), y: pc(21), qid: 'l6', healRune: true },
      { type: 'rune', x: pc(15.5), y: pc(10.5), qid: 'boss2', bossRune: true },
      { type: 'door', x: pc(15.5), y: px(24.3) },
    ],
    slimes: [
      { x: pc(12), y: pc(13.5) },
      { x: pc(20), y: pc(11) },
      { x: pc(10), y: pc(22) },
    ],
    boss: { type: 'snake', x: pc(15.5), y: pc(4) },
    portals: [
      { rect: { x: pc(15.5) - 56, y: px(24), w: 112, h: 128 }, to: 'Forest', spawn: 'fromCave', label: '函数之森' },
    ],
  };
}
