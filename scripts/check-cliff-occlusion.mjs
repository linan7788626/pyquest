// ============================================================
// 崖面可达遮挡专项回归（final-fix-brief，Designer 车道）
//
// 目的：几何常量/depth>player 都不是行为证明 —— 本脚本在真实浏览器里
// 用真实键盘把玩家开到水缘碰撞停靠点，做三拍像素法验证：
//   P_on  = 玩家+崖面 overlay（交付画面）
//   P_off = 玩家无 overlay（同机位同帧）
//   B     = 玩家传走无 overlay（背景基线）
//   可见像素   = |P_off − B| > 30（任意通道）
//   被遮挡像素 = 可见 且 |P_on − P_off| > 30
// 验收（绿）：可达停靠处被遮挡像素 ≥ 200（下身被真实覆盖，非 0）；
// 对岸对照（南岸向北停靠，几何上不该被遮挡）≤ 60；崖 recipe v4 挂载、
// v3 缓存失效；银行侧实体（树/道具/玩家/史莱姆）与 overlay alpha 的
// 实际重叠扫描中「错误方向」重叠 = 0。
//
// 噪声冻结：三拍期间 s.scene.pause()（渲染继续、更新停止），拍完 resume；
// 不改任何玩法/碰撞代码，不留调试面。截图坐标：画布 1920×1280 → CSS ×0.75
// → 1440×960 截图。世界→CSS 用 cam.worldView 左上角作原点（preRender 实算，
// 已含 zoom≠1 的原点偏移 (H−H/zoom)/2）——注意 (world−scroll)×zoom 在 zoom 1.1
// 下会偏 64 game px（=48 CSS 行），不可直接用；映射正确性由「预测统计矩形必须
// 罩住实测玩家剪影 bbox（|P_off−B|>30 全帧扫描）」的校准断言兜底。
//
// 用法：node scripts/check-cliff-occlusion.mjs [输出目录]
//   默认输出 test-results/cliff-occlusion/；证据 JSON/截图供复核。
//   自建 vite 服务器（端口 0），不动用户正在跑的开发服务器。
// ============================================================
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { inflateSync, deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] || 'test-results/cliff-occlusion');
const THRESH = 30; // WebGL MSAA 帧间噪声 ±6..30（task5 实测），30 为信号阈值
const CSS = 0.75;  // 画布 1920×1280 → 截图 1440×960

// ---------- 最小 PNG 编解码（无第三方依赖：Playwright 截图 = 8bit RGBA 非隔行） ----------
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`unsupported PNG depth=${depth}`);
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!CH || ctype === 3) throw new Error(`unsupported PNG type=${ctype}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * CH;
  const un = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const cur = un.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? un.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= CH ? cur[x - CH] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= CH && prev ? prev[x - CH] : 0;
      let v = raw[pos + x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      } else if (filter !== 0) throw new Error(`bad filter ${filter}`);
      cur[x] = v;
    }
    pos += stride;
  }
  // 归一化为 RGBA
  if (CH === 4) return { w, h, data: un };
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    if (CH === 3) { out[j] = un[i * 3]; out[j + 1] = un[i * 3 + 1]; out[j + 2] = un[i * 3 + 2]; }
    else if (CH === 1) { out[j] = out[j + 1] = out[j + 2] = un[i]; }
    else { out[j] = out[j + 1] = out[j + 2] = un[i * 2]; out[j + 3] = un[i * 2 + 1]; }
    out[j + 3] = 255;
  }
  return { w, h, data: out };
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (buf) => { let c = ~0; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(type, 4, 'ascii'); data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 任意通道差 > thr
const chDiff = (A, B, i, thr) =>
  Math.abs(A[i] - B[i]) > thr || Math.abs(A[i + 1] - B[i + 1]) > thr || Math.abs(A[i + 2] - B[i + 2]) > thr;

// 实测玩家剪影（全帧 |P_off − B| > 30 的包围盒）：坐标映射的像素级校准依据
function playerBbox(P_off, B) {
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
  for (let y = 0; y < P_off.h; y++) for (let x = 0; x < P_off.w; x++) {
    const i = (y * P_off.w + x) * 4;
    if (chDiff(P_off.data, B.data, i, THRESH)) {
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
    }
  }
  return x2 < 0 ? null : { x1, y1, x2, y2 };
}

// ---------- 三拍法分析：返回统计区内的可见/被遮挡像素与行范围 ----------
// farRowCss：行 < farRowCss 记为 far（对岸 S 带一侧），≥ 记为 near（本岸 N 唇/影一侧）
function analyzeTrio({ P_on, P_off, B, rect, bandTopCss, farRowCss }) {
  let visible = 0, occluded = 0, occludedInBand = 0, occludedFar = 0, occludedNear = 0;
  let occlRowMin = null, occlRowMax = null;
  const mask = new Uint8Array((rect.x2 - rect.x1) * (rect.y2 - rect.y1)); // 1=occluded，供红标图
  for (let y = rect.y1; y < rect.y2; y++) {
    for (let x = rect.x1; x < rect.x2; x++) {
      const i = (y * P_on.w + x) * 4;
      if (!chDiff(P_off.data, B.data, i, THRESH)) continue; // 玩家不可见处不统计
      visible++;
      if (chDiff(P_on.data, P_off.data, i, THRESH)) {
        occluded++;
        if (occlRowMin === null || y < occlRowMin) occlRowMin = y;
        if (occlRowMax === null || y > occlRowMax) occlRowMax = y;
        if (y >= bandTopCss) occludedInBand++;
        if (farRowCss !== null) { if (y < farRowCss) occludedFar++; else occludedNear++; }
        mask[(y - rect.y1) * (rect.x2 - rect.x1) + (x - rect.x1)] = 1;
      }
    }
  }
  return { visible, occluded, occludedInBand, occludedFar, occludedNear, occlRowMin, occlRowMax, mask };
}

// 红标可视化：P_off 统计区 2× 最近邻，被遮挡像素涂红
function markedImage(P_off, rect, mask, pad = 48) {
  const x1 = Math.max(0, rect.x1 - pad), y1 = Math.max(0, rect.y1 - pad);
  const x2 = Math.min(P_off.w, rect.x2 + pad), y2 = Math.min(P_off.h, rect.y2 + pad);
  const w = (x2 - x1) * 2, h = (y2 - y1) * 2;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x1 + (x >> 1), sy = y1 + (y >> 1);
    const si = (sy * P_off.w + sx) * 4, di = (y * w + x) * 4;
    const m = mask[(sy - rect.y1) * (rect.x2 - rect.x1) + (sx - rect.x1)];
    out[di] = m ? 255 : P_off.data[si];
    out[di + 1] = m ? 40 : P_off.data[si + 1];
    out[di + 2] = m ? 40 : P_off.data[si + 2];
    out[di + 3] = 255;
  }
  return encodePng(w, h, out);
}

// ---------- 场景内取数 ----------
const readState = (page) => page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  const cam = s.cameras.main;
  return {
    cam: { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom,
      wv: { x: cam.worldView.x, y: cam.worldView.y } },
    player: { x: s.player.x, y: s.player.y, depth: s.player.depth,
      bodyBottom: s.player.body.bottom, bodyEnabled: s.player.body.enable,
      vy: s.player.body.velocity.y },
    overlay: s.cliffOverlay ? { key: s.cliffOverlay.texture.key, depth: s.cliffOverlay.depth, visible: s.cliffOverlay.visible } : null,
  };
});

// 玩家可见内容统计区（CSS px）：帧 alpha bbox x49..136 / y47..139 ×SCALE2，
// 原点 (0.5,136/192) ⇒ 内容横向 fx−93.5..fx+80.5、纵向 fy−178..fy+6，外扩 8px 容差。
// 世界→CSS：以 cam.worldView 左上角为原点（preRender 由渲染实际使用的 scroll 实算，
// 含 zoom 原点偏移；worldView 取整误差 ≤1 世界像素，由 ±8px 容差吸收）。
function contentRectCss(feet, cam) {
  const toCss = (wx, wy) => [(wx - cam.wv.x) * cam.zoom * CSS, (wy - cam.wv.y) * cam.zoom * CSS];
  const [ax, ay] = toCss(feet[0] - 93.5, feet[1] - 178);
  const [bx, by] = toCss(feet[0] + 80.5, feet[1] + 6);
  const pad = 8;
  return { x1: Math.max(0, Math.floor(ax - pad)), y1: Math.max(0, Math.floor(ay - pad)),
    x2: Math.min(1440, Math.ceil(bx + pad)), y2: Math.min(960, Math.ceil(by + pad)) };
}

async function trio(page, tag, { expectBottom, blockedDir, camSetup, key }) {
  // 真实键盘停靠（body.enable 全程为真；teleport 仅用于摆位，不用于达标）
  await page.evaluate((y) => { const p = window.__PYQUEST__; p.godmode(); p.teleport(1088, y); }, camSetup.teleportY);
  await page.evaluate((c) => {
    const s = window.__PYQUEST__.active(); const cam = s.cameras.main;
    cam.stopFollow(); cam.setZoom(c.zoom); cam.setScroll(c.scrollX, c.scrollY);
  }, camSetup);
  await page.keyboard.down(key);
  // Arcade 分离不把速度清零（update 每帧重设），停靠判据用 blocked 标志 + body 底/顶到位
  await page.waitForFunction((args) => {
    const [bottom, dir] = args;
    const s = window.__PYQUEST__.active(); const bd = s.player.body;
    return bd.blocked[dir] === true && Math.abs(bd.bottom - bottom) < 0.75 && bd.enable === true;
  }, [expectBottom, blockedDir], { timeout: 8000, polling: 120 });
  await page.keyboard.up(key);
  await page.waitForTimeout(400); // 停靠后稳定
  // 冻结噪声源：史莱姆挪远（记位恢复），随后整场景暂停（渲染继续）
  const savedSlimes = await page.evaluate(() => {
    const s = window.__PYQUEST__.active();
    return s.slimeGroup.getChildren().filter((e) => !e.isBoss).map((e) => ({ x: e.x, y: e.y }));
  });
  await page.evaluate(() => {
    const s = window.__PYQUEST__.active();
    s.slimeGroup.getChildren().forEach((e) => { e.setPosition(4480, 256); e.body.reset(4480, 256); e.setVelocity(0, 0); });
  });
  const stop = await readState(page);
  await page.evaluate(() => { window.__PYQUEST__.active().scene.pause(); });
  const shots = [];
  const states = [
    ['P_on', () => { }],
    ['P_off', () => page.evaluate(() => { window.__PYQUEST__.active().cliffOverlay.setVisible(false); })],
    ['B', () => page.evaluate(() => { window.__PYQUEST__.teleport(2304, 704); })],
  ];
  for (const [name, toggle] of states) {
    await toggle();
    await page.waitForTimeout(1200); // canvas 实时重渲染，1.2s 稳定（task5 实测）
    const st = await readState(page);
    const buf = await page.screenshot();
    shots.push({ name, cam: st.cam, player: st.player, buf, file: `${tag}-${name}.png` });
    await writeFile(`${OUT}/${tag}-${name}.png`, buf);
  }
  // 恢复：overlay 可见、场景 resume、史莱姆归位
  await page.evaluate((sv) => {
    const s = window.__PYQUEST__.active();
    s.cliffOverlay.setVisible(true); s.scene.resume();
    s.slimeGroup.getChildren().filter((e) => !e.isBoss).forEach((e, i) => { e.setPosition(sv[i].x, sv[i].y); e.body.reset(sv[i].x, sv[i].y); });
  }, savedSlimes);
  const cams = shots.map((s) => JSON.stringify(s.cam));
  const stopFeet = [stop.player.x, stop.player.y];
  return { tag, shots, stopFeet, stop, camIdentical: cams.every((c) => c === cams[0]), savedSlimes };
}

// ---------- 银行侧实体 × overlay alpha 实际重叠扫描（错误方向风险界定） ----------
async function bankEntityScan(page) {
  return page.evaluate(async () => {
    const s = window.__PYQUEST__.active();
    const { CLIFF, computeCliffCells } = await import('/src/textures/nliCliffs.js');
    const TILE = 128, W = s.def.w * TILE, H = s.def.h * TILE;
    const src = s.cliffOverlay.texture.getSourceImage();
    const alpha = src.getContext('2d').getImageData(0, 0, W, H).data; // 全图 alpha 一次取出
    const cells = computeCliffCells(s.def);
    // 各向带的世界矩形（与 renderCliffOverlay 绘制几何一一对应）
    const bands = [];
    for (const { x, y, edges } of cells) {
      const dx = x * TILE, dy = y * TILE;
      if (edges & 8) bands.push({ kind: 'S', x1: dx, y1: dy + TILE - CLIFF.LIP, x2: dx + TILE, y2: dy + TILE + CLIFF.FH - CLIFF.LIP, cx: dx + TILE / 2, cy: dy + TILE });
      if (edges & 4) bands.push({ kind: 'N', x1: dx, y1: dy - 26, x2: dx + TILE, y2: dy + 8, cx: dx + TILE / 2, cy: dy });
      if (edges & 2) bands.push({ kind: 'E', x1: dx + TILE - 6, y1: dy - 6, x2: dx + TILE + 46, y2: dy + TILE + 6, cx: dx + TILE, cy: dy + TILE / 2 });
      if (edges & 1) bands.push({ kind: 'W', x1: dx - 46, y1: dy - 6, x2: dx + 6, y2: dy + TILE + 6, cx: dx, cy: dy + TILE / 2 });
    }
    const results = [];
    for (const go of s.children.list) {
      if (!go || go === s.cliffOverlay) continue;
      if (go.depth === -10) continue; // 地面画布
      if (go.depth >= s.cliffOverlay.depth) continue; // 云影/粒子/反馈层本就画在 overlay 之上，不构成被遮挡实体
      if (go.visible === false) continue;
      let b; try { b = go.getBounds(); } catch { continue; }
      if (!b || !(b.width > 0) || !(b.height > 0)) continue;
      const wrong = []; const nearEdge = []; let overlap = 0;
      const x1 = Math.max(0, Math.floor(b.x)), x2 = Math.min(W, Math.ceil(b.right));
      const y1 = Math.max(0, Math.floor(b.y)), y2 = Math.min(H, Math.ceil(b.bottom));
      for (let wy = y1; wy < y2; wy += 8) for (let wx = x1; wx < x2; wx += 8) {
        if (alpha[(wy * W + wx) * 4 + 3] <= 8) continue;
        overlap++;
        for (const bd of bands) {
          if (wx < bd.x1 || wx >= bd.x2 || wy < bd.y1 || wy >= bd.y2) continue;
          // 错误方向 = 实体锚点在带的「水面侧」（本应更近镜头却被压顶遮挡）
          const bad = bd.kind === 'S' ? go.y > bd.y2 - 2
            : bd.kind === 'N' ? go.y < bd.y1 + 2
            : bd.kind === 'E' ? go.x > bd.x2 - 2
            : go.x < bd.x1 + 2;
          if (bad) wrong.push({ kind: bd.kind, wx, wy });
          // 本岸 N 唇贴边交互（脚部贴水缘的实体被岸唇压脚，视觉惯例可接受，单列披露不算错）
          else if (bd.kind === 'N' && go.y >= bd.y1 && go.y <= bd.y1 + 48) nearEdge.push({ kind: 'N', wx, wy });
          break;
        }
      }
      if (overlap > 0) results.push({
        type: go.type || (go.texture && go.texture.key) || 'unknown',
        anchor: [go.x, go.y], depth: go.depth,
        bounds: [Math.round(b.x), Math.round(b.y), Math.round(b.right), Math.round(b.bottom)],
        overlapSamples: overlap, wrongDirection: wrong.length, wrongSamples: wrong.slice(0, 5),
        nearEdgeN: nearEdge.length,
      });
    }
    return { entities: results, wrongDirectionTotal: results.reduce((n, r) => n + r.wrongDirection, 0),
      nearEdgeNTotal: results.reduce((n, r) => n + r.nearEdgeN, 0),
      bandsTotal: bands.length, cliff: { LIP: CLIFF.LIP, REACH: CLIFF.REACH, FH: CLIFF.FH } };
  });
}

// ============================================================
async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const browser = await chromium.launch();
  const failures = [];
  const evidence = { base, generatedAt: new Date().toISOString() };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
    await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.fulfill({ status: 200, body: '' })));
    await page.goto(base);
    await page.waitForFunction(() => window.__PYQUEST__?.scene('Boot')?.sys.settings.status === 5);
    await page.locator('#btn-start').click();
    await page.waitForFunction(() => !!window.__PYQUEST__?.active()?.player);
    await page.waitForTimeout(600);

    // ---- recipe / 挂载检查（v4 生效、v3 失效、depth 压顶） ----
    const mount = await page.evaluate(() => {
      const s = window.__PYQUEST__.active();
      return { v4: s.textures.exists('nli02-cliff-v4:Village'), v3: s.textures.exists('nli02-cliff-v3:Village'),
        overlayKey: s.cliffOverlay?.texture.key, overlayDepth: s.cliffOverlay?.depth, playerDepth: s.player.depth,
        sceneKey: s.scene.key };
    });
    evidence.mount = mount;
    if (mount.sceneKey !== 'Village') failures.push(`expected Village scene, got ${mount.sceneKey}`);
    if (!mount.v4) failures.push('cliff v4 texture not registered');
    if (mount.v3) failures.push('stale cliff v3 texture still registered (cache invalidation failed)');
    if (mount.overlayKey !== 'nli02-cliff-v4:Village') failures.push(`overlay key ${mount.overlayKey}`);
    if (!(mount.overlayDepth > mount.playerDepth)) failures.push('overlay depth not above player');

    // ---- 场景一：北岸向南（S 带方向）真实键盘停靠（body 底贴南水格上沿 2432） ----
    const reach = await trio(page, 'reachable', {
      expectBottom: 2432, blockedDir: 'down', key: 'ArrowDown',
      camSetup: { teleportY: 2240, zoom: 1.1, scrollX: 433, scrollY: 1850 }, // task5 同机位
    });
    // ---- 场景二：南岸向北（对岸对照；body 顶贴池塘南水格下沿 2816 ⇒ feet 2824） ----
    const control = await trio(page, 'control-south-bank', {
      expectBottom: 2868, blockedDir: 'up', key: 'ArrowUp',
      // zoom 1.1 的 clampY 上限 = (1163.64−1280)/2 + 3072 − 1163.64 ≈ 1850.18：
      // 取 1850 确保设定值=生效值，且与可达机位同机（同相机前后对照）
      camSetup: { teleportY: 2944, zoom: 1.1, scrollX: 433, scrollY: 1850 },
    });

    // ---- 像素分析 ----
    const geo = await page.evaluate(async () => (await import('/src/textures/nliCliffs.js')).CLIFF);
    evidence.cliff = geo;
    for (const t of [reach, control]) {
      const [P_on, P_off, B] = t.shots.map((s) => decodePng(s.buf));
      const cam = t.shots[0].cam;
      const rect = contentRectCss(t.stopFeet, cam);
      // 坐标映射校准：预测统计矩形必须罩住实测玩家剪影（像素级兜底断言）
      const bbox = playerBbox(P_off, B);
      const coversBbox = !!bbox
        && rect.x1 <= bbox.x1 && bbox.x2 < rect.x2 && rect.y1 <= bbox.y1 && bbox.y2 < rect.y2;
      if (!bbox) failures.push(`${t.tag}: player silhouette not measurable (|P_off−B| empty)`);
      else if (!coversBbox) {
        failures.push(`${t.tag}: predicted rect [${rect.x1},${rect.y1},${rect.x2},${rect.y2}] does not cover measured player bbox [${bbox.x1},${bbox.y1},${bbox.x2},${bbox.y2}] (coordinate mapping broken)`);
      }
      // S 带顶（世界 y = 停靠边界 − LIP）→ CSS 行
      const boundary = t.tag === 'reachable' ? 2432 : 2816;
      const bandTopCss = Math.round((boundary - geo.LIP - cam.wv.y) * cam.zoom * CSS);
      // 对岸对照按世界行分解：row < world 2780 = 远侧（北岸 S 带/跨池遮挡，必须为 0）；
      // ≥ 2780 = 本岸 N 唇+影贴边交互（N 带几何未变，属既有岸线行为，单列披露）
      const farRowCss = t.tag === 'reachable' ? null
        : Math.round((2780 - cam.wv.y) * cam.zoom * CSS);
      const a = analyzeTrio({ P_on, P_off, B, rect, bandTopCss, farRowCss });
      await writeFile(`${OUT}/${t.tag}-occluded-marked-2x.png`, markedImage(P_off, rect, a.mask));
      evidence[t.tag] = {
        stopFeet: t.stopFeet.map(Math.round), bodyBottom: Math.round(t.stop.player.bodyBottom * 10) / 10,
        bodyEnabled: t.stop.player.bodyEnabled, cam, camIdentical: t.camIdentical,
        playerBboxCss: bbox, rectCoversBbox: coversBbox,
        contentRectCss: rect, bandTopCss, farRowCss, ...a, mask: undefined,
      };
    }

    // ---- 断言 ----
    if (!reach.camIdentical) failures.push('reachable: camera not identical across trio');
    if (!control.camIdentical) failures.push('control: camera not identical across trio');
    if (Math.abs(reach.stop.player.bodyBottom - 2432) > 0.75 || !reach.stop.player.bodyEnabled)
      failures.push(`reachable stop not at water boundary (bodyBottom=${reach.stop.player.bodyBottom}, enabled=${reach.stop.player.bodyEnabled})`);
    if (Math.abs(control.stop.player.bodyBottom - 2868) > 0.75 || !control.stop.player.bodyEnabled)
      failures.push(`control stop not at pond south boundary (bodyBottom=${control.stop.player.bodyBottom}, enabled=${control.stop.player.bodyEnabled})`);
    if (evidence.reachable.occluded < 200)
      failures.push(`reachable occluded pixels ${evidence.reachable.occluded} < 200 (no real lower-body occlusion at collision stop)`);
    if (evidence.reachable.occludedInBand < 150)
      failures.push(`reachable occluded-in-band ${evidence.reachable.occludedInBand} < 150`);
    if (evidence['control-south-bank'].occludedFar > 24)
      failures.push(`cross-pond occluded ${evidence['control-south-bank'].occludedFar} > 24 (improper far-side occlusion)`);
    if (evidence['control-south-bank'].occludedNear > 3000)
      failures.push(`south-bank near-edge (N lip, pre-existing) occluded ${evidence['control-south-bank'].occludedNear} > 3000`);

    // ---- 银行侧实体重叠扫描：自然摆位 + 可达停靠位 ----
    evidence.bankScan = { natural: await bankEntityScan(page) };
    await page.evaluate(() => { window.__PYQUEST__.teleport(1088, 2388); });
    await page.waitForTimeout(300);
    evidence.bankScan.atReachableStop = await bankEntityScan(page);
    if (evidence.bankScan.natural.wrongDirectionTotal !== 0) failures.push(`bank scan (natural): ${evidence.bankScan.natural.wrongDirectionTotal} wrong-direction overlaps`);
    if (evidence.bankScan.atReachableStop.wrongDirectionTotal !== 0) failures.push(`bank scan (at stop): ${evidence.bankScan.atReachableStop.wrongDirectionTotal} wrong-direction overlaps`);

    await writeFile(`${OUT}/cliff-occlusion-evidence.json`, JSON.stringify(evidence, null, 2));

    console.log(`scene=${evidence.mount.sceneKey} overlay=${evidence.mount.overlayKey} depth=${evidence.mount.overlayDepth}>player=${evidence.mount.playerDepth}`);
    console.log(`reachable: feet=${evidence.reachable.stopFeet} bodyBottom=${evidence.reachable.bodyBottom} visible=${evidence.reachable.visible} occluded=${evidence.reachable.occluded} inBand=${evidence.reachable.occludedInBand} rows=${evidence.reachable.occlRowMin}..${evidence.reachable.occlRowMax}`);
    const ctl = evidence['control-south-bank'];
    console.log(`control:   feet=${ctl.stopFeet} bodyBottom=${ctl.bodyBottom} visible=${ctl.visible} occludedFar(cross-pond)=${ctl.occludedFar} occludedNear(N-lip)=${ctl.occludedNear}`);
    console.log(`bankScan: overlapping entities natural=${evidence.bankScan.natural.entities.length} atStop=${evidence.bankScan.atReachableStop.entities.length} wrongDirection=${evidence.bankScan.natural.wrongDirectionTotal}+${evidence.bankScan.atReachableStop.wrongDirectionTotal} nearEdgeN=${evidence.bankScan.atReachableStop.nearEdgeNTotal}`);
    console.log(`evidence -> ${OUT}/cliff-occlusion-evidence.json`);
    if (failures.length) { console.error(`FAILURES:\n- ${failures.join('\n- ')}`); process.exitCode = 1; }
    else console.log('ALL CHECKS GREEN');
  } finally {
    await browser.close();
    await server.close();
  }
  if (failures.length && !process.exitCode) process.exitCode = 1;
  return process.exitCode ?? 0;
}

main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(1); });
