// 子目录部署资产 URL 回归（issue 13 收口的一部分，2026-10-31）。
// 背景根因：src/assets/ts.js 与 src/textures/nliGroundProfiles.js 曾按绝对路径
// `/nli-preview/*` 发起加载，挂载到 `/pyquest/` 等子目录时会逃出挂载点 → 404。
// 本测试用最小 scene.load 记录器复现加载器真实发出的 URL，并按两种挂载
// （`https://game.test/` 与 `https://game.test/pyquest/`）做真实 URL 解析断言：
// 每条运行时 URL 都必须解析到「挂载点前缀 + nli-preview/」之下。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadTSAssets, TS_SHEETS, TS_IMAGES, TS_TILESETS,
} from '../src/assets/ts.js';
import {
  loadTerrainAssets, NLI_TERRAIN_ASSETS,
} from '../src/textures/nliGroundProfiles.js';

const MOUNTS = [
  { pageURL: 'https://game.test/', assetRoot: '/nli-preview/' },
  { pageURL: 'https://game.test/pyquest/', assetRoot: '/pyquest/nli-preview/' },
];

// 最小 Phaser scene.load 替身：只记录 key/url/尺寸，不触浏览器。
function recorder() {
  const entries = [];
  const load = {
    spritesheet: (key, url, opts) => entries.push({ kind: 'spritesheet', key, url, opts }),
    image: (key, url) => entries.push({ kind: 'image', key, url }),
    json: (key, url) => entries.push({ kind: 'json', key, url }),
  };
  return { entries, load };
}

function recordedAll() {
  const ts = recorder();
  loadTSAssets(ts);
  const terrain = recorder();
  loadTerrainAssets(terrain);
  return [...ts.entries, ...terrain.entries];
}

// —— 纹理键契约：接入部署基座解析器时不得顺手改键（terrain 键是路径值）——
test('TS texture keys stay pinned (sheets/images/tilesets)', () => {
  assert.deepEqual(Object.keys(TS_SHEETS), [
    'warrior_idle', 'warrior_run', 'warrior_attack', 'pawn_red_idle', 'pawn_red_run',
    'warrior_black_idle', 'warrior_black_run', 'pawn_black_idle', 'warrior_purple_idle',
    'warrior_purple_run', 'monk_idle', 'tree1', 'tree2', 'tree3', 'tree4',
    'bush1', 'bush2', 'bush3', 'bush4', 'dust', 'fire',
  ]);
  assert.deepEqual(Object.keys(TS_IMAGES), [
    'ts_shadow', 'castle', 'tower', 'cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5',
    'shard', 'heart_full', 'portal_door', 'crystal', 'shroom', 'gate_closed', 'gate_open',
    'torch_0', 'slash_0', 'slash_1', 'slash_2', 'ground_flowers',
    'castle_medium', 'portal_blue_gold',
  ]);
  assert.deepEqual(Object.keys(TS_TILESETS), ['grass', 'forest', 'path', 'water', 'floor', 'wall']);
});

test('spritesheet frame contract stays pinned (192px and 480px families)', () => {
  const ts = recorder();
  loadTSAssets(ts);
  const byKey = Object.fromEntries(ts.entries.map((e) => [e.key, e]));
  assert.equal(byKey.warrior_run.opts.frameWidth, 192);
  assert.equal(byKey.warrior_run.opts.frameHeight, 192);
  assert.equal(byKey.warrior_purple_idle.opts.frameWidth, 480);
  assert.equal(byKey.warrior_purple_idle.opts.frameHeight, 480);
});

test('native terrain keys stay path-valued (do not collide with TS_TILESETS keys)', () => {
  const terrain = recorder();
  loadTerrainAssets(terrain);
  assert.deepEqual(terrain.entries.map((e) => e.key), Object.values(NLI_TERRAIN_ASSETS));
  for (const key of terrain.entries.map((e) => e.key)) {
    assert.ok(!Object.prototype.hasOwnProperty.call(TS_TILESETS, key), `terrain key collides: ${key}`);
  }
});

// —— 核心回归：加载器发出的每条 URL 必须落在挂载点的 nli-preview/ 之下 ——
for (const { pageURL, assetRoot } of MOUNTS) {
  test(`every recorded URL resolves under ${assetRoot} (page ${pageURL})`, () => {
    const entries = recordedAll();
// 覆盖契约来自实际声明：21 sheets + 22 images + 6 tilesets + 1 manifest + 7 原生地形 = 57。
    assert.equal(entries.length, 57, `expected exactly the declared 57 load calls, got ${entries.length}`);
    for (const { kind, key, url } of entries) {
      const resolved = new URL(url, pageURL);
      assert.ok(
        resolved.pathname.startsWith(assetRoot),
        `${kind} ${key}: URL "${url}" escapes mount ${pageURL} (resolved ${resolved.href}); expected under ${assetRoot}`,
      );
    }
  });
}

test('manifest JSON is loaded under the mount nli-preview root', () => {
  const ts = recorder();
  loadTSAssets(ts);
  const json = ts.entries.filter((e) => e.kind === 'json');
  assert.equal(json.length, 1);
  assert.equal(json[0].key, 'nli_manifest');
  for (const { pageURL, assetRoot } of MOUNTS) {
    const resolved = new URL(json[0].url, pageURL);
    assert.equal(resolved.pathname, `${assetRoot}manifest.json`);
  }
});

// —— 直接解析器契约：src/assets/urls.js assetUrl(path, base) ——
// Node 导入即通过（不依赖 window/document，import.meta.env 缺失安全回落）。
import { assetUrl } from '../src/assets/urls.js';

test('assetUrl: empty and relative bases stay relative', () => {
  assert.equal(assetUrl('nli-preview/grass.png', ''), 'nli-preview/grass.png');
  assert.equal(assetUrl('nli-preview/grass.png', './'), './nli-preview/grass.png');
});

test('assetUrl: root and nested absolute bases keep their prefix (no duplicate slashes)', () => {
  assert.equal(assetUrl('nli-preview/grass.png', '/'), '/nli-preview/grass.png');
  assert.equal(assetUrl('nli-preview/grass.png', '/pyquest/'), '/pyquest/nli-preview/grass.png');
  assert.equal(assetUrl('nli-preview/grass.png', '/nested/game/'), '/nested/game/nli-preview/grass.png');
  // 尾斜杠缺失的基座被归一化，不产生双斜杠也不丢前缀
  assert.equal(assetUrl('nli-preview/grass.png', '/pyquest'), '/pyquest/nli-preview/grass.png');
});

test('assetUrl: leading resource slash is normalized so it cannot escape the base', () => {
  assert.equal(assetUrl('/nli-preview/grass.png', '/pyquest/'), '/pyquest/nli-preview/grass.png');
  assert.equal(assetUrl('//nli-preview/grass.png', '/pyquest/'), '/pyquest/nli-preview/grass.png');
  assert.equal(assetUrl('/nli-preview/grass.png', '/'), '/nli-preview/grass.png');
  assert.equal(assetUrl('/nli-preview/grass.png', './'), './nli-preview/grass.png');
  assert.equal(assetUrl('/nli-preview/grass.png', ''), 'nli-preview/grass.png');
});

test('assetUrl: default base under plain Node falls back to relative ./ (no import-time window dependency)', () => {
  assert.equal(assetUrl('nli-preview/grass.png'), './nli-preview/grass.png');
});
