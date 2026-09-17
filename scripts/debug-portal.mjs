// 逐步调试：村庄死亡前流程 → 石门 → 地牢
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') console.log(`[console] ${msg.text()}`); });

const state = () => page.evaluate(() => {
  const P = window.__PYQUEST__;
  const s = P.active();
  if (!s) return { scene: null };
  return {
    scene: s.scene.settings.key,
    paused: s.scene.isPaused(),
    px: Math.round(s.player.x), py: Math.round(s.player.y),
    dialogueOpen: s.dialogue.isOpen,
    quizOpen: s.quiz.isOpen,
    gateOpen: P.G.gateOpen, shards: P.G.shards,
    transitioning: !!s.transitioning,
    dungeonPlayer: !!P.scene('Dungeon')?.player,
  };
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#btn-start');
await page.waitForTimeout(1000);
console.log('开始后:', await state());

// 石门流程（不死亡，直接开门）
await page.evaluate(() => { window.__PYQUEST__.G.shards = 3; });
await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 80); s.player.body.reset(200, 80);
});
await page.waitForTimeout(300);
console.log('到门口:', await state());
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
console.log('按E开门后:', await state());

await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 14); s.player.body.reset(200, 14);
});
for (const ms of [300, 600, 900, 1200, 1600, 2000]) {
  await page.waitForTimeout(ms === 300 ? 300 : 300);
  const st = await state();
  console.log(`+${ms}ms:`, JSON.stringify(st));
  if (st.scene === 'Dungeon') break;
}

await browser.close();
