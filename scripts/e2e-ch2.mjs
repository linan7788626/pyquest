// 端到端测试（第二章）：函数之森 → 列表洞窟 → 巨蟒毕森 → 存档续玩
// 用法: node scripts/e2e-ch2.mjs（需要先 npm run dev）
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

const activeKey = () => page.evaluate(() => window.__PYQUEST__.active().scene.settings.key);
const tele = (x, y) => page.evaluate(([tx, ty]) => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(tx, ty);
  s.player.body.reset(tx, ty);
}, [x, y]);
const freeze = () => page.evaluate(() => {
  const s = window.__PYQUEST__.active();
  s.player.invulUntil = 1e12;
});
const G = () => page.evaluate(() => window.__PYQUEST__.G);
const waitForScene = (key) => page.waitForFunction((k) => {
  const s = window.__PYQUEST__ && window.__PYQUEST__.scene(k);
  return !!(s && s.player);
}, key, { timeout: 6000 });

/** 传送到符文下方并按 E 打开答题面板 */
async function openRune(x, y, label) {
  await tele(x, y + 24);
  await page.waitForTimeout(320);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(480);
  const open = await page.locator('#quiz-backdrop.show').count() === 1;
  check(open, `${label} 答题面板打开`);
  return open;
}

/** 点击选项 → 确认 → 领取奖励（两段确认）。题目从同难度题池随机抽取，正确项动态读取 */
async function answerCorrect(label) {
  const ansIdx = await page.evaluate(() => window.__PYQUEST__.active().quiz.q.answer);
  await page.click(`#quiz-options .opt:nth-child(${ansIdx + 1})`);
  await page.click('#quiz-confirm');
  await page.waitForTimeout(380);
  const ok = await page.locator('#quiz-feedback.ok').count() === 1;
  check(ok, `${label} 答对`);
  await page.click('#quiz-confirm'); // 关闭 / 领取
  await page.waitForTimeout(420);
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1400);

// ---- 新游戏 → 作弊跳过第一章（第一章流程由 e2e.mjs 覆盖） ----
await page.click('#btn-start');
await page.waitForTimeout(1200);
check(await activeKey() === 'Village', '新游戏从村庄开始');

await page.evaluate(() => {
  const G = window.__PYQUEST__.G;
  G.shards = 5;
  G.gateOpen = true;
  G.bossShielded = false;
  G.bossDefeated = true;
  G.ch1Done = true;
  ['v1', 'v2', 'v3', 'v4', 'v5', 'd1', 'd2', 'd3', 'd4', 'd5', 'boss'].forEach((id) => G.answered.add(id));
  window.__PYQUEST__.active().scene.start('Forest', { spawn: 'fromVillage' });
});
await waitForScene('Forest');
await page.waitForTimeout(700);
check(await activeKey() === 'Forest', '进入函数之森');
await freeze();
await shot('20-forest');

// ---- 函数之森：5 块碎片符文（题目从函数题池随机抽取，难度一致） ----
await openRune(88, 208, '符文 f1');   // pc(5), pc(12.5)
await answerCorrect('f1（函数题池随机题）');
await openRune(504, 256, '符文 f2');  // pc(31), pc(15.5)
await answerCorrect('f2（函数题池随机题）');
await openRune(200, 120, '符文 f3');  // pc(12), pc(7)
await answerCorrect('f3（函数题池随机题）');
await openRune(552, 104, '符文 f4');  // pc(34), pc(6)
await answerCorrect('f4（函数题池随机题）');
await openRune(360, 264, '符文 f5');  // pc(22), pc(16)
await answerCorrect('f5（函数题池随机题）');
const g1 = await G();
check(g1.ch2Shards === 5, `集齐 5 枚函数碎片（实际 ${g1.ch2Shards}）`);

// ---- 洞窟封印：碎片不足时锁定，集齐后按 E 解开 ----
// 先验证锁定态（临时扣掉碎片）
await page.evaluate(() => { window.__PYQUEST__.G.ch2Shards = 0; });
await tele(448, 86);
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
check(await page.locator('#dialogue.show').count() === 1, '碎片不足时封印之门拒绝开启');
for (let i = 0; i < 6; i++) {
  if (await page.locator('#dialogue.show').count() === 0) break;
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(260);
}
await page.evaluate(() => { window.__PYQUEST__.G.ch2Shards = 5; });
await tele(448, 86);
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
const gateOpen2 = await page.evaluate(() => window.__PYQUEST__.G.ch2GateOpen);
check(gateOpen2, '集齐碎片后封印解开');

// ---- 穿过洞窟之门 → 列表洞窟 ----
await tele(448, 34); // 传送区
await waitForScene('Cave');
await page.waitForTimeout(700);
check(await activeKey() === 'Cave', '进入列表洞窟');
await freeze();
await shot('21-cave');

// 冻结巨蟒，清掉小史莱姆，保证答题环节确定性
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  if (s.boss) { s.boss.setVelocity(0, 0); s.boss.knockUntil = 1e12; }
  s.slimeGroup.children.iterate((sl) => {
    if (sl && !sl.isBoss) { sl.dead = true; sl.destroy(); }
  });
});

const snakeSegs = await page.evaluate(() => window.__PYQUEST__.scene('Cave').boss?.segs?.length ?? -1);
check(snakeSegs === 6, `巨蟒有 6 节身体（实际 ${snakeSegs}）`);
const snakeShielded = await page.evaluate(() => window.__PYQUEST__.G.boss2Shielded);
check(snakeShielded, '巨蟒初始处于符文护盾状态');

// ---- 列表符文（祝福：回心不产碎片，题目从列表题池随机抽取）×3 + BOSS 符文 ----
await openRune(104, 200, '符文 l1');   // pc(6), pc(12)
await answerCorrect('l1（列表题池随机题）');
const healCheck = await page.evaluate(() => window.__PYQUEST__.G.ch2Shards);
check(healCheck === 5, `祝福符文不产碎片（碎片仍 ${healCheck}）`);
await openRune(408, 200, '符文 l2');   // pc(25), pc(12)
await answerCorrect('l2（列表题池随机题）');
await openRune(136, 328, '符文 l3');   // pc(8), pc(20)
await answerCorrect('l3（列表题池随机题）');

await openRune(256, 176, 'BOSS 符文 boss2'); // pc(15.5), pc(10.5)
await answerCorrect('boss2（列表综合随机题）');
const shieldBroken = await page.evaluate(() => window.__PYQUEST__.G.boss2Shielded === false);
check(shieldBroken, '答对列表谜题，巨蟒护盾破碎');

// ---- 攻击巨蟒头部 → 断尾 → 击败 ----
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  s.boss.setVelocity(0, 0);
  s.boss.knockUntil = 1e12; // 冻结 AI 便于确定性命中
  s.boss.setPosition(256, 72);
  s.boss.body.reset(256, 72);
});
await tele(256, 48); // 巨蟒正上方，向下挥剑
await page.waitForTimeout(250);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(320);
const afterHit = await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  return { hp: s.boss ? s.boss.hp : -1, segs: s.boss ? s.boss.segs.length : -1 };
});
check(afterHit.hp === 11, `破盾后挥剑命中巨蟒（hp=${afterHit.hp}）`);
check(afterHit.segs === 6, `第一击后身体完整（剩 ${afterHit.segs} 节）`);
// 第一击的击退会让巨蟒恢复行动，重新冻结复位后再补一击
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  s.boss.setVelocity(0, 0);
  s.boss.knockUntil = 1e12;
  s.boss.setPosition(256, 72);
  s.boss.body.reset(256, 72);
});
await page.waitForTimeout(420); // 等攻击与受击硬直结束
await page.keyboard.press('KeyJ'); // 第二击 → hp 10（偶数）触发断尾
await page.waitForTimeout(450);
const afterHit2 = await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  return { hp: s.boss ? s.boss.hp : -1, segs: s.boss ? s.boss.segs.length : -1 };
});
check(afterHit2.hp === 10, `第二击命中（hp=${afterHit2.hp}）`);
check(afterHit2.segs === 5, `hp 降到一半档位时断尾（剩 ${afterHit2.segs} 节）`);
await shot('22-snake');

await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('Cave');
  if (s.boss) { s.boss.hp = 1; s.boss.hurt(1, 256, 100); } // 最后一击
});
await page.waitForTimeout(2600);
const gEnd = await G();
check(gEnd.ch2Done, '巨蟒被封印，第二章通关');
check(await page.locator('#victory').evaluate((el) => !el.classList.contains('hidden')), '全部通关画面出现');
check((await page.locator('#victory-title').textContent()).includes('通 关'), '显示全部通关标题');
await shot('23-victory2');

// ---- 存档已写入 → 刷新后「继续冒险」恢复 ----
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pyquest:save:v1') || 'null'));
check(!!saved && saved.ch2Done === true && saved.ch2GateOpen === true, '第二章进度已自动存档');

await page.click('#btn-next'); // 返回村庄
await waitForScene('Village');
await page.waitForTimeout(500);
check(await activeKey() === 'Village', '通关后返回村庄');

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
const btnText = (await page.locator('#btn-start').textContent()).trim();
check(btnText.includes('继续冒险'), `标题画面显示「${btnText}」`);
const btnNewVisible = await page.locator('#btn-new').evaluate((el) => el.style.display !== 'none');
check(btnNewVisible, '「新的冒险」按钮出现');
await page.click('#btn-start'); // 继续冒险 → 读档
await page.waitForTimeout(1200);
const gResume = await G();
check(gResume.ch2Done === true && gResume.ch1Done === true, '读档后进度完整（ch1Done + ch2Done）');
check(await activeKey() === 'Village', '读档后回到村庄');
await shot('24-resume');

// ---- 汇总 ----
console.log('=== E2E 第二章测试结果 ===');
for (const s of steps) console.log(s);
if (errors.length) { console.log('浏览器错误:'); console.log(errors.join('\n')); }
else console.log('浏览器无报错 ✓');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
