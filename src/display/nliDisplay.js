// 仅图像位置、遮挡和反馈层；不得在此更新body/交互锚点/判伤矩形。
export function fixedFxDepth(scene, legacyDepth) {
  const h = (scene.def || scene.mapDef).h;
  return Math.ceil((h * 128 + 1024) / 1024) * 1024 + legacyDepth;
}

export function framePoint(image, x, y) {
  return {
    x: image.x + (x - image.originX * image.width) * image.scaleX,
    y: image.y + (y - image.originY * image.height) * image.scaleY,
  };
}

export function torchFlamePoint(scene, image) {
  const sampling = scene.cache.json.get('nli_manifest').entries.find((e) => e.key === 'torch_0').sampling;
  return framePoint(image,
    sampling.translate_xy[0] + sampling.scale * 627,
    sampling.translate_xy[1] + sampling.scale * 300);
}

const intersects = (a, b, pad = 0) => a.x < b.x + b.width + pad && a.x + a.width > b.x - pad
  && a.y < b.y + b.height + pad && a.y + a.height > b.y - pad;

export function updateNliOcclusion(scene) {
  const enemies = scene.slimeGroup?.getChildren() || [];
  const subjects = [scene.player, ...enemies, ...enemies.flatMap((e) => e.segs || [])]
    .filter((s) => s?.active && !s.dead);
  for (const entry of scene.nliOccluders) {
    if (!entry.image.active) continue;
    const bounds = entry.image.getBounds();
    const obscures = subjects.some((s) => s.y < entry.footY + 4 && intersects(s.getBounds(), bounds));
    const retainFade = entry.faded && subjects.some((s) => s.y < entry.footY + 20 && intersects(s.getBounds(), bounds, 32));
    entry.faded = obscures || retainFade;
    entry.image.setAlpha(entry.faded ? 0.45 : 1);
  }
}

export function initNliDisplay(scene) {
  scene.nliOccluders = [];
  const timer = scene.time.addEvent({ delay: 100, loop: true, callback: () => updateNliOcclusion(scene) });
  scene.events.once('shutdown', () => {
    timer.remove(false);
    scene.nliOccluders = [];
  });
}

export function registerDoorOcclusion(scene, image) {
  scene.nliOccluders.push({ image, footY: framePoint(image, 36, 64).y, faded: false });
}

function landmarkShadow(scene, x, y, width, height) {
  scene.add.image(x, y, 'ts_shadow').setDisplaySize(width, height).setAlpha(0.18).setDepth(-9)
    .setData('nliDisplayRole', 'landmark-shadow');
}

export function addVillageCastle(scene, p, carrier) {
  if (scene.def.key !== 'Village') return;
  // carrier的原构造、staticGroup.add、body配置已全部完成，不重算/refresh。
  carrier.setVisible(false);
  const image = scene.add.image(p.x, p.y + 100, 'castle_medium')
    .setOrigin(0.40, 0.94).setDisplaySize(704, 704).setDepth(p.y + 100);
  landmarkShadow(scene, 1088, 1432, 600, 96);
  scene.nliOccluders.push({ image, footY: image.y, faded: false });
}

export function createDoorlinkImage(scene, p) {
  if (scene.def.key === 'Village' && p.x === 4288 && p.y === 1344) {
    const image = scene.add.image(p.x + 64, p.y + 48, 'portal_blue_gold')
      .setOrigin(0.50, 0.90).setDisplaySize(480, 480).setDepth(p.y + 48);
    landmarkShadow(scene, 4352, 1400, 320, 64);
    scene.nliOccluders.push({ image, footY: image.y, faded: false });
    return image;
  }
  const image = scene.add.image(p.x, p.y + 48, 'portal_door')
    .setOrigin(0.5, 1).setDisplaySize(300, 300).setDepth(p.y + 4);
  registerDoorOcclusion(scene, image);
  return image;
}
