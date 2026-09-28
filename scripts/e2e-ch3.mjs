// 端到端测试（第三章 · 科学计算高原）：样板章全流程
// NumPy 符文 ×5 → 解开封印 → 混沌巢穴 → 破盾 → 击败魔君 → 进入第四章
// 用法: node scripts/e2e-ch3.mjs（需要先 npm run dev）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { CHAPTERS } from '../src/data/chapters.js';

const CH3 = CHAPTERS.find((c) => c.id === 3);
const FIELD = CH3.buildField(CH3);
const LAIR = CH3.buildLair(CH3);

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

async function openRune(x, y, label) {
  await tele(x, y + 192);
  await page.waitForTimeout(320);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(480);
  const open = await page.locator('#quiz-backdrop.show').count() === 1;
  check(open, `${label} 答题面板打开`);
  return open;
}

async function answerCorrect(label) {
  const ansIdx = await page.evaluate(() => window.__PYQUEST__.active().quiz.q.answer);
  await page.click(`#quiz-options .opt:nth-child(${ansIdx + 1})`);
  await page.click('#quiz-confirm');
  await page.waitForTimeout(380);
  const ok = await page.locator('#quiz-feedback.ok').count() === 1;
  check(ok, `${label} 答对`);
  await page.click('#quiz-confirm');
  await page.waitForTimeout(420);
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1400);

// ---- 新游戏 → 作弊跳过前两章，直达第三章 ----
await page.click('#btn-start');
await page.waitForTimeout(1200);
check(await activeKey() === 'Village', '新游戏从村庄开始');

await page.evaluate(() => {
  const G = window.__PYQUEST__.G;
  for (const id of [1, 2]) {
    const p = G.progress[id];
    p.shards = 5; p.gateOpen = true; p.bossShielded = false;
    p.bossDefeated = true; p.done = true;
  }
  G.current = 3;
  window.__PYQUEST__.active().scene.start('SciField', { spawn: 'fromPrev' });
});
await waitForScene('SciField');
await page.waitForTimeout(700);
check(await activeKey() === 'SciField', '进入第三章 · 科学计算高原');
await freeze();
await shot('30-scifield');

// ---- 5 块 NumPy 碎片符文（题目从 w3shard 题池随机抽取） ----
const shardRunes = FIELD.props.filter((p) => p.type === 'rune' && !p.healRune && !p.bossRune);
check(shardRunes.length === 5, `高原有 5 块碎片符文（实际 ${shardRunes.length}）`);
for (let i = 0; i < shardRunes.length; i++) {
  const r = shardRunes[i];
  await openRune(r.x, r.y, `符文 ${r.qid}`);
  // 章节徽标应为第三章
  const badge = await page.locator('#quiz-chapter').textContent();
  check(badge.includes('第三章'), `题目来自第三章题池（${badge}）`);
  await answerCorrect(`${r.qid}（NumPy 随机题）`);
}
const g1 = await G();
check(g1.progress[3].shards === 5, `集齐 5 枚数值碎片（实际 ${g1.progress[3].shards}）`);

// ---- 北方巢穴封印：碎片不足时拒绝，集齐后按 E 解开 ----
const door = FIELD.props.find((p) => p.type === 'doorlink');
await page.evaluate(() => { window.__PYQUEST__.G.progress[3].shards = 0; });
await tele(door.x, door.y + 192);
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(400);
check(await page.locator('#dialogue.show').count() === 1, '碎片不足时封印之门拒绝开启');
for (let i = 0; i < 6; i++) {
  if (await page.locator('#dialogue.show').count() === 0) break;
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(260);
}
await page.evaluate(() => { window.__PYQUEST__.G.progress[3].shards = 5; });
await tele(door.x, door.y + 192);
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
const gateOpen3 = await page.evaluate(() => window.__PYQUEST__.G.progress[3].gateOpen);
check(gateOpen3, '集齐数值碎片后封印解开');

// ---- 进入混沌巢穴 ----
await tele(door.x, 100);
await waitForScene('SciLair');
await page.waitForTimeout(700);
check(await activeKey() === 'SciLair', '进入混沌巢穴');
await freeze();
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('SciLair');
  if (s.boss) { s.boss.setVelocity(0, 0); s.boss.knockUntil = 1e12; }
  s.slimeGroup.children.iterate((sl) => {
    if (sl && !sl.isBoss) { sl.dead = true; sl.destroy(); }
  });
});
await shot('31-scilair');

const shielded3 = await page.evaluate(() => window.__PYQUEST__.G.progress[3].bossShielded);
check(shielded3, '混沌曲线魔君初始处于护盾状态');

// ---- 祝福符文（回心不产碎片）×1 + BOSS 符文 ----
const healRunes = LAIR.props.filter((p) => p.type === 'rune' && p.healRune);
check(healRunes.length === 3, `巢穴有 3 块祝福符文（实际 ${healRunes.length}）`);
await openRune(healRunes[0].x, healRunes[0].y, `符文 ${healRunes[0].qid}`);
await answerCorrect(`${healRunes[0].qid}（祝福随机题）`);
const healCheck = await page.evaluate(() => window.__PYQUEST__.G.progress[3].shards);
check(healCheck === 5, `祝福符文不产碎片（碎片仍 ${healCheck}）`);

const bossRune = LAIR.props.find((p) => p.type === 'rune' && p.bossRune);
await openRune(bossRune.x, bossRune.y, 'BOSS 符文');
await answerCorrect('BOSS 符文（NumPy 综合随机题）');
const shieldBroken3 = await page.evaluate(() => window.__PYQUEST__.G.progress[3].bossShielded === false);
check(shieldBroken3, '答对 NumPy 谜题，魔君护盾破碎');

// ---- 攻击魔君（BossSlime 机制）→ 击败 ----
const bossPos = LAIR.boss;
await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('SciLair');
  s.boss.setVelocity(0, 0);
  s.boss.knockUntil = 1e12;
  s.boss.setPosition(2048, 576);
  s.boss.body.reset(2048, 576);
});
await tele(2048, 384);
await page.waitForTimeout(250);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(320);
const hpAfterHit = await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('SciLair');
  return s.boss ? s.boss.hp : -1;
});
check(hpAfterHit === 9, `破盾后挥剑命中魔君（hp=${hpAfterHit}）`);

await page.evaluate(() => {
  const s = window.__PYQUEST__.scene('SciLair');
  if (s.boss) { s.boss.hp = 1; s.boss.hurt(1, 2048, 800); }
});
await page.waitForTimeout(2400);
const gEnd = await G();
check(gEnd.progress[3].done, '击败混沌曲线魔君，第三章通关');
check(await page.locator('#victory').evaluate((el) => !el.classList.contains('hidden')), '胜利画面出现');
check((await page.locator('#victory-title').textContent()).includes('第三章'), '显示第三章通关标题');
const stats = await page.locator('#victory-stats').textContent();
check(stats.includes('3 / 8'), `结算显示章节进度（${stats}）`);
await shot('32-victory3');

// ---- 下一章衔接：第四章 · 天文包星图塔（W4 占位章） ----
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pyquest:save:v2') || 'null'));
check(!!saved && saved.progress[3].done === true, '第三章进度已自动存档（v2）');

await page.click('#btn-next');
await waitForScene('C4F');
await page.waitForTimeout(700);
check(await activeKey() === 'C4F', '进入第四章 · 星图塔平原（占位章链路通）');
await freeze();
await shot('33-c4f');

// 第四章占位章：解一块符文确认题池可用（w4 天文包）
const c4 = CHAPTERS.find((c) => c.id === 4);
const c4Field = c4.buildField(c4);
const c4Rune = c4Field.props.find((p) => p.type === 'rune' && !p.healRune && !p.bossRune);
await openRune(c4Rune.x, c4Rune.y, `第四章符文 ${c4Rune.qid}`);
const badge4 = await page.locator('#quiz-chapter').textContent();
check(badge4.includes('第四章'), `第四章题目来自天文包题池（${badge4}）`);
await answerCorrect(`${c4Rune.qid}（天文包随机题）`);
const g4 = await G();
check(g4.progress[4].shards >= 1, '第四章碎片计数正常');

// ---- 世界地图：Tab 呼出 · 章节状态 · 快速传送 ----
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
check(await page.locator('#map-backdrop.show').count() === 1, 'Tab 呼出世界地图');
await shot('35-worldmap');
const nodeCount = await page.locator('#map-path .map-node').count();
check(nodeCount === 8, `地图显示 8 个章节节点（实际 ${nodeCount}）`);
check(await page.locator('.map-node[data-id="5"].locked').count() === 1, '第五章未解锁显示为锁定 🔒');
check(await page.locator('.map-node[data-id="1"].done').count() === 1, '第一章显示已通关 ✓');
check(await page.locator('.map-node[data-id="3"].done').count() === 1, '第三章显示已通关 ✓');
check(await page.locator('.map-node[data-id="4"].here').count() === 1, '当前所在章（第四章）📍 高亮');
const subText = await page.locator('#map-sub').textContent();
check(subText.includes('3 / 8'), `地图头部显示总进度（${subText}）`);
// Tab 再按一次关闭
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
check(await page.locator('#map-backdrop.show').count() === 0, '再按 Tab 关闭地图');
// 重新打开并点击已通关章节传送
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
await page.click('.map-node[data-id="1"]');
await waitForScene('Village');
await page.waitForTimeout(700);
check(await activeKey() === 'Village', '点击节点快速传送回诺瓦村庄');
check(await page.locator('#map-backdrop.show').count() === 0, '传送后地图自动关闭');
const gAfterTravel = await G();
check(gAfterTravel.current === 1, '当前位置更新为第一章');
await shot('36-worldmap-travel');
// 锁定章节不可点击：打开地图确认第五章仍锁定后关闭
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
const lockedClickable = await page.locator('.map-node[data-id="5"]').evaluate((el) => getComputedStyle(el).cursor);
check(lockedClickable === 'not-allowed', '锁定章节节点不可点击');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);

// ---- 刷新 → 继续冒险应落在第四章 ----
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
const btnText = (await page.locator('#btn-start').textContent()).trim();
check(btnText.includes('第4章'), `标题画面显示「${btnText}」`);
await page.click('#btn-start');
await page.waitForTimeout(1200);
check(await activeKey() === 'C4F', '读档后落到第四章野外');
await shot('34-resume-c4');

// ---- 汇总 ----
console.log('=== E2E 第三章测试结果 ===');
for (const s of steps) console.log(s);
if (errors.length) { console.log('浏览器错误:'); console.log(errors.join('\n')); }
else console.log('浏览器无报错 ✓');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
