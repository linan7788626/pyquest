// ============================================================
// CC0 素材清单与加载器
// - 0x72 DungeonTileset II v1.7（角色动画/地牢/道具）→ /cc0/0x72/frames/
// - Kenney Tiny Town 1.1（野外 tileset）→ /cc0/kenney/tiny-town/
// - Kenney Tiny Dungeon（火盆等）→ /cc0/kenney/tiny-dungeon/
// 两套均为 CC0 公共领域，可自由使用与再分发（许可证文件在 assets/cc0/）
// ============================================================

const X = '/cc0/0x72/frames';
const TT = '/cc0/kenney/tiny-town';
const TD = '/cc0/kenney/tiny-dungeon';

// ---------- 逐帧动画（0x72）：[帧名前缀, 帧数] ----------
export const CHAR_ANIMS = {
  // 玩家：骑士（青蓝铠甲 + 红围巾）
  knight_idle: ['knight_m_idle_anim', 4],
  knight_run: ['knight_m_run_anim', 4],
  knight_hit: ['knight_m_hit_anim', 1],
  // 长老：蓝袍巫师（白胡子 + 法杖）
  wizzard_idle: ['wizzard_m_idle_anim', 4],
  // 小怪（村庄/地牢）：红鬼
  chort_idle: ['chort_idle_anim', 4],
  chort_run: ['chort_run_anim', 4],
  // 小怪（森林，更强）：绿萨满
  shaman_idle: ['orc_shaman_idle_anim', 4],
  shaman_run: ['orc_shaman_run_anim', 4],
  // 第一章 BOSS 循环之王：大恶魔（32×36）
  demon_idle: ['big_demon_idle_anim', 4],
  demon_run: ['big_demon_run_anim', 4],
  // 第二章 BOSS 巨蟒：鼻涕虫头 + 小蛞蝓体节
  slug_anim: ['slug_anim', 4],
  tiny_slug_anim: ['tiny_slug_anim', 4],
};

// ---------- 静态贴图（0x72 道具/地形样张；地面整图由 ground.js 拼合） ----------
export const X_IMAGES = {
  x_door_closed: `${X}/doors_leaf_closed.png`,   // 32×32 大门（关）
  x_door_open: `${X}/doors_leaf_open.png`,       // 32×32 大门（开）
  x_column: `${X}/column.png`,                   // 石柱（16×48）
  x_crate: `${X}/crate.png`,                     // 木箱
  x_chest: `${X}/chest_full_open_anim_f0.png`,   // 宝箱
  x_sword: `${X}/weapon_regular_sword.png`,      // 剑（特效备用）
  // 地牢地形样张（ground.js 拼图用）
  floor_1: `${X}/floor_1.png`,
  floor_2: `${X}/floor_2.png`,
  floor_3: `${X}/floor_3.png`,
  wall_mid: `${X}/wall_mid.png`,
  wall_top_mid: `${X}/wall_top_mid.png`,
};

// ---------- Kenney tile 索引（用于 ground.js 拼图与道具） ----------
// Tiny Town：0/1 草地 2 花 3 秋树 5 绿树 19 灌木 25 土路 …（完整含义见 scripts 分析）
export const TT_TILES = {
  grass: [0, 1], grassFlower: 2, autumnTree: 3, greenTree: 5, bigTree1: 27, bigTree2: 28,
  bush: 19, berryBush: 92, rocks: 43,
  dirt: 25, dirtAlt: 26, dirtL: 24,
  // 草↔土 过渡（数组序 = 上/下/左/右邻接草地时用）
  edgeTop: 36, edgeBottom: 37, edgeLeft: 40, edgeRight: 39, // 36=草在上 37=草在下 40=草在右 39=草在左
  cornerTL: 42, cornerTR: 38, cornerBL: 41, cornerBR: 12,
  // 房屋组件（拼合用）
  roofL: 64, roofM: 65, roofR: 66, roofRidge: 37 + 100, // ridge 用不上，占位
  wallL: 72, wallM: 73, wallR: 75, window: 103, door: 84,
};
// Tiny Dungeon：29 = 火盆
export const TD_TILES = { brazier: 29 };

export const ttTile = (i) => `${TT}/tile_${String(i).padStart(4, '0')}.png`;
export const tdTile = (i) => `${TD}/tile_${String(i).padStart(4, '0')}.png`;

/** BootScene.preload 中调用：加载全部 CC0 资源 */
export function loadCC0Assets(scene) {
  // 0x72 逐帧动画（帧图片 → 单帧纹理）
  for (const [key, [prefix, frames]] of Object.entries(CHAR_ANIMS)) {
    for (let f = 0; f < frames; f++) {
      scene.load.image(`${prefix}_f${f}`, `${X}/${prefix}_f${f}.png`);
    }
  }
  for (const [key, url] of Object.entries(X_IMAGES)) scene.load.image(key, url);

  // Kenney tileset（全部加载；ground.js 与道具共用）
  for (let i = 0; i <= 131; i++) scene.load.image(`tt_${i}`, ttTile(i));
  for (let i = 0; i <= 131; i++) scene.load.image(`td_${i}`, tdTile(i));
}

/** BootScene.create 中调用：注册角色动画 */
export function createCC0Animations(scene) {
  for (const [key, [prefix, frames]] of Object.entries(CHAR_ANIMS)) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: frames }, (_, f) => ({ key: `${prefix}_f${f}` })),
      frameRate: key.includes('run') ? 10 : 6,
      repeat: -1,
    });
  }
}

/**
 * 拼合「乡村小屋」贴图：Kenney Tiny Town 红瓦顶 + 沙色石墙 + 蓝窗 + 红门
 * 8×6 tile = 128×96px（×PS 缩放显示）
 */
export function buildHouseTexture(scene) {
  const key = 'house';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const draw = (texKey, tx, ty) => {
    const tex = scene.textures.get(texKey);
    if (!tex || !tex.getSourceImage) return;
    ctx.drawImage(tex.getSourceImage(), tx * 16, ty * 16);
  };
  // 屋顶 3 行（64=左缘 65=瓦面 66=右缘）
  for (let r = 0; r < 3; r++) {
    draw('tt_64', 0, r); draw('tt_66', 7, r);
    for (let c = 1; c < 7; c++) draw('tt_65', c, r);
  }
  // 墙体 3 行（72=左缘 73=墙面 75=右缘）
  for (let r = 3; r < 6; r++) {
    draw('tt_72', 0, r); draw('tt_75', 7, r);
    for (let c = 1; c < 7; c++) draw('tt_73', c, r);
  }
  // 窗户 ×2（103=石框蓝窗）
  draw('tt_103', 2, 4); draw('tt_103', 5, 4);
  // 红门（84）居中
  draw('tt_84', 3, 4); draw('tt_84', 4, 4);
  scene.textures.addCanvas(key, canvas);
  return key;
}
