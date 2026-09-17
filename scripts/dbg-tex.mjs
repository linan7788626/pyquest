// 导出角色贴图原图（放大 6x）便于检查细节
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 700 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#btn-start');
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  const out = {};
  for (const k of ['player_down_0', 'player_right_0', 'player_up_0', 'elder', 'slime_0', 'slime_blue_0', 'boss', 'snake_head', 'snake_body']) {
    const tex = window.__PYQUEST__.game.textures.get(k);
    const src = tex.getSourceImage();
    const c = document.createElement('canvas');
    const Z = 6;
    c.width = src.width * Z; c.height = src.height * Z;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    out[k] = c.toDataURL('image/png');
  }
  return out;
});
for (const [k, v] of Object.entries(data)) writeFileSync(`scripts/shots/tex-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
await browser.close();
console.log('saved');
