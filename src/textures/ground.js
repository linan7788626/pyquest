// ============================================================
// 整图地面画布：Tiny Swords tileset 拼接
// - 野外（村庄/森林）：TS tilemap 16 草变体随机铺贴（无缝）、
//   土路用沙黄配色（color4）+ 邻接圆角、水用官方水底色 + 波纹变体
// - 室内（地牢/洞窟）：程序化深色石砖（TS 深紫配色体系）
// 岸边泡沫由 WorldScene 叠 Water Foam 动画
// 碰撞仍由 WorldScene 的静态矩形承担，画布只负责渲染
// ============================================================
import { T } from '../data/maps.js';
import { GRASS_TILES, WATER_TILES, WATER_BG } from '../assets/ts.js';

const TILE = 128; // tilemap 元素 ×2（TS tile 64px → 128px 网格）

// 确定性伪随机（与地图布局一致）
function lcg(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** 野外：平整大草原 + TS 装饰点缀 */
function drawOutdoor(ctx, def, tilesets, scene) {
  const grassImg = tilesets[def.key === 'Forest' ? 'forest' : 'grass'];
  const pathImg = tilesets.path;
  const rand = lcg(def.key === 'Forest' ? 20261001 : 20260916);

  const at = (x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h) ? null : def.grid[y][x];
  const isWater = (v) => v === T.WATER || v === T.WATER2 || v === T.WATER3;
  const isPath = (v) => v === T.PATH;

  // ---------- 第一遍：地形 ----------
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      const dx = x * TILE, dy = y * TILE;
      if (isWater(v)) {
        // 统一纯底色 + 程序化波纹（TS 水波 tile 有透明区，混铺会产生色块 → 不用）
        ctx.fillStyle = WATER_BG;
        ctx.fillRect(dx, dy, TILE, TILE);
        const r = lcg(x * 7919 + y * 104729 + 17);
        if (r() < 0.5) {
          ctx.fillStyle = 'rgba(140,195,196,0.85)';
          const wx = dx + 12 + r() * 72, wy = dy + 16 + r() * 88;
          ctx.fillRect(wx, wy, 28 + r() * 20, 6);
          ctx.fillRect(wx + 8, wy + 16 + r() * 12, 16 + r() * 16, 4);
        }
        if (r() < 0.22) {
          ctx.fillStyle = 'rgba(60,120,130,0.3)';
          ctx.fillRect(dx + 20 + r() * 60, dy + 24 + r() * 64, 32 + r() * 24, 12);
        }
        if (r() < 0.25) {
          ctx.fillStyle = 'rgba(234,252,255,0.8)';
          ctx.fillRect(dx + 16 + r() * 88, dy + 16 + r() * 88, 6, 4);
        }
      } else if (isPath(v)) {
        // 沙黄土路：圆角连接（外角内收）
        const nb = {
          l: isPath(at(x - 1, y)), r: isPath(at(x + 1, y)),
          t: isPath(at(x, y - 1)), b: isPath(at(x, y + 1)),
        };
        const [tx, ty] = GRASS_TILES[Math.floor(rand() * 4)]; // 前 4 个素净变体
        ctx.save();
        ctx.beginPath();
        const R = 28;
        const r = (a, b) => (!a && !b ? R : 0);
        ctx.roundRect(dx + 4, dy + 4, TILE - 8, TILE - 8,
          [r(nb.l, nb.t), r(nb.t, nb.r), r(nb.r, nb.b), r(nb.b, nb.l)].map((v) => v || 4));
        ctx.clip();
        ctx.drawImage(pathImg, tx * 64, ty * 64, 64, 64, dx, dy, TILE, TILE);
        ctx.restore();
      } else {
        // 平整连续大草原：单一纯草 tile 平铺（无变体混拼 → 完全连续无缝）
        ctx.drawImage(grassImg, 1 * 64, 1 * 64, 64, 64, dx, dy, TILE, TILE);
        // 花地瓦片叠加小花（柔和圆形）
        if (v === T.FLOWER) {
          const r = lcg(x * 7919 + y * 104729 + 5);
          for (let i = 0; i < 3; i++) {
            const fx = dx + 20 + r() * 88, fy = dy + 20 + r() * 88;
            ctx.fillStyle = ['#ffd257', '#ff8aa0', '#fff5f0', '#e86a92'][Math.floor(r() * 4)];
            ctx.beginPath();
            ctx.arc(fx, fy, 5 + r() * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fffbe8';
            ctx.beginPath();
            ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // ---------- 第二遍：TS 装饰随机点缀（草原/水岸/花地的视觉丰富层） ----------
  decorateGround(ctx, def, scene, at, isWater, isPath);
}

/** 草地装饰（静态，画进整图地面）：灌木/岩石 随机散布 */
function decorateGround(ctx, def, scene, at, isWater, isPath) {
  const tex = (k) => {
    const t = scene.textures.get(k);
    return t && t.getSourceImage ? t.getSourceImage() : null;
  };
  const landDecor = [
    'bush1', 'bush2', 'bush3', 'bush4',       // 灌木（128×128 帧，取首帧）
    'rock1', 'rock2', 'rock3', 'rock4',       // 岩石（64×64）
  ];
  const waterDecor = ['waterRock1', 'waterRock2', 'waterRock3', 'waterRock4']; // 64×64（取首帧）

  // 装饰散布密度：每 ~6 个草地格 1 个装饰（约 16% 格子）
  const rand = lcg(def.key === 'Forest' ? 777 : 555);
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      if (isWater(v) || isPath(v) || v === T.DWALL || v === T.VOID) continue;
      if (rand() > 0.16) continue;
      // 避开出生点附近（前 3 行 / 玩家常走的路两侧不严格限制）
      const dx = x * TILE, dy = y * TILE;
      const isBush = rand() < 0.55;
      const key = isBush
        ? landDecor[Math.floor(rand() * 4)]
        : landDecor[4 + Math.floor(rand() * 4)];
      const img = tex(key);
      if (!img) continue;
      // 灌木帧 128×128（取首帧 1/8 宽）；岩石 64×64
      const sw = isBush ? 128 : 64, sh = isBush ? 128 : 64;
      // 随机翻转 + 尺寸 0.7~1.0（视觉多样性）
      const s = 0.7 + rand() * 0.3;
      const dw = (isBush ? 128 : 64) * s, dh = sh * s;
      const ox = dx + rand() * (TILE - dw), oy = dy + rand() * (TILE - dh * 0.5) - dh * 0.2;
      ctx.save();
      if (rand() < 0.5) { ctx.translate(ox + dw, oy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh); }
      else ctx.drawImage(img, 0, 0, sw, sh, ox, oy, dw, dh);
      ctx.restore();
    }
  }

  // 水面装饰：水岩（靠岸水域）+ 橡皮鸭（开阔水面）
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      if (!isWater(def.grid[y][x])) continue;
      const r = lcg(x * 31337 + y * 4242 + 99);
      // 四邻有陆地 → 候选水岩（10%）
      const nb = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
      const nearLand = nb.some(([nx, ny]) => {
        const inside = nx >= 0 && ny >= 0 && nx < def.w && ny < def.h;
        return !inside || !isWater(def.grid[ny][nx]);
      });
      const dx = x * TILE, dy = y * TILE;
      if (nearLand && r() < 0.1) {
        const img = tex(waterDecor[Math.floor(r() * 4)]);
        if (!img) continue;
        const s = 0.7 + r() * 0.3;
        // 水岩贴岸摆放（向陆地一侧偏移）
        ctx.drawImage(img, 0, 0, 64, 64, dx + r() * 40, dy + r() * 40, 64 * s, 64 * s);
      } else if (!nearLand && r() < 0.05) {
        // 开阔水面的橡皮鸭（96×32 静态图）
        const img = tex('duck');
        if (!img) continue;
        const s = 0.8 + r() * 0.4;
        ctx.drawImage(img, dx + 20 + r() * 40, dy + 40 + r() * 40, 96 * s * 0.7, 32 * s * 0.7);
      }
    }
  }
}

/** 室内（地牢/洞窟）：程序化深色石砖（TS 深紫配色体系） */
function drawIndoor(ctx, def) {
  const rand = lcg(20260917);
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      const dx = x * TILE, dy = y * TILE;
      if (v === T.DWALL) {
        // 墙体：深色顶面 + 立面阴影 + 砖缝
        ctx.fillStyle = def.key === 'Cave' ? '#241f38' : '#2c2742';
        ctx.fillRect(dx, dy, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(dx, dy, TILE, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        for (let r = 0; r < 4; r++) {
          const yy = dy + r * 16 + 8;
          ctx.beginPath(); ctx.moveTo(dx, yy); ctx.lineTo(dx + TILE, yy); ctx.stroke();
          const off = r % 2 ? 16 : 48;
          ctx.beginPath(); ctx.moveTo(dx + off, yy - 16); ctx.lineTo(dx + off, yy); ctx.stroke();
        }
      } else if (v === T.VOID) {
        ctx.fillStyle = '#191525';
        ctx.fillRect(dx, dy, TILE, TILE);
      } else {
        // 地板：石板 + 噪点 + 零星小石子
        ctx.fillStyle = def.key === 'Cave' ? '#332d4d' : '#3a3552';
        ctx.fillRect(dx, dy, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(dx, dy, TILE, 2);
        ctx.fillRect(dx, dy, 2, TILE);
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
          ctx.fillRect(dx + rand() * 60, dy + rand() * 60, 2 + rand() * 3, 2 + rand() * 3);
        }
        if (rand() < 0.12) {
          ctx.fillStyle = 'rgba(140,130,180,0.25)';
          ctx.beginPath();
          ctx.ellipse(dx + 12 + rand() * 40, dy + 12 + rand() * 40, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

export function makeGroundTexture(scene, def) {
  const key = `ground_${def.key}`;
  if (scene.textures.exists(key)) return key;

  const indoor = def.key === 'Dungeon' || def.key === 'Cave';
  const canvas = document.createElement('canvas');
  canvas.width = def.w * TILE;
  canvas.height = def.h * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 像素完美拼接

  if (indoor) {
    drawIndoor(ctx, def);
  } else {
    // 从 Phaser 纹理缓存取 tileset 源图（BootScene 已加载）
    const tilesets = {};
    for (const k of ['grass', 'forest', 'path', 'water']) {
      const tex = scene.textures.get(k);
      tilesets[k] = tex && tex.getSourceImage ? tex.getSourceImage() : null;
    }
    if (!tilesets.grass || !tilesets.path || !tilesets.water) {
      // 兜底：TS 素材未就绪时用草绿纯色（不应发生；smoke 走 stub 分支）
      ctx.fillStyle = '#93ba4f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      drawOutdoor(ctx, def, tilesets, scene);
    }
  }

  scene.textures.addCanvas(key, canvas);
  return key;
}
