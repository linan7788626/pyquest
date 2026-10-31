// 显示配置，不参与地图构建或玩法随机流。Q材质已由资源流水线生成。
// 2026-10-29 地面可辨度（单一预定改动）：材质混合权重上调，让 v0.2 Q 材质真正可见
// （旧值 .32/.26/.40/.18/.34/.30）。grass 0.62 为主改动（用户反馈“地面纹理未换”）；
// forest/path/water 按比例跟进保持野外层级协调；floor/wall（室内）不动。
// grid、水/路裁边、尺寸/depth、碰撞全部不变；recipe 升级即强制每场景地面缓存失效。
// 2026-10-30 Phase 1 Village 原生地面试点：recipe 升 v3（native 分支整片铺原生调色材质，
// 旧合成路径仅对非 native 场景保留）；Village profile 增 native:true，其余 profile 无此字段。
export const NLI_GROUND_RECIPE = 'nli02-ground-v3';

// 原生地面/崖面资产（Task 1 导出，现位于 public/nli-preview/run/ground/，manifest terrain_cliffs 块）。
// 注意：值（相对 nli-preview 的路径）同时用作 Phaser 纹理 key —— 不能用 grass/path/water 等
// 属性名做 key，否则会覆盖 TS_TILESETS 的同名旧贴图，破坏非 native 场景渲染。
export const NLI_TERRAIN_ASSETS = Object.freeze({
  grass: 'run/ground/terrain_grass.png',
  path: 'run/ground/terrain_path.png',
  water: 'run/ground/terrain_water.png',
  flower: 'run/ground/terrain_flower.png',
  cliffS: 'run/ground/cliff_s_band.png',
  cliffEW: 'run/ground/cliff_ew_strip.png',
  cliffN: 'run/ground/cliff_n_lip.png',
});

// BootScene.preload 在 loadTSAssets 之后调用；URL 前缀与 src/assets/ts.js 的 P 一致。
export function loadTerrainAssets(scene) {
  for (const rel of Object.values(NLI_TERRAIN_ASSETS)) scene.load.image(rel, `/nli-preview/${rel}`);
}
export const MATERIAL_ALPHA = Object.freeze({ grass: 0.62, forest: 0.50, path: 0.55, water: 0.35, floor: 0.34, wall: 0.30 });
const outdoor = (material, base, path, water) => ({ material, base, path, water });
const indoor = (base, wall) => ({ material: 'floor', base, wall });
export const NLI_GROUND_PROFILES = Object.freeze({
  // native:true → ground.js 走原生材质分支（Phase 1 仅 Village 试点）；其余 profile 不设此字段。
  Village: { ...outdoor('grass', '#7d9258', '#baa374', '#3e7e88'), native: true },
  Dungeon: indoor('#77717d', '#42404b'),
  Forest: outdoor('forest', '#647d52', '#a59a70', '#3d747c'),
  Cave: indoor('#6e786f', '#3c4744'),
  SciField: outdoor('grass', '#8d9565', '#c2ad7c', '#4f858e'),
  SciLair: indoor('#787080', '#443d50'),
  C4F: outdoor('grass', '#778d71', '#b1aa88', '#477f89'),
  C4L: indoor('#707e8a', '#374957'),
  C5F: indoor('#8a786b', '#4d4038'),
  C5L: indoor('#79675f', '#42362f'),
  C6F: indoor('#858b7c', '#454e42'),
  C6L: indoor('#6f7e73', '#35463d'),
  C7F: outdoor('grass', '#7b927e', '#b6af8b', '#4c8b91'),
  C7L: indoor('#79728b', '#413b55'),
  C8F: indoor('#737f91', '#3c465d'),
  C8L: indoor('#676f86', '#31394e'),
});

export const VILLAGE_GROUND_PADS = Object.freeze([
  { x: 1088, y: 1424, rx: 320, ry: 64 },
  { x: 4352, y: 1392, rx: 208, ry: 64 },
]);
