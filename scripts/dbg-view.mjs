// 快速视觉检查：4x 角色比例 / 新细节
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#btn-start');
await page.waitForTimeout(800);

const tele = (x, y) => page.evaluate(([tx, ty]) => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(tx, ty);
  s.player.body.reset(tx, ty);
}, [x, y]);

await tele(216, 328); // 出发点（面向长老/房屋方向）
await page.waitForTimeout(700);
await page.screenshot({ path: 'scripts/shots/25-scale-village.png' });

await tele(176, 216); // 长老身边
await page.waitForTimeout(700);
await page.screenshot({ path: 'scripts/shots/26-scale-elder.png' });

await tele(280, 120); // 符文 v1 旁
await page.waitForTimeout(700);
await page.screenshot({ path: 'scripts/shots/27-scale-rune.png' });

// 地牢 BOSS 房
await page.evaluate(() => {
  const G = window.__PYQUEST__.G;
  G.shards = 5; G.gateOpen = true;
  window.__PYQUEST__.active().scene.start('Dungeon', { spawn: 'fromVillage' });
});
await page.waitForTimeout(1200);
await tele(224, 150);
await page.waitForTimeout(600);
await page.screenshot({ path: 'scripts/shots/28-scale-boss.png' });

await browser.close();
console.log('done');
