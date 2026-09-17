// ============================================================
// Tiny Swords 素材清单（Pixel Frog · Free Pack）
// 统一管理：资源路径、spritesheet 帧配置、动画定义
// 经 vite publicDir（assets/）以 /TinySwordsFreePack/... 提供
// ⚠️ 许可证禁止再分发素材本体 → .gitignore 已排除，仅本地使用
//
// 单位帧规格：192×192/帧（本体约 52-90px，脚底在帧内 y≈134-136）
// tileset：64×64/格（行 0-3 列 0-3 = 16 草变体；列 5-8 行 4-5 = 8 水变体）
// ============================================================

const P = '/TinySwordsFreePack';
const U = (team, unit) => `${P}/Units/${team} Units/${unit}`;

// ---------- spritesheet（key → [路径, 帧宽, 帧高]） ----------
export const TS_SHEETS = {
  // 玩家：蓝军勇士
  warrior_idle: [U('Blue', 'Warrior/Warrior_Idle.png'), 192, 192],
  warrior_run: [U('Blue', 'Warrior/Warrior_Run.png'), 192, 192],
  warrior_attack: [U('Blue', 'Warrior/Warrior_Attack1.png'), 192, 192],
  // 敌方：红小兵（村庄/地牢）
  pawn_red_idle: [U('Red', 'Pawn/Pawn_Idle.png'), 192, 192],
  pawn_red_run: [U('Red', 'Pawn/Pawn_Run.png'), 192, 192],
  // 敌方：黑勇士（森林强敌 / 巨蟒蛇头）
  warrior_black_idle: [U('Black', 'Warrior/Warrior_Idle.png'), 192, 192],
  warrior_black_run: [U('Black', 'Warrior/Warrior_Run.png'), 192, 192],
  // 巨蟒体节：黑小兵
  pawn_black_idle: [U('Black', 'Pawn/Pawn_Idle.png'), 192, 192],
  // 第一章 BOSS 循环之王：紫军勇士（巨型化）
  warrior_purple_idle: [U('Purple', 'Warrior/Warrior_Idle.png'), 192, 192],
  warrior_purple_run: [U('Purple', 'Warrior/Warrior_Run.png'), 192, 192],
  // 长老：蓝军僧侣
  monk_idle: [U('Blue', 'Monk/Idle.png'), 192, 192],
  // 地形装饰
  tree1: [`${P}/Terrain/Resources/Wood/Trees/Tree1.png`, 256, 256],
  tree2: [`${P}/Terrain/Resources/Wood/Trees/Tree2.png`, 256, 256],
  tree3: [`${P}/Terrain/Resources/Wood/Trees/Tree3.png`, 256, 192],
  tree4: [`${P}/Terrain/Resources/Wood/Trees/Tree4.png`, 256, 192],
  bush1: [`${P}/Terrain/Decorations/Bushes/Bushe1.png`, 128, 128],
  bush2: [`${P}/Terrain/Decorations/Bushes/Bushe2.png`, 128, 128],
  bush3: [`${P}/Terrain/Decorations/Bushes/Bushe3.png`, 128, 128],
  bush4: [`${P}/Terrain/Decorations/Bushes/Bushe4.png`, 128, 128],
  // 地形装饰（点缀进 ground.js 画布）
  bush1: [`${P}/Terrain/Decorations/Bushes/Bushe1.png`, 128, 128],
  bush2: [`${P}/Terrain/Decorations/Bushes/Bushe2.png`, 128, 128],
  bush3: [`${P}/Terrain/Decorations/Bushes/Bushe3.png`, 128, 128],
  bush4: [`${P}/Terrain/Decorations/Bushes/Bushe4.png`, 128, 128],

  // 粒子特效
  dust: [`${P}/Particle FX/Dust_01.png`, 64, 64],
  fire: [`${P}/Particle FX/Fire_01.png`, 64, 64],
  splash: [`${P}/Particle FX/Water Splash.png`, 192, 192],
  explosion: [`${P}/Particle FX/Explosion_01.png`, 192, 192],
  foam: [`${P}/Terrain/Tileset/Water Foam.png`, 192, 192],
};

// ---------- 静态图片 ----------
export const TS_IMAGES = {
  ts_shadow: `${P}/Terrain/Tileset/Shadow.png`,     // 192×192 官方椭圆阴影
  rock1: `${P}/Terrain/Decorations/Rocks/Rock1.png`, // 64×64
  rock2: `${P}/Terrain/Decorations/Rocks/Rock2.png`,
  rock3: `${P}/Terrain/Decorations/Rocks/Rock3.png`,
  rock4: `${P}/Terrain/Decorations/Rocks/Rock4.png`,
  waterRock1: `${P}/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png`, // 64×64
  waterRock2: `${P}/Terrain/Decorations/Rocks in the Water/Water Rocks_02.png`,
  waterRock3: `${P}/Terrain/Decorations/Rocks in the Water/Water Rocks_03.png`,
  waterRock4: `${P}/Terrain/Decorations/Rocks in the Water/Water Rocks_04.png`,
  duck: `${P}/Terrain/Decorations/Rubber Duck/Rubber duck.png`, // 96×32
  house1: `${P}/Buildings/Blue Buildings/House1.png`, // 128×192
  house2: `${P}/Buildings/Blue Buildings/House2.png`,
  house3: `${P}/Buildings/Blue Buildings/House3.png`,
  castle: `${P}/Buildings/Blue Buildings/Monastery.png`, // 192×320 修道院（村庄主建筑）
  tower: `${P}/Buildings/Blue Buildings/Tower.png`,      // 128×256 塔（森林引导石碑位）
  cloud1: `${P}/Terrain/Decorations/Clouds/Clouds_01.png`,
  cloud2: `${P}/Terrain/Decorations/Clouds/Clouds_02.png`,
  cloud3: `${P}/Terrain/Decorations/Clouds/Clouds_03.png`,
  cloud4: `${P}/Terrain/Decorations/Clouds/Clouds_04.png`,
  cloud5: `${P}/Terrain/Decorations/Clouds/Clouds_05.png`,
};

// 地面拼图 tileset（ground.js 用，Phaser 也加载）
export const TS_TILESETS = {
  grass: `${P}/Terrain/Tileset/Tilemap_color1.png`,   // 村庄草绿
  forest: `${P}/Terrain/Tileset/Tilemap_color3.png`,  // 森林深绿
  path: `${P}/Terrain/Tileset/Tilemap_color4.png`,    // 沙黄（土路）
  water: `${P}/Terrain/Tileset/Tilemap_color1.png`,   // 水波变体
};
export const WATER_BG = '#47aba9'; // 官方水底色

// tileset 内可用格子（64×64/格）
export const GRASS_TILES = [
  // TS 草 tile 按行成套（跨行拼接有描边缝）→ 只用第 1 行
  // 整洁化：ground.js 实际只混用 [1,1]（纯草 72%）与 [2,1]（微噪点 28%）
  [0, 1], [1, 1], [2, 1], [3, 1],
];
export const WATER_TILES = [
  [5, 4], [6, 4], [7, 4], [8, 4], [5, 5], [6, 5], [7, 5], [8, 5],
];

// ---------- 动画（key → [sheet, 帧数, 帧时长ms, 循环]） ----------
export const TS_ANIMS = {
  ts_warrior_idle: ['warrior_idle', 8, 110, true],
  ts_warrior_run: ['warrior_run', 6, 80, true],
  ts_warrior_attack: ['warrior_attack', 4, 70, false],

  ts_pawn_red_idle: ['pawn_red_idle', 8, 120, true],
  ts_pawn_red_run: ['pawn_red_run', 6, 90, true],
  ts_warrior_black_idle: ['warrior_black_idle', 8, 110, true],
  ts_warrior_black_run: ['warrior_black_run', 6, 80, true],
  ts_pawn_black_idle: ['pawn_black_idle', 8, 130, true],
  ts_warrior_purple_idle: ['warrior_purple_idle', 8, 120, true],
  ts_warrior_purple_run: ['warrior_purple_run', 6, 85, true],
  ts_monk_idle: ['monk_idle', 6, 160, true],

  ts_tree1: ['tree1', 6, 200, true],
  ts_tree2: ['tree2', 6, 220, true],
  ts_tree3: ['tree3', 6, 240, true],
  ts_tree4: ['tree4', 6, 210, true],
  ts_bush1: ['bush1', 8, 160, true],
  ts_bush2: ['bush2', 8, 180, true],
  ts_bush3: ['bush3', 8, 150, true],
  ts_bush4: ['bush4', 8, 170, true],

  ts_dust: ['dust', 8, 55, false],
  ts_fire: ['fire', 8, 70, true],
  ts_splash: ['splash', 9, 60, false],
  ts_explosion: ['explosion', 8, 60, false],
  ts_foam: ['foam', 16, 80, true],
};

/** BootScene.preload：加载全部 TS 素材 */
export function loadTSAssets(scene) {
  for (const [key, [url, fw, fh]] of Object.entries(TS_SHEETS)) {
    scene.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh });
  }
  for (const [key, url] of Object.entries(TS_IMAGES)) scene.load.image(key, url);
  for (const [key, url] of Object.entries(TS_TILESETS)) scene.load.image(key, url);
}

/** BootScene.create：注册 TS 动画 */
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
