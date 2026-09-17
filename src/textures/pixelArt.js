// ============================================================
// 程序化贴图（游戏专属元素）
// 角色/地形/建筑使用 CC0 素材（src/assets/cc0.js），
// 这里只生成带有游戏身份、无现成素材的元素：
// 符文石 / 代码碎片 / 爱心 / 传送门 / 函数石碑 / 水晶 / 蘑菇 /
// 挥剑特效 / 阴影 / 粒子 / 水面动画帧
// 风格与 Kenney Tiny Town 对齐：平涂色块 + #3f2631 深紫描边
// ============================================================

export const S = 1;
const TAU = Math.PI * 2;

export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 兼容导出（光效用）
export function rg(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---------- Kenney 风格调色板 ----------
const P = {
  line: '#3f2631',        // Kenney 通用描边
  water: '#5ca4d9', waterD: '#4a8ec4', waterL: '#8cc4e8', foam: '#eafcff',
  stone: '#b4b0c4', stoneL: '#d0ccdc', stoneD: '#84809a', stoneDD: '#5d5970',
  gold: '#ffd257', goldD: '#d99a28',
  glow: '#3ddad7', red: '#f25670', pink: '#ff8a9d',
  crystal: '#57d9d0', crystalL: '#bdf7ef', crystalD: '#1f8494',
};

// ---------- 像素原语 ----------
const px = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
const hline = (ctx, x0, x1, y, c) => rect(ctx, x0, y, x1 - x0 + 1, 1, c);
function disc(ctx, cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r + r * 0.5) ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
  }
}
function edisc(ctx, cx, cy, rx, ry, c) {
  ctx.fillStyle = c;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.15) ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
  }
}
/** 自动外描边（深紫 1px） */
function outline(ctx, w, h, color = P.line) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 40;
  const marks = [];
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
      if (x >= 0 && y >= 0 && x < w && y < h) marks.push([x, y]);
    }
  }
  ctx.fillStyle = color;
  marks.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
}

function makePx(scene, key, w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  scene.textures.addCanvas(key, canvas);
}

// ============================================================
// 符文石（发光 / 失效）
// ============================================================
function drawRune(ctx, cracked) {
  const w = 40, h = 42, cx = 20;
  edisc(ctx, cx, 38, 13, 3, P.stoneD);
  rect(ctx, cx - 10, 4, 20, 32, P.stone);
  rect(ctx, cx - 10, 4, 20, 3, P.stoneL);
  rect(ctx, cx - 9, 7, 18, 2, P.stoneL);
  rect(ctx, cx - 10, 30, 20, 6, P.stoneD);
  rect(ctx, cx - 7, 9, 14, 24, cracked ? P.stoneDD : '#8a86a8');
  rect(ctx, cx - 7, 9, 14, 2, P.stoneD);
  for (const [sx, sy] of [[cx - 9, 6], [cx + 8, 6], [cx - 9, 33], [cx + 8, 33]]) {
    px(ctx, sx, sy, P.gold); px(ctx, sx + 1, sy + 1, P.goldD);
  }
  const ink = cracked ? '#5d7070' : P.glow;
  hline(ctx, cx - 4, cx + 4, 16, ink);
  hline(ctx, cx - 4, cx + 4, 24, ink);
  for (const yy of [17, 18, 19, 21, 22, 23]) {
    px(ctx, cx - 5, yy, ink); px(ctx, cx + 5, yy, ink);
  }
  px(ctx, cx - 6, 15, ink); px(ctx, cx - 5, 15, ink); px(ctx, cx - 6, 25, ink); px(ctx, cx - 5, 25, ink);
  px(ctx, cx + 5, 15, ink); px(ctx, cx + 6, 15, ink); px(ctx, cx + 5, 25, ink); px(ctx, cx + 6, 25, ink);
  px(ctx, cx - 8, 34, '#6aaa5a'); px(ctx, cx - 7, 35, '#6aaa5a');
  px(ctx, cx + 7, 35, '#6aaa5a');
  if (cracked) {
    for (let i = 0; i < 14; i++) px(ctx, cx + Math.sin(i * 1.1) * (i / 2) | 0, 5 + i * 2, P.stoneDD);
  }
  outline(ctx, w, h);
}

// ============================================================
// 代码碎片 / 爱心
// ============================================================
function drawShard(ctx) {
  const cx = 10;
  for (let i = 0; i < 10; i++) rect(ctx, cx - i * 0.9 | 0, 2 + i, (i * 1.8 | 0) + 1, 1, P.gold);
  for (let i = 0; i < 10; i++) rect(ctx, cx - (9 - i) * 0.9 | 0, 12 + i, ((9 - i) * 1.8 | 0) + 1, 1, P.goldD);
  rect(ctx, cx - 1, 4, 2, 4, '#fff3b0');
  px(ctx, cx + 2, 8, '#ffffff');
  outline(ctx, 20, 24);
}

function drawHeart(ctx, mode) {
  const c = mode === 'empty' ? P.stone : P.red;
  const cD = mode === 'empty' ? P.stoneD : '#d63a56';
  rect(ctx, 2, 2, 4, 2, c); rect(ctx, 10, 2, 4, 2, c);
  rect(ctx, 1, 4, 13, 3, c);
  rect(ctx, 2, 7, 11, 2, c);
  rect(ctx, 4, 9, 7, 2, c);
  rect(ctx, 6, 11, 3, 1, c);
  hline(ctx, 1, 13, 6, cD);
  if (mode === 'half') {
    rect(ctx, 8, 2, 6, 2, P.stone); rect(ctx, 8, 4, 6, 3, P.stone);
    rect(ctx, 8, 7, 5, 2, P.stone); rect(ctx, 8, 9, 3, 2, P.stone);
    hline(ctx, 8, 13, 6, P.stoneD);
  }
  px(ctx, 3, 3, '#ffffff'); px(ctx, 4, 2, '#ffffff');
  outline(ctx, 15, 13);
}

// ============================================================
// 传送门 / 函数石碑 / 水晶 / 蘑菇
// ============================================================
function drawPortal(ctx) {
  const w = 48, cx = 24;
  for (let i = 0; i < 4; i++) rect(ctx, 4 + i, 44 - i, 2, i + 1, P.stone);
  rect(ctx, 4, 12, 5, 33, P.stone);
  rect(ctx, 39, 12, 5, 33, P.stone);
  rect(ctx, 4, 6, 40, 8, P.stone);
  rect(ctx, 4, 6, 40, 2, P.stoneL);
  rect(ctx, 9, 12, 30, 33, '#191525');
  for (let i = 0; i < 30; i++) {
    const a = i * 0.55;
    const r = 2 + i * 0.32;
    px(ctx, cx + Math.cos(a) * r | 0, 28 + Math.sin(a) * r * 0.8 | 0, i % 3 ? 'rgba(61,218,215,0.5)' : 'rgba(160,245,240,0.8)');
  }
  rect(ctx, 8, 44, 32, 3, P.stoneD);
  outline(ctx, w, 48);
}

function drawTablet(ctx) {
  const w = 40, h = 46, cx = 20;
  rect(ctx, cx - 9, 8, 18, 32, P.stoneD);
  rect(ctx, cx - 9, 8, 18, 2, P.stone);
  edisc(ctx, cx, 10, 9, 4, P.stoneD);
  rect(ctx, cx - 7, 12, 14, 24, '#6d687f');
  const ink = P.glow;
  rect(ctx, cx + 1, 16, 2, 14, ink);
  px(ctx, cx, 17, ink); px(ctx, cx, 22, ink); px(ctx, cx - 1, 23, ink); px(ctx, cx + 3, 23, ink);
  hline(ctx, cx - 3, cx + 4, 19, ink);
  px(ctx, cx - 4, 30, ink); px(ctx, cx + 3, 30, ink);
  edisc(ctx, cx, 40, 11, 3, '#6aaa5a');
  edisc(ctx, cx, 39, 8, 2, '#78b866');
  outline(ctx, w, h);
}

function drawCrystal(ctx) {
  const w = 32, h = 36, cx = 16;
  edisc(ctx, cx, 31, 10, 3, P.stoneD);
  for (let i = 0; i < 8; i++) rect(ctx, 6 - (i * 0.3 | 0), 22 + i, (i * 0.6 | 0) + 1, 1, P.crystalD);
  for (let i = 0; i < 8; i++) rect(ctx, 26 - (i * 0.3 | 0), 20 + i, (i * 0.6 | 0) + 1, 1, P.crystalD);
  for (let i = 0; i < 20; i++) {
    const half = i < 10 ? i * 0.7 : (19 - i) * 0.7;
    rect(ctx, cx - half | 0, 4 + i, (half * 2 | 0) + 1, 1, i < 5 ? P.crystalL : P.crystal);
  }
  rect(ctx, cx - 2, 8, 2, 12, P.crystalL);
  px(ctx, cx + 1, 6, '#ffffff');
  outline(ctx, w, h);
}

function drawShroom(ctx) {
  const w = 20, cx = 10;
  ctx.fillStyle = 'rgba(120,255,235,0.18)';
  ctx.fillRect(0, 0, w, w);
  rect(ctx, cx - 2, 10, 4, 8, '#f2ead2');
  rect(ctx, cx - 2, 10, 1, 8, '#d8ceb0');
  for (let i = 0; i < 8; i++) {
    const half = i < 4 ? i + 3 : (7 - i) + 3;
    rect(ctx, cx - half, 2 + i, half * 2 + 1, 1, i < 3 ? '#8ff5e4' : '#35c8c0');
  }
  hline(ctx, cx - 6, cx + 6, 9, '#1d9aa0');
  px(ctx, cx - 3, 4, '#e8fffc'); px(ctx, cx + 2, 3, '#e8fffc'); px(ctx, cx, 6, '#e8fffc');
  outline(ctx, w, w);
}

// ============================================================
// 水面动画帧（Kenney 配色：平涂蓝 + 浅色波纹）
// ============================================================
function drawWaterFrame(ctx, frame, seed) {
  const T = 16;
  const r = rng(seed);
  rect(ctx, 0, 0, T, T, P.water);
  // 深色斑
  if (r() < 0.5) rect(ctx, 2 + (r() * 10 | 0), 2 + (r() * 10 | 0), 3, 2, P.waterD);
  // 横向波纹（帧间下漂）
  const y0 = (3 + frame * 3) % 14;
  ctx.fillStyle = P.waterL;
  for (let x = 1; x < 14; x += 4) {
    ctx.fillRect(x + ((y0 % 4) > 1 ? 1 : 0), y0, 3, 1);
    ctx.fillRect(x + 2, (y0 + 5) % 14, 2, 1);
  }
  ctx.fillStyle = P.foam;
  if (r() < 0.6) ctx.fillRect(2 + (r() * 12 | 0), 2 + (r() * 12 | 0), 2, 1);
}

/** 岸边泡沫（4 方向，贴在靠岸一侧） */
function makeFoam(scene) {
  const edges = {
    foam_n: (c) => { c.fillStyle = P.foam; c.fillRect(0, 0, 16, 1); c.fillRect(2, 1, 4, 1); c.fillRect(9, 1, 4, 1); c.fillStyle = P.waterL; c.fillRect(0, 2, 16, 2); },
    foam_s: (c) => { c.fillStyle = P.foam; c.fillRect(0, 15, 16, 1); c.fillRect(2, 13, 4, 1); c.fillRect(9, 13, 4, 1); c.fillStyle = P.waterL; c.fillRect(0, 12, 16, 2); },
    foam_w: (c) => { c.fillStyle = P.foam; c.fillRect(0, 0, 1, 16); c.fillRect(1, 2, 1, 4); c.fillRect(1, 9, 1, 4); c.fillStyle = P.waterL; c.fillRect(2, 0, 2, 16); },
    foam_e: (c) => { c.fillStyle = P.foam; c.fillRect(15, 0, 1, 16); c.fillRect(13, 2, 1, 4); c.fillRect(13, 9, 1, 4); c.fillStyle = P.waterL; c.fillRect(12, 0, 2, 16); },
  };
  for (const [key, fn] of Object.entries(edges)) {
    makePx(scene, key, 16, 16, fn);
  }
}

// ============================================================
// 特效
// ============================================================
function makeSlash(scene) {
  for (let f = 0; f < 3; f++) {
    const sz = 28;
    makePx(scene, `slash_${f}`, sz, sz, (ctx) => {
      const cx = sz / 2;
      const spread = 0.5 + f * 0.45;
      ctx.globalAlpha = 0.95 - f * 0.3;
      for (let a = -spread; a <= spread; a += 0.09) {
        const x0 = cx + Math.cos(a - Math.PI / 4) * 11 | 0;
        const y0 = cx + Math.sin(a - Math.PI / 4) * 11 | 0;
        ctx.fillStyle = a > -spread * 0.4 && a < spread * 0.4 ? P.gold : '#ffffff';
        ctx.fillRect(x0, y0, 2, 2);
      }
      ctx.globalAlpha = 1;
    });
  }
}

function makeShadow(scene) {
  makePx(scene, 'shadow', 16, 8, (ctx) => {
    edisc(ctx, 8, 4, 7, 3, 'rgba(30,20,40,0.35)');
  });
}

function makeCloudShadow(scene) {
  makePx(scene, 'cloudshadow', 96, 58, (ctx) => {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#243040';
    disc(ctx, 30, 34, 24); disc(ctx, 60, 22, 28); disc(ctx, 78, 38, 18);
    ctx.globalAlpha = 1;
  });
}

function makeParticle(scene) {
  makePx(scene, 'particle', 8, 8, (ctx) => {
    ctx.fillStyle = rg(ctx, 4, 4, 4, [
      [0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillRect(0, 0, 8, 8);
  });
}

// ============================================================
// 入口：生成全部程序化贴图
// ============================================================
export function generateAllTextures(scene) {
  makePx(scene, 'rune', 40, 42, (ctx) => drawRune(ctx, false));
  makePx(scene, 'rune_cracked', 40, 42, (ctx) => drawRune(ctx, true));
  makePx(scene, 'shard', 20, 24, drawShard);
  makePx(scene, 'heart_full', 15, 13, (ctx) => drawHeart(ctx, 'full'));
  makePx(scene, 'heart_half', 15, 13, (ctx) => drawHeart(ctx, 'half'));
  makePx(scene, 'heart_empty', 15, 13, (ctx) => drawHeart(ctx, 'empty'));
  makePx(scene, 'portal_door', 48, 48, drawPortal);
  makePx(scene, 'tablet', 40, 46, drawTablet);
  makePx(scene, 'crystal', 32, 36, drawCrystal);
  makePx(scene, 'shroom', 20, 20, drawShroom);

  // 水面动画帧
  for (let f = 0; f < 3; f++) {
    makePx(scene, `water_${f}`, 16, 16, (ctx) => drawWaterFrame(ctx, f, f + 41));
  }
  makeFoam(scene);

  makeSlash(scene);
  makeShadow(scene);
  makeCloudShadow(scene);
  makeParticle(scene);
}

// ---------- 动画 ----------
export function createAnimations(scene) {
  const frame = (key) => ({ key });
  const mk = (key, textures, frameRate, repeat) =>
    scene.anims.exists(key) || scene.anims.create({
      key, frames: textures.map(frame), frameRate, repeat,
    });
  mk('slash', ['slash_0', 'slash_1', 'slash_2'], 18, 0);
}
