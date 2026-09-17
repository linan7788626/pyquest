// Bug 复现：死亡一次后 → 重生 → 再进北门
// 用法: node scripts/repro-death-gate.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const errors = [];
const log = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

const state = () => page.evaluate(() => {
  const P = window.__PYQUEST__;
  const s = P.active();
  if (!s) return { scene: null };
  const gate = s.gate;
  return {
    scene: s.scene.settings.key,
    paused: s.scene.isPaused(),
    px: Math.round(s.player.x), py: Math.round(s.player.y),
    dying: s.player.dying,
    hearts: P.G.hearts, shards: P.G.shards,
    gateOpen: P.G.gateOpen,
    gateBody: gate && gate.sprite.body ? { enable: gate.sprite.body.enable } : null,
    dialogueOpen: s.dialogue.isOpen,
    quizOpen: s.quiz.isOpen,
    transitioning: !!s.transitioning,
    camAlpha: s.cameras.main.alpha,
  };
});
const shot = (n) => page.screenshot({ path: `scripts/shots/repro-${n}.png` });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#btn-start');
await page.waitForTimeout(1000);

// ===== 场景 A：开门进地牢后死亡 =====
log.push('--- A: 开门 → 进地牢 → 死亡 ---');
await page.evaluate(() => { window.__PYQUEST__.G.shards = 3; });
await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 80); s.player.body.reset(200, 80);
});
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
let st = await state();
log.push(`开门后: gateOpen=${st.gateOpen} scene=${st.scene}`);

await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 14); s.player.body.reset(200, 14);
});
await page.waitForTimeout(1400);
st = await state();
log.push(`进入地牢: scene=${st.scene} pos=(${st.px},${st.py})`);

// 在地牢里死亡
await page.evaluate(() => {
  const P = window.__PYQUEST__;
  P.G.hearts = 1;
  const s = P.scene('Dungeon');
  s.player.invulUntil = 0;
  s.player.takeDamage(1, s.player.x, s.player.y - 10);
});
await page.waitForTimeout(1800);
st = await state();
log.push(`死亡重生后: scene=${st.scene} hearts=${st.hearts} pos=(${st.px},${st.py}) dying=${st.dying}`);
await shot('A-respawned');

// 重生后再走北门（门此时应是开的）
log.push('--- A2: 重生后进北门 ---');
await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 90); s.player.body.reset(200, 90);
});
await page.waitForTimeout(400);
st = await state();
log.push(`走到门口: scene=${st.scene} gateOpen=${st.gateOpen} gateBody=${JSON.stringify(st.gateBody)}`);

await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 14); s.player.body.reset(200, 14);
});
await page.waitForTimeout(1400);
st = await state();
log.push(`尝试进门后: scene=${st.scene} pos=(${st.px},${st.py}) transitioning=${st.transitioning}`);
if (st.scene !== 'Dungeon') { log.push('  ✗ BUG 仍存在：死亡后北门传送失效！'); }
else { log.push('  ✓ 修复验证：死亡重生后北门传送正常'); }
await shot('A2-after-gate');

// ===== 场景 B：村庄里死亡（门未开）→ 重生 → 交互石门 =====
log.push('--- B: 刷新重来，村庄死亡（门未开）---');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#btn-start');
await page.waitForTimeout(1000);

await page.evaluate(() => {
  const P = window.__PYQUEST__;
  P.G.hearts = 1;
  const s = P.active();
  s.player.takeDamage(1, s.player.x, s.player.y - 10);
});
await page.waitForTimeout(1800);
st = await state();
log.push(`村庄死亡重生: scene=${st.scene} pos=(${st.px},${st.py}) gateOpen=${st.gateOpen} shards=${st.shards}`);

// 走到石门旁，按 E 检查（应提示碎片不足）
await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 80); s.player.body.reset(200, 80);
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
st = await state();
log.push(`按E后: dialogueOpen=${st.dialogueOpen} scene=${st.scene} paused=${st.paused}`);
await shot('B-gate-locked-dialog');

// 关闭对话（连按 E）
for (let i = 0; i < 6; i++) {
  const s = await state();
  if (!s.dialogueOpen) break;
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(260);
}
st = await state();
log.push(`关闭对话后: dialogueOpen=${st.dialogueOpen} paused=${st.paused}`);

// 给 3 碎片，再按 E 开门
await page.evaluate(() => { window.__PYQUEST__.G.shards = 3; });
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
st = await state();
log.push(`碎片充足再按E: gateOpen=${st.gateOpen} dialogueOpen=${st.dialogueOpen} scene=${st.scene}`);

// 进门
await page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(200, 14); s.player.body.reset(200, 14);
});
await page.waitForTimeout(1400);
st = await state();
log.push(`进北门后: scene=${st.scene} pos=(${st.px},${st.py})`);
await shot('B2-entered-dungeon');

console.log('=== 复现结果 ===');
log.forEach((l) => console.log(l));
if (errors.length) { console.log('浏览器错误:'); console.log(errors.join('\n')); }
else console.log('浏览器无报错');
await browser.close();
