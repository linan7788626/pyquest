// ============================================================
// 程序化矢量美术（4x 超采样，柔和卡通渲染）
// 灵感：塞尔达传说：织梦岛 Switch 版（玩具感、圆润体积、粉彩）
// 全部贴图由 Canvas 2D 矢量绘制生成：渐变塑形 + 圆角 + 软描边，
// 不再有像素马赛克。逻辑坐标 16px 网格不变，游戏逻辑无需改动。
// ============================================================

export const S = 4; // 超采样倍率：逻辑 1px = 4 纹素（相机 2x 缩放后约 1:1 像素密度）
const TAU = Math.PI * 2;

// ---------- 小工具 ----------
export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

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

/** 圆角矩形路径（支持四角独立半径 [tl,tr,br,bl]） */
export function rr(ctx, x, y, w, h, r) {
  const rad = Array.isArray(r) ? r : [r, r, r, r];
  const [tl, tr, br, bl] = rad.map((v) => Math.max(0, v));
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.closePath();
}

function soft(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** 高分辨率画布：逻辑 w×h，实际 wS×hS，绘制时缩放到逻辑坐标 */
function makeHires(scene, key, w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w * S;
  canvas.height = h * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);
  draw(ctx, w, h);
  scene.textures.addCanvas(key, canvas);
}

// ============================================================
// 角色：小勇者（正面/背面/侧面 × 3 相位）
// ============================================================
// phase: 0 小步幅  1 大步幅(带重心起伏)  2 并腿
const LEG_SPREAD = [1.35, 1.75, 0.8]; // 正面/背面：左右脚张开距离
const ARM_SWING = [0.4, 0.6, 0];

function drawPlayer(ctx, dir, phase) {
  const bob = phase === 1 ? -0.28 : 0;
  const yb = (y) => y + bob;
  const side = dir === 'right';

  // ---- 腿 / 靴子 ----
  const boot = (cx, shade) => {
    ctx.fillStyle = lg(ctx, cx - 1, 13, cx + 1, 15.5, [[0, shade ? '#7d5230' : '#a06a38'], [1, shade ? '#5d3a20' : '#7d4f28']]);
    rr(ctx, cx - 0.95, yb(13.1), 1.9, 2.45, [0.85, 0.85, 1.0, 1.0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,30,18,0.5)'; // 卡通描边
    ctx.lineWidth = 0.3;
    ctx.stroke();
    // 靴口翻边
    ctx.fillStyle = shade ? 'rgba(105,66,36,0.95)' : 'rgba(150,98,54,0.95)';
    rr(ctx, cx - 1.02, yb(13.12), 2.04, 0.6, 0.28);
    ctx.fill();
    // 靴底
    ctx.fillStyle = 'rgba(45,26,16,0.9)';
    rr(ctx, cx - 1.02, yb(15.12), 2.04, 0.42, 0.2);
    ctx.fill();
    // 鞋头高光
    ctx.fillStyle = 'rgba(255,235,200,0.28)';
    ellipse(ctx, cx - 0.25, yb(13.8), 0.3, 0.55);
    ctx.fill();
  };
  if (side) {
    const [f, b] = [[1.0, -1.0], [1.7, -1.7], [2.3, -2.3]][phase];
    boot(8 + b, true);
    boot(8 + f, false);
  } else {
    const s = LEG_SPREAD[phase];
    boot(8 - s, false);
    boot(8 + s, false);
  }

  // ---- 上衣（勇者绿） ----
  const tw = side ? 4.7 : 5.3;
  ctx.fillStyle = lg(ctx, 0, yb(9.0), 0, yb(13.5), [[0, '#72cf60'], [0.6, '#54b44a'], [1, '#3f9640']]);
  ctx.beginPath();
  ctx.moveTo(8 - tw, yb(9.1));
  ctx.lineTo(8 + tw, yb(9.1));
  ctx.quadraticCurveTo(8 + tw + 0.55, yb(13.3), 8 + tw - 0.4, yb(13.45));
  ctx.lineTo(8 - tw + 0.4, yb(13.45));
  ctx.quadraticCurveTo(8 - tw - 0.55, yb(13.3), 8 - tw, yb(9.1));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,74,36,0.6)'; // 卡通描边
  ctx.lineWidth = 0.38;
  ctx.stroke();
  // 衣摆阴影
  ctx.fillStyle = 'rgba(35,90,35,0.25)';
  ctx.beginPath();
  ctx.moveTo(8 - tw + 0.4, yb(12.6));
  ctx.quadraticCurveTo(8, yb(13.6), 8 + tw - 0.4, yb(12.6));
  ctx.lineTo(8 + tw - 0.5, yb(13.4));
  ctx.quadraticCurveTo(8, yb(13.75), 8 - tw + 0.5, yb(13.4));
  ctx.closePath();
  ctx.fill();
  // 领口
  ctx.fillStyle = 'rgba(40,100,40,0.5)';
  ellipse(ctx, 8, yb(9.35), 1.35, 0.4);
  ctx.fill();

  // ---- 金属护肩（参考图骑士元素） ----
  const pauldron = (px, py) => {
    ctx.fillStyle = lg(ctx, px - 1.2, py - 1.2, px + 1.2, py + 1.2, [[0, '#f2f4fa'], [0.55, '#b9c0d4'], [1, '#7e86a0']]);
    circle(ctx, px, py, 1.15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,66,90,0.6)';
    ctx.lineWidth = 0.3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ellipse(ctx, px - 0.3, py - 0.42, 0.4, 0.24, -0.5);
    ctx.fill();
  };
  if (side) {
    pauldron(9.55, yb(9.5));
  } else {
    pauldron(8 - tw + 0.9, yb(9.4));
    pauldron(8 + tw - 0.9, yb(9.4));
  }

  // ---- 肩带 + 胸口徽章（欧美 Q 版层叠细节） ----
  ctx.fillStyle = lg(ctx, 0, yb(9.1), 0, yb(11.5), [[0, '#b07838'], [1, '#8a5526']]);
  if (side) {
    rr(ctx, 8.6, yb(9.2), 1.5, 2.4, 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,36,16,0.45)';
    ctx.lineWidth = 0.24;
    ctx.stroke();
  } else {
    rr(ctx, 8 - tw + 0.5, yb(9.2), 1.2, 2.4, 0.55);
    ctx.fill();
    rr(ctx, 8 + tw - 1.7, yb(9.2), 1.2, 2.4, 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,36,16,0.45)';
    ctx.lineWidth = 0.24;
    ctx.stroke();
    // 金色三角徽章
    ctx.fillStyle = lg(ctx, 7.2, yb(10.0), 8.8, yb(11.1), [[0, '#ffe98c'], [1, '#e8a52e']]);
    ctx.beginPath();
    ctx.moveTo(8, yb(9.95));
    ctx.lineTo(8 + 0.8, yb(10.95));
    ctx.lineTo(8 - 0.8, yb(10.95));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,95,20,0.65)';
    ctx.lineWidth = 0.22;
    ctx.stroke();
  }

  // ---- 腰带 + 扣 ----
  ctx.fillStyle = lg(ctx, 0, yb(11.4), 0, yb(12.6), [[0, '#6a4526'], [1, '#54331c']]);
  rr(ctx, 8 - tw - 0.1, yb(11.45), tw * 2 + 0.2, 1.15, 0.5);
  ctx.fill();
  if (dir !== 'up') {
    ctx.fillStyle = '#ffd257';
    circle(ctx, 8, yb(12.02), 0.52);
    ctx.fill();
    ctx.fillStyle = '#b07818';
    circle(ctx, 8, yb(12.02), 0.24);
    ctx.fill();
  }

  // ---- 背盾（背面视角） ----
  if (dir === 'up') {
    ctx.fillStyle = lg(ctx, 6, 9, 10, 13, [[0, '#d29a5c'], [1, '#8a5a33']]);
    circle(ctx, 8, 11.1, 2.05);
    ctx.fill();
    ctx.strokeStyle = '#6e4426';
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ctx.fillStyle = lg(ctx, 7.2, 10.2, 8.8, 12, [[0, '#e8e4f0'], [1, '#a8a4b8']]);
    circle(ctx, 8, 11.1, 0.62);
    ctx.fill();
  }

  // ---- 手臂 ----
  const arm = ARM_SWING[phase];
  const sleeve = (x, y, shade) => {
    ctx.fillStyle = shade ? '#3f9640' : '#54b44a';
    circle(ctx, x, y, 1.12);
    ctx.fill();
  };
  const hand = (x, y, shade) => {
    ctx.fillStyle = shade ? '#e8b088' : '#ffd9b3';
    circle(ctx, x, y, 0.92);
    ctx.fill();
  };
  if (side) {
    sleeve(9.9, yb(10.35), false);
    hand(10.55 + arm, yb(11.15), false);
  } else {
    sleeve(8 - tw + 0.15, yb(10.35), false);
    sleeve(8 + tw - 0.15, yb(10.35), true);
    hand(8 - tw - 0.35, yb(11.2) - arm, false);
    hand(8 + tw + 0.35, yb(11.2) + arm, true);
  }

  // ---- 背后剑柄（down 视角从右肩后探出） ----
  if (dir === 'down') {
    ctx.fillStyle = lg(ctx, 12.6, 5.5, 13.4, 8, [[0, '#a06a38'], [1, '#6e4426']]);
    rr(ctx, 12.6, yb(5.7), 0.8, 2.4, 0.4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,36,16,0.5)';
    ctx.lineWidth = 0.25;
    ctx.stroke();
    ctx.fillStyle = lg(ctx, 12.5, 5.2, 13.5, 6.2, [[0, '#ffe98c'], [1, '#e8a52e']]);
    circle(ctx, 13.0, yb(5.55), 0.5);
    ctx.fill();
    rr(ctx, 12.25, yb(7.7), 1.5, 0.6, 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,95,20,0.6)';
    ctx.lineWidth = 0.22;
    ctx.stroke();
  }

  // ---- 头部 ----
  const hair = lg(ctx, 4.5, 1.5, 11, 9, [[0, '#ffe68a'], [0.55, '#f0be45'], [1, '#d29a28']]);
  const skin = lg(ctx, 5.5, 5, 10.5, 9.5, [[0, '#ffe9cc'], [1, '#f4bd90']]);
  if (dir === 'down') {
    // 头发穹顶（后层发量） + 刘海
    ctx.fillStyle = hair;
    circle(ctx, 8, 5.25, 4.35);
    ctx.fill();
    // 脸（皮肤画在穹顶之上，露出下半张脸）
    ctx.fillStyle = skin;
    ellipse(ctx, 8, 7.1, 3.05, 2.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.35, 6.0);
    ctx.quadraticCurveTo(5.4, 5.1, 6.3, 6.15);
    ctx.quadraticCurveTo(7.2, 5.0, 8.1, 6.1);
    ctx.quadraticCurveTo(9.0, 5.0, 9.9, 6.1);
    ctx.quadraticCurveTo(10.7, 5.1, 11.65, 6.0);
    ctx.quadraticCurveTo(11.9, 4.4, 10.6, 3.3);
    ctx.quadraticCurveTo(8, 1.6, 5.4, 3.3);
    ctx.quadraticCurveTo(4.1, 4.4, 4.35, 6.0);
    ctx.closePath();
    ctx.fill();
    // 侧发梢
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(4.5, 5.8);
    ctx.quadraticCurveTo(4.2, 7.4, 5.1, 8.2);
    ctx.quadraticCurveTo(5.5, 7.0, 5.4, 6.0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11.5, 5.8);
    ctx.quadraticCurveTo(11.8, 7.4, 10.9, 8.2);
    ctx.quadraticCurveTo(10.5, 7.0, 10.6, 6.0);
    ctx.closePath();
    ctx.fill();
    // 发丝高光
    ctx.strokeStyle = 'rgba(255,255,235,0.55)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(8, 5.6, 3.1, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();

    // ---- 尖顶绿帽（带帽檐 + 羽毛） ----
    ctx.fillStyle = lg(ctx, 4, 0.4, 12, 5.4, [[0, '#8fdc74'], [0.55, '#57bb4c'], [1, '#3a8c3e']]);
    ctx.beginPath();
    ctx.moveTo(4.35, 5.05);
    ctx.quadraticCurveTo(3.9, 2.5, 6.2, 1.35);
    ctx.quadraticCurveTo(8.1, 0.45, 10.6, 1.15);
    ctx.quadraticCurveTo(13.4, 1.95, 12.9, 3.6); // 帽尖向右弯垂
    ctx.quadraticCurveTo(12.65, 4.5, 11.65, 5.05);
    ctx.quadraticCurveTo(8, 5.85, 4.35, 5.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,32,0.6)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // 帽檐
    ctx.fillStyle = 'rgba(36,92,38,0.85)';
    ctx.beginPath();
    ctx.moveTo(4.35, 5.05);
    ctx.quadraticCurveTo(8, 5.9, 11.65, 5.05);
    ctx.quadraticCurveTo(8, 5.35, 4.35, 5.05);
    ctx.closePath();
    ctx.fill();
    // 帽缝线
    ctx.strokeStyle = 'rgba(28,80,32,0.5)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(8, 0.85);
    ctx.quadraticCurveTo(7.6, 2.6, 7.9, 5.35);
    ctx.stroke();
    // 羽毛
    ctx.fillStyle = lg(ctx, 3.4, 0.6, 5.4, 2.8, [[0, '#ff8a9d'], [1, '#e0506c']]);
    ctx.beginPath();
    ctx.moveTo(5.6, 2.6);
    ctx.quadraticCurveTo(3.4, 2.2, 3.1, 0.55);
    ctx.quadraticCurveTo(4.9, 0.75, 5.75, 2.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,40,60,0.5)';
    ctx.lineWidth = 0.22;
    ctx.stroke();

    // 眉毛 + 大眼睛（双高光）
    ctx.strokeStyle = 'rgba(120,80,40,0.85)';
    ctx.lineWidth = 0.32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6.35, 6.62);
    ctx.quadraticCurveTo(6.8, 6.42, 7.25, 6.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8.75, 6.6);
    ctx.quadraticCurveTo(9.2, 6.42, 9.65, 6.62);
    ctx.stroke();
    for (const ex of [6.8, 9.2]) {
      ctx.fillStyle = '#33261f';
      ellipse(ctx, ex, 7.3, 0.58, 0.68);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex - 0.19, 7.08, 0.22);
      ctx.fill();
      circle(ctx, ex + 0.16, 7.48, 0.1);
      ctx.fill();
    }
    // 腮红 + 嘴
    ctx.fillStyle = 'rgba(255,150,150,0.30)';
    ellipse(ctx, 5.9, 7.9, 0.55, 0.32);
    ctx.fill();
    ellipse(ctx, 10.1, 7.9, 0.55, 0.32);
    ctx.fill();
    soft(ctx, 'rgba(140,70,50,0.75)', 0.32);
    ctx.beginPath();
    ctx.arc(8, 8.15, 0.5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (dir === 'up') {
    // 后脑勺：整片头发
    ctx.fillStyle = hair;
    circle(ctx, 8, 5.5, 4.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.3, 6.6);
    ctx.quadraticCurveTo(5.6, 7.8, 6.9, 7.0);
    ctx.quadraticCurveTo(8, 7.8, 9.1, 7.0);
    ctx.quadraticCurveTo(10.4, 7.8, 11.7, 6.6);
    ctx.quadraticCurveTo(11.95, 4.3, 10.5, 3.2);
    ctx.quadraticCurveTo(8, 1.7, 5.5, 3.2);
    ctx.quadraticCurveTo(4.05, 4.3, 4.3, 6.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,235,0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(8, 5.8, 3.0, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
    // ---- 尖顶绿帽（背面：盖住后脑） ----
    ctx.fillStyle = lg(ctx, 4, 0.4, 12, 6, [[0, '#8fdc74'], [0.55, '#57bb4c'], [1, '#3a8c3e']]);
    ctx.beginPath();
    ctx.moveTo(4.3, 6.2);
    ctx.quadraticCurveTo(3.85, 2.4, 6.3, 1.3);
    ctx.quadraticCurveTo(8.1, 0.5, 10.5, 1.2);
    ctx.quadraticCurveTo(13.2, 2.0, 12.75, 3.8);
    ctx.quadraticCurveTo(12.5, 5.2, 11.7, 6.2);
    ctx.quadraticCurveTo(8, 7.15, 4.3, 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,32,0.6)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // 中缝 + 帽尖垂布
    ctx.strokeStyle = 'rgba(28,80,32,0.55)';
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(8, 0.95);
    ctx.quadraticCurveTo(7.85, 3.0, 8, 6.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12.2, 2.4);
    ctx.quadraticCurveTo(13.5, 3.4, 12.4, 4.9);
    ctx.stroke();
  } else {
    // 侧面：后脑发量 → 脸（皮肤）→ 刘海
    ctx.fillStyle = hair;
    circle(ctx, 7.65, 5.3, 4.35);
    ctx.fill();
    ctx.fillStyle = skin;
    ellipse(ctx, 8.85, 7.1, 2.6, 2.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11.15, 4.6);
    ctx.quadraticCurveTo(11.9, 5.9, 11.35, 7.2);
    ctx.quadraticCurveTo(10.7, 6.4, 10.55, 5.6);
    ctx.closePath();
    ctx.fill();
    // 刘海斜扫
    ctx.beginPath();
    ctx.moveTo(4.2, 6.2);
    ctx.quadraticCurveTo(6.5, 6.9, 10.6, 5.3);
    ctx.quadraticCurveTo(11.6, 4.2, 10.2, 3.2);
    ctx.quadraticCurveTo(7.6, 1.8, 5.3, 3.3);
    ctx.quadraticCurveTo(4.0, 4.4, 4.2, 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,235,0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(7.7, 5.6, 3.0, Math.PI * 1.15, Math.PI * 1.6);
    ctx.stroke();

    // ---- 尖顶绿帽（侧面：帽尖向后飘） ----
    ctx.fillStyle = lg(ctx, 3.4, 0.4, 12, 5.4, [[0, '#8fdc74'], [0.55, '#57bb4c'], [1, '#3a8c3e']]);
    ctx.beginPath();
    ctx.moveTo(4.05, 5.1);
    ctx.quadraticCurveTo(3.4, 2.6, 5.6, 1.4);
    ctx.quadraticCurveTo(7.8, 0.4, 10.4, 1.1);
    ctx.quadraticCurveTo(12.5, 1.7, 12.1, 3.2);
    ctx.quadraticCurveTo(11.85, 4.6, 11.15, 5.1);
    ctx.quadraticCurveTo(7.6, 5.9, 4.05, 5.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,32,0.6)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // 帽尖向后飘
    ctx.fillStyle = lg(ctx, 2, 1.4, 5.4, 4.4, [[0, '#6ecb5e'], [1, '#3a8c3e']]);
    ctx.beginPath();
    ctx.moveTo(4.6, 2.4);
    ctx.quadraticCurveTo(2.2, 2.6, 1.7, 4.4);
    ctx.quadraticCurveTo(3.4, 4.9, 4.7, 4.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,32,0.5)';
    ctx.lineWidth = 0.3;
    ctx.stroke();
    // 帽檐
    ctx.fillStyle = 'rgba(36,92,38,0.85)';
    ctx.beginPath();
    ctx.moveTo(4.05, 5.1);
    ctx.quadraticCurveTo(7.6, 5.92, 11.15, 5.1);
    ctx.quadraticCurveTo(7.6, 5.38, 4.05, 5.1);
    ctx.closePath();
    ctx.fill();

    // 单眼（双高光）+ 腮红 + 嘴
    ctx.strokeStyle = 'rgba(120,80,40,0.85)';
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(9.5, 6.66);
    ctx.quadraticCurveTo(9.95, 6.5, 10.35, 6.66);
    ctx.stroke();
    ctx.fillStyle = '#33261f';
    ellipse(ctx, 9.9, 7.3, 0.56, 0.66);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, 9.7, 7.08, 0.22);
    ctx.fill();
    circle(ctx, 10.05, 7.5, 0.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,150,150,0.30)';
    ellipse(ctx, 10.35, 8.0, 0.5, 0.3);
    ctx.fill();
    soft(ctx, 'rgba(140,70,50,0.75)', 0.3);
    ctx.beginPath();
    ctx.arc(9.75, 8.2, 0.45, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}

// ============================================================
// 长老
// ============================================================
function drawElder(ctx) {
  // 长袍
  ctx.fillStyle = lg(ctx, 0, 9.8, 0, 15.4, [[0, '#9a5a46'], [1, '#66342a']]);
  ctx.beginPath();
  ctx.moveTo(5.7, 10.0);
  ctx.lineTo(10.3, 10.0);
  ctx.quadraticCurveTo(11.5, 13.4, 11.2, 15.25);
  ctx.lineTo(4.8, 15.25);
  ctx.quadraticCurveTo(4.5, 13.4, 5.7, 10.0);
  ctx.closePath();
  ctx.fill();
  // 长袍下摆滚边
  ctx.fillStyle = 'rgba(255,222,190,0.5)';
  rr(ctx, 4.9, 14.5, 6.2, 0.75, 0.37);
  ctx.fill();
  // 衣褶 + 纽扣
  ctx.strokeStyle = 'rgba(255,225,200,0.28)';
  ctx.lineWidth = 0.45;
  for (const dx of [-1.9, 1.9]) {
    ctx.beginPath();
    ctx.moveTo(8 + dx * 0.6, 10.6);
    ctx.quadraticCurveTo(8 + dx, 12.6, 8 + dx * 1.35, 15.0);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,210,87,0.9)';
  circle(ctx, 8, 11.0, 0.32);
  ctx.fill();
  circle(ctx, 8, 12.2, 0.32);
  ctx.fill();
  // 单肩披布（右肩，参考图布料金边感）
  ctx.fillStyle = lg(ctx, 8.4, 9.6, 11.8, 12.6, [[0, '#c98a5e'], [1, '#96603a']]);
  ctx.beginPath();
  ctx.moveTo(9.4, 9.9);
  ctx.quadraticCurveTo(11.8, 10.4, 11.2, 13.2);
  ctx.quadraticCurveTo(10.2, 13.9, 9.6, 13.3);
  ctx.quadraticCurveTo(10.1, 11.4, 9.4, 9.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,40,0.5)';
  ctx.lineWidth = 0.28;
  ctx.stroke();

  // 绳腰带 + 挂袋
  ctx.strokeStyle = 'rgba(220,190,140,0.85)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(5.35, 11.2);
  ctx.quadraticCurveTo(8, 12.0, 10.65, 11.2);
  ctx.stroke();
  ctx.fillStyle = lg(ctx, 4.6, 12, 6.4, 14, [[0, '#c9a06a'], [1, '#96693c']]);
  rr(ctx, 4.75, 12.1, 1.9, 1.9, 0.55);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,58,30,0.55)';
  ctx.lineWidth = 0.25;
  ctx.stroke();

  // 木杖（右侧，宝石镶顶）
  ctx.fillStyle = lg(ctx, 11.6, 3, 12.6, 15, [[0, '#b98d58'], [0.5, '#96693c'], [1, '#6e4a28']]);
  rr(ctx, 11.75, 3.4, 0.85, 11.6, 0.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,38,20,0.55)';
  ctx.lineWidth = 0.25;
  ctx.stroke();
  // 木纹
  ctx.strokeStyle = 'rgba(80,52,28,0.45)';
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(11.95, 6.2);
  ctx.lineTo(12.5, 6.6);
  ctx.moveTo(11.95, 9.4);
  ctx.lineTo(12.5, 9.0);
  ctx.stroke();
  // 杖头弯钩 + 宝石
  ctx.strokeStyle = '#96693c';
  ctx.lineWidth = 0.85;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12.15, 3.6);
  ctx.quadraticCurveTo(12.2, 2.1, 10.6, 2.3);
  ctx.stroke();
  ctx.fillStyle = rg(ctx, 10.35, 2.3, 1.15, [[0, '#bdf7ef'], [0.6, '#3ddad7'], [1, '#1a8f96']]);
  circle(ctx, 10.35, 2.55, 0.72);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(ctx, 10.12, 2.32, 0.2);
  ctx.fill();
  // 宝石星芒
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(10.35, 1.45);
  ctx.lineTo(10.35, 3.65);
  ctx.moveTo(9.25, 2.55);
  ctx.lineTo(11.45, 2.55);
  ctx.stroke();
  // 握杖的手
  ctx.fillStyle = '#f4bd90';
  circle(ctx, 11.95, 10.6, 0.78);
  ctx.fill();

  // 交叠的手
  ctx.fillStyle = '#f4bd90';
  ellipse(ctx, 8, 12.0, 1.05, 0.8);
  ctx.fill();

  // 头
  const skin = lg(ctx, 5.5, 3, 10.5, 8, [[0, '#ffe9cc'], [1, '#eeb488']]);
  ctx.fillStyle = skin;
  circle(ctx, 8, 5.7, 3.45);
  ctx.fill();
  // 白色鬓发
  const white = lg(ctx, 4, 4, 12, 8, [[0, '#ffffff'], [1, '#d8d4e0']]);
  ctx.fillStyle = white;
  circle(ctx, 5.15, 6.0, 1.3);
  ctx.fill();
  circle(ctx, 10.85, 6.0, 1.3);
  ctx.fill();
  // 眉毛 + 闭目
  soft(ctx, '#f0ecf5', 0.5);
  ctx.beginPath();
  ctx.moveTo(6.0, 5.7);
  ctx.quadraticCurveTo(6.7, 5.4, 7.35, 5.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8.65, 5.7);
  ctx.quadraticCurveTo(9.3, 5.4, 10.0, 5.7);
  ctx.stroke();
  soft(ctx, 'rgba(70,50,45,0.8)', 0.4);
  ctx.beginPath();
  ctx.arc(6.7, 6.35, 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(9.3, 6.35, 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // 腮红
  ctx.fillStyle = 'rgba(255,140,130,0.3)';
  ellipse(ctx, 5.9, 6.9, 0.5, 0.3);
  ctx.fill();
  ellipse(ctx, 10.1, 6.9, 0.5, 0.3);
  ctx.fill();
  // 大胡子
  ctx.fillStyle = white;
  circle(ctx, 8, 9.5, 2.45);
  ctx.fill();
  circle(ctx, 6.55, 8.8, 1.45);
  ctx.fill();
  circle(ctx, 9.45, 8.8, 1.45);
  ctx.fill();
  // 胡须纹理
  ctx.strokeStyle = 'rgba(150,145,165,0.4)';
  ctx.lineWidth = 0.35;
  for (const dx of [-0.9, 0, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(8 + dx * 0.4, 8.6);
    ctx.quadraticCurveTo(8 + dx * 0.8, 10, 8 + dx, 11.4);
    ctx.stroke();
  }
}

// ============================================================
// 史莱姆 / 史莱姆王
// ============================================================
// variant: 'red' 猩红小怪 | 'crimson' 深红小怪（第二章，更快更硬） | 'boss' 史莱姆王
// 小怪统一红色 + 狰狞脸：V 怒眉、吊梢怒目、咧嘴獠牙
function drawSlime(ctx, frame, variant = 'red') {
  const boss = variant === 'boss';
  const sc = boss ? 1.5 : 1;
  const ox = boss ? 12 : 8;
  const oy = boss ? 15.1 : 10.6;
  const squash = frame === 1 ? 1.08 : 1;
  const flat = frame === 1 ? 0.88 : 1;
  const rx = (boss ? 5.35 : 5.25) * squash * sc;
  const ry = (boss ? 4.15 : 4.3) * flat * sc;

  const PAL = {
    red: [[0, '#ffb09b'], [0.5, '#e8503f'], [1, '#a8232e']],
    crimson: [[0, '#ff8f7d'], [0.5, '#c22736'], [1, '#6e1120']],
    boss: [[0, '#e2bcf8'], [0.5, '#b07ce4'], [1, '#7e46bc']],
  };
  const RIM = {
    red: 'rgba(140,20,25,0.45)',
    crimson: 'rgba(80,8,16,0.5)',
    boss: 'rgba(70,30,110,0.4)',
  };

  const body = lg(ctx, ox - rx, oy - ry, ox + rx, oy + ry, PAL[variant]);

  // 果冻身体
  ctx.fillStyle = body;
  ellipse(ctx, ox, oy, rx, ry);
  ctx.fill();
  // 体积光（左上高光）
  ctx.fillStyle = rg(ctx, ox - rx * 0.45, oy - ry * 0.55, rx * 1.15, [
    [0, 'rgba(255,255,255,0.55)'], [0.45, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)'],
  ]);
  ellipse(ctx, ox, oy, rx, ry);
  ctx.fill();
  // 底部反光边缘
  soft(ctx, RIM[variant], 0.7);
  ctx.beginPath();
  ctx.ellipse(ox, oy, rx - 0.5, ry - 0.45, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // ---- 肚皮补丁（半透明浅色椭圆） ----
  ctx.fillStyle = boss ? 'rgba(245,225,255,0.5)' : variant === 'crimson' ? 'rgba(255,205,195,0.45)' : 'rgba(255,226,216,0.55)';
  ellipse(ctx, ox, oy + ry * 0.38, rx * 0.62, ry * 0.42);
  ctx.fill();

  // ---- 背部斑纹（红：暗红斑点 / 深红：尖角头冠 / BOSS：魔斑） ----
  if (variant === 'red') {
    ctx.fillStyle = 'rgba(150,25,30,0.55)';
    ellipse(ctx, ox - rx * 0.42, oy - ry * 0.5, 0.75, 0.5, -0.4);
    ctx.fill();
    ellipse(ctx, ox + rx * 0.38, oy - ry * 0.62, 0.55, 0.4, 0.3);
    ctx.fill();
  } else if (variant === 'crimson') {
    // 头顶尖角头冠（深红獠角）
    ctx.fillStyle = lg(ctx, ox - 0.9, oy - ry - 2.6, ox + 0.9, oy - ry + 0.2, [[0, '#ff9d8a'], [1, '#8a1622']]);
    ctx.beginPath();
    ctx.moveTo(ox, oy - ry - 2.55);
    ctx.quadraticCurveTo(ox + 1.05, oy - ry - 1.05, ox, oy - ry + 0.1);
    ctx.quadraticCurveTo(ox - 1.05, oy - ry - 1.05, ox, oy - ry - 2.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,15,25,0.6)';
    ctx.lineWidth = 0.25;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,230,0.8)';
    ellipse(ctx, ox - 0.3, oy - ry - 1.35, 0.22, 0.4, 0.3);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(120,60,170,0.6)';
    ellipse(ctx, ox - rx * 0.45, oy - ry * 0.45, 0.7, 0.48, -0.35);
    ctx.fill();
    ellipse(ctx, ox + rx * 0.42, oy - ry * 0.58, 0.52, 0.38, 0.25);
    ctx.fill();
    ellipse(ctx, ox + rx * 0.05, oy - ry * 0.75, 0.4, 0.3, 0);
    ctx.fill();
  }

  // 腮红（仅 BOSS 保留；小怪狰狞脸不要腮红）
  if (boss) {
    ctx.fillStyle = 'rgba(255,130,150,0.4)';
    ellipse(ctx, ox - rx * 0.62, oy + ry * 0.18, 0.62 * sc, 0.36 * sc);
    ctx.fill();
    ellipse(ctx, ox + rx * 0.62, oy + ry * 0.18, 0.62 * sc, 0.36 * sc);
    ctx.fill();
  }

  if (boss) {
    // 皇冠
    ctx.fillStyle = lg(ctx, 8.4, 5, 15.6, 8.5, [[0, '#ffe98c'], [1, '#e8a52e']]);
    ctx.beginPath();
    ctx.moveTo(8.6, 8.9);
    ctx.lineTo(9.2, 6.3);
    ctx.lineTo(10.5, 7.8);
    ctx.lineTo(12, 5.6);
    ctx.lineTo(13.5, 7.8);
    ctx.lineTo(14.8, 6.3);
    ctx.lineTo(15.4, 8.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,95,20,0.55)';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    ctx.fillStyle = '#ff6a7e';
    circle(ctx, 12, 7.9, 0.5);
    ctx.fill();
    ctx.fillStyle = '#3ddad7';
    circle(ctx, 9.9, 8.0, 0.34);
    ctx.fill();
    circle(ctx, 14.1, 8.0, 0.34);
    ctx.fill();
    // 皇冠两侧垂珠
    ctx.fillStyle = '#8fe0ff';
    circle(ctx, 9.0, 9.3, 0.3);
    ctx.fill();
    circle(ctx, 15.0, 9.3, 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd257';
    circle(ctx, 10.4, 6.6, 0.24);
    ctx.fill();
    circle(ctx, 13.6, 6.6, 0.24);
    ctx.fill();
  }

  // 高光斑
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, ox - rx * 0.42, oy - ry * 0.52, 1.5 * sc, 0.85 * sc, -0.5);
  ctx.fill();
  circle(ctx, ox - rx * 0.6, oy - ry * 0.78, 0.3 * sc);
  ctx.fill();

  // 眼睛（BOSS 圆眼；小怪 V 怒眉 + 吊梢怒目）
  const ey = oy - ry * 0.12;
  const edx = boss ? 2.3 : 1.4;
  for (const s of [-1, 1]) {
    if (boss) {
      ctx.fillStyle = '#2e2430';
      ellipse(ctx, ox + s * edx, ey, 0.6 * sc, 0.82 * sc);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, ox + s * edx - 0.18, ey - 0.25, 0.21 * sc);
      ctx.fill();
      circle(ctx, ox + s * edx + 0.14, ey + 0.22, 0.1 * sc);
      ctx.fill();
    } else {
      // 怒眉（外高内低的 V 形斜线）
      soft(ctx, '#3a0d14', 0.32);
      ctx.beginPath();
      ctx.moveTo(ox + s * (edx + 0.9), ey - 1.55);
      ctx.lineTo(ox + s * (edx - 0.8), ey - 0.85);
      ctx.stroke();
      // 吊梢眼（旋转窄椭圆，外角上挑）
      ctx.fillStyle = '#241419';
      ellipse(ctx, ox + s * edx, ey, 0.55, 0.8, s * 0.38);
      ctx.fill();
      // 血红虹膜
      ctx.fillStyle = '#ff4433';
      ellipse(ctx, ox + s * edx + s * 0.05, ey + 0.12, 0.3, 0.42, s * 0.38);
      ctx.fill();
      // 高光
      ctx.fillStyle = '#ffffff';
      circle(ctx, ox + s * edx - 0.14, ey - 0.22, 0.14);
      ctx.fill();
    }
  }
  if (boss) {
    // 怒眉
    soft(ctx, '#4a2a66', 0.65);
    ctx.beginPath();
    ctx.moveTo(ox - edx - 1.1, ey - 1.7);
    ctx.lineTo(ox - edx + 0.85, ey - 1.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + edx + 1.1, ey - 1.7);
    ctx.lineTo(ox + edx - 0.85, ey - 1.05);
    ctx.stroke();
  }
  // 嘴：BOSS 弧线嘴；小怪咧嘴獠牙（狰狞）
  if (boss) {
    soft(ctx, 'rgba(60,25,90,0.75)', 0.38);
    ctx.beginPath();
    ctx.arc(ox, ey + 1.15, 1.1, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else {
    // 张开的暗红咧嘴（狰狞大笑）
    ctx.fillStyle = '#3d0810';
    ctx.beginPath();
    ctx.arc(ox, ey + 0.55, 1.5, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    // 口腔深红渐层
    ctx.fillStyle = '#7e1622';
    ctx.beginPath();
    ctx.arc(ox, ey + 0.55, 1.5, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.closePath();
    ctx.fill();
    // 上下獠牙（上牙长、下牙短）
    ctx.fillStyle = '#fff3ea';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(ox + s * 1.02 - 0.26, ey + 0.72);
      ctx.lineTo(ox + s * 1.02 + 0.26, ey + 0.72);
      ctx.lineTo(ox + s * 1.02, ey + 1.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox + s * 0.42 - 0.18, ey + 1.68);
      ctx.lineTo(ox + s * 0.42 + 0.18, ey + 1.68);
      ctx.lineTo(ox + s * 0.42, ey + 1.28);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ============================================================
// 大树
// ============================================================
function drawTree(ctx) {
  // 树干（先画，树冠压住上沿）
  ctx.fillStyle = lg(ctx, 6.5, 0, 9.5, 0, [[0, '#9a6a3c'], [0.5, '#8a5a33'], [1, '#6e4426']]);
  rr(ctx, 6.8, 11.9, 2.4, 3.7, [0.7, 0.7, 1.0, 1.0]);
  ctx.fill();
  ctx.fillStyle = lg(ctx, 5.5, 0, 10.5, 0, [[0, '#8a5a33'], [1, '#5d3a20']]);
  rr(ctx, 5.8, 14.4, 4.4, 1.2, 0.6);
  ctx.fill();

  // 树冠（大而蓬松：多圆并集成剪影，再整体加体积光）
  ctx.fillStyle = '#54b34a';
  circle(ctx, 8, 5.9, 4.9);
  ctx.fill();
  circle(ctx, 4.3, 8.6, 3.9);
  ctx.fill();
  circle(ctx, 11.7, 8.6, 3.9);
  ctx.fill();
  circle(ctx, 8, 9.5, 4.2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = rg(ctx, 5.5, 4, 12, [
    [0, 'rgba(205,242,150,0.9)'], [0.45, 'rgba(120,200,95,0.2)'], [1, 'rgba(40,120,50,0.6)'],
  ]);
  ctx.fillRect(0, 0, 16, 16);
  ctx.globalCompositeOperation = 'source-over';
  // 高光叶斑
  ctx.fillStyle = 'rgba(235,255,190,0.55)';
  circle(ctx, 6.1, 3.7, 0.6);
  ctx.fill();
  circle(ctx, 10.1, 4.6, 0.48);
  ctx.fill();
  circle(ctx, 3.7, 7.5, 0.44);
  ctx.fill();
  circle(ctx, 12.8, 7.6, 0.46);
  ctx.fill();
  circle(ctx, 8.2, 6.9, 0.4);
  ctx.fill();
  // 中层叶团（参考图的层叠叶簇感）
  ctx.fillStyle = 'rgba(86,178,74,0.5)';
  circle(ctx, 6.3, 6.6, 1.75);
  ctx.fill();
  circle(ctx, 10.5, 7.2, 1.6);
  ctx.fill();
  circle(ctx, 8.1, 4.5, 1.8);
  ctx.fill();
  // 底层暗色叶团
  ctx.fillStyle = 'rgba(45,110,45,0.45)';
  circle(ctx, 5.1, 9.4, 1.9);
  ctx.fill();
  circle(ctx, 11.3, 9.6, 1.8);
  ctx.fill();
  circle(ctx, 8.2, 10.8, 1.6);
  ctx.fill();
  // 花果点缀
  ctx.fillStyle = '#ff8a9d';
  circle(ctx, 4.9, 5.7, 0.42);
  ctx.fill();
  circle(ctx, 12.0, 6.1, 0.38);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  circle(ctx, 4.78, 5.58, 0.15);
  ctx.fill();
  circle(ctx, 11.9, 6.0, 0.13);
  ctx.fill();
  // 树冠在树干上的投影
  ctx.fillStyle = 'rgba(35,60,30,0.3)';
  ellipse(ctx, 8, 12.6, 1.9, 0.55);
  ctx.fill();
}

// ============================================================
// 符文石（发光 / 失效）
// ============================================================
function drawRune(ctx, cracked) {
  // 底座
  ctx.fillStyle = lg(ctx, 0, 14.3, 0, 16.5, [[0, '#9894b0'], [1, '#6a6684']]);
  ellipse(ctx, 8, 15.35, 4.7, 1.1);
  ctx.fill();
  // 石板
  ctx.fillStyle = cracked
    ? lg(ctx, 2, 1, 14, 15, [[0, '#aeaac0'], [1, '#84809a']])
    : lg(ctx, 2, 1, 14, 15, [[0, '#c8c4d8'], [1, '#948fae']]);
  rr(ctx, 2.6, 1.3, 10.8, 13.5, [2.6, 2.6, 1.4, 1.4]);
  ctx.fill();
  // 左上受光 / 右下背光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, 3.3, 2.0, 9.4, 2.2, [2.0, 2.0, 0.8, 0.8]);
  ctx.fill();
  ctx.fillStyle = 'rgba(40,35,60,0.18)';
  rr(ctx, 3.3, 11.0, 9.4, 3.1, [0.8, 0.8, 1.2, 1.2]);
  ctx.fill();
  // 内面板
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, 4.3, 3.1, 7.4, 10.0, 1.6);
  ctx.fill();
  // 雕刻边框 + 角铆钉
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.5;
  rr(ctx, 3.6, 2.3, 8.8, 11.5, 2.0);
  ctx.stroke();
  ctx.fillStyle = '#e8c56a';
  for (const [sx, sy] of [[3.7, 2.7], [12.3, 2.7], [3.7, 13.4], [12.3, 13.4]]) {
    circle(ctx, sx, sy, 0.42);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,95,20,0.5)';
  for (const [sx, sy] of [[3.7, 2.7], [12.3, 2.7], [3.7, 13.4], [12.3, 13.4]]) {
    circle(ctx, sx + 0.1, sy + 0.12, 0.18);
    ctx.fill();
  }

  // 循环符文（双弧箭头）
  const glow = cracked ? 'rgba(61,218,215,0.28)' : '#3ddad7';
  if (!cracked) {
    ctx.shadowColor = 'rgba(61,218,215,0.9)';
    ctx.shadowBlur = 7;
  }
  soft(ctx, glow, 0.95);
  ctx.beginPath();
  ctx.arc(8, 8.1, 2.45, -0.22 * Math.PI, 0.72 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, 8.1, 2.45, 0.78 * Math.PI, 1.72 * Math.PI);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // 箭头
  ctx.fillStyle = glow;
  const arrow = (px, py, ang) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0.15, -0.62);
    ctx.lineTo(0.95, 0.1);
    ctx.lineTo(0.15, 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  arrow(10.35, 6.6, 0.35 * Math.PI);
  arrow(5.65, 9.6, 0.35 * Math.PI + Math.PI);

  if (cracked) {
    // 裂纹 + 缺口
    soft(ctx, 'rgba(40,36,56,0.85)', 0.6);
    ctx.beginPath();
    ctx.moveTo(8.4, 1.5);
    ctx.lineTo(7.3, 4.5);
    ctx.lineTo(9.1, 7.3);
    ctx.lineTo(7.7, 10.5);
    ctx.lineTo(8.7, 14.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7.3, 4.5);
    ctx.lineTo(5.6, 5.6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,36,56,0.75)';
    ellipse(ctx, 11.6, 4.1, 0.85, 0.6, 0.5);
    ctx.fill();
  }
  // 苔藓
  ctx.fillStyle = 'rgba(100,170,90,0.55)';
  ellipse(ctx, 3.5, 12.9, 0.95, 0.6);
  ctx.fill();
  ellipse(ctx, 12.4, 13.3, 0.8, 0.5);
  ctx.fill();
}

// ============================================================
// 碎片 / 爱心
// ============================================================
function drawShard(ctx) {
  ctx.fillStyle = lg(ctx, 5, 0.5, 5, 11.5, [[0, '#ffe98c'], [0.55, '#f8c04a'], [1, '#e89428']]);
  ctx.beginPath();
  ctx.moveTo(5, 0.8);
  ctx.lineTo(9.3, 6.0);
  ctx.lineTo(5, 11.2);
  ctx.lineTo(0.7, 6.0);
  ctx.closePath();
  ctx.fill();
  // 切面
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(5, 0.8);
  ctx.lineTo(0.7, 6.0);
  ctx.lineTo(5, 6.0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(140,80,20,0.28)';
  ctx.beginPath();
  ctx.moveTo(5, 6.0);
  ctx.lineTo(9.3, 6.0);
  ctx.lineTo(5, 11.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,90,20,0.5)';
  ctx.lineWidth = 0.35;
  ctx.stroke();
  // 星芒
  ctx.fillStyle = '#ffffff';
  circle(ctx, 4.0, 3.4, 0.5);
  ctx.fill();
  circle(ctx, 6.1, 5.2, 0.3);
  ctx.fill();
}

function heartPath(ctx) {
  ctx.beginPath();
  ctx.arc(2.85, 2.95, 2.05, 0, TAU);
  ctx.arc(6.15, 2.95, 2.05, 0, TAU);
  ctx.moveTo(0.85, 3.7);
  ctx.lineTo(4.5, 7.4);
  ctx.lineTo(8.15, 3.7);
  ctx.closePath();
}

function drawHeart(ctx, mode) {
  // mode: 'full' | 'half' | 'empty'
  if (mode === 'half') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(4.5, 0, 4.5, 8);
    ctx.clip();
    ctx.fillStyle = lg(ctx, 1, 0.5, 8, 7, [[0, '#b4b0c4'], [1, '#8a8698']]);
    heartPath(ctx);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  if (mode === 'half') {
    ctx.beginPath();
    ctx.rect(0, 0, 4.5, 8);
    ctx.clip();
  }
  ctx.fillStyle = mode === 'empty'
    ? lg(ctx, 1, 0.5, 8, 7, [[0, '#b4b0c4'], [1, '#8a8698']])
    : lg(ctx, 1, 0.5, 8, 7, [[0, '#ff9fb0'], [0.55, '#f25670'], [1, '#d63a56']]);
  heartPath(ctx);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ellipse(ctx, 2.7, 2.3, 0.9, 0.55, -0.5);
  ctx.fill();
}

// ============================================================
// 火把
// ============================================================
function drawTorch(ctx, frame) {
  // 木杆
  ctx.fillStyle = lg(ctx, 3, 0, 5, 0, [[0, '#a06a38'], [1, '#6e4426']]);
  rr(ctx, 3.15, 6.6, 1.7, 7.5, 0.6);
  ctx.fill();
  // 箍带
  ctx.fillStyle = '#5d3a20';
  rr(ctx, 2.9, 6.7, 2.2, 1.3, 0.5);
  ctx.fill();
  // 底座
  ctx.fillStyle = lg(ctx, 0, 13.4, 0, 15, [[0, '#8a5a33'], [1, '#5d3a20']]);
  ellipse(ctx, 4, 14.25, 1.75, 0.75);
  ctx.fill();
  // 碗
  ctx.fillStyle = lg(ctx, 0, 5.4, 0, 7.3, [[0, '#5d5878'], [1, '#3a3550']]);
  ellipse(ctx, 4, 6.45, 2.55, 0.95);
  ctx.fill();
  ctx.fillStyle = '#2e2430';
  ellipse(ctx, 4, 6.2, 1.65, 0.5);
  ctx.fill();

  // 火焰（泪滴形，帧间摇曳）
  ctx.save();
  if (frame === 1) {
    ctx.translate(0.5, -0.12);
    ctx.rotate(0.1);
    ctx.scale(0.92, 0.95);
  }
  ctx.shadowColor = 'rgba(255,170,60,0.85)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = lg(ctx, 4, 0.8, 4, 6.1, [[0, '#fff3b0'], [0.45, '#ffc35c'], [1, '#f07830']]);
  ctx.beginPath();
  ctx.moveTo(4, 0.7);
  ctx.bezierCurveTo(6.7, 2.1, 6.3, 4.7, 4, 6.05);
  ctx.bezierCurveTo(1.7, 4.7, 1.3, 2.1, 4, 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,252,220,0.9)';
  ctx.beginPath();
  ctx.moveTo(4, 1.7);
  ctx.bezierCurveTo(5.5, 2.7, 5.3, 4.4, 4, 5.35);
  ctx.bezierCurveTo(2.7, 4.4, 2.5, 2.7, 4, 1.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ============================================================
// 石门（关/开）
// ============================================================
function drawGate(ctx, open) {
  // 门内空间
  ctx.fillStyle = lg(ctx, 0, 3, 0, 31.5, [[0, '#2a2540'], [1, '#161320']]);
  ctx.fillRect(5.6, 3.2, 20.8, 28.2);

  if (!open) {
    // 木栅栏
    for (const bx of [8.4, 12.4, 16.4, 20.4, 24.4]) {
      ctx.fillStyle = lg(ctx, bx - 1, 0, bx + 1, 0, [[0, '#a06a38'], [1, '#6e4426']]);
      rr(ctx, bx - 1.0, 3.2, 2.0, 28.0, 0.9);
      ctx.fill();
    }
    for (const by of [9.4, 21.6]) {
      ctx.fillStyle = '#8a5a33';
      rr(ctx, 5.4, by, 21.2, 1.7, 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,160,0.25)';
      rr(ctx, 5.8, by + 0.25, 20.4, 0.5, 0.25);
      ctx.fill();
    }
  } else {
    // 开启：深处微光
    ctx.fillStyle = lg(ctx, 0, 3, 0, 31.5, [[0, 'rgba(120,210,220,0.12)'], [1, 'rgba(120,210,220,0)']]);
    ctx.fillRect(5.6, 3.2, 20.8, 14);
  }

  // 石柱
  const pillar = (x) => {
    ctx.fillStyle = lg(ctx, x, 0, x + 6, 0, [[0, '#b8b4c8'], [0.55, '#a09cb8'], [1, '#84809a']]);
    rr(ctx, x, 1.0, 6.0, 30.6, [1.2, 1.2, 1.0, 1.0]);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,55,85,0.3)';
    for (const by of [8.5, 17.5, 26]) {
      rr(ctx, x + 0.7, by, 4.6, 0.8, 0.4);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(110,180,100,0.4)';
    circle(ctx, x + 1.5, 28.5, 0.75);
    ctx.fill();
    circle(ctx, x + 4.4, 5.6, 0.6);
    ctx.fill();
  };
  pillar(0.6);
  pillar(25.4);

  // 顶梁
  ctx.fillStyle = lg(ctx, 0, 0, 0, 3.6, [[0, '#c4c0d4'], [1, '#948fae']]);
  rr(ctx, 0, 0.4, 32, 3.2, 1.2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40,35,60,0.35)';
  ctx.fillRect(1, 3.15, 30, 0.55);
  // 垂藤（古旧封印感）
  ctx.strokeStyle = 'rgba(90,160,80,0.85)';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(10.2, 3.6);
  ctx.quadraticCurveTo(9.4, 9.0, 10.6, 14.0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22.0, 3.6);
  ctx.quadraticCurveTo(22.8, 10.0, 21.6, 16.5);
  ctx.stroke();
  ctx.fillStyle = '#6fbf5e';
  ellipse(ctx, 9.6, 6.4, 1.05, 0.55, -0.5);
  ctx.fill();
  ellipse(ctx, 10.9, 10.2, 0.95, 0.5, 0.5);
  ctx.fill();
  ellipse(ctx, 22.5, 7.6, 1.0, 0.52, 0.45);
  ctx.fill();
  ellipse(ctx, 21.4, 12.4, 0.9, 0.48, -0.4);
  ctx.fill();
}

// ============================================================
// 民居
// ============================================================
function drawHouse(ctx) {
  // 墙体
  ctx.fillStyle = lg(ctx, 0, 27, 0, 55.5, [[0, '#f9ecd0'], [1, '#e9d0a2']]);
  ctx.fillRect(8, 26.5, 48, 29);
  // 木梁（角柱 + 顶梁）
  ctx.fillStyle = lg(ctx, 0, 26, 0, 55, [[0, '#b5813f'], [1, '#96602f']]);
  rr(ctx, 8, 26.5, 3.4, 29, 0.8);
  ctx.fill();
  rr(ctx, 52.6, 26.5, 3.4, 29, 0.8);
  ctx.fill();
  rr(ctx, 8, 26.5, 48, 3.2, 0.8);
  ctx.fill();
  // 墙面木板纹
  ctx.strokeStyle = 'rgba(196,152,96,0.4)';
  ctx.lineWidth = 0.5;
  for (const py of [32.5, 44.5, 50.5]) {
    ctx.beginPath();
    ctx.moveTo(11.8, py);
    ctx.lineTo(52.2, py);
    ctx.stroke();
  }

  // 门（拱形）
  ctx.fillStyle = lg(ctx, 27, 37, 37, 55.5, [[0, '#a06a38'], [1, '#6e4426']]);
  rr(ctx, 26.5, 37.5, 11, 18, [5.5, 5.5, 1.0, 1.0]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,42,20,0.7)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,35,15,0.45)';
  ctx.lineWidth = 0.45;
  for (const dx of [30.2, 33.8]) {
    ctx.beginPath();
    ctx.moveTo(dx, 40);
    ctx.lineTo(dx, 55.2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd257';
  circle(ctx, 35.3, 46.8, 0.85);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,95,20,0.6)';
  circle(ctx, 35.55, 47.05, 0.3);
  ctx.fill();
  // 门前台阶
  ctx.fillStyle = lg(ctx, 0, 54.6, 0, 56.4, [[0, '#c0bccf'], [1, '#948fae']]);
  ellipse(ctx, 32, 55.55, 7.6, 1.45);
  ctx.fill();

  // 窗户 ×2
  for (const wx of [13.5, 41.5]) {
    ctx.fillStyle = '#a5713c';
    rr(ctx, wx, 33, 9.5, 9, 1.2);
    ctx.fill();
    ctx.fillStyle = lg(ctx, wx + 1, 34, wx + 8.5, 41, [[0, '#9beee6'], [1, '#3bb8b5']]);
    rr(ctx, wx + 0.95, 33.95, 7.6, 7.1, 0.8);
    ctx.fill();
    ctx.fillStyle = rg(ctx, wx + 3, 35, 4.5, [[0, 'rgba(255,255,240,0.5)'], [1, 'rgba(255,255,240,0)']]);
    rr(ctx, wx + 0.95, 33.95, 7.6, 7.1, 0.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(wx + 4.3, 34, 1.0, 7.1);
    ctx.fillRect(wx + 1, 37, 7.6, 1.0);
    // 窗台花箱
    ctx.fillStyle = lg(ctx, wx - 0.7, 42, wx + 10.2, 44.6, [[0, '#a5713c'], [1, '#7d4f28']]);
    rr(ctx, wx - 0.7, 42, 10.9, 2.5, 0.7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,42,20,0.55)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,42,20,0.4)';
    ctx.fillRect(wx + 1.4, 42.4, 0.8, 1.7);
    ctx.fillRect(wx + 8.0, 42.4, 0.8, 1.7);
    for (const [fx, fc] of [[wx + 1.7, '#ff8a9d'], [wx + 4.75, '#ffd257'], [wx + 7.8, '#ff8a9d']]) {
      ctx.fillStyle = '#4d9c46';
      circle(ctx, fx - 0.42, 41.75, 0.4);
      ctx.fill();
      circle(ctx, fx + 0.42, 41.7, 0.36);
      ctx.fill();
      ctx.fillStyle = fc;
      circle(ctx, fx, 41.4, 0.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      circle(ctx, fx - 0.16, 41.24, 0.18);
      ctx.fill();
    }
  }

  // 屋顶（粉彩玫红，弧形檐口 + 瓦鳞）
  ctx.fillStyle = lg(ctx, 0, 1, 0, 27, [[0, '#ffb3c6'], [0.5, '#f07a97'], [1, '#d95d7e']]);
  ctx.beginPath();
  ctx.moveTo(32, 1.4);
  ctx.quadraticCurveTo(50, 6, 58.6, 26.6);
  ctx.lineTo(5.4, 26.6);
  ctx.quadraticCurveTo(14, 6, 32, 1.4);
  ctx.closePath();
  ctx.fill();
  // 瓦鳞 + 侧影（裁剪在屋顶内）
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(32, 1.4);
  ctx.quadraticCurveTo(50, 6, 58.6, 26.6);
  ctx.lineTo(5.4, 26.6);
  ctx.quadraticCurveTo(14, 6, 32, 1.4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(170,55,85,0.35)';
  ctx.lineWidth = 0.8;
  for (const [ry, hw] of [[9.5, 15.5], [15.5, 21.5], [21.5, 26.5]]) {
    for (let sx = 32 - hw; sx <= 32 + hw; sx += 4.6) {
      ctx.beginPath();
      ctx.arc(sx, ry, 2.4, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(120,30,55,0.22)';
  ctx.beginPath();
  ctx.moveTo(58.6, 26.6);
  ctx.quadraticCurveTo(56, 12, 48, 5);
  ctx.lineTo(58.6, 26.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ellipse(ctx, 26, 5.4, 6.5, 1.6, -0.18);
  ctx.fill();
  ctx.restore();
  // 檐口
  ctx.fillStyle = '#c94f68';
  rr(ctx, 4.6, 25.7, 54.8, 3.0, 1.4);
  ctx.fill();
  ctx.fillStyle = 'rgba(90,25,45,0.35)';
  rr(ctx, 4.6, 27.4, 54.8, 1.3, 0.65);
  ctx.fill();
  // 烟囱（立在屋坡上）
  ctx.fillStyle = 'rgba(120,30,55,0.25)';
  ellipse(ctx, 41.3, 14.6, 4.6, 1.3);
  ctx.fill();
  ctx.fillStyle = lg(ctx, 37.8, 3, 44.4, 14, [[0, '#c4c0d4'], [1, '#84809a']]);
  rr(ctx, 38.0, 3.8, 6.2, 10.8, 0.9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,65,100,0.55)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,65,100,0.42)';
  ctx.fillRect(38.3, 6.6, 5.6, 0.55);
  ctx.fillRect(38.3, 9.8, 5.6, 0.55);
  ctx.fillRect(38.3, 13.0, 5.6, 0.55);
  ctx.fillRect(40.9, 4.2, 0.55, 2.2);
  ctx.fillRect(39.6, 7.2, 0.55, 2.4);
  ctx.fillRect(42.2, 7.2, 0.55, 2.4);
  ctx.fillRect(39.6, 10.4, 0.55, 2.4);
  ctx.fillRect(42.2, 10.4, 0.55, 2.4);
  // 烟囱帽
  ctx.fillStyle = '#b8b4c8';
  rr(ctx, 37.2, 2.1, 7.8, 2.3, 1.0);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,26,48,0.6)';
  rr(ctx, 38.2, 2.6, 5.8, 1.1, 0.5);
  ctx.fill();
  // 炊烟
  ctx.fillStyle = 'rgba(248,248,252,0.55)';
  circle(ctx, 41.2, 1.0, 0.95);
  ctx.fill();
  ctx.fillStyle = 'rgba(248,248,252,0.3)';
  circle(ctx, 43.0, 0.5, 0.7);
  ctx.fill();
}

// ============================================================
// 传送门
// ============================================================
function drawPortalDoor(ctx) {
  const arch = (inset) => {
    const x0 = 1.5 + inset, x1 = 22.5 - inset;
    const y1 = 23.9 - inset * 0.3;
    const top = 3.5 + inset * 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, 9.5);
    ctx.quadraticCurveTo(x0, top, 12, top);
    ctx.quadraticCurveTo(x1, top, x1, 9.5);
    ctx.lineTo(x1, y1);
    ctx.closePath();
  };
  // 石框
  ctx.fillStyle = lg(ctx, 0, 2, 0, 24, [[0, '#b4b0c4'], [1, '#7d798e']]);
  arch(0);
  ctx.fill();
  // 门洞
  ctx.fillStyle = '#191525';
  arch(3.2);
  ctx.fill();
  // 传送涡光
  ctx.save();
  arch(3.2);
  ctx.clip();
  ctx.fillStyle = rg(ctx, 12, 16.5, 10, [
    [0, 'rgba(61,218,215,0.65)'], [0.6, 'rgba(61,218,215,0.18)'], [1, 'rgba(61,218,215,0)'],
  ]);
  ctx.fillRect(0, 0, 24, 24);
  soft(ctx, 'rgba(160,245,240,0.55)', 0.8);
  ctx.beginPath();
  ctx.arc(12, 16.5, 3.1, 0.2 * Math.PI, 1.35 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 16.5, 5.4, 1.1 * Math.PI, 2.2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // 高光
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(2.6, 10);
  ctx.quadraticCurveTo(2.8, 4.6, 12, 4.6);
  ctx.stroke();
  // 台阶
  ctx.fillStyle = lg(ctx, 0, 22.6, 0, 24, [[0, '#a8a4b8'], [1, '#7d798e']]);
  ellipse(ctx, 12, 23.85, 8.6, 1.5);
  ctx.fill();
}

// ============================================================
// 地形瓦片绘制器（供地面画布复用）
// opts: { corners: [tl,tr,br,bl] 路径圆角, edges: {n,s,e,w} 水岸, frame: 水帧, gx, gy }
// ============================================================
export function drawGroundTile(ctx, v, rand, opts = {}) {
  const grassBase = (v2) => {
    // 平铺底色（明暗变化交给整图大尺度光斑，避免逐格渐变的棋盘感）
    const tones = v2 === 1 ? ['#97d86c'] : ['#8fd265', '#93d468', '#8bd05f'];
    ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
    ctx.fillRect(0, 0, 16, 16);
    // 柔和光斑 / 暗斑（低透明度，避免逐格方块感）
    for (let i = 0; i < 2; i++) {
      const x = rand() * 16, y = rand() * 16, r = 3 + rand() * 3.5;
      ctx.fillStyle = rg(ctx, x, y, r, [[0, 'rgba(255,255,240,0.06)'], [1, 'rgba(255,255,240,0)']]);
      ctx.fillRect(0, 0, 16, 16);
    }
    for (let i = 0; i < 2; i++) {
      const x = rand() * 16, y = rand() * 16, r = 2.5 + rand() * 3;
      ctx.fillStyle = rg(ctx, x, y, r, [[0, 'rgba(60,130,50,0.08)'], [1, 'rgba(60,130,50,0)']]);
      ctx.fillRect(0, 0, 16, 16);
    }
    // 色相斑驳（暖黄绿 / 冷蓝绿大团，极低对比避免摩尔纹）
    if (rand() < 0.8) {
      const x = rand() * 16, y = rand() * 16, r = 4 + rand() * 5;
      const warm = rand() < 0.5;
      ctx.fillStyle = rg(ctx, x, y, r, [
        [0, warm ? 'rgba(214,238,120,0.11)' : 'rgba(110,205,155,0.11)'], [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(0, 0, 16, 16);
    }
    // 零星泥点
    if (rand() < 0.3) {
      ctx.fillStyle = 'rgba(122,92,56,0.18)';
      circle(ctx, 2 + rand() * 12, 2 + rand() * 12, 0.35 + rand() * 0.3);
      ctx.fill();
    }
  };
  // 草叶（柔和大方的笔触，低对比 → 缩小时不产生摩尔纹）
  const blades = (n) => {
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = 1.5 + rand() * 13, y = 4.5 + rand() * 10.5;
      const h = 1.6 + rand() * 2.2, lean = (rand() - 0.5) * 2.0;
      const light = rand() < 0.4;
      ctx.strokeStyle = light ? 'rgba(220,246,168,0.45)' : `rgba(80,152,62,${0.26 + rand() * 0.18})`;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
      ctx.stroke();
    }
  };

  switch (v) {
    case 0: case 1: case 10: case 11: {
      grassBase(v);
      blades(v === 10 ? 12 : 7);
      if (v === 11) {
        // 碎石 + 白花点
        for (const [px, py] of [[6.2, 6.4], [11.4, 11.2]]) {
          ctx.fillStyle = lg(ctx, px - 1, py - 1, px + 1, py + 1, [[0, '#d8d4c8'], [1, '#a8a498']]);
          ellipse(ctx, px, py, 1.05, 0.8);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          circle(ctx, px - 0.3, py - 0.25, 0.3);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        circle(ctx, 12.6, 3.4, 0.35);
        ctx.fill();
        circle(ctx, 3.2, 12.6, 0.35);
        ctx.fill();
      }
      break;
    }
    case 2: {
      // 草垫底（圆角外露出草色）
      ctx.fillStyle = '#86c95c';
      ctx.fillRect(0, 0, 16, 16);
      const corners = opts.corners || [0, 0, 0, 0];
      ctx.fillStyle = '#e6cf95';
      rr(ctx, 0, 0, 16, 16, corners);
      ctx.fill();
      // 仅在朝向草地的边界侧轻微压暗（避免逐格描边的分段感）
      const nb = opts.nb || {};
      const EDGE = 'rgba(145,112,62,0.22)';
      if (!nb.t) { ctx.fillStyle = lg(ctx, 0, 0, 0, 2.2, [[0, EDGE], [1, 'rgba(145,112,62,0)']]); ctx.fillRect(0, 0, 16, 2.2); }
      if (!nb.b) { ctx.fillStyle = lg(ctx, 0, 13.8, 0, 16, [[0, 'rgba(145,112,62,0)'], [1, EDGE]]); ctx.fillRect(0, 13.8, 16, 2.2); }
      if (!nb.l) { ctx.fillStyle = lg(ctx, 0, 0, 2.2, 0, [[0, EDGE], [1, 'rgba(145,112,62,0)']]); ctx.fillRect(0, 0, 2.2, 16); }
      if (!nb.r) { ctx.fillStyle = lg(ctx, 13.8, 0, 16, 0, [[0, 'rgba(145,112,62,0)'], [1, EDGE]]); ctx.fillRect(13.8, 0, 2.2, 16); }
      // 细沙
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(175,145,88,${0.18 + rand() * 0.15})`;
        circle(ctx, 1 + rand() * 14, 1 + rand() * 14, 0.3 + rand() * 0.25);
        ctx.fill();
      }
      // 随机鹅卵石（0–2 颗，位置随机避免逐格重复感）
      const pebbles = Math.floor(rand() * 3);
      for (let i = 0; i < pebbles; i++) {
        const px = 2.6 + rand() * 10.8, py = 2.6 + rand() * 10.8;
        ctx.fillStyle = rg(ctx, px - 0.4, py - 0.4, 2, [[0, '#dcc492'], [1, '#bd9f6a']]);
        ellipse(ctx, px, py, 1.35, 0.95);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,250,230,0.5)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(px - 0.2, py - 0.2, 0.7, Math.PI * 1.05, Math.PI * 1.65);
        ctx.stroke();
      }
      break;
    }
    case 3: case 4: case 9: {
      const frame = opts.frame || 0;
      ctx.fillStyle = lg(ctx, 0, 0, 0, 16, [[0, '#54bdef'], [0.55, '#3ea4de'], [1, '#3191cd']]);
      ctx.fillRect(0, 0, 16, 16);
      // 深水斑（稀疏一点，避免逐格方块感）
      if (rand() < 0.6) {
        const x = rand() * 16, y = 3 + rand() * 10, r = 3 + rand() * 3;
        ctx.fillStyle = rg(ctx, x, y, r, [[0, 'rgba(25,90,150,0.13)'], [1, 'rgba(25,90,150,0)']]);
        ctx.fillRect(0, 0, 16, 16);
      }
      // 一条贯穿长波纹（周期 16px 横向无缝，帧间下漂）
      const y0 = 4.5 + frame * 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let x = 0; x <= 16; x += 2) {
        const y = y0 + Math.sin((x / 16) * TAU + frame * 1.3) * 0.8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 短波光（少量、细长，帧间闪烁）
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const dx = 1.5 + rand() * 10, dy = 2 + rand() * 11, len = 2.5 + rand() * 3;
        ctx.strokeStyle = `rgba(255,255,255,${0.28 + rand() * 0.18})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.quadraticCurveTo(dx + len * 0.5, dy - 0.5, dx + len, dy);
        ctx.stroke();
      }
      // 波光点
      if (rand() < 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        circle(ctx, 2 + rand() * 12, 2 + rand() * 12, 0.36);
        ctx.fill();
      }
      // 岸边浅水（地面画布专用）
      const e = opts.edges;
      if (e && e.n) {
        ctx.fillStyle = lg(ctx, 0, 0, 0, 4, [[0, 'rgba(215,242,255,0.55)'], [1, 'rgba(215,242,255,0)']]);
        ctx.fillRect(0, 0, 16, 4);
      }
      if (e && e.s) {
        ctx.fillStyle = lg(ctx, 0, 12, 0, 16, [[0, 'rgba(215,242,255,0)'], [1, 'rgba(215,242,255,0.55)']]);
        ctx.fillRect(0, 12, 16, 4);
      }
      if (e && e.w) {
        ctx.fillStyle = lg(ctx, 0, 0, 4, 0, [[0, 'rgba(215,242,255,0.55)'], [1, 'rgba(215,242,255,0)']]);
        ctx.fillRect(0, 0, 4, 16);
      }
      if (e && e.e) {
        ctx.fillStyle = lg(ctx, 12, 0, 16, 0, [[0, 'rgba(215,242,255,0)'], [1, 'rgba(215,242,255,0.55)']]);
        ctx.fillRect(12, 0, 4, 16);
      }
      break;
    }
    case 5: {
      grassBase(0);
      blades(4);
      const flower = (px, py, petal, core) => {
        ctx.fillStyle = petal;
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * TAU - Math.PI / 2;
          circle(ctx, px + Math.cos(ang) * 0.95, py + Math.sin(ang) * 0.95, 0.62);
          ctx.fill();
        }
        ctx.fillStyle = core;
        circle(ctx, px, py, 0.6);
        ctx.fill();
      };
      flower(4.6, 4.8, '#ff9dbb', '#fff6f8');
      flower(11.2, 10.6, '#ffd257', '#fff0b8');
      break;
    }
    case 6: {
      const odd = ((opts.gx || 0) + (opts.gy || 0)) % 2 === 1;
      ctx.fillStyle = lg(ctx, 0, 0, 0, 16, [[0, odd ? '#75718a' : '#6e6a80'], [1, odd ? '#635f76' : '#5d5970']]);
      ctx.fillRect(0, 0, 16, 16);
      // 石板缝
      ctx.fillStyle = 'rgba(28,24,44,0.5)';
      ctx.fillRect(0, 0, 16, 0.55);
      ctx.fillRect(0, 0, 0.55, 16);
      ctx.fillRect(0, 7.8 + (odd ? 2.4 : 0), 16, 0.5);
      ctx.fillRect(odd ? 10.5 : 4.5, 1, 0.5, 15);
      // 高光 / 裂纹
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(2 + rand() * 8, 2 + rand() * 8, 3, 0.6);
      if (rand() < 0.35) {
        soft(ctx, 'rgba(25,22,40,0.5)', 0.4);
        const cx0 = 3 + rand() * 9, cy0 = 3 + rand() * 9;
        ctx.beginPath();
        ctx.moveTo(cx0, cy0);
        ctx.lineTo(cx0 + 2.5, cy0 + 1.2);
        ctx.lineTo(cx0 + 4.5, cy0 + 0.6);
        ctx.stroke();
      }
      break;
    }
    case 7: {
      ctx.fillStyle = lg(ctx, 0, 0, 0, 16, [[0, '#5f5a7e'], [1, '#443f5c']]);
      ctx.fillRect(0, 0, 16, 16);
      // 墙顶（顶面受光）
      ctx.fillStyle = lg(ctx, 0, 0, 0, 3.6, [[0, '#6d688f'], [1, '#575276']]);
      ctx.fillRect(0, 0, 16, 3.4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, 0, 16, 0.8);
      ctx.fillStyle = 'rgba(12,10,22,0.6)';
      ctx.fillRect(0, 3.4, 16, 0.8);
      // 砖缝（逐行错缝）
      ctx.fillStyle = 'rgba(24,20,40,0.5)';
      for (const by of [7.6, 11.6, 15.2]) ctx.fillRect(0, by, 16, 0.55);
      const rows = [[4.2, 8], [8.15, 8], [12.15, 8]];
      rows.forEach(([ty], i) => {
        const off = ((opts.gy || 0) + i) % 2 === 0 ? 4.5 : 10.5;
        ctx.fillRect(off, ty, 0.5, 3.45);
      });
      // 砖面高光 + 苔藓
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(1.5 + rand() * 8, 4.8, 3.5, 0.6);
      ctx.fillRect(2 + rand() * 8, 9.0, 2.8, 0.55);
      if (rand() < 0.4) {
        ctx.fillStyle = 'rgba(90,160,110,0.30)';
        ellipse(ctx, 2 + rand() * 12, 13.8 + rand() * 1.4, 1.1, 0.5);
        ctx.fill();
      }
      // 底部接触阴影
      ctx.fillStyle = lg(ctx, 0, 12.5, 0, 16, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
      ctx.fillRect(0, 12.5, 16, 3.5);
      break;
    }
    case 8: {
      ctx.fillStyle = lg(ctx, 0, 0, 16, 16, [[0, '#221e30'], [1, '#191527']]);
      ctx.fillRect(0, 0, 16, 16);
      break;
    }
    default: {
      ctx.fillStyle = '#83c758';
      ctx.fillRect(0, 0, 16, 16);
    }
  }
}

// ============================================================
// 入口：生成全部贴图
// ============================================================
export function generateAllTextures(scene) {
  // 角色（4x 高清矢量）
  const dirs = ['down', 'up', 'right'];
  for (const d of dirs) {
    for (let p = 0; p < 3; p++) {
      makeHires(scene, `player_${d}_${p}`, 16, 16, (ctx) => drawPlayer(ctx, d, p));
    }
  }
  makeHires(scene, 'elder', 16, 16, drawElder);
  makeHires(scene, 'slime_0', 16, 16, (ctx) => drawSlime(ctx, 0));
  makeHires(scene, 'slime_1', 16, 16, (ctx) => drawSlime(ctx, 1));
  makeHires(scene, 'slime_blue_0', 16, 16, (ctx) => drawSlime(ctx, 0, 'crimson'));
  makeHires(scene, 'slime_blue_1', 16, 16, (ctx) => drawSlime(ctx, 1, 'crimson'));
  makeHires(scene, 'boss', 24, 24, (ctx) => drawSlime(ctx, 0, 'boss'));

  // 第二章新贴图
  makeHires(scene, 'tablet', 14, 16, drawTablet);
  makeHires(scene, 'bush', 14, 10, drawBush);
  makeHires(scene, 'crystal', 14, 16, drawCrystal);
  makeHires(scene, 'shroom', 10, 10, drawShroom);
  makeHires(scene, 'snake_head', 16, 16, drawSnakeHead);
  makeHires(scene, 'snake_body', 12, 12, drawSnakeBody);

  // 道具
  makeHires(scene, 'tree', 16, 16, drawTree);
  makeHires(scene, 'rune', 16, 17, (ctx) => drawRune(ctx, false));
  makeHires(scene, 'rune_cracked', 16, 17, (ctx) => drawRune(ctx, true));
  makeHires(scene, 'shard', 10, 12, drawShard);
  makeHires(scene, 'heart_full', 9, 8, (ctx) => drawHeart(ctx, 'full'));
  makeHires(scene, 'heart_half', 9, 8, (ctx) => drawHeart(ctx, 'half'));
  makeHires(scene, 'heart_empty', 9, 8, (ctx) => drawHeart(ctx, 'empty'));
  makeHires(scene, 'torch_0', 8, 16, (ctx) => drawTorch(ctx, 0));
  makeHires(scene, 'torch_1', 8, 16, (ctx) => drawTorch(ctx, 1));
  makeHires(scene, 'house', 64, 56, drawHouse);
  makeHires(scene, 'gate_closed', 32, 32, (ctx) => drawGate(ctx, false));
  makeHires(scene, 'gate_open', 32, 32, (ctx) => drawGate(ctx, true));
  makeHires(scene, 'portal_door', 24, 24, drawPortalDoor);

  // 水面动画帧（独立贴图，供波浪动画循环）
  for (let f = 0; f < 3; f++) {
    makeHires(scene, `water_${f}`, 16, 16, (ctx) => drawGroundTile(ctx, 3, rng(f + 41), { frame: f }));
  }

  makeSlash(scene);
  makeShadow(scene);
  makeCloudShadow(scene);
  makeFoam(scene);
  makeParticle(scene);
}

// ============================================================
// 第二章贴图：函数石碑 / 灌木 / 水晶 / 发光蘑菇 / 列表巨蟒
// ============================================================
function drawTablet(ctx) {
  // 石碑主体
  ctx.fillStyle = lg(ctx, 3, 1, 11, 15, [[0, '#a8a4b8'], [0.55, '#8c879e'], [1, '#6d687f']]);
  rr(ctx, 3, 1.2, 8, 13.6, [2.6, 2.6, 1.6, 1.6]);
  ctx.fill();
  // 顶部圆头
  ellipse(ctx, 7, 2.6, 4, 1.9);
  ctx.fill();
  // 左侧受光面
  ctx.fillStyle = lg(ctx, 3.4, 2, 6.5, 14, [[0, 'rgba(255,255,255,0.34)'], [1, 'rgba(255,255,255,0)']]);
  rr(ctx, 3.6, 1.8, 3.2, 12.4, [2, 2, 1, 1]);
  ctx.fill();
  // 右侧暗面
  ctx.fillStyle = 'rgba(50,44,70,0.28)';
  rr(ctx, 9.2, 2.4, 1.7, 12, [0.8, 0.8, 0.7, 0.7]);
  ctx.fill();

  // 发光的函数符文（ƒ）
  ctx.save();
  ctx.shadowColor = 'rgba(61,218,215,0.9)';
  ctx.shadowBlur = 3;
  ctx.strokeStyle = '#7df0ec';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9.1, 5.2);
  ctx.quadraticCurveTo(6.2, 5.4, 7.4, 8.2);
  ctx.lineTo(6.9, 11.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5.6, 7.6);
  ctx.lineTo(9.4, 7.2);
  ctx.stroke();
  // 下方两颗参数点
  ctx.fillStyle = '#7df0ec';
  circle(ctx, 6.2, 12.8, 0.42);
  ctx.fill();
  circle(ctx, 8.2, 12.8, 0.42);
  ctx.fill();
  ctx.restore();

  // 苔藓底座
  ctx.fillStyle = 'rgba(80,150,70,0.85)';
  ellipse(ctx, 5.4, 14.4, 2.2, 0.85);
  ctx.fill();
  ellipse(ctx, 9.4, 14.2, 1.7, 0.7);
  ctx.fill();
}

function drawBush(ctx) {
  // 三团圆润的灌木
  const blob = (x, y, r, light) => {
    ctx.fillStyle = lg(ctx, x - r, y - r, x + r, y + r,
      light ? [[0, '#8ed47a'], [1, '#4d9c46']] : [[0, '#74c565'], [1, '#3f8c3f']]);
    circle(ctx, x, y, r);
    ctx.fill();
  };
  blob(4.6, 6.2, 3.2, false);
  blob(9.6, 6.4, 3.4, false);
  blob(7, 4.6, 3.4, true);
  // 底部阴影收边
  ctx.fillStyle = 'rgba(35,90,40,0.35)';
  ellipse(ctx, 7, 8.6, 5.4, 1.2);
  ctx.fill();
  // 高光叶斑
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(ctx, 5.4, 3.6, 1.3, 0.7, -0.4);
  ctx.fill();
  circle(ctx, 9.8, 4.4, 0.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,120,0.9)';
  circle(ctx, 11, 6.2, 0.4);
  ctx.fill();
  circle(ctx, 3.4, 6.8, 0.36);
  ctx.fill();
  circle(ctx, 7.2, 7.6, 0.34);
  ctx.fill();
  // 浆果高光
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  circle(ctx, 10.88, 6.06, 0.13);
  ctx.fill();
  circle(ctx, 3.3, 6.68, 0.12);
  ctx.fill();
}

function drawCrystal(ctx) {
  // 底座岩块
  ctx.fillStyle = lg(ctx, 2, 11, 12, 15, [[0, '#7a7490'], [1, '#57516b']]);
  ellipse(ctx, 7, 13.2, 5.4, 2.3);
  ctx.fill();

  const shard = (pts, stops) => {
    ctx.fillStyle = lg(ctx, pts[0][0], pts[0][1], pts[2][0], pts[2][1], stops);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  };
  // 左右小晶簇
  shard([[3.4, 6.4], [5.2, 8.2], [4.8, 12.6], [2.6, 12.4]],
    [[0, '#bdf7ef'], [1, '#2fa8b5']]);
  shard([[10.6, 5.2], [12.4, 7.6], [11.6, 12.8], [9.4, 12.2]],
    [[0, '#a5f0e8'], [1, '#2b98a8']]);
  // 中央主晶
  shard([[7, 1.6], [9.3, 6.2], [8.5, 13.2], [5.6, 13.2], [4.9, 6.4]],
    [[0, '#d9fffa'], [0.5, '#57d9d0'], [1, '#1f8494']]);
  // 晶面高光
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(6.5, 3.4);
  ctx.lineTo(7.3, 3.1);
  ctx.lineTo(6.9, 9.4);
  ctx.lineTo(6.1, 9.6);
  ctx.closePath();
  ctx.fill();
  // 微光
  ctx.fillStyle = 'rgba(140,255,244,0.35)';
  ellipse(ctx, 7, 12.4, 5.8, 1.6);
  ctx.fill();
  // 星芒
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(7.2, 3.9);
  ctx.lineTo(7.2, 6.5);
  ctx.moveTo(5.9, 5.2);
  ctx.lineTo(8.5, 5.2);
  ctx.stroke();
}

function drawShroom(ctx) {
  // 荧光蘑菇：先画光晕
  ctx.fillStyle = rg(ctx, 5, 4.6, 4.6, [
    [0, 'rgba(120,255,235,0.5)'], [0.6, 'rgba(120,255,235,0.16)'], [1, 'rgba(120,255,235,0)'],
  ]);
  ctx.fillRect(-1, -1, 12, 12);
  // 菌柄
  ctx.fillStyle = lg(ctx, 4, 5, 6, 9, [[0, '#f2ead2'], [1, '#c9bfa4']]);
  rr(ctx, 4.1, 4.8, 1.8, 4.1, 0.8);
  ctx.fill();
  // 菌盖（半球）
  ctx.fillStyle = lg(ctx, 1.6, 1, 8.4, 6, [[0, '#8ff5e4'], [0.7, '#35c8c0'], [1, '#1d9aa0']]);
  ctx.beginPath();
  ctx.ellipse(5, 4.9, 3.7, 2.9, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(30,120,130,0.55)';
  ellipse(ctx, 5, 4.9, 3.7, 0.75);
  ctx.fill();
  // 盖上光点
  ctx.fillStyle = 'rgba(230,255,250,0.95)';
  circle(ctx, 3.9, 3.6, 0.55);
  ctx.fill();
  circle(ctx, 6.3, 3.2, 0.4);
  ctx.fill();
  circle(ctx, 5.4, 4.4, 0.3);
  ctx.fill();
}

function drawSnakeHead(ctx) {
  // 顶部与身体相连的脖颈
  ctx.fillStyle = '#4d9c46';
  ellipse(ctx, 8, 4.6, 2.5, 2.1);
  ctx.fill();

  // 头部（上宽下尖的圆润三角，朝向下方）
  ctx.fillStyle = lg(ctx, 3.4, 3, 12.6, 14.5, [[0, '#8ed873'], [0.55, '#57b34a'], [1, '#3a8c3e']]);
  ctx.beginPath();
  ctx.moveTo(3.6, 7.4);
  ctx.quadraticCurveTo(3.4, 3.4, 8, 3.3);
  ctx.quadraticCurveTo(12.6, 3.4, 12.4, 7.4);
  ctx.quadraticCurveTo(12.2, 11.4, 8, 14.6);
  ctx.quadraticCurveTo(3.8, 11.4, 3.6, 7.4);
  ctx.closePath();
  ctx.fill();
  // 中央头脊高光
  ctx.fillStyle = rg(ctx, 6.4, 5.6, 5.4, [
    [0, 'rgba(255,255,255,0.42)'], [0.5, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0)'],
  ]);
  ellipse(ctx, 8, 8.2, 4.4, 5);
  ctx.fill();

  // 颊鳞（侧面弧线两道）
  ctx.strokeStyle = 'rgba(35,95,40,0.45)';
  ctx.lineWidth = 0.42;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(8 + s * 1.1, 9.2, 2.1, s < 0 ? Math.PI * 0.62 : Math.PI * 0.13, s < 0 ? Math.PI * 0.87 : Math.PI * 0.38);
    ctx.stroke();
  }
  // 头顶斑纹
  ctx.fillStyle = 'rgba(40,110,45,0.5)';
  ellipse(ctx, 6.4, 4.6, 0.62, 0.42, -0.5);
  ctx.fill();
  ellipse(ctx, 9.7, 4.3, 0.5, 0.36, 0.4);
  ctx.fill();
  ellipse(ctx, 8.1, 5.3, 0.4, 0.3, 0);
  ctx.fill();

  // 大眼睛（左右各一，机警感）
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, 8 + s * 2.75, 7.6, 1.28, 1.55);
    ctx.fill();
    ctx.fillStyle = '#2e2430';
    ellipse(ctx, 8 + s * 2.75, 8.05, 0.62, 0.85);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, 8 + s * 2.75 - 0.2, 7.7, 0.24);
    ctx.fill();
    // 怒眉
    ctx.strokeStyle = 'rgba(30,70,30,0.8)';
    ctx.lineWidth = 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8 + s * 1.2, 5.9);
    ctx.lineTo(8 + s * 3.7, 6.6);
    ctx.stroke();
  }
  // 鼻孔
  ctx.fillStyle = 'rgba(25,70,30,0.75)';
  circle(ctx, 7, 12.2, 0.26);
  ctx.fill();
  circle(ctx, 9, 12.2, 0.26);
  ctx.fill();

  // 吐信（红色分叉）
  ctx.strokeStyle = '#ff5a70';
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 14.6);
  ctx.lineTo(8, 15.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 15.6);
  ctx.lineTo(7.2, 16.4);
  ctx.moveTo(8, 15.6);
  ctx.lineTo(8.8, 16.4);
  ctx.stroke();
}

function drawSnakeBody(ctx) {
  // 体节：圆润的鳞球
  ctx.fillStyle = lg(ctx, 1.6, 1.6, 10.4, 10.4, [[0, '#7fcc66'], [0.6, '#54b04a'], [1, '#3a8c3e']]);
  circle(ctx, 6, 6, 4.7);
  ctx.fill();
  // 腹甲
  ctx.fillStyle = lg(ctx, 4, 3, 8, 9, [[0, '#e8f0c0'], [1, '#bcd28a']]);
  ellipse(ctx, 6, 6.6, 2.5, 3.4);
  ctx.fill();
  // 腹甲横纹
  ctx.strokeStyle = 'rgba(120,140,70,0.6)';
  ctx.lineWidth = 0.4;
  for (const yy of [5.2, 6.6, 8.0]) {
    ctx.beginPath();
    ctx.moveTo(6 - 1.7, yy);
    ctx.quadraticCurveTo(6, yy + 0.45, 6 + 1.7, yy);
    ctx.stroke();
  }
  // 鳞片弧线
  ctx.strokeStyle = 'rgba(35,95,40,0.5)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(6, 2.2, 3.6, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, 6, 4.15, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, 4.6, 3.8, 1.2, 0.7, -0.5);
  ctx.fill();
}

// ---------- 柔和特效贴图（保持逻辑分辨率，放大后天然柔焦） ----------
function makeSlash(scene) {
  for (let f = 0; f < 3; f++) {
    const sz = 28;
    const canvas = document.createElement('canvas');
    canvas.width = sz * S;
    canvas.height = sz * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    const spread = 0.55 + f * 0.5;
    const alpha = 0.95 - f * 0.28;
    ctx.translate(sz / 2, sz / 2);
    ctx.rotate(-Math.PI / 4 + f * 0.35);
    ctx.shadowColor = 'rgba(255,235,180,0.8)';
    ctx.shadowBlur = 8;
    // 外弧（白）
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(0, 0, 9, -spread, spread);
    ctx.stroke();
    // 内弧（金）
    ctx.strokeStyle = '#ffd257';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 11.6, -spread * 0.88, spread * 0.88);
    ctx.stroke();
    scene.textures.addCanvas(`slash_${f}`, canvas);
  }
}

function makeShadow(scene) {
  const W = 16, H = 8;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.translate(W / 2, H / 2);
  ctx.scale(1, H / W);
  ctx.fillStyle = rg(ctx, 0, 0, W / 2, [
    [0, 'rgba(30,20,40,0.42)'], [0.65, 'rgba(30,20,40,0.22)'], [1, 'rgba(30,20,40,0)'],
  ]);
  ctx.fillRect(-W / 2, -W / 2, W, W);
  scene.textures.addCanvas('shadow', canvas);
}

function makeCloudShadow(scene) {
  const Sz = 96;
  const canvas = document.createElement('canvas');
  canvas.width = Sz; canvas.height = Sz * 0.6;
  const ctx = canvas.getContext('2d');
  ctx.translate(Sz / 2, Sz * 0.3);
  ctx.scale(1, 0.6);
  ctx.fillStyle = 'rgba(24,32,64,0.30)';
  circle(ctx, -18, 4, 26);
  ctx.fill();
  circle(ctx, 16, -4, 30);
  ctx.fill();
  circle(ctx, 30, 10, 20);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = rg(ctx, 0, 0, Sz / 2, [[0, 'rgba(24,32,64,0.22)'], [1, 'rgba(24,32,64,0)']]);
  ctx.fillRect(-Sz / 2, -Sz / 2, Sz, Sz);
  scene.textures.addCanvas('cloudshadow', canvas);
}

function makeFoam(scene) {
  // 2x 分辨率（32px 画布按 16 逻辑 px 显示）：含岸边浅水渐变 + 波浪白沫
  const wave = (ctx, alongX, base, amp) => {
    ctx.beginPath();
    for (let t = 0; t <= 16; t += 0.8) {
      const off = base + Math.sin((t / 16) * TAU * 2) * amp;
      const [x, y] = alongX ? [t, off] : [off, t];
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  const shallow = (ctx, dir) => {
    // 浅水色带（由岸边向水内淡出）
    const c = 'rgba(216,243,255,0.55)';
    if (dir === 'n') { ctx.fillStyle = lg(ctx, 0, 0, 0, 5, [[0, c], [1, 'rgba(216,243,255,0)']]); ctx.fillRect(0, 0, 16, 5); }
    if (dir === 's') { ctx.fillStyle = lg(ctx, 0, 11, 0, 16, [[0, 'rgba(216,243,255,0)'], [1, c]]); ctx.fillRect(0, 11, 16, 5); }
    if (dir === 'w') { ctx.fillStyle = lg(ctx, 0, 0, 5, 0, [[0, c], [1, 'rgba(216,243,255,0)']]); ctx.fillRect(0, 0, 5, 16); }
    if (dir === 'e') { ctx.fillStyle = lg(ctx, 11, 0, 16, 0, [[0, 'rgba(216,243,255,0)'], [1, c]]); ctx.fillRect(11, 0, 5, 16); }
  };
  const edges = {
    foam_n: (c) => { shallow(c, 'n'); soft(c, 'rgba(255,255,255,0.95)', 1.0); wave(c, true, 1.0, 0.45); c.strokeStyle = 'rgba(228,247,255,0.45)'; c.lineWidth = 0.7; wave(c, true, 2.6, 0.4); },
    foam_s: (c) => { shallow(c, 's'); soft(c, 'rgba(255,255,255,0.95)', 1.0); wave(c, true, 15.0, 0.45); c.strokeStyle = 'rgba(228,247,255,0.45)'; c.lineWidth = 0.7; wave(c, true, 13.4, 0.4); },
    foam_w: (c) => { shallow(c, 'w'); soft(c, 'rgba(255,255,255,0.95)', 1.0); wave(c, false, 1.0, 0.45); c.strokeStyle = 'rgba(228,247,255,0.45)'; c.lineWidth = 0.7; wave(c, false, 2.6, 0.4); },
    foam_e: (c) => { shallow(c, 'e'); soft(c, 'rgba(255,255,255,0.95)', 1.0); wave(c, false, 15.0, 0.45); c.strokeStyle = 'rgba(228,247,255,0.45)'; c.lineWidth = 0.7; wave(c, false, 13.4, 0.4); },
  };
  for (const [key, fn] of Object.entries(edges)) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    fn(ctx);
    scene.textures.addCanvas(key, canvas);
  }
}

function makeParticle(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 8; canvas.height = 8;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = rg(ctx, 4, 4, 4, [[0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, 0, 8, 8);
  scene.textures.addCanvas('particle', canvas);
}

// ---------- 动画 ----------
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
