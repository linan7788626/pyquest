// ============================================================
// 列表洞窟：第二章洞窟地图
// - 3 块列表符文石（索引 / append / 修改元素）
// - BOSS 符文（boss2）：解开巨蟒毕森的符文护盾
// - 列表巨蟒 毕森：身体是一条会动的「列表」，攻击头部造成伤害
// ============================================================
import { G, updateHud } from '../core/state.js';
import { WorldScene } from './WorldScene.js';
import { buildCave } from '../data/maps.js';
import { showVictory } from '../ui/modal.js';
import { sfx } from '../audio/sfx.js';

export default class CaveScene extends WorldScene {
  constructor() { super('Cave'); }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : 'fromForest';
  }

  create() {
    const def = buildCave();
    // BOSS 已被封印则不再生成
    if (G.ch2Done) def.boss = null;
    this.mapDef = def;
    super.create();
  }

  breakBossShield() {
    G.boss2Shielded = false;
    updateHud();
    if (!this.boss || !this.boss.active) return;
    sfx.shieldBreak();
    this.boss.clearTint();
    this.cameras.main.flash(300);
    this.cameras.main.shake(300, 0.006);
    this.floatText(this.boss.x, this.boss.y - 34, '符文护盾破碎了！', '#ff9db3');
  }

  onBossDefeated() {
    G.ch2Done = true;
    updateHud();
    this.time.delayedCall(1200, () => showVictory(2, {
      onNext: () => this.scene.start('Village', { spawn: 'start' }),
    }));
  }
}
