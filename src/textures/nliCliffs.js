// NLI 崖面模块：两个职责清晰分段 ——
//   ① 纯掩码逻辑（computeCliffCells，无 Phaser/canvas/DOM 依赖；Task 5 快照依赖其确定性）；
//   ② overlay 渲染（renderCliffOverlay，Task 4 追加；仅 native 场景运行时调用，用 DOM canvas）。
// 输出确定性保证：行主序遍历、无随机、无外部状态（Task 5 快照依赖此性质）。
import { T } from '../data/maps.js';
import { NLI_TERRAIN_ASSETS } from './nliGroundProfiles.js';

// 崖面渲染常量（供后续渲染任务使用；此处仅作纯数据导出）。
// 2026-10-30 显示层几何修订（用户批准的 display-only 变更；碰撞/网格/掩码一律不动）：
// 南水缘真实碰撞停靠（Arcade body 底 = 水界 2432）时，可见内容最底只到
// feet+6 = 边界−38（碰撞体低于脚锚 44px、精灵可见底低于脚锚 ≤6px ⇒ 38px 死区），
// 旧 LIP=8 的 S 带顶在边界−8，整条带位于可见内容之下 → 停靠处 0px 遮挡（task5
// 三拍法实测基线）。LIP=64（半格唇）后带顶 = 边界−64，越过死区 26px，下身被真实
// 压住；REACH=96 保持不变（伸入水格量不动）；FH = LIP+REACH = 160，
// S 带源 510px 高的纵向压缩由 4.9:1 改善为 510/160 ≈ 3.19:1。
export const CLIFF = Object.freeze({ LIP: 64, REACH: 96, FH: 160 });

// 边位序与 ground.js 的 adjacentMask 一致：W=1, E=2, N=4, S=8
const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const INDOOR = new Set([T.DFLOOR, T.DWALL]);

export function isWaterTile(v) {
  return v === T.WATER || v === T.WATER2 || v === T.WATER3;
}

// 遍历网格，对每个陆格（非水、非地牢地板/墙）做 4 邻接水探测；
// 越界邻格视为非水。仅返回至少有一边邻水的格子。
export function computeCliffCells(def) {
  const cells = [];
  const grid = def.grid;
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const v = row[x];
      if (isWaterTile(v) || INDOOR.has(v)) continue;
      let edges = 0;
      for (let bit = 0; bit < 4; bit++) {
        const [dx, dy] = SIDES[bit];
        if (isWaterTile(grid[y + dy]?.[x + dx])) edges |= 1 << bit;
      }
      if (edges) cells.push({ x, y, edges });
    }
  }
  return cells;
}

// ================================================================
// ② overlay 渲染（Task 4 追加；渲染几何沿用原型 .scratch/nli-terrain-spike/build_spike.py
//    的实测结构，几何常量均标注出处）。以下代码用 DOM canvas，仅浏览器运行时调用。
// ================================================================

const TILE = 128; // 与 ground.js 的 TILE 一致（世界格边长，世界像素）

// 崖面 recipe 版本（缓存 key 前缀）：升级即强制崖 overlay 缓存失效。
// v4 = 2026-10-30 显示层几何修订（CLIFF LIP 8→64 / FH 104→160，REACH 不变）。
// 缓存 key = `${CLIFF_RECIPE}:${def.key}` —— 场景标识段 def.key 与 groundCacheKey(def)
// 用的同一段（ground.js groundCacheKey 内部即 def.key），见 Task 4 控制方裁定。
export const CLIFF_RECIPE = 'nli02-cliff-v4';

/** 崖 overlay 画布缓存 key（与 groundCacheKey 的场景标识段保持一致）。 */
export function cliffCacheKey(def) {
  return `${CLIFF_RECIPE}:${def.key}`;
}

// —— 渲染几何常量（原型 build_spike.py 实测；S 几何即 CLIFF 常量的复述）——
// S 正面崖：FH = LIP(64) + REACH(96)；条带底对齐陆格下缘（LIP 压陆格、REACH 伸入南水格）。
// 2026-10-30 显示层修订仅动 CLIFF 常量（LIP/FH），以下 E/W 与 N 常量一律未动。
// E/W 侧壁窄条：6px 压陆格 + 46px 伸入水格（原型 EW=46 + 唇 6），高 TILE+12 上下各探 6px。
const EW_LIP = 6;       // 侧壁压陆格宽（原型：侧壁条 6px 唇压陆格）
const EW_REACH = 46;    // 侧壁伸入水格宽（原型 EW）
const EW_OVER = 6;      // 侧壁上下探出量（原型 y 偏移 -6；高 TILE+12）
const N_LIP_H = 18;     // N 草唇贴片高（原型 N_LIP → (128,18)）
const N_LIP_OVER = 10;  // N 草唇上探量：画在 y*TILE-10（原型 lip 摆位）
const N_SHADOW_H = 26;  // 合成阴影带高（原型 grad 26px；见下方 SYNTHETIC 注释）

// S 源窗分段：源图 cliff_s_band.png 550×510；段窗宽 128（=TILE，1:1 横向取窗），
// 步长 64（相邻段窗 50% 重叠）→ n=7 段。段号 (x*3+y*5)%n 按格换源窗，
// 避免同向连续崖重复同一段纹理（原型 s_band 换窗做法的逐格化）。
const SEG_W = 128;
const SEG_STEP = 64;

function canvasOf(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function sourceImage(scene, key) {
  if (!scene.textures.exists(key)) return null;
  return scene.textures.get(key)?.getSourceImage?.() || null;
}

// 预缩放贴片（渲染时只 drawImage 已备好的贴片，源图只缩放一次）：
// 侧壁 E 用源图原样、W 水平镜像（沿用原型 side_strip 的 E 原样 / W mirror 取向）。
function prepStrips(ewSrc) {
  const mk = (mirror) => {
    const c = canvasOf(EW_LIP + EW_REACH, TILE + EW_OVER * 2);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(ewSrc, 0, 0, ewSrc.width, ewSrc.height,
      mirror ? -c.width : 0, 0, c.width, c.height); // 轻微非等比（原型同为非等比）
    return c;
  };
  return { east: mk(false), west: mk(true) };
}

function prepSBandSegments(sSrc) {
  const n = Math.floor((sSrc.width - SEG_W) / SEG_STEP) + 1;
  const segs = [];
  for (let i = 0; i < n; i++) {
    const c = canvasOf(TILE, CLIFF.FH);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sSrc, i * SEG_STEP, 0, SEG_W, sSrc.height, 0, 0, TILE, CLIFF.FH);
    segs.push(c);
  }
  return { segs, n };
}

function prepNLip(nSrc) {
  const c = canvasOf(TILE, N_LIP_H);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(nSrc, 0, 0, nSrc.width, nSrc.height, 0, 0, TILE, N_LIP_H);
  return c;
}

/**
 * 崖面 overlay 渲染（Task 4）：把 computeCliffCells 的边掩码画成透明画布并注册为
 * scene 纹理。画布尺寸恰为 def.w*TILE × def.h*TILE，不向外扩张（越界笔迹由 canvas
 * 自动裁剪）；S/N/W/E 各边均只在掩码为真时绘制，几何上天然不出画布。
 * 画布缓存：同 key 直接复用（scene.textures 已注册即返回）。
 * @param {Phaser.Scene} scene 已加载 NLI 崖面资产的场景
 * @param {object} def 地图定义（key/w/h/grid；grid 只读）
 * @returns {{key: string, canvas: HTMLCanvasElement}}
 */
export function renderCliffOverlay(scene, def) {
  const key = cliffCacheKey(def);
  if (scene.textures.exists(key)) return { key, canvas: scene.textures.get(key).getSourceImage() };

  const img = (asset) => {
    const i = sourceImage(scene, asset);
    if (!i) throw new Error(`NLI cliff missing: ${asset}`);
    return i;
  };
  const sSrc = img(NLI_TERRAIN_ASSETS.cliffS);
  const ewSrc = img(NLI_TERRAIN_ASSETS.cliffEW);
  const nSrc = img(NLI_TERRAIN_ASSETS.cliffN);
  const sBand = prepSBandSegments(sSrc);
  const strips = prepStrips(ewSrc);
  const lip = prepNLip(nSrc);

  const canvas = canvasOf(def.w * TILE, def.h * TILE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const cells = computeCliffCells(def);

  // 绘制顺序沿用原型：N（阴影+唇）→ E/W 侧壁 → S 正面崖最后（S 压顶覆盖侧壁接缝）。
  for (const { x, y, edges } of cells) {
    const dx = x * TILE, dy = y * TILE;
    if (edges & 4) { // N
      // SYNTHETIC（合成非原生）：本画风资产包无北向崖面原生素材 ——
      // 用深蓝绿渐变阴影带 rgba(20,44,60,0→.35) 画在北水格上模拟背光暗化，
      // 下方原生草唇贴片收边。颜色/不透明度按 Task 4 简报规定。
      const g = ctx.createLinearGradient(0, dy - N_SHADOW_H, 0, dy);
      g.addColorStop(0, 'rgba(20,44,60,0)');
      g.addColorStop(1, 'rgba(20,44,60,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(dx, dy - N_SHADOW_H, TILE, N_SHADOW_H);
      ctx.drawImage(lip, dx, dy - N_LIP_OVER);
    }
    if (edges & 2) { // E：6px 唇压陆格东缘 + 46px 伸入东水格
      ctx.drawImage(strips.east, dx + TILE - EW_LIP, dy - EW_OVER);
    }
    if (edges & 1) { // W：46px 伸入西水格 + 6px 唇压陆格西缘
      ctx.drawImage(strips.west, dx - EW_REACH, dy - EW_OVER);
    }
  }
  for (const { x, y, edges } of cells) {
    if (edges & 8) { // S：底对齐陆格下缘 —— LIP 压陆格底、REACH 伸入南水格
      const seg = sBand.segs[(x * 3 + y * 5) % sBand.n];
      ctx.drawImage(seg, x * TILE, (y + 1) * TILE - CLIFF.LIP);
    }
  }

  scene.textures.addCanvas(key, canvas);
  return { key, canvas };
}
