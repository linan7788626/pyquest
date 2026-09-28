// 端到端测试：无头 Chromium 运行真实游戏流程
// 用法: node scripts/e2e.mjs（需要先 npm run dev）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
mkdirSync('scripts/shots', { recursive: true });

const errors = [];
const steps = [];
let failed = false;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `scripts/shots/${name}.png` });
  steps.push(`📷 ${name}`);
  console.log(`📷 ${name}`);
};
const check = (cond, label) => {
  if (cond) { steps.push(`  ✓ ${label}`); console.log(`  ✓ ${label}`); }
  else { failed = true; steps.push(`  ✗ ${label}`); console.log(`  ✗ ${label}`); }
};

await page.goto(BASE, { waitUntil: 'networkidle' });
// 清掉旧存档，保证从「开始冒险」全新流程跑起
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await shot('01-title');

// ---- 开始游戏 ----
await page.click('#btn-start');
await page.waitForTimeout(1200);
check(await page.locator('#game canvas').count() > 0, '画布已创建');
check(await page.locator('#title.hidden').count() === 1, '标题画面已关闭');
const hearts = await page.locator('#hearts svg').count();
check(hearts === 6, `HUD 显示 6 颗心（实际 ${hearts}）`);
await shot('02-village');

// 调试工具
const tele = (x, y) => page.evaluate(([tx, ty]) => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(tx, ty);
  s.player.body.reset(tx, ty);
}, [x, y]);
const freezePlayer = () => page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.invulUntil = 1e12; // 测试期间免伤免击退
});
const activeKey = () => page.evaluate(() => window.__PYQUEST__.active().scene.settings.key);

await freezePlayer();

// 随机题库工具：题目从同难度题池随机抽取，正确项位置动态读取
const quizAnswer = () => page.evaluate(() => window.__PYQUEST__.active().quiz.q.answer);
const quizOptCount = () => page.locator('#quiz-options .opt').count();

// ---- 符文石答题（正确路径）----
await tele(2240, 896); // 符文 v1 (2240,704) 正下方
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
check(await page.locator('#quiz-backdrop.show').count() === 1, '符文答题面板打开');
await shot('03-quiz-open');

await page.click(`#quiz-options .opt:nth-child(${(await quizAnswer()) + 1})`); // 动态读取正确项
await page.click('#quiz-confirm');
await page.waitForTimeout(400);
await shot('04-quiz-correct');
await page.click('#quiz-confirm'); // 领取奖励
await page.waitForTimeout(400);
const shards = await page.evaluate(() => window.__PYQUEST__.G.progress[1].shards);
check(shards === 1, `答对获得碎片（实际 ${shards}）`);
const answered = await page.evaluate(() => window.__PYQUEST__.G.answered.has('v1'));
check(answered, '符文已标记为已领悟');

// ---- 答错路径 ----
await tele(832, 2240); // 符文 v2 (832,2048) 下方
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
const wrongIdx = ((await quizAnswer()) + 1) % (await quizOptCount()); // 任选一个错误项
await page.click(`#quiz-options .opt:nth-child(${wrongIdx + 1})`);
await page.click('#quiz-confirm');
await page.waitForTimeout(300);
check(await page.locator('#quiz-feedback.bad').count() === 1, '答错给出反馈');
await shot('05-quiz-wrong');
const heartsAfterWrong = await page.evaluate(() => window.__PYQUEST__.G.hearts);
check(heartsAfterWrong === 5, `答错扣 1 心（实际 ${heartsAfterWrong}）`);
await page.click('#quiz-cancel');
await page.waitForTimeout(300);

// ---- 石门（碎片不足）----
await tele(1600, 720);
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
check(await page.locator('#dialogue.show').count() === 1, '碎片不足时石门给出提示');
await shot('06-gate-locked');
// 连按 E 直到对话关闭（打字机需要先补完当前行）
for (let i = 0; i < 6; i++) {
  if (await page.locator('#dialogue.show').count() === 0) break;
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(260);
}
check(await page.locator('#dialogue.show').count() === 0, '对话可关闭');

// ---- 集齐碎片开门 → 传送地牢 ----
await page.evaluate(() => { window.__PYQUEST__.G.progress[1].shards = 5; });
await tele(1600, 640);
await page.waitForTimeout(200);
await page.keyboard.press('KeyE');
await page.waitForTimeout(600);
const gateOpen = await page.evaluate(() => window.__PYQUEST__.G.progress[1].gateOpen);
check(gateOpen, '5 枚碎片打开石门');

await tele(1600, 112); // 走进门后传送区
// 等待地牢场景就绪（圆形转场约需 500ms）
await page.waitForFunction(() => {
  const s = window.__PYQUEST__ && window.__PYQUEST__.scene('Dungeon');
  return !!(s && s.player);
}, { timeout: 6000 });
await page.waitForTimeout(600);
check(await activeKey() === 'Dungeon', '传送到数据地牢');
await shot('07-dungeon');

// 地牢里重新冻结（新场景新玩家实例），并清掉干扰测试的小史莱姆
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Dungeon');
  s.player.invulUntil = 1e12;
  s.slimeGroup.children.iterate((sl) => {
    if (sl && !sl.isBoss) { sl.dead = true; sl.destroy(); }
  });
});

// ---- BOSS 符文破盾 ----
await tele(1216, 1024); // boss 符文 (1216,832) 正下方
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
check(await page.locator('#quiz-backdrop.show').count() === 1, 'BOSS 符文答题面板打开');
await page.click(`#quiz-options .opt:nth-child(${(await quizAnswer()) + 1})`); // 动态读取正确项
await page.click('#quiz-confirm');
await page.waitForTimeout(300);
await page.click('#quiz-confirm');
await page.waitForTimeout(400);
const shielded = await page.evaluate(() => window.__PYQUEST__.G.progress[1].bossShielded);
check(shielded === false, '答对循环谜题，BOSS 护盾破碎');
await shot('08-boss-shield-broken');

// ---- 攻击 BOSS → 通关 ----
await tele(1792, 512); // BOSS (1792,704) 正上方
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Dungeon');
  s.boss.setVelocity(0, 0);
  s.boss.knockUntil = 1e12; // 冻结 BOSS AI 便于确定性命中
  s.boss.setPosition(1792, 704);
  s.boss.body.reset(1792, 704);
});
await page.waitForTimeout(200);
await page.keyboard.press('KeyJ'); // 向下挥剑
await page.waitForTimeout(300);
const bossHpAfterHit = await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Dungeon');
  return s.boss ? s.boss.hp : -1;
});
check(bossHpAfterHit === 9, `破盾后挥剑可命中 BOSS（hp=${bossHpAfterHit}）`);

await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Dungeon');
  if (s.boss) { s.boss.hp = 1; s.boss.hurt(1, 1792, 992); } // 最后一击
});
await page.waitForTimeout(2400);
const defeated = await page.evaluate(() => window.__PYQUEST__.G.progress[1].bossDefeated);
check(defeated, '击败 BOSS');
const ch1Done = await page.evaluate(() => window.__PYQUEST__.G.progress[1].done);
check(ch1Done, '第一章通关标记已写入');
check(await page.locator('#victory').evaluate((el) => !el.classList.contains('hidden')), '胜利画面出现');
check((await page.locator('#btn-next').textContent()).includes('第二章'), '胜利画面提供「进入第二章」按钮');
await shot('09-victory');

// ---- 存档已自动写入 localStorage ----
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pyquest:save:v2') || 'null'));
check(!!saved && saved.progress[1].done === true, '通关进度已自动存档（v2 多章结构）');

// ---- 进入第二章 ----
await page.click('#btn-next');
await page.waitForFunction(() => {
  const s = window.__PYQUEST__ && window.__PYQUEST__.scene('Forest');
  return !!(s && s.player);
}, { timeout: 6000 });
await page.waitForTimeout(600);
check(await activeKey() === 'Forest', '进入第二章 · 函数之森');
await page.evaluate(() => { window.__PYQUEST__.scene('Forest').player.invulUntil = 1e12; });
const ch2Shards0 = await page.evaluate(() => window.__PYQUEST__.G.progress[2].shards);
check(ch2Shards0 === 0, '第二章碎片计数从 0 开始');
await shot('10-forest');

// ---- 汇总 ----
console.log('=== E2E 测试结果 ===');
for (const s of steps) console.log(s);
if (errors.length) { console.log('浏览器错误:'); console.log(errors.join('\n')); }
else console.log('浏览器无报错 ✓');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
