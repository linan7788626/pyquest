// NLI产品地面：只组合已导出的平面Q材质；最终grid是唯一边界依据。
import { T } from '../data/maps.js';
import { MATERIAL_ALPHA, NLI_GROUND_PROFILES, NLI_GROUND_RECIPE, VILLAGE_GROUND_PADS } from './nliGroundProfiles.js';

const TILE = 128;
const KEYS = ['grass', 'forest', 'path', 'water', 'floor', 'wall', 'ground_flowers'];
const isWater = (v) => v === T.WATER || v === T.WATER2 || v === T.WATER3;
const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const masks = new Map(); // 最多3×15张128²边缘模板，不是全图距离场。

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

function adjacentMask(def, x, y, predicate) {
  return SIDES.reduce((mask, [dx, dy], bit) => {
    const value = def.grid[y + dy]?.[x + dx];
    return value !== undefined && predicate(value) ? mask | (1 << bit) : mask;
  }, 0);
}

function clipRegion(ctx, def, predicate) {
  ctx.beginPath();
  def.grid.forEach((row, y) => row.forEach((v, x) => {
    if (predicate(v)) ctx.rect(x * TILE, y * TILE, TILE, TILE);
  }));
  ctx.clip();
}

function paint(ctx, pattern, base, alpha) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;
}

// 以最近边距离取alpha，同一格拐角不重复叠加、不会突破指定最高alpha。
function edgeMask(bits, width, alpha, color = '#ffffff') {
  const key = `${bits}:${width}:${alpha}:${color}`;
  if (masks.has(key)) return masks.get(key);
  const canvas = canvasOf(TILE, TILE), ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(TILE, TILE);
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const distances = [x + 0.5, TILE - x - 0.5, y + 0.5, TILE - y - 0.5];
    const distance = Math.min(...distances.filter((_, i) => bits & (1 << i)));
    const i = (y * TILE + x) * 4;
    pixels.data.set(rgb, i);
    pixels.data[i + 3] = Math.round(255 * alpha * Math.max(0, 1 - distance / width));
  }
  ctx.putImageData(pixels, 0, 0);
  masks.set(key, canvas);
  return canvas;
}

function maskedPattern(ctx, scratch, pattern, mask, x, y) {
  const s = scratch.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, scratch.width, scratch.height);
  s.setTransform(1, 0, 0, 1, -x, -y);
  s.fillStyle = pattern;
  s.fillRect(x, y, scratch.width, scratch.height); // 同世界原点相位。
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(mask, 0, 0);
  ctx.drawImage(scratch, x, y);
}

function waterLines(ctx, bits, x, y) {
  ctx.strokeStyle = 'rgba(194,217,188,0.45)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (let side = 0; side < 4; side++) {
    if (!(bits & (1 << side))) continue;
    ctx.beginPath();
    for (let along = 0; along <= TILE; along += 2) {
      const phase = (side < 2 ? y : x) + along;
      const inset = 4 + 2 * Math.sin(2 * Math.PI * phase / 96);
      const px = side === 0 ? x + inset : side === 1 ? x + TILE - inset : x + along;
      const py = side === 2 ? y + inset : side === 3 ? y + TILE - inset : y + along;
      if (along === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

function drawOutdoor(ctx, def, patterns, profile, images) {
  paint(ctx, patterns[profile.material], profile.base, MATERIAL_ALPHA[profile.material]);
  for (const [predicate, key, base] of [
    [(v) => v === T.PATH, 'path', profile.path], [isWater, 'water', profile.water],
  ]) {
    ctx.save();
    clipRegion(ctx, def, predicate);
    paint(ctx, patterns[key], base, MATERIAL_ALPHA[key]);
    ctx.restore();
  }
  const scratch = canvasOf(TILE, TILE);
  def.grid.forEach((row, y) => row.forEach((tile, x) => {
    const dx = x * TILE, dy = y * TILE;
    if (isWater(tile)) {
      const edges = adjacentMask(def, x, y, (v) => !isWater(v));
      if (edges) {
        ctx.drawImage(edgeMask(edges, 14, 0.22, '#92b6a5'), dx, dy);
        // 波线严格裁在该水格内，含拐角，绝不向陆地泄漏。
        ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, TILE, TILE); ctx.clip();
        waterLines(ctx, edges, dx, dy);
        ctx.restore();
      }
    } else {
      if (tile !== T.PATH && !def.colliding.includes(tile)) {
        const shoulders = adjacentMask(def, x, y, (v) => v === T.PATH);
        if (shoulders) maskedPattern(ctx, scratch, patterns.path, edgeMask(shoulders, 24, 0.30), dx, dy);
      }
      const wet = adjacentMask(def, x, y, isWater);
      if (wet) ctx.drawImage(edgeMask(wet, 12, 0.22, '#54674a'), dx, dy);
      if (tile === T.FLOWER) {
        const fx = dx + 16 + (x * 19 + y * 7) % 25, fy = dy + 22;
        const clear = def.key === 'Village' && fx < 2048 && fx + 76 > 1408 && fy < 2752 && fy + 76 > 1856;
        if (!clear) ctx.drawImage(images.ground_flowers, fx, fy, 76, 76);
      }
    }
  }));
}

function drawIndoor(ctx, def, patterns, profile) {
  paint(ctx, patterns.floor, profile.base, MATERIAL_ALPHA.floor);
  ctx.save(); clipRegion(ctx, def, (v) => v === T.DWALL);
  paint(ctx, patterns.wall, profile.wall, MATERIAL_ALPHA.wall);
  ctx.restore();
  ctx.save(); clipRegion(ctx, def, (v) => v === T.VOID);
  ctx.fillStyle = '#242833'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// 只在两个局部土垫求边缘距离（8次有界Newton，包含两轴端点候选）。
function ellipseEdgeDistance(x, y, rx, ry) {
  let angle = Math.atan2(y * rx, x * ry);
  for (let i = 0; i < 8; i++) {
    const s = Math.sin(angle), c = Math.cos(angle), d = ry * ry - rx * rx;
    const f = d * s * c + rx * x * s - ry * y * c;
    const df = d * (c * c - s * s) + rx * x * c + ry * y * s;
    if (Math.abs(df) < 1e-9) break;
    angle = Math.max(0, Math.min(Math.PI / 2, angle - f / df));
  }
  return Math.min(Math.hypot(x - rx * Math.cos(angle), y - ry * Math.sin(angle)),
    Math.hypot(x - rx, y), Math.hypot(x, y - ry));
}

function drawVillagePads(ctx, def, pattern) {
  ctx.save(); clipRegion(ctx, def, (v) => !isWater(v));
  for (const { x, y, rx, ry } of VILLAGE_GROUND_PADS) {
    const mask = canvasOf(rx * 2, ry * 2), m = mask.getContext('2d');
    const pixels = m.createImageData(mask.width, mask.height);
    for (let py = 0; py < mask.height; py++) for (let px = 0; px < mask.width; px++) {
      const ax = Math.abs(px + 0.5 - rx), ay = Math.abs(py + 0.5 - ry);
      if ((ax / rx) ** 2 + (ay / ry) ** 2 >= 1) continue;
      const i = (py * mask.width + px) * 4;
      pixels.data.set([255, 255, 255, Math.round(255 * 0.18 * Math.min(1, ellipseEdgeDistance(ax, ay, rx, ry) / 16))], i);
    }
    m.putImageData(pixels, 0, 0);
    maskedPattern(ctx, canvasOf(mask.width, mask.height), pattern, mask, x - rx, y - ry);
  }
  ctx.restore();
}

export function makeGroundTexture(scene, def) {
  const manifest = scene.cache?.json?.get('nli_manifest');
  const revision = manifest ? KEYS.map((key) => manifest.entries.find((e) => e.key === key).sha256.slice(0, 8)).join('-') : 'stub';
  const key = `ground_${def.key}_${NLI_GROUND_RECIPE}_${revision}`;
  if (scene.textures.exists(key)) return key;
  const canvas = canvasOf(def.w * TILE, def.h * TILE), ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const images = Object.fromEntries(KEYS.map((k) => [k, sourceImage(scene, k)]));
  const indoor = def.grid.some((row) => row.includes(T.DFLOOR) || row.includes(T.DWALL));
  const profile = NLI_GROUND_PROFILES[def.key];
  const missing = KEYS.filter((k) => !images[k]);
  if (missing.length) {
    if (typeof window !== 'undefined' || scene.sys || scene.game) throw new Error(`NLI ground missing: ${missing.join(',')}`);
    // 仅现有无浏览器smoke桩占位；真实产品不会进入此分支。
    ctx.fillStyle = indoor ? '#777583' : '#7d9258';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    if (!profile) throw new Error(`NLI ground profile missing: ${def.key}`);
    const patterns = Object.fromEntries(KEYS.filter((k) => k !== 'ground_flowers').map((k) => [k, ctx.createPattern(images[k], 'repeat')]));
    if (indoor) drawIndoor(ctx, def, patterns, profile);
    else drawOutdoor(ctx, def, patterns, profile, images);
    if (def.key === 'Village') drawVillagePads(ctx, def, patterns.path);
  }
  scene.textures.addCanvas(key, canvas);
  return key;
}
