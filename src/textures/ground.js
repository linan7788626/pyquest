// ============================================================
// 整图地面画布：像素地形拼接（1:1，无超采样）
// - 草地：草色变体 + 草叶簇（pixelArt.drawGroundTile）
// - 土路：邻接圆角 + 边缘压暗 + 噪点/鹅卵石
// - 水面：波纹帧 + 岸边浅水/泡沫
// - 地牢：石板/砖（程序化像素）
// 碰撞由 WorldScene 的静态矩形承担，画布只负责渲染
// ============================================================
import { drawGroundTile, rng, rg } from './pixelArt.js';

const TILE = 16;
const S = 1; // 像素版：1:1 绘制（相机 4x 整数放大 → 锐利）

export function makeGroundTexture(scene, def) {
  const key = `ground_${def.key}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = def.w * TILE * S;
  canvas.height = def.h * TILE * S;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 像素完美
  ctx.scale(S, S);

  const at = (x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h) ? null : def.grid[y][x];
  const isPath = (v) => v === 2;
  const isWater = (v) => v === 3 || v === 4 || v === 9;

  const tileRand = (x, y) => rng(x * 7919 + y * 104729 + 13);
  const land = [];
  const water = [];
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const v = def.grid[y][x];
      (isWater(v) ? water : land).push({ x, y, v });
    }
  }

  // ---------- 第一遍：陆地（草地/土路/花地）底色与细节 ----------
  for (const { x, y, v } of land) {
    const rand = tileRand(x, y);
    ctx.save();
    ctx.translate(x * TILE, y * TILE);
    if (isPath(v)) {
      // 土路：按邻接情况圆角连接，形成有机路径形状
      const nb = {
        l: isPath(at(x - 1, y)), r: isPath(at(x + 1, y)),
        t: isPath(at(x, y - 1)), b: isPath(at(x, y + 1)),
      };
      const RC = 3.6;
      const corners = [
        (!nb.l && !nb.t) ? RC : 0, // tl
        (!nb.r && !nb.t) ? RC : 0, // tr
        (!nb.r && !nb.b) ? RC : 0, // br
        (!nb.l && !nb.b) ? RC : 0, // bl
      ];
      drawGroundTile(ctx, v, rand, { corners, nb });
    } else {
      drawGroundTile(ctx, v, rand, { gx: x, gy: y });
    }
    ctx.restore();
  }

  // ---------- 第二遍：全图大尺度明暗斑（低对比色斑，跨瓦片连续） ----------
  const R = rng(97);
  const W = def.w * TILE, H = def.h * TILE;
  const blobs = Math.ceil((def.w * def.h) / 12);
  for (let i = 0; i < blobs; i++) {
    const bx = R() * W, by = R() * H, br = 26 + R() * 55;
    ctx.fillStyle = R() < 0.55
      ? rg(ctx, bx, by, br, [[0, 'rgba(255,255,220,0.05)'], [1, 'rgba(255,255,220,0)']])
      : rg(ctx, bx, by, br, [[0, 'rgba(50,100,40,0.05)'], [1, 'rgba(50,100,40,0)']]);
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- 第三遍：水面（波纹 + 岸边浅水过渡） ----------
  for (const { x, y, v } of water) {
    const rand = tileRand(x, y);
    ctx.save();
    ctx.translate(x * TILE, y * TILE);
    const edges = {
      n: !isWater(at(x, y - 1)), s: !isWater(at(x, y + 1)),
      w: !isWater(at(x - 1, y)), e: !isWater(at(x + 1, y)),
    };
    drawGroundTile(ctx, v, rand, { edges, gx: x, gy: y });
    ctx.restore();
  }

  scene.textures.addCanvas(key, canvas);
  return key;
}
