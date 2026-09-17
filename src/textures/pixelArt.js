// ============================================================
// 程序化像素美术（Pixel Art · Tiny Swords 风格）
// - 限定调色板（TS 色系：明快黄绿草地 / 青水 / 深紫描边）
// - 全部贴图 1:1 像素画布（模板尺寸 = 显示尺寸，无缩放）
// - 整数坐标绘制 + 形状完成后自动 1px 外描边（TS 干净观感的关键）
// - 逻辑坐标 16px 瓦片网格不变，游戏逻辑零改动
// ============================================================

export const S = 1; // 像素版不超采样（保留导出兼容）
const TAU = Math.PI * 2;

export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 兼容导出（光效用；像素主体不用）
export function lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
export function rg(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---------- 调色板（Tiny Swords 色系） ----------
const P = {
  line: '#3a3348',        // 描边：深紫（TS 标志性）

  // 地形
  grass: '#9bb94e', grassL: '#a8c45c', grassD: '#85a848', grassDD: '#789e42',
  blade: '#6a9838', bladeL: '#c2d878',
  path: '#d4c584', pathL: '#e2d29a', pathD: '#bfab6a', pathEdge: '#a08a52',
  water: '#47aba9', waterL: '#5cc2c0', waterD: '#3a8f92', foam: '#eafcff',

  // 勇者
  tunic: '#5cb852', tunicL: '#74cc64', tunicD: '#3f9640',
  skin: '#ffd9a8', skinD: '#e0a878',
  hair: '#ffd95e', hairD: '#d9a832',
  boot: '#8a5a33', bootD: '#5d3a20',
  metal: '#e8ecf4', metalD: '#a0a8bc',
  belt: '#6a4526',

  // 长老
  robe: '#9a5a46', robeD: '#66342a', beard: '#f2f0f5', beardD: '#c8c4d4',

  // 史莱姆
  slimeL: '#ffb09b', slime: '#e8503f', slimeD: '#a8232e',
  crimsonL: '#ff8f7d', crimson: '#c22736', crimsonD: '#6e1120',
  bossL: '#e2bcf8', boss: '#b07ce4', bossD: '#7e46bc',
  gold: '#ffd257', goldD: '#d99a28',

  // 蛇
  snakeL: '#8ed873', snake: '#57b34a', snakeD: '#3a8c3e',
  belly: '#e8f0c0', bellyD: '#bcd28a',

  // 石材 / 木
  stone: '#b4b0c4', stoneL: '#d0ccdc', stoneD: '#84809a', stoneDD: '#5d5970',
  wood: '#a06a38', woodD: '#6e4426',
  leaf: '#54b34a', leafL: '#78cc64', leafD: '#3a8c3e',
  crystal: '#57d9d0', crystalL: '#bdf7ef', crystalD: '#1f8494',
  glow: '#3ddad7',
  pink: '#ff8a9d', red: '#f25670',
};

// ---------- 像素画布工厂 ----------
function makePx(scene, key, w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  scene.textures.addCanvas(key, canvas);
}

// ---------- 像素原语（全部整数坐标） ----------
const px = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
/** 像素圆盘（整数扫描，边缘微锯齿 = 像素感） */
function disc(ctx, cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.5) ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
    }
  }
}
/** 像素圆环（描边圆） */
function ring(ctx, cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r + r * 0.5 && d >= (r - 1) * (r - 1) + r * 0.3) {
        ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }
  }
}
/** 椭圆盘 */
function edisc(ctx, cx, cy, rx, ry, c) {
  ctx.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.15) {
        ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }
  }
}
/** 水平像素线段 */
const hline = (ctx, x0, x1, y, c) => rect(ctx, x0, y, x1 - x0 + 1, 1, c);

/** 自动外描边：给所有不透明形状加 1px 深紫轮廓（TS 风格核心） */
function outline(ctx, w, h, color = P.line) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 40;
  const marks = [];
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        if (x >= 0 && y >= 0 && x < w && y < h) marks.push([x, y]);
      }
    }
  }
  ctx.fillStyle = color;
  marks.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
}

// ============================================================
// 勇者（32×32，脚底 y=29，三方向 × 三相位）
// ============================================================
// phase: 0 左步 1 站立 2 右步
function drawHero(ctx, dir, phase) {
  const cx = 16;
  const bob = phase === 1 ? 0 : -1; // 迈步时身体上提 1px
  const y0 = bob;

  // ---- 腿 / 靴 ----
  const legY = 26 + y0;
  if (dir === 'right') {
    // 侧面：前后腿交错
    const off = phase === 0 ? 1 : phase === 2 ? -1 : 0;
    rect(ctx, cx - 5, legY + 2, 4, 4, P.boot);       // 后腿
    rect(ctx, cx + 1 + off, legY + 1, 4, 5, P.boot); // 前腿
    rect(ctx, cx + 1 + off, legY + 4, 4, 2, P.bootD);
  } else {
    const l = phase === 0 ? -1 : 0;
    const r = phase === 2 ? 1 : 0;
    rect(ctx, cx - 6, legY + 1 + l, 5, 4, P.boot);
    rect(ctx, cx + 1, legY + 1 + r, 5, 4, P.boot);
    hline(ctx, cx - 6, cx - 2, legY + 4 + l, P.bootD);
    hline(ctx, cx + 1, cx + 5, legY + 4 + r, P.bootD);
  }

  // ---- 身体（绿衣） ----
  const by = 18 + y0;
  rect(ctx, cx - 6, by, 12, 5, P.tunic);
  rect(ctx, cx - 5, by + 5, 10, 3, P.tunic);
  hline(ctx, cx - 5, cx + 4, by, P.tunicL);        // 肩部受光
  rect(ctx, cx - 5, by + 3, 10, 1, P.tunicD);      // 衣褶
  // 腰带 + 金扣
  hline(ctx, cx - 5, cx + 4, by + 6, P.belt);
  px(ctx, cx, by + 6, P.gold);
  // 肩带（皮革）
  if (dir !== 'up') {
    rect(ctx, cx - 2, by, 2, 6, P.woodD);
    px(ctx, cx - 1, by + 2, P.gold);
  }
  // 背盾（背面）
  if (dir === 'up') {
    disc(ctx, cx, by + 3, 4, P.wood);
    disc(ctx, cx, by + 3, 2, P.metal);
  }

  // ---- 手 ----
  if (dir === 'right') {
    px(ctx, cx + 6, by + 3, P.skin); px(ctx, cx + 6, by + 4, P.skin);
  } else {
    rect(ctx, cx - 8, by + 3, 2, 2, P.skin);
    rect(ctx, cx + 6, by + 3, 2, 2, P.skin);
  }

  // ---- 头部 ----
  const hy = 10 + y0;
  // 脸
  edisc(ctx, cx, hy + 4, 8, 7, P.skin);
  // 发（底部一圈）
  if (dir === 'down') {
    edisc(ctx, cx, hy + 2, 8, 6, P.hair);          // 刘海层
    rect(ctx, cx - 8, hy + 3, 2, 4, P.hair);       // 侧发
    rect(ctx, cx + 6, hy + 3, 2, 4, P.hair);
    hline(ctx, cx - 6, cx + 5, hy + 5, P.hairD);   // 发影
    // 眼睛（2×3 双眼 + 高光）
    for (const ex of [cx - 4, cx + 3]) {
      rect(ctx, ex, hy + 6, 2, 3, '#33261f');
      px(ctx, ex, hy + 6, '#ffffff');
    }
    px(ctx, cx - 7, hy + 9, P.pink);               // 腮红
    px(ctx, cx + 6, hy + 9, P.pink);
    px(ctx, cx - 1, hy + 10, P.skinD);             // 嘴
    px(ctx, cx, hy + 10, P.skinD);
  } else if (dir === 'up') {
    edisc(ctx, cx, hy + 3, 8, 7, P.hair);          // 后脑勺
    hline(ctx, cx - 6, cx + 5, hy - 1, P.hairD);
    // 背带十字
    rect(ctx, cx - 1, by, 2, 7, P.woodD);
  } else {
    // 侧面：后脑 + 半脸
    edisc(ctx, cx - 1, hy + 4, 8, 7, P.skin);
    rect(ctx, cx - 9, hy + 1, 5, 8, P.hair);       // 后脑发
    rect(ctx, cx - 9, hy + 8, 5, 2, P.hairD);
    rect(ctx, cx + 1, hy + 3, 5, 6, P.hair);       // 刘海
    // 单眼
    rect(ctx, cx + 3, hy + 5, 2, 3, '#33261f');
    px(ctx, cx + 3, hy + 5, '#ffffff');
    px(ctx, cx + 6, hy + 8, P.pink);
  }

  // ---- 尖顶绿帽 ----
  const my = hy - 4;
  px(ctx, cx, my, P.tunic);                        // 帽尖
  px(ctx, cx - 1, my + 1, P.tunic); px(ctx, cx, my + 1, P.tunic); px(ctx, cx + 1, my + 1, P.tunicL);
  rect(ctx, cx - 2, my + 2, 5, 2, P.tunic);
  rect(ctx, cx - 4, my + 4, 9, 2, P.tunic);
  hline(ctx, cx - 4, cx + 4, my + 4, P.tunicL);
  // 帽檐（宽）
  rect(ctx, cx - 6, my + 6, 13, 2, P.tunicD);
  hline(ctx, cx - 6, cx + 6, my + 6, P.tunic);
  if (dir === 'down') {
    // 帽尖向前弯的小绒球
    px(ctx, cx + 2, my, P.gold);
    px(ctx, cx + 3, my - 1, P.gold);
  }

  outline(ctx, 32, 32);
}

// ============================================================
// 长老（32×32）
// ============================================================
function drawElder(ctx) {
  const cx = 16;
  // 长袍（梯形）
  rect(ctx, cx - 4, 20, 8, 9, P.robe);
  rect(ctx, cx - 6, 24, 12, 5, P.robe);
  hline(ctx, cx - 6, cx + 5, 28, P.robeD);
  rect(ctx, cx - 2, 22, 1, 6, P.robeD);            // 衣褶
  rect(ctx, cx + 2, 22, 1, 6, P.robeD);
  px(ctx, cx - 4, 21, P.gold); px(ctx, cx + 3, 21, P.gold); // 纽扣
  hline(ctx, cx - 4, cx + 3, 23, P.beardD);        // 绳腰带
  // 交叠的手
  edisc(ctx, cx, 24, 3, 2, P.skin);
  // 木杖（右侧）
  rect(ctx, 24, 8, 2, 20, P.wood);
  px(ctx, 24, 12, P.woodD); px(ctx, 25, 16, P.woodD);
  disc(ctx, 25, 6, 2, P.crystal);                  // 宝石杖头
  px(ctx, 24, 5, '#ffffff');
  px(ctx, 26, 11, P.skin); px(ctx, 26, 12, P.skin); // 握杖手
  // 头
  edisc(ctx, cx, 14, 7, 6, P.skin);
  // 白发两侧
  disc(ctx, cx - 6, 15, 2, P.beard);
  disc(ctx, cx + 6, 15, 2, P.beard);
  // 闭眼 + 眉
  hline(ctx, cx - 4, cx - 2, 14, P.beardD);
  hline(ctx, cx + 2, cx + 4, 14, P.beardD);
  hline(ctx, cx - 4, cx - 2, 16, '#8a6a5a');
  hline(ctx, cx + 2, cx + 4, 16, '#8a6a5a');
  px(ctx, cx - 6, 17, P.pink); px(ctx, cx + 5, 17, P.pink);
  // 大白胡子
  edisc(ctx, cx, 20, 5, 4, P.beard);
  rect(ctx, cx - 2, 22, 1, 4, P.beardD);
  rect(ctx, cx + 1, 22, 1, 4, P.beardD);
  // 兜帽（暖棕）
  edisc(ctx, cx, 11, 8, 6, P.robe);
  rect(ctx, cx - 8, 11, 16, 5, P.robe);
  hline(ctx, cx - 7, cx + 6, 10, '#b06a50');
  outline(ctx, 32, 32);
}

// ============================================================
// 史莱姆（32×32，帧 0/1 果冻呼吸）
// variant: 'red' | 'crimson' | 'boss'
// ============================================================
function drawSlimePx(ctx, frame, variant = 'red') {
  const boss = variant === 'boss';
  const size = boss ? 48 : 32;
  const cx = size / 2;
  const [cL, cM, cD] = variant === 'crimson' ? [P.crimsonL, P.crimson, P.crimsonD]
    : boss ? [P.bossL, P.boss, P.bossD] : [P.slimeL, P.slime, P.slimeD];
  const squash = frame === 1;
  const rx = (boss ? 20 : 13) + (squash ? 1 : 0);
  const ry = (boss ? 16 : 11) - (squash ? 1 : 0);
  const base = size - (boss ? 5 : 3); // 底部 y

  // 果冻圆顶
  edisc(ctx, cx, base - ry, rx, ry, cM);
  rect(ctx, cx - rx, base - 3, rx * 2 + 1, 3, cM);  // 平底
  hline(ctx, cx - rx + 2, cx + rx - 2, base - ry - ry + 2, cL); // 顶部受光
  hline(ctx, cx - rx + 1, cx + rx - 1, base - 1, cD);           // 底部暗边
  // 高光斑
  rect(ctx, cx - rx + 3, base - ry * 1.5 | 0, 3, 2, '#ffffff');
  px(ctx, cx - rx + 5, base - ry * 1.5 - 1 | 0, '#ffffff');
  // 肚皮补丁
  edisc(ctx, cx, base - 4, (rx * 0.55) | 0, 3, cL);

  if (boss) {
    // 皇冠
    const cy = base - ry * 2 - 6;
    rect(ctx, cx - 7, cy + 3, 14, 3, P.gold);
    for (let i = -7; i <= 7; i += 4) rect(ctx, cx + i, cy, 2, 4, P.gold);
    hline(ctx, cx - 6, cx + 6, cy + 5, P.goldD);
    px(ctx, cx, cy + 4, P.red);                     // 中央宝石
    px(ctx, cx - 4, cy + 4, P.crystal); px(ctx, cx + 4, cy + 4, P.crystal);
    // 怒眉
    hline(ctx, cx - 8, cx - 3, base - ry - 6, '#4a2a66');
    hline(ctx, cx + 3, cx + 8, base - ry - 6, '#4a2a66');
    px(ctx, cx - 8, base - ry - 5, '#4a2a66'); px(ctx, cx + 8, base - ry - 5, '#4a2a66');
  } else if (variant === 'crimson') {
    // 头顶尖角
    const ty = base - ry * 2;
    px(ctx, cx, ty - 3, cD); px(ctx, cx - 1, ty - 2, cD); px(ctx, cx + 1, ty - 2, cD);
    px(ctx, cx, ty - 1, cM); px(ctx, cx - 2, ty - 1, cD); px(ctx, cx + 2, ty - 1, cD);
  } else {
    // 背斑
    px(ctx, cx - 5, base - ry - 3, cD); px(ctx, cx - 4, base - ry - 4, cD);
    px(ctx, cx + 4, base - ry - 2, cD); px(ctx, cx + 5, base - ry - 3, cD);
  }

  // 眼睛（吊梢怒目）
  const ey = base - ry - 1;
  const edx = boss ? 7 : 5;
  for (const s of [-1, 1]) {
    rect(ctx, cx + s * edx - 1, ey, 2, 3, '#241419');
    px(ctx, cx + s * edx - 1, ey, '#ff4433');
    px(ctx, cx + s * edx - 2, ey - 1, '#3a0d14');   // 怒眉尖
  }
  // 咧嘴獠牙
  const my = ey + 4;
  rect(ctx, cx - 3, my, 6, 2, '#3d0810');
  px(ctx, cx - 2, my + 1, '#fff3ea'); px(ctx, cx + 1, my + 1, '#fff3ea');
  if (boss) {
    rect(ctx, cx - 2, my + 2, 1, 2, '#fff3ea');
    rect(ctx, cx + 1, my + 2, 1, 2, '#fff3ea');
  }

  outline(ctx, size, size);
}

// ============================================================
// 列表巨蟒（蛇头 36×36 / 蛇身 28×28）
// ============================================================
function drawSnakeHeadPx(ctx) {
  const cx = 18, size = 36;
  // 脖颈（顶部与身体衔接）
  edisc(ctx, cx, 6, 8, 5, P.snake);
  // 头部（圆润菱形）
  edisc(ctx, cx, 16, 13, 10, P.snake);
  edisc(ctx, cx, 24, 10, 8, P.snake);
  px(ctx, cx, 33, P.snake); px(ctx, cx - 1, 32, P.snake); px(ctx, cx + 1, 32, P.snake); // 下巴尖
  // 顶部受光
  hline(ctx, cx - 8, cx + 8, 8, P.snakeL);
  hline(ctx, cx - 10, cx + 10, 10, P.snakeL);
  // 背斑
  px(ctx, cx - 4, 7, P.snakeD); px(ctx, cx + 4, 8, P.snakeD); px(ctx, cx, 6, P.snakeD);
  // 颊鳞
  hline(ctx, cx - 10, cx - 6, 20, P.snakeD); hline(ctx, cx + 6, cx + 10, 20, P.snakeD);
  // 大眼
  for (const s of [-1, 1]) {
    edisc(ctx, cx + s * 7, 15, 3, 3, '#ffffff');
    disc(ctx, cx + s * 7, 16, 1, '#2e2430');
    px(ctx, cx + s * 7, 14, '#2e2430');
    px(ctx, cx + s * 7 - 2, 11, P.snakeD); px(ctx, cx + s * 7 + 2, 11, P.snakeD); // 怒眉
  }
  // 鼻孔 + 吐信
  px(ctx, cx - 2, 28, P.snakeD); px(ctx, cx + 2, 28, P.snakeD);
  px(ctx, cx, 34, '#ff5a70');
  px(ctx, cx - 1, 35, '#ff5a70'); px(ctx, cx + 1, 35, '#ff5a70');
  outline(ctx, size, size);
}

function drawSnakeBodyPx(ctx) {
  const cx = 14, size = 28;
  disc(ctx, cx, cx, 11, P.snake);
  // 顶部受光
  hline(ctx, cx - 6, cx + 6, cx - 9, P.snakeL);
  hline(ctx, cx - 8, cx + 8, cx - 8, P.snakeL);
  // 腹甲
  edisc(ctx, cx, cx + 3, 6, 7, P.belly);
  hline(ctx, cx - 4, cx + 4, cx, P.bellyD);
  hline(ctx, cx - 5, cx + 5, cx + 3, P.bellyD);
  hline(ctx, cx - 4, cx + 4, cx + 6, P.bellyD);
  // 背鳞
  px(ctx, cx - 7, cx - 4, P.snakeD); px(ctx, cx + 7, cx - 3, P.snakeD);
  outline(ctx, size, size);
}

// ============================================================
// 道具
// ============================================================
function drawTreePx(ctx) {
  // 树干
  rect(ctx, 17, 26, 6, 12, P.wood);
  rect(ctx, 17, 26, 2, 12, '#b5813f');
  rect(ctx, 17, 36, 6, 2, P.woodD);
  rect(ctx, 14, 36, 12, 3, P.woodD);               // 根部
  // 树冠（三团圆叠）
  disc(ctx, 20, 14, 12, P.leaf);
  disc(ctx, 10, 20, 8, P.leaf);
  disc(ctx, 30, 20, 8, P.leaf);
  disc(ctx, 20, 22, 10, P.leaf);
  // 受光面（左上）
  disc(ctx, 15, 9, 5, P.leafL);
  disc(ctx, 8, 17, 3, P.leafL);
  px(ctx, 26, 13, P.leafL);
  // 底部暗部
  edisc(ctx, 20, 26, 11, 4, P.leafD);
  hline(ctx, 10, 29, 28, P.leafD);
  // 高光叶斑
  px(ctx, 12, 7, P.bladeL); px(ctx, 13, 6, P.bladeL);
  px(ctx, 24, 5, P.bladeL); px(ctx, 25, 9, P.bladeL);
  // 红果
  px(ctx, 9, 21, P.pink); px(ctx, 28, 16, P.pink); px(ctx, 21, 26, P.pink);
  outline(ctx, 40, 40);
}

function drawRunePx(ctx, cracked) {
  const w = 40, h = 42, cx = 20;
  // 底座
  edisc(ctx, cx, 38, 13, 3, P.stoneD);
  // 石板
  rect(ctx, cx - 10, 4, 20, 32, P.stone);
  rect(ctx, cx - 10, 4, 20, 3, P.stoneL);
  rect(ctx, cx - 9, 7, 18, 2, P.stoneL);
  rect(ctx, cx - 10, 30, 20, 6, P.stoneD);
  // 内嵌面板
  rect(ctx, cx - 7, 9, 14, 24, cracked ? P.stoneDD : '#8a86a8');
  rect(ctx, cx - 7, 9, 14, 2, P.stoneD);
  // 角铆钉
  for (const [sx, sy] of [[cx - 9, 6], [cx + 8, 6], [cx - 9, 33], [cx + 8, 33]]) {
    px(ctx, sx, sy, P.gold); px(ctx, sx + 1, sy + 1, P.goldD);
  }
  // 循环符文（双弧箭头，未破解时发光）
  const ink = cracked ? '#5d7070' : P.glow;
  hline(ctx, cx - 4, cx + 4, 16, ink);
  hline(ctx, cx - 4, cx + 4, 24, ink);
  px(ctx, cx - 5, 17, ink); px(ctx, cx - 5, 18, ink); px(ctx, cx - 5, 19, ink);
  px(ctx, cx - 5, 21, ink); px(ctx, cx - 5, 22, ink); px(ctx, cx - 5, 23, ink);
  px(ctx, cx + 5, 17, ink); px(ctx, cx + 5, 18, ink); px(ctx, cx + 5, 19, ink);
  px(ctx, cx + 5, 21, ink); px(ctx, cx + 5, 22, ink); px(ctx, cx + 5, 23, ink);
  // 箭头端点
  px(ctx, cx - 6, 15, ink); px(ctx, cx - 5, 15, ink); px(ctx, cx - 6, 25, ink); px(ctx, cx - 5, 25, ink);
  px(ctx, cx + 5, 15, ink); px(ctx, cx + 6, 15, ink); px(ctx, cx + 5, 25, ink); px(ctx, cx + 6, 25, ink);
  // 苔藓
  px(ctx, cx - 8, 34, '#6aaa5a'); px(ctx, cx - 7, 35, '#6aaa5a');
  px(ctx, cx + 7, 35, '#6aaa5a');
  if (cracked) {
    // 裂纹
    for (let i = 0; i < 14; i++) px(ctx, cx + Math.sin(i * 1.1) * (i / 2) | 0, 5 + i * 2, P.stoneDD);
  }
  outline(ctx, w, h);
}

function drawShardPx(ctx) {
  const cx = 10;
  // 菱形晶体
  for (let i = 0; i < 10; i++) rect(ctx, cx - i * 0.9 | 0, 2 + i, (i * 1.8 | 0) + 1, 1, P.gold);
  for (let i = 0; i < 10; i++) rect(ctx, cx - (9 - i) * 0.9 | 0, 12 + i, ((9 - i) * 1.8 | 0) + 1, 1, P.goldD);
  rect(ctx, cx - 1, 4, 2, 4, '#fff3b0');           // 高光
  px(ctx, cx + 2, 8, '#ffffff');
  outline(ctx, 20, 24);
}

function drawHeartPx(ctx, mode) {
  const c = mode === 'empty' ? P.stone : P.red;
  const cD = mode === 'empty' ? P.stoneD : '#d63a56';
  // 心形（像素经典画法）
  rect(ctx, 2, 2, 4, 2, c); rect(ctx, 10, 2, 4, 2, c);
  rect(ctx, 1, 4, 13, 3, c);
  rect(ctx, 2, 7, 11, 2, c);
  rect(ctx, 4, 9, 7, 2, c);
  rect(ctx, 6, 11, 3, 1, c);
  hline(ctx, 1, 13, 6, cD);                        // 底部暗边
  if (mode === 'half') {                           // 右半灰
    rect(ctx, 8, 2, 6, 2, P.stone); rect(ctx, 8, 4, 6, 3, P.stone);
    rect(ctx, 8, 7, 5, 2, P.stone); rect(ctx, 8, 9, 3, 2, P.stone);
    hline(ctx, 8, 13, 6, P.stoneD);
  }
  px(ctx, 3, 3, '#ffffff'); px(ctx, 4, 2, '#ffffff'); // 高光
  outline(ctx, 15, 13);
}

function drawTorchPx(ctx, frame) {
  const cx = 8;
  // 木杆
  rect(ctx, cx - 1, 12, 3, 18, P.wood);
  px(ctx, cx - 1, 16, P.woodD); px(ctx, cx + 1, 20, P.woodD);
  // 箍
  rect(ctx, cx - 2, 12, 5, 2, P.woodD);
  // 碗
  edisc(ctx, cx, 11, 5, 2, P.stoneD);
  // 火焰（两帧摇曳）
  const fx = frame === 1 ? 1 : 0;
  px(ctx, cx, 2 + fx, '#fff3b0');
  rect(ctx, cx - 1, 3 + fx, 3, 2, '#ffc35c');
  rect(ctx, cx - 2, 5, 5, 3, '#f07830');
  rect(ctx, cx - 1, 8, 3, 2, '#ffc35c');
  px(ctx, cx - 2 + fx, 4, '#fff3b0');
  px(ctx, cx + 1, 6 + fx, '#fff3b0');
  // 火星
  px(ctx, cx + 3 - fx, 2, '#ffd257');
  outline(ctx, 16, 32);
}

function drawHousePx(ctx) {
  const w = 128, h = 112, cx = 64;
  // 墙体（奶油色）
  rect(ctx, 16, 56, 96, 52, '#f4e4c0');
  rect(ctx, 16, 56, 96, 3, '#e0c898');
  // 木梁框
  rect(ctx, 16, 56, 6, 52, P.wood);
  rect(ctx, 106, 56, 6, 52, P.wood);
  rect(ctx, 16, 56, 96, 6, P.wood);
  rect(ctx, 16, 104, 96, 4, P.woodD);
  // 墙板横缝
  hline(ctx, 22, 105, 72, '#d8bc8c');
  hline(ctx, 22, 105, 88, '#d8bc8c');
  hline(ctx, 22, 105, 100, '#d8bc8c');
  // 门（拱形）
  rect(ctx, 54, 74, 22, 34, P.wood);
  rect(ctx, 56, 78, 18, 30, '#8a5a33');
  rect(ctx, 62, 78, 2, 30, P.woodD);
  px(ctx, 72, 94, P.gold);                         // 门把
  rect(ctx, 52, 106, 26, 4, P.stone);              // 台阶
  // 窗 ×2（蓝玻璃 + 白框 + 花箱）
  for (const wx of [28, 80]) {
    rect(ctx, wx, 66, 20, 18, '#ffffff');
    rect(ctx, wx + 2, 68, 16, 14, '#7ad4e0');
    rect(ctx, wx + 2, 68, 16, 2, '#a8ecf4');
    px(ctx, wx + 9, 68, '#ffffff'); px(ctx, wx + 10, 68, '#ffffff');
    hline(ctx, wx + 2, wx + 17, 74, '#ffffff');
    // 花箱
    rect(ctx, wx - 1, 84, 22, 5, P.wood);
    rect(ctx, wx - 1, 87, 22, 2, P.woodD);
    px(ctx, wx + 3, 83, P.pink); px(ctx, wx + 9, 82, P.gold); px(ctx, wx + 16, 83, P.pink);
  }
  // 屋顶（玫红，大三角）
  for (let i = 0; i < 46; i++) {
    const half = (i * 1.15) | 0;
    hline(ctx, cx - half, cx + half, 6 + i, i < 4 ? '#ffb3c6' : '#f07a97');
  }
  // 瓦纹
  for (let i = 8; i < 46; i += 6) {
    const half = (i * 1.15) | 0;
    hline(ctx, cx - half + 2, cx + half - 2, 6 + i, '#d95d7e');
  }
  // 檐口
  rect(ctx, 8, 50, 112, 7, '#c94f68');
  rect(ctx, 8, 54, 112, 3, '#a83a52');
  // 烟囱
  rect(ctx, 88, 12, 12, 26, P.stone);
  hline(ctx, 88, 99, 18, P.stoneD); hline(ctx, 88, 99, 26, P.stoneD);
  rect(ctx, 86, 9, 16, 5, P.stoneL);
  rect(ctx, 88, 10, 12, 3, P.stoneDD);
  // 炊烟（像素团）
  px(ctx, 94, 4, 'rgba(248,248,252,0.7)'); px(ctx, 96, 2, 'rgba(248,248,252,0.5)');
  outline(ctx, w, h);
}

function drawGatePx(ctx, open) {
  const w = 64, h = 64;
  // 门洞
  rect(ctx, 12, 10, 40, 50, '#1c1830');
  if (!open) {
    // 木栅栏
    for (const bx of [16, 26, 36, 46]) {
      rect(ctx, bx, 10, 4, 50, P.wood);
      px(ctx, bx, 16, P.woodD); px(ctx, bx + 2, 30, P.woodD);
    }
    hline(ctx, 12, 52, 22, P.woodD);
    hline(ctx, 12, 52, 44, P.woodD);
  } else {
    // 深处微光
    rect(ctx, 12, 10, 40, 14, 'rgba(61,218,215,0.15)');
  }
  // 石柱
  for (const pxx of [4, 48]) {
    rect(ctx, pxx, 8, 12, 52, P.stone);
    rect(ctx, pxx, 8, 12, 3, P.stoneL);
    rect(ctx, pxx, 56, 12, 4, P.stoneD);
    hline(ctx, pxx + 1, pxx + 10, 20, P.stoneD);
    hline(ctx, pxx + 1, pxx + 10, 36, P.stoneD);
    px(ctx, pxx + 2, 50, '#6aaa5a');               // 苔藓
  }
  // 顶梁
  rect(ctx, 0, 2, 64, 8, P.stone);
  rect(ctx, 0, 2, 64, 3, P.stoneL);
  rect(ctx, 0, 8, 64, 2, P.stoneDD);
  // 垂藤
  for (let i = 0; i < 8; i++) px(ctx, 18, 10 + i * 2, '#6fbf5e');
  for (let i = 0; i < 6; i++) px(ctx, 44, 10 + i * 3, '#6fbf5e');
  outline(ctx, w, h);
}

function drawPortalPx(ctx) {
  const w = 48, cx = 24;
  // 石拱框
  for (let i = 0; i < 4; i++) rect(ctx, 4 + i, 44 - i, 2, i + 1, P.stone);
  rect(ctx, 4, 12, 5, 33, P.stone);
  rect(ctx, 39, 12, 5, 33, P.stone);
  rect(ctx, 4, 6, 40, 8, P.stone);
  rect(ctx, 4, 6, 40, 2, P.stoneL);
  // 门洞
  rect(ctx, 9, 12, 30, 33, '#191525');
  // 涡光（青色螺旋，像素点阵）
  for (let i = 0; i < 30; i++) {
    const a = i * 0.55;
    const r = 2 + i * 0.32;
    px(ctx, cx + Math.cos(a) * r | 0, 28 + Math.sin(a) * r * 0.8 | 0, i % 3 ? 'rgba(61,218,215,0.5)' : 'rgba(160,245,240,0.8)');
  }
  // 台阶
  rect(ctx, 8, 44, 32, 3, P.stoneD);
  outline(ctx, w, 48);
}

function drawTabletPx(ctx) {
  const w = 40, h = 46, cx = 20;
  // 石碑
  rect(ctx, cx - 9, 8, 18, 32, P.stoneD);
  rect(ctx, cx - 9, 8, 18, 2, P.stone);
  edisc(ctx, cx, 10, 9, 4, P.stoneD);              // 圆顶
  rect(ctx, cx - 7, 12, 14, 24, '#6d687f');
  // 发光的 ƒ 符文
  const ink = P.glow;
  rect(ctx, cx + 1, 16, 2, 14, ink);
  px(ctx, cx, 17, ink); px(ctx, cx, 22, ink); px(ctx, cx - 1, 23, ink); px(ctx, cx + 3, 23, ink);
  hline(ctx, cx - 3, cx + 4, 19, ink);
  px(ctx, cx - 4, 30, ink); px(ctx, cx + 3, 30, ink); // 参数点
  // 苔藓底座
  edisc(ctx, cx, 40, 11, 3, '#6aaa5a');
  edisc(ctx, cx, 39, 8, 2, '#78b866');
  outline(ctx, w, h);
}

function drawBushPx(ctx) {
  const w = 30, h = 22, cx = 15;
  disc(ctx, cx - 6, 13, 7, P.leaf);
  disc(ctx, cx + 6, 13, 7, P.leaf);
  disc(ctx, cx, 9, 8, P.leaf);
  hline(ctx, cx - 8, cx + 8, 6, P.leafL);
  px(ctx, cx - 4, 5, P.leafL); px(ctx, cx + 5, 7, P.leafL);
  hline(ctx, cx - 7, cx + 7, 18, P.leafD);
  px(ctx, cx - 7, 12, P.pink); px(ctx, cx + 8, 11, P.pink); px(ctx, cx + 1, 15, P.gold);
  outline(ctx, w, h);
}

function drawCrystalPx(ctx) {
  const w = 32, h = 36, cx = 16;
  // 底座
  edisc(ctx, cx, 31, 10, 3, P.stoneD);
  // 左右小晶簇
  for (let i = 0; i < 8; i++) rect(ctx, 6 - (i * 0.3 | 0), 22 + i, (i * 0.6 | 0) + 1, 1, P.crystalD);
  for (let i = 0; i < 8; i++) rect(ctx, 26 - (i * 0.3 | 0), 20 + i, (i * 0.6 | 0) + 1, 1, P.crystalD);
  // 中央主晶
  for (let i = 0; i < 20; i++) {
    const half = i < 10 ? i * 0.7 : (19 - i) * 0.7;
    rect(ctx, cx - half | 0, 4 + i, (half * 2 | 0) + 1, 1, i < 5 ? P.crystalL : P.crystal);
  }
  rect(ctx, cx - 2, 8, 2, 12, P.crystalL);        // 晶面高光
  px(ctx, cx + 1, 6, '#ffffff');
  outline(ctx, w, h);
}

function drawShroomPx(ctx) {
  const w = 20, cx = 10;
  // 光晕（发光体允许柔光）
  ctx.fillStyle = 'rgba(120,255,235,0.18)';
  ctx.fillRect(0, 0, w, w);
  // 菌柄
  rect(ctx, cx - 2, 10, 4, 8, '#f2ead2');
  rect(ctx, cx - 2, 10, 1, 8, '#d8ceb0');
  // 菌盖
  for (let i = 0; i < 8; i++) {
    const half = i < 4 ? i + 3 : (7 - i) + 3;
    rect(ctx, cx - half, 2 + i, half * 2 + 1, 1, i < 3 ? '#8ff5e4' : '#35c8c0');
  }
  hline(ctx, cx - 6, cx + 6, 9, '#1d9aa0');
  // 盖上光点
  px(ctx, cx - 3, 4, '#e8fffc'); px(ctx, cx + 2, 3, '#e8fffc'); px(ctx, cx, 6, '#e8fffc');
  outline(ctx, w, w);
}

// ============================================================
// 地形瓦片（16×16，供 ground.js 整图拼接）
// opts: { corners, nb, edges, frame, gx, gy }
// ============================================================
export function drawGroundTile(ctx, v, rand, opts = {}) {
  const T = 16;
  const grassBase = (variant) => {
    const tones = variant === 1 ? [P.grass] : [P.grass, P.grassL, P.grassD];
    ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
    ctx.fillRect(0, 0, T, T);
    // 草叶簇（V 形 2px）
    const n = variant === 10 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const x = 1 + Math.floor(rand() * 13), y = 3 + Math.floor(rand() * 11);
      ctx.fillStyle = rand() < 0.35 ? P.bladeL : P.blade;
      ctx.fillRect(x, y, 1, 2);
      ctx.fillRect(x + 2, y + 1, 1, 1);
      if (rand() < 0.5) ctx.fillRect(x + 1, y + 2, 1, 1);
    }
    // 色斑（大块 2×2 明暗）
    if (rand() < 0.4) {
      ctx.fillStyle = rand() < 0.5 ? P.grassL : P.grassD;
      ctx.fillRect(2 + Math.floor(rand() * 11), 2 + Math.floor(rand() * 11), 2, 2);
    }
  };

  switch (v) {
    case 0: case 1: case 10: case 11: {
      grassBase(v === 11 ? 1 : v);
      if (v === 10) { // 草丛（浓密）
        for (let i = 0; i < 4; i++) {
          const x = 1 + Math.floor(rand() * 13), y = 2 + Math.floor(rand() * 12);
          ctx.fillStyle = P.blade;
          ctx.fillRect(x, y, 1, 3);
          ctx.fillStyle = P.bladeL;
          ctx.fillRect(x + 1, y + 1, 1, 2);
        }
      }
      if (v === 11) { // 碎石小花
        ctx.fillStyle = '#d8d4c8';
        ctx.fillRect(4 + Math.floor(rand() * 4), 5, 2, 2);
        ctx.fillStyle = '#fff6f8';
        px(ctx, 12, 3, '#fff6f8'); px(ctx, 3, 12, '#fff6f8');
      }
      break;
    }
    case 2: { // 土路：底色 + 邻接圆角 + 噪点
      ctx.fillStyle = P.path;
      ctx.fillRect(0, 0, T, T);
      const corners = opts.corners || [0, 0, 0, 0];
      const nb = opts.nb || {};
      // 外角切角（露出草地色 → ground.js 底层是草）
      const cut = (x, y) => { ctx.fillStyle = P.pathEdge; ctx.fillRect(x, y, 2, 2); };
      if (corners[0]) cut(0, 0);
      if (corners[1]) cut(T - 2, 0);
      if (corners[2]) cut(T - 2, T - 2);
      if (corners[3]) cut(0, T - 2);
      // 邻接草地的边压暗线
      ctx.fillStyle = P.pathEdge;
      if (!nb.t) ctx.fillRect(0, 0, T, 1);
      if (!nb.b) ctx.fillRect(0, T - 1, T, 1);
      if (!nb.l) ctx.fillRect(0, 0, 1, T);
      if (!nb.r) ctx.fillRect(T - 1, 0, 1, T);
      // 沙粒噪点
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = rand() < 0.5 ? P.pathL : P.pathD;
        ctx.fillRect(1 + Math.floor(rand() * 14), 1 + Math.floor(rand() * 14), 1, 1);
      }
      // 鹅卵石（0-2 颗）
      const pebbles = Math.floor(rand() * 3);
      for (let i = 0; i < pebbles; i++) {
        const pxx = 2 + Math.floor(rand() * 11), py = 2 + Math.floor(rand() * 11);
        ctx.fillStyle = '#c8ae78';
        ctx.fillRect(pxx, py, 3, 2);
        ctx.fillStyle = P.pathL;
        ctx.fillRect(pxx, py, 2, 1);
      }
      break;
    }
    case 3: case 4: case 9: { // 水
      const frame = opts.frame || 0;
      ctx.fillStyle = P.water;
      ctx.fillRect(0, 0, T, T);
      if (rand() < 0.5) { // 深水斑
        ctx.fillStyle = P.waterD;
        ctx.fillRect(2 + Math.floor(rand() * 10), 2 + Math.floor(rand() * 10), 3, 2);
      }
      // 横向波纹（帧间下漂，白 50%）
      const y0 = (3 + frame * 3) % 14;
      ctx.fillStyle = P.waterL;
      for (let x = 1; x < 14; x += 4) {
        ctx.fillRect(x + ((y0 % 4) > 1 ? 1 : 0), y0, 3, 1);
        ctx.fillRect(x + 2, (y0 + 5) % 14, 2, 1);
      }
      ctx.fillStyle = '#eafcff';
      if (rand() < 0.6) ctx.fillRect(2 + Math.floor(rand() * 12), 2 + Math.floor(rand() * 12), 2, 1);
      // 岸边：浅色带 + 泡沫线（edges 为 true 的一侧邻接陆地）
      const e = opts.edges || {};
      if (e.n) {
        ctx.fillStyle = P.waterL; ctx.fillRect(0, 0, T, 3);
        ctx.fillStyle = P.foam; ctx.fillRect(0, 0, T, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 0, 4, 1); ctx.fillRect(9, 0, 3, 1);
      }
      if (e.s) {
        ctx.fillStyle = P.waterL; ctx.fillRect(0, T - 3, T, 3);
        ctx.fillStyle = P.foam; ctx.fillRect(0, T - 1, T, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(3, T - 1, 4, 1); ctx.fillRect(10, T - 1, 3, 1);
      }
      if (e.w) {
        ctx.fillStyle = P.waterL; ctx.fillRect(0, 0, 3, T);
        ctx.fillStyle = P.foam; ctx.fillRect(0, 0, 1, T);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 2, 1, 4); ctx.fillRect(0, 9, 1, 3);
      }
      if (e.e) {
        ctx.fillStyle = P.waterL; ctx.fillRect(T - 3, 0, 3, T);
        ctx.fillStyle = P.foam; ctx.fillRect(T - 1, 0, 1, T);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(T - 1, 3, 1, 4); ctx.fillRect(T - 1, 10, 1, 3);
      }
      break;
    }
    case 5: { // 花地
      grassBase(0);
      const flower = (fx, fy, petal) => {
        ctx.fillStyle = petal;
        ctx.fillRect(fx - 1, fy, 3, 1); ctx.fillRect(fx, fy - 1, 1, 3);
        ctx.fillStyle = '#fff6f8';
        ctx.fillRect(fx, fy, 1, 1);
      };
      flower(4, 5, P.pink); flower(11, 10, P.gold); flower(12, 4, '#ffffff');
      break;
    }
    case 6: { // 地牢地板：石板
      const odd = ((opts.gx || 0) + (opts.gy || 0)) % 2 === 1;
      ctx.fillStyle = odd ? '#5d5970' : '#635f76';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#6d688f';
      ctx.fillRect(1, 1, 6, 6); ctx.fillRect(9, 1, 6, 6);
      ctx.fillRect(odd ? 1 : 5, 9, 6, 6); ctx.fillRect(odd ? 9 : 13, 9, 6, 6);
      // 板缝
      ctx.fillStyle = '#28243c';
      ctx.fillRect(0, 0, T, 1); ctx.fillRect(0, 0, 1, T);
      ctx.fillRect(0, 8, T, 1); ctx.fillRect(8, 0, 1, 8); ctx.fillRect(odd ? 4 : 12, 8, 1, 8);
      // 高光 / 裂纹
      if (rand() < 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(2 + Math.floor(rand() * 10), 2 + Math.floor(rand() * 10), 3, 1); }
      if (rand() < 0.3) { ctx.fillStyle = '#28243c'; ctx.fillRect(2 + Math.floor(rand() * 10), 3 + Math.floor(rand() * 10), 4, 1); }
      break;
    }
    case 7: { // 地牢墙：砖
      ctx.fillStyle = '#4a4462';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#575276';
      ctx.fillRect(0, 0, T, 4);                    // 墙顶受光
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(0, 0, T, 1);
      ctx.fillStyle = '#221e36';
      ctx.fillRect(0, 4, T, 1);                    // 顶檐阴影
      // 砖块（错缝）
      const brick = (x, y) => {
        ctx.fillStyle = '#5d5878'; ctx.fillRect(x, y, 7, 3);
        ctx.fillStyle = '#6a6490'; ctx.fillRect(x, y, 7, 1);
      };
      brick(1, 6); brick(9, 6);
      brick(odd2(opts) ? 1 : 5, 10); brick(odd2(opts) ? 9 : 13, 10);
      brick(1, 14); brick(9, 14);
      if (rand() < 0.35) { ctx.fillStyle = '#6aaa5a'; ctx.fillRect(2 + Math.floor(rand() * 11), 13, 2, 1); } // 苔藓
      break;
    }
    case 8: { // 虚空
      ctx.fillStyle = '#221e30';
      ctx.fillRect(0, 0, T, T);
      break;
    }
    default: {
      ctx.fillStyle = P.grass;
      ctx.fillRect(0, 0, T, T);
    }
  }
}
const odd2 = (o) => (((o.gx || 0) + (o.gy || 0)) % 2 === 1);

// ============================================================
// 特效贴图
// ============================================================
function makeSlashPx(scene) {
  for (let f = 0; f < 3; f++) {
    const sz = 28;
    makePx(scene, `slash_${f}`, sz, sz, (ctx) => {
      const cx = sz / 2;
      const spread = 0.5 + f * 0.45;
      const alpha = 0.95 - f * 0.3;
      ctx.globalAlpha = alpha;
      // 像素弧（扇形扫掠）
      for (let a = -spread; a <= spread; a += 0.09) {
        const x0 = cx + Math.cos(a - Math.PI / 4) * 11 | 0;
        const y0 = cx + Math.sin(a - Math.PI / 4) * 11 | 0;
        ctx.fillStyle = a > -spread * 0.4 && a < spread * 0.4 ? '#ffd257' : '#ffffff';
        ctx.fillRect(x0, y0, 2, 2);
      }
      ctx.globalAlpha = 1;
    });
  }
}

function makeShadowPx(scene) {
  // 像素椭圆阴影（半透明，允许柔和）
  makePx(scene, 'shadow', 16, 8, (ctx) => {
    edisc(ctx, 8, 4, 7, 3, 'rgba(30,20,40,0.35)');
  });
}

function makeCloudShadowPx(scene) {
  makePx(scene, 'cloudshadow', 96, 58, (ctx) => {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#243040';
    disc(ctx, 30, 34, 24); disc(ctx, 60, 22, 28); disc(ctx, 78, 38, 18);
    ctx.globalAlpha = 1;
  });
}

function makeFoamPx(scene) {
  // 岸边泡沫（4 方向，16×16 像素浪线）
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

function makeParticlePx(scene) {
  // 发光粒子（光效用径向渐变，允许平滑）
  makePx(scene, 'particle', 8, 8, (ctx) => {
    ctx.fillStyle = rg(ctx, 4, 4, 4, [
      [0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillRect(0, 0, 8, 8);
  });
}

// ============================================================
// 入口：生成全部贴图（key 与旧版完全一致）
// ============================================================
export function generateAllTextures(scene) {
  // 勇者（32×32，1:1 显示）
  const dirs = ['down', 'up', 'right'];
  for (const d of dirs) {
    for (let p = 0; p < 3; p++) {
      makePx(scene, `player_${d}_${p}`, 32, 32, (ctx) => drawHero(ctx, d, p));
    }
  }
  makePx(scene, 'elder', 32, 32, drawElder);
  makePx(scene, 'slime_0', 32, 32, (ctx) => drawSlimePx(ctx, 0));
  makePx(scene, 'slime_1', 32, 32, (ctx) => drawSlimePx(ctx, 1));
  makePx(scene, 'slime_blue_0', 32, 32, (ctx) => drawSlimePx(ctx, 0, 'crimson'));
  makePx(scene, 'slime_blue_1', 32, 32, (ctx) => drawSlimePx(ctx, 1, 'crimson'));
  makePx(scene, 'boss', 48, 48, (ctx) => drawSlimePx(ctx, 0, 'boss'));

  // 第二章
  makePx(scene, 'tablet', 40, 46, drawTabletPx);
  makePx(scene, 'bush', 30, 22, drawBushPx);
  makePx(scene, 'crystal', 32, 36, drawCrystalPx);
  makePx(scene, 'shroom', 20, 20, drawShroomPx);
  makePx(scene, 'snake_head', 36, 36, drawSnakeHeadPx);
  makePx(scene, 'snake_body', 28, 28, drawSnakeBodyPx);

  // 道具
  makePx(scene, 'tree', 40, 40, drawTreePx);
  makePx(scene, 'rune', 40, 42, (ctx) => drawRunePx(ctx, false));
  makePx(scene, 'rune_cracked', 40, 42, (ctx) => drawRunePx(ctx, true));
  makePx(scene, 'shard', 20, 24, drawShardPx);
  makePx(scene, 'heart_full', 15, 13, (ctx) => drawHeartPx(ctx, 'full'));
  makePx(scene, 'heart_half', 15, 13, (ctx) => drawHeartPx(ctx, 'half'));
  makePx(scene, 'heart_empty', 15, 13, (ctx) => drawHeartPx(ctx, 'empty'));
  makePx(scene, 'torch_0', 16, 32, (ctx) => drawTorchPx(ctx, 0));
  makePx(scene, 'torch_1', 16, 32, (ctx) => drawTorchPx(ctx, 1));
  makePx(scene, 'house', 128, 112, drawHousePx);
  makePx(scene, 'gate_closed', 64, 64, (ctx) => drawGatePx(ctx, false));
  makePx(scene, 'gate_open', 64, 64, (ctx) => drawGatePx(ctx, true));
  makePx(scene, 'portal_door', 48, 48, drawPortalPx);

  // 水面动画帧（16×16 像素）
  for (let f = 0; f < 3; f++) {
    makePx(scene, `water_${f}`, 16, 16, (ctx) => drawGroundTile(ctx, 3, rng(f + 41), { frame: f }));
  }

  makeSlashPx(scene);
  makeShadowPx(scene);
  makeCloudShadowPx(scene);
  makeFoamPx(scene);
  makeParticlePx(scene);
}

// ---------- 动画（key 与旧版完全一致） ----------
export function createAnimations(scene) {
  const frame = (key) => ({ key });
  const mk = (key, textures, frameRate, repeat) =>
    scene.anims.exists(key) || scene.anims.create({
      key, frames: textures.map(frame), frameRate, repeat,
    });
  mk('player_down', ['player_down_2', 'player_down_0', 'player_down_1', 'player_down_0'], 9, -1);
  mk('player_up', ['player_up_2', 'player_up_0', 'player_up_1', 'player_up_0'], 9, -1);
  mk('player_right', ['player_right_0', 'player_right_1', 'player_right_2', 'player_right_1'], 9, -1);
  mk('player_idle_down', ['player_down_2'], 1, -1);
  mk('player_idle_up', ['player_up_2'], 1, -1);
  mk('player_idle_right', ['player_right_0'], 1, -1);
  mk('slime_move', ['slime_0', 'slime_1'], 4, -1);
  mk('slime_blue_move', ['slime_blue_0', 'slime_blue_1'], 5, -1);
  mk('slash', ['slash_0', 'slash_1', 'slash_2'], 18, 0);
  mk('torch_burn', ['torch_0', 'torch_1'], 5, -1);
}
