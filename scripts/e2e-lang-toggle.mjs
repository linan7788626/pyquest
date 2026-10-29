// 端到端测试（Lane B i18n）：语言切换不影响游戏状态/抽题/判定
// 用法: 先起独立服务 npx vite --port 5186 --strictPort，再
//       BASE_URL=http://127.0.0.1:5186/ node scripts/e2e-lang-toggle.mjs
// 流程：zh 起始 → 答对 v1 → 打开 v2 后取消（保留抽题）→ 切 EN（真实点击）
//      → 校验状态快照不变 → 重开 v2（同 qid、英文题面）→ 答题中往返切换
//      → 答对 v2 → 存档语义不变。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5186/';
mkdirSync('scripts/shots', { recursive: true });

const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
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
const snapState = () => page.evaluate(() => {
  const s = window.__PYQUEST__.state();
  return {
    hearts: s.hearts, answered: s.answered, qAnswered: s.qAnswered,
    runeRolls: s.runeRolls, progress: s.progress,
    scene: window.__PYQUEST__.active().scene.settings.key,
  };
});
const tele = (x, y) => page.evaluate(([tx, ty]) => {
  const s = window.__PYQUEST__.active();
  s.player.setPosition(tx, ty);
  s.player.body.reset(tx, ty);
}, [x, y]);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear()); // 清存档 + 语言偏好，zh 全新流程
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// ---- 标题页：默认中文 ----
check(await page.evaluate(() => document.documentElement.getAttribute('lang')) === 'zh-CN',
  '标题页 <html lang> 默认 zh-CN');
check(CJK.test(await page.locator('#btn-start').textContent()),
  `标题页主按钮为中文（${await page.locator('#btn-start').textContent()}）`);
check(await page.locator('#title .lang-pill .lp-opt').count() === 2,
  '标题页语言胶囊有 zh/en 两个按钮');
check(await page.locator('#title .lp-opt[aria-pressed="true"]').getAttribute('data-lang-opt') === 'zh',
  '标题页胶囊默认选中 zh');

// 标题页往返切换（真实点击）
await page.click('#title .lang-pill [data-lang-opt="en"]');
check(await page.evaluate(() => document.documentElement.getAttribute('lang')) === 'en',
  '标题页切 EN 后 <html lang> = en');
check((await page.locator('#title .subtitle').textContent()).includes('NLI Asset Preview'),
  '标题页副标题切换为英文');
await page.click('#title .lang-pill [data-lang-opt="zh"]');
check(CJK.test(await page.locator('#title .subtitle').textContent()),
  '标题页切回 zh 后副标题恢复中文原文');

// ---- 开始游戏（zh）----
await page.click('#btn-start');
await page.waitForTimeout(1200);
check(await page.locator('#game canvas').count() > 0, '画布已创建');
await page.evaluate(() => window.__PYQUEST__.godmode()); // 免伤免击退

// ---- 符文 v1：zh 答对拿碎片 ----
await tele(2240, 896); // 符文 v1 (2240,704) 正下方
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
check(await page.locator('#quiz-backdrop.show').count() === 1, '符文 v1 答题面板打开（zh）');
check(CJK.test(await page.locator('#quiz-prompt').textContent()), 'v1 题面为中文');
const qid1 = await page.evaluate(() => window.__PYQUEST__.active().quiz.q.id);
await page.click(`#quiz-options .opt:nth-child(${(await page.evaluate(() => window.__PYQUEST__.active().quiz.q.answer)) + 1})`);
await page.click('#quiz-confirm');
await page.waitForTimeout(400);
await page.click('#quiz-confirm'); // 领取碎片
await page.waitForTimeout(400);
const s1 = await snapState();
check(s1.answered.includes('v1'), 'v1 符文槽位已破解（answered）');
check(s1.qAnswered.includes(qid1), `v1 答对已记录（qAnswered 含题 ${qid1}）`);
check(s1.progress[1].shards === 1, '答对 v1 获得 1 枚碎片');
await shot('lang-01-quiz-zh');

// ---- 符文 v2：zh 抽题后取消（保留抽题记录，供切换后重开比对）----
await tele(832, 2240); // 符文 v2 (832,2048) 下方
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
const qid2 = await page.evaluate(() => window.__PYQUEST__.active().quiz.q.id);
const zhPrompt2 = await page.locator('#quiz-prompt').textContent();
const zhOpts = await page.locator('#quiz-options .opt').count();
const zhCode = await page.locator('#quiz-code').textContent();
await page.click('#quiz-cancel');
await page.waitForTimeout(300);
const s2 = await snapState();
check(s2.runeRolls.v2 === qid2, `v2 已抽题（qid=${qid2}），取消后抽题记录保留`);

// ---- 切换 EN（HUD 胶囊真实点击，无答题面板遮挡）----
await page.click('#hud-top .lang-pill [data-lang-opt="en"]');
await page.evaluate(() => document.activeElement && document.activeElement.blur()); // 胶囊聚焦时拦截游戏键，移焦恢复控制
await page.waitForTimeout(300);
check(await page.evaluate(() => document.documentElement.getAttribute('lang')) === 'en',
  'HUD 切 EN 后 <html lang> = en');
check(!CJK.test(await page.locator('#objective').textContent()),
  `目标行已切英文（${JSON.stringify(await page.locator('#objective').textContent())}）`);
check((await page.locator('#title .subtitle').textContent()).includes('NLI Asset Preview'),
  '静态 DOM（标题副标题）已切英文');
check(await page.evaluate(() => localStorage.getItem('pyquest:lang')) === 'en',
  "语言偏好写入独立 key 'pyquest:lang'");
check(await page.locator('#lang-toast.show').count() === 1, '切换反馈条短暂显示');
const s3 = await snapState();
check(s3.scene === s2.scene && s3.scene === 'Village', '场景未重启（仍在 Village 场景）');
check(JSON.stringify([s3.answered, s3.qAnswered, s3.runeRolls, s3.progress])
  === JSON.stringify([s2.answered, s2.qAnswered, s2.runeRolls, s2.progress]),
  '切换语言后 answered/qAnswered/runeRolls/progress 完全不变');
await shot('lang-02-switched-en');

// ---- 重开 v2：同 qid、英文题面、选项数与代码不变 ----
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
check(await page.locator('#quiz-backdrop.show').count() === 1, '符文 v2 重开答题面板');
const reopen = await page.evaluate(() => ({
  qid: window.__PYQUEST__.active().quiz.q.id,
  rolls: window.__PYQUEST__.state().runeRolls.v2,
}));
check(reopen.qid === qid2 && reopen.rolls === qid2, `重开 v2 仍是同一道题（qid=${reopen.qid}）`);
const enPrompt = await page.locator('#quiz-prompt').textContent();
check(enPrompt !== zhPrompt2 && !CJK.test(enPrompt), 'v2 题面已切换为英文');
check(/^Chapter\s/.test(await page.locator('#quiz-chapter').textContent()),
  `章节标签为英文（${await page.locator('#quiz-chapter').textContent()}）`);
check(await page.locator('#quiz-options .opt').count() === zhOpts, '选项数量不变');
check((await page.locator('#quiz-code').textContent()) === zhCode, 'Python 代码块不随语言变化');
await shot('lang-03-quiz-en');

// ---- 答题面板打开时往返切换（程序化点击，背面遮挡下验证监听器重渲染）----
await page.evaluate(() => document.querySelector('#hud-top .lang-pill [data-lang-opt="zh"]').click());
await page.waitForTimeout(200);
check(CJK.test(await page.locator('#quiz-prompt').textContent()),
  '答题面板打开时切回 zh：题面即时变中文（不重抽题）');
check((await page.evaluate(() => window.__PYQUEST__.active().quiz.q.id)) === qid2,
  '答题面板内切换语言后 qid 不变');
await page.evaluate(() => document.querySelector('#hud-top .lang-pill [data-lang-opt="en"]').click());
await page.waitForTimeout(200);
check(!CJK.test(await page.locator('#quiz-prompt').textContent()),
  '答题面板打开时再切 EN：题面即时变回英文');

// ---- EN 下答对 v2：判定/碎片照常 ----
await page.click(`#quiz-options .opt:nth-child(${(await page.evaluate(() => window.__PYQUEST__.active().quiz.q.answer)) + 1})`);
await page.click('#quiz-confirm');
await page.waitForTimeout(400);
await page.click('#quiz-confirm');
await page.waitForTimeout(400);
const s4 = await snapState();
check(s4.progress[1].shards === 2, 'EN 下答对 v2，碎片 1 → 2（判定不受语言影响）');
check(s4.qAnswered.includes(qid2), 'v2 题目记为已用（qAnswered）');

// ---- 存档语义：语言不写入游戏存档 ----
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pyquest:save:v2') || 'null'));
check(!!saved && saved.progress[1].shards === 2, '游戏进度照常自动存档（save v2）');
check(!('lang' in saved), '语言偏好未混入游戏存档');

// ---- 汇总 ----
console.log('=== E2E 语言切换测试结果 ===');
for (const s of steps) console.log(s);
if (errors.length) { console.log('浏览器错误:'); console.log(errors.join('\n')); }
else console.log('浏览器无报错 ✓');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
