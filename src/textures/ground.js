// ============================================================
// 整图地面画布：CC0 素材拼合
// - 野外（村庄/森林）：Kenney Tiny Town 草地/花地/土路 + 自绘水面
//   （Tiny Town 无水 tile，按其平涂+深紫描边风格自绘）
// - 室内（地牢/洞窟）：0x72 floor_* 石地 + wall_mid / wall_top_mid
//   立体砖墙；洞窟叠加紫调
// 碰撞仍由 WorldScene 的静态矩形承担，画布只负责渲染
// ============================================================
import { T } from '../data/maps.js';

const TILE = 16;
const S = 1;

// Kenney 风格水色（与 Tiny Town 调色板同族）
const WATER = {
  base: '#5ca4d9', dark: '#4a8ec4', light: '#8cc4e8', foam: '#eafcff', line: '#3f2631',
};

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function makeGroundTexture(scene, def) {
  const key = `ground_${def.key}`;
  if (scene.textures.exists(key)) return key;

  const indoor = def.key === 'Dungeon' || def.key === 'Cave';
  const canvas = document.createElement('canvas');
  canvas.width = def.w * TILE * S;
  canvas.height = def.h * TILE * S;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(S, S);

  // 从纹理缓存取 tile 源图（BootScene 已加载）
  const src = (k) => {
    const tex = scene.textures.get(k);
    return tex && tex.getSourceImage ? tex.getSourceImage() : null;
  };
  const drawTile = (k, x, y) => {
    const img = src(k);
    if (img) ctx.drawImage(img, x * TILE, y * TILE);
    else { ctx.fillStyle = '#f0f'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); } // 缺失提示
  };

  const at = (x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h) ? null : def.grid[y][x];
  const isWater = (v) => v === T.WATER || v === T.WATER2 || v === T.WATER3;
  const isPath = (v) => v === T.PATH;
  const isGrassy = (v) => v !== null && !isWater(v) && !isPath(v) && v !== T.DWALL && v !== T.VOID;

  if (indoor) {
    drawIndoor(ctx, def, drawTile, at);
  } else {
    drawOutdoor(ctx, def, drawTile, at, isWater, isPath, isGrassy);
  }

  scene.textures.addCanvas(key, canvas);
  return key;
}

/** 野外：Kenney Tiny Town 拼贴 */
function drawOutdoor(ctx, def, drawTile, at, isWater, isPath, isGrassy) {
  const rand = rng(def.key === 'Forest' ? 20261001 : 20260916);

  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      if (isWater(v)) {
        drawWater(ctx, x, y, at, isWater, rand);
      } else if (isPath(v)) {
        // 土路：基础 + 邻接草地侧的草色咬边
        drawTile('tt_25', x, y);
        const grass = (dx, dy) => isGrassy(at(x + dx, y + dy));
        if (grass(0, -1)) grassEdge(ctx, x, y, 'n');
        if (grass(0, 1)) grassEdge(ctx, x, y, 's');
        if (grass(-1, 0)) grassEdge(ctx, x, y, 'w');
        if (grass(1, 0)) grassEdge(ctx, x, y, 'e');
        if (rand() < 0.3) { // 鹅卵石点缀
          ctx.fillStyle = '#cf8254';
          ctx.fillRect(x * TILE + 3 + (rand() * 9 | 0), y * TILE + 3 + (rand() * 9 | 0), 2, 2);
        }
      } else {
        // 草地：纯草 / 草变体 / 花地
        if (v === T.FLOWER) drawTile('tt_2', x, y);
        else if (v === T.GRASS3) drawTile('tt_1', x, y);   // 深草丛 → 草变体
        else if (v === T.GRASS4) drawTile(rand() < 0.5 ? 'tt_0' : 'tt_2', x, y); // 碎石小花
        else drawTile(rand() < 0.75 ? 'tt_0' : 'tt_1', x, y);
      }
    }
  }
}

/** 土路邻接草地的咬边：草色条 + 深紫描边线 */
function grassEdge(ctx, x, y, side) {
  const px0 = x * TILE, py0 = y * TILE;
  const E = 4;
  ctx.fillStyle = '#84c669';
  ctx.fillStyle = '#84c669';
  if (side === 'n') { ctx.fillRect(px0, py0, 16, E); ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0 + E, 16, 1); }
  if (side === 's') { ctx.fillRect(px0, py0 + 16 - E, 16, E); ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0 + 16 - E - 1, 16, 1); }
  if (side === 'w') { ctx.fillRect(px0, py0, E, 16); ctx.fillStyle = WATER.line; ctx.fillRect(px0 + E, py0, 1, 16); }
  if (side === 'e') { ctx.fillRect(px0 + 16 - E, py0, E, 16); ctx.fillStyle = WATER.line; ctx.fillRect(px0 + 16 - E - 1, py0, 1, 16); }
}

/** Kenney 风格水面：平涂蓝 + 波纹 + 靠岸描边/浅水带 */
function drawWater(ctx, x, y, at, isWater, rand) {
  const px0 = x * TILE, py0 = y * TILE;
  ctx.fillStyle = WATER.base;
  ctx.fillRect(px0, py0, 16, 16);
  // 深色水斑
  if (rand() < 0.5) {
    ctx.fillStyle = WATER.dark;
    ctx.fillRect(px0 + 2 + (rand() * 10 | 0), py0 + 2 + (rand() * 10 | 0), 3, 2);
  }
  // 浅色波纹
  ctx.fillStyle = WATER.light;
  const wx = px0 + 2 + (rand() * 8 | 0), wy = py0 + 3 + (rand() * 9 | 0);
  ctx.fillRect(wx, wy, 4, 1);
  ctx.fillRect(px0 + 10 - (rand() * 4 | 0), py0 + 10 + (rand() * 3 | 0), 3, 1);
  // 波光点
  if (rand() < 0.5) {
    ctx.fillStyle = WATER.foam;
    ctx.fillRect(px0 + 3 + (rand() * 10 | 0), py0 + 3 + (rand() * 10 | 0), 2, 1);
  }
  // 靠岸一侧：浅水带 + 深紫岸线（Kenney 通用描边色）
  const land = (dx, dy) => {
    const v = at(x + dx, y + dy);
    return v === null || !isWater(v);
  };
  ctx.fillStyle = WATER.light;
  if (land(0, -1)) { ctx.fillRect(px0, py0, 16, 2); ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0, 16, 1); ctx.fillStyle = WATER.light; }
  if (land(0, 1)) { ctx.fillRect(px0, py0 + 14, 16, 2); ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0 + 15, 16, 1); ctx.fillStyle = WATER.light; }
  if (land(-1, 0)) { ctx.fillRect(px0, py0, 2, 16); ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0, 1, 16); ctx.fillStyle = WATER.light; }
  if (land(1, 0)) { ctx.fillRect(px0 + 14, py0, 2, 16); ctx.fillStyle = WATER.line; ctx.fillRect(px0 + 15, py0, 1, 16); }
  // 外角：斜切岸线（角落像素）
  if (land(0, -1) && land(-1, 0)) { ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0, 1, 2); ctx.fillRect(px0, py0, 2, 1); }
  if (land(0, -1) && land(1, 0)) { ctx.fillStyle = WATER.line; ctx.fillRect(px0 + 15, py0, 1, 2); ctx.fillRect(px0 + 14, py0, 2, 1); }
  if (land(0, 1) && land(-1, 0)) { ctx.fillStyle = WATER.line; ctx.fillRect(px0, py0 + 15, 1, 1); ctx.fillRect(px0, py0 + 14, 1, 1); ctx.fillRect(px0 + 1, py0 + 15, 1, 1); }
  if (land(0, 1) && land(1, 0)) { ctx.fillStyle = WATER.line; ctx.fillRect(px0 + 15, py0 + 15, 1, 1); ctx.fillRect(px0 + 15, py0 + 14, 1, 1); ctx.fillRect(px0 + 14, py0 + 15, 1, 1); }
}

/** 室内：0x72 石地 + 立体砖墙 */
function drawIndoor(ctx, def, drawTile, at) {
  const rand = rng(20260917);
  const floors = def.key === 'Cave' ? ['floor_1', 'floor_2', 'floor_3'] : ['floor_1', 'floor_2', 'floor_3'];
  const isWall = (v) => v === T.DWALL || v === T.VOID;

  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      if (v === T.DWALL) {
        // 下方仍是墙 → 亮色顶面；下方是地板 → 暗色立面
        const below = at(x, y + 1);
        drawTile(below !== null && isWall(below) ? 'wall_top_mid' : 'wall_mid', x, y);
      } else if (v === T.VOID) {
        ctx.fillStyle = '#191525';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      } else {
        drawTile(floors[Math.floor(rand() * floors.length)], x, y);
      }
    }
  }

  // 洞窟：叠紫调（与 ambient 0x1c1730 呼应）
  if (def.key === 'Cave') {
    ctx.fillStyle = 'rgba(90,70,150,0.22)';
    ctx.fillRect(0, 0, def.w * TILE, def.h * TILE);
  }
}
