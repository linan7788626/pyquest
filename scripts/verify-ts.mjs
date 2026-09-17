// 验证 Tiny Swords 素材渲染：特征色检测
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decodePNG(file) {
  const buf = readFileSync(file);
  let pos = 8, w = 0, h = 0, colorType = 0, bitDepth = 8;
  const idat = []; let palette = [], trns = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = Array.from({ length: data.length / 3 }, (_, i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]);
    else if (type === 'tRNS') trns = Array.from(data);
    else if (type === 'IEND') break;
    pos += len + 12;
  }
  const samples = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bitsPerPixel = samples * bitDepth;
  const filterBpp = Math.max(1, bitsPerPixel >> 3);
  const packedStride = Math.ceil(w * bitsPerPixel / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const packed = Buffer.alloc(h * packedStride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[rp++];
    for (let x = 0; x < packedStride; x++) {
      const a = x >= filterBpp ? packed[y * packedStride + x - filterBpp] : 0;
      const b = y > 0 ? packed[(y - 1) * packedStride + x] : 0;
      const c = (y > 0 && x >= filterBpp) ? packed[(y - 1) * packedStride + x - filterBpp] : 0;
      let v = raw[rp++];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      packed[y * packedStride + x] = v;
    }
  }
  const get = (x, y) => {
    const vals = [];
    for (let s = 0; s < samples; s++) {
      const bp = y * packedStride * 8 + x * bitsPerPixel + s * bitDepth;
      const bi = bp >> 3, bo = bp & 7;
      if (bitDepth === 8) vals.push(packed[bi]);
      else if (bitDepth < 8) vals.push((packed[bi] >> (8 - bitDepth - bo)) & ((1 << bitDepth) - 1));
      else vals.push(packed[bi]);
    }
    if (colorType === 3) { const p = palette[vals[0]]; return p ? [...p, trns[vals[0]] ?? 255] : [0, 0, 0, 0]; }
    if (colorType === 0) return [vals[0], vals[0], vals[0], 255];
    if (colorType === 4) return [vals[0], vals[0], vals[0], vals[1]];
    return [vals[0], vals[1], vals[2], vals[3] ?? 255];
  };
  return { w, h, get };
}

const CHECKS = {
  '02-village': { 'TS草#93ba4f': [0x93, 0xba, 0x4f], 'TS水#47aba9': [0x47, 0xab, 0xa9], 'TS土路#969f64': [0x96, 0x9f, 0x64] },
  '07-dungeon': { '地牢石板#3a3552': [0x3a, 0x35, 0x52] },
  '10-forest': { 'TS森林草#74b363': [0x74, 0xb3, 0x63], 'TS水#47aba9': [0x47, 0xab, 0xa9] },
  '21-cave': { '洞窟石板#332d4d': [0x33, 0x2d, 0x4d] },
};

for (const [name, checks] of Object.entries(CHECKS)) {
  const img = decodePNG(`scripts/shots/${name}.png`);
  let total = 0;
  const hit = Object.fromEntries(Object.keys(checks).map((k) => [k, 0]));
  for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
    const [r, g, b, a] = img.get(x, y);
    if (a < 40) continue;
    total++;
    for (const [label, [tr, tg, tb]] of Object.entries(checks)) {
      if (Math.abs(r - tr) <= 12 && Math.abs(g - tg) <= 12 && Math.abs(b - tb) <= 12) hit[label]++;
    }
  }
  const pct = Object.entries(hit).map(([k, v]) => `${k}:${(100 * v / total).toFixed(1)}%`).join(' ');
  console.log(`${name}: ${pct}`);
}
