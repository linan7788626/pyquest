// ============================================================
// Task3A · Village 真实 Phaser 显示契约测试（先 RED）
//
// 断言来源（独立字面期望，不从产品常量导出）：
//   - .slim/deepwork/nli-systematic-2026-10-27/village-display-contract.md
//     （designer 契约：地标显示参数 / 遮挡透明 / 派生地面 / FX 深度 / 门区流程）
//   - .superpowers/sdd/2026-10-28-nli-direction-a/village-runtime-before.json
//     （主代理改前真实几何：house/locked 门/玩家 body，只读比较不重采）
//
// 用法：BASE_URL=http://127.0.0.1:5186 node scripts/check-village-a.mjs
// 退出码：0 = 全部通过（Task3B 完成后应如此）
//         1 = 契约断言失败（当前预期 RED：新地标/地面/FX 深度尚未实现）
//         3 = 环境/服务错误（页面不可达、启动失败、运行中被重载等，不能冒充 RED）
//
// 测试方式：真实浏览器 + 真实游戏（Playwright + 既有 __PYQUEST__ 接缝），
// 隔离 browser context（不碰用户存档），只读 scene children 的纹理/几何/深度/alpha，
// 并用真实 teleport / E 键 / portal zone 触发区域切换。不新增产品 API。
// ============================================================
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5186';
const SDD = '.superpowers/sdd/2026-10-28-nli-direction-a';
const EVIDENCE_DIR = `${SDD}/task3-tests-evidence`;
const BEFORE = JSON.parse(readFileSync(`${SDD}/village-runtime-before.json`, 'utf8'));

// ---------- 契约字面期望（village-display-contract.md） ----------
const CONTRACT = {
  castleMedium: {
    texture: 'castle_medium', sourceSize: [1254, 1254],
    display: [704, 704], origin: [0.40, 0.94], anchor: [1024, 1444], depth: 1444,
  },
  portalBlueGold: {
    texture: 'portal_blue_gold', sourceSize: [1254, 1254],
    display: [480, 480], origin: [0.50, 0.90], anchor: [4352, 1392], depth: 1392,
  },
  ground: { key: 'village_a_derived_ground_v1', size: [4608, 3072] },
  manifestImages: 55, // 旧 53 + castle_medium + portal_blue_gold
  fx: { villageFloatText: 6096, otherFloatText: 2000 }, // 原 2000 + Village 提升 4096
  occlusion: { behind: { pos: [1250, 1300], alpha: 0.45 }, front: { pos: [1536, 1632], alpha: 1 } },
  door: { hintPos: [4288, 1568], blockFrom: [4060, 1264], blockedMaxX: 4140, blockedMinX: 4080, zone: [4480, 1344] },
};

// ---------- 结果收集 ----------
const passes = [], failures = [], envNotes = [];
let envFatal = null;
const check = (cond, label, detail = '') => {
  const line = cond ? `  ✓ ${label}` : `  ✗ ${label}`;
  const full = detail ? `${line} | ${detail}` : line;
  console.log(full);
  (cond ? passes : failures).push(full);
};

// ============================================================
// 主流程
// ============================================================
let browser, context, page;
const consoleErrors = [];
let reloadedAfterBoot = false;

try {
  // ---------- 环境：启动前探测 ----------
  let probe;
  try {
    probe = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
  } catch (e) {
    throw new Error(`ENV: BASE_URL ${BASE} 不可达（${e.message}）——请先启动 dev server`);
  }
  if (probe.status !== 200) throw new Error(`ENV: BASE_URL 返回 HTTP ${probe.status}`);

  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 } }); // 契约 §8 机位视口
  page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
  page.on('framenavigated', (f) => {
    if (f.frame === page.mainFrame() && f.url().startsWith(BASE)) reloadedAfterBoot = true; // Vite 重载检测
  });

  // ---------- 启动游戏（全新存档） ----------
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
  reloadedAfterBoot = false;
  await page.waitForTimeout(1500);
  await page.click('#btn-start');
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => {
    const pq = window.__PYQUEST__;
    return pq && pq.active() && pq.active().scene.settings.key === 'Village';
  }, null, { timeout: 15000, polling: 200 });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: `${EVIDENCE_DIR}/01-village-start.png` });
  await page.evaluate(() => window.__PYQUEST__.godmode()); // 测试期间免伤（仅隔离 context 内）

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const activeKey = () => ev(() => window.__PYQUEST__.active().scene.settings.key);
  const tele = (x, y) => ev(([tx, ty]) => window.__PYQUEST__.teleport(tx, ty), [x, y]);

  /** 扫描真实 scene：新地标 / 旧载体 / 门 / 玩家 / 地面 */
  const scan = () => ev(() => {
    const s = window.__PYQUEST__.active();
    const list = s.children.list;
    const img = (o) => o && o.texture ? {
      key: o.texture.key, x: o.x, y: o.y, originX: o.originX, originY: o.originY,
      dw: o.displayWidth, dh: o.displayHeight, depth: o.depth, alpha: o.alpha,
      visible: o.visible, hasBody: !!o.body, tinted: !!o.isTinted,
    } : null;
    return {
      castleMedium: list.filter(o => o.texture && o.texture.key === 'castle_medium').map(img),
      portalBlueGold: list.filter(o => o.texture && o.texture.key === 'portal_blue_gold').map(img),
      oldCastle: list.filter(o => o.texture && o.texture.key === 'castle' && o.depth > 0).map(o => ({
        ...img(o),
        body: o.body ? { x: o.body.x, y: o.body.y, w: o.body.width, h: o.body.height, enable: o.body.enable } : null,
      })),
      doorlinks: s.interactables.filter(it => it.kind === 'doorlink').map(it => ({
        x: it.x, y: it.y, locked: it.locked,
        sprite: it.sprite ? { key: it.sprite.texture.key, tinted: !!it.sprite.isTinted } : null,
        body: it.body && it.body.body ? {
          x: it.body.body.x, y: it.body.body.y, w: it.body.body.width, h: it.body.body.height, enable: it.body.body.enable,
        } : null,
      })),
      player: (() => {
        const p = s.player;
        return p && p.body ? {
          scale: [p.scaleX, p.scaleY],
          body: {
            x: p.body.position.x, y: p.body.position.y, w: p.body.width, h: p.body.height,
            offset: [p.body.offset.x, p.body.offset.y], enable: p.body.enable,
          },
        } : null;
      })(),
      ground: (() => {
        const g = list.find(o => o.depth === -10 && o.texture);
        if (!g) return null;
        const src = g.texture.getSourceImage();
        return { key: g.texture.key, w: src.width, h: src.height };
      })(),
    };
  });

  console.log(`[check-village-a] BASE=${BASE} · Village 场景已进入（真实 Phaser 运行）`);

  // ============ 1. 新地标显示契约（scene 对象级，非注册字符串） ============
  console.log('--- 1. 新地标（castle_medium / portal_blue_gold）---');
  let s1 = await scan();
  {
    const c = CONTRACT.castleMedium;
    const got = s1.castleMedium[0];
    check(s1.castleMedium.length === 1, 'Village 创建且仅创建一张 castle_medium', `实际 ${s1.castleMedium.length} 张`);
    if (got) {
      check(Math.abs(got.dw - c.display[0]) < 0.01 && Math.abs(got.dh - c.display[1]) < 0.01,
        'castle_medium 显示画布 704×704', `实际 ${got.dw}×${got.dh}`);
      check(Math.abs(got.originX - c.origin[0]) < 1e-6 && Math.abs(got.originY - c.origin[1]) < 1e-6,
        'castle_medium origin (0.40,0.94)', `实际 (${got.originX},${got.originY})`);
      check(got.x === c.anchor[0] && got.y === c.anchor[1],
        'castle_medium 锚点 (1024,1444)', `实际 (${got.x},${got.y})`);
      check(got.depth === c.depth, 'castle_medium depth=1444', `实际 ${got.depth}`);
      check(!got.hasBody, 'castle_medium 无物理 body（纯显示代理）', got.hasBody ? '有 body' : '无 body');
      check(got.visible && got.alpha === 1, 'castle_medium 正常可见 alpha=1', `visible=${got.visible} alpha=${got.alpha}`);
    } else {
      check(false, 'castle_medium 存在于 scene children（当前缺失 → RED）', 'scene 中未找到该纹理对象');
    }
  }
  {
    const c = CONTRACT.portalBlueGold;
    const got = s1.portalBlueGold[0];
    check(s1.portalBlueGold.length === 1, 'Village 创建且仅创建一张 portal_blue_gold', `实际 ${s1.portalBlueGold.length} 张`);
    if (got) {
      check(Math.abs(got.dw - c.display[0]) < 0.01 && Math.abs(got.dh - c.display[1]) < 0.01,
        'portal_blue_gold 显示画布 480×480', `实际 ${got.dw}×${got.dh}`);
      check(Math.abs(got.originX - c.origin[0]) < 1e-6 && Math.abs(got.originY - c.origin[1]) < 1e-6,
        'portal_blue_gold origin (0.50,0.90)', `实际 (${got.originX},${got.originY})`);
      check(got.x === c.anchor[0] && got.y === c.anchor[1],
        'portal_blue_gold 锚点 (4352,1392)', `实际 (${got.x},${got.y})`);
      check(got.depth === c.depth, 'portal_blue_gold depth=1392', `实际 ${got.depth}`);
      check(!got.hasBody, 'portal_blue_gold 无物理 body', got.hasBody ? '有 body' : '无 body');
    } else {
      check(false, 'portal_blue_gold 存在于 scene children（当前缺失 → RED）', 'scene 中未找到该纹理对象');
    }
  }
  {
    // 源纹理尺寸 1254²（导出完整性，非像素美观判断）
    const src = await ev((keys) => {
      const s = window.__PYQUEST__.active();
      return keys.map((k) => {
        if (!s.textures.exists(k)) return null;
        const t = s.textures.get(k).getSourceImage();
        return { key: k, w: t.width || t.naturalWidth, h: t.height || t.naturalHeight };
      });
    }, ['castle_medium', 'portal_blue_gold']);
    src.forEach((t, i) => {
      const key = ['castle_medium', 'portal_blue_gold'][i];
      check(!!t, `源纹理 ${key} 已加载（Boot 预载）`, t ? '' : 'textures 中不存在（Task2/3B 未接线 → RED）');
      if (t) check(t.w === 1254 && t.h === 1254, `${key} 源纹理 1254×1254（完整未裁）`, `实际 ${t.w}×${t.h}`);
    });
  }

  // ============ 2. 旧载体与冻结几何（对比 before，不重采） ============
  console.log('--- 2. 旧载体隐藏 + 冻结几何（village-runtime-before.json）---');
  {
    const h = BEFORE.state.house;
    const got = s1.oldCastle[0];
    check(s1.oldCastle.length === 1, '旧 castle 载体仍存在（未销毁）', `实际 ${s1.oldCastle.length} 个`);
    if (got) {
      check(got.visible === false, '旧 castle 载体 visible=false（不与新图叠影）', `实际 visible=${got.visible}`);
      check(got.body && got.body.enable === true, '旧 castle 载体 body 保持启用', JSON.stringify(got.body));
      if (got.body) {
        check(got.body.x === h.body.x && got.body.y === h.body.y && got.body.w === h.body.width && got.body.h === h.body.height,
          `旧 house body 冻结 (${h.body.x},${h.body.y},${h.body.width},${h.body.height})`,
          `实际 (${got.body.x},${got.body.y},${got.body.w},${got.body.h})`);
      }
    }
    const d = BEFORE.state.door;
    const dl = s1.doorlinks.find((it) => it.x === d.point.x && it.y === d.point.y);
    check(!!dl, '东门 interactable 存在于原逻辑点 (4288,1344)', `实际 ${JSON.stringify(s1.doorlinks.map((i) => [i.x, i.y]))}`);
    if (dl) {
      check(dl.sprite && dl.sprite.key === CONTRACT.portalBlueGold.texture,
        '东门 it.sprite 已接新图 portal_blue_gold', dl.sprite ? `实际 ${dl.sprite.key}` : '无 sprite');
      if (dl.locked && dl.body) {
        check(dl.body.w === d.body.width && dl.body.h === d.body.height
          && Math.abs(dl.body.x - d.body.x) < 0.01 && Math.abs(dl.body.y - d.body.y) < 0.01,
          `locked 门 body 冻结 (${d.body.x},${d.body.y},${d.body.width},${d.body.height})`,
          `实际 (${dl.body.x},${dl.body.y},${dl.body.w},${dl.body.h})`);
      } else if (dl.locked) {
        check(false, 'locked 门存在阻挡 body', 'locked=true 但 body 缺失');
      }
    }
    const pb = BEFORE.state.player;
    if (s1.player) {
      const b = s1.player.body;
      check(b.w === pb.body.width && b.h === pb.body.height,
        `玩家 world body ${pb.body.width}×${pb.body.height} 不变`, `实际 ${b.w}×${b.h}`);
      check(b.offset[0] === pb.body.offset.x && b.offset[1] === pb.body.offset.y,
        `玩家 local offset (${pb.body.offset.x},${pb.body.offset.y}) 不变`, `实际 (${b.offset[0]},${b.offset[1]})`);
      check(s1.player.scale[0] === pb.scale[0] && s1.player.scale[1] === pb.scale[1],
        `玩家 scale ${pb.scale[0]} 不变`, `实际 (${s1.player.scale[0]},${s1.player.scale[1]})`);
    }
  }

  // ============ 3. 派生地面 + manifest 记录 ============
  console.log('--- 3. Village 派生地面 village_a_derived_ground_v1 ---');
  {
    const g = s1.ground;
    check(!!g, '地面层存在（depth -10）', g ? '' : '未找到');
    if (g) {
      check(g.key === CONTRACT.ground.key, `Village 地面缓存 key = ${CONTRACT.ground.key}`, `实际 ${g.key}`);
      check(g.w === CONTRACT.ground.size[0] && g.h === CONTRACT.ground.size[1],
        `地面缓存尺寸 ${CONTRACT.ground.size[0]}×${CONTRACT.ground.size[1]}`, `实际 ${g.w}×${g.h}`);
    }
    const mres = await fetch(`${BASE}/nli-preview/manifest.json`);
    const manifest = await mres.json();
    const entries = manifest.entries || [];
    check(entries.length === CONTRACT.manifestImages,
      `manifest 图片 entries = ${CONTRACT.manifestImages}（旧 53 + 新 2）`, `实际 ${entries.length}`);
    for (const key of ['castle_medium', 'portal_blue_gold']) {
      const e = entries.find((x) => x.key === key);
      check(!!e, `manifest entries 含 ${key}`, e ? '' : '缺失');
      if (e) check(!!e.sha256 && !!(e.source || e.source_image_path), `${key} entry 记录输出 hash 与来源`, JSON.stringify(e).slice(0, 120));
    }
    const rd = manifest.runtime_derivatives;
    const rdStr = rd ? JSON.stringify(rd) : '';
    check(!!rd && rdStr.includes('village_a_derived_ground_v1'),
      'manifest.runtime_derivatives 记录 village_a_derived_ground_v1', rd ? '存在' : 'runtime_derivatives 缺失');
    check(!JSON.stringify(entries).includes('village_a_derived_ground_v1'),
      '派生地面不占用图片 entries（无 PNG URL）',
      JSON.stringify(entries).includes('village_a_derived_ground_v1') ? 'entries 中出现该 key' : 'entries 未含该 key ✓');
    if (rd) {
      const rec = typeof rd === 'object' ? (rd['village_a_derived_ground_v1'] || rd.find?.((x) => JSON.stringify(x).includes('village_a_derived_ground_v1'))) : null;
      const recStr = rec ? JSON.stringify(rec) : rdStr;
      check(/4608/.test(recStr) && /3072/.test(recStr), '记录尺寸 [4608,3072]', '');
      check((recStr.match(/sha256/g) || []).length >= 2, '记录含输入 hash 与逻辑快照 hash', `sha256 出现 ${(recStr.match(/sha256/g) || []).length} 次`);
      check(/seed/i.test(recStr), '记录含固定 seed', '');
    }
  }

  // ============ 4. 遮挡透明（真实位置驱动，带超时等待） ============
  console.log('--- 4. 遮挡透明规则 ---');
  {
    const { behind, front } = CONTRACT.occlusion;
    await tele(...behind.pos);
    const alphaBehind = await (async () => {
      try {
        const h = await page.waitForFunction((k) => {
          const s = window.__PYQUEST__.active();
          const lm = s.children.list.find((o) => o.texture && o.texture.key === k);
          return lm && Math.abs(lm.alpha - 0.45) < 0.001;
        }, 'castle_medium', { timeout: 5000, polling: 120 });
        return h ? 0.45 : null;
      } catch { return null; }
    })();
    check(alphaBehind === behind.alpha,
      `角色(${behind.pos}) 位于地标后方约 100ms 后 alpha=${behind.alpha}`,
      alphaBehind === null ? '等待超时（无地标或无遮挡逻辑 → RED）' : `alpha=${alphaBehind}`);
    await tele(...front.pos);
    const frontState = await (async () => {
      try {
        await page.waitForFunction((k) => {
          const s = window.__PYQUEST__.active();
          const lm = s.children.list.find((o) => o.texture && o.texture.key === k);
          return lm && Math.abs(lm.alpha - 1) < 0.001;
        }, 'castle_medium', { timeout: 5000, polling: 120 });
        return await ev(() => {
          const s = window.__PYQUEST__.active();
          return { playerDepth: s.player.depth };
        });
      } catch { return null; }
    })();
    check(!!frontState && frontState.playerDepth > CONTRACT.castleMedium.depth,
      `角色走到前方(${front.pos}) alpha 恢复 1 且角色 depth>地标`,
      frontState ? `player.depth=${frontState.playerDepth} vs 地标 ${CONTRACT.castleMedium.depth}` : '等待超时');
  }

  // ============ 5. Village 固定 FX 深度（真实 floatText 调用） ============
  console.log('--- 5. 固定 FX depth +4096（仅 Village）---');
  {
    const d = await ev(() => {
      const s = window.__PYQUEST__.active();
      s.floatText(1024, 1200, '__contract_probe__');
      const t = s.children.list.find((o) => o.type === 'Text' && o.text === '__contract_probe__');
      return t ? t.depth : null;
    });
    check(d === CONTRACT.fx.villageFloatText,
      `Village floatText depth=${CONTRACT.fx.villageFloatText}（原 2000+4096，高于地标 1444）`,
      d === null ? '未取到文本对象' : `实际 ${d}`);
  }

  // ============ 6. 东门 locked → 隔离解锁 → 原 portal zone 去 Forest ============
  console.log('--- 6. 东门交互与传送 ---');
  {
    const { hintPos, blockFrom, blockedMaxX, blockedMinX, zone } = CONTRACT.door;
    await tele(...hintPos);
    await page.waitForTimeout(450); // 等 updateInteractHint
    const hint = await page.evaluate(() => document.getElementById('hint').textContent || '');
    check(hint.includes('检查'), 'locked 门近距离提示「按 E 检查」', `hint="${hint.slice(0, 40)}"`);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);
    const dlg = await page.locator('#dialogue.show').count();
    check(dlg === 1, 'locked 门按 E 给出封印提示对话', `#dialogue.show count=${dlg}`);
    await page.screenshot({ path: `${EVIDENCE_DIR}/02-door-locked.png` });
    for (let i = 0; i < 8; i++) { // 关闭对话（打字机需逐行补完）
      if ((await page.locator('#dialogue.show').count()) === 0) break;
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(260);
    }
    // locked body 真实阻挡：从门西侧持续向东走
    await tele(...blockFrom);
    await page.waitForTimeout(200);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowRight');
    const px = await ev(() => window.__PYQUEST__.active().player.x);
    check(px < blockedMaxX && px > blockedMinX,
      'locked body 阻挡东向通行（真实移动尝试）',
      `player.x=${px}（应停在西侧 ${blockedMinX}~${blockedMaxX}，body 左缘 4178−半宽 60）`);
    // 隔离状态解锁（仅测试 context），经真实 scene 重启走原建门逻辑
    await page.evaluate(() => {
      window.__PYQUEST__.applyTestState({ progress: { 1: { gateOpen: true, bossShielded: false, bossDefeated: true, done: true } } });
      window.__PYQUEST__.active().scene.start('Village', { spawn: 'fromNext' });
    });
    await page.waitForFunction(() => {
      const s = window.__PYQUEST__.active();
      return s && s.scene.settings.key === 'Village' && s.player && s.interactables && s.interactables.length > 0;
    }, null, { timeout: 10000, polling: 150 });
    await page.evaluate(() => window.__PYQUEST__.godmode());
    const s6 = await scan();
    const dl6 = s6.doorlinks.find((it) => it.x === 4288 && it.y === 1344);
    check(!!dl6 && dl6.locked === false, 'done 后东门解锁（locked=false）', dl6 ? `locked=${dl6.locked}` : '未找到门');
    if (dl6) {
      check(!dl6.body || dl6.body.enable === false, '解锁后无阻挡 body', JSON.stringify(dl6.body));
      check(dl6.sprite && dl6.sprite.key === 'portal_blue_gold' && !dl6.sprite.tinted,
        '解锁后 it.sprite=新图且清 tint', dl6.sprite ? `key=${dl6.sprite.key} tinted=${dl6.sprite.tinted}` : '无 sprite');
    }
    // 经原 portal zone 实际触发场景切换
    await tele(...zone);
    let inForest = false;
    let forestKey = '?';
    try {
      await page.waitForFunction(() => {
        const s = window.__PYQUEST__.active();
        return s && s.scene.settings.key === 'Forest';
      }, null, { timeout: 12000, polling: 150 });
      inForest = true;
      forestKey = await activeKey();
    } catch { inForest = false; forestKey = await activeKey().catch(() => '?'); }
    check(inForest, '走进原 portal zone 实际切换到 Forest', `activeKey=${forestKey}`);
  }

  // ============ 7. Forest 无 Village 新地标 / 派生地面，原显示分支不变 ============
  console.log('--- 7. Forest 回归（其余 15 图由 smoke/最终回归覆盖，此处仅 Forest 抽查）---');
  {
    const s7 = await scan();
    check((await activeKey()) === 'Forest', '当前场景为 Forest', `实际 ${await activeKey()}`);
    check(s7.castleMedium.length === 0 && s7.portalBlueGold.length === 0,
      'Forest 无 Village 新地标', `castle_medium=${s7.castleMedium.length} portal_blue_gold=${s7.portalBlueGold.length}`);
    check(!!s7.ground && s7.ground.key !== CONTRACT.ground.key,
      'Forest 不使用派生地面（原 ground 分支）', s7.ground ? `实际 ${s7.ground.key}` : '无地面层');
    const d = await ev(() => {
      const s = window.__PYQUEST__.active();
      s.floatText(1024, 1200, '__contract_probe__');
      const t = s.children.list.find((o) => o.type === 'Text' && o.text === '__contract_probe__');
      return t ? t.depth : null;
    });
    check(d === CONTRACT.fx.otherFloatText, `非 Village floatText 保持原 depth=${CONTRACT.fx.otherFloatText}`, `实际 ${d}`);
    await page.screenshot({ path: `${EVIDENCE_DIR}/03-forest.png` });
  }
} catch (e) {
  envFatal = e.message || String(e);
} finally {
  if (page) {
    if (consoleErrors.length) envNotes.push(`页面错误 ${consoleErrors.length} 条：\n    ${consoleErrors.slice(0, 6).join('\n    ')}`);
    if (reloadedAfterBoot) envNotes.push('运行期间发生页面导航/重载（可能 Vite HMR/Task2 资源导出），本结果不可作为 RED 依据');
  }
  try { await context?.close(); } catch { /* ignore */ }
  try { await browser?.close(); } catch { /* ignore */ }
}

// ============================================================
// 汇总
// ============================================================
console.log('');
console.log('='.repeat(64));
if (envFatal) {
  console.log(`ENV-ERROR（非契约 RED）: ${envFatal}`);
  for (const n of envNotes) console.log(`  · ${n}`);
  console.log('exit 3');
  process.exit(3);
}
if (envNotes.length) {
  console.log('环境备注（需主代理复核是否影响 RED 有效性）：');
  for (const n of envNotes) console.log(`  · ${n}`);
}
console.log(`契约断言：${passes.length} 通过，${failures.length} 失败`);
for (const f of failures) console.log(f);
if (failures.length === 0 && envNotes.length === 0) {
  console.log('PASS: Village A 显示契约全部满足');
  process.exit(0);
}
console.log(failures.length ? 'FAIL: Village A 显示契约未满足（当前为预期 RED：Task3B 未实现）' : 'FAIL: 断言全过但存在环境备注');
process.exit(1);
