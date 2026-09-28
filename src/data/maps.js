// ============================================================
// 地图数据：全部由代码程序化生成（瓦片索引 + 道具标记）
// 瓦片索引见 textures/pixelArt.js 的 drawGroundTile：
// 0草地 1草地2 2土路 3水 4水2 5花草地 6地牢地板 7地牢墙 8虚空
//
// 所有构建器接收 chapter 配置 ch（见 data/chapters.js），并统一使用
// 标准 spawn 键：
//   野外 field：'start'(仅第1章) / 'fromLair' / 'fromPrev' / 'fromNext'
//   巢穴 lair ：'fromField'
// 标准传送门：
//   field → lair      spawn 'fromField'（需 ch.gateOpen）
//   lair  → field     spawn 'fromLair'
//   field → nextField spawn 'fromPrev'（需 ch.done）
//   field → prevField spawn 'fromNext'（常开）
// ============================================================

export const T = { GRASS: 0, GRASS2: 1, PATH: 2, WATER: 3, WATER2: 4, FLOWER: 5, DFLOOR: 6, DWALL: 7, VOID: 8, WATER3: 9, GRASS3: 10, GRASS4: 11 };

// 确定性伪随机（保证每次进入地图布局一致）
function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const px = (t) => t * 128;      // 瓦片 → 像素（tile 64px ×2 = 128px）
const pc = (t) => t * 128 + 64; // 瓦片 → 像素（格子中心）

// ------------------------------------------------------------
// 第1章野外 · 诺瓦村庄（36 × 24）
// ------------------------------------------------------------
export function buildVillage(ch) {
  const w = 36, h = 24;
  const rand = lcg(20260916);
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => {
    const r = rand();
    if (r < 0.05) return T.GRASS3;
    if (r < 0.14) return T.GRASS2;
    if (r < 0.19) return T.GRASS4;
    return T.GRASS;
  }));

  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
    grid[y][x] = T.FLOWER;
  }

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
      if (x === w - 1 && y >= 9 && y <= 11) continue;
      trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS;
    }
  }
  [
    [3, 3], [16, 8], [5, 3], [27, 3], [28, 4], [29, 3], [30, 5],
    [3, 12], [4, 13], [30, 13], [31, 12], [24, 19], [25, 20], [26, 19],
    [16, 21], [20, 3], [21, 4], [22, 3], [33, 8], [31, 8], [17, 12], [18, 13],
  ].forEach(([tx, ty]) => trees.push({ tx, ty }));

  for (let y = 18; y <= 21; y++) {
    for (let x = 3; x <= 10; x++) {
      const edge = x === 3 || x === 10 || y === 18 || y === 21;
      grid[y][x] = edge && rand() < 0.5 ? T.WATER2 : T.WATER;
    }
  }
  [[2, 17], [11, 17], [2, 19], [11, 20], [5, 17], [8, 17]].forEach(([x, y]) => { grid[y][x] = T.FLOWER; });

  for (let y = 0; y <= 17; y++) { grid[y][12] = T.PATH; grid[y][13] = T.PATH; }
  for (let x = 6; x <= 33; x++) { grid[17][x] = T.PATH; grid[18][x] = T.PATH; }
  for (let y = 11; y <= 17; y++) grid[y][8] = T.PATH;
  for (let y = 10; y <= 17; y++) grid[y][33] = T.PATH;

  const house = { x: px(8), y: px(10.5) };

  return {
    key: ch.fieldKey,
    name: ch.fieldName,
    w, h,
    grid,
    colliding: [T.WATER, T.WATER2],
    ambient: null,
    spawns: {
      start: { x: pc(13.5), y: px(20.5) },
      fromLair: { x: pc(13), y: px(2.8) },
      fromNext: { x: px(31.5), y: pc(10) },
    },
    props: [
      { type: 'house', x: house.x, y: house.y },
      { type: 'npc', x: pc(11), y: pc(13), id: ch.npcKind },
      { type: 'rune', x: pc(17), y: pc(5), qid: 'v1' },
      { type: 'rune', x: pc(6), y: pc(15.5), qid: 'v2' },
      { type: 'rune', x: pc(28), y: pc(9), qid: 'v3' },
      { type: 'rune', x: pc(24), y: pc(12.5), qid: 'v4' },
      { type: 'rune', x: pc(4), y: pc(6), qid: 'v5' },
      { type: 'gate', x: pc(12.5), y: px(2.2) },
      ...(ch.nextKey ? [{ type: 'doorlink', x: pc(33), y: pc(10), to: ch.nextKey, spawn: 'fromPrev',
        label: ch.nextDoorLabel || '前方传送门', requires: { ch: ch.id, flag: 'done' },
        lockLines: ch.nextLockLines || ['传送门上凝着一层薄薄的迷雾。', '（似乎要先完成本章试炼，迷雾才会散去）'] }] : []),
      ...trees.map((t) => ({ type: 'tree', x: pc(t.tx), y: pc(t.ty) })),
    ],
    slimes: [
      { x: pc(21), y: pc(8) },
      { x: pc(29), y: pc(16) },
      { x: pc(8), y: pc(14) },
    ],
    portals: [
      { rect: { x: px(12), y: 0, w: 256, h: 160 }, to: ch.lairKey, spawn: 'fromField', label: ch.lairName },
      ...(ch.nextKey ? [{ rect: { x: px(34.2), y: px(9.2), w: 208, h: 320 }, to: ch.nextKey, spawn: 'fromPrev',
        label: ch.nextDoorLabel || '前方传送门', requires: { ch: ch.id, flag: 'done' }, lockHint: ch.nextLockHint || '迷雾封锁着传送门……' }] : []),
    ],
  };
}

// ------------------------------------------------------------
// 第1章巢穴 · 循环地牢（28 × 20）
// ------------------------------------------------------------
export function buildDungeon(ch) {
  const w = 28, h = 20;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => T.DFLOOR));

  for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  for (let x = 1; x < w - 1; x++) { grid[9][x] = T.DWALL; grid[14][x] = T.DWALL; }
  for (const x of [12, 13, 14, 15]) { grid[9][x] = T.DFLOOR; grid[14][x] = T.DFLOOR; }

  const torches = [
    [4, 1], [10, 1], [17, 1], [23, 1],
    [4, 10], [23, 10], [9, 15], [18, 15],
  ].map(([tx, ty]) => ({ type: 'torch', x: pc(tx), y: pc(ty) + 32 }));

  return {
    key: ch.lairKey,
    name: ch.lairName,
    w, h,
    grid,
    colliding: [T.DWALL, T.VOID],
    ambient: 0x2c2438,
    spawns: { fromField: { x: pc(13.5), y: px(17.5) } },
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
    boss: { type: ch.boss, x: pc(13.5), y: pc(5.5) },
    portals: [
      { rect: { x: pc(13.5) - 112, y: px(18), w: 224, h: 256 }, to: ch.fieldKey, spawn: 'fromLair', label: ch.fieldName },
    ],
  };
}

// ------------------------------------------------------------
// 第2章野外 · 函数之森（38 × 28）
// ------------------------------------------------------------
export function buildForest(ch) {
  const w = 38, h = 28;
  const rand = lcg(20261001);
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => {
    const r = rand();
    if (r < 0.09) return T.GRASS3;
    if (r < 0.26) return T.GRASS2;
    if (r < 0.31) return T.GRASS4;
    return T.GRASS;
  }));

  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
    grid[y][x] = T.FLOWER;
  }

  const trees = [];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      if (y === h - 1 && (x === 8 || x === 9)) continue;
      trees.push({ tx: x, ty: y });
      grid[y][x] = T.GRASS;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      // 东侧留出通往下一章的门洞
      if (x === w - 1 && ch.nextKey && y >= 13 && y <= 15) continue;
      trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS;
    }
  }

  for (let y = 3; y <= 7; y++) {
    for (let x = 2; x <= 7; x++) {
      const edge = x === 2 || x === 7 || y === 3 || y === 7;
      grid[y][x] = edge && rand() < 0.5 ? T.WATER2 : T.WATER;
    }
  }

  for (let y = 19; y <= 26; y++) { grid[y][8] = T.PATH; grid[y][9] = T.PATH; }
  for (let x = 8; x <= 28; x++) { grid[19][x] = T.PATH; grid[20][x] = T.PATH; }
  for (let y = 3; y <= 19; y++) { grid[y][27] = T.PATH; grid[y][28] = T.PATH; }

  [
    [10, 3], [12, 2], [14, 3], [17, 2], [20, 3], [23, 2], [25, 3],
    [3, 9], [6, 10], [11, 6], [15, 8], [19, 6], [23, 7], [31, 6], [33, 10],
    [2, 13], [3, 15], [11, 14], [14, 12], [17, 15], [21, 13], [25, 16], [31, 12], [34, 14],
    [2, 22], [4, 24], [6, 22], [12, 24], [16, 23], [20, 24], [24, 22], [28, 24], [32, 23], [35, 25],
  ].forEach(([tx, ty]) => trees.push({ tx, ty }));

  const bushes = [
    [7, 12], [13, 16], [22, 11], [29, 18], [10, 21], [26, 8], [33, 16], [5, 17],
  ].map(([tx, ty]) => ({ type: 'bush', x: pc(tx), y: pc(ty) + 24 }));

  const shrooms = [
    [4, 5], [6, 4], [3, 20], [30, 10], [21, 21],
  ].map(([tx, ty]) => ({ type: 'shroom', x: pc(tx), y: pc(ty) + 32 }));

  return {
    key: ch.fieldKey,
    name: ch.fieldName,
    w, h,
    grid,
    colliding: [T.WATER, T.WATER2],
    ambient: null,
    spawns: {
      fromPrev: { x: px(8.5), y: px(25.2) },
      fromLair: { x: pc(27.5), y: px(5) },
    },
    props: [
      { type: 'npc', x: pc(11), y: pc(22.5), id: ch.npcKind, tex: 'tablet' },
      { type: 'rune', x: pc(5), y: pc(12.5), qid: 'f1' },
      { type: 'rune', x: pc(31), y: pc(15.5), qid: 'f2' },
      { type: 'rune', x: pc(12), y: pc(7), qid: 'f3' },
      { type: 'rune', x: pc(34), y: pc(6), qid: 'f4' },
      { type: 'rune', x: pc(22), y: pc(16), qid: 'f5' },
      { type: 'rune', x: pc(3), y: pc(19), qid: 'f6', healRune: true },
      { type: 'doorlink', x: pc(27.5), y: px(3.9), to: ch.lairKey, spawn: 'fromField',
        label: ch.lairDoorLabel || '洞窟封印', requires: { ch: ch.id, flag: 'gateOpen' }, unlockOnShards: true,
        lockLines: [ch.lairLockLine1 || '巢穴之门被一道封印锁住了。', `石碑低语：「收集 ${ch.shardsNeeded} 枚${ch.shardLabel}，封印自会瓦解。」`] },
      { type: 'door', x: px(8.5), y: px(26.9) },
      ...bushes,
      ...shrooms,
      ...trees.map((t) => ({ type: 'tree', x: pc(t.tx), y: pc(t.ty) })),
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
      ...(ch.prevKey ? [{ rect: { x: px(8), y: px(26.1), w: 256, h: 240 }, to: ch.prevKey, spawn: 'fromNext', label: '返回上一章' }] : []),
      { rect: { x: pc(27.5) - 128, y: px(1.2), w: 256, h: 240 }, to: ch.lairKey, spawn: 'fromField',
        label: ch.lairDoorLabel || '洞窟封印', requires: { ch: ch.id, flag: 'gateOpen' }, lockHint: '巢穴之门纹丝不动……' },
      ...(ch.nextKey ? [{ rect: { x: px(36.4), y: px(13), w: 200, h: 320 }, to: ch.nextKey, spawn: 'fromPrev',
        label: ch.nextDoorLabel || '前方传送门', requires: { ch: ch.id, flag: 'done' }, lockHint: '迷雾封锁着前方……' }] : []),
    ],
  };
}

// ------------------------------------------------------------
// 第2章巢穴 · 列表洞窟（32 × 26）
// ------------------------------------------------------------
export function buildCave(ch) {
  const w = 32, h = 26;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => T.DFLOOR));

  for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  for (let x = 1; x < w - 1; x++) { grid[8][x] = T.DWALL; grid[17][x] = T.DWALL; }
  for (const x of [15, 16]) { grid[8][x] = T.DFLOOR; grid[17][x] = T.DFLOOR; }
  grid[12][10] = T.DWALL;
  grid[13][21] = T.DWALL;

  const torches = [
    [4, 9], [11, 9], [20, 9], [27, 9],
    [4, 16], [27, 16], [8, 24], [23, 24],
  ].map(([tx, ty]) => ({ type: 'torch', x: pc(tx), y: pc(ty) + 32 }));

  const crystals = [
    [12, 10], [19, 14], [6, 15], [25, 10], [10, 3], [21, 4], [13, 5],
  ].map(([tx, ty]) => ({ type: 'crystal', x: pc(tx), y: pc(ty) }));

  const shrooms = [
    [9, 14], [23, 11], [13, 20], [18, 22], [7, 4], [26, 5],
  ].map(([tx, ty]) => ({ type: 'shroom', x: pc(tx), y: pc(ty) + 32 }));

  return {
    key: ch.lairKey,
    name: ch.lairName,
    w, h,
    grid,
    colliding: [T.DWALL, T.VOID],
    ambient: 0x1c1730,
    spawns: { fromField: { x: pc(15.5), y: px(22.8) } },
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
    boss: { type: ch.boss, x: pc(15.5), y: pc(4) },
    portals: [
      { rect: { x: pc(15.5) - 112, y: px(24), w: 224, h: 256 }, to: ch.fieldKey, spawn: 'fromLair', label: ch.fieldName },
    ],
  };
}

// ============================================================
// 通用野外 / 巢穴生成器（W3-W8 数据驱动关卡）
// 依据 ch.theme 决定地貌调色板、尺寸、装饰密度；依据 ch.shardsNeeded
// 自动铺设碎片符文，qid 采用 c{章}s{n} / c{章}h{n} / c{章}boss / c{章}l{n}
// ============================================================

// 在一片网格上按伪随机散布符文，保证彼此与出生点有间距
function scatterSlots(rand, w, h, count, margin, forbidden) {
  const spots = [];
  let guard = 0;
  while (spots.length < count && guard < 4000) {
    guard++;
    const tx = margin + Math.floor(rand() * (w - margin * 2));
    const ty = margin + Math.floor(rand() * (h - margin * 2));
    const key = `${tx},${ty}`;
    if (forbidden.has(key)) continue;
    if (spots.some((s) => Math.abs(s.tx - tx) <= 2 && Math.abs(s.ty - ty) <= 2)) continue;
    spots.push({ tx, ty });
    forbidden.add(key);
  }
  return spots;
}

export function buildField(ch) {
  const th = ch.theme || {};
  const w = th.w || 34, h = th.h || 26;
  const rand = lcg(th.seed || 1000 + ch.id * 77);
  const dungeonStyle = th.palette === 'dungeon';
  const cx = Math.floor(w / 2);
  const midY = Math.floor(h / 2);

  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => {
    if (dungeonStyle) return T.DFLOOR;
    const r = rand();
    if (r < 0.07) return T.GRASS3;
    if (r < 0.2) return T.GRASS2;
    if (r < 0.25) return T.GRASS4;
    return T.GRASS;
  }));

  const trees = [];
  const forbidden = new Set(); // 不放符文/怪物的瓦片（树/水/出生点/门口）
  const blockTile = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) forbidden.add(`${x},${y}`); };

  if (dungeonStyle) {
    for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
    for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  } else {
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
      grid[y][x] = T.FLOWER;
    }
    // 边界树林（南边留出回上一章的口子，北边留出通往巢穴的门洞）
    for (let x = 0; x < w; x++) {
      for (const y of [0, h - 1]) {
        if (y === 0 && (x === cx || x === cx + 1)) continue;            // 北门洞
        if (y === h - 1 && ch.prevKey && (x === 4 || x === 5)) continue; // 南回口
        trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS;
      }
    }
    for (let y = 0; y < h; y++) {
      for (const x of [0, w - 1]) {
        if (x === w - 1 && ch.nextKey && y >= midY - 1 && y <= midY + 1) continue; // 东门洞
        trees.push({ tx: x, ty: y }); grid[y][x] = T.GRASS;
      }
    }
    // 内部树丛
    for (let i = 0; i < 26; i++) {
      const tx = 2 + Math.floor(rand() * (w - 4));
      const ty = 2 + Math.floor(rand() * (h - 4));
      trees.push({ tx, ty });
    }
    // 中央竖路 + 东西横路
    for (let y = 1; y < h - 1; y++) { grid[y][cx] = T.PATH; }
    for (let x = 2; x < w - 2; x++) { grid[midY][x] = T.PATH; }
    // 左上小池塘
    for (let y = 3; y <= 6; y++) {
      for (let x = 3; x <= 7; x++) {
        const edge = x === 3 || x === 7 || y === 3 || y === 6;
        grid[y][x] = edge && rand() < 0.5 ? T.WATER2 : T.WATER;
      }
    }
  }

  // 树木 / 水面瓦片不放符文与史莱姆
  trees.forEach((t) => blockTile(t.tx, t.ty));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] === T.WATER || grid[y][x] === T.WATER2) blockTile(x, y);
    }
  }

  // 出生点
  const spawns = { fromLair: { x: pc(cx + 0.5), y: px(2.6) } };
  if (ch.id === 1) spawns.start = { x: pc(cx + 0.5), y: px(h - 4) };
  if (ch.prevKey) spawns.fromPrev = { x: px(4.5), y: px(h - 2.6) };
  if (ch.nextKey) spawns.fromNext = { x: px(w - 3.5), y: pc(midY) };

  // 出生点 / 石碑 / 门口附近不放符文
  Object.values(spawns).forEach((s) => {
    const tx = Math.floor(s.x / 128), ty = Math.floor(s.y / 128);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blockTile(tx + dx, ty + dy);
  });
  blockTile(cx, 1); blockTile(cx + 1, 1);
  blockTile(cx - 3, midY + 3); blockTile(cx - 4, midY + 3); blockTile(cx - 3, midY + 2); blockTile(cx - 3, midY + 4);
  if (ch.prevKey) { blockTile(4, h - 1); blockTile(5, h - 1); blockTile(4, h - 2); blockTile(5, h - 2); }
  if (ch.nextKey) { blockTile(w - 2, midY); blockTile(w - 2, midY - 1); blockTile(w - 2, midY + 1); }

  const shardSpots = scatterSlots(rand, w, h, ch.shardsNeeded, 3, forbidden);
  const healSpots = scatterSlots(rand, w, h, th.healRunes ?? 2, 3, forbidden);
  const slimeSpots = scatterSlots(rand, w, h, th.slimes ?? 4, 4, forbidden);

  const props = [];
  // 引导石碑（十字路口旁）
  props.push({ type: 'npc', x: pc(cx - 3), y: pc(midY + 3), id: ch.npcKind, tex: 'tablet' });
  // 碎片符文
  shardSpots.forEach((s, i) => props.push({ type: 'rune', x: pc(s.tx), y: pc(s.ty), qid: `c${ch.id}s${i + 1}` }));
  // 祝福符文
  healSpots.forEach((s, i) => props.push({ type: 'rune', x: pc(s.tx), y: pc(s.ty), qid: `c${ch.id}h${i + 1}`, healRune: true }));
  // 通往巢穴的封印门（北）
  const lairDoorX = pc(cx + 0.5);
  props.push({ type: 'doorlink', x: lairDoorX, y: px(1.4), to: ch.lairKey, spawn: 'fromField',
    label: ch.lairDoorLabel || '巢穴封印', requires: { ch: ch.id, flag: 'gateOpen' }, unlockOnShards: true,
    lockLines: [ch.lairLockLine1 || `${ch.lairName}之门被一道封印锁住了。`, `石碑低语：「收集 ${ch.shardsNeeded} 枚${ch.shardLabel}，封印自会瓦解。」`] });
  if (ch.prevKey) props.push({ type: 'door', x: px(4.5), y: px(h - 1.4) });
  if (ch.nextKey) props.push({ type: 'door', x: px(w - 2.6), y: pc(midY) });

  // 装饰
  if (!dungeonStyle) {
    for (let i = 0; i < 8; i++) {
      const tx = 2 + Math.floor(rand() * (w - 4)), ty = 2 + Math.floor(rand() * (h - 4));
      props.push({ type: 'bush', x: pc(tx), y: pc(ty) + 24 });
    }
    trees.forEach((t) => props.push({ type: 'tree', x: pc(t.tx), y: pc(t.ty) }));
  } else {
    [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4], [cx, 3]].forEach(([tx, ty]) =>
      props.push({ type: 'torch', x: pc(tx), y: pc(ty) + 32 }));
    for (let i = 0; i < 6; i++) {
      const tx = 3 + Math.floor(rand() * (w - 6)), ty = 3 + Math.floor(rand() * (h - 6));
      if (forbidden.has(`${tx},${ty}`)) continue;
      props.push({ type: 'crystal', x: pc(tx), y: pc(ty) });
      blockTile(tx, ty);
    }
  }

  const slimes = slimeSpots.map((s) => ({ x: pc(s.tx), y: pc(s.ty), variant: th.slimeVariant }));

  const portals = [
    { rect: { x: lairDoorX - 128, y: 0, w: 256, h: 200 }, to: ch.lairKey, spawn: 'fromField',
      label: ch.lairDoorLabel || '巢穴封印', requires: { ch: ch.id, flag: 'gateOpen' }, lockHint: '巢穴之门纹丝不动……' },
  ];
  if (ch.prevKey) {
    portals.push({ rect: { x: px(3.6), y: px(h) - 200, w: 256, h: 200 }, to: ch.prevKey, spawn: 'fromNext', label: '返回上一章' });
  }
  if (ch.nextKey) {
    portals.push({ rect: { x: px(w) - 200, y: px(midY - 1), w: 200, h: 384 }, to: ch.nextKey, spawn: 'fromPrev',
      label: ch.nextDoorLabel || '前往下一章', requires: { ch: ch.id, flag: 'done' }, lockHint: '迷雾封锁着前方……' });
  }

  return {
    key: ch.fieldKey,
    name: ch.fieldName,
    w, h,
    grid,
    colliding: dungeonStyle ? [T.DWALL, T.VOID] : [T.WATER, T.WATER2],
    ambient: dungeonStyle ? (th.ambient ?? 0x241f33) : null,
    spawns,
    props,
    slimes,
    portals,
  };
}

export function buildLair(ch) {
  const th = ch.theme || {};
  const w = th.lairW || 30, h = th.lairH || 24;
  const rand = lcg((th.seed || 1000 + ch.id * 77) + 13);
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => T.DFLOOR));

  for (let x = 0; x < w; x++) { grid[0][x] = T.DWALL; grid[h - 1][x] = T.DWALL; }
  for (let y = 0; y < h; y++) { grid[y][0] = T.DWALL; grid[y][w - 1] = T.DWALL; }
  // BOSS 巢穴（上）/ 大厅（中）/ 入口（下），中央开门洞
  const midX = Math.floor(w / 2);
  for (let x = 1; x < w - 1; x++) { grid[7][x] = T.DWALL; grid[h - 6][x] = T.DWALL; }
  for (const x of [midX, midX + 1]) { grid[7][x] = T.DFLOOR; grid[h - 6][x] = T.DFLOOR; }

  const torches = [[3, 2], [w - 4, 2], [3, h - 3], [w - 4, h - 3], [midX, 2], [4, 11], [w - 5, 11]]
    .map(([tx, ty]) => ({ type: 'torch', x: pc(tx), y: pc(ty) + 32 }));

  // 大厅水晶（避开中央门洞与符文位）
  const used = new Set(['5,11', `${w - 6},11`, `6,${h - 4}`, `${w - 7},${h - 4}`, `${midX},8`, `${midX + 1},8`, `${midX},9`, `${midX + 1},9`]);
  const crystals = [];
  for (let i = 0; i < 7; i++) {
    const tx = 3 + Math.floor(rand() * (w - 6)), ty = 8 + Math.floor(rand() * (h - 14));
    const key = `${tx},${ty}`;
    if (used.has(key)) continue;
    used.add(key);
    crystals.push({ type: 'crystal', x: pc(tx), y: pc(ty) });
  }

  // 祝福符文（大厅与入口，避开中央通道）
  const healSpots = [[5, 11], [w - 6, 11], [6, h - 4], [w - 7, h - 4]];
  const heal = [];
  for (let i = 0; i < (th.lairHealRunes ?? 3); i++) {
    const [tx, ty] = healSpots[i % healSpots.length];
    heal.push({ type: 'rune', x: pc(tx), y: pc(ty), qid: `c${ch.id}l${i + 1}`, healRune: true });
  }

  return {
    key: ch.lairKey,
    name: ch.lairName,
    w, h,
    grid,
    colliding: [T.DWALL, T.VOID],
    ambient: th.lairAmbient ?? 0x1c1730,
    spawns: { fromField: { x: pc(midX + 0.5), y: px(h - 3.2) } },
    props: [
      ...torches,
      ...crystals,
      ...heal,
      { type: 'rune', x: pc(midX + 0.5), y: pc(9), qid: `c${ch.id}boss`, bossRune: true },
      { type: 'door', x: pc(midX + 0.5), y: px(h - 1.6) },
    ],
    slimes: [
      { x: pc(midX - 4), y: pc(11) },
      { x: pc(midX + 4), y: pc(11) },
      { x: pc(midX), y: pc(h - 8) },
    ],
    boss: { type: ch.boss, x: pc(midX + 0.5), y: pc(4) },
    portals: [
      { rect: { x: pc(midX + 0.5) - 112, y: px(h) - 220, w: 224, h: 220 }, to: ch.fieldKey, spawn: 'fromLair', label: ch.fieldName },
    ],
  };
}
