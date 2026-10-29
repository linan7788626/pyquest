// 显示配置，不参与地图构建或玩法随机流。Q材质已由资源流水线生成。
export const NLI_GROUND_RECIPE = 'nli02-ground-v1';
export const MATERIAL_ALPHA = Object.freeze({ grass: 0.32, forest: 0.26, path: 0.40, water: 0.18, floor: 0.34, wall: 0.30 });
const outdoor = (material, base, path, water) => ({ material, base, path, water });
const indoor = (base, wall) => ({ material: 'floor', base, wall });
export const NLI_GROUND_PROFILES = Object.freeze({
  Village: outdoor('grass', '#7d9258', '#baa374', '#3e7e88'),
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
