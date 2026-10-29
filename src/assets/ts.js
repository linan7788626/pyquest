// NLI v0.2.1：保留 TS key/API 以冻结实体、碰撞和动画调用接口。
// 新源完整画布归一化及技术例外见 assets/nli-preview/manifest.json。
// 静态姿态不是完整动画；原始包与 Tiny Swords 均只读。
const P = '/nli-preview';
const png = (key) => `${P}/${key}.png`;

export const TS_SHEETS = {
  warrior_idle: [png('warrior_idle'), 192, 192],
  warrior_run: [png('warrior_run'), 192, 192],
  warrior_attack: [png('warrior_attack'), 192, 192],
  pawn_red_idle: [png('pawn_red_idle'), 192, 192],
  pawn_red_run: [png('pawn_red_run'), 192, 192],
  warrior_black_idle: [png('warrior_black_idle'), 192, 192],
  warrior_black_run: [png('warrior_black_run'), 192, 192],
  pawn_black_idle: [png('pawn_black_idle'), 192, 192],
  warrior_purple_idle: [png('warrior_purple_idle'), 480, 480],
  warrior_purple_run: [png('warrior_purple_run'), 480, 480],
  monk_idle: [png('monk_idle'), 192, 192],
  tree1: [png('tree1'), 256, 256],
  tree2: [png('tree2'), 256, 256],
  tree3: [png('tree3'), 256, 192],
  tree4: [png('tree4'), 256, 192],
  bush1: [png('bush1'), 128, 128],
  bush2: [png('bush2'), 128, 128],
  bush3: [png('bush3'), 128, 128],
  bush4: [png('bush4'), 128, 128],
  dust: [png('dust'), 160, 160],
  fire: [png('fire'), 64, 64],
};

export const TS_IMAGES = Object.fromEntries([
  'ts_shadow', 'castle', 'tower', 'cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5',
  'shard', 'heart_full', 'portal_door', 'crystal', 'shroom', 'gate_closed', 'gate_open',
  'torch_0', 'slash_0', 'slash_1', 'slash_2', 'ground_flowers',
  'castle_medium', 'portal_blue_gold',
].map((key) => [key, png(key)]));

// 这些是明确裁取的平面样本，不再假定旧图集 (64,64,64,64) 中心格。
export const TS_TILESETS = Object.fromEntries(
  ['grass', 'forest', 'path', 'water', 'floor', 'wall'].map((key) => [key, png(key)]),
);
export const WATER_BG = '#2d91b1';
export const NLI_SOURCE_VERSION = '0.2.1-npc-elder';
export const NLI_REQUIRED_KEYS = [
  ...Object.keys(TS_SHEETS), ...Object.keys(TS_IMAGES), ...Object.keys(TS_TILESETS),
];

// 独立静态姿态，各动画只有一帧。攻击/扬尘总时长沿用原行为。
export const TS_ANIMS = {
  ts_warrior_idle: ['warrior_idle', 1, 880, true],
  ts_warrior_run: ['warrior_run', 1, 480, true],
  ts_warrior_attack: ['warrior_attack', 1, 280, false],
  ts_pawn_red_idle: ['pawn_red_idle', 1, 960, true],
  ts_pawn_red_run: ['pawn_red_run', 1, 540, true],
  ts_warrior_black_idle: ['warrior_black_idle', 1, 880, true],
  ts_warrior_black_run: ['warrior_black_run', 1, 480, true],
  ts_pawn_black_idle: ['pawn_black_idle', 1, 1040, true],
  ts_warrior_purple_idle: ['warrior_purple_idle', 1, 960, true],
  ts_warrior_purple_run: ['warrior_purple_run', 1, 510, true],
  ts_monk_idle: ['monk_idle', 1, 960, true],
  ts_tree1: ['tree1', 1, 1200, true],
  ts_tree2: ['tree2', 1, 1320, true],
  ts_tree3: ['tree3', 1, 1440, true],
  ts_tree4: ['tree4', 1, 1260, true],
  ts_bush1: ['bush1', 1, 1280, true],
  ts_bush2: ['bush2', 1, 1440, true],
  ts_bush3: ['bush3', 1, 1200, true],
  ts_bush4: ['bush4', 1, 1360, true],
  ts_dust: ['dust', 1, 440, false],
  ts_fire: ['fire', 1, 560, true],
};

export function loadTSAssets(scene) {
  for (const [key, [url, fw, fh]] of Object.entries(TS_SHEETS)) {
    scene.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh });
  }
  for (const [key, url] of Object.entries(TS_IMAGES)) scene.load.image(key, url);
  for (const [key, url] of Object.entries(TS_TILESETS)) scene.load.image(key, url);
  scene.load.json('nli_manifest', `${P}/manifest.json`);
}

export function createTSAnimations(scene) {
  for (const [key, [sheet, frames, dur, loop]] of Object.entries(TS_ANIMS)) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, { start: 0, end: frames - 1 }),
      frameRate: 1000 / dur,
      repeat: loop ? -1 : 0,
    });
  }
}
