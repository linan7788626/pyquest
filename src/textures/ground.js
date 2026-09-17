// ============================================================
// 整图地面画布：把每格地形瓦片绘制成一张高清画布贴图
// （替代瓦片图集 + Tilemap 渲染；碰撞改由 WorldScene 的静态矩形承担）
// 三遍绘制：① 陆地底色/细节 ② 全图大尺度连续光影 ③ 水面
// 亮点：土路圆角自适应连接、连续草地光影（无棋盘格）、水岸浅水过渡
// ============================================================
import { drawGroundTile, rng, rg } from './pixelArt.js';

const TILE = 16;
const S = 2; // 地面用 2x 超采样：相机 2x 后约 1 纹素/屏幕像素，避免 4x 缩小产生摩尔纹

export function makeGroundTexture(scene, def) {
  const key = `ground_${def.key}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = def.w * TILE * S;
  canvas.height = def.h * TILE * S;
  const ctx = canvas.getContext('2d');
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

  // ---------- 第二遍：全图大尺度柔光斑（连续的草地光影，跨瓦片无格子感） ----------
  const R = rng(97);
  const W = def.w * TILE, H = def.h * TILE;
  const blobs = Math.ceil((def.w * def.h) / 12);
  for (let i = 0; i < blobs; i++) {
    const bx = R() * W, by = R() * H, br = 26 + R() * 55;
    const light = R() < 0.55;
    ctx.fillStyle = light
      ? rg(ctx, bx, by, br, [[0, 'rgba(255,255,232,0.07)'], [1, 'rgba(255,255,232,0)']])
      : rg(ctx, bx, by, br, [[0, 'rgba(52,112,46,0.06)'], [1, 'rgba(52,112,46,0)']]);
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
